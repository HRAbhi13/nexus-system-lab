"""
test_core.py - Unit Tests for Core Configuration and Database Layer
Milestone: Milestone 1 - Project Reorganization & Core Foundation

Compatible with both Pytest and unittest test runners.
"""

import os
import sys
import unittest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import Settings, get_settings
from app.core.database import engine, SessionLocal, get_db, Base


class TestCoreConfiguration(unittest.TestCase):
    """
    Test suite for core settings, cloud storage tiers, and database initialization.
    """

    def test_settings_loading(self):
        """
        Test that application settings load correctly with expected default attributes.
        """
        settings = get_settings()
        self.assertIsInstance(settings, Settings)
        self.assertIn("Cloud Storage Optimization", settings.PROJECT_NAME)
        self.assertEqual(settings.VERSION, "0.1.0")
        self.assertEqual(settings.API_V1_PREFIX, "/api/v1")
        self.assertEqual(settings.ENVIRONMENT, "development")
        self.assertEqual(settings.LARGE_FILE_THRESHOLD_BYTES, 50 * 1024 * 1024)

    def test_storage_tier_pricing_configuration(self):
        """
        Test that all standard storage tiers (HOT, WARM, COLD, ARCHIVE) are defined
        and their storage pricing follows expected cloud hierarchy (Hot > Warm > Cold > Archive).
        """
        settings = get_settings()
        tiers = settings.TIER_PRICING

        required_tiers = {"HOT", "WARM", "COLD", "ARCHIVE"}
        self.assertTrue(required_tiers.issubset(set(tiers.keys())))

        for tier_key in required_tiers:
            tier_data = tiers[tier_key]
            self.assertIn("name", tier_data)
            self.assertIn("storage_cost_per_gb", tier_data)
            self.assertIn("retrieval_cost_per_gb", tier_data)
            self.assertIn("minimum_retention_days", tier_data)
            self.assertGreaterEqual(tier_data["storage_cost_per_gb"], 0)
            self.assertGreaterEqual(tier_data["retrieval_cost_per_gb"], 0)

        # Pricing hierarchy: Hot is most expensive for storage, Archive is cheapest
        hot_cost = tiers["HOT"]["storage_cost_per_gb"]
        warm_cost = tiers["WARM"]["storage_cost_per_gb"]
        cold_cost = tiers["COLD"]["storage_cost_per_gb"]
        archive_cost = tiers["ARCHIVE"]["storage_cost_per_gb"]

        self.assertGreater(hot_cost, warm_cost)
        self.assertGreater(warm_cost, cold_cost)
        self.assertGreater(cold_cost, archive_cost)

        # Retrieval fee hierarchy: Hot is cheapest (0.0), Archive has highest retrieval fee
        self.assertEqual(tiers["HOT"]["retrieval_cost_per_gb"], 0.0)
        self.assertGreater(tiers["ARCHIVE"]["retrieval_cost_per_gb"], tiers["HOT"]["retrieval_cost_per_gb"])

    def test_tier_thresholds_configuration(self):
        """
        Test that lifecycle access threshold days are configured and strictly monotonic.
        """
        settings = get_settings()
        thresholds = settings.TIER_THRESHOLDS

        self.assertIn("HOT_MAX_DAYS", thresholds)
        self.assertIn("WARM_MAX_DAYS", thresholds)
        self.assertIn("COLD_MAX_DAYS", thresholds)

        self.assertLess(thresholds["HOT_MAX_DAYS"], thresholds["WARM_MAX_DAYS"])
        self.assertLess(thresholds["WARM_MAX_DAYS"], thresholds["COLD_MAX_DAYS"])

    def test_database_engine_and_session(self):
        """
        Test that SQLite database engine initializes and executes a simple query.
        """
        test_engine = create_engine("sqlite:///:memory:")
        TestSession = sessionmaker(bind=test_engine)
        db: Session = TestSession()
        try:
            result = db.execute(text("SELECT 1")).scalar()
            self.assertEqual(result, 1)
        finally:
            db.close()

    def test_get_db_generator(self):
        """
        Test that get_db() generator dependency provides an active session and closes cleanly.
        """
        db_gen = get_db()
        session = next(db_gen)
        self.assertIsInstance(session, Session)
        self.assertTrue(session.is_active)

        # Exhaust generator to simulate request completion and close session
        with self.assertRaises(StopIteration):
            next(db_gen)

    def test_declarative_base_initialization(self):
        """
        Test that SQLAlchemy Base metadata is properly initialized.
        """
        self.assertIsNotNone(Base)
        self.assertTrue(hasattr(Base, "metadata"))


if __name__ == "__main__":
    unittest.main()
