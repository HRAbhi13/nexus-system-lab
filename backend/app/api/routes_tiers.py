"""
routes_tiers.py - REST API Endpoints for Cloud Storage Tiers
NEXUS - Intelligent Cloud Storage Optimization System
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.storage.tier_manager import TierManager
from app.schemas.file_schema import StorageTierResponse

router = APIRouter()


@router.get(
    "",
    response_model=List[StorageTierResponse],
    summary="List cloud storage tiers",
    description="Returns all defined cloud storage tiers (HOT, WARM, COLD, ARCHIVE) with their current pricing."
)
def list_tiers(db: Session = Depends(get_db)):
    """Retrieve all available cloud storage tiers."""
    return TierManager.get_all_tiers(db)


@router.get(
    "/{tier_id}",
    response_model=StorageTierResponse,
    summary="Get storage tier details by ID",
    description="Retrieve rates and retention rules for a specific storage tier."
)
def get_tier(
    tier_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve details for a specific cloud storage tier."""
    tier = TierManager.get_tier_by_id(db, tier_id)
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Storage tier '{tier_id}' not found."
        )
    return tier


@router.get(
    "/pricing/estimate",
    summary="Estimate hypothetical tier cost",
    description="Calculates estimated storage and retrieval costs for a given volume (GB) across tiers."
)
def estimate_pricing(
    size_gb: float = Query(..., gt=0, description="Hypothetical data volume in Gigabytes"),
    months: float = Query(1.0, gt=0, description="Storage duration in months"),
    retrieval_gb: float = Query(0.0, ge=0, description="Projected data retrieval volume in Gigabytes"),
    db: Session = Depends(get_db),
):
    """Calculate cost comparison for a hypothetical data volume across all cloud tiers."""
    tiers = TierManager.get_all_tiers(db)
    comparison = {}

    size_bytes = int(size_gb * (1024 ** 3))
    for t in tiers:
        cost = TierManager.calculate_storage_cost(
            size_bytes=size_bytes,
            tier=t,
            months=months,
            retrieval_gb=retrieval_gb,
        )
        comparison[t.id] = {
            "tier_name": t.name,
            "storage_cost_per_gb_month": t.storage_cost_per_gb,
            "retrieval_cost_per_gb": t.retrieval_cost_per_gb,
            "estimated_total_cost_usd": cost,
        }

    return {
        "size_gb": size_gb,
        "months": months,
        "retrieval_gb": retrieval_gb,
        "comparison": comparison,
    }
