"""
FastAPI route handlers for prediction endpoints.
All routes require the X-Internal-API-Key header (Node.js backend only).
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.core.security import verify_internal_api_key
from app.core.config import get_settings
from app.schemas.prediction import (
    ContainerInput,
    PredictionResult,
    BatchPredictionRequest,
    BatchPredictionResponse,
)
from app.models.risk_engine import compute_risk

router = APIRouter()


@router.get("/health")
def health_check(_: None = Depends(verify_internal_api_key)):
    """Liveness check — also returns model metadata."""
    settings = get_settings()
    return {
        "status": "ok",
        "model_version": settings.MODEL_VERSION,
        "is_mock": settings.IS_MOCK_MODEL,
        "thresholds": {
            "clear": settings.CLEAR_THRESHOLD,
            "low_risk": settings.LOW_RISK_THRESHOLD,
        },
    }


@router.post("/predict/single", response_model=PredictionResult)
def predict_single(
    container: ContainerInput,
    _: None = Depends(verify_internal_api_key),
):
    """
    Predict risk for a single container.
    Returns a full PredictionResult with score, level, explanation, and anomalies.
    """
    try:
        return compute_risk(container)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")


@router.post("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch(
    payload: BatchPredictionRequest,
    _: None = Depends(verify_internal_api_key),
):
    """
    Predict risk for a batch of containers.
    Processes each container independently; failed items are captured in errors[].
    """
    results: List[PredictionResult] = []
    errors: List[dict] = []

    for container in payload.containers:
        try:
            results.append(compute_risk(container))
        except Exception as exc:
            errors.append({
                "container_id": container.container_id,
                "error": str(exc),
            })

    return BatchPredictionResponse(
        results=results,
        total=len(payload.containers),
        succeeded=len(results),
        failed=len(errors),
        errors=errors,
    )
