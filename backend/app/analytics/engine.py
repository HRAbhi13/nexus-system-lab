"""
engine.py - Pandas-Powered Storage Analytics Engine
NEXUS - Intelligent Cloud Storage Optimization System

Leverages Pandas DataFrames for high-performance statistical aggregations,
category distribution breakdowns, size binning, and storage health telemetry.
"""

from typing import List, Dict, Any
import pandas as pd
from sqlalchemy.orm import Session
from app.models.file_metadata import FileMetadata


class AnalyticsEngine:
    """
    Pandas-based analytics engine providing data aggregations and distribution telemetry.
    """

    @staticmethod
    def files_to_dataframe(files: List[FileMetadata]) -> pd.DataFrame:
        """
        Convert a list of SQLAlchemy FileMetadata instances into a Pandas DataFrame.

        Args:
            files (List[FileMetadata]): File records from the database.

        Returns:
            pd.DataFrame: Tabular DataFrame of file attributes.
        """
        if not files:
            return pd.DataFrame(columns=[
                "id", "filename", "file_size_bytes", "file_size_mb",
                "sha256_hash", "mime_type", "category", "storage_tier",
                "is_duplicate", "upload_timestamp", "last_accessed_timestamp"
            ])

        data = [
            {
                "id": f.id,
                "filename": f.filename,
                "file_size_bytes": f.file_size_bytes,
                "file_size_mb": f.file_size_mb,
                "sha256_hash": f.sha256_hash,
                "mime_type": f.mime_type,
                "category": f.category,
                "storage_tier": f.storage_tier,
                "is_duplicate": f.is_duplicate,
                "upload_timestamp": f.upload_timestamp,
                "last_accessed_timestamp": f.last_accessed_timestamp,
            }
            for f in files
        ]

        df = pd.DataFrame(data)
        df["file_size_bytes"] = pd.to_numeric(df["file_size_bytes"], errors="coerce").fillna(0)
        df["file_size_mb"] = pd.to_numeric(df["file_size_mb"], errors="coerce").fillna(0.0)
        return df

    @staticmethod
    def get_storage_overview(db: Session) -> Dict[str, Any]:
        """
        Compute high-level storage capacity and duplicate metrics using Pandas.
        """
        files = db.query(FileMetadata).all()
        df = AnalyticsEngine.files_to_dataframe(files)

        total_files = len(df)
        if total_files == 0:
            return {
                "total_files": 0,
                "total_bytes": 0,
                "total_mb": 0.0,
                "total_gb": 0.0,
                "average_file_size_mb": 0.0,
                "largest_file_size_mb": 0.0,
                "duplicate_files_count": 0,
                "duplicate_wasted_bytes": 0,
                "duplicate_wasted_mb": 0.0,
                "duplicate_volume_percentage": 0.0,
            }

        total_bytes = int(df["file_size_bytes"].sum())
        total_mb = float(df["file_size_mb"].sum())
        total_gb = round(total_bytes / (1024 ** 3), 6)
        avg_mb = float(df["file_size_mb"].mean())
        max_mb = float(df["file_size_mb"].max())

        # Duplicate metrics via DataFrame masking
        dup_mask = df["is_duplicate"] == True
        dup_df = df[dup_mask]
        dup_count = int(dup_mask.sum())
        dup_wasted_bytes = int(dup_df["file_size_bytes"].sum()) if not dup_df.empty else 0
        dup_wasted_mb = float(dup_df["file_size_mb"].sum()) if not dup_df.empty else 0.0

        dup_percentage = round((dup_wasted_bytes / total_bytes) * 100, 2) if total_bytes > 0 else 0.0

        return {
            "total_files": total_files,
            "total_bytes": total_bytes,
            "total_mb": round(total_mb, 4),
            "total_gb": total_gb,
            "average_file_size_mb": round(avg_mb, 4),
            "largest_file_size_mb": round(max_mb, 4),
            "duplicate_files_count": dup_count,
            "duplicate_wasted_bytes": dup_wasted_bytes,
            "duplicate_wasted_mb": round(dup_wasted_mb, 4),
            "duplicate_volume_percentage": dup_percentage,
        }

    @staticmethod
    def get_category_distribution(db: Session) -> List[Dict[str, Any]]:
        """
        Group files by category and compute volume and count shares using Pandas.
        """
        files = db.query(FileMetadata).all()
        df = AnalyticsEngine.files_to_dataframe(files)

        if df.empty:
            return []

        total_bytes = df["file_size_bytes"].sum()
        total_files = len(df)

        grouped = df.groupby("category").agg(
            file_count=("id", "count"),
            total_bytes=("file_size_bytes", "sum"),
            total_mb=("file_size_mb", "sum"),
        ).reset_index()

        grouped["percentage_of_total_bytes"] = grouped["total_bytes"].apply(
            lambda b: round((b / total_bytes) * 100, 2) if total_bytes > 0 else 0.0
        )
        grouped["percentage_of_total_files"] = grouped["file_count"].apply(
            lambda c: round((c / total_files) * 100, 2) if total_files > 0 else 0.0
        )

        # Sort by total volume descending
        grouped = grouped.sort_values(by="total_bytes", ascending=False)
        return grouped.to_dict(orient="records")

    @staticmethod
    def get_tier_distribution(db: Session) -> List[Dict[str, Any]]:
        """
        Group files by cloud storage tier and compute capacity shares using Pandas.
        """
        files = db.query(FileMetadata).all()
        df = AnalyticsEngine.files_to_dataframe(files)

        if df.empty:
            return []

        total_bytes = df["file_size_bytes"].sum()

        grouped = df.groupby("storage_tier").agg(
            file_count=("id", "count"),
            total_bytes=("file_size_bytes", "sum"),
            total_mb=("file_size_mb", "sum"),
        ).reset_index()

        grouped["percentage_of_total_bytes"] = grouped["total_bytes"].apply(
            lambda b: round((b / total_bytes) * 100, 2) if total_bytes > 0 else 0.0
        )

        grouped = grouped.sort_values(by="total_bytes", ascending=False)
        return grouped.to_dict(orient="records")

    @staticmethod
    def get_size_distribution_brackets(db: Session) -> List[Dict[str, Any]]:
        """
        Bin files into standard storage size brackets (< 1 MB, 1-10 MB, 10-50 MB, 50-100 MB, > 100 MB).
        """
        files = db.query(FileMetadata).all()
        df = AnalyticsEngine.files_to_dataframe(files)

        brackets_def = [
            ("< 1 MB", 0, 1 * 1024 * 1024),
            ("1 MB - 10 MB", 1 * 1024 * 1024, 10 * 1024 * 1024),
            ("10 MB - 50 MB", 10 * 1024 * 1024, 50 * 1024 * 1024),
            ("50 MB - 100 MB", 50 * 1024 * 1024, 100 * 1024 * 1024),
            ("> 100 MB", 100 * 1024 * 1024, float("inf")),
        ]

        if df.empty:
            return [
                {"bracket_label": label, "file_count": 0, "total_bytes": 0, "total_mb": 0.0}
                for label, _, _ in brackets_def
            ]

        results = []
        for label, lower, upper in brackets_def:
            if upper == float("inf"):
                mask = df["file_size_bytes"] >= lower
            else:
                mask = (df["file_size_bytes"] >= lower) & (df["file_size_bytes"] < upper)

            subset = df[mask]
            b_count = int(len(subset))
            b_bytes = int(subset["file_size_bytes"].sum()) if b_count > 0 else 0
            b_mb = float(subset["file_size_mb"].sum()) if b_count > 0 else 0.0

            results.append({
                "bracket_label": label,
                "file_count": b_count,
                "total_bytes": b_bytes,
                "total_mb": round(b_mb, 4),
            })

        return results

    @staticmethod
    def get_storage_dashboard(db: Session) -> Dict[str, Any]:
        """
        Consolidate overview metrics, category distributions, tier shares,
        and size brackets for complete dashboard visualization.
        """
        return {
            "overview": AnalyticsEngine.get_storage_overview(db),
            "category_distribution": AnalyticsEngine.get_category_distribution(db),
            "tier_distribution": AnalyticsEngine.get_tier_distribution(db),
            "size_brackets": AnalyticsEngine.get_size_distribution_brackets(db),
        }
