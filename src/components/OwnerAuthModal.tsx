import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  X,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Cloud,
  ChevronDown,
  Copy,
} from 'lucide-react';
import {
  hasOwnerPasscodeConfigured,
  setupOwnerPasscode,
  loginOwnerWithPasscode,
  loginOwnerWithGoogle,
  getRateLimitStatus,
} from '../utils/authManager';
import {
  isUserAdminAuthenticated,
  hasFirebaseGoogleOwnerSession,
  OWNER_EMAIL_DISPLAY,
  OWNER_EMAIL,
} from '../utils/siteStore';

interface OwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [showPasscodePanel, setShowPasscodePanel] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(() => !hasOwnerPasscodeConfigured());
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!isOpen) return;

    // Instant entry if already verified
    if (isUserAdminAuthenticated() || hasFirebaseGoogleOwnerSession()) {
      console.info('[SmokyZone Auth] OwnerAuthModal detected active verified owner session -> opening Studio');
      onSuccessRef.current();
      return;
    }

    setEmail(OWNER_EMAIL);
    setPasscode('');
    setConfirmPasscode('');
    setShowPasscode(false);
    setShowPasscodePanel(false);
    setIsFirstTimeSetup(!hasOwnerPasscodeConfigured());
    setErrorMsg('');
    setUnauthorizedHost(null);
    setCopiedHost(false);
    setSuccessMsg('');

    const rateLimit = getRateLimitStatus();
    setRateLimitSeconds(rateLimit.isLocked ? rateLimit.remainingSeconds : 0);
  }, [isOpen]);

  // Trigger Studio immediately if auth state updates while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleAuthReady = () => {
      if (isUserAdminAuthenticated() || hasFirebaseGoogleOwnerSession()) {
        onSuccessRef.current();
      }
    };
    window.addEventListener('smokyzone_auth_change', handleAuthReady);
    return () => window.removeEventListener('smokyzone_auth_change', handleAuthReady);
  }, [isOpen]);

  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const interval = window.setInterval(() => {
      setRateLimitSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitSeconds]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (isLoading || isGoogleLoading) return;
    setErrorMsg('');
    setUnauthorizedHost(null);
    setSuccessMsg('');
    setIsGoogleLoading(true);

    try {
      await loginOwnerWithGoogle({ forceAccountChooser: true });
      setSuccessMsg('Approved Google account verified. Checking Cloud Firestore & Storage access…');
      onSuccessRef.current();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setErrorMsg(msg);
      if (msg.includes('auth/unauthorized-domain') && typeof window !== 'undefined') {
        setUnauthorizedHost(window.location.hostname);
        setShowPasscodePanel(true);
      } else if (msg.includes('popup-blocked')) {
        setShowPasscodePanel(true);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimitSeconds > 0 || isLoading || isGoogleLoading) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isFirstTimeSetup) {
        await setupOwnerPasscode(email, passcode, confirmPasscode);
        setSuccessMsg('Local passcode saved! Opening Owner Studio...');
      } else {
        await loginOwnerWithPasscode(email, passcode);
        setSuccessMsg('Local passcode verified! Opening Owner Studio...');
      }
      onSuccessRef.current();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Login failed. Please check your details.');
      const rateLimit = getRateLimitStatus();
      if (rateLimit.isLocked) {
        setRateLimitSeconds(rateLimit.remainingSeconds);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#091124] border border-[#1E90FF]/30 p-6 sm:p-7 shadow-2xl shadow-[#1E90FF]/20 text-left max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Owner Shield Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#1E90FF]/15 border border-[#1E90FF]/40 text-[#1E90FF] flex items-center justify-center mb-4">
          <Lock className="w-5 h-5" />
        </div>

        <h3
          id="auth-modal-title"
          className="text-xl font-bold text-white font-['Outfit',sans-serif] tracking-tight mb-1.5"
        >
          Owner Studio Login
        </h3>

        <p className="text-sm text-slate-300 leading-relaxed mb-5">
          Sign in with your verified Google account to unlock Owner Studio with live Cloud Firestore &amp; Firebase Storage sync.
        </p>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="mb-4 flex flex-col gap-2 text-rose-300 text-xs p-3 rounded-xl bg-rose-950/50 border border-rose-500/35 leading-relaxed">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            {unauthorizedHost && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-rose-500/20">
                <span className="font-mono text-[11px] text-white truncate">{unauthorizedHost}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedHost);
                    setCopiedHost(true);
                    setTimeout(() => setCopiedHost(false), 2500);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1 flex-shrink-0 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedHost ? 'Copied' : 'Copy Domain'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 text-emerald-300 text-xs p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/35">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Primary Cloud-Verified Google Login */}
        <div className="p-4 rounded-xl bg-[#050811] border border-[#1E90FF]/35 space-y-3 mb-4">
          <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
            <Cloud className="w-3.5 h-3.5" />
            <span>Full Cloud Firestore &amp; Storage Access</span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-lg shadow-[#1E90FF]/25 cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>
              {isGoogleLoading
                ? 'Connecting Google Account...'
                : 'Continue with Google (either approved account)'}
            </span>
          </button>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Recommended: authenticates directly to Firebase so audio uploads, photos, and edits save across all devices immediately.
          </p>
        </div>

        {/* Secondary Local Passcode Fallback */}
        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setShowPasscodePanel((prev) => !prev)}
            className="w-full py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <span>Offline / Local Passcode Fallback</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showPasscodePanel ? 'rotate-180' : ''}`}
            />
          </button>

          {showPasscodePanel && (
            <div className="mt-3 space-y-3.5 animate-fadeIn">
              {rateLimitSeconds > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-mono">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>Passcode locked. Wait {rateLimitSeconds}s or use Google Sign-In above.</span>
                </div>
              )}

              <p className="text-[11px] text-amber-300/90 leading-relaxed bg-amber-950/30 border border-amber-500/25 rounded-lg p-2.5">
                Note: Local passcode unlocks editing on this browser only. Firebase security rules require Google Sign-In above to publish to Cloud Firestore or Storage.
              </p>

              <form onSubmit={handlePasscodeSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="owner-email"
                    className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5"
                  >
                    Owner Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="owner-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-sm font-mono focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="owner-passcode"
                    className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5"
                  >
                    {isFirstTimeSetup ? 'Create Passcode (min 4 chars)' : 'Owner Passcode'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="owner-passcode"
                      type={showPasscode ? 'text' : 'password'}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder={isFirstTimeSetup ? 'Enter new passcode' : 'Enter your passcode'}
                      required
                      autoComplete={isFirstTimeSetup ? 'new-password' : 'current-password'}
                      className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-sm focus:border-[#1E90FF] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode((prev) => !prev)}
                      aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isFirstTimeSetup && (
                  <div>
                    <label
                      htmlFor="owner-passcode-confirm"
                      className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5"
                    >
                      Confirm Passcode
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="owner-passcode-confirm"
                        type={showPasscode ? 'text' : 'password'}
                        value={confirmPasscode}
                        onChange={(e) => setConfirmPasscode(e.target.value)}
                        placeholder="Re-enter passcode"
                        required
                        autoComplete="new-password"
                        className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-sm focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading || rateLimitSeconds > 0}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 disabled:opacity-60 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  {isLoading
                    ? 'Verifying...'
                    : isFirstTimeSetup
                    ? 'Save Local Passcode & Enter'
                    : 'Unlock with Local Passcode'}
                </button>
              </form>

              {!isFirstTimeSetup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsFirstTimeSetup(true);
                    setErrorMsg('');
                    setPasscode('');
                    setConfirmPasscode('');
                  }}
                  className="w-full py-1 text-center text-xs text-slate-400 hover:text-[#1E90FF] transition-colors cursor-pointer"
                >
                  Forgot passcode or new device? Set new passcode
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1E90FF] flex-shrink-0" />
          <span>Approved owner accounts only · Stays signed in until logout</span>
        </div>
      </div>
    </div>
  );
};
