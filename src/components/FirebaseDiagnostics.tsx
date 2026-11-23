import React, { useEffect, useRef, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Database,
  HardDrive,
  User as UserIcon,
  Copy,
} from 'lucide-react';
import { app, auth, firebaseConfig } from '../firebase';
import {
  FIRESTORE_DATABASE_ID,
  FIREBASE_STORAGE_BUCKET,
  OWNER_EMAIL_DISPLAY,
  testFirestoreConnection,
  testStorageConnection,
  checkOwnerAdminStatusDoc,
  hasFirebaseGoogleOwnerSession,
  hasActivePasscodeSession,
  isVerifiedOwnerEmail,
  isFirebaseUserEmailVerified,
  getUserPrimaryEmail,
  getUidIdentityCache,
  FirestoreConnectionStatus,
  StorageConnectionStatus,
} from '../utils/siteStore';
import { resolveFirebaseUserIdentity } from '../utils/authManager';

export interface FirebaseDiagnosticReport {
  timestamp: string;
  runtimeOrigin: string;
  runtimeHostname: string;
  appConfig: {
    appName: string;
    projectId: string;
    appId: string;
    authDomain: string;
    firestoreDatabaseId: string;
    storageBucket: string;
    messagingSenderId: string;
    apiKeyConfigured: boolean;
    apiKeyPreview: string;
  };
  currentUser: {
    signedIn: boolean;
    uid: string | null;
    email: string | null;
    emailVerified: boolean | null;
    identitySource: string | null;
    hasTokenEmailClaim: boolean | null;
    tokenClaimKeys: string[];
    displayName: string | null;
    isAnonymous: boolean | null;
    providerIds: string[];
    creationTime: string | null;
    lastSignInTime: string | null;
    matchesOwnerEmail: boolean;
    firebaseGoogleOwnerReady: boolean;
    localPasscodeSessionActive: boolean;
  };
  firestore: FirestoreConnectionStatus & {
    adminStatusDoc?: {
      exists: boolean;
      matchesOwnerUid: boolean;
      ownerRegistered?: boolean;
      ownerEmail?: string;
      error?: string;
    };
  };
  storage: StorageConnectionStatus;
}

interface FirebaseDiagnosticsProps {
  showDebugPanel?: boolean;
}

function buildSafeUserSummary(user: User | null) {
  const email = getUserPrimaryEmail(user);
  const cachedIdentity = getUidIdentityCache(user?.uid);
  return {
    signedIn: Boolean(user),
    uid: user?.uid ?? null,
    email,
    emailVerified: user ? isFirebaseUserEmailVerified(user) : null,
    identitySource: cachedIdentity?.source ?? (user?.email ? 'user.email' : null),
    hasTokenEmailClaim: user ? (cachedIdentity?.hasTokenEmailClaim ?? Boolean(user.email)) : null,
    tokenClaimKeys: cachedIdentity?.claimKeys ?? [],
    displayName: user?.displayName ?? null,
    isAnonymous: user ? Boolean(user.isAnonymous) : null,
    providerIds: user?.providerData?.map((p) => p.providerId).filter(Boolean) || [],
    creationTime: user?.metadata?.creationTime ?? null,
    lastSignInTime: user?.metadata?.lastSignInTime ?? null,
    matchesOwnerEmail: Boolean(email && isVerifiedOwnerEmail(email)),
    firebaseGoogleOwnerReady: hasFirebaseGoogleOwnerSession(),
    localPasscodeSessionActive: hasActivePasscodeSession(),
  };
}

