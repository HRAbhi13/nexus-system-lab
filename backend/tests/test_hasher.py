"""
test_hasher.py - Unit Tests for Cryptographic Hasher Service
Milestone 2: File Management, Hashing & Storage Layer
"""

import io
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.hasher import compute_bytes_hash, compute_stream_hash, compute_file_hash


class TestHasher(unittest.TestCase):
    """
    Test suite for SHA-256 hashing functions.
    """

    def test_known_string_hash(self):
        """
        Verify that compute_bytes_hash matches standard NIST SHA-256 test vectors.
        'hello world' -> b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
        """
        data = b"hello world"
        expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        self.assertEqual(compute_bytes_hash(data), expected)

    def test_empty_bytes_hash(self):
        """
        Verify hash of empty bytes.
        '' -> e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        """
        empty = b""
        expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        self.assertEqual(compute_bytes_hash(empty), expected)

    def test_stream_hash(self):
        """
        Verify that compute_stream_hash generates identical digest from BytesIO stream
        and resets the stream position to 0.
        """
        data = b"NEXUS Intelligent Cloud Storage Optimization Engine"
        stream = io.BytesIO(data)
        stream_hash = compute_stream_hash(stream, chunk_size=8)
        bytes_hash = compute_bytes_hash(data)

        self.assertEqual(stream_hash, bytes_hash)
        # Verify seek reset
        self.assertEqual(stream.tell(), 0)

    def test_chunked_streaming_consistency(self):
        """
        Verify that chunked file reads produce the exact same hash as monolithic hashing.
        """
        # Create 256 KB of deterministic test bytes
        test_payload = b"A" * (256 * 1024)
        expected_hash = compute_bytes_hash(test_payload)

        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(test_payload)
            temp_path = temp_file.name

        try:
            # Hash with tiny 1 KB chunks to test multi-chunk loop
            file_hash = compute_file_hash(temp_path, chunk_size=1024)
            self.assertEqual(file_hash, expected_hash)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def test_file_not_found(self):
        """
        Verify compute_file_hash raises FileNotFoundError for non-existent paths.
        """
        with self.assertRaises(FileNotFoundError):
            compute_file_hash("non_existent_file_12345.xyz")

    def test_invalid_type_raises_error(self):
        """
        Verify compute_bytes_hash raises TypeError if passed non-bytes.
        """
        with self.assertRaises(TypeError):
            compute_bytes_hash("string_not_bytes")


if __name__ == "__main__":
    unittest.main()
