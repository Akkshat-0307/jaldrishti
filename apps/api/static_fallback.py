"""Helper to load static JSON fallbacks when DEMO_MODE is enabled.

Every API endpoint that needs live data should call ``load_fallback`` to serve
a pre-computed JSON file instead when :pydata:`config.DEMO_MODE` is ``True``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from config import DATA_DIR


def fallback_path(relative: str) -> Path:
    """Return the absolute path for a fallback file under DATA_DIR."""
    return DATA_DIR / relative


def load_fallback(relative: str) -> Any:
    """Load and return parsed JSON from a fallback file.

    Parameters
    ----------
    relative:
        Path relative to ``DATA_DIR``, e.g. ``"events/assam2022/manifest.json"``.

    Returns
    -------
    Any
        The parsed JSON value, or ``None`` when the file does not exist.
    """
    path = fallback_path(relative)
    if not path.is_file():
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)
