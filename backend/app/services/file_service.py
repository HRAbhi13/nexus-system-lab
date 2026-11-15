"""
file_service.py - File Management & Ingestion Orchestration Service
NEXUS - Intelligent Cloud Storage Optimization System

Coordinates file saving, streaming hashing, MIME categorization,
database metadata registration, and duplicate tracking.
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.file_metadata import FileMetadata
from app.services.hasher import compute_bytes_hash
from app.services.categorizer import categorize_file, detect_mime_type
from app.storage.local_storage import LocalStorageManager, storage_manager
from app.storage.tier_manager import TierManager


class FileService:
    """
    Service responsible for orchestrating file ingestion, querying, updates, and deletion.
    """

    @staticmethod
    def ingest_file(
        db: Session,
        filename: str,
        content: bytes,
        storage_tier: str = "HOT",
        custom_storage: Optional[LocalStorageManager] = None,
    ) -> FileMetadata:
        """
        Ingest a file: compute hash, categorize, check duplicate status,
        persist to bucket, and register metadata in database.

        Args:
            db (Session): Database session.
            filename (str): Original user filename.
            content (bytes): Raw file bytes.
            storage_tier (str): Target storage tier ('HOT', 'WARM', 'COLD', 'ARCHIVE').
            custom_storage (LocalStorageManager, optional): Custom storage bucket manager.

        Returns:
            FileMetadata: Persisted database record.
        """
        if not filename or not filename.strip():
            raise ValueError("Filename cannot be empty.")
        if content is None:
            raise ValueError("File content cannot be None.")

        store = custom_storage or storage_manager

        # 1. Compute exact size and SHA-256 cryptographic digest
        size_bytes = len(content)
        size_mb = size_bytes / (1024 * 1024)
        sha256_hash = compute_bytes_hash(content)

        # 2. Categorize and detect MIME type
        mime = detect_mime_type(filename)
        category = categorize_file(filename, mime)

        # 3. Check for existing identical content in the database (Duplicate Detection)
        existing_master = (
            db.query(FileMetadata)
            .filter(FileMetadata.sha256_hash == sha256_hash)
            .order_by(FileMetadata.id.asc())
            .first()
        )

        is_duplicate = existing_master is not None
        original_file_id = existing_master.id if is_duplicate else None

        # 4. Normalize and validate storage tier
        norm_tier = storage_tier.strip().upper()
        if not TierManager.is_valid_tier(db, norm_tier):
            norm_tier = "HOT"

        # 5. Save physical content to the storage bucket
        stored_filename, file_path = store.save_file(content, filename)

        # 6. Create and persist metadata record
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        record = FileMetadata(
            filename=filename.strip(),
            stored_filename=stored_filename,
            file_path=str(file_path),
            file_size_bytes=size_bytes,
            file_size_mb=size_mb,
            sha256_hash=sha256_hash,
            mime_type=mime,
            category=category,
            storage_tier=norm_tier,
            is_duplicate=is_duplicate,
            original_file_id=original_file_id,
            upload_timestamp=now,
            last_accessed_timestamp=now,
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def get_file(db: Session, file_id: int) -> Optional[FileMetadata]:
        """Fetch a single file record by its database ID."""
        return db.query(FileMetadata).filter(FileMetadata.id == file_id).first()

    @staticmethod
    def get_file_by_hash(db: Session, sha256_hash: str) -> List[FileMetadata]:
        """Fetch all file records that share the same SHA-256 hash."""
        return (
            db.query(FileMetadata)
            .filter(FileMetadata.sha256_hash == sha256_hash.strip().lower())
            .order_by(FileMetadata.id.asc())
            .all()
        )

    @staticmethod
    def list_files(
        db: Session,
        category: Optional[str] = None,
        tier: Optional[str] = None,
        is_duplicate: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[FileMetadata], int]:
        """
        Query files with optional filtering and pagination.

        Returns:
            Tuple[List[FileMetadata], int]: (matching_records, total_matching_count)
        """
        query = db.query(FileMetadata)

        if category:
            query = query.filter(FileMetadata.category == category)
        if tier:
            query = query.filter(FileMetadata.storage_tier == tier.strip().upper())
        if is_duplicate is not None:
            query = query.filter(FileMetadata.is_duplicate == is_duplicate)
        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    FileMetadata.filename.ilike(search_pattern),
                    FileMetadata.sha256_hash.ilike(search_pattern),
                )
            )

        total_count = query.count()
        records = query.order_by(FileMetadata.id.desc()).offset(offset).limit(limit).all()

        return records, total_count

    @staticmethod
    def update_tier(db: Session, file_id: int, new_tier: str) -> Optional[FileMetadata]:
        """
        Change the storage tier of a file.

        Args:
            db (Session): Database session.
            file_id (int): ID of the file.
            new_tier (str): Target tier (e.g. 'HOT', 'WARM', 'COLD', 'ARCHIVE').

        Returns:
            Optional[FileMetadata]: Updated record, or None if file not found.
        """
        record = FileService.get_file(db, file_id)
        if not record:
            return None

        norm_tier = new_tier.strip().upper()
        if not TierManager.is_valid_tier(db, norm_tier):
            raise ValueError(f"Invalid cloud storage tier: '{new_tier}'.")

        record.storage_tier = norm_tier
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def record_access(
        db: Session, file_id: int, accessed_at: Optional[datetime] = None
    ) -> Optional[FileMetadata]:
        """
        Update a file's last_accessed_timestamp.

        Args:
            db (Session): Database session.
            file_id (int): Target file ID.
            accessed_at (datetime, optional): Custom timestamp (defaults to current UTC time).
        """
        record = FileService.get_file(db, file_id)
        if not record:
            return None

        if accessed_at and accessed_at.tzinfo is not None:
            accessed_at = accessed_at.astimezone(timezone.utc).replace(tzinfo=None)

        record.last_accessed_timestamp = accessed_at or datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def delete_file(
        db: Session, file_id: int, custom_storage: Optional[LocalStorageManager] = None
    ) -> bool:
        """
        Delete a file from the database and remove its physical content from storage.

        Args:
            db (Session): Database session.
            file_id (int): ID of the file to remove.
            custom_storage (LocalStorageManager, optional): Custom storage manager.

        Returns:
            bool: True if file was found and deleted, False otherwise.
        """
        record = FileService.get_file(db, file_id)
        if not record:
            return False

        store = custom_storage or storage_manager

        # Delete physical file from storage bucket
        store.delete_file(record.stored_filename)

        # Delete metadata record from database
        db.delete(record)
        db.commit()
        return True
