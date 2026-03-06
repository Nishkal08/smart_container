from pydantic import BaseModel, Field
from typing import Optional, List, Any
from enum import Enum


class RiskLevel(str, Enum):
    CLEAR = "CLEAR"
    LOW_RISK = "LOW_RISK"
    CRITICAL = "CRITICAL"


class ContainerInput(BaseModel):
    container_id: str
    declared_weight: float = Field(..., ge=0)
    measured_weight: float = Field(..., ge=0)
    declared_value: float = Field(..., ge=0)
    dwell_time_hours: float = Field(..., ge=0)
    origin_country: str
    hs_code: str
    destination_port: Optional[str] = ""
    destination_country: Optional[str] = ""
    trade_regime: Optional[str] = "Import"
    importer_id: Optional[str] = ""
    exporter_id: Optional[str] = ""
    shipping_line: Optional[str] = ""


class AnomalyDetail(BaseModel):
    type: str
    description: str
    severity: str  # LOW / MEDIUM / HIGH
    value: Optional[Any] = None


class FeatureContribution(BaseModel):
    feature: str
    contribution: float
    abs_contribution: float
    direction: str  # increases_risk / decreases_risk
    description: str


class PredictionResult(BaseModel):
    container_id: str
    risk_score: float = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    explanation_summary: str
    anomalies: List[AnomalyDetail] = []
    feature_contributions: List[FeatureContribution] = []
    weight_discrepancy_pct: Optional[float] = None
    value_per_kg: Optional[float] = None
    model_version: str
    is_mock: bool


class BatchPredictionRequest(BaseModel):
    containers: List[ContainerInput]


class BatchPredictionResponse(BaseModel):
    results: List[PredictionResult]
    total: int
    succeeded: int
    failed: int
    errors: List[dict] = []
    model_version: str
    is_mock: bool
