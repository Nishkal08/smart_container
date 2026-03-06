#!/usr/bin/env python3
"""
SmartContainer Risk Engine — XGBoost Model Training Script

Trains a 3-class risk classifier (Clear / Low Risk / Critical) on
Historical Data.csv using the same feature engineering pipeline as the
Colab notebook, with these improvements:
  - Correct class ordering (Clear=0, Low Risk=1, Critical=2)
  - Risk score = 50*P(LowRisk) + 100*P(Critical) → clean 0-100 scale
  - Saves model + encoders + feature params for deterministic inference
  - Evaluates on Real-Time Data.csv (out-of-sample test)

Outputs to: ml_service/artifacts/
  model.pkl     — XGBClassifier
  encoders.pkl  — LabelEncoders for categorical columns
  params.pkl    — Quantile thresholds + feature metadata
"""

import os
import sys
import time
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT_DIR = SCRIPT_DIR.parent
ARTIFACTS_DIR = SCRIPT_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

HISTORICAL_CSV = ROOT_DIR / "Historical Data.csv"
REALTIME_CSV = ROOT_DIR / "Real-Time Data.csv"

# ── Column config ─────────────────────────────────────────────────────────────
TARGET_COL = "Clearance_Status"

# Columns to drop before building feature matrix
DROP_COLS = [
    "Container_ID",
    "Declaration_Date (YYYY-MM-DD)",
    "Declaration_Time",
    "Trade_Regime (Import / Export / Transit)",
    "Exporter_ID",
    "Importer_ID",
    TARGET_COL,
]

CATEGORICAL_COLS = [
    "Origin_Country",
    "Destination_Port",
    "Destination_Country",
    "HS_Code",
    "Shipping_Line",
]

# Ordered risk map: Clear < Low Risk < Critical
RISK_MAP = {"Clear": 0, "Low Risk": 1, "Critical": 2}
RISK_MAP_INV = {0: "Clear", 1: "Low Risk", 2: "Critical"}

# Final feature order — must match exactly at inference time
FEATURE_NAMES = [
    "Origin_Country",
    "Destination_Port",
    "Destination_Country",
    "HS_Code",
    "Declared_Value",
    "Declared_Weight",
    "Measured_Weight",
    "Shipping_Line",
    "Dwell_Time_Hours",
    "Weight_Diff",
    "Weight_Diff_Pct",
    "Weight_Risk_Level",
    "Value_per_Weight",
    "Value_Risk_Level",
    "Long_Dwell",
    "Total_Risk_Level",
    "Suspicion_Score",
]


# ── Feature Engineering ───────────────────────────────────────────────────────

def feature_engineering(df: pd.DataFrame, params: dict = None):
    """
    Apply feature engineering pipeline.
    If params=None, compute thresholds from df (training mode).
    Returns (df, params_dict) — params_dict is None when params was provided.
    """
    df = df.copy()

    # 1. Weight difference (absolute + percentage)
    df["Weight_Diff"] = np.abs(df["Measured_Weight"] - df["Declared_Weight"])
    df["Weight_Diff_Pct"] = df["Weight_Diff"] / (df["Declared_Weight"].clip(lower=0.01)) * 100

    if params is None:
        wq1 = float(df["Weight_Diff"].quantile(0.33))
        wq2 = float(df["Weight_Diff"].quantile(0.66))
    else:
        wq1, wq2 = params["weight_diff_q1"], params["weight_diff_q2"]

    df["Weight_Risk_Level"] = df["Weight_Diff"].apply(
        lambda x: 0 if x <= wq1 else (1 if x <= wq2 else 2)
    ).astype(int)

    # 2. Value per weight
    df["Value_per_Weight"] = df["Declared_Value"] / (df["Declared_Weight"] + 1)

    if params is None:
        vq1 = float(df["Value_per_Weight"].quantile(0.33))
        vq2 = float(df["Value_per_Weight"].quantile(0.66))
    else:
        vq1, vq2 = params["vpw_q1"], params["vpw_q2"]

    df["Value_Risk_Level"] = df["Value_per_Weight"].apply(
        lambda x: 0 if x <= vq1 else (1 if x <= vq2 else 2)
    ).astype(int)

    # 3. Long Dwell — binary flag (above 75th percentile of training data)
    if params is None:
        dwell_thresh = float(df["Dwell_Time_Hours"].quantile(0.75))
    else:
        dwell_thresh = params["dwell_threshold"]

    df["Long_Dwell"] = (df["Dwell_Time_Hours"] > dwell_thresh).astype(int)

    # 4. Total Risk Level — sum of the three risk flags (range 0-5)
    df["Total_Risk_Level"] = (
        df["Weight_Risk_Level"] + df["Value_Risk_Level"] + df["Long_Dwell"]
    )

    # 5. Suspicion Score — interaction of weight risk and value risk (0-4)
    df["Suspicion_Score"] = df["Weight_Risk_Level"] * df["Value_Risk_Level"]

    computed_params = None
    if params is None:
        computed_params = {
            "weight_diff_q1": wq1,
            "weight_diff_q2": wq2,
            "vpw_q1": vq1,
            "vpw_q2": vq2,
            "dwell_threshold": dwell_thresh,
        }

    return df, computed_params


