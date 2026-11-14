"""
test_duplicate_detector.py - Unit Tests for Duplicate Detector Engine
Milestone 3: Intelligent Storage Optimization Engine
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
from app.optimizer.duplicate_detector import DuplicateDetector


class TestDuplicateDetector(unittest.TestCase):
    """
    Test suite for DuplicateDetector hash grouping and wasted capacity calculation.
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

    def test_audit_no_duplicates(self):
        """
        Verify that a storage pool with unique files reports 0 duplicates and 0 wasted bytes.
        """
        f1 = FileMetadata(
            filename="file1.txt", stored_filename="s1", file_path="/p1",
            file_size_bytes=1000, file_size_mb=0.001,
            sha256_hash="1111111111111111111111111111111111111111111111111111111111111111",
            category="Document", storage_tier="HOT", is_duplicate=False
        )
        f2 = FileMetadata(
            filename="file2.jpg", stored_filename="s2", file_path="/p2",
            file_size_bytes=2000, file_size_mb=0.002,
            sha256_hash="2222222222222222222222222222222222222222222222222222222222222222",
            category="Image", storage_tier="HOT", is_duplicate=False
        )
        self.db.add_all([f1, f2])
        self.db.commit()

        report = DuplicateDetector.audit_duplicates(self.db)
        self.assertEqual(report["total_files_analyzed"], 2)
        self.assertEqual(report["duplicate_files_count"], 0)
        self.assertEqual(report["duplicate_clusters_count"], 0)
        self.assertEqual(report["total_wasted_bytes"], 0)
        self.assertEqual(report["estimated_duplicate_percentage"], 0.0)

    def test_audit_with_duplicates(self):
        """
        Verify that identical files are correctly clustered and wasted bytes match sum of redundant copies.
        """
        shared_hash = "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        f1 = FileMetadata(
            filename="report_master.pdf", stored_filename="s1", file_path="/p1",
            file_size_bytes=5000, file_size_mb=0.005,
            sha256_hash=shared_hash, category="Document", storage_tier="HOT", is_duplicate=False
        )
        f2 = FileMetadata(
            filename="report_copy1.pdf", stored_filename="s2", file_path="/p2",
            file_size_bytes=5000, file_size_mb=0.005,
            sha256_hash=shared_hash, category="Document", storage_tier="HOT", is_duplicate=True, original_file_id=1
        )
        f3 = FileMetadata(
            filename="report_copy2.pdf", stored_filename="s3", file_path="/p3",
            file_size_bytes=5000, file_size_mb=0.005,
            sha256_hash=shared_hash, category="Document", storage_tier="HOT", is_duplicate=True, original_file_id=1
        )
        self.db.add_all([f1, f2, f3])
        self.db.commit()

        report = DuplicateDetector.audit_duplicates(self.db)
        self.assertEqual(report["total_files_analyzed"], 3)
        self.assertEqual(report["duplicate_files_count"], 2)
        self.assertEqual(report["duplicate_clusters_count"], 1)
        self.assertEqual(report["total_wasted_bytes"], 10000)  # 2 redundant copies * 5000 bytes
        self.assertEqual(len(report["clusters"]), 1)

        cluster = report["clusters"][0]
        self.assertEqual(cluster["file_count"], 3)
        self.assertEqual(cluster["wasted_bytes"], 10000)
        self.assertEqual(cluster["master_file"]["filename"], "report_master.pdf")
        self.assertEqual(len(cluster["duplicate_files"]), 2)

    def test_resync_duplicate_flags(self):
        """
        Verify resync_duplicate_flags correctly repairs is_duplicate and original_file_id attributes.
        """
        shared_hash = "9999999999999999999999999999999999999999999999999999999999999999"
        # Inadvertently marked master as duplicate and duplicate as master
        f1 = FileMetadata(
            filename="doc1.txt", stored_filename="s1", file_path="/p1",
            file_size_bytes=100, file_size_mb=0.0001,
            sha256_hash=shared_hash, category="Document", storage_tier="HOT", is_duplicate=True
        )
        f2 = FileMetadata(
            filename="doc2.txt", stored_filename="s2", file_path="/p2",
            file_size_bytes=100, file_size_mb=0.0001,
            sha256_hash=shared_hash, category="Document", storage_tier="HOT", is_duplicate=False
        )
        self.db.add_all([f1, f2])
        self.db.commit()

        updated_count = DuplicateDetector.resync_duplicate_flags(self.db)
        self.assertGreater(updated_count, 0)

        self.db.refresh(f1)
        self.db.refresh(f2)

        self.assertFalse(f1.is_duplicate)
        self.assertIsNone(f1.original_file_id)
        self.assertTrue(f2.is_duplicate)
        self.assertEqual(f2.original_file_id, f1.id)


if __name__ == "__main__":
    unittest.main()
