"""
SmartContainer Risk Engine — XGBoost Inference

Loads trained model artifacts from ml_service/artifacts/ at startup.
Falls back gracefully to the rule-based mock engine when artifacts
are not found (e.g. during initial setup before training).

Class mapping (matches train.py): 0=Clear  1=Low Risk  2=Critical
Risk score formula: 50*P(Low Risk) + 100*P(Critical)  →  0-100 scale
"""

import logging
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np

from app.schemas.prediction import AnomalyDetail, ContainerInput, FeatureContribution, PredictionResult, RiskLevel
from app.core.config import get_settings

logger = logging.getLogger("ml_service.risk_engine")

# ── Artifact paths ────────────────────────────────────────────────────────────
_ARTIFACTS_DIR = Path(__file__).parent.parent.parent / "artifacts"

# ── Runtime state ─────────────────────────────────────────────────────────────
_model = None
_encoders = None
_params = None
_shap_explainer = None
_use_real_model: bool = False

# Feature order — must match train.py FEATURE_NAMES exactly
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

CATEGORICAL_COLS = [
    "Origin_Country",
    "Destination_Port",
    "Destination_Country",
    "HS_Code",
    "Shipping_Line",
]

# SHAP → human-readable reason strings
_SHAP_REASON_MAP = {
    "Weight_Diff":        "large mismatch between declared and measured weight",
    "Weight_Diff_Pct":    "significant percentage weight discrepancy",
    "Value_per_Weight":   "unusual cargo value relative to weight",
    "Long_Dwell":         "container stayed unusually long at port",
    "Declared_Value":     "unusual declared cargo value",
    "Declared_Weight":    "suspicious declared cargo weight",
    "Measured_Weight":    "suspicious measured container weight",
    "HS_Code":            "commodity type with higher inspection risk",
    "Origin_Country":     "origin country flagged in risk profile",
    "Destination_Port":   "destination port with elevated inspection history",
    "Destination_Country":"destination country flagged in risk profile",
    "Shipping_Line":      "shipping carrier with elevated risk pattern",
    "Dwell_Time_Hours":   "extended port dwell time",
    "Weight_Risk_Level":  "elevated weight risk indicator",
    "Value_Risk_Level":   "elevated value anomaly",
    "Total_Risk_Level":   "multiple combined risk factors elevated",
    "Suspicion_Score":    "combined weight and value anomaly interaction detected",
}


# ── Artifact loading ──────────────────────────────────────────────────────────

def _load_artifacts():
    global _model, _encoders, _params, _shap_explainer, _use_real_model
    try:
        import joblib
        _model    = joblib.load(_ARTIFACTS_DIR / "model.pkl")
        _encoders = joblib.load(_ARTIFACTS_DIR / "encoders.pkl")
        _params   = joblib.load(_ARTIFACTS_DIR / "params.pkl")

        try:
            import shap
            _shap_explainer = shap.TreeExplainer(_model)
            logger.info("SHAP TreeExplainer loaded.")
        except Exception as e:
            logger.warning("SHAP not available (will use importance fallback): %s", e)

        _use_real_model = True
        logger.info("✅ XGBoost model loaded from %s", _ARTIFACTS_DIR)

    except FileNotFoundError:
        logger.warning(
            "⚠️  Artifacts not found at %s — using rule-based mock engine.", _ARTIFACTS_DIR
        )
        _use_real_model = False
    except Exception as exc:
        logger.error("Failed to load model artifacts: %s", exc, exc_info=True)
        _use_real_model = False


_load_artifacts()


# ── Feature vector construction ───────────────────────────────────────────────

def _encode_cat(col: str, value: Optional[str]) -> int:
    """Label-encode a categorical value; unknown values → index 0."""
    le = _encoders[col]
    val = str(value).strip() if value else "UNKNOWN"
    if val in set(le.classes_):
        return int(le.transform([val])[0])
    logger.debug("Unseen %s value '%s' — using fallback index 0", col, val)
    return 0