export const runFirebaseConsoleDiagnostics = async (
  triggerSource = 'manual'
): Promise<FirebaseDiagnosticReport> => {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady().catch(() => {});
  }

  if (auth.currentUser) {
    await resolveFirebaseUserIdentity(auth.currentUser).catch(() => null);
  }

  const [firestoreStatus, storageStatus, adminStatusDoc] = await Promise.all([
    testFirestoreConnection(),
    testStorageConnection(),
    auth.currentUser && hasFirebaseGoogleOwnerSession()
      ? checkOwnerAdminStatusDoc()
      : Promise.resolve(undefined),
  ]);

  const rawKey = firebaseConfig.apiKey || '';
  const report: FirebaseDiagnosticReport = {
    timestamp: new Date().toISOString(),
    runtimeOrigin: typeof window !== 'undefined' ? window.location.origin : 'ssr',
    runtimeHostname: typeof window !== 'undefined' ? window.location.hostname : 'ssr',
    appConfig: {
      appName: app.name,
      projectId: firebaseConfig.projectId || '(missing)',
      appId: firebaseConfig.appId || '(missing)',
      authDomain: firebaseConfig.authDomain || '(missing)',
      firestoreDatabaseId: FIRESTORE_DATABASE_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
      messagingSenderId: firebaseConfig.messagingSenderId || '(missing)',
      apiKeyConfigured: Boolean(rawKey),
      apiKeyPreview: rawKey ? `${rawKey.slice(0, 8)}...(${rawKey.length} chars)` : '(missing)',
    },
    currentUser: buildSafeUserSummary(auth.currentUser),
    firestore: {
      ...firestoreStatus,
      ...(adminStatusDoc ? { adminStatusDoc } : {}),
    },
    storage: storageStatus,
  };

  console.groupCollapsed(
    `[SmokyZone Firebase Diagnostics] (${triggerSource}) · Project: ${report.appConfig.projectId} · Auth: ${
      report.currentUser.email || 'signed-out'
    } · Firestore: ${report.firestore.success ? 'OK' : 'ERR'} · Storage: ${report.storage.status}`
  );
  console.log('1. Active Firebase App Config:', report.appConfig, { rawAppOptions: app.options });
  console.log('2. Current Firebase User:', report.currentUser, { currentUserObject: auth.currentUser });
  console.log('3. Firestore Connection Status:', report.firestore);
  console.log('4. Storage Connection Status:', report.storage);
  if (!report.currentUser.firebaseGoogleOwnerReady) {
    console.info(
      `Note: Cloud Firestore & Storage writes require Google Sign-In as ${OWNER_EMAIL_DISPLAY} (verified email).`
    );
  }
  console.groupEnd();

  return report;
};

