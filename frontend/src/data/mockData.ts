import { 
  StorageFile, 
  OverviewMetrics, 
  CategoryMetric, 
  TierMetric, 
  DuplicateGroup, 
  CompressionCandidate, 
  TierRecommendation, 
  RecentActivity 
} from '../types';

export const TIER_RATES = {
  HOT: 0.023,      // $0.023 per GB/mo
  WARM: 0.0125,    // $0.0125 per GB/mo
  COLD: 0.004,     // $0.004 per GB/mo
  ARCHIVE: 0.00099 // $0.00099 per GB/mo
};

export const TIER_RETRIEVAL_RATES = {
  HOT: 0.000,   // $0.000 per GB
  WARM: 0.010,  // $0.010 per GB
  COLD: 0.030,  // $0.030 per GB
  ARCHIVE: 0.050 // $0.050 per GB
};

export const MOCK_FILES: StorageFile[] = [
  {
    id: 'f-101',
    filename: 'production_database_backup_2026_q1.sql',
    file_size: 14859000000, // 14.85 GB
    mime_type: 'application/sql',
    category: 'Data',
    storage_tier: 'HOT',
    sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2026-08-12T10:15:30Z',
    last_accessed_at: '2026-08-14T11:00:00Z',
    inactivity_days: 93,
  },
  {
    id: 'f-102',
    filename: 'production_database_backup_2026_q1_copy.sql',
    file_size: 14859000000, // 14.85 GB (duplicate of f-101)
    mime_type: 'application/sql',
    category: 'Data',
    storage_tier: 'HOT',
    sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    is_duplicate: true,
    original_file_id: 'f-101',
    created_at: '2026-08-15T14:30:00Z',
    last_accessed_at: '2026-08-15T14:30:00Z',
    inactivity_days: 92,
  },
  {
    id: 'f-103',
    filename: 'api_gateway_access_logs_2026_09.log',
    file_size: 6420000000, // 6.42 GB
    mime_type: 'text/plain',
    category: 'Document',
    storage_tier: 'HOT',
    sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2026-09-01T00:00:00Z',
    last_accessed_at: '2026-09-05T08:20:00Z',
    inactivity_days: 71,
  },
  {
    id: 'f-104',
    filename: 'nexus_product_keynote_2026_4k.mp4',
    file_size: 28400000000, // 28.4 GB
    mime_type: 'video/mp4',
    category: 'Video',
    storage_tier: 'HOT',
    sha256_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2026-10-01T12:00:00Z',
    last_accessed_at: '2026-11-10T16:45:00Z',
    inactivity_days: 5,
  },
  {
    id: 'f-105',
    filename: 'nexus_product_keynote_2026_backup.mp4',
    file_size: 28400000000, // 28.4 GB (duplicate of f-104)
    mime_type: 'video/mp4',
    category: 'Video',
    storage_tier: 'HOT',
    sha256_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    is_duplicate: true,
    original_file_id: 'f-104',
    created_at: '2026-10-02T09:12:00Z',
    last_accessed_at: '2026-10-02T09:12:00Z',
    inactivity_days: 44,
  },
  {
    id: 'f-106',
    filename: 'customer_analytics_export_2025.csv',
    file_size: 4200000000, // 4.2 GB
    mime_type: 'text/csv',
    category: 'Data',
    storage_tier: 'HOT',
    sha256_hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2025-11-20T10:00:00Z',
    last_accessed_at: '2025-11-22T14:10:00Z',
    inactivity_days: 358,
  },
  {
    id: 'f-107',
    filename: 'customer_analytics_export_2025_duplicate.csv',
    file_size: 4200000000, // 4.2 GB (duplicate of f-106)
    mime_type: 'text/csv',
    category: 'Data',
    storage_tier: 'HOT',
    sha256_hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    is_duplicate: true,
    original_file_id: 'f-106',
    created_at: '2025-12-05T08:00:00Z',
    last_accessed_at: '2025-12-05T08:00:00Z',
    inactivity_days: 345,
  },
  {
    id: 'f-108',
    filename: 'kubernetes_audit_traces_2025_q3.json',
    file_size: 8900000000, // 8.9 GB
    mime_type: 'application/json',
    category: 'Code',
    storage_tier: 'WARM',
    sha256_hash: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2025-10-10T16:00:00Z',
    last_accessed_at: '2025-11-01T09:30:00Z',
    inactivity_days: 379,
  },
  {
    id: 'f-109',
    filename: 'enterprise_contract_agreements_master.pdf',
    file_size: 850000000, // 850 MB
    mime_type: 'application/pdf',
    category: 'Document',
    storage_tier: 'HOT',
    sha256_hash: '7d793037a0760186574b0282f2f435e7b1e50774690f473b26c0032b4b3b89e6',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2026-09-18T11:20:00Z',
    last_accessed_at: '2026-11-12T10:00:00Z',
    inactivity_days: 3,
  },
  {
    id: 'f-110',
    filename: 'enterprise_contract_agreements_scan.pdf',
    file_size: 850000000, // 850 MB (duplicate of f-109)
    mime_type: 'application/pdf',
    category: 'Document',
    storage_tier: 'WARM',
    sha256_hash: '7d793037a0760186574b0282f2f435e7b1e50774690f473b26c0032b4b3b89e6',
    is_duplicate: true,
    original_file_id: 'f-109',
    created_at: '2026-09-20T15:10:00Z',
    last_accessed_at: '2026-09-20T15:10:00Z',
    inactivity_days: 56,
  },
  {
    id: 'f-111',
    filename: 'ml_training_weights_v4.tar.gz',
    file_size: 42500000000, // 42.5 GB
    mime_type: 'application/gzip',
    category: 'Archive',
    storage_tier: 'COLD',
    sha256_hash: '8f434346648f6b96df89dda901c5176b10e6d0ceec3e4a8cb2cfe7b1c43105ff',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2026-05-10T12:00:00Z',
    last_accessed_at: '2026-06-01T15:00:00Z',
    inactivity_days: 167,
  },
  {
    id: 'f-112',
    filename: 'legal_compliance_records_2024.zip',
    file_size: 78000000000, // 78 GB
    mime_type: 'application/zip',
    category: 'Archive',
    storage_tier: 'ARCHIVE',
    sha256_hash: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2024-12-15T09:00:00Z',
    last_accessed_at: '2025-01-10T11:00:00Z',
    inactivity_days: 674,
  },
  {
    id: 'f-113',
    filename: 'design_brand_assets_vector_bundle.ai',
    file_size: 3400000000, // 3.4 GB
    mime_type: 'application/illustrator',
    category: 'Image',
    storage_tier: 'HOT',
    sha256_hash: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2026-08-01T10:00:00Z',
    last_accessed_at: '2026-09-15T12:30:00Z',
    inactivity_days: 61,
  },
  {
    id: 'f-114',
    filename: 'financial_ledger_records_2023_audited.xlsx',
    file_size: 2100000000, // 2.1 GB
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'Document',
    storage_tier: 'HOT',
    sha256_hash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2024-03-10T08:00:00Z',
    last_accessed_at: '2024-04-01T10:00:00Z',
    inactivity_days: 593,
  },
  {
    id: 'f-115',
    filename: 'system_telemetry_dump_october.log',
    file_size: 5120000000, // 5.12 GB
    mime_type: 'text/plain',
    category: 'Document',
    storage_tier: 'HOT',
    sha256_hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    is_duplicate: false,
    original_file_id: null,
    created_at: '2026-10-31T23:59:00Z',
    last_accessed_at: '2026-11-01T06:00:00Z',
    inactivity_days: 14,
  }
];

