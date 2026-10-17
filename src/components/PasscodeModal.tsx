import React, { useState } from 'react';
import { Lock, KeyRound, Check, X, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { verifyAdminPasscode } from '../utils/siteStore';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Please enter your admin passcode');
      return;
    }

    const isValid = verifyAdminPasscode(passcode.trim(), rememberMe);
    if (isValid) {
      setErrorMsg('');
      setPasscode('');
      onSuccess();
    } else {
      setErrorMsg('Incorrect passcode. Default passcode is smork2026');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#091124] border border-[#1E90FF]/30 p-6 sm:p-8 shadow-2xl shadow-[#1E90FF]/20 text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock Emblem */}
        <div className="w-12 h-12 rounded-xl bg-[#1E90FF]/15 border border-[#1E90FF]/40 text-[#1E90FF] flex items-center justify-center mb-4 shadow-lg shadow-[#1E90FF]/20">
          <KeyRound className="w-6 h-6" />
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight mb-1">
          Smoky Zone Studio Access
        </h3>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Enter your owner passcode to upload photos, videos, music, and update live site content from your phone or laptop.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 tracking-wider">
              Admin Passcode
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Enter passcode (default: smork2026)"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#050811] border border-white/15 text-white text-sm focus:border-[#1E90FF] focus:outline-none transition-colors pr-10 font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-2 font-mono">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-[#050811] border-white/20 text-[#1E90FF] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember on this device</span>
            </label>
            <span className="font-mono text-[10px] text-slate-300">Default: smork2026</span>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-[#1E90FF]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" /> Unlock Studio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
