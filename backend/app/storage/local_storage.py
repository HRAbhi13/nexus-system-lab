"""
local_storage.py - Simulated Local Cloud Storage Bucket Manager
NEXUS - Intelligent Cloud Storage Optimization System

Provides file persistence, retrieval, path sanitization, and capacity tracking
for the local simulated cloud storage bucket.
"""

import os
import re
import uuid
import shutil
from pathlib import Path
from typing import Tuple, BinaryIO, Optional, Dict, Any
from app.core.config import settings


class LocalStorageManager:
    """
    Manages physical file storage on disk to simulate a cloud object storage bucket.
    """

    def __init__(self, base_dir: Optional[Path] = None):
        """
        Initialize the local storage manager.

        Args:
            base_dir (Path, optional): Root directory for file storage.
                                       Defaults to settings.STORAGE_DIR.
        """
        self.base_dir = Path(base_dir or settings.STORAGE_DIR).resolve()
        self.ensure_storage_dir()

    def ensure_storage_dir(self) -> None:
        """Create the storage bucket directory if it does not already exist."""
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize user filename to prevent path traversal and invalid filesystem characters.

        Args:
            filename (str): Raw input filename.

        Returns:
            str: Cleaned, safe filename basename.
        """
        # Strip path traversal components
        basename = os.path.basename(filename)
        # Remove any character not alphanumeric, dot, underscore, or hyphen
        clean = re.sub(r"[^\w\.-]", "_", basename)
        return clean or "unnamed_file"

    def _generate_stored_filename(self, original_filename: str) -> str:
        """
        Generate a unique filename on disk combining a UUID prefix and sanitized original name.

        Args:
            original_filename (str): User-provided original name.

        Returns:
            str: Unique stored filename (e.g. 'a1b2c3d4e5f6_document.pdf').
        """
        safe_name = self._sanitize_filename(original_filename)
        unique_prefix = uuid.uuid4().hex[:12]
        return f"{unique_prefix}_{safe_name}"

    def save_file(self, file_content: bytes, original_filename: str) -> Tuple[str, Path]:
        """
        Save binary content to the simulated cloud bucket.

        Args:
            file_content (bytes): Raw binary data to save.
            original_filename (str): Name of the file.

        Returns:
            Tuple[str, Path]: (stored_filename, absolute_path_on_disk)
        """
        self.ensure_storage_dir()
        stored_filename = self._generate_stored_filename(original_filename)
        destination_path = self.base_dir / stored_filename

        with open(destination_path, "wb") as f:
            f.write(file_content)

        return stored_filename, destination_path

    def save_stream(self, stream: BinaryIO, original_filename: str, chunk_size: int = 65536) -> Tuple[str, Path]:
        """
        Save a readable binary stream to disk in chunks to minimize RAM usage.

        Args:
            stream (BinaryIO): Open binary stream.
            original_filename (str): Original filename.
            chunk_size (int): Size of read chunks (default 64 KB).

        Returns:
            Tuple[str, Path]: (stored_filename, absolute_path_on_disk)
        """
        self.ensure_storage_dir()
        stored_filename = self._generate_stored_filename(original_filename)
        destination_path = self.base_dir / stored_filename

        with open(destination_path, "wb") as dest:
            while True:
                chunk = stream.read(chunk_size)
                if not chunk:
                    break
                dest.write(chunk)

        # Reset stream pointer if possible
        if hasattr(stream, "seek") and callable(stream.seek):
            try:
                stream.seek(0)
            except (OSError, ValueError):
                pass

        return stored_filename, destination_path

    def get_file_path(self, stored_filename: str) -> Path:
        """
        Get the absolute path for a stored filename.

        Args:
            stored_filename (str): Name of the file in the bucket.

        Returns:
            Path: Absolute filesystem path.
        """
        return self.base_dir / stored_filename

    def read_file_bytes(self, stored_filename: str) -> bytes:
        """
        Read the raw bytes of a stored file.

        Args:
            stored_filename (str): Target stored filename.

        Returns:
            bytes: Content of the file.

        Raises:
            FileNotFoundError: If the file is not found in the bucket.
        """
        path = self.get_file_path(stored_filename)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"Stored file '{stored_filename}' not found in storage bucket.")

        with open(path, "rb") as f:
            return f.read()

    def delete_file(self, stored_filename: str) -> bool:
        """
        Delete a file from the storage bucket.

        Args:
            stored_filename (str): Target stored filename.

        Returns:
            bool: True if deleted, False if file did not exist.
        """
        path = self.get_file_path(stored_filename)
        if path.exists() and path.is_file():
            path.unlink()
            return True
        return False

    def file_exists(self, stored_filename: str) -> bool:
        """Check whether a stored filename exists in the bucket."""
        path = self.get_file_path(stored_filename)
        return path.exists() and path.is_file()

    def get_storage_usage(self) -> Dict[str, Any]:
        """
        Calculate total file count and storage capacity used by the bucket.

        Returns:
            Dict[str, Any]: Total file count and total size in bytes/MB.
        """
        self.ensure_storage_dir()
        total_files = 0
        total_bytes = 0

        for item in self.base_dir.iterdir():
            if item.is_file():
                total_files += 1
                total_bytes += item.stat().st_size

        return {
            "total_files": total_files,
            "total_bytes": total_bytes,
            "total_mb": round(total_bytes / (1024 * 1024), 4),
        }

    def clear_storage(self) -> None:
        """Remove all files inside the storage bucket (for testing teardown)."""
        if self.base_dir.exists():
            for item in self.base_dir.iterdir():
                if item.is_file():
                    item.unlink()


# Global default storage manager instance
storage_manager = LocalStorageManager()
