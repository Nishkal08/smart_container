"""FastAPI application entry point for the SmartContainer ML service."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.v1.predict import router as predict_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(
        "SmartContainer ML Service starting | version=%s | mock=%s",
        settings.MODEL_VERSION,
        settings.IS_MOCK_MODEL,
    )
    yield
    logger.info("ML Service shutting down.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="SmartContainer Risk Engine",
        description="AI-powered container risk scoring and anomaly detection.",
        version=settings.MODEL_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Restrict CORS — only the Node.js backend should call this service.
    # In production, set ALLOWED_ORIGINS to the internal network address.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["X-Internal-API-Key", "Content-Type"],
    )

    app.include_router(predict_router, prefix="")

    return app


app = create_app()
