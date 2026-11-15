import React, { useState } from 'react';
import { X, UploadCloud, File, Info, Hash, HardDrive, Loader2, AlertCircle } from 'lucide-react';
import { StorageTier, StorageFile, FileCategory } from '../../types';
import { TierBadge } from './TierBadge';
import { formatBytes } from '../../data/mockData';
import { nexusApi, BackendFileMetadata } from '../../services/api';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded: (file: StorageFile) => void;
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

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onFileUploaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTier, setSelectedTier] = useState<StorageTier>('HOT');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isComputingHash, setIsComputingHash] = useState<boolean>(false);
  const [fileHash, setFileHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsComputingHash(true);
      setFileHash('');

      try {
        const buffer = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(digest));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setFileHash(hashHex);
      } catch {
        setFileHash('');
      } finally {
        setIsComputingHash(false);
      }
    }
  };

  const handleRealUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const backendMetadata = await nexusApi.uploadFile(selectedFile, selectedTier);
      const mappedFile = mapBackendFileToStorageFile(backendMetadata);
      onFileUploaded(mappedFile);
      setSelectedFile(null);
      setFileHash('');
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to ingest file object to FastAPI backend.';
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleModalClose = () => {
    if (isUploading) return;
    setSelectedFile(null);
    setFileHash('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900">Ingest New File Object</h3>
            <p className="text-xs text-slate-500">Upload to live NEXUS cloud storage bucket</p>
          </div>
          <button 
            onClick={handleModalClose}
            disabled={isUploading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Notice banner */}
          <div className="flex items-start gap-3 p-3 text-xs bg-blue-50/80 border border-blue-200/60 rounded-xl text-blue-800">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Live Storage Ingestion:</span> Streams file directly to FastAPI backend <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono">/api/v1/files/upload</code> with real-time SHA-256 deduplication and categorization.
            </div>
          </div>

          {/* Error Message if upload failed */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 text-xs bg-red-50 border border-red-200 rounded-xl text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Ingestion Failed: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all group ${
            isUploading 
              ? 'border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-60' 
              : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
          }`}>
            <div className="p-3 bg-white group-hover:bg-blue-50 rounded-full shadow-sm border border-slate-200/80 text-blue-600 mb-3 transition-colors">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">
              {selectedFile ? selectedFile.name : 'Click to select or drag and drop a file'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports documents, images, video, archives, code, and data dumps
            </p>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>

          {/* Selected File Details */}
          {selectedFile && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <File className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{selectedFile.name}</span>
                </div>
                <span className="font-mono text-slate-500 shrink-0">{formatBytes(selectedFile.size)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono truncate">
                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {isComputingHash ? 'Calculating cryptographic SHA-256...' : `SHA-256: ${fileHash || 'Available upon ingest'}`}
                </span>
              </div>
            </div>
          )}

          {/* Storage Tier Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Target Storage Tier</span>
              <span className="text-slate-400 font-normal">Standard is HOT</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['HOT', 'WARM', 'COLD', 'ARCHIVE'] as StorageTier[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  disabled={isUploading}
                  onClick={() => setSelectedTier(tier)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    selectedTier === tier 
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  } disabled:opacity-50`}
                >
                  <TierBadge tier={tier} size="sm" />
                  <span className="text-[11px] font-mono text-slate-500">
                    {tier === 'HOT' ? '$0.023' : tier === 'WARM' ? '$0.0125' : tier === 'COLD' ? '$0.004' : '$0.00099'}/GB
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Uploading Status Bar */}
          {isUploading && (
            <div className="space-y-1.5 animate-in fade-in">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  Streaming blob to FastAPI backend & auditing duplicates...
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full w-full animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={handleModalClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRealUpload}
            disabled={!selectedFile || isUploading || isComputingHash}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ingesting Blob...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-4 h-4" />
                <span>Ingest to Cloud Storage</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
