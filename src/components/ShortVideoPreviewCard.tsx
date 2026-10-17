import React, { useRef, useEffect, useState } from 'react';
import { Play, Volume2, Sparkles, Radio } from 'lucide-react';
import { VideoClipItem } from '../data';
import { getMediaItem } from '../utils/siteStore';

interface ShortVideoPreviewCardProps {
  clip: VideoClipItem;
  onClick: () => void;
}

export const ShortVideoPreviewCard: React.FC<ShortVideoPreviewCardProps> = ({
  clip,
  onClick,
}) => {
  const [customVideoSrc, setCustomVideoSrc] = useState<string | null>(clip.videoSrc || null);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if custom video was uploaded in admin for this clip
    getMediaItem(`video_clip_${clip.id}`).then((custom) => {
      if (custom) setCustomVideoSrc(custom);
    });

    const handleMediaChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (!customEvent.detail || customEvent.detail.key === `video_clip_${clip.id}`) {
        getMediaItem(`video_clip_${clip.id}`).then((custom) => {
          if (custom) setCustomVideoSrc(custom);
        });
      }
    };

    window.addEventListener('smokyzone_media_change', handleMediaChange);
    return () => window.removeEventListener('smokyzone_media_change', handleMediaChange);
  }, [clip.id]);

  // Dynamic 5-Second Looping Video Simulation Canvas (when no raw MP4 is provided)
  useEffect(() => {
    if (customVideoSrc) return; // Native video handles playback
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();
    const durationMs = 5000; // Exact 5-second loop

    // Load background image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = clip.thumbnail;

    const render = (time: number) => {
      const elapsed = (time - startTime) % durationMs;
      const progress = elapsed / durationMs; // 0 to 1
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw base photo with subtle rhythmic zoom & pan (5-second breathing loop)
      if (img.complete && img.naturalWidth > 0) {
        const zoom = 1 + Math.sin(progress * Math.PI * 2) * 0.06;
        const panX = Math.sin(progress * Math.PI * 2) * 8;
        const panY = Math.cos(progress * Math.PI * 2) * 4;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -w / 2 + panX, -h / 2 + panY, w, h);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0a192f';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Category-Specific Live Visual Effects
      if (clip.category === 'drill') {
        // Sha EK singing: Fast sliding drill cadence & 808 strobe flares
        const beatPulse = Math.pow(Math.sin(progress * Math.PI * 16), 4);
        ctx.fillStyle = `rgba(30, 144, 255, ${0.12 * beatPulse})`;
        ctx.fillRect(0, 0, w, h);

        // Horizontal audio scanlines
        ctx.strokeStyle = `rgba(255, 255, 255, 0.08)`;
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 8) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      } else if (clip.category === 'eastern') {
        // Nanni Omologo singing: Warm golden glow & indigenous rhythmic flare
        const glow = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
        const grad = ctx.createRadialGradient(w / 2, h * 0.6, 10, w / 2, h * 0.6, w * 0.8);
        grad.addColorStop(0, `rgba(255, 180, 0, ${0.15 * glow})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else if (clip.category === 'street') {
        // Enugu nightlife crowd: Neon flash, ambient haze, stage lights
        const flash = (Math.sin(progress * Math.PI * 8) > 0.85) ? 0.25 : 0.05;
        ctx.fillStyle = `rgba(180, 50, 255, ${flash})`;
        ctx.fillRect(0, 0, w, h);
      } else {
        // Studio rear camera: REC frame & VU meter pulses
        const meter = Math.abs(Math.sin(progress * Math.PI * 12));
        ctx.fillStyle = `rgba(0, 255, 128, ${0.08 * meter})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 3. Subtle vignette overlay so text is readable
      const vignette = ctx.createLinearGradient(0, 0, 0, h);
      vignette.addColorStop(0, 'rgba(0,0,0,0.3)');
      vignette.addColorStop(0.6, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      // 4. Looping 5-second progress indicator bar at very bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, h - 3, w, 3);
      ctx.fillStyle = '#1E90FF';
      ctx.fillRect(0, h - 3, w * progress, 3);

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [customVideoSrc, clip.thumbnail, clip.category]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group rounded-2xl overflow-hidden bg-[#0F1D38]/60 border border-white/10 hover:border-[#1E90FF]/60 hover:bg-[#0F1D38] transition-all cursor-pointer flex flex-col justify-between shadow-lg"
    >
      {/* 5-Second Looping Video Container */}
      <div className="h-52 bg-black relative overflow-hidden flex items-center justify-center">
        {customVideoSrc ? (
          <video
            ref={videoRef}
            src={customVideoSrc}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={380}
            height={220}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}

        {/* Top-left LIVE 5S tag */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          <span className="px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[9px] font-mono tracking-wider flex items-center gap-1 uppercase font-bold shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            0:05 Loop
          </span>
          <span className="px-2 py-0.5 rounded-full bg-black/70 text-slate-300 text-[9px] font-mono border border-white/10 backdrop-blur-sm">
            Muted Preview
          </span>
        </div>

        {/* Exact 0:05 Duration Badge (Strict Requirement) */}
        <span className="absolute bottom-3 right-3 bg-black/85 text-white text-[11px] font-mono px-2 py-0.5 rounded backdrop-blur-sm border border-white/10 z-10 font-bold">
          0:05
        </span>

        {/* Play Button Overlay (Tapping opens fullscreen with sound) */}
        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 flex items-center justify-center transition-all z-10">
          <div className="w-12 h-12 rounded-full bg-[#1E90FF]/90 text-white flex items-center justify-center shadow-[0_0_20px_rgba(30,144,255,0.6)] group-hover:scale-110 group-hover:bg-[#1E90FF] transition-all">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Category Pill */}
        <span className="absolute top-3 right-3 bg-black/60 text-[#1E90FF] text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 backdrop-blur-sm z-10">
          {clip.tag}
        </span>
      </div>

      {/* Meta details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#1E90FF] mb-1">
            <span className="truncate pr-2 font-semibold">{clip.artistOrTopic}</span>
            <span className="text-slate-400 flex-shrink-0">{clip.views}</span>
          </div>
          <h4 className="text-base font-bold text-white mb-1.5 font-['Outfit',sans-serif] group-hover:text-[#1E90FF] transition-colors leading-snug">
            {clip.title}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-3">
            {clip.subtitle}
          </p>
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-[#1E90FF]">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Tap for Fullscreen + Sound</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">0:05 HD</span>
        </div>
      </div>
    </div>
  );
};
