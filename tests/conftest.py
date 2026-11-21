"""Shared pytest fixtures for JalDrishti."""

import os
import sys
from typing import Generator

import pytest

# Ensure the API module is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

# Force demo mode in tests
os.environ["DEMO_MODE"] = "1"


@pytest.fixture()
def api_base_url() -> str:
    """Base URL for the test API."""
    return "http://localhost:8000"


@pytest.fixture()
def demo_mode() -> bool:
    """Whether DEMO_MODE is active."""
    return os.getenv("DEMO_MODE", "1") == "1"
