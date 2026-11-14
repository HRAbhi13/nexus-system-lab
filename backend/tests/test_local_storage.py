"""
test_local_storage.py - Unit Tests for Local Cloud Storage Bucket Manager
Milestone 2: File Management, Hashing & Storage Layer
"""

import io
import os
import sys
import shutil
import tempfile
import unittest
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.storage.local_storage import LocalStorageManager


class TestLocalStorageManager(unittest.TestCase):
    """
    Test suite for LocalStorageManager file persistence and bucket simulation.
    """

    def setUp(self):
        """Create an isolated temporary directory for bucket simulation."""
        self.temp_dir = tempfile.mkdtemp(prefix="nexus_test_bucket_")
        self.storage = LocalStorageManager(base_dir=Path(self.temp_dir))

    def tearDown(self):
        """Clean up the temporary directory."""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_save_and_read_bytes(self):
        """
        Verify saving raw bytes and reading them back successfully.
        """
        content = b"Simulated cloud bucket content for NEXUS."
        stored_name, path = self.storage.save_file(content, "test_doc.txt")

        self.assertTrue(path.exists())
        self.assertTrue(self.storage.file_exists(stored_name))

        read_bytes = self.storage.read_file_bytes(stored_name)
        self.assertEqual(read_bytes, content)

    def test_save_stream(self):
        """
        Verify saving a binary stream via chunked writes.
        """
        content = b"Binary stream testing payload 12345"
        stream = io.BytesIO(content)

        stored_name, path = self.storage.save_stream(stream, "streamed_data.bin")
        self.assertTrue(path.exists())

        read_bytes = self.storage.read_file_bytes(stored_name)
        self.assertEqual(read_bytes, content)

    def test_filename_sanitization(self):
        """
        Verify that path traversal characters (../) and unsafe symbols are sanitized.
        """
        unsafe_name = "../../etc/passwd#sensitive!.txt"
        stored_name, path = self.storage.save_file(b"safe", unsafe_name)

        # Must not contain directory separators
        self.assertNotIn("..", stored_name)
        self.assertNotIn("/", stored_name)
        self.assertNotIn("\\", stored_name)
        # Must resolve inside the temporary bucket directory
        self.assertTrue(path.resolve().is_relative_to(Path(self.temp_dir).resolve()))

    def test_delete_file(self):
        """
        Verify file deletion removes file from disk and returns True.
        """
        stored_name, path = self.storage.save_file(b"temporary", "delete_me.txt")
        self.assertTrue(self.storage.file_exists(stored_name))

        deleted = self.storage.delete_file(stored_name)
        self.assertTrue(deleted)
        self.assertFalse(self.storage.file_exists(stored_name))
        self.assertFalse(path.exists())

        # Deleting non-existent file returns False
        self.assertFalse(self.storage.delete_file(stored_name))

    def test_read_non_existent_file_raises_error(self):
        """
        Verify reading a non-existent file raises FileNotFoundError.
        """
        with self.assertRaises(FileNotFoundError):
            self.storage.read_file_bytes("missing_file.xyz")

    def test_storage_usage_calculation(self):
        """
        Verify calculation of total file count and used capacity in bytes/MB.
        """
        self.storage.save_file(b"A" * 1024, "file1.dat")
        self.storage.save_file(b"B" * 2048, "file2.dat")

        usage = self.storage.get_storage_usage()
        self.assertEqual(usage["total_files"], 2)
        self.assertEqual(usage["total_bytes"], 3072)
        self.assertEqual(usage["total_mb"], round(3072 / (1024 * 1024), 4))


if __name__ == "__main__":
    unittest.main()
