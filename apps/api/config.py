"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _bool_env(key: str, default: bool = True) -> bool:
    """Read a boolean env var (accepts 1/true/yes, case-insensitive)."""
    val = os.getenv(key)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes")


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

DEMO_MODE: bool = _bool_env("DEMO_MODE", default=True)
"""When True the API serves static JSON fallbacks with zero network."""

DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parent / ".." / ".." / "data")))
"""Root of the pre-processed data artefacts tree."""

API_VERSION: str = "0.1.0"
"""Semver string exposed on /health."""

DATA_VERSION: str = os.getenv("DATA_VERSION", "2026-11-21")
"""Date-stamp of the most recent data export."""
