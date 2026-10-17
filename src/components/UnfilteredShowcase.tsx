import React, { useState, useRef, useEffect } from 'react';
import { ImageSlot } from './ImageSlot';
import { SMORK_BIO, UNFILTERED_THOUGHTS } from '../data';
import {
  Quote,
  CheckCircle2,
  Image as ImageIcon,
  BookOpen,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Disc,
  Radio,
  ExternalLink,
  Sparkles,
  Flame,
} from 'lucide-react';
import { fileToBase64, setStoredPhoto } from '../utils/photoStorage';
import { getMediaItem } from '../utils/siteStore';

export const UnfilteredShowcase: React.FC = () => {
  const [activeView, setActiveView] = useState<'walkin' | 'portrait' | 'manifesto'>('walkin');
  const [isPlayingAtmosphere, setIsPlayingAtmosphere] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [ambientBarHeights, setAmbientBarHeights] = useState<number[]>([15, 30, 45, 60, 35, 20, 50, 40]);
  const [photoVersion, setPhotoVersion] = useState<number>(0);
  const [customWalkinPhoto, setCustomWalkinPhoto] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Initial fetch of custom walkin photo from store
    getMediaItem('walkin_photo').then((photo) => {
      if (photo) setCustomWalkinPhoto(photo);
    });

    const handleMediaChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (!customEvent.detail || customEvent.detail.key === 'walkin_photo') {
        getMediaItem('walkin_photo').then((photo) => {
          setCustomWalkinPhoto(photo);
        });
      }
    };

    window.addEventListener('smokyzone_media_change', handleMediaChange);
    return () => window.removeEventListener('smokyzone_media_change', handleMediaChange);
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setStoredPhoto('unfiltered_portrait', base64);
        setPhotoVersion((v) => v + 1);
      } catch (err) {
        console.error('Failed to convert photo:', err);
      }
    }
  };

  const toggleAtmosphere = () => {
    if (isPlayingAtmosphere) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlayingAtmosphere(false);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setAmbientBarHeights([8, 12, 10, 14, 10, 8, 12, 8]);
    } else {
      setIsPlayingAtmosphere(true);
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      const loop = () => {
        const heights = Array.from({ length: 8 }, (_, i) => {
          const t = Date.now() / 180;
          const h = Math.sin(t + i * 0.9) * 40 + 50;
          return Math.min(100, Math.max(12, h));
        });
        setAmbientBarHeights(heights);
        animFrameRef.current = requestAnimationFrame(loop);
      };
      animFrameRef.current = requestAnimationFrame(loop);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Tagline Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0F1D38] via-[#0A192F] to-[#050811] border border-[#1E90FF]/30 shadow-xl text-left relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#1E90FF]/15 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 text-xs font-mono text-[#1E90FF] uppercase tracking-widest mb-3">
          <Quote className="w-4 h-4 text-[#1E90FF]" />
          <span>Core Brand Manifesto · SMORK UNFILTERED</span>
        </div>
        <blockquote className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-snug italic font-['Outfit',sans-serif]">
          "{SMORK_BIO.taglineUnfiltered}"
        </blockquote>
      </div>

      {/* Main Walk-In Stage & Interactive Selector */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-b from-[#0A192F] via-[#0F1D38] to-[#050811] border-2 border-[#1E90FF]/40 shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
        {/* Navigation Selector Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#050811]/70 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#1E90FF] animate-pulse" />
            <span className="font-extrabold text-white font-['Outfit',sans-serif] tracking-wider text-base sm:text-lg">
              SMORK <span className="text-[#1E90FF]">UNFILTERED</span> WALK-IN
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#050811] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveView('walkin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'walkin'
                  ? 'bg-[#1E90FF] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Walk-In Visual</span>
            </button>

            <button
              onClick={() => setActiveView('portrait')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'portrait'
                  ? 'bg-[#1E90FF] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Authentic Portrait</span>
            </button>

            <button
              onClick={() => setActiveView('manifesto')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'manifesto'
                  ? 'bg-[#1E90FF] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Philosophy</span>
            </button>
          </div>
        </div>

        {/* View 1: Primary Walk-In Visual with Integrated Audio Player */}
        {activeView === 'walkin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            {/* Visual Stage Frame */}
            <div className="lg:col-span-7 relative bg-black aspect-video sm:aspect-[16/10] overflow-hidden group">
              <img
                src={customWalkinPhoto || '/images/celebrity_smork.jpg'}
                alt="SMORK UNFILTERED Walk-In Visual — Ifeanyi Emmanuel Nnamani"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/celebrity_smork.jpg';
                }}
                className={`w-full h-full object-cover object-[center_top] transition-all duration-700 ${
                  isPlayingAtmosphere ? 'scale-105 contrast-105' : 'scale-100'
                }`}
              />

              {/* HUD Status Badge (Clean, unobstructed) */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#1E90FF]/90 backdrop-blur-sm text-white text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-bold shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Primary Walk-In Visual
                </span>
              </div>

              {/* Bottom-Docked Low-Profile Audio Bar (Never blocks face) */}
              <div className="absolute bottom-0 inset-x-0 py-2 px-3 sm:px-4 bg-[#050811]/75 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-3 z-10">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <button
                    onClick={toggleAtmosphere}
                    className="w-8 h-8 rounded-full bg-[#1E90FF] hover:bg-[#1873cc] text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow active:scale-95"
                    aria-label={isPlayingAtmosphere ? 'Pause walk-in audio' : 'Play walk-in audio'}
                  >
                    {isPlayingAtmosphere ? (
                      <Pause className="w-3.5 h-3.5 fill-white" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    )}
                  </button>

                  <div className="text-left truncate">
                    <p className="text-white text-xs font-bold font-['Outfit',sans-serif] truncate">
                      Gunna — On One Tonight (Live Walk-In)
                    </p>
                    <p className="text-[10px] font-mono text-[#1E90FF] truncate">
                      {isPlayingAtmosphere ? 'Atmospheric Walk-In Audio Active' : 'Tap Play to Enter The Walk-In Vibe'}
                    </p>
                  </div>
                </div>

                {/* Compact Animated Equalizer Bars */}
                <div className="flex items-end gap-0.5 h-5 px-1.5 bg-black/50 rounded border border-white/10 flex-shrink-0">
                  {ambientBarHeights.slice(0, 6).map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-t-xs transition-all duration-100 bg-[#1E90FF]"
                      style={{
                        height: `${Math.max(20, isPlayingAtmosphere ? h * 0.8 : 20)}%`,
                        boxShadow: isPlayingAtmosphere ? '0 0 4px rgba(30,144,255,0.6)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Stage Narrative Description */}
            <div className="lg:col-span-5 p-6 sm:p-8 text-left space-y-5 bg-gradient-to-b from-[#0F1D38]/80 to-[#050811]">
              <div>
                <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-1">
                  The Official Walk-In Experience
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit',sans-serif] leading-tight">
                  RAW ENERGY. NO CUTS.
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                  When Smork enters the space, the vibe shifts immediately. There are no corporate masks, no rehearsals, and no filters. Just pure cultural power, dedication to the craft, and the voice of the streets.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1E90FF] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Authentic Walk-In:</strong> Accompanied by real soundtrack audio and visual cadence.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1E90FF] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Cultural Representation:</strong> Straight from Eastern Nigeria with universal resonance.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1E90FF] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Direct Connection:</strong> Watch daily stories, unfiltered clips, and raw thoughts.
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>SOUNDTRACK ACTIVE</span>
                <span className="text-[#1E90FF]">@Smorkfrmdaeast</span>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Authentic Portrait */}
        {activeView === 'portrait' && (
          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
            <div className="md:col-span-6 relative aspect-[3/4] sm:aspect-[4/5] bg-black overflow-hidden">
              <ImageSlot
                key={`unfiltered-${photoVersion}`}
                src="/images/celebrity_smork.jpg"
                fallbackSrc="/images/IMG_20250105_181849.jpg"
                alt="Smork Unfiltered — Authentic Photo"
                storageKey="unfiltered_portrait"
                slotLabel="Set Unfiltered Photo"
                allowUpload={true}
                className="w-full h-full object-cover object-top photo-natural"
                placeholderText="Smork Unfiltered Portrait"
              />
              <div className="absolute top-4 left-4 bg-[#050811]/85 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-mono text-[#1E90FF] border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1E90FF] animate-pulse" />
                <span>Authentic Photo · No Filter</span>
              </div>
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-[#02040A] via-[#02040A]/70 to-transparent text-left">
                <p className="text-white font-bold font-['Outfit',sans-serif] text-xl">
                  {SMORK_BIO.fullName}
                </p>
                <p className="text-xs font-mono text-[#1E90FF]">
                  SMORK · Eastern Nigeria 🇳🇬
                </p>
              </div>
            </div>

            <div className="md:col-span-6 p-6 sm:p-8 text-left flex flex-col justify-between bg-gradient-to-b from-[#0F1D38] to-[#050811]">
              <div className="space-y-4">
                <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-wider block">
                  Natural Lighting & Real Presence
                </span>
                <h3 className="text-2xl font-black text-white font-['Outfit',sans-serif]">
                  THE MAN BEHIND THE SCREENS
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  "I don't believe in presenting an airbrushed image of success. Every line of code, every unbricked phone, and every video reaction comes from a place of hard work, discipline, and remaining faithful to who I am."
                </p>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1 font-mono text-xs text-slate-300">
                  <p className="text-[#1E90FF] font-semibold">AUTHENTICITY METRICS:</p>
                  <p>· Zero artificial cosmetic enhancement</p>
                  <p>· Captured directly in his personal space</p>
                  <p>· Wearing his signature watch & earphone setup</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>Verified Authentic Portrait</span>
                <label className="cursor-pointer text-[#1E90FF] hover:underline flex items-center gap-1 font-mono text-[11px]">
                  <span>Upload Alternate</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* View 3: Philosophy & Core Reflections */}
        {activeView === 'manifesto' && (
          <div className="p-6 sm:p-10 text-left space-y-6 bg-gradient-to-b from-[#0F1D38] to-[#050811]">
            <div>
              <span className="text-xs font-mono text-[#1E90FF] uppercase tracking-widest block mb-2">
                Unfiltered Truths & Philosophy
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit',sans-serif]">
                "NOBODY REALLY KNOWS WHAT YOU'RE GOING THROUGH."
              </h3>
              <p className="text-sm text-[#1E90FF] font-mono mt-1">
                SAME PEOPLE. DIFFERENT BATTLES. REAL LIFE.
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              We often see the confident smiles, the completed websites, and the creative releases. But behind every single step is a quiet battle with limitations, self-doubt, and the determination to keep walking forward regardless of circumstances.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              {UNFILTERED_THOUGHTS.map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-[#1E90FF] uppercase block mb-1">
                    {t.topic}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-white italic mb-2">
                    "{t.quote}"
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    {t.reflection}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hidden audio element for walk-in music */}
      <audio
        ref={audioRef}
        src="/music/gunna_on_one_tonight.mp3"
        preload="auto"
        loop
      />
    </div>
  );
};
