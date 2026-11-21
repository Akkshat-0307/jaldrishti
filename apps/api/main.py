"""JalDrishti FastAPI application entry-point.

Run locally with:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import API_VERSION, DEMO_MODE
from routers import alerts, beacons, events, forecast, health, impact, route, whatif


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle hook."""
    print(f"JalDrishti API v{API_VERSION} starting (DEMO_MODE={DEMO_MODE})")
    yield
    print("JalDrishti API shutting down")


app = FastAPI(
    title="JalDrishti API",
    description="Flood-intelligence platform – sense, predict, assess, act, reach.",
    version=API_VERSION,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS – allow all origins for development
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router)
app.include_router(events.router)
app.include_router(impact.router)
app.include_router(route.router)
app.include_router(whatif.router)
app.include_router(forecast.router)
app.include_router(alerts.router)
app.include_router(beacons.router)


# ---------------------------------------------------------------------------
# Consistent error body for HTTP exceptions
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def _generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a consistent {code, message} error body for unhandled errors."""
    return JSONResponse(
        status_code=500,
        content={"code": 500, "message": str(exc)},
    )
