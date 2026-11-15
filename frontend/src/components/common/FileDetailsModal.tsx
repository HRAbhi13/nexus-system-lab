import React, { useState } from 'react';
import { X, Copy, Check, Hash, Calendar, HardDrive, AlertTriangle, Layers, Tag } from 'lucide-react';
import { StorageFile } from '../../types';
import { TierBadge } from './TierBadge';
import { CategoryBadge } from './CategoryBadge';
import { formatBytes, formatCurrency, formatDate, TIER_RATES } from '../../data/mockData';

interface FileDetailsModalProps {
  file: StorageFile | null;
  onClose: () => void;
  onMigrateTier?: (fileId: string, newTier: StorageFile['storage_tier']) => void;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({
  file,
  onClose,
  onMigrateTier,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!file) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(file.sha256_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const monthlyCost = (file.file_size / (1024 * 1024 * 1024)) * TIER_RATES[file.storage_tier];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5 truncate pr-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-base font-bold text-slate-900 truncate">{file.filename}</h3>
              <p className="text-xs text-slate-400 font-mono">ID: {file.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Duplicate Banner if redundant */}
          {file.is_duplicate && (
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Redundant Duplicate Copy Detected</p>
                <p className="text-amber-700 mt-0.5">
                  This file shares an exact SHA-256 cryptographic match with original file{' '}
                  <span className="font-mono font-semibold">{file.original_file_id}</span>. Deleting this duplicate will reclaim {formatBytes(file.file_size)} of storage.
                </p>
              </div>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Object Size</p>
              <p className="text-base font-bold text-slate-800 font-mono mt-0.5">{formatBytes(file.file_size)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Storage Tier</p>
              <div className="mt-1">
                <TierBadge tier={file.storage_tier} size="sm" />
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Monthly Spend</p>
              <p className="text-base font-bold text-slate-800 font-mono mt-0.5">{formatCurrency(monthlyCost)}</p>
            </div>
          </div>

          {/* SHA-256 Hash box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Cryptographic SHA-256 Hash Digest
              </span>
              <button 
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs break-all border border-slate-800 selection:bg-emerald-800 selection:text-white">
              {file.sha256_hash}
            </div>
          </div>

          {/* Metadata Details Table */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
            <div className="flex justify-between py-2.5 px-4 bg-slate-50/50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> Category
              </span>
              <CategoryBadge category={file.category} />
            </div>
            <div className="flex justify-between py-2.5 px-4">
              <span className="text-slate-500">MIME Content Type</span>
              <span className="font-mono text-slate-800">{file.mime_type}</span>
            </div>
            <div className="flex justify-between py-2.5 px-4 bg-slate-50/50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Created / Ingested
              </span>
              <span className="text-slate-800 font-mono">{formatDate(file.created_at)}</span>
            </div>
            <div className="flex justify-between py-2.5 px-4">
              <span className="text-slate-500">Last Read Access</span>
              <span className="text-slate-800 font-mono">{formatDate(file.last_accessed_at)}</span>
            </div>
            <div className="flex justify-between py-2.5 px-4 bg-slate-50/50">
              <span className="text-slate-500">Inactivity Age</span>
              <span className={`font-semibold font-mono ${
                file.inactivity_days > 90 ? 'text-amber-600' : 'text-slate-800'
              }`}>
                {file.inactivity_days} days dormant
              </span>
            </div>
          </div>

          {/* Quick Migration Simulation */}
          {onMigrateTier && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Simulate Direct Tier Transition:
              </p>
              <div className="flex items-center gap-2">
                {(['HOT', 'WARM', 'COLD', 'ARCHIVE'] as StorageFile['storage_tier'][]).map((t) => (
                  <button
                    key={t}
                    disabled={file.storage_tier === t}
                    onClick={() => {
                      onMigrateTier(file.id, t);
                      onClose();
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                      file.storage_tier === t
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    Move to {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