export const MOCK_METRICS: OverviewMetrics = {
  total_files: 14820,
  total_bytes: 1425600000000, // ~1.425 TB
  duplicate_files_count: 1840,
  duplicate_bytes: 312400000000, // ~312.4 GB
  current_monthly_spend: 986.50,
  projected_monthly_spend: 542.20,
  projected_monthly_savings: 444.30,
  savings_percentage: 45.0,
  compressible_files_count: 4210,
  compression_savings_bytes: 284500000000, // ~284.5 GB
  tier_recommendations_count: 3650,
  tier_savings_monthly: 298.40,
  optimization_health_score: 79,
};

export const MOCK_CATEGORY_METRICS: CategoryMetric[] = [
  { category: 'Data', file_count: 3120, total_bytes: 420000000000, percentage: 29.5, color: '#3b82f6' },
  { category: 'Archive', file_count: 850, total_bytes: 380000000000, percentage: 26.6, color: '#8b5cf6' },
  { category: 'Video', file_count: 410, total_bytes: 295000000000, percentage: 20.7, color: '#ec4899' },
  { category: 'Document', file_count: 5240, total_bytes: 165000000000, percentage: 11.6, color: '#10b981' },
  { category: 'Code', file_count: 2900, total_bytes: 98000000000, percentage: 6.9, color: '#f59e0b' },
  { category: 'Image', file_count: 1800, total_bytes: 52000000000, percentage: 3.6, color: '#06b6d4' },
  { category: 'Other', file_count: 500, total_bytes: 15600000000, percentage: 1.1, color: '#64748b' },
];

