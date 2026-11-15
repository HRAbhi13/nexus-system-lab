"""
tier_manager.py - Cloud Storage Tier Manager
NEXUS - Intelligent Cloud Storage Optimization System

Manages cloud storage tier metadata, seeds default tier pricing into the database,
and provides tier validation and cost calculations.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.storage_tier import StorageTier


class TierManager:
    """
    Manages cloud storage tiers (HOT, WARM, COLD, ARCHIVE) in the database.
    """

    @staticmethod
    def seed_default_tiers(db: Session) -> List[StorageTier]:
        """
        Seed default cloud tiers (from settings.TIER_PRICING) into the database
        if they are not already populated.

        Args:
            db (Session): Active SQLAlchemy database session.

        Returns:
            List[StorageTier]: The seeded or existing storage tier instances.
        """
        existing_tiers = db.query(StorageTier).all()
        if existing_tiers:
            return existing_tiers

        created_tiers = []
        for tier_id, tier_info in settings.TIER_PRICING.items():
            tier = StorageTier(
                id=tier_id,
                name=tier_info["name"],
                description=tier_info.get("description", ""),
                storage_cost_per_gb=tier_info["storage_cost_per_gb"],
                retrieval_cost_per_gb=tier_info.get("retrieval_cost_per_gb", 0.0),
                minimum_retention_days=tier_info.get("minimum_retention_days", 0),
            )
            db.add(tier)
            created_tiers.append(tier)

        db.commit()
        for t in created_tiers:
            db.refresh(t)

        return created_tiers

    @staticmethod
    def get_all_tiers(db: Session) -> List[StorageTier]:
        """Retrieve all defined storage tiers ordered by ID."""
        tiers = db.query(StorageTier).all()
        if not tiers:
            return TierManager.seed_default_tiers(db)
        return tiers

    @staticmethod
    def get_tier_by_id(db: Session, tier_id: str) -> Optional[StorageTier]:
        """
        Retrieve a specific storage tier by ID.

        Args:
            db (Session): Database session.
            tier_id (str): e.g. 'HOT', 'WARM', 'COLD', 'ARCHIVE'.
        """
        norm_id = tier_id.strip().upper()
        return db.query(StorageTier).filter(StorageTier.id == norm_id).first()

    @staticmethod
    def is_valid_tier(db: Session, tier_id: str) -> bool:
        """Check whether a tier ID exists in the database."""
        return TierManager.get_tier_by_id(db, tier_id) is not None

    @staticmethod
    def calculate_storage_cost(
        size_bytes: int,
        tier: StorageTier,
        months: float = 1.0,
        retrieval_gb: float = 0.0
    ) -> float:
        """
        Calculate storage and retrieval cost for a given size and tier.

        Formula:
        Cost = (GB * $/GB/mo * months) + (Retrieval_GB * $/GB)

        Args:
            size_bytes (int): Total size in bytes.
            tier (StorageTier): Storage tier instance.
            months (float): Duration in months (default 1.0).
            retrieval_gb (float): Projected retrieved volume in GB.

        Returns:
            float: Total estimated cost in USD.
        """
        size_gb = size_bytes / (1024 ** 3)
        storage_cost = size_gb * tier.storage_cost_per_gb * months
        retrieval_cost = retrieval_gb * tier.retrieval_cost_per_gb
        return round(storage_cost + retrieval_cost, 6)
