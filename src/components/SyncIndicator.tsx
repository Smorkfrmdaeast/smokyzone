import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Database,
  Zap,
  Info,
  ChevronDown,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  CloudSyncState,
  getCloudSyncState,
  testFirestoreConnection,
  FIRESTORE_DATABASE_ID,
  FIREBASE_STORAGE_BUCKET,
} from '../utils/siteStore';

interface SyncIndicatorProps {
  compact?: boolean;
  className?: string;
  showInspectorOnClick?: boolean;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  compact = false,
  className = '',
  showInspectorOnClick = true,
}) => {
  const [syncState, setSyncState] = useState<CloudSyncState>(getCloudSyncState);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs: number } | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleSyncChange = (e: Event) => {
      const custom = e as CustomEvent<CloudSyncState>;
      if (custom.detail) {
        setSyncState({ ...custom.detail });
      } else {
        setSyncState(getCloudSyncState());
      }
    };

    window.addEventListener('smokyzone_sync_state', handleSyncChange);
    return () => window.removeEventListener('smokyzone_sync_state', handleSyncChange);
  }, []);

  // Close inspector on outside click
  useEffect(() => {
    if (!isInspectorOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (inspectorRef.current && !inspectorRef.current.contains(e.target as Node)) {
        setIsInspectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInspectorOpen]);

  const handleTestPing = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    try {
      const res = await testFirestoreConnection();
      setPingResult(res);
    } catch {
      setPingResult({ success: false, latencyMs: 0 });
    } finally {
      setIsTestingPing(false);
    }
  };

  const formatTimeAgo = (isoString: string | null): string => {
    if (!isoString) return 'Pending first upload';
    try {
      const diffSec = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 5) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      return `${diffHr}h ago`;
    } catch {
      return 'Recently';
    }
  };

  const formatExactTime = (isoString: string | null): string => {
    if (!isoString) return 'Not yet recorded';
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const isSyncing = syncState.status === 'syncing';
  const isSynced = syncState.status === 'synced';
  const isError = syncState.status === 'error';

  return (
    <div className={`relative inline-block ${className}`} ref={inspectorRef}>
      {/* Interactive Trigger Button */}
      <button
        type="button"
        onClick={() => showInspectorOnClick && setIsInspectorOpen(!isInspectorOpen)}
        title="Click to view Cloud Firestore synchronization details"
        aria-expanded={isInspectorOpen}
        aria-label="Cloud sync indicator"
        className={`group text-left transition-all duration-300 rounded-full px-2.5 py-1 flex items-center gap-1.5 cursor-pointer border ${
          isSyncing
            ? 'bg-[#1E90FF]/15 border-[#1E90FF]/60 text-[#1E90FF] shadow-[0_0_12px_rgba(30,144,255,0.35)] animate-pulse'
            : isSynced
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-900/60 shadow-sm'
            : isError
            ? 'bg-amber-950/80 border-amber-500/40 text-amber-300 hover:border-amber-400'
            : 'bg-[#050811]/90 border-white/10 text-slate-300 hover:border-emerald-500/40 hover:text-white'
        }`}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-[#1E90FF] animate-spin" />
            <span className="text-[11px] font-mono font-bold tracking-tight">
              {compact
                ? syncState.integrityStatus === 'verifying' ? 'Verifying...' : 'Syncing...'
                : syncState.activeItem
                ? syncState.activeItem.startsWith('Verifying') ? syncState.activeItem : `Pushing ${syncState.activeItem}...`
                : 'Pushing to Cloud...'}
            </span>
          </>
        ) : isSynced ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-950" />
            <span className="text-[11px] font-mono font-bold tracking-tight">
              Cloud Acknowledged
            </span>
            {syncState.lastSyncedAt && !compact && (
              <span className="text-[10px] font-mono text-emerald-400/80 hidden sm:inline">
                · {formatTimeAgo(syncState.lastSyncedAt)}
              </span>
            )}
          </>
        ) : isError ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-mono font-bold tracking-tight">
              Local Saved (Cloud Pending)
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-tight">
              Live Cloud Sync
            </span>
            {syncState.lastSyncedAt && (
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                · {formatTimeAgo(syncState.lastSyncedAt)}
              </span>
            )}
          </>
        )}

        {showInspectorOnClick && (
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
              isInspectorOpen ? 'rotate-180 text-white' : 'group-hover:text-white'
            }`}
          />
        )}
      </button>

      {/* Floating Cloud Sync Inspector Popover */}
      {isInspectorOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-[#070D1B] border border-[#1E90FF]/40 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-4 text-left backdrop-blur-xl animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1E90FF]/20 text-[#1E90FF] flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Cloud Firestore Backend
                </h4>
                <p className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live Multi-Device Replication
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsInspectorOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sync Status Card */}
          <div className="space-y-2.5 text-xs font-mono text-slate-300">
            <div className="p-2.5 rounded-xl bg-[#040814] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Sync Status:</span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    isSyncing
                      ? 'text-[#1E90FF]'
                      : isSynced
                      ? 'text-emerald-400'
                      : isError
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }`}
                >
                  {isSyncing && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {isSynced && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {isSyncing
                    ? 'Pushing to Firestore...'
                    : isSynced
                    ? 'Acknowledged & Replicated'
                    : isError
                    ? 'Cached in IndexedDB'
                    : 'Connected & Idle'}
                </span>
              </div>

              {/* Media Metadata & Stream Integrity Status */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1E90FF]" />
                  Media Integrity:
                </span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    syncState.integrityStatus === 'verifying'
                      ? 'text-[#1E90FF]'
                      : syncState.integrityStatus === 'verified'
                      ? 'text-emerald-400'
                      : syncState.integrityStatus === 'failed'
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }`}
                >
                  {syncState.integrityStatus === 'verifying' && (
                    <RefreshCw className="w-3 h-3 animate-spin text-[#1E90FF]" />
                  )}
                  {syncState.integrityStatus === 'verified' && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  )}
                  {syncState.integrityStatus === 'failed' && (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                  {syncState.integrityStatus === 'verifying'
                    ? 'Staged & Verifying Decoders...'
                    : syncState.integrityStatus === 'verified'
                    ? 'Decoders & Streams Verified'
                    : syncState.integrityStatus === 'failed'
                    ? 'Corrupt Media Blocked'
                    : 'Active Background Gate'}
                </span>
              </div>

              {syncState.activeItem && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Latest Item:</span>
                  <span className="text-white font-semibold truncate max-w-[180px]">
                    {syncState.activeItem}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Last Acknowledged:</span>
                <span className="text-slate-200">
                  {formatExactTime(syncState.lastSyncedAt)} ({formatTimeAgo(syncState.lastSyncedAt)})
                </span>
              </div>

              {syncState.latencyMs !== undefined && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Server Latency:</span>
                  <span className="text-emerald-400 font-bold">{syncState.latencyMs}ms</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                <span className="text-slate-400">Cloud Auth:</span>
                <span
                  className={`font-semibold ${
                    syncState.firebaseAuthVerified ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {syncState.firebaseAuthVerified
                    ? `Google Verified (${syncState.firebaseAuthEmail || 'owner'})`
                    : 'Local Passcode Only (Writes Locked)'}
                </span>
              </div>

              {syncState.error && (
                <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/30 text-[10px] text-amber-200 leading-relaxed break-words">
                  {syncState.error}
                </div>
              )}
            </div>

            {/* Target Firestore Database & Storage Details */}
            <div className="p-2.5 rounded-xl bg-[#040814] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Target Database &amp; Storage
              </span>
              <p className="text-[11px] text-[#1E90FF] font-bold font-mono break-all leading-tight">
                {FIRESTORE_DATABASE_ID}
              </p>
              <p className="text-[10px] text-cyan-300 font-mono break-all leading-tight">
                Bucket: {FIREBASE_STORAGE_BUCKET}
              </p>
              <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                Stores audio/video binaries in Firebase Storage (`media_items` pointers) and site state (`site_content/global_v1`) with IndexedDB caching.
              </p>
            </div>

            {/* Ping Test Trigger */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTestingPing}
                className="w-full py-2 px-3 rounded-xl bg-[#1E90FF]/20 hover:bg-[#1E90FF] text-[#1E90FF] hover:text-white border border-[#1E90FF]/40 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTestingPing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing Ping...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Ping Firestore Backend</span>
                  </>
                )}
              </button>
            </div>

            {pingResult && (
              <div
                className={`p-2 rounded-lg text-[11px] font-mono flex items-center justify-between ${
                  pingResult.success
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                }`}
              >
                <span>
                  {pingResult.success
                    ? `✓ Backend reachable · Round-trip latency:`
                    : '✗ Cloud ping error'}
                </span>
                {pingResult.success && (
                  <span className="font-bold text-white">{pingResult.latencyMs}ms</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
