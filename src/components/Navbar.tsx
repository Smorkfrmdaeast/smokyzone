import React, { useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  onNavigate: (id: string) => void;
  onOpenAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, onOpenAdmin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#050811]/90 backdrop-blur-md border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element in display face) */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('home');
          }}
          className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-widest text-white hover:text-[#1E90FF] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="text-[#1E90FF]">SMOKY</span> ZONE
        </a>

        {/* Zone 2: 4-5 concise single-line nav links with subtle hover states */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-300">
          <button
            onClick={() => handleLinkClick('about')}
            className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => handleLinkClick('tech')}
            className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Smork's Tech
          </button>
          <button
            onClick={() => handleLinkClick('unfiltered')}
            className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Unfiltered
          </button>
          <button
            onClick={() => handleLinkClick('celebrity')}
            className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Celebrity Smork
          </button>
          <button
            onClick={() => handleLinkClick('portfolio')}
            className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Portfolio
          </button>
          <button
            onClick={() => handleLinkClick('contact')}
            className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Contact
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#1E90FF] transition-colors border border-white/10"
              title="Site Control & Media Studio"
              aria-label="Open Site Control"
            >
              <i className="fa-solid fa-sliders text-sm" />
            </button>
          )}
          <button
            onClick={() => handleLinkClick('contact')}
            className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#1E90FF] hover:bg-[#1873cc] rounded-lg transition-all shadow-md shadow-[#1E90FF]/25 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            Work With Smork <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-300 hover:text-white focus:outline-none cursor-pointer"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-x-0 top-20 bg-[#050811]/98 border-b border-white/10 px-6 py-8 transition-all duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto block' : 'opacity-0 pointer-events-none hidden'
        }`}
      >
        <div className="flex flex-col gap-5 text-base font-semibold text-white">
          <button
            onClick={() => handleLinkClick('home')}
            className="text-left py-2 border-b border-white/5 hover:text-[#1E90FF]"
          >
            Home
          </button>
          <button
            onClick={() => handleLinkClick('about')}
            className="text-left py-2 border-b border-white/5 hover:text-[#1E90FF]"
          >
            About Smork
          </button>
          <button
            onClick={() => handleLinkClick('tech')}
            className="text-left py-2 border-b border-white/5 hover:text-[#1E90FF]"
          >
            Smork's Tech (Web, Flashing & VA)
          </button>
          <button
            onClick={() => handleLinkClick('unfiltered')}
            className="text-left py-2 border-b border-white/5 hover:text-[#1E90FF]"
          >
            Smork Unfiltered
          </button>
          <button
            onClick={() => handleLinkClick('celebrity')}
            className="text-left py-2 border-b border-white/5 hover:text-[#1E90FF]"
          >
            Celebrity Smork 💙💫
          </button>
          <button
            onClick={() => handleLinkClick('portfolio')}
            className="text-left py-2 border-b border-white/5 hover:text-[#1E90FF]"
          >
            Projects & Portfolio
          </button>
          <button
            onClick={() => handleLinkClick('contact')}
            className="text-left py-2 border-b border-white/5 hover:text-[#1E90FF]"
          >
            Contact & Connect
          </button>

          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={() => handleLinkClick('contact')}
              className="w-full py-3 text-center text-xs uppercase tracking-wider font-bold rounded-lg bg-[#1E90FF] text-white shadow-lg shadow-[#1E90FF]/30 cursor-pointer"
            >
              Work With Smork
            </button>
            {onOpenAdmin && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="w-full py-2.5 text-center text-xs uppercase tracking-wider font-semibold rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                Owner Site Control Studio 🔐
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
