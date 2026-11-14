"""
file_metadata.py - SQLAlchemy Model for Stored File Metadata
NEXUS - Intelligent Cloud Storage Optimization System
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


def utc_now() -> datetime:
    """Return current UTC datetime without timezone for consistent SQLite persistence."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class FileMetadata(Base):
    """
    Represents metadata for an ingested file in the cloud storage system.
    Stores cryptographic hash, byte size, category, tier assignment, and timestamps.
    """
    __tablename__ = "files_metadata"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False, index=True)
    stored_filename = Column(String(255), unique=True, nullable=False, index=True)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False, default=0)
    file_size_mb = Column(Float, nullable=False, default=0.0)
    sha256_hash = Column(String(64), nullable=False, index=True)
    mime_type = Column(String(128), nullable=False, default="application/octet-stream")
    category = Column(String(64), nullable=False, default="Other", index=True)
    storage_tier = Column(String(32), nullable=False, default="HOT", index=True)
    is_duplicate = Column(Boolean, nullable=False, default=False, index=True)
    original_file_id = Column(Integer, ForeignKey("files_metadata.id"), nullable=True)

    upload_timestamp = Column(DateTime, nullable=False, default=utc_now)
    last_accessed_timestamp = Column(DateTime, nullable=False, default=utc_now)

    # Self-referencing relationship for duplicate file chains
    duplicates = relationship("FileMetadata", backref="original_file", remote_side=[id])

    def to_dict(self):
        """Convert metadata model to dictionary representation."""
        return {
            "id": self.id,
            "filename": self.filename,
            "stored_filename": self.stored_filename,
            "file_path": self.file_path,
            "file_size_bytes": self.file_size_bytes,
            "file_size_mb": round(self.file_size_mb, 4),
            "sha256_hash": self.sha256_hash,
            "mime_type": self.mime_type,
            "category": self.category,
            "storage_tier": self.storage_tier,
            "is_duplicate": self.is_duplicate,
            "original_file_id": self.original_file_id,
            "upload_timestamp": self.upload_timestamp.isoformat() if self.upload_timestamp else None,
            "last_accessed_timestamp": self.last_accessed_timestamp.isoformat() if self.last_accessed_timestamp else None,
        }

    def __repr__(self):
        return (
            f"<FileMetadata id={self.id} filename='{self.filename}' "
            f"category='{self.category}' tier='{self.storage_tier}' "
            f"size={self.file_size_bytes}B is_duplicate={self.is_duplicate}>"
        )