def _build_feature_vector(container: ContainerInput) -> np.ndarray:
    """Build a 1-D float32 feature vector matching the training pipeline."""
    p = _params
    declared_w = max(float(container.declared_weight), 1e-6)
    measured_w = float(container.measured_weight)
    declared_v = float(container.declared_value)
    dwell      = float(container.dwell_time_hours)

    # Engineered features
    weight_diff = abs(measured_w - declared_w)
    weight_diff_pct = weight_diff / declared_w * 100
    value_per_w = declared_v / (declared_w + 1.0)

    def _qbucket(val, q1, q2):
        return 0 if val <= q1 else (1 if val <= q2 else 2)

    weight_risk = _qbucket(weight_diff, p["weight_diff_q1"], p["weight_diff_q2"])
    value_risk  = _qbucket(value_per_w, p["vpw_q1"], p["vpw_q2"])
    long_dwell  = int(dwell > p["dwell_threshold"])
    total_risk  = weight_risk + value_risk + long_dwell
    suspicion   = weight_risk * value_risk

    # Categorical encoding
    origin      = _encode_cat("Origin_Country",     container.origin_country)
    dest_port   = _encode_cat("Destination_Port",   container.destination_port or "UNKNOWN")
    dest_cntry  = _encode_cat("Destination_Country", container.destination_country or "UNKNOWN")
    hs          = _encode_cat("HS_Code",             container.hs_code)
    ship        = _encode_cat("Shipping_Line",       container.shipping_line or "UNKNOWN")

    return np.array([
        origin,          # Origin_Country
        dest_port,       # Destination_Port
        dest_cntry,      # Destination_Country
        hs,              # HS_Code
        declared_v,      # Declared_Value
        declared_w,      # Declared_Weight
        measured_w,      # Measured_Weight
        ship,            # Shipping_Line
        dwell,           # Dwell_Time_Hours
        weight_diff,     # Weight_Diff
        weight_diff_pct, # Weight_Diff_Pct
        weight_risk,     # Weight_Risk_Level
        value_per_w,     # Value_per_Weight
        value_risk,      # Value_Risk_Level
        long_dwell,      # Long_Dwell
        total_risk,      # Total_Risk_Level
        suspicion,       # Suspicion_Score
    ], dtype=np.float32)


# ── Explanation helpers ───────────────────────────────────────────────────────

def _top_features(features: np.ndarray, risk_class_idx: int, top_n: int = 3) -> List[str]:
    """Return top contributing feature names for the given risk class."""
    if _shap_explainer is not None:
        try:
            sv = _shap_explainer.shap_values(features.reshape(1, -1))
            if isinstance(sv, list):
                class_vals = np.abs(sv[risk_class_idx][0])
            else:
                class_vals = np.abs(sv[0, :, risk_class_idx])
            top_idx = np.argsort(class_vals)[::-1][:top_n]
            return [FEATURE_NAMES[i] for i in top_idx if class_vals[i] > 0]
        except Exception as e:
            logger.debug("SHAP computation failed: %s", e)

    # Fallback: feature importance × |feature value|
    importances = np.abs(_model.feature_importances_) * np.abs(features)
    top_idx = np.argsort(importances)[::-1][:top_n]
    return [FEATURE_NAMES[i] for i in top_idx]


def _get_feature_contributions(features: np.ndarray, predicted_class: int) -> list:
    """Return SHAP-based feature contributions for the predicted class."""
    contributions = []
    if _shap_explainer is not None:
        try:
            sv = _shap_explainer.shap_values(features.reshape(1, -1))
            if isinstance(sv, list):
                class_vals = sv[predicted_class][0]
            else:
                class_vals = sv[0, :, predicted_class]
            # Sort by absolute impact
            sorted_idx = np.argsort(np.abs(class_vals))[::-1]
            # For class 0 (CLEAR): positive SHAP = more likely CLEAR = lower risk → invert direction
            # For all other classes (LOW_RISK, CRITICAL): positive SHAP = more likely that class = higher risk
            is_clear = (predicted_class == 0)
            for i in sorted_idx[:8]:  # top 8 features
                val = float(class_vals[i])
                if abs(val) < 0.001:
                    continue
                if is_clear:
                    direction = "decreases_risk" if val > 0 else "increases_risk"
                else:
                    direction = "increases_risk" if val > 0 else "decreases_risk"
                contributions.append({
                    "feature": FEATURE_NAMES[i],
                    "contribution": round(val, 4),
                    "abs_contribution": round(abs(val), 4),
                    "direction": direction,
                    "description": _SHAP_REASON_MAP.get(FEATURE_NAMES[i], FEATURE_NAMES[i]),
                })
            return contributions
        except Exception as e:
            logger.debug("SHAP contribution computation failed: %s", e)

    # Fallback: feature importance × feature value
    importances = _model.feature_importances_ * features
    sorted_idx = np.argsort(np.abs(importances))[::-1]
    is_clear = (predicted_class == 0)
    for i in sorted_idx[:8]:
        val = float(importances[i])
        if abs(val) < 0.001:
            continue
        if is_clear:
            direction = "decreases_risk" if val > 0 else "increases_risk"
        else:
            direction = "increases_risk" if val > 0 else "decreases_risk"
        contributions.append({
            "feature": FEATURE_NAMES[i],
            "contribution": round(val, 4),
            "abs_contribution": round(abs(val), 4),
            "direction": direction,
            "description": _SHAP_REASON_MAP.get(FEATURE_NAMES[i], FEATURE_NAMES[i]),
        })
    return contributions