def encode_categoricals(df: pd.DataFrame, encoders: dict = None, fit: bool = False):
    """
    Label-encode categorical columns.
    fit=True: learn encoders from df and return them.
    fit=False: apply provided encoders, unknown values → fallback index 0.
    """
    df = df.copy()

    if fit:
        encoders = {}

    for col in CATEGORICAL_COLS:
        df[col] = df[col].astype(str).str.strip().fillna("UNKNOWN")
        if fit:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col])
            encoders[col] = le
        else:
            le = encoders[col]
            known = set(le.classes_)
            # Map unseen values to first known class (index 0)
            df[col] = df[col].apply(lambda v: v if v in known else le.classes_[0])
            df[col] = le.transform(df[col])

    return df, encoders


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("  SmartContainer Risk Engine — XGBoost Training")
    print("=" * 65)

    # ── 1. Load historical data ────────────────────────────────────────────
    print(f"\n[1/7] Loading {HISTORICAL_CSV.name} ...")
    if not HISTORICAL_CSV.exists():
        print(f"  ERROR: {HISTORICAL_CSV} not found!")
        sys.exit(1)

    df = pd.read_csv(HISTORICAL_CSV)
    print(f"  Rows: {len(df):,}  |  Columns: {df.shape[1]}")
    print(f"  Target distribution:\n{df[TARGET_COL].value_counts().to_string()}")

    # ── 2. Feature engineering ─────────────────────────────────────────────
    print("\n[2/7] Feature engineering ...")
    df, fe_params = feature_engineering(df, params=None)
    print(f"  Weight_Diff thresholds : q33={fe_params['weight_diff_q1']:.2f}  q66={fe_params['weight_diff_q2']:.2f}")
    print(f"  Value/Weight thresholds: q33={fe_params['vpw_q1']:.2f}  q66={fe_params['vpw_q2']:.2f}")
    print(f"  Long_Dwell threshold   : {fe_params['dwell_threshold']:.1f} hours (75th pct)")

    # ── 3. Encode target + categoricals ───────────────────────────────────
    print("\n[3/7] Encoding features ...")
    df["Risk_Label"] = df[TARGET_COL].map(RISK_MAP)
    if df["Risk_Label"].isna().any():
        unknown = df[df["Risk_Label"].isna()][TARGET_COL].unique()
        print(f"  WARNING: Unknown target values dropped: {unknown}")
        df = df.dropna(subset=["Risk_Label"])
    df["Risk_Label"] = df["Risk_Label"].astype(int)

    df, cat_encoders = encode_categoricals(df, fit=True)
    print(f"  Categorical columns encoded: {CATEGORICAL_COLS}")

    X = df[FEATURE_NAMES].values.astype(np.float32)
    y = df["Risk_Label"].values
    print(f"  X shape: {X.shape}  |  y distribution: {dict(zip(*np.unique(y, return_counts=True)))}")

    # ── 4. SMOTE balancing ──────────────────────────────────────────────────
    print("\n[4/7] Applying SMOTE to balance classes ...")
    smote = SMOTE(random_state=42, k_neighbors=5)
    X_res, y_res = smote.fit_resample(X, y)
    bal = dict(zip(*np.unique(y_res, return_counts=True)))
    print(f"  After SMOTE: {bal}  (total: {len(y_res):,})")

    # ── 5. Train XGBoost ───────────────────────────────────────────────────
    print("\n[5/7] Training XGBoost classifier ...")
    X_train, X_val, y_train, y_val = train_test_split(
        X_res, y_res, test_size=0.1, random_state=42, stratify=y_res
    )
    print(f"  Train: {len(X_train):,}  |  Val: {len(X_val):,}")

    # Give Critical class (2) extra weight to boost recall
    sample_weights = np.ones(len(y_train), dtype=np.float32)
    sample_weights[y_train == 2] = 5.0  # 5x weight for Critical
    sample_weights[y_train == 1] = 1.5  # slight boost for Low Risk

    model = XGBClassifier(
        n_estimators=500,
        max_depth=10,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=2,
        gamma=0.1,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
        tree_method="hist",
    )

    t0 = time.time()
    model.fit(X_train, y_train, sample_weight=sample_weights,
              eval_set=[(X_val, y_val)], verbose=False)
    elapsed = time.time() - t0
    print(f"  Training completed in {elapsed:.1f}s")

    # Validation metrics
    y_pred_val = model.predict(X_val)
    val_acc = accuracy_score(y_val, y_pred_val)
    print(f"  Validation accuracy: {val_acc:.4f}")

    # Feature importances
    fi = pd.Series(model.feature_importances_, index=FEATURE_NAMES).sort_values(ascending=False)
    print("\n  Feature importances (top 8):")
    for feat, imp in fi.head(8).items():
        print(f"    {feat:<22} {imp:.4f}")

    # ── 6. Evaluate on Real-Time data ──────────────────────────────────────
    if REALTIME_CSV.exists():
        print(f"\n[6/7] Evaluating on {REALTIME_CSV.name} ...")
        df_rt = pd.read_csv(REALTIME_CSV)
        df_rt, _ = feature_engineering(df_rt, params=fe_params)
        df_rt["Risk_Label"] = df_rt[TARGET_COL].map(RISK_MAP)
        df_rt = df_rt.dropna(subset=["Risk_Label"])
        df_rt["Risk_Label"] = df_rt["Risk_Label"].astype(int)
        df_rt, _ = encode_categoricals(df_rt, encoders=cat_encoders, fit=False)

        X_rt = df_rt[FEATURE_NAMES].values.astype(np.float32)
        y_rt = df_rt["Risk_Label"].values

        y_pred_rt = model.predict(X_rt)
        y_prob_rt = model.predict_proba(X_rt)

        rt_acc = accuracy_score(y_rt, y_pred_rt)
        print(f"  Real-Time accuracy: {rt_acc:.4f}")

        try:
            roc = roc_auc_score(y_rt, y_prob_rt, multi_class="ovr")
            print(f"  ROC-AUC (OvR):      {roc:.4f}")
        except Exception:
            pass

        print("\n  Classification Report (Real-Time):")
        print(classification_report(
            y_rt, y_pred_rt,
            target_names=["Clear", "Low Risk", "Critical"],
            digits=4,
        ))

        # Risk score distribution preview
        risk_scores = (50 * y_prob_rt[:, 1] + 100 * y_prob_rt[:, 2]).clip(0, 100)
        print(f"  Risk score stats: mean={risk_scores.mean():.1f}  "
              f"p50={np.percentile(risk_scores, 50):.1f}  "
              f"p95={np.percentile(risk_scores, 95):.1f}  "
              f"max={risk_scores.max():.1f}")
    else:
        print(f"\n[6/7] Skipping real-time eval ({REALTIME_CSV.name} not found)")

    # ── 7. Save artifacts ──────────────────────────────────────────────────
    print("\n[7/7] Saving artifacts ...")

    model_path = ARTIFACTS_DIR / "model.pkl"
    encoders_path = ARTIFACTS_DIR / "encoders.pkl"
    params_path = ARTIFACTS_DIR / "params.pkl"

    joblib.dump(model, model_path, compress=3)
    joblib.dump(cat_encoders, encoders_path)
    joblib.dump({**fe_params, "feature_names": FEATURE_NAMES}, params_path)

    print(f"  model.pkl    → {model_path}  ({model_path.stat().st_size // 1024} KB)")
    print(f"  encoders.pkl → {encoders_path}")
    print(f"  params.pkl   → {params_path}")

    print("\n✅  Training complete! Update .env: IS_MOCK_MODEL=false  MODEL_VERSION=xgb-v1.0")
    print("   Then restart the ML service to load the model.\n")


if __name__ == "__main__":
    main()
