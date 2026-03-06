from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "SmartContainer ML Service"
    DEBUG: bool = False

    # Internal API Key — must match backend's ML_SERVICE_API_KEY env var
    INTERNAL_API_KEY: str = "change_me_internal_api_key_must_match_ml_service"

    # ML model flags
    IS_MOCK_MODEL: bool = True
    MODEL_VERSION: str = "mock-v1.0"

    # Risk thresholds (score 0-100)
    CLEAR_THRESHOLD: float = 30.0
    LOW_RISK_THRESHOLD: float = 60.0
    # Anything above LOW_RISK_THRESHOLD = CRITICAL

    # CORS — restrict to Node.js backend only in production
    ALLOWED_ORIGINS: list[str] = ["http://backend:3000", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
