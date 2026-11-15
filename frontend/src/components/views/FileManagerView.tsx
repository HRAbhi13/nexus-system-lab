import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, 
  Upload, 
  Trash2, 
  Eye, 
  Copy, 
  FileText,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { StorageFile, FileCategory, StorageTier, SortField, SortDirection } from '../../types';
import { TierBadge } from '../common/TierBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { FileDetailsModal } from '../common/FileDetailsModal';
import { formatBytes } from '../../data/mockData';
import { nexusApi, BackendFileMetadata } from '../../services/api';

interface FileManagerViewProps {
  files?: StorageFile[];
  onOpenUpload: () => void;
  onDeleteFile?: (fileId: string) => void;
  onMigrateTier?: (fileId: string, newTier: StorageTier) => void;
  onBatchDeleteFiles?: (fileIds: string[]) => void;
  onBatchMigrateTier?: (fileIds: string[], newTier: StorageTier) => void;
}

/**
 * Maps BackendFileMetadata from FastAPI response to frontend StorageFile type
 */
const mapBackendFileToStorageFile = (bf: BackendFileMetadata): StorageFile => {
  let inactivityDays = 0;
  if (bf.last_accessed_timestamp) {
    const lastAccessTime = new Date(bf.last_accessed_timestamp).getTime();
    if (!isNaN(lastAccessTime)) {
      inactivityDays = Math.max(0, Math.floor((Date.now() - lastAccessTime) / (1000 * 60 * 60 * 24)));
    }
  }

  const validCategories: FileCategory[] = [
    'Document', 'Image', 'Video', 'Audio', 'Archive', 'Code', 'Data', 'Other'
  ];
  const matchedCategory = validCategories.find(
    (c) => c.toLowerCase() === (bf.category || '').toLowerCase()
  ) || 'Other';

  const validTiers: StorageTier[] = ['HOT', 'WARM', 'COLD', 'ARCHIVE'];
  const upperTier = (bf.storage_tier || 'HOT').toUpperCase();
  const matchedTier: StorageTier = validTiers.includes(upperTier as StorageTier)
    ? (upperTier as StorageTier)
    : 'HOT';

  return {
    id: String(bf.id),
    filename: bf.filename,
    file_size: bf.file_size_bytes,
    mime_type: bf.mime_type || 'application/octet-stream',
    category: matchedCategory,
    storage_tier: matchedTier,
    sha256_hash: bf.sha256_hash,
    is_duplicate: Boolean(bf.is_duplicate),
    original_file_id: bf.original_file_id ? String(bf.original_file_id) : null,
    created_at: bf.upload_timestamp,
    last_accessed_at: bf.last_accessed_timestamp,
    inactivity_days: inactivityDays,
  };
};