def _build_anomalies(
    container: ContainerInput,
    features: np.ndarray,
    risk_level: RiskLevel,
    probs: np.ndarray,
) -> Tuple[List[AnomalyDetail], str]:
    """Build anomaly list and plain-English explanation."""
    anomalies = []
    p = _params
    declared_w = max(float(container.declared_weight), 1e-6)
    measured_w = float(container.measured_weight)
    dwell      = float(container.dwell_time_hours)

    # Weight discrepancy
    disc_pct = abs(measured_w - declared_w) / declared_w * 100
    if disc_pct > 10:
        sev = "HIGH" if disc_pct > 30 else "MEDIUM"
        anomalies.append(AnomalyDetail(
            type="weight_discrepancy",
            description=(
                f"Measured weight differs from declared by {disc_pct:.1f}% "
                f"({declared_w:.1f} kg declared vs {measured_w:.1f} kg measured)."
            ),
            severity=sev,
            value=round(disc_pct, 2),
        ))

    # Long dwell time
    if dwell > p.get("dwell_threshold", 72):
        anomalies.append(AnomalyDetail(
            type="excessive_dwell_time",
            description=f"Container dwell time of {dwell:.1f} hours exceeds normal threshold.",
            severity="HIGH" if dwell > 120 else "MEDIUM",
            value=round(dwell, 1),
        ))

    # Value anomaly
    vpk = float(container.declared_value) / (declared_w + 1)
    if vpk < p.get("vpw_q1", 0) * 0.05:
        anomalies.append(AnomalyDetail(
            type="value_underreporting",
            description=f"Declared value per kg ({vpk:.2f}) is unusually low — possible undervaluation.",
            severity="MEDIUM",
            value=round(vpk, 4),
        ))
    elif vpk > p.get("vpw_q2", float("inf")) * 20:
        anomalies.append(AnomalyDetail(
            type="value_overstatement",
            description=f"Declared value per kg ({vpk:.2f}) is unusually high.",
            severity="MEDIUM",
            value=round(vpk, 2),
        ))

    # Explanation
    risk_class_idx = 2  # critical class contributions
    top_feats = _top_features(features, risk_class_idx)
    reasons = [_SHAP_REASON_MAP[f] for f in top_feats if f in _SHAP_REASON_MAP]

    risk_score = round(float(50 * probs[1] + 100 * probs[2]), 1)

    if risk_level == RiskLevel.CLEAR:
        explanation = (
            f"Container cleared risk assessment (score {risk_score:.0f}/100). "
            "No significant anomalies detected."
        )
    elif risk_level == RiskLevel.LOW_RISK:
        reason_str = "; ".join(reasons[:2]) if reasons else "minor anomalies present"
        explanation = (
            f"Low risk flagged (score {risk_score:.0f}/100) — {reason_str}. "
            "Document review recommended."
        )
    else:
        if disc_pct > 15:
            explanation = (
                f"Critical risk (score {risk_score:.0f}/100): "
                f"{disc_pct:.1f}% weight discrepancy "
                f"({declared_w:.0f} kg declared vs {measured_w:.0f} kg measured). "
            )
        else:
            explanation = f"Critical risk (score {risk_score:.0f}/100). "
        if reasons:
            explanation += f"Key factors: {'; '.join(reasons[:3])}."

    return anomalies, explanation


# ── Public entry point ────────────────────────────────────────────────────────

def compute_risk(container: ContainerInput) -> PredictionResult:
    """Compute risk for a single container. Route to real or mock engine."""
    if _use_real_model:
        return _infer_real(container)
    return _infer_mock(container)


def _infer_real(container: ContainerInput) -> PredictionResult:
    """XGBoost inference path."""
    settings = get_settings()
    features = _build_feature_vector(container)
    probs = _model.predict_proba(features.reshape(1, -1))[0]
    # probs: [P(Clear), P(LowRisk), P(Critical)]  (class order from RISK_MAP in train.py)

    risk_score = float(np.clip(50 * probs[1] + 100 * probs[2], 0, 100))

    if risk_score < 30:
        risk_level = RiskLevel.CLEAR
    elif risk_score < 55:
        risk_level = RiskLevel.LOW_RISK
    else:
        risk_level = RiskLevel.CRITICAL

    predicted_class = int(np.argmax(probs))
    declared_w = max(float(container.declared_weight), 1e-6)
    disc_pct   = abs(float(container.measured_weight) - declared_w) / declared_w * 100
    vpk        = float(container.declared_value) / (declared_w + 1)

    anomalies, explanation = _build_anomalies(container, features, risk_level, probs)
    feature_contributions = _get_feature_contributions(features, predicted_class)

    return PredictionResult(
        container_id=container.container_id,
        risk_score=round(risk_score, 2),
        risk_level=risk_level,
        explanation_summary=explanation,
        anomalies=anomalies,
        feature_contributions=feature_contributions,
        weight_discrepancy_pct=round(disc_pct, 2),
        value_per_kg=round(vpk, 4),
        model_version=settings.MODEL_VERSION,
        is_mock=False,
    )


