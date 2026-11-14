"""
test_file_service.py - Unit Tests for File Management Service & Storage Tiering
Milestone 2: File Management, Hashing & Storage Layer
"""

import os
import sys
import shutil
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base
from app.models.file_metadata import FileMetadata
from app.models.storage_tier import StorageTier
from app.storage.local_storage import LocalStorageManager
from app.storage.tier_manager import TierManager
from app.services.file_service import FileService


class TestFileService(unittest.TestCase):
    """
    Test suite for FileService orchestration, tier management, and duplicate tracking.
    """

    def setUp(self):
        """Set up in-memory SQLite database and isolated storage directory."""
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db: Session = self.Session()

        # Isolated bucket for physical file writes
        self.temp_dir = tempfile.mkdtemp(prefix="nexus_service_test_bucket_")
        self.storage = LocalStorageManager(base_dir=Path(self.temp_dir))

        # Seed cloud tiers
        TierManager.seed_default_tiers(self.db)

    def tearDown(self):
        """Tear down database session and delete test directory."""
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_seed_and_query_storage_tiers(self):
        """
        Verify that default cloud storage tiers are properly seeded and queryable.
        """
        tiers = TierManager.get_all_tiers(self.db)
        tier_ids = {t.id for t in tiers}
        self.assertIn("HOT", tier_ids)
        self.assertIn("WARM", tier_ids)
        self.assertIn("COLD", tier_ids)
        self.assertIn("ARCHIVE", tier_ids)

        hot_tier = TierManager.get_tier_by_id(self.db, "HOT")
        self.assertIsNotNone(hot_tier)
        self.assertEqual(hot_tier.name, "Hot (Standard)")
        self.assertTrue(TierManager.is_valid_tier(self.db, "COLD"))
        self.assertFalse(TierManager.is_valid_tier(self.db, "INVALID_TIER"))

    def test_ingest_new_file(self):
        """
        Verify that ingesting a new file persists metadata and writes physical content.
        """
        content = b"Sample content for NEXUS cloud storage system."
        file_record = FileService.ingest_file(
            db=self.db,
            filename="quarterly_report.pdf",
            content=content,
            storage_tier="HOT",
            custom_storage=self.storage,
        )

        self.assertIsNotNone(file_record.id)
        self.assertEqual(file_record.filename, "quarterly_report.pdf")
        self.assertEqual(file_record.file_size_bytes, len(content))
        self.assertEqual(file_record.category, "Document")
        self.assertEqual(file_record.mime_type, "application/pdf")
        self.assertEqual(file_record.storage_tier, "HOT")
        self.assertFalse(file_record.is_duplicate)
        self.assertIsNone(file_record.original_file_id)

        # Verify physical file existence
        self.assertTrue(self.storage.file_exists(file_record.stored_filename))
        self.assertEqual(self.storage.read_file_bytes(file_record.stored_filename), content)

    def test_ingest_duplicate_file_detection(self):
        """
        Verify that ingesting identical content marks subsequent uploads as duplicates
        and links them to the master file.
        """
        shared_content = b"Shared invariant content duplicated across users."

        # 1. Master file upload
        master = FileService.ingest_file(
            db=self.db,
            filename="master_copy.png",
            content=shared_content,
            custom_storage=self.storage,
        )
        self.assertFalse(master.is_duplicate)
        self.assertIsNone(master.original_file_id)

        # 2. Duplicate file upload with different filename
        duplicate = FileService.ingest_file(
            db=self.db,
            filename="backup_copy.png",
            content=shared_content,
            custom_storage=self.storage,
        )
        self.assertTrue(duplicate.is_duplicate)
        self.assertEqual(duplicate.original_file_id, master.id)
        self.assertEqual(duplicate.sha256_hash, master.sha256_hash)

        # Querying by hash returns both instances
        matches = FileService.get_file_by_hash(self.db, master.sha256_hash)
        self.assertEqual(len(matches), 2)
        self.assertEqual(matches[0].id, master.id)
        self.assertEqual(matches[1].id, duplicate.id)

    def test_query_and_filter_files(self):
        """
        Verify listing files with category, tier, duplicate, and search filters.
        """
        FileService.ingest_file(
            self.db, "doc1.pdf", b"Content 1", storage_tier="HOT", custom_storage=self.storage
        )
        FileService.ingest_file(
            self.db, "data.csv", b"col1,col2\n1,2", storage_tier="WARM", custom_storage=self.storage
        )
        FileService.ingest_file(
            self.db, "video.mp4", b"video stream", storage_tier="COLD", custom_storage=self.storage
        )
        # Duplicate of doc1
        FileService.ingest_file(
            self.db, "doc1_copy.pdf", b"Content 1", storage_tier="HOT", custom_storage=self.storage
        )

        # 1. Filter by category
        docs, doc_count = FileService.list_files(self.db, category="Document")
        self.assertEqual(doc_count, 2)

        spreadsheets, sheet_count = FileService.list_files(self.db, category="Spreadsheet")
        self.assertEqual(sheet_count, 1)

        # 2. Filter by tier
        cold_files, cold_count = FileService.list_files(self.db, tier="COLD")
        self.assertEqual(cold_count, 1)

        # 3. Filter by duplicate status
        dups, dup_count = FileService.list_files(self.db, is_duplicate=True)
        self.assertEqual(dup_count, 1)
        self.assertEqual(dups[0].filename, "doc1_copy.pdf")

        # 4. Search query
        results, search_count = FileService.list_files(self.db, search="video")
        self.assertEqual(search_count, 1)
        self.assertEqual(results[0].filename, "video.mp4")

    def test_update_storage_tier(self):
        """
        Verify transitioning a file between cloud storage tiers.
        """
        file_record = FileService.ingest_file(
            self.db, "archive_me.txt", b"Old logs", storage_tier="HOT", custom_storage=self.storage
        )
        self.assertEqual(file_record.storage_tier, "HOT")

        # Reallocate to ARCHIVE
        updated = FileService.update_tier(self.db, file_record.id, "ARCHIVE")
        self.assertIsNotNone(updated)
        self.assertEqual(updated.storage_tier, "ARCHIVE")

        # Invalid tier raises ValueError
        with self.assertRaises(ValueError):
            FileService.update_tier(self.db, file_record.id, "NON_EXISTENT_TIER")

    def test_record_access_timestamp(self):
        """
        Verify updating the last_accessed_timestamp.
        """
        file_record = FileService.ingest_file(
            self.db, "accessed.txt", b"test", custom_storage=self.storage
        )
        earlier_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=60)
        updated = FileService.record_access(self.db, file_record.id, accessed_at=earlier_time)

        self.assertEqual(updated.last_accessed_timestamp, earlier_time)

    def test_delete_file(self):
        """
        Verify deleting a file removes database metadata and deletes physical file from storage.
        """
        file_record = FileService.ingest_file(
            self.db, "delete_target.txt", b"Goodbye file", custom_storage=self.storage
        )
        stored_name = file_record.stored_filename
        file_id = file_record.id

        self.assertTrue(self.storage.file_exists(stored_name))

        # Delete through service
        success = FileService.delete_file(self.db, file_id, custom_storage=self.storage)
        self.assertTrue(success)

        # Database record must no longer exist
        self.assertIsNone(FileService.get_file(self.db, file_id))

        # Physical file on disk must be removed
        self.assertFalse(self.storage.file_exists(stored_name))


if __name__ == "__main__":
    unittest.main()
