"""
routes_files.py - REST API Endpoints for File Uploads & Management
NEXUS - Intelligent Cloud Storage Optimization System
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.file_schema import (
    FileMetadataResponse,
    FileListResponse,
    FileTierUpdateRequest,
)
from app.services.file_service import FileService

router = APIRouter()


@router.post(
    "/upload",
    response_model=FileMetadataResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a single file",
    description="Ingests a file, calculates its SHA-256 hash, categorizes it, detects duplicates, and stores it in the bucket."
)
async def upload_file(
    file: UploadFile = File(..., description="File to upload"),
    storage_tier: str = Form("HOT", description="Target storage tier (HOT, WARM, COLD, ARCHIVE)"),
    db: Session = Depends(get_db),
):
    """Upload and ingest a single file."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must have a filename.")

    content = await file.read()
    try:
        record = FileService.ingest_file(
            db=db,
            filename=file.filename,
            content=content,
            storage_tier=storage_tier,
        )
        return record
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/upload/batch",
    response_model=List[FileMetadataResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Batch upload multiple files",
    description="Upload multiple files simultaneously with automated duplicate tracking and categorization."
)
async def upload_batch_files(
    files: List[UploadFile] = File(..., description="List of files to upload"),
    storage_tier: str = Form("HOT", description="Initial storage tier for all files in the batch"),
    db: Session = Depends(get_db),
):
    """Upload multiple files in a single request."""
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided in batch upload.")

    results = []
    for file in files:
        if file.filename:
            content = await file.read()
            record = FileService.ingest_file(
                db=db,
                filename=file.filename,
                content=content,
                storage_tier=storage_tier,
            )
            results.append(record)

    return results


@router.get(
    "",
    response_model=FileListResponse,
    summary="List stored files with filters",
    description="Query files with optional filtering by category, tier, duplicate status, and search query."
)
def list_files(
    category: Optional[str] = Query(None, description="Filter by category (Document, Image, Code, etc.)"),
    tier: Optional[str] = Query(None, description="Filter by cloud tier (HOT, WARM, COLD, ARCHIVE)"),
    is_duplicate: Optional[bool] = Query(None, description="Filter by duplicate status"),
    search: Optional[str] = Query(None, description="Search term across filename and hash"),
    limit: int = Query(100, ge=1, le=1000, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
):
    """List and filter file metadata records."""
    records, total_count = FileService.list_files(
        db=db,
        category=category,
        tier=tier,
        is_duplicate=is_duplicate,
        search=search,
        limit=limit,
        offset=offset,
    )

    total_bytes = sum(r.file_size_bytes for r in records)
    total_mb = sum(r.file_size_mb for r in records)

    return {
        "total_count": total_count,
        "total_size_bytes": total_bytes,
        "total_size_mb": round(total_mb, 4),
        "files": records,
    }


@router.get(
    "/{file_id}",
    response_model=FileMetadataResponse,
    summary="Get file metadata by ID",
    description="Retrieve detailed metadata and duplicate linkage for a specific file."
)
def get_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    """Get file metadata by ID."""
    record = FileService.get_file(db, file_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File with ID {file_id} not found.")
    return record


@router.patch(
    "/{file_id}/tier",
    response_model=FileMetadataResponse,
    summary="Update file storage tier",
    description="Transition a file to a new cloud storage tier (e.g. migrate from HOT to WARM or ARCHIVE)."
)
def update_file_tier(
    file_id: int,
    payload: FileTierUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update a file's assigned cloud storage tier."""
    try:
        updated = FileService.update_tier(db, file_id, payload.new_tier)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File with ID {file_id} not found.")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a file",
    description="Removes the file metadata record and deletes the physical file from the storage bucket."
)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    """Delete a file from the database and storage bucket."""
    success = FileService.delete_file(db, file_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File with ID {file_id} not found.")
    return {"message": f"File {file_id} successfully deleted from storage.", "file_id": file_id}
