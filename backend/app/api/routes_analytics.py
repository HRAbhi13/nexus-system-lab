"""
routes_analytics.py - REST API Endpoints for Storage Analytics & Distributions
NEXUS - Intelligent Cloud Storage Optimization System
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.analytics.engine import AnalyticsEngine
from app.schemas.analytics_schema import (
    StorageOverviewMetrics,
    CategoryDistributionItem,
    TierDistributionItem,
    SizeBracketItem,
    StorageDashboardResponse,
)

router = APIRouter()


@router.get(
    "/overview",
    response_model=StorageOverviewMetrics,
    summary="Get high-level storage overview",
    description="Returns aggregate capacity, file count, average file size, and duplicate storage consumption."
)
def get_storage_overview(db: Session = Depends(get_db)):
    """Retrieve high-level storage capacity and duplicate volume metrics."""
    return AnalyticsEngine.get_storage_overview(db)


@router.get(
    "/categories",
    response_model=List[CategoryDistributionItem],
    summary="Get category distribution breakdown",
    description="Returns storage volume and file counts grouped by category (Document, Image, Video, etc.)."
)
def get_category_distribution(db: Session = Depends(get_db)):
    """Retrieve category breakdown using Pandas aggregations."""
    return AnalyticsEngine.get_category_distribution(db)


@router.get(
    "/tiers",
    response_model=List[TierDistributionItem],
    summary="Get tier distribution breakdown",
    description="Returns storage volume and file counts grouped by cloud tier (HOT, WARM, COLD, ARCHIVE)."
)
def get_tier_distribution(db: Session = Depends(get_db)):
    """Retrieve storage distribution across cloud tiers."""
    return AnalyticsEngine.get_tier_distribution(db)


@router.get(
    "/brackets",
    response_model=List[SizeBracketItem],
    summary="Get size distribution brackets",
    description="Returns file counts binned into standard size brackets (<1MB, 1-10MB, 10-50MB, 50-100MB, >100MB)."
)
def get_size_brackets(db: Session = Depends(get_db)):
    """Retrieve size distribution binning."""
    return AnalyticsEngine.get_size_distribution_brackets(db)


@router.get(
    "/dashboard",
    response_model=StorageDashboardResponse,
    summary="Get consolidated analytics dashboard",
    description="Returns complete analytics payload (overview, categories, tiers, size brackets) in one request."
)
def get_storage_dashboard(db: Session = Depends(get_db)):
    """Retrieve consolidated analytics payload for frontend charts."""
    return AnalyticsEngine.get_storage_dashboard(db)
