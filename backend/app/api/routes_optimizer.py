"""
routes_optimizer.py - REST API Endpoints for Intelligent Optimization & Cost Models
NEXUS - Intelligent Cloud Storage Optimization System
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.optimizer.duplicate_detector import DuplicateDetector
from app.optimizer.compression_advisor import CompressionAdvisor
from app.optimizer.tier_recommender import TierRecommender
from app.optimizer.cost_calculator import CostCalculator
from app.schemas.optimizer_schema import (
    DuplicateAuditReport,
    CompressionAuditReport,
    TierLifecycleReport,
    ComprehensiveOptimizationReport,
)

router = APIRouter()


@router.get(
    "/duplicates",
    response_model=DuplicateAuditReport,
    summary="Audit duplicate files",
    description="Groups files by cryptographic SHA-256 hash, identifies master copies, and computes recoverable duplicate bytes."
)
def audit_duplicates(db: Session = Depends(get_db)):
    """Run duplicate detection audit and list all duplicate clusters."""
    return DuplicateDetector.audit_duplicates(db)


@router.post(
    "/duplicates/resync",
    summary="Resynchronize duplicate flags",
    description="Scans the database and synchronizes all `is_duplicate` and `original_file_id` pointers."
)
def resync_duplicates(db: Session = Depends(get_db)):
    """Resync all duplicate flags across the storage estate."""
    updated = DuplicateDetector.resync_duplicate_flags(db)
    return {"message": "Duplicate flags successfully resynchronized.", "records_updated": updated}


@router.get(
    "/compression",
    response_model=CompressionAuditReport,
    summary="Audit compression opportunities",
    description="Evaluates file compressibility based on format and entropy, estimating recoverable storage."
)
def audit_compression(db: Session = Depends(get_db)):
    """Run compression advisory evaluation across all files."""
    return CompressionAdvisor.audit_compression(db)


@router.get(
    "/lifecycle",
    response_model=TierLifecycleReport,
    summary="Audit cloud lifecycle tier transitions",
    description="Analyzes inactivity and age to recommend cost-saving transitions (Hot -> Warm -> Cold -> Archive)."
)
def audit_lifecycle(db: Session = Depends(get_db)):
    """Run lifecycle tier reallocation analysis and calculate projected monthly savings."""
    return TierRecommender.audit_tier_lifecycle(db)


@router.get(
    "/roi",
    response_model=ComprehensiveOptimizationReport,
    summary="Executive optimization ROI report",
    description="Consolidates deduplication, compression, and tier lifecycle savings into bottom-line monthly and annual dollar savings."
)
def get_optimization_roi_report(db: Session = Depends(get_db)):
    """Generate consolidated financial ROI report across all optimization vectors."""
    return CostCalculator.generate_comprehensive_roi_report(db)