export const MOCK_TIER_METRICS: TierMetric[] = [
  { tier: 'HOT', file_count: 7850, total_bytes: 780000000000, monthly_cost: 624.00, percentage: 54.7, color: '#ef4444' },
  { tier: 'WARM', file_count: 3240, total_bytes: 310000000000, monthly_cost: 172.50, percentage: 21.7, color: '#f59e0b' },
  { tier: 'COLD', file_count: 2210, total_bytes: 215000000000, monthly_cost: 118.00, percentage: 15.1, color: '#0284c7' },
  { tier: 'ARCHIVE', file_count: 1520, total_bytes: 120600000000, monthly_cost: 72.00, percentage: 8.5, color: '#7c3aed' },
];

export const MOCK_DUPLICATE_GROUPS: DuplicateGroup[] = [
  {
    hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    original_file: MOCK_FILES[3],
    duplicates: [MOCK_FILES[4]],
    total_wasted_bytes: 28400000000, // 28.4 GB
    count: 2,
  },
  {
    hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    original_file: MOCK_FILES[0],
    duplicates: [MOCK_FILES[1]],
    total_wasted_bytes: 14859000000, // 14.85 GB
    count: 2,
  },
  {
    hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    original_file: MOCK_FILES[5],
    duplicates: [MOCK_FILES[6]],
    total_wasted_bytes: 4200000000, // 4.2 GB
    count: 2,
  },
  {
    hash: '7d793037a0760186574b0282f2f435e7b1e50774690f473b26c0032b4b3b89e6',
    original_file: MOCK_FILES[8],
    duplicates: [MOCK_FILES[9]],
    total_wasted_bytes: 850000000, // 850 MB
    count: 2,
  }
];

export const MOCK_COMPRESSION_CANDIDATES: CompressionCandidate[] = [
  {
    file: MOCK_FILES[0], // production_database_backup_2026_q1.sql
    compressible: true,
    estimated_ratio: 0.25, // 75% savings
    estimated_compressed_bytes: 3714750000,
    estimated_saved_bytes: 11144250000,
    recommended_algorithm: 'Zstandard',
  },
  {
    file: MOCK_FILES[2], // api_gateway_access_logs_2026_09.log
    compressible: true,
    estimated_ratio: 0.30, // 70% savings
    estimated_compressed_bytes: 1926000000,
    estimated_saved_bytes: 4494000000,
    recommended_algorithm: 'Gzip',
  },
  {
    file: MOCK_FILES[5], // customer_analytics_export_2025.csv
    compressible: true,
    estimated_ratio: 0.28, // 72% savings
    estimated_compressed_bytes: 1176000000,
    estimated_saved_bytes: 3024000000,
    recommended_algorithm: 'Brotli',
  },
  {
    file: MOCK_FILES[7], // kubernetes_audit_traces_2025_q3.json
    compressible: true,
    estimated_ratio: 0.32, // 68% savings
    estimated_compressed_bytes: 2848000000,
    estimated_saved_bytes: 6052000000,
    recommended_algorithm: 'Zstandard',
  },
  {
    file: MOCK_FILES[14], // system_telemetry_dump_october.log
    compressible: true,
    estimated_ratio: 0.28, // 72% savings
    estimated_compressed_bytes: 1433600000,
    estimated_saved_bytes: 3686400000,
    recommended_algorithm: 'Gzip',
  }
];

