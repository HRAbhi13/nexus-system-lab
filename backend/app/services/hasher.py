"""
hasher.py - Cryptographic SHA-256 File Hashing Service
NEXUS - Intelligent Cloud Storage Optimization System

Provides streaming chunked SHA-256 hash generation for memory-safe processing
of both small and multi-gigabyte files.
"""

import hashlib
from pathlib import Path
from typing import BinaryIO, Union


# Default chunk size: 64 KB (65,536 bytes)
DEFAULT_CHUNK_SIZE = 64 * 1024


def compute_bytes_hash(data: bytes) -> str:
    """
    Compute SHA-256 hex digest for an in-memory bytes object.

    Args:
        data (bytes): Raw binary content.

    Returns:
        str: 64-character lowercase hexadecimal SHA-256 hash.
    """
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError(f"Expected bytes or bytearray, got {type(data).__name__}.")

    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest().lower()


def compute_stream_hash(stream: BinaryIO, chunk_size: int = DEFAULT_CHUNK_SIZE) -> str:
    """
    Compute SHA-256 hex digest for an open binary stream using chunked reads.
    Memory consumption remains capped at chunk_size regardless of file size.

    Args:
        stream (BinaryIO): An open readable binary stream (e.g. UploadFile.file, BytesIO, open file).
        chunk_size (int): Size in bytes of each read chunk. Defaults to 64 KB.

    Returns:
        str: 64-character lowercase hexadecimal SHA-256 hash.
    """
    hasher = hashlib.sha256()

    while True:
        chunk = stream.read(chunk_size)
        if not chunk:
            break
        hasher.update(chunk)

    # If the stream is seekable, reset its pointer back to the beginning
    if hasattr(stream, "seek") and callable(stream.seek):
        try:
            stream.seek(0)
        except (OSError, ValueError):
            pass

    return hasher.hexdigest().lower()


def compute_file_hash(file_path: Union[str, Path], chunk_size: int = DEFAULT_CHUNK_SIZE) -> str:
    """
    Compute SHA-256 hex digest for a file on disk using streaming chunk reads.

    Args:
        file_path (str or Path): Path to the target file on disk.
        chunk_size (int): Size in bytes of each read chunk. Defaults to 64 KB.

    Returns:
        str: 64-character lowercase hexadecimal SHA-256 hash.

    Raises:
        FileNotFoundError: If the specified file does not exist.
        IsADirectoryError: If the target path points to a directory.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: '{file_path}'")
    if not path.is_file():
        raise IsADirectoryError(f"Path is not a regular file: '{file_path}'")

    with open(path, "rb") as file_handle:
        return compute_stream_hash(file_handle, chunk_size=chunk_size)
