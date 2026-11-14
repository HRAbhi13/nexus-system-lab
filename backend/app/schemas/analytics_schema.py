"""
analytics_schema.py - Pydantic Schemas for Storage Analytics & Telemetry
NEXUS - Intelligent Cloud Storage Optimization System
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class CategoryDistributionItem(BaseModel):
    """Distribution metrics for a single file category."""
    category: str
    file_count: int
    total_bytes: int
    total_mb: float
    percentage_of_total_bytes: float = Field(..., description="Percentage of total storage volume")
    percentage_of_total_files: float = Field(..., description="Percentage of total file count")


class TierDistributionItem(BaseModel):
    """Distribution metrics for a single cloud storage tier."""
    storage_tier: str
    file_count: int
    total_bytes: int
    total_mb: float
    percentage_of_total_bytes: float


class SizeBracketItem(BaseModel):
    """File count and volume within a specific size bracket."""
    bracket_label: str
    file_count: int
    total_bytes: int
    total_mb: float


class StorageOverviewMetrics(BaseModel):
    """Executive high-level summary of storage capacity and distributions."""
    total_files: int
    total_bytes: int
    total_mb: float
    total_gb: float
    average_file_size_mb: float
    largest_file_size_mb: float
    duplicate_files_count: int
    duplicate_wasted_bytes: int
    duplicate_wasted_mb: float
    duplicate_volume_percentage: float


class StorageDashboardResponse(BaseModel):
    """Consolidated telemetry response for frontend analytics charts and tables."""
    overview: StorageOverviewMetrics
    category_distribution: List[CategoryDistributionItem]
    tier_distribution: List[TierDistributionItem]
    size_brackets: List[SizeBracketItem]