export const MOCK_TIER_RECOMMENDATIONS: TierRecommendation[] = [
  {
    file: MOCK_FILES[0], // SQL backup, 93 days inactive
    current_tier: 'HOT',
    recommended_tier: 'COLD',
    inactivity_days: 93,
    current_monthly_cost: (14.859 * TIER_RATES.HOT),
    recommended_monthly_cost: (14.859 * TIER_RATES.COLD),
    projected_monthly_savings: (14.859 * (TIER_RATES.HOT - TIER_RATES.COLD)),
    reason: 'Zero read access in 93 days (>90d threshold). Safe for COLD storage migration.',
  },
  {
    file: MOCK_FILES[2], // Access logs, 71 days inactive
    current_tier: 'HOT',
    recommended_tier: 'WARM',
    inactivity_days: 71,
    current_monthly_cost: (6.42 * TIER_RATES.HOT),
    recommended_monthly_cost: (6.42 * TIER_RATES.WARM),
    projected_monthly_savings: (6.42 * (TIER_RATES.HOT - TIER_RATES.WARM)),
    reason: 'Inactive for 71 days (>30d threshold). High savings with WARM tier.',
  },
  {
    file: MOCK_FILES[5], // Customer analytics 2025, 358 days inactive
    current_tier: 'HOT',
    recommended_tier: 'ARCHIVE',
    inactivity_days: 358,
    current_monthly_cost: (4.2 * TIER_RATES.HOT),
    recommended_monthly_cost: (4.2 * TIER_RATES.ARCHIVE),
    projected_monthly_savings: (4.2 * (TIER_RATES.HOT - TIER_RATES.ARCHIVE)),
    reason: 'Inactive for nearly 1 year (>350d threshold). Transition to Glacier ARCHIVE recommended.',
  },
  {
    file: MOCK_FILES[7], // K8s traces, 379 days inactive, currently WARM
    current_tier: 'WARM',
    recommended_tier: 'ARCHIVE',
    inactivity_days: 379,
    current_monthly_cost: (8.9 * TIER_RATES.WARM),
    recommended_monthly_cost: (8.9 * TIER_RATES.ARCHIVE),
    projected_monthly_savings: (8.9 * (TIER_RATES.WARM - TIER_RATES.ARCHIVE)),
    reason: 'Exceeded 365 days of dormancy. Transition from WARM to ARCHIVE will save 92%.',
  },
  {
    file: MOCK_FILES[12], // Brand assets, 61 days inactive
    current_tier: 'HOT',
    recommended_tier: 'WARM',
    inactivity_days: 61,
    current_monthly_cost: (3.4 * TIER_RATES.HOT),
    recommended_monthly_cost: (3.4 * TIER_RATES.WARM),
    projected_monthly_savings: (3.4 * (TIER_RATES.HOT - TIER_RATES.WARM)),
    reason: 'Static design vector assets unaccessed for 2 months.',
  },
  {
    file: MOCK_FILES[13], // Financial ledger 2023, 593 days inactive
    current_tier: 'HOT',
    recommended_tier: 'ARCHIVE',
    inactivity_days: 593,
    current_monthly_cost: (2.1 * TIER_RATES.HOT),
    recommended_monthly_cost: (2.1 * TIER_RATES.ARCHIVE),
    projected_monthly_savings: (2.1 * (TIER_RATES.HOT - TIER_RATES.ARCHIVE)),
    reason: 'Historical ledger audit completed >18 months ago. Highly recommended for ARCHIVE.',
  }
];

export const MOCK_ACTIVITIES: RecentActivity[] = [
  {
    id: 'act-1',
    type: 'dedup',
    title: 'Duplicate Cluster Detected',
    description: 'Found exact SHA-256 match for nexus_product_keynote_2026.mp4 (28.4 GB redundant)',
    timestamp: '12 minutes ago',
    savings: '+$7.84/mo',
    status: 'suggested',
  },
  {
    id: 'act-2',
    type: 'tier_migration',
    title: 'Storage Tier Migration Simulated',
    description: 'Migrated 3.8 GB telemetry logs from HOT to WARM storage tier',
    timestamp: '45 minutes ago',
    savings: '+$1.42/mo',
    status: 'completed',
  },
  {
    id: 'act-3',
    type: 'upload',
    title: 'New Storage Blob Ingested',
    description: 'Uploaded system_telemetry_dump_october.log (5.12 GB) - Auto-analyzed',
    timestamp: '2 hours ago',
    status: 'completed',
  },
  {
    id: 'act-4',
    type: 'compress',
    title: 'Compression Evaluation Completed',
    description: 'Database SQL dump evaluated for Zstandard compression (75% recoverable)',
    timestamp: '5 hours ago',
    savings: '11.1 GB space',
    status: 'suggested',
  },
  {
    id: 'act-5',
    type: 'scan',
    title: 'Scheduled Cloud Estate Scan',
    description: 'Scanned 14,820 objects across US-East-1 simulated bucket',
    timestamp: 'Yesterday at 23:00',
    status: 'completed',
  }
];

