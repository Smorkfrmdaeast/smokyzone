import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { SmorksTechLogo } from './components/SmorksTechLogo';
import { AudioPlayer } from './components/AudioPlayer';
import { UnfilteredShowcase } from './components/UnfilteredShowcase';
import { ProjectModal } from './components/ProjectModal';
import { CelebrityVideoModal } from './components/CelebrityVideoModal';
import { ImageSlot } from './components/ImageSlot';
import {
  SMORK_BIO,
  TECH_SERVICES,
  PORTFOLIO_PROJECTS,
  UNFILTERED_THOUGHTS,
  CELEBRITY_SMORK_CONTENT,
  VIDEO_PREVIEW_CLIPS,
  SOCIAL_PROFILES,
  PortfolioProject,
  VideoClipItem,
} from './data';
import {
  ArrowRight,
  Code2,
  Headphones,
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle,
  ExternalLink,
  Laptop,
  Compass,
  Flame,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  FileText,
  Play,
  Film,
  Award,
  Radio,
  Music,
} from 'lucide-react';

export const App: React.FC = () => {
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<'all' | 'web' | 'phone' | 'va'>('all');
  const [selectedProjectCategory, setSelectedProjectCategory] = useState<'all' | 'web' | 'phone' | 'va' | 'marketing'>('all');
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);
  const [activeVideoClip, setActiveVideoClip] = useState<VideoClipItem | null>(null);

  // Contact form state
  const [contactCategory, setContactCategory] = useState<string>('Phone Flashing & Software Resets');
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) return;

    // Direct mailto link for immediate contact
    const subject = encodeURIComponent(`[Smoky Zone Inquiry] ${contactCategory} from ${contactName || 'Visitor'}`);
    const body = encodeURIComponent(
      `Name: ${contactName}\nEmail: ${contactEmail}\nCategory: ${contactCategory}\n\nMessage:\n${contactMessage}`
    );
    window.open(`mailto:${SMORK_BIO.email}?subject=${subject}&body=${body}`, '_blank');

    setFormSubmitted(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setFormSubmitted(false);
    }, 5000);
  };

  const filteredServices = TECH_SERVICES.filter(
    (s) => selectedServiceCategory === 'all' || s.category === selectedServiceCategory
  );

  const filteredProjects = PORTFOLIO_PROJECTS.filter(
    (p) => selectedProjectCategory === 'all' || p.category === selectedProjectCategory
  );

  return (
    <div className="min-h-screen bg-[#050811] text-[#94a3b8] font-['Plus_Jakarta_Sans',sans-serif] relative selection:bg-[#1E90FF] selection:text-white">
      {/* Universal Top Bar */}
      <Navbar onNavigate={scrollTo} />

      <main className="pt-20">
        {/* ========================================================================= */}
        {/* SECTION A: HOME — MEET SMORK */}
        {/* ========================================================================= */}
        <section
          id="home"
          className="relative min-h-[90vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10 overflow-hidden"
        >
          {/* Electric blue ambient glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#1E90FF]/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Typographic & Identity Hierarchy */}
            <div className="lg:col-span-7 text-left">
              {/* Origin metadata */}
              <div className="flex items-center gap-2 text-xs font-mono text-[#1E90FF] mb-4">
                <span>{SMORK_BIO.alias}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">{SMORK_BIO.fullName}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">{SMORK_BIO.origin} 🇳🇬</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6 font-['Outfit',sans-serif]">
                ONE MIND. <span className="text-[#1E90FF]">DIFFERENT WORLDS.</span> ONE AUTHENTIC JOURNEY.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
                {SMORK_BIO.subheadline}
              </p>

              {/* Roles unboxed list */}
              <div className="text-xs font-medium text-slate-400 mb-8 flex flex-wrap gap-y-1 gap-x-2">
                <span>Web Developer</span>
                <span aria-hidden="true" className="text-[#1E90FF]">/</span>
                <span className="text-[#1E90FF] font-semibold">Phone Flashing & Software Resets</span>
                <span aria-hidden="true" className="text-[#1E90FF]">/</span>
                <span>Virtual Assistant</span>
                <span aria-hidden="true" className="text-[#1E90FF]">/</span>
                <span>Digital Entrepreneur</span>
                <span aria-hidden="true" className="text-[#1E90FF]">/</span>
                <span>Content Creator</span>
                <span aria-hidden="true" className="text-[#1E90FF]">/</span>
                <span>Entertainment Personality</span>
              </div>

              {/* Navigation & Direct Action CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`${SMORK_BIO.whatsappUrl}?text=${encodeURIComponent(
                    "Hello Smork, I'm reaching out from your official website regarding Phone Flashing & Software Resets / Web Development / Virtual Assistant."
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-brands fa-whatsapp text-base" /> Chat on WhatsApp
                </a>

                <button
                  onClick={() => scrollTo('celebrity')}
                  className="px-5 py-3 rounded-lg bg-[#1E90FF] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1873cc] transition-all shadow-lg shadow-[#1E90FF]/30 flex items-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4" /> Celebrity Smork 💙💫
                </button>

                <button
                  onClick={() => scrollTo('unfiltered')}
                  className="px-5 py-3 rounded-lg bg-[#0F1D38] border border-white/10 text-white text-xs font-semibold uppercase tracking-wider hover:border-[#1E90FF]/50 hover:text-[#1E90FF] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4" /> Smork Unfiltered
                </button>

                <button
                  onClick={() => scrollTo('portfolio')}
                  className="px-5 py-3 rounded-lg bg-transparent border border-white/15 text-slate-300 text-xs font-semibold uppercase tracking-wider hover:text-white hover:border-white/40 transition-all flex items-center gap-2 cursor-pointer"
                >
                  Projects & Work
                </button>
              </div>

              {/* Social Handles */}
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-4 text-slate-400 text-sm">
                <span className="font-mono text-xs text-[#1E90FF]">{SMORK_BIO.handle}</span>
                <div className="flex items-center gap-3">
                  <a
                    href="https://tiktok.com/@Smorkfrmdaeast"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#1E90FF] transition-colors"
                    title="TikTok"
                  >
                    <i className="fa-brands fa-tiktok" />
                  </a>
                  <a
                    href="https://youtube.com/@Smorkfrmdaeast"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#1E90FF] transition-colors"
                    title="YouTube"
                  >
                    <i className="fa-brands fa-youtube" />
                  </a>
                  <a
                    href="https://instagram.com/Smork_frmdaeast"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#1E90FF] transition-colors"
                    title="Instagram"
                  >
                    <i className="fa-brands fa-instagram" />
                  </a>
                  <a
                    href="https://wa.me/2349019071679"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#1E90FF] transition-colors"
                    title="WhatsApp"
                  >
                    <i className="fa-brands fa-whatsapp" />
                  </a>
                  <a
                    href="https://x.com/Smorkfrmdaeast"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#1E90FF] transition-colors"
                    title="X (Twitter)"
                  >
                    <i className="fa-brands fa-x-twitter" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Authentic Portrait Presentation */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative group w-full max-w-sm">
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#1E90FF]/40 bg-[#0F1D38] shadow-[0_15px_40px_rgba(0,0,0,0.8)] aspect-[3/4]">
                  <ImageSlot
                    src="/images/celebrity_smork.jpg"
                    fallbackSrc="/images/IMG_20250105_181849.jpg"
                    alt="Ifeanyi Emmanuel Nnamani (Smork) Authentic Portrait"
                    storageKey="hero_portrait"
                    slotLabel="Set Authentic Portrait"
                    allowUpload={true}
                    className="w-full h-full object-cover object-top photo-natural group-hover:scale-102 transition-transform duration-500"
                  />
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#050811] via-[#050811]/70 to-transparent">
                    <p className="text-white font-bold font-['Outfit',sans-serif] text-lg">
                      {SMORK_BIO.fullName}
                    </p>
                    <p className="text-xs font-mono text-[#1E90FF]">
                      SMORK · {SMORK_BIO.handle}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                  <span>Authentic Portrait · No Filter</span>
                  <span>Eastern Nigeria 📍</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION B: ABOUT SMORK */}
        {/* ========================================================================= */}
        <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#02040A]">
          <div className="max-w-6xl mx-auto">
            <div className="text-left mb-12">
              <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-2">
                Origin & Journey
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit',sans-serif]">
                About Ifeanyi Emmanuel Nnamani
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start text-left">
              {/* Left Column: Narrative Story */}
              <div className="lg:col-span-7 space-y-6 text-slate-300 leading-relaxed text-sm sm:text-base">
                {SMORK_BIO.aboutStory.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}

                <div className="p-6 rounded-2xl bg-[#0F1D38]/60 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold font-['Outfit',sans-serif]">
                    <ShieldCheck className="w-5 h-5 text-[#1E90FF]" />
                    <span>The Triple Brand Identity</span>
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#1E90FF] font-bold">1. Smork's Tech:</span>
                      <span>Frontend web development, phone software flashing, and virtual administration.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#1E90FF] font-bold">2. Smork Unfiltered:</span>
                      <span>Unedited personal reflections, resilience in adversity, and honest real-life storytelling.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#1E90FF] font-bold">3. Celebrity Smork 💙💫:</span>
                      <span>Music reactions, Bronx and global drill breakdowns, and Eastern upcoming artist discovery.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Values & Highlights */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 rounded-2xl bg-[#0F1D38]/40 border border-white/5 space-y-4">
                  <h3 className="text-lg font-bold text-white font-['Outfit',sans-serif]">
                    Foundational Principles
                  </h3>
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-[#1E90FF] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">Absolute Authenticity</strong>
                        <span className="text-slate-400">Never disguising limitations behind artificial perfection.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-[#1E90FF] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">Spiritual Grounding</strong>
                        <span className="text-slate-400">Rooted in faith, discipline, and daily self-examination.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-[#1E90FF] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">Hustle & Continuous Learning</strong>
                        <span className="text-slate-400">Self-taught programming, flashing firmware, and creating content.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0F1D38] to-[#0A192F] border border-[#1E90FF]/30 space-y-3">
                  <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-wider block">
                    Direct Contact
                  </span>
                  <p className="text-white font-bold text-sm">
                    Ready to build a website, recover phone firmware, or collaborate on content?
                  </p>
                  <a
                    href={SMORK_BIO.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 hover:text-emerald-300"
                  >
                    <span>Connect on WhatsApp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION C: SMORK'S TECH (SERVICES & CAPABILITIES) */}
        {/* ========================================================================= */}
        <section id="tech" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#050811]">
          <div className="max-w-6xl mx-auto">
            {/* Header & Logo Lockup */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 text-left">
              <div>
                <SmorksTechLogo className="mb-4" />
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit',sans-serif]">
                  Web Engineering, Phone Flashing & Virtual Assistance
                </h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-xl mt-2">
                  Building dependable, fast web applications, providing specialized mobile firmware flashing & software resets, and optimizing client daily operations.
                </p>
              </div>

              {/* Service Category Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0F1D38] border border-white/10 rounded-xl">
                <button
                  onClick={() => setSelectedServiceCategory('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedServiceCategory === 'all'
                      ? 'bg-[#1E90FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Services ({TECH_SERVICES.length})
                </button>
                <button
                  onClick={() => setSelectedServiceCategory('web')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedServiceCategory === 'web'
                      ? 'bg-[#1E90FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Web Development
                </button>
                <button
                  onClick={() => setSelectedServiceCategory('phone')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedServiceCategory === 'phone'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-emerald-400 hover:text-white'
                  }`}
                >
                  Phone Flashing & Resets
                </button>
                <button
                  onClick={() => setSelectedServiceCategory('va')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedServiceCategory === 'va'
                      ? 'bg-[#1E90FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Virtual Assistance
                </button>
              </div>
            </div>

            {/* Computer Setup Spotlight */}
            <div className="mb-14 rounded-2xl overflow-hidden border border-white/10 bg-[#0F1D38] grid grid-cols-1 lg:grid-cols-12 text-left">
              <div className="lg:col-span-5 h-64 lg:h-auto relative overflow-hidden bg-black">
                <ImageSlot
                  src="/images/workspace_flashing.jpg"
                  fallbackSrc="/images/StockCake-Neon Music Studio_1758587212.jpg"
                  alt="Smork's Tech Workspace"
                  storageKey="tech_setup"
                  slotLabel="Set Workstation Photo"
                  className="w-full h-full object-cover photo-natural"
                />
                <div className="absolute top-3 left-3 bg-[#050811]/80 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-mono text-[#1E90FF] border border-white/10">
                  <span>Workstation Lab</span>
                </div>
              </div>

              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
                <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-wider mb-2">
                  The Tech Workshop
                </span>
                <h3 className="text-2xl font-bold text-white mb-3 font-['Outfit',sans-serif]">
                  Where Ideas Become Clean, Working Code & Solutions
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  Every website, firmware flash, software reset, and virtual assistant flow is executed with thorough attention to detail. No bloated corporate overhead—just dedicated engineering, fast turnaround, and clear communication.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="#contact"
                    onClick={() => {
                      setContactCategory('Phone Flashing & Software Resets');
                      scrollTo('contact');
                    }}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Book Phone Flashing / Reset
                  </a>
                  <a
                    href="#contact"
                    onClick={() => {
                      setContactCategory('Web Development');
                      scrollTo('contact');
                    }}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg bg-[#1E90FF] text-white hover:bg-[#1873cc] transition-colors shadow-md shadow-[#1E90FF]/30"
                  >
                    Request Web Development
                  </a>
                  <a
                    href="#contact"
                    onClick={() => {
                      setContactCategory('Virtual Assistant Services');
                      scrollTo('contact');
                    }}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg bg-transparent border border-[#1E90FF] text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors"
                  >
                    Book Virtual Assistant
                  </a>
                </div>
              </div>
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="p-6 rounded-2xl bg-[#0F1D38]/50 border border-white/5 hover:border-[#1E90FF]/40 hover:bg-[#0F1D38] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 text-[#1E90FF] border border-white/5">
                        {service.category === 'web'
                          ? 'Web Dev'
                          : service.category === 'phone'
                          ? 'Phone Flashing'
                          : 'Virtual Assistant'}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-2 font-['Outfit',sans-serif]">
                      {service.title}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      {service.description}
                    </p>

                    <div className="space-y-1.5 mb-6">
                      {service.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle className="w-3.5 h-3.5 text-[#1E90FF] flex-shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <a
                    href="#contact"
                    onClick={() => {
                      setContactCategory(service.title);
                      scrollTo('contact');
                    }}
                    className="text-xs font-semibold text-[#1E90FF] hover:text-white transition-colors flex items-center gap-1 pt-3 border-t border-white/5"
                  >
                    <span>Get Quote / Inquire</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION D: SMORK UNFILTERED (WALK-IN VISUAL & AUDIO PLAYER) */}
        {/* ========================================================================= */}
        <section id="unfiltered" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#02040A]">
          <div className="max-w-6xl mx-auto">
            <div className="text-left mb-12">
              <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-2">
                Life, Struggles & Real Conversations
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit',sans-serif]">
                SMORK UNFILTERED
              </h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-xl mt-2">
                A sanctuary of raw thoughts, overcoming limitations, and embracing the battles behind quiet victories.
              </p>
            </div>

            {/* Unfiltered Showcase: Primary Walk-In Visual & Audio Player */}
            <div className="mb-16">
              <UnfilteredShowcase />
            </div>

            {/* Unfiltered Thoughts & Reflections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {UNFILTERED_THOUGHTS.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl bg-[#0F1D38]/40 border border-white/5 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[11px] font-mono text-[#1E90FF] uppercase tracking-wider block mb-2">
                      {item.topic}
                    </span>
                    <blockquote className="text-base sm:text-lg font-semibold text-white mb-3 italic">
                      "{item.quote}"
                    </blockquote>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {item.reflection}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION E: CELEBRITY SMORK 💙💫 (BANDANA SPOTLIGHT, PLAYLIST & VIDEOS) */}
        {/* ========================================================================= */}
        <section id="celebrity" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#050811] relative overflow-hidden">
          {/* Subtle neon glow */}
          <div className="absolute top-1/3 -right-20 w-96 h-96 bg-[#1E90FF]/10 blur-[140px] rounded-full pointer-events-none" />

          <div className="max-w-6xl mx-auto relative z-10">
            {/* Header */}
            <div className="text-left mb-12">
              <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-2">
                Entertainment & Cultural Personality
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit',sans-serif] flex items-center gap-3">
                CELEBRITY SMORK <span className="text-[#1E90FF]">💙💫</span>
              </h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-xl mt-2">
                Entertainment commentary, music reactions, drill breakdowns, and unapologetic spotlighting of authentic Eastern Nigerian talent.
              </p>
            </div>

            {/* CELEBRITY SMORK BANDANA SPOTLIGHT CARD */}
            <div className="mb-16 rounded-3xl overflow-hidden border-2 border-[#1E90FF]/40 bg-gradient-to-br from-[#0F1D38] via-[#0A192F] to-[#050811] shadow-[0_20px_60px_rgba(30,144,255,0.22)] grid grid-cols-1 lg:grid-cols-12 text-left">
              {/* Bandana Photo Frame */}
              <div className="lg:col-span-5 relative bg-black aspect-[3/4] sm:aspect-[4/5] overflow-hidden group">
                <ImageSlot
                  src="/images/celebrity_smork.jpg"
                  fallbackSrc="/images/IMG_20250105_181849.jpg"
                  alt="Celebrity Smork 💙💫 — Authentic Portrait with Bandana"
                  storageKey="celebrity_bandana_photo"
                  slotLabel="Set Bandana Photo"
                  allowUpload={true}
                  className="w-full h-full object-cover object-top photo-natural group-hover:scale-105 transition-transform duration-700"
                />

                {/* Star Badge */}
                <div className="absolute top-4 left-4 bg-[#050811]/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono text-white border border-[#1E90FF]/50 flex items-center gap-2 shadow-lg">
                  <span className="text-base">💙💫</span>
                  <span className="font-bold text-[#1E90FF]">CELEBRITY SMORK</span>
                </div>

                {/* Verified Pill */}
                <div className="absolute top-4 right-4 bg-emerald-600/90 text-white text-[11px] font-mono px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 fill-white text-emerald-600" />
                  <span>Verified Personality</span>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black via-black/70 to-transparent">
                  <p className="text-white font-extrabold text-xl font-['Outfit',sans-serif]">
                    Ifeanyi Emmanuel Nnamani
                  </p>
                  <p className="text-xs font-mono text-[#1E90FF]">
                    @Smorkfrmdaeast · Eastern Nigeria 🇳🇬
                  </p>
                </div>
              </div>

              {/* Celebrity Lifestyle Details & Badges */}
              <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-[#1E90FF]/20 text-[#1E90FF] text-xs font-mono border border-[#1E90FF]/40 font-semibold">
                      🇳🇬 Eastern Nigeria Ambassador
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-900/40 text-purple-300 text-xs font-mono border border-purple-500/30">
                      🔥 Bronx Drill Analyst
                    </span>
                    <span className="px-3 py-1 rounded-full bg-amber-900/40 text-amber-300 text-xs font-mono border border-amber-500/30">
                      ⚡ Street Party Energy
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white font-['Outfit',sans-serif] leading-tight mb-3">
                    THE VOICE OF THE EAST. THE SOUND OF DRILL.
                  </h3>

                  <blockquote className="text-sm sm:text-base text-slate-300 italic border-l-2 border-[#1E90FF] pl-4 my-4 leading-relaxed">
                    "{SMORK_BIO.celebrityQuote}"
                  </blockquote>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                    Celebrity Smork brings together raw cultural commentary, high-energy music dissections, drill cadence breakdowns, and a commitment to championing upcoming artists who stay true to their roots.
                  </p>
                </div>

                {/* Direct Social Channels */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                    Follow & Engage Across Platforms
                  </span>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href="https://tiktok.com/@Smorkfrmdaeast"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-black/60 hover:bg-[#1E90FF] text-slate-200 hover:text-white border border-white/10 hover:border-[#1E90FF] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow"
                    >
                      <i className="fa-brands fa-tiktok text-sm" />
                      <span>TikTok @Smorkfrmdaeast</span>
                    </a>

                    <a
                      href="https://youtube.com/@Smorkfrmdaeast"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-black/60 hover:bg-red-600 text-slate-200 hover:text-white border border-white/10 hover:border-red-600 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow"
                    >
                      <i className="fa-brands fa-youtube text-sm" />
                      <span>YouTube</span>
                    </a>

                    <a
                      href="https://instagram.com/Smork_frmdaeast"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-black/60 hover:bg-pink-600 text-slate-200 hover:text-white border border-white/10 hover:border-pink-600 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow"
                    >
                      <i className="fa-brands fa-instagram text-sm" />
                      <span>Instagram</span>
                    </a>

                    <a
                      href="https://wa.me/2349019071679"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow"
                    >
                      <i className="fa-brands fa-whatsapp text-sm" />
                      <span>WhatsApp VIP</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* EXPANDED 11-TRACK MUSIC PLAYLIST & AUDIO VISUALIZER */}
            <div className="mb-16">
              <div className="text-left mb-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-1">
                    Official Soundtrack & Sonic Energy
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit',sans-serif] flex items-center gap-2">
                    <Music className="w-6 h-6 text-[#1E90FF]" />
                    Smoky Zone Music Catalog (11 Tracks)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  Interactive Audio Player & Visualizer
                </span>
              </div>

              <AudioPlayer initialTrackIndex={0} />
            </div>

            {/* SHORT VIDEO CLIPS REEL (DRILL CULTURE, EASTERN ARTISTS, STREET PARTY, STUDIO) */}
            <div className="mb-16">
              <div className="text-left mb-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-1">
                    Featured Video Moments
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit',sans-serif] flex items-center gap-2">
                    <Film className="w-6 h-6 text-[#1E90FF]" />
                    Short Video Previews & Cultural Clips
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#1E90FF]">
                  Click to play short video
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                {VIDEO_PREVIEW_CLIPS.map((clip) => (
                  <div
                    key={clip.id}
                    onClick={() => setActiveVideoClip(clip)}
                    className="group rounded-2xl overflow-hidden bg-[#0F1D38]/60 border border-white/10 hover:border-[#1E90FF]/60 hover:bg-[#0F1D38] transition-all cursor-pointer flex flex-col justify-between shadow-lg"
                  >
                    <div className="h-48 bg-black relative overflow-hidden">
                      <img
                        src={clip.thumbnail}
                        alt={clip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 photo-natural"
                      />

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
                        <div className="w-12 h-12 rounded-full bg-[#1E90FF] text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Duration Tag */}
                      <span className="absolute bottom-3 right-3 bg-black/80 text-white text-[11px] font-mono px-2 py-0.5 rounded backdrop-blur-sm">
                        {clip.duration}
                      </span>

                      {/* Category Badge */}
                      <span className="absolute top-3 left-3 bg-[#1E90FF]/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow">
                        {clip.tag}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#1E90FF] mb-1">
                          <span>{clip.artistOrTopic}</span>
                          <span className="text-slate-400">{clip.views}</span>
                        </div>
                        <h4 className="text-base font-bold text-white mb-2 font-['Outfit',sans-serif] group-hover:text-[#1E90FF] transition-colors leading-snug">
                          {clip.title}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
                          {clip.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-[#1E90FF]">
                        <span>Play Short Video</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content & Reaction Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              {CELEBRITY_SMORK_CONTENT.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden bg-[#0F1D38]/60 border border-white/5 hover:border-[#1E90FF]/40 transition-all flex flex-col"
                >
                  <div className="h-44 bg-black relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover photo-natural hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#050811]/80 backdrop-blur-sm px-2.5 py-0.5 rounded text-[10px] font-mono text-[#1E90FF] border border-white/10">
                      {item.tag}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400 block mb-1">
                        {item.type}
                      </span>
                      <h4 className="text-base font-bold text-white mb-2 font-['Outfit',sans-serif]">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {item.description}
                      </p>
                    </div>

                    <a
                      href="https://tiktok.com/@Smorkfrmdaeast"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#1E90FF] hover:underline flex items-center gap-1"
                    >
                      Watch Reactions on TikTok <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION F: PROJECTS & PORTFOLIO (EXPANDED 5-PROJECT SCREENSHOT SHOWCASE) */}
        {/* ========================================================================= */}
        <section id="portfolio" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#02040A]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 text-left">
              <div>
                <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-2">
                  Technical & Creative Work
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit',sans-serif]">
                  Projects & Portfolio
                </h2>
                <p className="text-slate-400 text-sm max-w-lg mt-2">
                  Real web architecture, remote workstation operations, smartphone firmware flashing, omnichannel marketing, and interactive AR experiences.
                </p>
              </div>

              {/* Category selector */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0F1D38] border border-white/10 rounded-xl">
                <button
                  onClick={() => setSelectedProjectCategory('all')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedProjectCategory === 'all'
                      ? 'bg-[#1E90FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({PORTFOLIO_PROJECTS.length})
                </button>
                <button
                  onClick={() => setSelectedProjectCategory('web')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedProjectCategory === 'web'
                      ? 'bg-[#1E90FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Web
                </button>
                <button
                  onClick={() => setSelectedProjectCategory('phone')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedProjectCategory === 'phone'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-emerald-400 hover:text-white'
                  }`}
                >
                  Phone Flashing
                </button>
                <button
                  onClick={() => setSelectedProjectCategory('va')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedProjectCategory === 'va'
                      ? 'bg-[#1E90FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Virtual Assistant
                </button>
                <button
                  onClick={() => setSelectedProjectCategory('marketing')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedProjectCategory === 'marketing'
                      ? 'bg-[#1E90FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Marketing
                </button>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setActiveProject(project)}
                  className="rounded-2xl overflow-hidden bg-[#0F1D38]/60 border border-white/10 hover:border-[#1E90FF]/50 hover:bg-[#0F1D38] transition-all cursor-pointer flex flex-col group text-left shadow-lg"
                >
                  <div className="h-52 bg-[#050811] relative overflow-hidden">
                    <ImageSlot
                      src={project.image}
                      fallbackSrc={project.fallbackImage}
                      alt={project.title}
                      className="w-full h-full object-cover photo-natural group-hover:scale-105 transition-transform duration-500"
                    />

                    {project.isExampleConcept && (
                      <div className="absolute top-3 left-3 bg-[#1E90FF]/90 backdrop-blur-sm px-2.5 py-0.5 rounded text-[10px] font-mono text-white">
                        Concept Showcase
                      </div>
                    )}

                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2.5 py-1 rounded text-[11px] font-mono text-[#1E90FF] flex items-center gap-1">
                      <span>View Details</span> <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-[#1E90FF] block mb-1">
                        {project.role}
                      </span>
                      <h4 className="text-lg font-bold text-white mb-2 font-['Outfit',sans-serif]">
                        {project.title}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-4">
                        {project.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {project.technologies.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#050811] text-slate-300 border border-white/5"
                          >
                            {tech}
                          </span>
                        ))}
                        {project.technologies.length > 3 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#050811] text-slate-500">
                            +{project.technologies.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#1E90FF] font-semibold">
                        <span>Project Overview</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION G: CONTACT & BOOKING */}
        {/* ========================================================================= */}
        <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#050811]">
          <div className="max-w-4xl mx-auto text-left">
            <div className="mb-12">
              <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-2">
                Get In Touch
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit',sans-serif]">
                Work With Smork
              </h2>
              <p className="text-slate-400 text-sm max-w-lg mt-2">
                Inquire about web development, phone firmware flashing, virtual assistance, or creative entertainment features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: Direct Channels */}
              <div className="md:col-span-5 space-y-4">
                <div className="p-6 rounded-2xl bg-[#0F1D38]/60 border border-white/5 space-y-4">
                  <h3 className="text-lg font-bold text-white font-['Outfit',sans-serif]">
                    Instant Contact
                  </h3>

                  <a
                    href={SMORK_BIO.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    <i className="fa-brands fa-whatsapp text-2xl text-emerald-400" />
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                        WhatsApp (Fastest)
                      </p>
                      <p className="text-sm font-semibold text-white">{SMORK_BIO.whatsapp}</p>
                    </div>
                  </a>

                  <a
                    href={`mailto:${SMORK_BIO.email}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-blue-950/40 border border-[#1E90FF]/30 text-blue-300 hover:bg-blue-900/40 transition-colors cursor-pointer"
                  >
                    <Send className="w-5 h-5 text-[#1E90FF]" />
                    <div className="truncate">
                      <p className="text-xs font-mono uppercase tracking-wider text-[#1E90FF] font-bold">
                        Email Inquiry
                      </p>
                      <p className="text-xs font-semibold text-white truncate">{SMORK_BIO.email}</p>
                    </div>
                  </a>
                </div>

                <div className="p-6 rounded-2xl bg-[#0F1D38]/40 border border-white/5 text-xs space-y-2">
                  <p className="text-white font-semibold">Service Turnaround:</p>
                  <p className="text-slate-400">· Phone Flashing: Same-day / 24-48h</p>
                  <p className="text-slate-400">· Web Development: 3-14 business days</p>
                  <p className="text-slate-400">· Virtual Assistance: Flexible hours</p>
                </div>
              </div>

              {/* Right Column: Direct Form */}
              <div className="md:col-span-7 p-6 sm:p-8 rounded-2xl bg-[#0F1D38] border border-white/10">
                {formSubmitted ? (
                  <div className="py-12 text-center space-y-3">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h3 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      Message Prepared!
                    </h3>
                    <p className="text-sm text-slate-300">
                      Your inquiry has been opened in your email client. Smork responds directly to all inquiries.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-mono text-slate-300 block mb-1.5 uppercase">
                        Service Category
                      </label>
                      <select
                        value={contactCategory}
                        onChange={(e) => setContactCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-sm focus:border-[#1E90FF] focus:outline-none"
                      >
                        <option value="Phone Flashing & Software Resets">Phone Flashing & Software Resets</option>
                        <option value="Business Website Development">Business Website Development</option>
                        <option value="Landing Page & Portfolio">Landing Page & Portfolio</option>
                        <option value="Virtual Assistant Support">Virtual Assistant Support</option>
                        <option value="Content Creation / Music Collaboration">Content Creation / Music Collaboration</option>
                        <option value="General Inquiry">General Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-mono text-slate-300 block mb-1.5 uppercase">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Samuel Okafor"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-sm focus:border-[#1E90FF] focus:outline-none"
                      >
                      </input>
                    </div>

                    <div>
                      <label className="text-xs font-mono text-slate-300 block mb-1.5 uppercase">
                        Your Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-sm focus:border-[#1E90FF] focus:outline-none"
                      >
                      </input>
                    </div>

                    <div>
                      <label className="text-xs font-mono text-slate-300 block mb-1.5 uppercase">
                        Project / Service Details
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Describe your device issue, website requirement, or project scope..."
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-sm focus:border-[#1E90FF] focus:outline-none resize-none"
                      >
                      </textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#1E90FF]/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Send Direct Inquiry
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION H: SOCIAL PROFILES DIRECTORY */}
        {/* ========================================================================= */}
        <section id="social" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#02040A]">
          <div className="max-w-6xl mx-auto">
            <div className="text-left mb-10">
              <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-1">
                Official Directory
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit',sans-serif]">
                Connect Across All 10 Networks
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 text-left">
              {SOCIAL_PROFILES.map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-xl bg-[#0F1D38]/50 hover:bg-[#0F1D38] border border-white/5 hover:border-[#1E90FF]/40 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <i className={`${p.iconClass} text-lg text-slate-300 group-hover:text-[#1E90FF] transition-colors`} />
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xs truncate">{p.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{p.handle}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-[#050811] text-xs font-mono text-slate-400 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1E90FF]" />
            <span className="text-white font-bold tracking-wider">SMOKY ZONE</span>
            <span>· Ifeanyi Emmanuel Nnamani</span>
          </div>

          <p className="text-slate-400 text-center sm:text-right">
            ONE MIND. DIFFERENT WORLDS. ONE AUTHENTIC JOURNEY.
          </p>
        </div>
      </footer>

      {/* Project Detail Modal */}
      {activeProject && (
        <ProjectModal project={activeProject} onClose={() => setActiveProject(null)} />
      )}

      {/* Short Video Clip Preview Modal */}
      {activeVideoClip && (
        <CelebrityVideoModal
          clip={activeVideoClip}
          onClose={() => setActiveVideoClip(null)}
          onSelectClip={(c) => setActiveVideoClip(c)}
        />
      )}
    </div>
  );
};

export default App;
