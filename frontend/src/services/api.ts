/**
 * api.ts - Reusable API Service Client for NEXUS Web Console
 * Connects React Frontend to FastAPI Backend Engine at http://127.0.0.1:8000
 */

// Base API URL: uses Vite proxy in dev (/api/v1), env override, or direct fallback
export const API_BASE_URL = 
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api/v1' : 'http://127.0.0.1:8000/api/v1');

// ==========================================
// Backend Schema Interfaces (Pydantic Models)
// ==========================================

export interface BackendStorageOverview {
  total_files: number;
  total_bytes: number;
  total_mb: number;
  total_gb: number;
  average_file_size_mb: number;
  largest_file_size_mb: number;
  duplicate_files_count: number;
  duplicate_wasted_bytes: number;
  duplicate_wasted_mb: number;
  duplicate_volume_percentage: number;
}

export interface BackendCategoryDistribution {
  category: string;
  file_count: number;
  total_bytes: number;
  total_mb: number;
  percentage_of_total_bytes: number;
  percentage_of_total_files: number;
}

export interface BackendTierDistribution {
  storage_tier: string;
  file_count: number;
  total_bytes: number;
  total_mb: number;
  percentage_of_total_bytes: number;
}

export interface BackendSizeBracket {
  bracket_label: string;
  file_count: number;
  total_bytes: number;
  total_mb: number;
}

export interface BackendStorageDashboard {
  overview: BackendStorageOverview;
  category_distribution: BackendCategoryDistribution[];
  tier_distribution: BackendTierDistribution[];
  size_brackets: BackendSizeBracket[];
}

export interface BackendOptimizationRoi {
  total_files_stored: number;
  total_capacity_bytes: number;
  total_capacity_mb: number;
  current_monthly_spend: number;
  duplicate_files_count: number;
  deduplication_recoverable_bytes: number;
  deduplication_recoverable_mb: number;
  deduplication_estimated_savings_spend: number;
  compressible_files_count: number;
  compression_recoverable_bytes: number;
  compression_recoverable_mb: number;
  compression_estimated_savings_spend: number;
  tier_transition_candidates_count: number;
  tier_reallocation_estimated_savings_spend: number;
  total_projected_monthly_savings: number;
  total_projected_annual_savings: number;
  overall_projected_savings_percentage: number;
  disclaimer: string;
}

export interface BackendFileMetadata {
  id: number;
  filename: string;
  stored_filename: string;
  file_path: string;
  file_size_bytes: number;
  file_size_mb: number;
  sha256_hash: string;
  mime_type: string;
  category: string;
  storage_tier: string;
  is_duplicate: boolean;
  original_file_id: number | null;
  upload_timestamp: string;
  last_accessed_timestamp: string;
}

export interface BackendFileListResponse {
  total_count: number;
  total_size_bytes: number;
  total_size_mb: number;
  files: BackendFileMetadata[];
}

export interface BackendDuplicateCluster {
  sha256_hash: string;
  file_count: number;
  file_size_bytes: number;
  wasted_bytes: number;
  wasted_mb: number;
  master_file: BackendFileMetadata;
  duplicate_files: BackendFileMetadata[];
}

export interface BackendDuplicateAuditReport {
  total_files_analyzed: number;
  duplicate_files_count: number;
  unique_hashes_count: number;
  duplicate_clusters_count: number;
  total_wasted_bytes: number;
  total_wasted_mb: number;
  estimated_duplicate_percentage: number;
  clusters: BackendDuplicateCluster[];
}

export interface BackendFileCompressionAdvice {
  file_id: number;
  filename: string;
  category: string;
  original_size_bytes: number;
  original_size_mb: number;
  estimated_compressed_bytes: number;
  estimated_savings_bytes: number;
  estimated_savings_mb: number;
  estimated_savings_percentage: number;
  compression_algorithm: string;
  is_compression_recommended: boolean;
}

export interface BackendCompressionAuditReport {
  total_files_analyzed: number;
  compressible_files_count: number;
  total_original_bytes: number;
  total_original_mb: number;
  total_estimated_compressed_bytes: number;
  total_estimated_compressed_mb: number;
  total_estimated_savings_bytes: number;
  total_estimated_savings_mb: number;
  overall_estimated_savings_percentage: number;
  recommendations: BackendFileCompressionAdvice[];
}

export interface BackendTierTransitionAdvice {
  file_id: number;
  filename: string;
  category: string;
  file_size_bytes: number;
  file_size_mb: number;
  current_tier: string;
  recommended_tier: string;
  days_since_last_access: number;
  current_monthly_cost: number;
  recommended_monthly_cost: number;
  projected_monthly_savings: number;
  projected_savings_percentage: number;
  reason: string;
}

export interface BackendTierLifecycleReport {
  total_files_analyzed: number;
  candidates_count: number;
  projected_current_monthly_spend: number;
  projected_optimized_monthly_spend: number;
  total_projected_monthly_savings: number;
  overall_projected_savings_percentage: number;
  recommendations: BackendTierTransitionAdvice[];
}

export interface BackendTierResponse {
  id: string;
  name: string;
  description: string | null;
  storage_cost_per_gb: number;
  retrieval_cost_per_gb: number;
  minimum_retention_days: number;
}

export interface BackendPricingEstimate {
  size_gb: number;
  months: number;
  retrieval_gb: number;
  comparison: Record<
    string,
    {
      tier_name: string;
      storage_cost_per_gb_month: number;
      retrieval_cost_per_gb: number;
      estimated_total_cost_usd: number;
    }
  >;
}

