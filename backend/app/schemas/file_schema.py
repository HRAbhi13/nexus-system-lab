"""
file_schema.py - Pydantic Request & Response Schemas for Files
NEXUS - Intelligent Cloud Storage Optimization System
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class FileMetadataBase(BaseModel):
    """Base fields shared across file metadata representations."""
    filename: str = Field(..., description="Original filename uploaded by the user")
    file_size_bytes: int = Field(..., ge=0, description="Exact size of the file in bytes")
    file_size_mb: float = Field(..., ge=0.0, description="Size of the file in megabytes")
    sha256_hash: str = Field(..., min_length=64, max_length=64, description="Cryptographic SHA-256 digest")
    mime_type: str = Field(..., description="MIME content type")
    category: str = Field(..., description="High-level file category (Document, Image, Video, etc.)")
    storage_tier: str = Field("HOT", description="Current cloud storage tier assignment")


class FileMetadataCreate(FileMetadataBase):
    """Schema used during file creation."""
    stored_filename: str = Field(..., description="Unique filename on the storage bucket")
    file_path: str = Field(..., description="Filesystem path of the stored file")
    is_duplicate: bool = Field(False, description="Whether this file is a duplicate copy")
    original_file_id: Optional[int] = Field(None, description="ID of the original master file")


class FileMetadataResponse(FileMetadataBase):
    """Detailed response schema for a single file record."""
    id: int
    stored_filename: str
    file_path: str
    is_duplicate: bool
    original_file_id: Optional[int] = None
    upload_timestamp: datetime
    last_accessed_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class FileListResponse(BaseModel):
    """Response schema for listing multiple files."""
    total_count: int = Field(..., description="Total count of files matching query")
    total_size_bytes: int = Field(..., ge=0, description="Sum of sizes of matching files in bytes")
    total_size_mb: float = Field(..., ge=0.0, description="Sum of sizes of matching files in megabytes")
    files: List[FileMetadataResponse] = Field(default_factory=list, description="List of file metadata records")


class FileTierUpdateRequest(BaseModel):
    """Request payload to manually transition a file to a new cloud storage tier."""
    new_tier: str = Field(..., description="Target cloud storage tier (e.g. HOT, WARM, COLD, ARCHIVE)")


class StorageTierResponse(BaseModel):
    """Response schema for cloud storage tier definitions."""
    id: str
    name: str
    description: Optional[str] = None
    storage_cost_per_gb: float
    retrieval_cost_per_gb: float
    minimum_retention_days: int

    model_config = ConfigDict(from_attributes=True)
