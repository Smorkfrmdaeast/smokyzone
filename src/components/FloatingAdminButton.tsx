import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Sparkles, Sliders } from 'lucide-react';
import { isUserAdminAuthenticated } from '../utils/siteStore';

interface FloatingAdminButtonProps {
  onClick: () => void;
}

export const FloatingAdminButton: React.FC<FloatingAdminButtonProps> = ({ onClick }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(isUserAdminAuthenticated());

    const handleAuthChange = () => {
      setIsAdmin(isUserAdminAuthenticated());
    };

    window.addEventListener('smokyzone_auth_change', handleAuthChange);
    return () => window.removeEventListener('smokyzone_auth_change', handleAuthChange);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <button
        onClick={onClick}
        aria-label="Open Smoky Zone Studio Control"
        className={`group relative min-h-[48px] px-4 rounded-full flex items-center gap-2.5 transition-all duration-300 shadow-2xl cursor-pointer select-none active:scale-95 ${
          isAdmin
            ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-500/30 border border-emerald-400/50'
            : 'bg-[#091124] hover:bg-[#0D182F] text-slate-300 hover:text-white border border-[#1E90FF]/40 hover:border-[#1E90FF] shadow-[#1E90FF]/25'
        }`}
      >
        {isAdmin ? (
          <>
            <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-wider uppercase font-mono">
              Site Control
            </span>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full bg-[#1E90FF]/20 flex items-center justify-center text-[#1E90FF] group-hover:scale-110 transition-transform">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-200 group-hover:text-white font-mono hidden sm:inline-block">
              Site Control
            </span>
          </>
        )}
      </button>
    </div>
  );
};
