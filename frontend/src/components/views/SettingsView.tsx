import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sliders, 
  Database, 
  Cpu, 
  ExternalLink, 
  Save, 
  Flame, 
  Sun, 
  Snowflake, 
  Archive, 
  Info, 
  Bell,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock
} from 'lucide-react';
import { nexusApi, BackendTierResponse } from '../../services/api';

interface SettingsViewProps {
  onSavePreferences: (msg: string) => void;
}

const LOCAL_STORAGE_KEY = 'nexus_console_preferences';

interface ConsolePreferences {
  currency: string;
  emailAlerts: boolean;
  autoDeduplicate: boolean;
}

type HealthState = 'verifying' | 'connected' | 'disconnected';

const tierMetaMap: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  borderClass: string;
  bgClass: string;
  titleColor: string;
  badgeColor: string;
  defaultDescription: string;
}> = {
  HOT: {
    icon: Flame,
    borderClass: 'border-rose-200/60',
    bgClass: 'bg-rose-50/40',
    titleColor: 'text-rose-900',
    badgeColor: 'text-rose-700 bg-rose-100/70 border-rose-200',
    defaultDescription: 'Frequently accessed active storage',
  },
  WARM: {
    icon: Sun,
    borderClass: 'border-amber-200/60',
    bgClass: 'bg-amber-50/40',
    titleColor: 'text-amber-900',
    badgeColor: 'text-amber-700 bg-amber-100/70 border-amber-200',
    defaultDescription: 'Infrequently accessed data store',
  },
  COLD: {
    icon: Snowflake,
    borderClass: 'border-sky-200/60',
    bgClass: 'bg-sky-50/40',
    titleColor: 'text-sky-900',
    badgeColor: 'text-sky-700 bg-sky-100/70 border-sky-200',
    defaultDescription: 'Quarterly access coldline storage',
  },
  ARCHIVE: {
    icon: Archive,
    borderClass: 'border-purple-200/60',
    bgClass: 'bg-purple-50/40',
    titleColor: 'text-purple-900',
    badgeColor: 'text-purple-700 bg-purple-100/70 border-purple-200',
    defaultDescription: 'Long-term deep glacier archive',
  },
};

