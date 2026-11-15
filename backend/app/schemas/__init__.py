"""
schemas/__init__.py - Expose all Pydantic schemas for clean imports
NEXUS - Intelligent Cloud Storage Optimization System
"""

from app.schemas.file_schema import (
    FileMetadataBase,
    FileMetadataCreate,
    FileMetadataResponse,
    FileListResponse,
    FileTierUpdateRequest,
    StorageTierResponse,
)
from app.schemas.optimizer_schema import (
    DuplicateCluster,
    DuplicateAuditReport,
    FileCompressionAdvice,
    CompressionAuditReport,
    TierTransitionAdvice,
    TierLifecycleReport,
    ComprehensiveOptimizationReport,
)
from app.schemas.analytics_schema import (
    CategoryDistributionItem,
    TierDistributionItem,
    SizeBracketItem,
    StorageOverviewMetrics,
    StorageDashboardResponse,
)

__all__ = [
    "FileMetadataBase",
    "FileMetadataCreate",
    "FileMetadataResponse",
    "FileListResponse",
    "FileTierUpdateRequest",
    "StorageTierResponse",
    "DuplicateCluster",
    "DuplicateAuditReport",
    "FileCompressionAdvice",
    "CompressionAuditReport",
    "TierTransitionAdvice",
    "TierLifecycleReport",
    "ComprehensiveOptimizationReport",
    "CategoryDistributionItem",
    "TierDistributionItem",
    "SizeBracketItem",
    "StorageOverviewMetrics",
    "StorageDashboardResponse",
]
