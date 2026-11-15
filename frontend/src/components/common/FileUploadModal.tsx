import React, { useState } from 'react';
import { X, UploadCloud, File, Info, Hash, HardDrive } from 'lucide-react';
import { StorageTier, StorageFile } from '../../types';
import { TierBadge } from './TierBadge';
import { formatBytes } from '../../data/mockData';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded: (file: StorageFile) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onFileUploaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTier, setSelectedTier] = useState<StorageTier>('HOT');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [simulatedHash, setSimulatedHash] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Generate a mock SHA-256 for visual preview
      const mockHash = Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      setSimulatedHash(mockHash);
    }
  };

  const handleSimulatedUpload = () => {
    if (!selectedFile) return;

    setIsSimulating(true);
    setSimulatedProgress(15);

    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setIsSimulating(false);
            setSimulatedProgress(100);

            // Determine category from extension
            const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
            let category: StorageFile['category'] = 'Other';
            if (['pdf', 'docx', 'txt', 'log'].includes(ext)) category = 'Document';
            else if (['jpg', 'jpeg', 'png', 'svg', 'ai'].includes(ext)) category = 'Image';
            else if (['mp4', 'mov', 'avi'].includes(ext)) category = 'Video';
            else if (['zip', 'tar', 'gz', '7z'].includes(ext)) category = 'Archive';
            else if (['py', 'ts', 'js', 'json', 'yaml'].includes(ext)) category = 'Code';
            else if (['csv', 'sql', 'parquet', 'db'].includes(ext)) category = 'Data';

            const newFile: StorageFile = {
              id: `f-${Date.now().toString().slice(-4)}`,
              filename: selectedFile.name,
              file_size: selectedFile.size || 1024 * 1024 * 4.5, // fallback if 0
              mime_type: selectedFile.type || 'application/octet-stream',
              category,
              storage_tier: selectedTier,
              sha256_hash: simulatedHash,
              is_duplicate: false,
              created_at: new Date().toISOString(),
              last_accessed_at: new Date().toISOString(),
              inactivity_days: 0,
            };

            onFileUploaded(newFile);
            onClose();
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900">Ingest New File Object</h3>
            <p className="text-xs text-slate-500">Upload to simulated cloud storage bucket</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
              <span className="font-semibold">Simulated Ingestion Interface:</span> Generates client-side SHA-256 fingerprinting. Future API mode streams directly to FastAPI endpoint <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono">/api/v1/files/upload</code>.
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all group">
            <div className="p-3 bg-white group-hover:bg-blue-50 rounded-full shadow-sm border border-slate-200/80 text-blue-600 mb-3 transition-colors">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">
              {selectedFile ? selectedFile.name : 'Click to select or drag and drop a file'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports SQL dumps, logs, media, documents, archives (up to 100 GB)
            </p>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              disabled={isSimulating}
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
                <span className="truncate">SHA-256: {simulatedHash}</span>
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
                  onClick={() => setSelectedTier(tier)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    selectedTier === tier 
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <TierBadge tier={tier} size="sm" />
                  <span className="text-[11px] font-mono text-slate-500">
                    {tier === 'HOT' ? '$0.023' : tier === 'WARM' ? '$0.0125' : tier === 'COLD' ? '$0.004' : '$0.00099'}/GB
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar when uploading */}
          {isSimulating && (
            <div className="space-y-1.5 animate-in fade-in">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Calculating hash & storing chunk streams...</span>
                <span className="font-mono font-medium">{simulatedProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${simulatedProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSimulating}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSimulatedUpload}
            disabled={!selectedFile || isSimulating}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-colors"
          >
            <HardDrive className="w-4 h-4" />
            <span>{isSimulating ? 'Ingesting...' : 'Ingest to Cloud Storage'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
