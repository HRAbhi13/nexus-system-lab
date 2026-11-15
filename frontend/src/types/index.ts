export type StorageTier = 'HOT' | 'WARM' | 'COLD' | 'ARCHIVE';

export type FileCategory = 
  | 'Document' 
  | 'Image' 
  | 'Video' 
  | 'Audio' 
  | 'Archive' 
  | 'Code' 
  | 'Data' 
  | 'Other';

export interface StorageFile {
  id: string;
  filename: string;
  file_size: number; // in bytes
  mime_type: string;
  category: FileCategory;
  storage_tier: StorageTier;
  sha256_hash: string;
  is_duplicate: boolean;
  original_file_id?: string | null;
  created_at: string;
  last_accessed_at: string;
  inactivity_days: number;
}

export interface DuplicateGroup {
  hash: string;
  original_file: StorageFile;
  duplicates: StorageFile[];
  total_wasted_bytes: number;
  count: number;
}

export interface CompressionCandidate {
  file: StorageFile;
  compressible: boolean;
  estimated_ratio: number; // e.g. 0.3 means compresses to 30% of original
  estimated_compressed_bytes: number;
  estimated_saved_bytes: number;
  recommended_algorithm: 'Gzip' | 'Zstandard' | 'Brotli';
}

export interface TierRecommendation {
  file: StorageFile;
  current_tier: StorageTier;
  recommended_tier: StorageTier;
  inactivity_days: number;
  current_monthly_cost: number;
  recommended_monthly_cost: number;
  projected_monthly_savings: number;
  reason: string;
}

export interface OverviewMetrics {
  total_files: number;
  total_bytes: number;
  duplicate_files_count: number;
  duplicate_bytes: number;
  current_monthly_spend: number;
  projected_monthly_spend: number;
  projected_monthly_savings: number;
  savings_percentage: number;
  compressible_files_count: number;
  compression_savings_bytes: number;
  tier_recommendations_count: number;
  tier_savings_monthly: number;
  optimization_health_score: number;
}

export interface RecentActivity {
  id: string;
  type: 'upload' | 'dedup' | 'compress' | 'tier_migration' | 'scan';
  title: string;
  description: string;
  timestamp: string;
  savings?: string;
  status: 'completed' | 'suggested' | 'running';
}

export interface CategoryMetric {
  category: FileCategory;
  file_count: number;
  total_bytes: number;
  percentage: number;
  color: string;
}

export interface TierMetric {
  tier: StorageTier;
  file_count: number;
  total_bytes: number;
  monthly_cost: number;
  percentage: number;
  color: string;
}

export type TimeRange = '30D' | '90D' | '6M' | '1Y';

export interface IneligibleFile {
  file: StorageFile;
  reason: string;
  detected_format: string;
}

export type SortField = 'filename' | 'category' | 'file_size' | 'storage_tier' | 'inactivity_days';
export type SortDirection = 'asc' | 'desc';

export type ActiveNavTab = 
  | 'overview' 
  | 'files' 
  | 'duplicates' 
  | 'compression' 
  | 'optimizer' 
  | 'analytics' 
  | 'settings';
