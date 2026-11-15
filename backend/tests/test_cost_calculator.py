"""
test_cost_calculator.py - Unit Tests for Cloud Cost & ROI Calculator Engine
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
from app.optimizer.cost_calculator import CostCalculator


class TestCostCalculator(unittest.TestCase):
    """
    Test suite for CostCalculator storage spend prediction and consolidated ROI metrics.
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

    def test_current_storage_spend_calculation(self):
        """
        Verify calculation of current monthly storage spend across multiple tiers.
        """
        one_gb = 1024 ** 3
        # 2 GB in HOT ($0.023 * 2 = $0.046)
        f1 = FileMetadata(
            filename="hot1.dat", stored_filename="s1", file_path="/p1",
            file_size_bytes=one_gb * 2, file_size_mb=2048.0,
            sha256_hash="h1", category="Other", storage_tier="HOT", is_duplicate=False
        )
        # 4 GB in WARM ($0.0125 * 4 = $0.050)
        f2 = FileMetadata(
            filename="warm1.dat", stored_filename="s2", file_path="/p2",
            file_size_bytes=one_gb * 4, file_size_mb=4096.0,
            sha256_hash="h2", category="Other", storage_tier="WARM", is_duplicate=False
        )
        self.db.add_all([f1, f2])
        self.db.commit()

        spend = CostCalculator.calculate_current_storage_spend(self.db)
        self.assertEqual(spend["total_files"], 2)
        self.assertEqual(spend["total_gb"], 6.0)
        # 0.046 + 0.050 = 0.096
        self.assertAlmostEqual(spend["total_monthly_spend_usd"], 0.096, places=3)
        self.assertIn("HOT", spend["tier_breakdown_usd"])
        self.assertIn("WARM", spend["tier_breakdown_usd"])

    def test_comprehensive_roi_report(self):
        """
        Verify comprehensive ROI report generates deduplication, compression,
        and tier reallocation projections along with an explicit disclaimer.
        """
        one_gb = 1024 ** 3
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        stale_date = now - timedelta(days=120)

        # 1. Master file in HOT (2 GB, text file)
        f1 = FileMetadata(
            filename="logs_master.txt", stored_filename="s1", file_path="/p1",
            file_size_bytes=one_gb * 2, file_size_mb=2048.0,
            sha256_hash="shared_hash_1", category="Code", storage_tier="HOT",
            is_duplicate=False, upload_timestamp=stale_date, last_accessed_timestamp=stale_date
        )
        # 2. Duplicate copy of f1 in HOT (2 GB)
        f2 = FileMetadata(
            filename="logs_copy.txt", stored_filename="s2", file_path="/p2",
            file_size_bytes=one_gb * 2, file_size_mb=2048.0,
            sha256_hash="shared_hash_1", category="Code", storage_tier="HOT",
            is_duplicate=True, original_file_id=1, upload_timestamp=stale_date, last_accessed_timestamp=stale_date
        )
        self.db.add_all([f1, f2])
        self.db.commit()

        roi = CostCalculator.generate_comprehensive_roi_report(self.db)

        self.assertEqual(roi["total_files_stored"], 2)
        self.assertEqual(roi["duplicate_files_count"], 1)
        self.assertEqual(roi["deduplication_recoverable_bytes"], one_gb * 2)
        self.assertGreater(roi["deduplication_estimated_savings_spend"], 0.0)
        self.assertGreater(roi["compression_recoverable_bytes"], 0)
        self.assertGreater(roi["total_projected_monthly_savings"], 0.0)
        self.assertGreater(roi["total_projected_annual_savings"], 0.0)
        self.assertIn("estimates", roi["disclaimer"].lower())


if __name__ == "__main__":
    unittest.main()
