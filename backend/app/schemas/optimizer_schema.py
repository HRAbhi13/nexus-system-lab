"""
optimizer_schema.py - Pydantic Schemas for Storage Optimization & Cost Models
NEXUS - Intelligent Cloud Storage Optimization System
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DuplicateCluster(BaseModel):
    """Represents a group of duplicate files sharing the same SHA-256 hash."""
    sha256_hash: str = Field(..., description="Cryptographic SHA-256 digest")
    file_count: int = Field(..., description="Total copies detected")
    file_size_bytes: int = Field(..., description="Size of one copy in bytes")
    wasted_bytes: int = Field(..., description="Recoverable space if redundant copies are removed")
    wasted_mb: float = Field(..., description="Recoverable space in megabytes")
    master_file: Dict[str, Any] = Field(..., description="Original master file metadata")
    duplicate_files: List[Dict[str, Any]] = Field(default_factory=list, description="Redundant duplicate instances")


class DuplicateAuditReport(BaseModel):
    """Summary report of storage deduplication analysis."""
    total_files_analyzed: int
    duplicate_files_count: int
    unique_hashes_count: int
    duplicate_clusters_count: int
    total_wasted_bytes: int
    total_wasted_mb: float
    estimated_duplicate_percentage: float = Field(..., description="Estimated percentage of storage occupied by duplicates")
    clusters: List[DuplicateCluster] = Field(default_factory=list)


class FileCompressionAdvice(BaseModel):
    """Estimated compression potential for an individual file."""
    file_id: int
    filename: str
    category: str
    original_size_bytes: int
    original_size_mb: float
    estimated_compressed_bytes: int
    estimated_savings_bytes: int
    estimated_savings_mb: float
    estimated_savings_percentage: float = Field(..., description="Estimated percentage space reduction")
    compression_algorithm: str = Field("gzip", description="Recommended compression algorithm (gzip / zstd)")
    is_compression_recommended: bool = Field(..., description="Whether compression yields significant benefit")


class CompressionAuditReport(BaseModel):
    """Aggregated compression analysis report across all files."""
    total_files_analyzed: int
    compressible_files_count: int
    total_original_bytes: int
    total_original_mb: float
    total_estimated_compressed_bytes: int
    total_estimated_compressed_mb: float
    total_estimated_savings_bytes: int
    total_estimated_savings_mb: float
    overall_estimated_savings_percentage: float = Field(..., description="Estimated overall compression savings percentage")
    recommendations: List[FileCompressionAdvice] = Field(default_factory=list)


class TierTransitionAdvice(BaseModel):
    """Lifecycle recommendation to transition a file to a more cost-effective storage tier."""
    file_id: int
    filename: str
    category: str
    file_size_bytes: int
    file_size_mb: float
    current_tier: str
    recommended_tier: str
    days_since_last_access: int
    current_monthly_cost: float = Field(..., description="Estimated current monthly storage spend in USD")
    recommended_monthly_cost: float = Field(..., description="Estimated post-transition monthly storage spend in USD")
    projected_monthly_savings: float = Field(..., description="Estimated monthly savings in USD")
    projected_savings_percentage: float = Field(..., description="Estimated percentage cost reduction")
    reason: str


class TierLifecycleReport(BaseModel):
    """Complete cloud lifecycle tier optimization report."""
    total_files_analyzed: int
    candidates_count: int
    projected_current_monthly_spend: float = Field(..., description="Estimated baseline monthly spend in USD")
    projected_optimized_monthly_spend: float = Field(..., description="Estimated optimized monthly spend in USD")
    total_projected_monthly_savings: float = Field(..., description="Estimated total monthly dollar savings")
    overall_projected_savings_percentage: float = Field(..., description="Estimated overall cost reduction percentage")
    recommendations: List[TierTransitionAdvice] = Field(default_factory=list)


class ComprehensiveOptimizationReport(BaseModel):
    """Executive ROI report consolidating deduplication, compression, and tier optimization."""
    total_files_stored: int
    total_capacity_bytes: int
    total_capacity_mb: float
    current_monthly_spend: float = Field(..., description="Current baseline monthly storage spend in USD")

    # Deduplication metrics
    duplicate_files_count: int
    deduplication_recoverable_bytes: int
    deduplication_recoverable_mb: float
    deduplication_estimated_savings_spend: float = Field(..., description="Projected monthly spend reduction from removing duplicates")

    # Compression metrics
    compressible_files_count: int
    compression_recoverable_bytes: int
    compression_recoverable_mb: float
    compression_estimated_savings_spend: float = Field(..., description="Projected monthly spend reduction from compression")

    # Tier reallocation metrics
    tier_transition_candidates_count: int
    tier_reallocation_estimated_savings_spend: float = Field(..., description="Projected monthly spend reduction from tier reallocations")

    # Financial Bottom Line
    total_projected_monthly_savings: float = Field(..., description="Estimated combined monthly savings in USD")
    total_projected_annual_savings: float = Field(..., description="Estimated combined annual savings in USD")
    overall_projected_savings_percentage: float = Field(..., description="Estimated percentage cost reduction across storage estate")
    disclaimer: str = Field(
        "All projected savings and percentage reductions are algorithmic estimates based on cloud tier models and content entropy.",
        description="Explicit estimation disclaimer"
    )
