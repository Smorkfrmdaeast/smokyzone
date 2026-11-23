import React from 'react';
import { Home, Compass, Headphones, Sparkles, ArrowLeft, MessageSquare } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
  onNavigateSection?: (sectionId: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome, onNavigateSection }) => {
  return (
    <main
      className="min-h-screen bg-[#050811] text-[#94a3b8] flex flex-col items-center justify-center p-4 relative overflow-hidden"
      role="main"
      aria-label="Page Not Found"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1E90FF]/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full text-center space-y-8 bg-[#0A192F]/80 backdrop-blur-xl border border-[#1E90FF]/30 p-8 sm:p-12 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        {/* Animated Brand Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1E90FF]/10 border border-[#1E90FF]/30 text-[#1E90FF] text-xs font-mono uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smoky Zone · 404 Experience</span>
        </div>

        {/* 404 Headline */}
        <div className="space-y-3">
          <h1 className="text-7xl sm:text-8xl font-black text-white font-['Outfit',sans-serif] tracking-tight bg-gradient-to-r from-white via-slate-200 to-[#1E90FF] bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Outfit',sans-serif]">
            Lost In The Smoke
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
            The track or page you are looking for has been moved, archived, or never existed in the official catalog.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onGoHome}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-full bg-[#1E90FF] hover:bg-[#1873cc] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(30,144,255,0.4)] transition-all transform active:scale-95 cursor-pointer"
            aria-label="Return to Smoky Zone homepage"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Smoky Zone</span>
          </button>
        </div>

        {/* Quick Explore Links */}
        <div className="pt-6 border-t border-white/10 space-y-3">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            Quick Portals
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            <button
              onClick={() => {
                onGoHome();
                setTimeout(() => onNavigateSection?.('tech'), 100);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-[#1E90FF]/15 hover:border-[#1E90FF]/40 border border-white/5 text-slate-300 hover:text-white transition-all text-center flex flex-col items-center gap-1 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#1E90FF]" />
              <span>Tech Services</span>
            </button>
            <button
              onClick={() => {
                onGoHome();
                setTimeout(() => onNavigateSection?.('celebrity'), 100);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-[#1E90FF]/15 hover:border-[#1E90FF]/40 border border-white/5 text-slate-300 hover:text-white transition-all text-center flex flex-col items-center gap-1 cursor-pointer"
            >
              <Headphones className="w-4 h-4 text-[#1E90FF]" />
              <span>Music Player</span>
            </button>
            <button
              onClick={() => {
                onGoHome();
                setTimeout(() => onNavigateSection?.('contact'), 100);
              }}
              className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/5 hover:bg-[#1E90FF]/15 hover:border-[#1E90FF]/40 border border-white/5 text-slate-300 hover:text-white transition-all text-center flex flex-col items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#1E90FF]" />
              <span>Contact Smork</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
