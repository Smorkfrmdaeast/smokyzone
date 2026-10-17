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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 animate-fadeIn">
      <button
        onClick={onClick}
        aria-label="Open Smoky Zone Studio Control"
        title="Smoky Zone Owner Studio (Authenticated)"
        className="group relative min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full flex items-center gap-2 transition-all duration-300 shadow-2xl cursor-pointer select-none active:scale-95 bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-500/30 border border-emerald-400/50 hover:brightness-110"
      >
        <div className="w-6 h-6 rounded-full bg-black/25 flex items-center justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-bold tracking-wider uppercase font-mono">
          Site Control
        </span>
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </button>
    </div>
  );
};
