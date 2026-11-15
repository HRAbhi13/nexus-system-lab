"""
config.py - Core Configuration for NEXUS
Intelligent Cloud Storage Optimization System
"""

import os
from pathlib import Path
from typing import Dict, Any
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings for NEXUS Cloud Storage Optimization System.
    Loads configurations with environment variable override capabilities.
    """

    # Project Information
    PROJECT_NAME: str = "NEXUS – Intelligent Cloud Storage Optimization System"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Base Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = Path(__file__).resolve().parent.parent.parent / "storage_bucket"

    # Database Configuration
    DATABASE_URL: str = "sqlite:///./nexus_storage.db"

    # Simulated Cloud Storage Tier Definitions & Pricing ($ per GB per month)
    TIER_PRICING: Dict[str, Dict[str, Any]] = {
        "HOT": {
            "name": "Hot (Standard)",
            "description": "Frequently accessed files with zero retrieval cost.",
            "storage_cost_per_gb": 0.023,
            "retrieval_cost_per_gb": 0.000,
            "minimum_retention_days": 0,
        },
        "WARM": {
            "name": "Warm (Infrequent Access)",
            "description": "Accessed less than once a month with low retrieval fee.",
            "storage_cost_per_gb": 0.0125,
            "retrieval_cost_per_gb": 0.010,
            "minimum_retention_days": 30,
        },
        "COLD": {
            "name": "Cold (Coldline)",
            "description": "Infrequently accessed files (once a quarter or less).",
            "storage_cost_per_gb": 0.004,
            "retrieval_cost_per_gb": 0.030,
            "minimum_retention_days": 90,
        },
        "ARCHIVE": {
            "name": "Archive (Glacier)",
            "description": "Long-term archive with lowest storage price, high retrieval fee.",
            "storage_cost_per_gb": 0.00099,
            "retrieval_cost_per_gb": 0.050,
            "minimum_retention_days": 180,
        },
    }

    # Lifecycle Age & Inactivity Thresholds (in days)
    TIER_THRESHOLDS: Dict[str, int] = {
        "HOT_MAX_DAYS": 30,
        "WARM_MAX_DAYS": 90,
        "COLD_MAX_DAYS": 180,
    }

    # Default Large File Threshold (files >= 50MB flagged for special handling)
    LARGE_FILE_THRESHOLD_BYTES: int = 50 * 1024 * 1024

    model_config = SettingsConfigDict(
        env_prefix="NEXUS_",
        env_file=".env",
        extra="ignore"
    )


settings = Settings()


def get_settings() -> Settings:
    """Return the global application settings instance."""
    return settings
