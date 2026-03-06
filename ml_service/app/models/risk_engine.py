"""
Mock Risk Engine — Rule-based scoring system.

This is a placeholder until the real ML model is ready (Day 2).
It produces realistic, deterministic risk scores using engineered features
from the container data, matching the same output schema the real model will use.

When the real model is ready:
1. Load model artifact in `load_model()` 
2. Replace `_calculate_score()` with actual model inference
3. Set IS_MOCK_MODEL=false in .env
4. Add SHAP explainability in `_generate_explanation()`
"""

from typing import Optional, List, Dict, Any
from app.schemas.prediction import ContainerInput, PredictionResult, AnomalyDetail, RiskLevel
from app.core.config import get_settings


# ── Risk Configuration ───────────────────────────────────────────────────────

# Countries with elevated customs risk (static starting tier)
HIGH_RISK_COUNTRIES = {
    "AF", "IQ", "IR", "KP", "LY", "SO", "SS", "SD", "SY", "YE"
}
MEDIUM_RISK_COUNTRIES = {
    "MM", "VE", "ZW", "BY", "CD", "CF", "ML", "NI", "PK"
}

# HS code prefixes associated with high-scrutiny goods
HIGH_SENSITIVITY_HS_PREFIXES = {
    "93",  # Arms and ammunition
    "71",  # Precious metals and stones
    "29",  # Organic chemicals
    "30",  # Pharmaceutical products
    "28",  # Inorganic chemicals
}

MEDIUM_SENSITIVITY_HS_PREFIXES = {
    "85",  # Electrical/electronic equipment (often undervalued)
    "84",  # Machinery
    "27",  # Mineral fuels
    "38",  # Chemical products
    "87",  # Vehicles
}

# Feature weights for composite score
WEIGHTS = {
    "weight_discrepancy": 0.35,
    "value_anomaly": 0.25,
    "dwell_time": 0.20,
    "country_risk": 0.10,
    "hs_code": 0.10,
}


# ── Feature Calculators ──────────────────────────────────────────────────────

def calc_weight_discrepancy_score(declared: float, measured: float) -> tuple[float, float]:
    """
    Returns (score 0-100, discrepancy_pct).
    A discrepancy > 30% → near-max score.
    """
    if declared <= 0:
        return 20.0, 0.0

    discrepancy_pct = abs(measured - declared) / declared * 100

    if discrepancy_pct <= 2.0:
        score = 0.0
    elif discrepancy_pct <= 5.0:
        score = 10.0 + (discrepancy_pct - 2) * 5    # 10–25
    elif discrepancy_pct <= 10.0:
        score = 25.0 + (discrepancy_pct - 5) * 7    # 25–60
    elif discrepancy_pct <= 20.0:
        score = 60.0 + (discrepancy_pct - 10) * 3   # 60–90
    else:
        score = min(100.0, 90.0 + (discrepancy_pct - 20) * 0.5)

    return round(score, 1), round(discrepancy_pct, 2)


def calc_value_per_kg_score(declared_value: float, declared_weight: float) -> tuple[float, float]:
    """
    Returns (score 0-100, value_per_kg).
    Flags extreme outliers (unusually high or zero/near-zero value per kg).
    """
    if declared_weight <= 0:
        return 30.0, 0.0

    vpk = declared_value / declared_weight

    # Extremely low value for weight (undervaluation)
    if vpk < 0.01:
        return 85.0, round(vpk, 4)
    # Very high value per kg — might be mislabeled goods
    if vpk > 100000:
        return 75.0, round(vpk, 2)
    # Suspicious range: near-zero value
    if vpk < 1.0:
        return 60.0, round(vpk, 4)

    # Normal range: score low
    return 10.0, round(vpk, 2)


def calc_dwell_time_score(dwell_hours: float) -> float:
    """
    Returns score 0-100 based on dwell time.
    Very long dwell = potential hold or document issue.
    """
    if dwell_hours < 0:
        return 0.0
    if dwell_hours <= 24:
        return 0.0
    if dwell_hours <= 48:
        return 15.0
    if dwell_hours <= 72:
        return 35.0
    if dwell_hours <= 120:
        return 65.0
    if dwell_hours <= 168:
        return 85.0
    return 95.0


def calc_country_risk_score(origin_country: str) -> float:
    """Returns 0-100 country risk score."""
    code = origin_country.upper()
    if code in HIGH_RISK_COUNTRIES:
        return 90.0
    if code in MEDIUM_RISK_COUNTRIES:
        return 50.0
    return 10.0


def calc_hs_code_score(hs_code: str) -> float:
    """Returns 0-100 HS code sensitivity score."""
    hs_str = str(hs_code).strip()
    prefix2 = hs_str[:2]
    if prefix2 in HIGH_SENSITIVITY_HS_PREFIXES:
        return 80.0
    if prefix2 in MEDIUM_SENSITIVITY_HS_PREFIXES:
        return 40.0
    return 10.0


# ── Composite Scorer ─────────────────────────────────────────────────────────

