from fastapi import Header, HTTPException, status
from app.core.config import get_settings


def verify_internal_api_key(x_internal_api_key: str = Header(..., alias="X-Internal-API-Key")) -> None:
    """
    Dependency that verifies the internal API key.
    Prevents direct public access to the ML service.
    """
    settings = get_settings()
    if x_internal_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal API key",
        )
