"""
test_tier_recommender.py - Unit Tests for Cloud Lifecycle Tier Recommender
Milestone 3: Intelligent Storage Optimization Engine
"""

import os
import sys
import unittest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base
from app.models.file_metadata import FileMetadata
from app.storage.tier_manager import TierManager
from app.optimizer.tier_recommender import TierRecommender


class TestTierRecommender(unittest.TestCase):
    """
    Test suite for TierRecommender lifecycle rules and projected dollar savings.
    """

    def setUp(self):
        """Set up in-memory SQLite database, session, and default cloud tiers."""
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db: Session = self.Session()
        TierManager.seed_default_tiers(self.db)

    def tearDown(self):
        """Clean up database."""
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_inactivity_threshold_mapping(self):
        """
        Verify inactivity days map strictly to correct target tiers.
        """
        self.assertEqual(TierRecommender.get_recommended_tier_for_inactivity(10), "HOT")
        self.assertEqual(TierRecommender.get_recommended_tier_for_inactivity(30), "HOT")
        self.assertEqual(TierRecommender.get_recommended_tier_for_inactivity(45), "WARM")
        self.assertEqual(TierRecommender.get_recommended_tier_for_inactivity(90), "WARM")
        self.assertEqual(TierRecommender.get_recommended_tier_for_inactivity(120), "COLD")
        self.assertEqual(TierRecommender.get_recommended_tier_for_inactivity(180), "COLD")
        self.assertEqual(TierRecommender.get_recommended_tier_for_inactivity(200), "ARCHIVE")

    def test_tier_migration_recommendation(self):
        """
        Verify that a stale file in HOT tier generates a transition recommendation to COLD/ARCHIVE with dollar savings.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        stale_access = now - timedelta(days=120)  # 120 days ago -> COLD

        # 10 GB file in HOT tier
        ten_gb_bytes = 10 * 1024 * 1024 * 1024
        file = FileMetadata(
            filename="stale_dataset.tar", stored_filename="s1", file_path="/p1",
            file_size_bytes=ten_gb_bytes, file_size_mb=10240.0,
            sha256_hash="abc", category="Archive", storage_tier="HOT",
            is_duplicate=False,
            upload_timestamp=stale_access,
            last_accessed_timestamp=stale_access,
        )
        self.db.add(file)
        self.db.commit()

        report = TierRecommender.audit_tier_lifecycle(self.db, reference_time=now)
        self.assertEqual(report["total_files_analyzed"], 1)
        self.assertEqual(report["candidates_count"], 1)
        self.assertGreater(report["total_projected_monthly_savings"], 0.0)

        rec = report["recommendations"][0]
        self.assertEqual(rec["current_tier"], "HOT")
        self.assertEqual(rec["recommended_tier"], "COLD")
        self.assertEqual(rec["days_since_last_access"], 120)
        # HOT ($0.023) to COLD ($0.004) on 10 GB = 10 * (0.023 - 0.004) = $0.19 / month
        self.assertAlmostEqual(rec["projected_monthly_savings"], 0.19, places=2)
        self.assertGreater(rec["projected_savings_percentage"], 80.0)

    def test_active_file_no_recommendation(self):
        """
        Verify that an active file (accessed 5 days ago) already in HOT tier generates 0 transition recommendations.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        recent_access = now - timedelta(days=5)

        file = FileMetadata(
            filename="active_doc.pdf", stored_filename="s2", file_path="/p2",
            file_size_bytes=1000000, file_size_mb=1.0,
            sha256_hash="def", category="Document", storage_tier="HOT",
            is_duplicate=False,
            upload_timestamp=recent_access,
            last_accessed_timestamp=recent_access,
        )
        self.db.add(file)
        self.db.commit()

        report = TierRecommender.audit_tier_lifecycle(self.db, reference_time=now)
        self.assertEqual(report["total_files_analyzed"], 1)
        self.assertEqual(report["candidates_count"], 0)
        self.assertEqual(report["total_projected_monthly_savings"], 0.0)


if __name__ == "__main__":
    unittest.main()