def compute_risk(container: ContainerInput) -> PredictionResult:
    settings = get_settings()

    weight_score, discrepancy_pct = calc_weight_discrepancy_score(
        container.declared_weight, container.measured_weight
    )
    value_score, value_per_kg = calc_value_per_kg_score(
        container.declared_value, container.declared_weight
    )
    dwell_score = calc_dwell_time_score(container.dwell_time_hours)
    country_score = calc_country_risk_score(container.origin_country)
    hs_score = calc_hs_code_score(container.hs_code)

    # Weighted composite score
    composite = (
        weight_score * WEIGHTS["weight_discrepancy"]
        + value_score * WEIGHTS["value_anomaly"]
        + dwell_score * WEIGHTS["dwell_time"]
        + country_score * WEIGHTS["country_risk"]
        + hs_score * WEIGHTS["hs_code"]
    )
    risk_score = round(min(100.0, max(0.0, composite)), 1)

    # Risk level classification
    if risk_score <= settings.CLEAR_THRESHOLD:
        risk_level = RiskLevel.CLEAR
    elif risk_score <= settings.LOW_RISK_THRESHOLD:
        risk_level = RiskLevel.LOW_RISK
    else:
        risk_level = RiskLevel.CRITICAL

    # Anomaly detection
    anomalies: List[AnomalyDetail] = []

    if discrepancy_pct > 10.0:
        severity = "HIGH" if discrepancy_pct > 20 else "MEDIUM"
        anomalies.append(AnomalyDetail(
            type="weight_discrepancy",
            description=f"Measured weight is {discrepancy_pct:.1f}% {'higher' if container.measured_weight > container.declared_weight else 'lower'} than declared",
            severity=severity,
            value=discrepancy_pct,
        ))

    if container.dwell_time_hours > 72:
        anomalies.append(AnomalyDetail(
            type="excessive_dwell_time",
            description=f"Container has been at port for {container.dwell_time_hours:.1f} hours ({container.dwell_time_hours / 24:.1f} days)",
            severity="HIGH" if container.dwell_time_hours > 120 else "MEDIUM",
            value=container.dwell_time_hours,
        ))

    if value_per_kg < 0.5 and container.declared_weight > 100:
        anomalies.append(AnomalyDetail(
            type="suspicious_valuation",
            description=f"Extremely low value per kg: {value_per_kg:.4f}. Potential undervaluation.",
            severity="HIGH",
            value=value_per_kg,
        ))

    if container.origin_country.upper() in HIGH_RISK_COUNTRIES:
        anomalies.append(AnomalyDetail(
            type="high_risk_origin",
            description=f"Origin country {container.origin_country} is flagged as high-risk.",
            severity="MEDIUM",
            value=container.origin_country,
        ))

    # Generate human-readable explanation
    explanation = _generate_explanation(
        risk_level=risk_level,
        risk_score=risk_score,
        discrepancy_pct=discrepancy_pct,
        dwell_hours=container.dwell_time_hours,
        value_per_kg=value_per_kg,
        origin_country=container.origin_country,
        hs_code=container.hs_code,
        anomalies=anomalies,
        scores={
            "weight": weight_score,
            "value": value_score,
            "dwell": dwell_score,
            "country": country_score,
            "hs": hs_score,
        }
    )

    return PredictionResult(
        container_id=container.container_id,
        risk_score=risk_score,
        risk_level=risk_level,
        explanation_summary=explanation,
        anomalies=anomalies,
        weight_discrepancy_pct=discrepancy_pct,
        value_per_kg=value_per_kg,
        model_version=settings.MODEL_VERSION,
        is_mock=settings.IS_MOCK_MODEL,
    )


def _generate_explanation(
    risk_level: RiskLevel,
    risk_score: float,
    discrepancy_pct: float,
    dwell_hours: float,
    value_per_kg: float,
    origin_country: str,
    hs_code: str,
    anomalies: list,
    scores: dict,
) -> str:
    """
    Produces a 1-2 sentence human-readable explanation for the prediction.
    Cites the top contributing factor first.
    """
    if risk_level == RiskLevel.CLEAR:
        parts = []
        if discrepancy_pct <= 2:
            parts.append("weight measurements match declared values")
        if dwell_hours <= 48:
            parts.append("dwell time is within normal range")
        if not parts:
            return "No significant anomalies detected. Container cleared as low-risk."
        return f"No significant anomalies detected. {' and '.join(parts).capitalize()}. Container cleared."

    # Rank factors by their individual scores
    factor_ranking = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_factor = factor_ranking[0][0]

    explanations = []

    if top_factor == "weight" and discrepancy_pct > 5:
        explanations.append(
            f"Weight discrepancy of {discrepancy_pct:.1f}% between declared ({scores.get('weight', 0):.0f}kg) "
            f"and measured weight is the primary risk driver."
        )
    elif top_factor == "dwell" and dwell_hours > 48:
        explanations.append(
            f"Extended dwell time of {dwell_hours:.1f} hours ({dwell_hours/24:.1f} days) suggests potential hold or documentation issues."
        )
    elif top_factor == "value":
        explanations.append(
            f"Value-to-weight ratio ({value_per_kg:.2f} per kg) is outside expected range for this commodity."
        )
    elif top_factor == "country":
        explanations.append(
            f"Origin country {origin_country} has elevated risk classification."
        )
    elif top_factor == "hs":
        explanations.append(
            f"HS code {hs_code} falls under a high-scrutiny commodity category."
        )

    # Add secondary factor if significant
    if len(factor_ranking) > 1 and factor_ranking[1][1] > 40:
        second = factor_ranking[1][0]
        if second == "weight" and discrepancy_pct > 5 and top_factor != "weight":
            explanations.append(f"Weight discrepancy of {discrepancy_pct:.1f}% also noted.")
        elif second == "dwell" and dwell_hours > 72 and top_factor != "dwell":
            explanations.append(f"Dwell time of {dwell_hours:.1f}h is also above threshold.")

    if not explanations:
        return f"Risk score of {risk_score:.0f}/100 based on combined anomaly indicators."

    return " ".join(explanations)