export const FileManagerView: React.FC<FileManagerViewProps> = ({
  files: _propFiles,
  onOpenUpload,
  onDeleteFile,
  onMigrateTier,
  onBatchDeleteFiles,
  onBatchMigrateTier,
}): React.ReactElement => {
  // Live backend data state
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState<boolean>(false);
  const [selectedFileForModal, setSelectedFileForModal] = useState<StorageFile | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('inactivity_days');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const categories: (FileCategory | 'ALL')[] = [
    'ALL',
    'Document',
    'Data',
    'Video',
    'Archive',
    'Code',
    'Image',
    'Other'
  ];

  // Fetch actual files from GET /api/v1/files
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await nexusApi.listFiles();
      const mapped = (response.files || []).map(mapBackendFileToStorageFile);
      setFiles(mapped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve storage objects from FastAPI backend.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedTier('ALL');
    setShowDuplicatesOnly(false);
    setCurrentPage(1);
  };

  // Actions with Backend Integration
  const handleDeleteFile = async (fileId: string) => {
    const numId = Number(fileId);
    if (!isNaN(numId)) {
      try {
        await nexusApi.deleteFile(numId);
      } catch (err: unknown) {
        console.error('Delete request failed:', err);
      }
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setSelectedIds((prev) => prev.filter((id) => id !== fileId));
    onDeleteFile?.(fileId);
  };

  const handleMigrateTier = async (fileId: string, newTier: StorageTier) => {
    const numId = Number(fileId);
    if (!isNaN(numId)) {
      try {
        await nexusApi.updateFileTier(numId, newTier);
      } catch (err: unknown) {
        console.error('Tier update request failed:', err);
      }
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, storage_tier: newTier } : f))
    );
    onMigrateTier?.(fileId, newTier);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const numId = Number(id);
          return !isNaN(numId) ? nexusApi.deleteFile(numId) : Promise.resolve();
        })
      );
    } catch (err: unknown) {
      console.error('Batch delete request failed:', err);
    }
    setFiles((prev) => prev.filter((f) => !selectedIds.includes(f.id)));
    onBatchDeleteFiles?.(selectedIds);
    setSelectedIds([]);
  };

  const handleBatchMigrate = async (newTier: StorageTier) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const numId = Number(id);
          return !isNaN(numId) ? nexusApi.updateFileTier(numId, newTier) : Promise.resolve();
        })
      );
    } catch (err: unknown) {
      console.error('Batch tier migration failed:', err);
    }
    setFiles((prev) =>
      prev.map((f) => (selectedIds.includes(f.id) ? { ...f, storage_tier: newTier } : f))
    );
    onBatchMigrateTier?.(selectedIds, newTier);
    setSelectedIds([]);
  };

  // Filter & Sort Pipeline
  const filteredAndSortedFiles = useMemo(() => {
    const result = files.filter((f) => {
      const matchesSearch = 
        f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.sha256_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.mime_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchesTier = selectedTier === 'ALL' || f.storage_tier === selectedTier;
      const matchesDuplicates = !showDuplicatesOnly || f.is_duplicate;

      return matchesSearch && matchesCategory && matchesTier && matchesDuplicates;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'filename') {
        comparison = a.filename.localeCompare(b.filename);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'file_size') {
        comparison = a.file_size - b.file_size;
      } else if (sortField === 'storage_tier') {
        comparison = a.storage_tier.localeCompare(b.storage_tier);
      } else if (sortField === 'inactivity_days') {
        comparison = a.inactivity_days - b.inactivity_days;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, searchTerm, selectedCategory, selectedTier, showDuplicatesOnly, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = filteredAndSortedFiles.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedFiles.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedFiles, currentPage, pageSize]);

  const totalFilteredSize = useMemo(() => {
    return filteredAndSortedFiles.reduce((acc, f) => acc + f.file_size, 0);
  }, [filteredAndSortedFiles]);

  const selectedTotalSize = useMemo(() => {
    return files
      .filter((f) => selectedIds.includes(f.id))
      .reduce((acc, f) => acc + f.file_size, 0);
  }, [files, selectedIds]);

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentIds = paginatedFiles.map((f) => f.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...currentIds])));
    } else {
      const currentIds = paginatedFiles.map((f) => f.id);
      setSelectedIds(selectedIds.filter((id) => !currentIds.includes(id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const isCurrentPageAllSelected = paginatedFiles.length > 0 && paginatedFiles.every((f) => selectedIds.includes(f.id));

  // Sort Icon Renderer
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600 ml-1 inline" /> 
      : <ArrowDown className="w-3 h-3 text-blue-600 ml-1 inline" />;
  };

  return (
    <div className="space-y-5">
      {/* Error State Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">Backend Connection Error</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              <p className="text-[11px] text-rose-500 mt-1">
                Please verify that the FastAPI backend server is running at <code className="font-mono bg-rose-100/60 px-1 py-0.5 rounded">http://127.0.0.1:8000</code>.
              </p>
            </div>
          </div>
          <button
            onClick={fetchFiles}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="nexus-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by filename, extension, or SHA-256 hash..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Tier Filter, Duplicates Toggle, Sync & Ingest Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            >
              <option value="ALL">All Storage Tiers</option>
              <option value="HOT">HOT Tier ($0.023/GB)</option>
              <option value="WARM">WARM Tier ($0.0125/GB)</option>
              <option value="COLD">COLD Tier ($0.004/GB)</option>
              <option value="ARCHIVE">ARCHIVE Tier ($0.00099/GB)</option>
            </select>

            <button
              onClick={() => {
                setShowDuplicatesOnly(!showDuplicatesOnly);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showDuplicatesOnly 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Duplicates Only
            </button>

            <button
              onClick={fetchFiles}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition-all disabled:opacity-50"
              title="Sync with FastAPI backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all shadow-blue-600/20"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest Object</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Batch Action Bar (Visible when files selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-lg border border-slate-800 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-[11px]">
              {selectedIds.length}
            </span>
            <span className="font-semibold">{selectedIds.length} {selectedIds.length === 1 ? 'object' : 'objects'} selected</span>
            <span className="text-slate-400 font-mono">({formatBytes(selectedTotalSize)})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Migrate Tier:</span>
            {(['HOT', 'WARM', 'COLD', 'ARCHIVE'] as StorageTier[]).map((t) => (
              <button
                key={t}
                onClick={() => handleBatchMigrate(t)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
              >
                {t}
              </button>
            ))}

            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors ml-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Showing <span className="font-semibold text-slate-800">{filteredAndSortedFiles.length}</span> of {files.length} objects
          {' · '}
          Total Filtered Volume: <span className="font-semibold font-mono text-slate-800">{formatBytes(totalFilteredSize)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> HOT ($0.023)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> WARM ($0.0125)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> COLD ($0.004)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> ARCHIVE ($0.00099)
          </span>
        </div>
      </div>

      {/* File Data Table */}
      <div className="nexus-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={isCurrentPageAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={isLoading || paginatedFiles.length === 0}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                  />
                </th>
                <th 
                  onClick={() => handleSort('filename')} 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  Filename & Hash {renderSortIcon('filename')}
                </th>
                <th 
                  onClick={() => handleSort('category')} 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  Category {renderSortIcon('category')}
                </th>
                <th 
                  onClick={() => handleSort('file_size')} 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  Size {renderSortIcon('file_size')}
                </th>
                <th 
                  onClick={() => handleSort('storage_tier')} 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  Current Tier {renderSortIcon('storage_tier')}
                </th>
                <th 
                  onClick={() => handleSort('inactivity_days')} 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  Inactivity {renderSortIcon('inactivity_days')}
                </th>
                <th className="py-3 px-4">Redundancy</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="font-semibold text-xs text-slate-700">Connecting to FastAPI Object Storage...</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Fetching cryptographic hashes and storage tier telemetry</p>
                  </td>
                </tr>
              ) : files.length === 0 && !error ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-slate-700">Storage Bucket Initialized (0 Objects)</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Your cloud storage bucket is currently empty. Ingest file objects to activate SHA-256 deduplication and lifecycle management.
                    </p>
                    <button
                      onClick={onOpenUpload}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ingest First Object</span>
                    </button>
                  </td>
                </tr>
              ) : filteredAndSortedFiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No storage objects match the selected criteria</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try resetting your search query or category filters</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset All Filters</span>
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedFiles.map((file) => {
                  const isSelected = selectedIds.includes(file.id);

                  return (
                    <tr 
                      key={file.id} 
                      className={`transition-colors group ${
                        isSelected ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(file.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Filename & Hash */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="truncate">
                            <p 
                              onClick={() => setSelectedFileForModal(file)}
                              className="font-medium text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                              title={file.filename}
                            >
                              {file.filename}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                              sha256:{file.sha256_hash.slice(0, 16)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <CategoryBadge category={file.category} />
                      </td>

                      {/* Size */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                        {formatBytes(file.file_size)}
                      </td>

                      {/* Tier */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <TierBadge tier={file.storage_tier} size="sm" />
                      </td>

                      {/* Inactivity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-mono ${
                          file.inactivity_days > 90 ? 'text-amber-600 font-semibold' : 'text-slate-600'
                        }`}>
                          {file.inactivity_days}d unread
                        </span>
                      </td>

                      {/* Duplicate */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {file.is_duplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Copy className="w-3.5 h-3.5" /> Duplicate
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Primary</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelectedFileForModal(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Inspect Metadata"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Object"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredAndSortedFiles.length > 0 && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-600 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-600 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Details Drawer / Modal */}
      <FileDetailsModal
        file={selectedFileForModal}
        onClose={() => setSelectedFileForModal(null)}
        onMigrateTier={handleMigrateTier}
      />
    </div>
  );
};
