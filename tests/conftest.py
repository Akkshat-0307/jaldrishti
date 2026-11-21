"""Shared pytest fixtures for JalDrishti."""

import os
import sys
from typing import Generator

import pytest

# Ensure the API module and root modules (pipeline, etc.) are importable
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, repo_root)
sys.path.insert(0, os.path.join(repo_root, "apps", "api"))

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
