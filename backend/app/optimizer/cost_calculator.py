"""
cost_calculator.py - Cloud Storage Cost Model & Financial ROI Calculator
NEXUS - Intelligent Cloud Storage Optimization System

Models cloud storage pricing, predicts monthly spend, and consolidates
deduplication, compression, and tier lifecycle ROI projections.
All reported savings are explicitly designated as algorithmic estimates.
"""

from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.file_metadata import FileMetadata
from app.optimizer.duplicate_detector import DuplicateDetector
from app.optimizer.compression_advisor import CompressionAdvisor
from app.optimizer.tier_recommender import TierRecommender
from app.storage.tier_manager import TierManager


class CostCalculator:
    """
    Computes cloud storage financial costs and estimates optimization savings.
    """

    @staticmethod
    def calculate_current_storage_spend(db: Session) -> Dict[str, Any]:
        """
        Calculate baseline monthly storage spend across all files and tiers.

        Args:
            db (Session): Database session.

        Returns:
            Dict[str, Any]: Total monthly spend and breakdown per tier.
        """
        files = db.query(FileMetadata).all()
        tiers_list = TierManager.get_all_tiers(db)
        tiers_by_id = {t.id: t for t in tiers_list}

        tier_bytes: Dict[str, int] = {t.id: 0 for t in tiers_list}
        for f in files:
            tier = f.storage_tier if f.storage_tier in tier_bytes else "HOT"
            tier_bytes[tier] += f.file_size_bytes

        total_bytes = sum(tier_bytes.values())
        tier_spend: Dict[str, float] = {}
        total_monthly_spend = 0.0

        for tier_id, byte_count in tier_bytes.items():
            tier_obj = tiers_by_id.get(tier_id)
            rate = tier_obj.storage_cost_per_gb if tier_obj else 0.023
            cost = (byte_count / (1024 ** 3)) * rate
            tier_spend[tier_id] = round(cost, 6)
            total_monthly_spend += cost

        return {
            "total_files": len(files),
            "total_bytes": total_bytes,
            "total_mb": round(total_bytes / (1024 * 1024), 4),
            "total_gb": round(total_bytes / (1024 ** 3), 6),
            "total_monthly_spend_usd": round(total_monthly_spend, 4),
            "tier_breakdown_usd": tier_spend,
        }

    @staticmethod
    def generate_comprehensive_roi_report(db: Session) -> Dict[str, Any]:
        """
        Generate an executive ROI report consolidating deduplication,
        compression, and lifecycle tier reallocation savings.

        Args:
            db (Session): Database session.

        Returns:
            Dict[str, Any]: Executive ROI report metrics.
        """
        current_spend_data = CostCalculator.calculate_current_storage_spend(db)
        total_monthly_spend = current_spend_data["total_monthly_spend_usd"]
        total_bytes = current_spend_data["total_bytes"]
        total_files = current_spend_data["total_files"]

        # 1. Deduplication Analysis
        dup_report = DuplicateDetector.audit_duplicates(db)
        dup_wasted_bytes = dup_report["total_wasted_bytes"]
        # Average rate to estimate dollar value of wasted duplicate bytes
        avg_rate_per_gb = (total_monthly_spend / (total_bytes / (1024 ** 3))) if total_bytes > 0 else 0.023
        dup_monthly_savings = (dup_wasted_bytes / (1024 ** 3)) * avg_rate_per_gb

        # 2. Compression Analysis
        comp_report = CompressionAdvisor.audit_compression(db)
        comp_savings_bytes = comp_report["total_estimated_savings_bytes"]
        comp_monthly_savings = (comp_savings_bytes / (1024 ** 3)) * avg_rate_per_gb

        # 3. Tier Reallocation Analysis
        tier_report = TierRecommender.audit_tier_lifecycle(db)
        tier_monthly_savings = tier_report["total_projected_monthly_savings"]

        # Combined Total Projected Savings
        total_projected_monthly_savings = round(
            dup_monthly_savings + comp_monthly_savings + tier_monthly_savings, 4
        )
        total_projected_annual_savings = round(total_projected_monthly_savings * 12, 4)

        overall_projected_savings_percentage = (
            round((total_projected_monthly_savings / total_monthly_spend) * 100, 2)
            if total_monthly_spend > 0 else 0.0
        )

        return {
            "total_files_stored": total_files,
            "total_capacity_bytes": total_bytes,
            "total_capacity_mb": current_spend_data["total_mb"],
            "current_monthly_spend": total_monthly_spend,

            # Deduplication
            "duplicate_files_count": dup_report["duplicate_files_count"],
            "deduplication_recoverable_bytes": dup_wasted_bytes,
            "deduplication_recoverable_mb": dup_report["total_wasted_mb"],
            "deduplication_estimated_savings_spend": round(dup_monthly_savings, 4),

            # Compression
            "compressible_files_count": comp_report["compressible_files_count"],
            "compression_recoverable_bytes": comp_savings_bytes,
            "compression_recoverable_mb": comp_report["total_estimated_savings_mb"],
            "compression_estimated_savings_spend": round(comp_monthly_savings, 4),

            # Tier Reallocation
            "tier_transition_candidates_count": tier_report["candidates_count"],
            "tier_reallocation_estimated_savings_spend": round(tier_monthly_savings, 4),

            # Financial Totals
            "total_projected_monthly_savings": total_projected_monthly_savings,
            "total_projected_annual_savings": total_projected_annual_savings,
            "overall_projected_savings_percentage": overall_projected_savings_percentage,
            "disclaimer": (
                "All projected savings and percentage reductions are algorithmic estimates "
                "based on cloud storage pricing models and content entropy."
            ),
        }