# ── Rule-based mock fallback ──────────────────────────────────────────────────
# Kept intact so the service works before model training.

_HIGH_RISK_COUNTRIES = {
    "AF", "IQ", "IR", "KP", "LY", "SO", "SS", "SD", "SY", "YE"
}
_MEDIUM_RISK_COUNTRIES = {
    "MM", "VE", "ZW", "BY", "CD", "CF", "ML", "NI", "PK"
}
_HIGH_SENS_HS = {"93", "71", "29", "30", "28"}
_MED_SENS_HS  = {"85", "84", "27", "38", "87"}
_MOCK_WEIGHTS = {
    "weight": 0.35, "value": 0.25, "dwell": 0.20, "country": 0.10, "hs": 0.10,
}


def _infer_mock(container: ContainerInput) -> PredictionResult:
    """Rule-based mock scoring (fallback when artifacts not found)."""
    settings = get_settings()

    declared_w = max(float(container.declared_weight), 1e-6)
    measured_w = float(container.measured_weight)
    disc_pct   = abs(measured_w - declared_w) / declared_w * 100

    # Weight score
    if disc_pct <= 2:      ws = 0.0
    elif disc_pct <= 5:    ws = 10.0 + (disc_pct - 2) * 5
    elif disc_pct <= 10:   ws = 25.0 + (disc_pct - 5) * 7
    elif disc_pct <= 20:   ws = 60.0 + (disc_pct - 10) * 3
    else:                  ws = min(100.0, 90.0 + (disc_pct - 20) * 0.5)

    # Value score
    vpk = float(container.declared_value) / (declared_w + 1)
    vs  = 85.0 if vpk < 0.01 else (75.0 if vpk > 100000 else (60.0 if vpk < 1.0 else 10.0))

    # Dwell score
    d = float(container.dwell_time_hours)
    ds = 0 if d <= 24 else (15 if d <= 48 else (35 if d <= 72 else (65 if d <= 120 else (85 if d <= 168 else 95))))

    # Country score
    cc  = container.origin_country.upper()
    cs  = 90.0 if cc in _HIGH_RISK_COUNTRIES else (50.0 if cc in _MEDIUM_RISK_COUNTRIES else 10.0)

    # HS code score
    hs2 = str(container.hs_code)[:2]
    hs  = 80.0 if hs2 in _HIGH_SENS_HS else (40.0 if hs2 in _MED_SENS_HS else 10.0)

    risk_score = round(
        ws * _MOCK_WEIGHTS["weight"] +
        vs * _MOCK_WEIGHTS["value"] +
        ds * _MOCK_WEIGHTS["dwell"] +
        cs * _MOCK_WEIGHTS["country"] +
        hs * _MOCK_WEIGHTS["hs"],
        2,
    )

    if risk_score < settings.CLEAR_THRESHOLD:
        risk_level = RiskLevel.CLEAR
    elif risk_score < settings.LOW_RISK_THRESHOLD:
        risk_level = RiskLevel.LOW_RISK
    else:
        risk_level = RiskLevel.CRITICAL

    anomalies = []
    if disc_pct > 10:
        anomalies.append(AnomalyDetail(
            type="weight_discrepancy",
            description=f"Weight differs by {disc_pct:.1f}% ({declared_w:.1f} kg vs {measured_w:.1f} kg).",
            severity="HIGH" if disc_pct > 30 else "MEDIUM",
            value=round(disc_pct, 2),
        ))
    if d > 72:
        anomalies.append(AnomalyDetail(
            type="excessive_dwell_time",
            description=f"Dwell time of {d:.1f}h exceeds normal threshold.",
            severity="HIGH" if d > 120 else "MEDIUM",
            value=round(d, 1),
        ))

    if risk_level == RiskLevel.CLEAR:
        explanation = f"Container cleared (score {risk_score:.0f}/100). No significant anomalies."
    elif risk_level == RiskLevel.LOW_RISK:
        explanation = f"Low risk (score {risk_score:.0f}/100). Minor anomalies flagged — document review recommended."
    else:
        explanation = (
            f"Critical risk (score {risk_score:.0f}/100): "
            + (f"{disc_pct:.1f}% weight discrepancy. " if disc_pct > 15 else "")
            + (f"Dwell time {d:.1f}h. " if d > 72 else "")
            + "Physical inspection recommended."
        )

    return PredictionResult(
        container_id=container.container_id,
        risk_score=risk_score,
        risk_level=risk_level,
        explanation_summary=explanation,
        anomalies=anomalies,
        feature_contributions=[],
        weight_discrepancy_pct=round(disc_pct, 2),
        value_per_kg=round(vpk, 4),
        model_version=settings.MODEL_VERSION,
        is_mock=True,
    )


