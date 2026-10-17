import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  ArrowRight,
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  checkOwnerAccountStatus,
  createOwnerAccount,
  loginOwner,
  requestPasswordReset,
  getRateLimitStatus,
} from '../utils/authManager';

interface OwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setIsLoading(true);

      // Check rate limit
      const rateLimit = getRateLimitStatus();
      if (rateLimit.isLocked) {
        setRateLimitSeconds(rateLimit.remainingSeconds);
      } else {
        setRateLimitSeconds(0);
      }

      // Check owner account status in Firestore / local
      checkOwnerAccountStatus()
        .then((status) => {
          setIsFirstTimeSetup(!status.ownerExists);
          if (status.ownerEmail) {
            setEmail(status.ownerEmail);
          }
        })
        .catch(() => {
          setIsFirstTimeSetup(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  // Rate limit countdown timer
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (rateLimitSeconds > 0) {
      setErrorMsg(`Too many failed attempts. Please wait ${rateLimitSeconds}s.`);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid owner email address.');
      return;
    }

    // Forgot password flow
    if (isForgotPassword) {
      setIsLoading(true);
      try {
        await requestPasswordReset(email.trim());
        setSuccessMsg(`Password reset instructions have been dispatched to ${email}. Check your inbox.`);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to send reset email.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // First-time owner registration flow
    if (isFirstTimeSetup) {
      if (password.length < 10) {
        setErrorMsg('Strong password required: minimum 10 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Password confirmation does not match.');
        return;
      }

      setIsLoading(true);
      try {
        await createOwnerAccount(email.trim(), password);
        setSuccessMsg('Owner account initialized successfully! Logging you in...');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Account creation failed.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Normal Owner Login flow
    if (!password) {
      setErrorMsg('Please enter your owner password.');
      return;
    }

    setIsLoading(true);
    try {
      await loginOwner(email.trim(), password);
      setSuccessMsg('Authentication verified. Welcome back, Smork.');
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (err: unknown) {
      const rateLimit = getRateLimitStatus();
      if (rateLimit.isLocked) {
        setRateLimitSeconds(rateLimit.remainingSeconds);
      }
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
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
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#091124] border border-[#1E90FF]/30 p-6 sm:p-8 shadow-2xl shadow-[#1E90FF]/20 text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock / Shield Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#1E90FF]/15 border border-[#1E90FF]/40 text-[#1E90FF] flex items-center justify-center mb-4 shadow-lg shadow-[#1E90FF]/20">
          <KeyRound className="w-6 h-6" />
        </div>

        <h3 id="auth-modal-title" className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight mb-1">
          {isForgotPassword
            ? 'Reset Owner Password'
            : isFirstTimeSetup
            ? 'First-Time Owner Setup'
            : 'Smoky Zone Studio Access'}
        </h3>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          {isForgotPassword
            ? 'Enter your registered owner email to receive a secure Firebase password reset link.'
            : isFirstTimeSetup
            ? 'Create your private owner account with your email and a strong password (minimum 10 characters). Public sign-up will be disabled permanently once created.'
            : 'Sign in with your owner credentials to manage the official playlist, upload media, and update site content.'}
        </p>

        {/* Rate Limit Banner */}
        {rateLimitSeconds > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-mono">
            <Clock className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <span>Login rate limited. Please wait {rateLimitSeconds}s before attempting again.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 tracking-wider">
              Owner Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="smork@smokyzone.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#050811] border border-white/15 text-white text-sm focus:border-[#1E90FF] focus:outline-none transition-colors font-mono tracking-wider"
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {!isForgotPassword && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase text-slate-300 tracking-wider">
                  {isFirstTimeSetup ? 'Create Strong Password' : 'Owner Password'}
                </label>
                {isFirstTimeSetup && (
                  <span className="text-[10px] font-mono text-[#1E90FF]">Min 10 characters</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder={isFirstTimeSetup ? 'Minimum 10 characters' : 'Enter your password'}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#050811] border border-white/15 text-white text-sm focus:border-[#1E90FF] focus:outline-none transition-colors pr-10 font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {isFirstTimeSetup && !isForgotPassword && (
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 tracking-wider">
                Confirm Strong Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Re-enter password"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#050811] border border-white/15 text-white text-sm focus:border-[#1E90FF] focus:outline-none transition-colors font-mono tracking-wider"
              />
            </div>
          )}

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="flex items-center gap-2 text-rose-400 text-xs p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 font-mono">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isFirstTimeSetup && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(!isForgotPassword);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-[#1E90FF] hover:underline cursor-pointer min-h-[44px] flex items-center font-mono"
              >
                {isForgotPassword ? '← Back to Owner Login' : 'Forgot password?'}
              </button>
              <span className="text-[10px] text-slate-500 font-mono">15m Auto-Logout Active</span>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || rateLimitSeconds > 0}
              className="flex-1 min-h-[44px] py-3 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-[#1E90FF]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying...</span>
              ) : isForgotPassword ? (
                <span>Send Reset Link</span>
              ) : isFirstTimeSetup ? (
                <>
                  <Shield className="w-3.5 h-3.5" /> Initialize Owner Account
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Sign In To Studio
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
