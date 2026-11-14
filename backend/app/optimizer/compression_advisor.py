"""
compression_advisor.py - Intelligent File Compression Advisory Engine
NEXUS - Intelligent Cloud Storage Optimization System

Evaluates file compressibility based on content format and category,
estimating space savings and recommending optimal compression algorithms.
All reported savings are clearly identified as estimates.
"""

from pathlib import Path
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.file_metadata import FileMetadata


# Estimated compression ratios based on file extension (1.0 = no compression, 0.30 = 70% space savings)
COMPRESSION_RATIO_MAP: Dict[str, Tuple[float, str]] = {
    # Text / Raw Code / Structured Markup -> High Compression (~70% savings)
    ".txt": (0.30, "gzip"),
    ".md": (0.32, "gzip"),
    ".log": (0.25, "zstd"),
    ".csv": (0.30, "gzip"),
    ".tsv": (0.30, "gzip"),
    ".json": (0.35, "zstd"),
    ".xml": (0.35, "gzip"),
    ".sql": (0.30, "gzip"),
    ".html": (0.35, "gzip"),
    ".css": (0.38, "gzip"),
    ".js": (0.40, "gzip"),
    ".ts": (0.40, "gzip"),
    ".py": (0.40, "gzip"),
    ".java": (0.40, "gzip"),
    ".cpp": (0.40, "gzip"),
    ".c": (0.40, "gzip"),
    ".yaml": (0.35, "gzip"),
    ".yml": (0.35, "gzip"),

    # Binary Office / PDF Documents -> Moderate Compression (~25% savings)
    ".pdf": (0.80, "zstd"),
    ".docx": (0.85, "zstd"),
    ".xlsx": (0.85, "zstd"),
    ".pptx": (0.85, "zstd"),
    ".rtf": (0.50, "gzip"),

    # Pre-compressed Formats -> Negligible Compression (< 5% savings, not recommended)
    ".zip": (0.98, "none"),
    ".gz": (0.99, "none"),
    ".tar": (0.60, "gzip"),
    ".7z": (0.99, "none"),
    ".jpg": (0.98, "none"),
    ".jpeg": (0.98, "none"),
    ".png": (0.95, "none"),
    ".webp": (0.98, "none"),
    ".mp4": (0.99, "none"),
    ".mkv": (0.99, "none"),
    ".mov": (0.99, "none"),
    ".mp3": (0.99, "none"),
    ".flac": (0.97, "none"),
    ".wav": (0.60, "zstd"),
}

# Category fallback ratios if extension is unrecognized
CATEGORY_FALLBACK_RATIO: Dict[str, Tuple[float, str]] = {
    "Document": (0.45, "gzip"),
    "Spreadsheet": (0.40, "gzip"),
    "Code": (0.38, "gzip"),
    "Image": (0.96, "none"),
    "Video": (0.98, "none"),
    "Audio": (0.95, "none"),
    "Archive": (0.98, "none"),
    "Other": (0.75, "zstd"),
}


class CompressionAdvisor:
    """
    Analyzes storage estate to estimate potential space recoverable via data compression.
    """

    @staticmethod
    def get_compression_ratio(filename: str, category: str) -> Tuple[float, str]:
        """
        Determine the estimated compressed ratio and recommended algorithm.

        Returns:
            Tuple[float, str]: (estimated_ratio, recommended_algorithm)
        """
        ext = Path(filename).suffix.lower()
        if ext in COMPRESSION_RATIO_MAP:
            return COMPRESSION_RATIO_MAP[ext]
        return CATEGORY_FALLBACK_RATIO.get(category, (0.75, "gzip"))

    @staticmethod
    def evaluate_file(file: FileMetadata) -> Dict[str, Any]:
        """
        Evaluate estimated compression potential for an individual file record.

        Args:
            file (FileMetadata): The file to analyze.

        Returns:
            Dict[str, Any]: Compression advisory details.
        """
        ratio, algorithm = CompressionAdvisor.get_compression_ratio(file.filename, file.category)
        original_size = file.file_size_bytes

        estimated_compressed_bytes = int(original_size * ratio)
        estimated_savings_bytes = max(0, original_size - estimated_compressed_bytes)

        estimated_savings_percentage = (
            round((estimated_savings_bytes / original_size) * 100, 2)
            if original_size > 0 else 0.0
        )

        # Recommended if estimated reduction is at least 15% and file is at least 1 KB
        is_recommended = (estimated_savings_percentage >= 15.0) and (original_size >= 1024)

        return {
            "file_id": file.id,
            "filename": file.filename,
            "category": file.category,
            "original_size_bytes": original_size,
            "original_size_mb": round(original_size / (1024 * 1024), 4),
            "estimated_compressed_bytes": estimated_compressed_bytes,
            "estimated_savings_bytes": estimated_savings_bytes,
            "estimated_savings_mb": round(estimated_savings_bytes / (1024 * 1024), 4),
            "estimated_savings_percentage": estimated_savings_percentage,
            "compression_algorithm": algorithm,
            "is_compression_recommended": is_recommended,
        }

    @staticmethod
    def audit_compression(db: Session) -> Dict[str, Any]:
        """
        Run compression analysis across all files stored in the database.

        Args:
            db (Session): Database session.

        Returns:
            Dict[str, Any]: Consolidated compression report.
        """
        files = db.query(FileMetadata).all()
        return CompressionAdvisor.analyze_files(files)

    @staticmethod
    def analyze_files(files: List[FileMetadata]) -> Dict[str, Any]:
        """
        Analyze a collection of files to calculate total projected compression savings.
        """
        total_files = len(files)
        total_original_bytes = sum(f.file_size_bytes for f in files)

        recommendations: List[Dict[str, Any]] = []
        compressible_count = 0
        total_estimated_compressed_bytes = 0
        total_estimated_savings_bytes = 0

        for f in files:
            advice = CompressionAdvisor.evaluate_file(f)
            recommendations.append(advice)

            if advice["is_compression_recommended"]:
                compressible_count += 1
                total_estimated_compressed_bytes += advice["estimated_compressed_bytes"]
                total_estimated_savings_bytes += advice["estimated_savings_bytes"]
            else:
                # If compression not recommended, assume original size
                total_estimated_compressed_bytes += f.file_size_bytes

        # Sort recommendations: highest potential savings first
        recommendations.sort(key=lambda r: r["estimated_savings_bytes"], reverse=True)

        overall_estimated_savings_percentage = (
            round((total_estimated_savings_bytes / total_original_bytes) * 100, 2)
            if total_original_bytes > 0 else 0.0
        )

        return {
            "total_files_analyzed": total_files,
            "compressible_files_count": compressible_count,
            "total_original_bytes": total_original_bytes,
            "total_original_mb": round(total_original_bytes / (1024 * 1024), 4),
            "total_estimated_compressed_bytes": total_estimated_compressed_bytes,
            "total_estimated_compressed_mb": round(total_estimated_compressed_bytes / (1024 * 1024), 4),
            "total_estimated_savings_bytes": total_estimated_savings_bytes,
            "total_estimated_savings_mb": round(total_estimated_savings_bytes / (1024 * 1024), 4),
            "overall_estimated_savings_percentage": overall_estimated_savings_percentage,
            "recommendations": recommendations,
        }
