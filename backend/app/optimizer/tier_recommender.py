"""
tier_recommender.py - Cloud Storage Lifecycle Tier Recommender
NEXUS - Intelligent Cloud Storage Optimization System

Audits file access frequencies and inactivity age, recommending transitions
between Hot, Warm, Cold, and Archive cloud tiers to optimize storage spend.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.file_metadata import FileMetadata
from app.models.storage_tier import StorageTier
from app.storage.tier_manager import TierManager


class TierRecommender:
    """
    Analyzes file access recency and recommends cost-effective storage tier transitions.
    """

    @staticmethod
    def get_recommended_tier_for_inactivity(inactivity_days: int) -> str:
        """
        Determine target cloud tier based on elapsed days since last access.

        Args:
            inactivity_days (int): Days since last file access.

        Returns:
            str: Recommended storage tier identifier.
        """
        thresholds = settings.TIER_THRESHOLDS
        if inactivity_days <= thresholds["HOT_MAX_DAYS"]:
            return "HOT"
        elif inactivity_days <= thresholds["WARM_MAX_DAYS"]:
            return "WARM"
        elif inactivity_days <= thresholds["COLD_MAX_DAYS"]:
            return "COLD"
        else:
            return "ARCHIVE"

    @staticmethod
    def audit_tier_lifecycle(
        db: Session, reference_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Audit all files in the database and generate lifecycle tier migration recommendations.

        Args:
            db (Session): Database session.
            reference_time (datetime, optional): Reference date for calculating age.
                                                 Defaults to current UTC time.

        Returns:
            Dict[str, Any]: Lifecycle optimization report.
        """
        files = db.query(FileMetadata).all()
        tiers_list = TierManager.get_all_tiers(db)
        tiers_by_id = {t.id: t for t in tiers_list}

        now = reference_time or datetime.now(timezone.utc).replace(tzinfo=None)
        if now.tzinfo is not None:
            now = now.astimezone(timezone.utc).replace(tzinfo=None)

        total_files = len(files)
        recommendations: List[Dict[str, Any]] = []

        total_current_monthly_spend = 0.0
        total_optimized_monthly_spend = 0.0

        for f in files:
            file_gb = f.file_size_bytes / (1024 ** 3)
            current_tier_obj = tiers_by_id.get(f.storage_tier)
            current_rate = current_tier_obj.storage_cost_per_gb if current_tier_obj else 0.023
            current_monthly_cost = file_gb * current_rate

            total_current_monthly_spend += current_monthly_cost

            # Calculate days since last access
            last_access = f.last_accessed_timestamp
            if last_access.tzinfo is not None:
                last_access = last_access.astimezone(timezone.utc).replace(tzinfo=None)

            delta = now - last_access
            inactivity_days = max(0, delta.days)

            recommended_tier_id = TierRecommender.get_recommended_tier_for_inactivity(inactivity_days)
            recommended_tier_obj = tiers_by_id.get(recommended_tier_id)
            recommended_rate = recommended_tier_obj.storage_cost_per_gb if recommended_tier_obj else current_rate
            recommended_monthly_cost = file_gb * recommended_rate

            # If moving to a more cost-effective tier generates savings
            if recommended_tier_id != f.storage_tier and recommended_monthly_cost < current_monthly_cost:
                projected_monthly_savings = current_monthly_cost - recommended_monthly_cost
                projected_savings_percentage = (
                    round((projected_monthly_savings / current_monthly_cost) * 100, 2)
                    if current_monthly_cost > 0 else 0.0
                )

                recommendations.append({
                    "file_id": f.id,
                    "filename": f.filename,
                    "category": f.category,
                    "file_size_bytes": f.file_size_bytes,
                    "file_size_mb": round(f.file_size_mb, 4),
                    "current_tier": f.storage_tier,
                    "recommended_tier": recommended_tier_id,
                    "days_since_last_access": inactivity_days,
                    "current_monthly_cost": round(current_monthly_cost, 6),
                    "recommended_monthly_cost": round(recommended_monthly_cost, 6),
                    "projected_monthly_savings": round(projected_monthly_savings, 6),
                    "projected_savings_percentage": projected_savings_percentage,
                    "reason": f"File inactive for {inactivity_days} days. Moving to {recommended_tier_id} reduces storage cost.",
                })

                total_optimized_monthly_spend += recommended_monthly_cost
            else:
                total_optimized_monthly_spend += current_monthly_cost

        # Sort recommendations by highest projected dollar savings first
        recommendations.sort(key=lambda r: r["projected_monthly_savings"], reverse=True)

        total_projected_monthly_savings = max(0.0, total_current_monthly_spend - total_optimized_monthly_spend)
        overall_projected_savings_percentage = (
            round((total_projected_monthly_savings / total_current_monthly_spend) * 100, 2)
            if total_current_monthly_spend > 0 else 0.0
        )

        return {
            "total_files_analyzed": total_files,
            "candidates_count": len(recommendations),
            "projected_current_monthly_spend": round(total_current_monthly_spend, 4),
            "projected_optimized_monthly_spend": round(total_optimized_monthly_spend, 4),
            "total_projected_monthly_savings": round(total_projected_monthly_savings, 4),
            "overall_projected_savings_percentage": overall_projected_savings_percentage,
            "recommendations": recommendations,
        }
