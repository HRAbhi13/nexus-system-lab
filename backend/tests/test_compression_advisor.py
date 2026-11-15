"""
test_compression_advisor.py - Unit Tests for Compression Advisor Engine
Milestone 3: Intelligent Storage Optimization Engine
"""

import os
import sys
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.file_metadata import FileMetadata
from app.optimizer.compression_advisor import CompressionAdvisor


class TestCompressionAdvisor(unittest.TestCase):
    """
    Test suite for CompressionAdvisor compressibility evaluation and savings estimation.
    """

    def test_compressible_text_file(self):
        """
        Verify that text/code files report high estimated savings and are recommended.
        """
        file = FileMetadata(
            id=1, filename="server.log", stored_filename="s1", file_path="/p1",
            file_size_bytes=100 * 1024,  # 100 KB
            file_size_mb=0.1,
            sha256_hash="aaa", category="Code", storage_tier="HOT", is_duplicate=False
        )

        advice = CompressionAdvisor.evaluate_file(file)
        self.assertEqual(advice["file_id"], 1)
        self.assertEqual(advice["compression_algorithm"], "zstd")
        self.assertTrue(advice["is_compression_recommended"])
        self.assertGreater(advice["estimated_savings_percentage"], 50.0)
        self.assertGreater(advice["estimated_savings_bytes"], 50 * 1024)

    def test_pre_compressed_media_file(self):
        """
        Verify that already compressed files (e.g. mp4, zip) report low savings and are NOT recommended.
        """
        file = FileMetadata(
            id=2, filename="vacation.mp4", stored_filename="s2", file_path="/p2",
            file_size_bytes=50 * 1024 * 1024,  # 50 MB
            file_size_mb=50.0,
            sha256_hash="bbb", category="Video", storage_tier="HOT", is_duplicate=False
        )

        advice = CompressionAdvisor.evaluate_file(file)
        self.assertFalse(advice["is_compression_recommended"])
        self.assertLess(advice["estimated_savings_percentage"], 5.0)

    def test_small_file_suppression(self):
        """
        Verify that files smaller than 1 KB are not recommended for compression due to overhead.
        """
        file = FileMetadata(
            id=3, filename="tiny.txt", stored_filename="s3", file_path="/p3",
            file_size_bytes=500,  # 500 bytes (< 1024 bytes)
            file_size_mb=0.0005,
            sha256_hash="ccc", category="Document", storage_tier="HOT", is_duplicate=False
        )

        advice = CompressionAdvisor.evaluate_file(file)
        self.assertFalse(advice["is_compression_recommended"])

    def test_analyze_multiple_files(self):
        """
        Verify aggregate compression analysis across a mixed batch of files.
        """
        f1 = FileMetadata(
            id=1, filename="data.csv", stored_filename="s1", file_path="/p1",
            file_size_bytes=10000, file_size_mb=0.01,
            sha256_hash="111", category="Spreadsheet", storage_tier="HOT", is_duplicate=False
        )
        f2 = FileMetadata(
            id=2, filename="archive.zip", stored_filename="s2", file_path="/p2",
            file_size_bytes=10000, file_size_mb=0.01,
            sha256_hash="222", category="Archive", storage_tier="HOT", is_duplicate=False
        )

        report = CompressionAdvisor.analyze_files([f1, f2])
        self.assertEqual(report["total_files_analyzed"], 2)
        self.assertEqual(report["compressible_files_count"], 1)  # Only data.csv
        self.assertEqual(report["total_original_bytes"], 20000)
        self.assertGreater(report["total_estimated_savings_bytes"], 0)
        self.assertGreater(report["overall_estimated_savings_percentage"], 0)
        self.assertEqual(len(report["recommendations"]), 2)


if __name__ == "__main__":
    unittest.main()