export const SettingsView: React.FC<SettingsViewProps> = ({ onSavePreferences }) => {
  // Backend Health & Connectivity State
  const [healthStatus, setHealthStatus] = useState<HealthState>('verifying');
  const [healthLatency, setHealthLatency] = useState<number | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);

  // Live Storage Tiers State
  const [tiers, setTiers] = useState<BackendTierResponse[]>([]);
  const [isTiersLoading, setIsTiersLoading] = useState<boolean>(true);
  const [tiersError, setTiersError] = useState<string | null>(null);

  // Local Console Preferences State (Persisted in localStorage)
  const [currency, setCurrency] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: ConsolePreferences = JSON.parse(saved);
        return parsed.currency || 'USD';
      }
    } catch {
      // Local storage fallback
    }
    return 'USD';
  });

  const [emailAlerts, setEmailAlerts] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: ConsolePreferences = JSON.parse(saved);
        return parsed.emailAlerts !== undefined ? parsed.emailAlerts : true;
      }
    } catch {
      // Local storage fallback
    }
    return true;
  });

  const [autoDeduplicate, setAutoDeduplicate] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: ConsolePreferences = JSON.parse(saved);
        return parsed.autoDeduplicate !== undefined ? parsed.autoDeduplicate : false;
      }
    } catch {
      // Local storage fallback
    }
    return false;
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Ping Backend Health Check
  const pingBackend = useCallback(async () => {
    setIsPinging(true);
    setHealthStatus('verifying');
    setHealthError(null);
    const startTime = performance.now();
    try {
      const res = await nexusApi.checkHealth();
      const elapsed = Math.round(performance.now() - startTime);
      if (res && res.status === 'healthy') {
        setHealthStatus('connected');
        setHealthLatency(elapsed);
      } else {
        setHealthStatus('disconnected');
        setHealthError(`Unexpected response: ${JSON.stringify(res)}`);
        setHealthLatency(null);
      }
    } catch (err: unknown) {
      setHealthStatus('disconnected');
      const message = err instanceof Error ? err.message : 'FastAPI REST backend unreachable at http://127.0.0.1:8000';
      setHealthError(message);
      setHealthLatency(null);
    } finally {
      setIsPinging(false);
    }
  }, []);

  // Fetch Live Cloud Storage Tiers
  const fetchTiers = useCallback(async () => {
    setIsTiersLoading(true);
    setTiersError(null);
    try {
      const data = await nexusApi.getTiers();
      setTiers(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve storage tier pricing from backend.';
      setTiersError(message);
    } finally {
      setIsTiersLoading(false);
    }
  }, []);

  useEffect(() => {
    pingBackend();
    fetchTiers();
  }, [pingBackend, fetchTiers]);

  // Handle Save Preferences to Local Storage
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const prefs: ConsolePreferences = {
        currency,
        emailAlerts,
        autoDeduplicate,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
      onSavePreferences('Console preferences saved to local browser storage. Cloud tier rates and lifecycle policies are server-managed.');
    } catch {
      onSavePreferences('Console preferences updated for this active session.');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Standard ordered tier display
  const orderedTierIds = ['HOT', 'WARM', 'COLD', 'ARCHIVE'];
  const displayTiers = orderedTierIds.map((id) => {
    const backendTier = tiers.find((t) => t.id === id);
    if (backendTier) return backendTier;
    // Fallback based on backend default constants if network error
    return {
      id,
      name: id === 'HOT' ? 'Hot (Standard)' : id === 'WARM' ? 'Warm (Infrequent Access)' : id === 'COLD' ? 'Cold (Coldline)' : 'Archive (Glacier)',
      description: null,
      storage_cost_per_gb: id === 'HOT' ? 0.023 : id === 'WARM' ? 0.0125 : id === 'COLD' ? 0.004 : 0.00099,
      retrieval_cost_per_gb: id === 'HOT' ? 0.0 : id === 'WARM' ? 0.01 : id === 'COLD' ? 0.03 : 0.05,
      minimum_retention_days: id === 'HOT' ? 0 : id === 'WARM' ? 30 : id === 'COLD' ? 90 : 180,
    };
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Platform Preferences & System Integration</h2>
        <p className="text-xs text-slate-500">Live FastAPI connectivity status, authoritative cloud rates, and console preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend Integration & API Connectivity */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">FastAPI Backend Integration</h3>
                <p className="text-xs text-slate-500">Bridge between NEXUS React Console and Python FastAPI server</p>
              </div>
            </div>

            {/* Dynamic Health Status Badge */}
            {healthStatus === 'verifying' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Verifying Health...
              </span>
            ) : healthStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                FastAPI Online {healthLatency !== null ? `(${healthLatency}ms)` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                Backend Disconnected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Active Data Source Panel (Live Connected Mode) */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Live FastAPI Connected Mode
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold border border-blue-200">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                All platform views (Overview, Files, Duplicate Detection, Compression Advisor, Lifecycle Optimizer, and Analytics) query the live FastAPI REST backend directly.
              </p>
              <div className="text-[10px] text-blue-700 font-mono flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Mock Dependencies in Production Views</span>
              </div>
            </div>

            {/* FastAPI REST Server Gateway & Ping Action */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">FastAPI REST Server Gateway</label>
                <button
                  type="button"
                  onClick={pingBackend}
                  disabled={isPinging}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Pinging...' : 'Ping Backend Engine'}</span>
                </button>
              </div>

              <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 flex items-center justify-between">
                <span>http://127.0.0.1:8000</span>
                <span className="text-[11px] text-slate-400 font-sans">Vite Proxy: /api/v1</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-blue-600" />
                  Interactive Swagger Docs: <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">http://127.0.0.1:8000/docs</a>
                </span>
                {healthLatency !== null && (
                  <span className="font-mono text-emerald-600 font-semibold">Latency: {healthLatency}ms</span>
                )}
              </div>
            </div>
          </div>

          {/* Connection Error Banner */}
          {healthError && (
            <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-red-900">Backend Communication Error:</span>
                  <p className="text-red-700 mt-0.5">{healthError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={pingBackend}
                className="px-3 py-1 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 shrink-0 shadow-xs"
              >
                Retry Ping
              </button>
            </div>
          )}

          {/* Architecture Explanation Banner */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Server-Side Engine Architecture:</span> Requests route through FastAPI REST controllers: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono">/api/v1/files</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono">/api/v1/optimizer/*</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono">/api/v1/analytics/*</code>, and <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono">/api/v1/tiers</code>, supported by SQLite WAL storage, Pandas analytics, and SHA-256 cryptographic deduplication.
            </div>
          </div>
        </div>

        {/* Live Cloud Tier Rate Matrix (Server-Managed / Read-Only) */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Cloud Storage Tier Rate Matrix ($/GB/mo)</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> Server-Managed SLA
                  </span>
                </div>
                <p className="text-xs text-slate-500">Authoritative tier definitions loaded directly from FastAPI backend database</p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchTiers}
              disabled={isTiersLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 text-emerald-600 ${isTiersLoading ? 'animate-spin' : ''}`} />
              <span>Refresh SLA</span>
            </button>
          </div>

          {tiersError && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-center justify-between">
              <span>Failed to load live tier pricing from server: {tiersError}</span>
              <button
                type="button"
                onClick={fetchTiers}
                className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayTiers.map((tier) => {
              const meta = tierMetaMap[tier.id] || tierMetaMap.HOT;
              const IconComponent = meta.icon;

              return (
                <div
                  key={tier.id}
                  className={`space-y-2.5 p-3.5 rounded-xl border ${meta.borderClass} ${meta.bgClass}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-bold ${meta.titleColor} flex items-center gap-1.5`}>
                      <IconComponent className="w-4 h-4 shrink-0" />
                      <span>{tier.name}</span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${meta.badgeColor}`}>
                      {tier.id}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">At-Rest Storage</span>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                      ${tier.storage_cost_per_gb.toFixed(tier.storage_cost_per_gb < 0.001 ? 5 : 4)}
                      <span className="text-xs font-normal text-slate-500 font-sans">/GB/mo</span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-200/50 space-y-1 text-[11px] text-slate-600 font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans">Retrieval Fee:</span>
                      <span className={tier.retrieval_cost_per_gb === 0 ? 'text-emerald-700 font-semibold' : 'text-slate-700'}>
                        {tier.retrieval_cost_per_gb === 0 ? '$0.00 (Free)' : `$${tier.retrieval_cost_per_gb.toFixed(3)}/GB`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans">Min Retention:</span>
                      <span className="text-slate-700">
                        {tier.minimum_retention_days === 0 ? 'None (0 days)' : `${tier.minimum_retention_days} days`}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 pt-1 line-clamp-2">
                    {tier.description || meta.defaultDescription}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              <strong>Read-Only Cloud SLA:</strong> Unit rates and retrieval surcharges are system constants enforced by the storage engine. They cannot be altered via the client console.
            </span>
          </div>
        </div>

        {/* Lifecycle Inactivity Thresholds (Server-Managed Policies) */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Lifecycle Inactivity Thresholds</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    Active Policy
                  </span>
                </div>
                <p className="text-xs text-slate-500">Days of dormancy required by TierRecommender to trigger downward demotions</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">Days to WARM Transition</span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                30 <span className="text-xs font-normal text-slate-500">days</span>
              </div>
              <p className="text-[11px] text-slate-500">
                HOT objects inactive for &gt; 30 days are flagged for demotion to WARM.
              </p>
              <span className="text-[10px] font-mono text-slate-400 block pt-1">
                Rule: settings.TIER_THRESHOLDS[&quot;HOT_MAX_DAYS&quot;]
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">Days to COLD Transition</span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                90 <span className="text-xs font-normal text-slate-500">days</span>
              </div>
              <p className="text-[11px] text-slate-500">
                WARM objects inactive for &gt; 90 days are flagged for demotion to COLD.
              </p>
              <span className="text-[10px] font-mono text-slate-400 block pt-1">
                Rule: settings.TIER_THRESHOLDS[&quot;WARM_MAX_DAYS&quot;]
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">Days to ARCHIVE Transition</span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                180 <span className="text-xs font-normal text-slate-500">days</span>
              </div>
              <p className="text-[11px] text-slate-500">
                COLD objects inactive for &gt; 180 days are flagged for demotion to ARCHIVE.
              </p>
              <span className="text-[10px] font-mono text-slate-400 block pt-1">
                Rule: settings.TIER_THRESHOLDS[&quot;COLD_MAX_DAYS&quot;]
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              <strong>Optimizer Policy Note:</strong> Inactivity thresholds reflect the server-side transition policy in <code className="font-mono bg-slate-200/80 px-1 py-0.5 rounded">TierRecommender</code>. Files exceeding these dormancy boundaries appear in the Storage Optimizer view for cost-saving migration.
            </span>
          </div>
        </div>

        {/* Application Preferences & Local Console Storage */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Application Preferences & Notifications</h3>
                <p className="text-xs text-slate-500">Local web console formatting and client-side notification preferences</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Display Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              >
                <option value="USD">USD ($) - US Dollar (Default)</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
              </select>
              <span className="text-[10px] text-slate-400">Backend financial ROI models are calculated in USD</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Email Digest Alerts</p>
                  <p className="text-[11px] text-slate-500">Weekly waste report</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </div>
              <p className="text-[10px] text-amber-600 font-medium">
                Console preference only; backend has no active email mailer service.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Auto-Flag Redundancy</p>
                  <p className="text-[11px] text-slate-500">Alert on new duplicate</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoDeduplicate}
                  onChange={(e) => setAutoDeduplicate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Controls in-browser upload toast notifications for duplicate clusters.
              </p>
            </div>
          </div>
        </div>

        {/* Project Context & System Details */}
        <div className="nexus-card p-6 bg-slate-50/60 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800">Project Context:</span>
            <span className="text-xs text-slate-600">NEXUS — Intelligent Cloud Storage Optimization Platform</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            College Engineering Capstone System. Tagline: <strong className="text-slate-700">Smarter Storage. Optimized Future.</strong> Designed with an enterprise cloud dashboard aesthetic using React, Vite, TypeScript, Tailwind CSS, Lucide React, and Recharts. Connected to a production-grade FastAPI backend with SQLite WAL storage, Pandas statistical aggregation, and cryptographic SHA-256 deduplication.
          </p>
        </div>

        {/* Save Preferences Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