export const FirebaseDiagnostics: React.FC<FirebaseDiagnosticsProps> = ({
  showDebugPanel = false,
}) => {
  const [report, setReport] = useState<FirebaseDiagnosticReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const lastRunReasonRef = useRef<string>('mount');
  const debounceTimerRef = useRef<number | null>(null);

  const executeDiagnostics = useCallback(async (reason: string) => {
    lastRunReasonRef.current = reason;
    setIsRunning(true);
    try {
      const result = await runFirebaseConsoleDiagnostics(reason);
      setReport(result);
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const scheduleDiagnostics = (reason: string, delayMs = 150) => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        if (active) {
          void executeDiagnostics(reason);
        }
      }, delayMs);
    };

    // Expose manual console trigger for quick debugging in browser DevTools
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__SMOKYZONE_FIREBASE_DIAGNOSTICS__ = () =>
        executeDiagnostics('devtools_console');
    }

    // Run after Firebase Auth finishes restoring persisted session from IndexedDB
    if (typeof auth.authStateReady === 'function') {
      auth.authStateReady().then(() => {
        if (active) scheduleDiagnostics('startup_boot', 50);
      });
    } else {
      scheduleDiagnostics('startup_boot', 250);
    }

    // Re-log whenever Firebase Auth user changes
    let firstAuthEvent = true;
    const unsubAuth = onAuthStateChanged(auth, () => {
      if (firstAuthEvent) {
        firstAuthEvent = false;
        return;
      }
      scheduleDiagnostics('auth_state_changed', 200);
    });

    return () => {
      active = false;
      unsubAuth();
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [executeDiagnostics]);

  if (!showDebugPanel) {
    return null;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#1E90FF]" /> Firebase Console Diagnostics
          </h3>
          <p className="text-[11px] text-slate-400">
            Logs active Firebase config, current user object, Firestore DB, and Storage bucket status to the browser console.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void executeDiagnostics('studio_button')}
          disabled={isRunning}
          className="px-3.5 py-2 rounded-xl bg-[#1E90FF]/20 hover:bg-[#1E90FF] text-[#1E90FF] hover:text-white border border-[#1E90FF]/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Running Check...' : 'Run & Log to Console'}</span>
        </button>
      </div>

      {report ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          {/* App Config Card */}
          <div className="p-3 rounded-xl bg-[#050811] border border-white/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <Activity className="w-3.5 h-3.5 text-[#1E90FF]" />
              <span>Firebase App Config</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Project: <span className="text-white">{report.appConfig.projectId}</span>
            </p>
            <p className="text-[11px] text-slate-300 break-all">
              Auth Domain: <span className="text-white">{report.appConfig.authDomain}</span>
            </p>
            <p className="text-[11px] text-slate-300 break-all">
              Runtime Host: <span className="text-cyan-300">{report.runtimeHostname}</span>
            </p>
          </div>

          {/* Current User Card */}
          <div className="p-3 rounded-xl bg-[#050811] border border-white/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current User Object</span>
            </div>
            <p className="text-[11px] text-slate-300 break-all">
              Email:{' '}
              <span className={report.currentUser.matchesOwnerEmail ? 'text-emerald-400' : 'text-amber-300'}>
                {report.currentUser.email || 'null (not signed into Firebase Auth)'}
              </span>
              {report.currentUser.identitySource && (
                <span className="text-slate-500"> ({report.currentUser.identitySource})</span>
              )}
            </p>
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
              <span className="break-all">
                UID: <span className="text-slate-200">{report.currentUser.uid || 'null'}</span>
              </span>
              {report.currentUser.uid && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(report.currentUser.uid || '')}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white flex items-center gap-1 flex-shrink-0 cursor-pointer"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>Copy</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-300">
              Verified Owner:{' '}
              <span className={report.currentUser.firebaseGoogleOwnerReady ? 'text-emerald-400' : 'text-amber-300'}>
                {report.currentUser.firebaseGoogleOwnerReady ? 'Yes (Owner Google Auth)' : 'No'}
              </span>
            </p>
            {report.currentUser.signedIn && (
              <p className="text-[11px] text-slate-300">
                ID Token Email Claim:{' '}
                <span className={report.currentUser.hasTokenEmailClaim ? 'text-emerald-400' : 'text-amber-300'}>
                  {report.currentUser.hasTokenEmailClaim ? 'Present' : 'Absent (UID rules mode)'}
                </span>
              </p>
            )}
          </div>

          {/* Firestore Status Card */}
          <div className="p-3 rounded-xl bg-[#050811] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <Database className="w-3.5 h-3.5 text-[#1E90FF]" />
                <span>Firestore Status</span>
              </span>
              {report.firestore.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-300 break-all">
              DB ID: <span className="text-white">{report.firestore.databaseId}</span>
            </p>
            <p className="text-[11px] text-slate-300">
              Connection:{' '}
              <span className={report.firestore.success ? 'text-emerald-400' : 'text-rose-400'}>
                {report.firestore.success ? `Connected (${report.firestore.latencyMs}ms)` : 'Error / Offline'}
              </span>
            </p>
            {report.firestore.adminStatusDoc && (
              <p className="text-[11px] text-slate-300">
                system/admin_status:{' '}
                <span
                  className={
                    report.firestore.adminStatusDoc.exists && report.firestore.adminStatusDoc.matchesOwnerUid
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }
                >
                  {report.firestore.adminStatusDoc.exists
                    ? report.firestore.adminStatusDoc.matchesOwnerUid
                      ? 'Synced & UID Matched'
                      : 'Exists (UID Mismatch)'
                    : report.firestore.adminStatusDoc.error || 'Missing'}
                </span>
              </p>
            )}
            {report.firestore.error && (
              <p className="text-[10px] text-amber-300 break-words">{report.firestore.error}</p>
            )}
          </div>

          {/* Storage Status Card */}
          <div className="p-3 rounded-xl bg-[#050811] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Storage Status</span>
              </span>
              {report.storage.status === 'connected' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-300 break-all">
              Bucket: <span className="text-cyan-300">{report.storage.bucket}</span>
            </p>
            <p className="text-[11px] text-slate-300">
              Status:{' '}
              <span className={report.storage.status === 'connected' ? 'text-emerald-400' : 'text-amber-300'}>
                {report.storage.status} ({report.storage.latencyMs}ms)
              </span>
            </p>
            {report.storage.message && (
              <p className="text-[10px] text-slate-400 break-words">{report.storage.message}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-[#050811] border border-white/10 text-xs font-mono text-slate-400">
          Running initial Firebase connection diagnostics...
        </div>
      )}
    </div>
  );
};
