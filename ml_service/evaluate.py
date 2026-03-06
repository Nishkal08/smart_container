"""Evaluate the trained XGBoost model on Real-Time Data.csv."""
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    roc_auc_score,
)
from sklearn.preprocessing import label_binarize

# ── Load artifacts ────────────────────────────────────────────────────────────
model    = joblib.load("artifacts/model.pkl")
encoders = joblib.load("artifacts/encoders.pkl")
params   = joblib.load("artifacts/params.pkl")

# ── Load real-time dataset ────────────────────────────────────────────────────
raw_df = pd.read_csv("../Real-Time Data.csv")
df     = raw_df.copy()
print(f"Dataset  : Real-Time Data.csv")
print(f"Rows     : {len(df):,}  |  Columns: {len(df.columns)}")
print(f"Classes  : {dict(df['Clearance_Status'].value_counts())}")

# ── Feature engineering (must mirror train.py exactly) ────────────────────────
q33_w, q66_w = params["weight_diff_q1"], params["weight_diff_q2"]
q33_v, q66_v = params["vpw_q1"],        params["vpw_q2"]
dwell_p75    = params["dwell_threshold"]

df["Weight_Diff"]       = (df["Measured_Weight"] - df["Declared_Weight"]).abs()
df["Weight_Diff_Pct"]   = df["Weight_Diff"] / df["Declared_Weight"].clip(lower=0.01) * 100
df["Weight_Risk_Level"] = df["Weight_Diff"].apply(
    lambda x: 0 if x <= q33_w else (1 if x <= q66_w else 2)
)
df["Value_per_Weight"]  = df["Declared_Value"] / (df["Declared_Weight"] + 1)
df["Value_Risk_Level"]  = df["Value_per_Weight"].apply(
    lambda x: 0 if x <= q33_v else (1 if x <= q66_v else 2)
)
df["Long_Dwell"]        = (df["Dwell_Time_Hours"] > dwell_p75).astype(int)
df["Total_Risk_Level"]  = df["Weight_Risk_Level"] + df["Value_Risk_Level"] + df["Long_Dwell"]
df["Suspicion_Score"]   = df["Weight_Risk_Level"] * df["Value_Risk_Level"]

# ── Encode categoricals ───────────────────────────────────────────────────────
CAT_COLS = ["Origin_Country", "Destination_Port", "Destination_Country", "HS_Code", "Shipping_Line"]
unseen_total = 0
for col in CAT_COLS:
    le = encoders[col]
    unseen = df[col].apply(lambda x: x not in le.classes_).sum()
    unseen_total += unseen
    df[col] = df[col].apply(lambda x: int(le.transform([x])[0]) if x in le.classes_ else -1)

# ── Build feature matrix ──────────────────────────────────────────────────────
FEATURE_NAMES = [
    "Origin_Country", "Destination_Port", "Destination_Country", "HS_Code",
    "Declared_Value", "Declared_Weight", "Measured_Weight", "Shipping_Line",
    "Dwell_Time_Hours", "Weight_Diff", "Weight_Diff_Pct", "Weight_Risk_Level",
    "Value_per_Weight", "Value_Risk_Level", "Long_Dwell", "Total_Risk_Level",
    "Suspicion_Score",
]
X = df[FEATURE_NAMES]

# ── Encode true labels ────────────────────────────────────────────────────────
RISK_MAP = {"Clear": 0, "Low Risk": 1, "Critical": 2}
INV_MAP  = {0: "Clear", 1: "Low Risk", 2: "Critical"}
y_true   = df["Clearance_Status"].map(RISK_MAP)

# ── Predict ───────────────────────────────────────────────────────────────────
y_pred   = model.predict(X)
y_proba  = model.predict_proba(X)

# Risk score: 0-100 scale
risk_scores = 50 * y_proba[:, 1] + 100 * y_proba[:, 2]

# ── Metrics ───────────────────────────────────────────────────────────────────
acc = accuracy_score(y_true, y_pred)
y_bin = label_binarize(y_true, classes=[0, 1, 2])
auc   = roc_auc_score(y_bin, y_proba, multi_class="ovr", average="weighted")

SEP = "=" * 62

print()
print(SEP)
print("  XGBoost Model  —  Real-Time Data Evaluation")
print(SEP)
print(f"  Accuracy        : {acc:.4f}   ({acc * 100:.2f}%)")
print(f"  ROC-AUC (w-OvR) : {auc:.4f}")
print(f"  Unseen labels   : {unseen_total}")
print()

print("Classification Report:")
print(classification_report(y_true, y_pred,
      target_names=["Clear", "Low Risk", "Critical"], digits=4))

print("Confusion Matrix  (rows = actual,  cols = predicted):")
cm     = confusion_matrix(y_true, y_pred)
labels = ["Clear   ", "Low Risk", "Critical"]
print(f"{'':18}  {'Clear':>8}  {'Low Risk':>8}  {'Critical':>8}")
for label, row in zip(labels, cm):
    print(f"  Actual {label}  {row[0]:>8}  {row[1]:>8}  {row[2]:>8}")

print()
print("Risk Score Distribution (model output buckets):")
buckets = [("CLEAR    (0–30) ", 0, 30), ("LOW RISK (30–55)", 30, 55), ("CRITICAL (55–100)", 55, 101)]
for name, lo, hi in buckets:
    cnt = int(((risk_scores >= lo) & (risk_scores < hi)).sum())
    pct = cnt / len(df) * 100
    bar = "#" * int(pct / 2)
    print(f"  {name}: {cnt:5,}  ({pct:5.1f}%)  {bar}")

print()
print("Sample Predictions (first 15 rows):")
header = f"  {'Container ID':>14}  {'Actual':>10}  {'Predicted':>10}  {'Score':>6}  {'P(Clear)':>9}  {'P(LowRisk)':>10}  {'P(Crit)':>8}  OK?"
print(header)
print("  " + "-" * (len(header) - 2))
for i in range(15):
    cid  = raw_df["Container_ID"].iloc[i]
    t    = INV_MAP[int(y_true.iloc[i])]
    p    = INV_MAP[int(y_pred[i])]
    s    = risk_scores[i]
    p0   = y_proba[i, 0]
    p1   = y_proba[i, 1]
    p2   = y_proba[i, 2]
    mark = "✓" if t == p else "✗ MISS"
    print(f"  {cid:>14}  {t:>10}  {p:>10}  {s:>6.1f}  {p0:>9.4f}  {p1:>10.4f}  {p2:>8.4f}  {mark}")

print()
print("Misclassified samples (up to 10):")
misses = [(i, raw_df["Container_ID"].iloc[i],
           INV_MAP[int(y_true.iloc[i])],
           INV_MAP[int(y_pred[i])],
           risk_scores[i])
          for i in range(len(y_true)) if y_true.iloc[i] != y_pred[i]]
if not misses:
    print("  None — perfect classification!")
else:
    print(f"  Total misclassified: {len(misses)}")
    print(f"  {'Container ID':>14}  {'Actual':>10}  {'Predicted':>10}  {'Score':>6}")
    for idx, cid, t, p, s in misses[:10]:
        print(f"  {cid:>14}  {t:>10}  {p:>10}  {s:>6.1f}")