export const MOCK_INELIGIBLE_FILES = [
  {
    file: MOCK_FILES[3], // keynote 4k mp4
    reason: 'Pre-compressed container (H.264/AAC codec). High entropy format yields 0% byte reduction.',
    detected_format: 'MPEG-4 Video (.mp4)',
  },
  {
    file: MOCK_FILES[10], // ml weights tar.gz
    reason: 'Pre-compressed Gzip stream. Re-compressing incurs high CPU overhead with <0.5% gain.',
    detected_format: 'Gzip Archive (.tar.gz)',
  },
  {
    file: MOCK_FILES[11], // legal compliance zip
    reason: 'Standard Deflate compression already applied at archive creation.',
    detected_format: 'ZIP Archive (.zip)',
  },
  {
    file: MOCK_FILES[12], // design brand assets .ai
    reason: 'Contains embedded compressed raster and vector PDF stream data.',
    detected_format: 'Adobe Illustrator (.ai)',
  },
];

export const MOCK_HISTORICAL_COSTS_BY_RANGE = {
  '30D': [
    { month: 'Week 1', baseline: 950, optimized: 580 },
    { month: 'Week 2', baseline: 965, optimized: 565 },
    { month: 'Week 3', baseline: 975, optimized: 550 },
    { month: 'Week 4 (Now)', baseline: 986, optimized: 542 },
  ],
  '90D': [
    { month: 'September', baseline: 940, optimized: 680 },
    { month: 'October', baseline: 965, optimized: 590 },
    { month: 'November (Now)', baseline: 986, optimized: 542 },
  ],
  '6M': [
    { month: 'Jun', baseline: 820, optimized: 820 },
    { month: 'Jul', baseline: 865, optimized: 840 },
    { month: 'Aug', baseline: 910, optimized: 750 },
    { month: 'Sep', baseline: 940, optimized: 680 },
    { month: 'Oct', baseline: 965, optimized: 590 },
    { month: 'Nov (Now)', baseline: 986, optimized: 542 },
  ],
  '1Y': [
    { month: 'Dec 25', baseline: 710, optimized: 710 },
    { month: 'Jan', baseline: 730, optimized: 730 },
    { month: 'Feb', baseline: 755, optimized: 740 },
    { month: 'Mar', baseline: 770, optimized: 750 },
    { month: 'Apr', baseline: 790, optimized: 760 },
    { month: 'May', baseline: 805, optimized: 780 },
    { month: 'Jun', baseline: 820, optimized: 820 },
    { month: 'Jul', baseline: 865, optimized: 840 },
    { month: 'Aug', baseline: 910, optimized: 750 },
    { month: 'Sep', baseline: 940, optimized: 680 },
    { month: 'Oct', baseline: 965, optimized: 590 },
    { month: 'Nov (Now)', baseline: 986, optimized: 542 },
  ],
};

export const MOCK_HISTORICAL_COSTS = [
  { month: 'Jun', baseline: 820, optimized: 820 },
  { month: 'Jul', baseline: 865, optimized: 840 },
  { month: 'Aug', baseline: 910, optimized: 750 },
  { month: 'Sep', baseline: 940, optimized: 680 },
  { month: 'Oct', baseline: 965, optimized: 590 },
  { month: 'Nov (Current)', baseline: 986, optimized: 542 },
];

export const MOCK_SIZE_BRACKETS = [
  { bracket: 'Tiny (<100KB)', count: 6420, total_gb: 0.42, color: '#94a3b8' },
  { bracket: 'Small (100KB-1MB)', count: 4890, total_gb: 2.85, color: '#38bdf8' },
  { bracket: 'Medium (1MB-10MB)', count: 2150, total_gb: 12.4, color: '#3b82f6' },
  { bracket: 'Large (10MB-100MB)', count: 870, total_gb: 48.9, color: '#6366f1' },
  { bracket: 'Huge (>100MB)', count: 490, total_gb: 1361.03, color: '#8b5cf6' },
];

// Utility Helpers
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
