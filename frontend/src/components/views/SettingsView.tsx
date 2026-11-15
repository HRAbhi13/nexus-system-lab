import React, { useState } from 'react';
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
  Bell
} from 'lucide-react';
import { TIER_RATES } from '../../data/mockData';

interface SettingsViewProps {
  onSavePreferences: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSavePreferences }) => {
  const [apiMode, setApiMode] = useState<'mock' | 'live'>('mock');
  const [backendUrl, setBackendUrl] = useState('http://127.0.0.1:8000');
  const [currency, setCurrency] = useState('USD');
  const [hotRate, setHotRate] = useState(TIER_RATES.HOT.toString());
  const [warmRate, setWarmRate] = useState(TIER_RATES.WARM.toString());
  const [coldRate, setColdRate] = useState(TIER_RATES.COLD.toString());
  const [archiveRate, setArchiveRate] = useState(TIER_RATES.ARCHIVE.toString());

  const [warmDays, setWarmDays] = useState('30');
  const [coldDays, setColdDays] = useState('90');
  const [archiveDays, setArchiveDays] = useState('365');

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoDeduplicate, setAutoDeduplicate] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePreferences('Settings & cloud optimization thresholds successfully updated.');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Platform Preferences & Cloud Rates</h2>
        <p className="text-xs text-slate-500">Configure cloud rate parameters, inactivity policies, and backend API connectivity</p>
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

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              FastAPI Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Data Source Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setApiMode('mock')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    apiMode === 'mock'
                      ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p>Mock Data Mode</p>
                  <p className="text-[11px] font-normal text-slate-400 mt-0.5">Isolated UI design preview</p>
                </button>

                <button
                  type="button"
                  onClick={() => setApiMode('live')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    apiMode === 'live'
                      ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p>Live Backend API</p>
                  <p className="text-[11px] font-normal text-slate-400 mt-0.5">Connect to FastAPI server</p>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">FastAPI REST Server URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3 text-blue-600" />
                Interactive Swagger Docs: <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">http://127.0.0.1:8000/docs</a>
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Clear Architectural Separation:</span> The UI operates currently using high-fidelity simulated models. When toggled to Live Mode, requests route to backend endpoints: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono">/api/v1/files</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono">/api/v1/optimizer/duplicates</code>, and <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono">/api/v1/analytics/dashboard</code>.
            </div>
          </div>
        </div>

        {/* Cloud Tier Rate Matrix */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cloud Storage Tier Rate Matrix ($/GB/mo)</h3>
                <p className="text-xs text-slate-500">Modeled after AWS S3 / GCP rate structures used for cost estimations</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5 p-3 bg-rose-50/40 rounded-xl border border-rose-200/60">
              <label className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" /> HOT Tier Rate
              </label>
              <input
                type="text"
                value={hotRate}
                onChange={(e) => setHotRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Baseline Standard Active</span>
            </div>

            <div className="space-y-1.5 p-3 bg-amber-50/40 rounded-xl border border-amber-200/60">
              <label className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" /> WARM Tier Rate
              </label>
              <input
                type="text"
                value={warmRate}
                onChange={(e) => setWarmRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Infrequent Access</span>
            </div>

            <div className="space-y-1.5 p-3 bg-sky-50/40 rounded-xl border border-sky-200/60">
              <label className="text-xs font-semibold text-sky-900 flex items-center gap-1.5">
                <Snowflake className="w-3.5 h-3.5 text-sky-500" /> COLD Tier Rate
              </label>
              <input
                type="text"
                value={coldRate}
                onChange={(e) => setColdRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Coldline / Glacier Instant</span>
            </div>

            <div className="space-y-1.5 p-3 bg-purple-50/40 rounded-xl border border-purple-200/60">
              <label className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-purple-500" /> ARCHIVE Rate
              </label>
              <input
                type="text"
                value={archiveRate}
                onChange={(e) => setArchiveRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Glacier Deep Archive</span>
            </div>
          </div>
        </div>

        {/* Lifecycle Inactivity Thresholds */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lifecycle Inactivity Thresholds</h3>
                <p className="text-xs text-slate-500">Days of dormancy required to trigger downward tier demotions</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Days to WARM Transition</label>
              <input
                type="number"
                value={warmDays}
                onChange={(e) => setWarmDays(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
              />
              <span className="text-[10px] text-slate-400">Default: 30 days</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Days to COLD Transition</label>
              <input
                type="number"
                value={coldDays}
                onChange={(e) => setColdDays(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
              />
              <span className="text-[10px] text-slate-400">Default: 90 days</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Days to ARCHIVE Transition</label>
              <input
                type="number"
                value={archiveDays}
                onChange={(e) => setArchiveDays(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
              />
              <span className="text-[10px] text-slate-400">Default: 365 days</span>
            </div>
          </div>
        </div>

        {/* Application Preferences & Alerts */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Application Preferences & Notifications</h3>
                <p className="text-xs text-slate-500">Formatting options and automated intelligence alerts</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Display Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
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

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
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
          </div>
        </div>

        {/* Project Context & About */}
        <div className="nexus-card p-6 bg-slate-50/60 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800">Project Context:</span>
            <span className="text-xs text-slate-600">NEXUS — Intelligent Cloud Storage Optimization Platform</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            College Engineering Capstone System. Tagline: <strong className="text-slate-700">Smarter Storage. Optimized Future.</strong> Designed with an enterprise cloud dashboard aesthetic using React, Vite, TypeScript, Tailwind CSS, Lucide React, and Recharts.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
