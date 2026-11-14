"""
test_analytics_engine.py - Unit Tests for Pandas-Powered Storage Analytics Engine
Milestone 4: Pandas-Powered Storage Analytics
"""

import os
import sys
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base
from app.models.file_metadata import FileMetadata
from app.analytics.engine import AnalyticsEngine


class TestAnalyticsEngine(unittest.TestCase):
    """
    Test suite for AnalyticsEngine Pandas aggregations, distributions, and binning.
    """

    def setUp(self):
        """Set up in-memory SQLite database and test session."""
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db: Session = self.Session()

    def tearDown(self):
        """Clean up database."""
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_empty_database_metrics(self):
        """
        Verify that querying analytics on an empty database returns safe zeroed metrics.
        """
        overview = AnalyticsEngine.get_storage_overview(self.db)
        self.assertEqual(overview["total_files"], 0)
        self.assertEqual(overview["total_bytes"], 0)
        self.assertEqual(overview["duplicate_files_count"], 0)

        cat_dist = AnalyticsEngine.get_category_distribution(self.db)
        self.assertEqual(cat_dist, [])

        tier_dist = AnalyticsEngine.get_tier_distribution(self.db)
        self.assertEqual(tier_dist, [])

        brackets = AnalyticsEngine.get_size_distribution_brackets(self.db)
        self.assertEqual(len(brackets), 5)
        self.assertEqual(sum(b["file_count"] for b in brackets), 0)

    def test_storage_overview_aggregations(self):
        """
        Verify that overview metrics correctly sum bytes and compute averages and duplicate shares.
        """
        # 1. 2 MB PDF
        f1 = FileMetadata(
            filename="doc.pdf", stored_filename="s1", file_path="/p1",
            file_size_bytes=2 * 1024 * 1024, file_size_mb=2.0,
            sha256_hash="h1", category="Document", storage_tier="HOT", is_duplicate=False
        )
        # 2. 4 MB Image
        f2 = FileMetadata(
            filename="pic.png", stored_filename="s2", file_path="/p2",
            file_size_bytes=4 * 1024 * 1024, file_size_mb=4.0,
            sha256_hash="h2", category="Image", storage_tier="WARM", is_duplicate=False
        )
        # 3. 2 MB Duplicate of f1
        f3 = FileMetadata(
            filename="doc_dup.pdf", stored_filename="s3", file_path="/p3",
            file_size_bytes=2 * 1024 * 1024, file_size_mb=2.0,
            sha256_hash="h1", category="Document", storage_tier="HOT", is_duplicate=True
        )
        self.db.add_all([f1, f2, f3])
        self.db.commit()

        overview = AnalyticsEngine.get_storage_overview(self.db)
        self.assertEqual(overview["total_files"], 3)
        self.assertEqual(overview["total_bytes"], 8 * 1024 * 1024)
        self.assertEqual(overview["total_mb"], 8.0)
        self.assertAlmostEqual(overview["average_file_size_mb"], 8.0 / 3, places=2)
        self.assertEqual(overview["largest_file_size_mb"], 4.0)

        # Duplicate metrics
        self.assertEqual(overview["duplicate_files_count"], 1)
        self.assertEqual(overview["duplicate_wasted_bytes"], 2 * 1024 * 1024)
        self.assertEqual(overview["duplicate_wasted_mb"], 2.0)
        self.assertEqual(overview["duplicate_volume_percentage"], 25.0)  # 2MB / 8MB = 25%

    def test_category_distribution_breakdown(self):
        """
        Verify Pandas group-by aggregation across categories.
        """
        # 6 MB of Documents (two 3 MB files)
        f1 = FileMetadata(
            filename="a.pdf", stored_filename="s1", file_path="/p1",
            file_size_bytes=3 * 1024 * 1024, file_size_mb=3.0,
            sha256_hash="1", category="Document", storage_tier="HOT", is_duplicate=False
        )
        f2 = FileMetadata(
            filename="b.docx", stored_filename="s2", file_path="/p2",
            file_size_bytes=3 * 1024 * 1024, file_size_mb=3.0,
            sha256_hash="2", category="Document", storage_tier="HOT", is_duplicate=False
        )
        # 4 MB of Images (one 4 MB file)
        f3 = FileMetadata(
            filename="c.jpg", stored_filename="s3", file_path="/p3",
            file_size_bytes=4 * 1024 * 1024, file_size_mb=4.0,
            sha256_hash="3", category="Image", storage_tier="HOT", is_duplicate=False
        )
        self.db.add_all([f1, f2, f3])
        self.db.commit()

        dist = AnalyticsEngine.get_category_distribution(self.db)
        self.assertEqual(len(dist), 2)

        # First item is Document (6 MB > 4 MB)
        doc_entry = dist[0]
        self.assertEqual(doc_entry["category"], "Document")
        self.assertEqual(doc_entry["file_count"], 2)
        self.assertEqual(doc_entry["total_mb"], 6.0)
        self.assertEqual(doc_entry["percentage_of_total_bytes"], 60.0)

        # Second item is Image (4 MB)
        img_entry = dist[1]
        self.assertEqual(img_entry["category"], "Image")
        self.assertEqual(img_entry["file_count"], 1)
        self.assertEqual(img_entry["total_mb"], 4.0)
        self.assertEqual(img_entry["percentage_of_total_bytes"], 40.0)

    def test_size_brackets_binning(self):
        """
        Verify Pandas binning into size brackets (< 1MB, 1-10MB, etc.).
        """
        # 500 KB (< 1 MB)
        f1 = FileMetadata(
            filename="tiny.txt", stored_filename="s1", file_path="/p1",
            file_size_bytes=500 * 1024, file_size_mb=0.5,
            sha256_hash="1", category="Document", storage_tier="HOT", is_duplicate=False
        )
        # 5 MB (1 - 10 MB)
        f2 = FileMetadata(
            filename="medium.pdf", stored_filename="s2", file_path="/p2",
            file_size_bytes=5 * 1024 * 1024, file_size_mb=5.0,
            sha256_hash="2", category="Document", storage_tier="HOT", is_duplicate=False
        )
        # 60 MB (50 - 100 MB)
        f3 = FileMetadata(
            filename="large.iso", stored_filename="s3", file_path="/p3",
            file_size_bytes=60 * 1024 * 1024, file_size_mb=60.0,
            sha256_hash="3", category="Archive", storage_tier="HOT", is_duplicate=False
        )
        self.db.add_all([f1, f2, f3])
        self.db.commit()

        brackets = AnalyticsEngine.get_size_distribution_brackets(self.db)
        bracket_map = {b["bracket_label"]: b for b in brackets}

        self.assertEqual(bracket_map["< 1 MB"]["file_count"], 1)
        self.assertEqual(bracket_map["1 MB - 10 MB"]["file_count"], 1)
        self.assertEqual(bracket_map["10 MB - 50 MB"]["file_count"], 0)
        self.assertEqual(bracket_map["50 MB - 100 MB"]["file_count"], 1)
        self.assertEqual(bracket_map["> 100 MB"]["file_count"], 0)

    def test_complete_storage_dashboard(self):
        """
        Verify get_storage_dashboard produces consolidated data for frontend visualization.
        """
        f = FileMetadata(
            filename="item.txt", stored_filename="s1", file_path="/p1",
            file_size_bytes=1000, file_size_mb=0.001,
            sha256_hash="1", category="Document", storage_tier="HOT", is_duplicate=False
        )
        self.db.add(f)
        self.db.commit()

        dashboard = AnalyticsEngine.get_storage_dashboard(self.db)
        self.assertIn("overview", dashboard)
        self.assertIn("category_distribution", dashboard)
        self.assertIn("tier_distribution", dashboard)
        self.assertIn("size_brackets", dashboard)
        self.assertEqual(dashboard["overview"]["total_files"], 1)


if __name__ == "__main__":
    unittest.main()
