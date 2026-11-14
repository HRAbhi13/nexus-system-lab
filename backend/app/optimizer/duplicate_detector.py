"""
duplicate_detector.py - Intelligent SHA-256 Storage Deduplication Engine
NEXUS - Intelligent Cloud Storage Optimization System

Identifies identical redundant files using cryptographic SHA-256 hashing,
groups them into clusters, identifies master copies, and computes recoverable storage.
"""

from typing import List, Dict, Any, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.file_metadata import FileMetadata


class DuplicateDetector:
    """
    Engine for identifying redundant files, calculating wasted capacity,
    and auditing storage clusters.
    """

    @staticmethod
    def audit_duplicates(db: Session) -> Dict[str, Any]:
        """
        Audit the entire database to discover duplicate clusters and calculate wasted capacity.

        Args:
            db (Session): Database session.

        Returns:
            Dict[str, Any]: Comprehensive duplicate audit metrics.
        """
        all_files: List[FileMetadata] = db.query(FileMetadata).order_by(FileMetadata.id.asc()).all()
        return DuplicateDetector.analyze_files(all_files)

    @staticmethod
    def analyze_files(files: List[FileMetadata]) -> Dict[str, Any]:
        """
        Analyze an in-memory list of FileMetadata instances for duplicate clusters.

        Args:
            files (List[FileMetadata]): List of file records.

        Returns:
            Dict[str, Any]: Structured deduplication audit data.
        """
        total_files = len(files)
        total_capacity_bytes = sum(f.file_size_bytes for f in files)

        # Group files by SHA-256 hash
        hash_groups: Dict[str, List[FileMetadata]] = defaultdict(list)
        for f in files:
            hash_groups[f.sha256_hash].append(f)

        clusters: List[Dict[str, Any]] = []
        total_duplicate_files = 0
        total_wasted_bytes = 0

        for sha_hash, group in hash_groups.items():
            if len(group) > 1:
                # Earliest file (lowest id / earliest upload) is designated as the master
                master = group[0]
                duplicates = group[1:]

                cluster_wasted_bytes = sum(dup.file_size_bytes for dup in duplicates)
                total_wasted_bytes += cluster_wasted_bytes
                total_duplicate_files += len(duplicates)

                clusters.append({
                    "sha256_hash": sha_hash,
                    "file_count": len(group),
                    "file_size_bytes": master.file_size_bytes,
                    "wasted_bytes": cluster_wasted_bytes,
                    "wasted_mb": round(cluster_wasted_bytes / (1024 * 1024), 4),
                    "master_file": master.to_dict(),
                    "duplicate_files": [dup.to_dict() for dup in duplicates],
                })

        # Sort clusters by wasted space descending (highest impact first)
        clusters.sort(key=lambda c: c["wasted_bytes"], reverse=True)

        estimated_duplicate_percentage = (
            round((total_wasted_bytes / total_capacity_bytes) * 100, 2)
            if total_capacity_bytes > 0 else 0.0
        )

        return {
            "total_files_analyzed": total_files,
            "duplicate_files_count": total_duplicate_files,
            "unique_hashes_count": len(hash_groups),
            "duplicate_clusters_count": len(clusters),
            "total_wasted_bytes": total_wasted_bytes,
            "total_wasted_mb": round(total_wasted_bytes / (1024 * 1024), 4),
            "estimated_duplicate_percentage": estimated_duplicate_percentage,
            "clusters": clusters,
        }

    @staticmethod
    def resync_duplicate_flags(db: Session) -> int:
        """
        Scan all files in the database and ensure their `is_duplicate` and `original_file_id`
        fields correctly point to the master copy.

        Args:
            db (Session): Database session.

        Returns:
            int: Number of duplicate records updated.
        """
        all_files: List[FileMetadata] = db.query(FileMetadata).order_by(FileMetadata.id.asc()).all()
        hash_groups: Dict[str, List[FileMetadata]] = defaultdict(list)
        for f in all_files:
            hash_groups[f.sha256_hash].append(f)

        updated_count = 0
        for _, group in hash_groups.items():
            master = group[0]
            if master.is_duplicate or master.original_file_id is not None:
                master.is_duplicate = False
                master.original_file_id = None
                updated_count += 1

            for duplicate in group[1:]:
                if not duplicate.is_duplicate or duplicate.original_file_id != master.id:
                    duplicate.is_duplicate = True
                    duplicate.original_file_id = master.id
                    updated_count += 1

        if updated_count > 0:
            db.commit()

        return updated_count
