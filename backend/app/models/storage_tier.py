"""
storage_tier.py - SQLAlchemy Model for Cloud Storage Tiers
NEXUS - Intelligent Cloud Storage Optimization System
"""

from sqlalchemy import Column, String, Float, Integer
from app.core.database import Base


class StorageTier(Base):
    """
    Represents a cloud storage tier (e.g. HOT, WARM, COLD, ARCHIVE).
    Stores unit pricing for storage and data retrieval, along with minimum retention rules.
    """
    __tablename__ = "storage_tiers"

    id = Column(String(32), primary_key=True, index=True)  # e.g. "HOT", "WARM", "COLD", "ARCHIVE"
    name = Column(String(64), nullable=False)
    description = Column(String(255), nullable=True)
    storage_cost_per_gb = Column(Float, nullable=False, default=0.0)
    retrieval_cost_per_gb = Column(Float, nullable=False, default=0.0)
    minimum_retention_days = Column(Integer, nullable=False, default=0)

    def to_dict(self):
        """Convert tier model to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "storage_cost_per_gb": self.storage_cost_per_gb,
            "retrieval_cost_per_gb": self.retrieval_cost_per_gb,
            "minimum_retention_days": self.minimum_retention_days,
        }

    def __repr__(self):
        return f"<StorageTier id='{self.id}' name='{self.name}' rate=${self.storage_cost_per_gb}/GB/mo>"