// ==========================================
// HTTP Request Client
// ==========================================

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`API Error ${status}: ${detail}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Set Content-Type to JSON only if not multipart/form-data
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.detail) {
        detail = typeof errorJson.detail === 'string' 
          ? errorJson.detail 
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Body not JSON
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

// ==========================================
// NEXUS API Service Methods
// ==========================================

export const nexusApi = {
  /**
   * Health check probe
   */
  async checkHealth(): Promise<{ status: string }> {
    const healthUrl = API_BASE_URL.startsWith('http')
      ? `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/health`
      : '/health';
    const res = await fetch(healthUrl);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  // --- Analytics & Dashboard ---
  /**
   * GET /api/v1/analytics/overview
   */
  async getStorageOverview(): Promise<BackendStorageOverview> {
    return request<BackendStorageOverview>('/analytics/overview');
  },

  /**
   * GET /api/v1/analytics/dashboard
   */
  async getStorageDashboard(): Promise<BackendStorageDashboard> {
    return request<BackendStorageDashboard>('/analytics/dashboard');
  },

  /**
   * GET /api/v1/analytics/categories
   */
  async getCategoryDistribution(): Promise<BackendCategoryDistribution[]> {
    return request<BackendCategoryDistribution[]>('/analytics/categories');
  },

  /**
   * GET /api/v1/analytics/tiers
   */
  async getTierDistribution(): Promise<BackendTierDistribution[]> {
    return request<BackendTierDistribution[]>('/analytics/tiers');
  },

  /**
   * GET /api/v1/analytics/brackets
   */
  async getSizeBrackets(): Promise<BackendSizeBracket[]> {
    return request<BackendSizeBracket[]>('/analytics/brackets');
  },

  // --- Optimization & ROI ---
  /**
   * GET /api/v1/optimizer/roi
   */
  async getOptimizationRoi(): Promise<BackendOptimizationRoi> {
    return request<BackendOptimizationRoi>('/optimizer/roi');
  },

  /**
   * GET /api/v1/optimizer/duplicates
   */
  async auditDuplicates(): Promise<BackendDuplicateAuditReport> {
    return request<BackendDuplicateAuditReport>('/optimizer/duplicates');
  },

  /**
   * POST /api/v1/optimizer/duplicates/resync
   */
  async resyncDuplicates(): Promise<{ message: string; records_updated: number }> {
    return request<{ message: string; records_updated: number }>('/optimizer/duplicates/resync', {
      method: 'POST',
    });
  },

  /**
   * GET /api/v1/optimizer/compression
   */
  async auditCompression(): Promise<BackendCompressionAuditReport> {
    return request<BackendCompressionAuditReport>('/optimizer/compression');
  },

  /**
   * GET /api/v1/optimizer/lifecycle
   */
  async auditLifecycle(): Promise<BackendTierLifecycleReport> {
    return request<BackendTierLifecycleReport>('/optimizer/lifecycle');
  },

  // --- File Management ---
  /**
   * GET /api/v1/files
   */
  async listFiles(params?: {
    category?: string;
    tier?: string;
    is_duplicate?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<BackendFileListResponse> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.tier) query.set('tier', params.tier);
    if (params?.is_duplicate !== undefined) query.set('is_duplicate', String(params.is_duplicate));
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const queryString = query.toString();
    const endpoint = `/files${queryString ? `?${queryString}` : ''}`;
    return request<BackendFileListResponse>(endpoint);
  },

  /**
   * GET /api/v1/files/{id}
   */
  async getFile(fileId: number): Promise<BackendFileMetadata> {
    return request<BackendFileMetadata>(`/files/${fileId}`);
  },

  /**
   * PATCH /api/v1/files/{id}/tier
   */
  async updateFileTier(fileId: number, newTier: string): Promise<BackendFileMetadata> {
    return request<BackendFileMetadata>(`/files/${fileId}/tier`, {
      method: 'PATCH',
      body: JSON.stringify({ new_tier: newTier }),
    });
  },

  /**
   * DELETE /api/v1/files/{id}
   */
  async deleteFile(fileId: number): Promise<{ message: string; file_id: number }> {
    return request<{ message: string; file_id: number }>(`/files/${fileId}`, {
      method: 'DELETE',
    });
  },

  /**
   * POST /api/v1/files/upload
   */
  async uploadFile(file: File, tier: string = 'HOT'): Promise<BackendFileMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('storage_tier', tier);

    return request<BackendFileMetadata>('/files/upload', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * POST /api/v1/files/upload/batch
   */
  async uploadBatchFiles(files: File[], tier: string = 'HOT'): Promise<BackendFileMetadata[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    formData.append('storage_tier', tier);

    return request<BackendFileMetadata[]>('/files/upload/batch', {
      method: 'POST',
      body: formData,
    });
  },

  // --- Storage Tiers ---
  /**
   * GET /api/v1/tiers
   */
  async getTiers(): Promise<BackendTierResponse[]> {
    return request<BackendTierResponse[]>('/tiers');
  },

  /**
   * GET /api/v1/tiers/{tier_id}
   */
  async getTier(tierId: string): Promise<BackendTierResponse> {
    return request<BackendTierResponse>(`/tiers/${tierId}`);
  },

  /**
   * GET /api/v1/tiers/pricing/estimate
   */
  async estimatePricing(
    sizeGb: number,
    months: number = 1.0,
    retrievalGb: number = 0.0
  ): Promise<BackendPricingEstimate> {
    const query = new URLSearchParams({
      size_gb: String(sizeGb),
      months: String(months),
      retrieval_gb: String(retrievalGb),
    });
    return request<BackendPricingEstimate>(`/tiers/pricing/estimate?${query.toString()}`);
  },
};
