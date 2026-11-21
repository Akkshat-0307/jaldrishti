"""GET /health – liveness plus data-version check."""

from __future__ import annotations

from fastapi import APIRouter

from config import API_VERSION, DATA_VERSION, DEMO_MODE
from models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=API_VERSION,
        demo_mode=DEMO_MODE,
        data_version=DATA_VERSION,
    )
