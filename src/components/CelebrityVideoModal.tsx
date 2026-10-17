import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Flame,
  Radio,
  ExternalLink,
  RotateCcw,
  Maximize2,
  Music2,
  Sparkles,
} from 'lucide-react';
import { VIDEO_PREVIEW_CLIPS, VideoClipItem } from '../data';
import { getMediaItem, getStoredConfig, SiteConfig } from '../utils/siteStore';

interface CelebrityVideoModalProps {
  clip: VideoClipItem | null;
  onClose: () => void;
  onSelectClip: (clip: VideoClipItem) => void;
}

export const CelebrityVideoModal: React.FC<CelebrityVideoModalProps> = ({
  clip,
  onClose,
  onSelectClip,
}) => {
  const [videoClips, setVideoClips] = useState<VideoClipItem[]>(getStoredConfig().videoClips);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [customVideoSrc, setCustomVideoSrc] = useState<string | null>(clip?.videoSrc || null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleConfigChange = (e: Event) => {
      const custom = e as CustomEvent<SiteConfig>;
      if (custom.detail?.videoClips) {
        setVideoClips(custom.detail.videoClips);
      } else {
        setVideoClips(getStoredConfig().videoClips);
      }
    };
    window.addEventListener('smokyzone_config_change', handleConfigChange);
    return () => window.removeEventListener('smokyzone_config_change', handleConfigChange);
  }, []);

  // Exact 5-second duration loop
  const totalSeconds = 5;

  useEffect(() => {
    if (clip) {
      setProgress(0);
      setCurrentTimeSec(0);
      setIsPlaying(true);
      setIsMuted(false); // Opens fullscreen with sound
    }
  }, [clip?.id]);

  useEffect(() => {
    let isMounted = true;
    if (clip) {
      getMediaItem(`video_clip_${clip.id}`).then((custom) => {
        if (isMounted) setCustomVideoSrc(custom || clip.videoSrc || null);
      });
    }

    const handleMedia = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string; data?: string }>;
      if (!customEvent.detail || customEvent.detail.key === `video_clip_${clip?.id}`) {
        getMediaItem(`video_clip_${clip?.id}`).then((custom) => {
          if (isMounted) setCustomVideoSrc(custom || clip?.videoSrc || null);
        });
      }
    };

    window.addEventListener('smokyzone_media_change', handleMedia);
    return () => {
      isMounted = false;
      window.removeEventListener('smokyzone_media_change', handleMedia);
    };
  }, [clip?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted]);

  useEffect(() => {
    if (clip && isPlaying) {
      timerRef.current = window.setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= totalSeconds) {
            return 0; // loop
          }
          return prev + 1;
        });
        setProgress((prev) => (prev >= 100 ? 0 : prev + (100 / totalSeconds)));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clip, isPlaying, totalSeconds]);

  if (!clip) return null;

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0A192F] border border-[#1E90FF]/40 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(30,144,255,0.25)] flex flex-col md:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-red-600/80 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Player Section */}
        <div className="md:w-7/12 bg-black relative flex items-center justify-center overflow-hidden min-h-[320px] md:min-h-[480px]">
          {/* Audio stream for fullscreen video audio */}
          <audio
            ref={audioRef}
            src="/music/gunna_on_one_tonight.mp3"
            loop
            preload="auto"
          />

          {/* Main Visual Frame */}
          <div className="relative w-full h-full flex items-center justify-center">
            {customVideoSrc ? (
              <video
                src={customVideoSrc}
                autoPlay={isPlaying}
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={clip.thumbnail}
                alt={clip.title}
                className={`w-full h-full object-cover transition-transform duration-1000 ${
                  isPlaying ? 'scale-105' : 'scale-100 filter grayscale-[20%]'
                }`}
              />
            )}

            {/* Simulated Live Scanlines / Vignette Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />

            {/* Glowing Beat Waveform Overlay (when playing) */}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-48 h-48 rounded-full border-4 border-[#1E90FF] animate-ping" />
              </div>
            )}

            {/* Live Indicator & Tag */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-red-600/90 text-white text-[11px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-bold shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Live Clip
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/60 text-[#1E90FF] text-[11px] font-mono border border-white/10 backdrop-blur-sm">
                {clip.tag}
              </span>
            </div>

            {/* Center Play/Pause Overlay Click */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-all cursor-pointer group"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              <div className="w-16 h-16 rounded-full bg-[#1E90FF]/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-[#1E90FF] transition-all">
                {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-1" />}
              </div>
            </button>

            {/* Bottom HUD Bar on Video */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-10 space-y-2">
              {/* Progress Scrubber */}
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="bg-[#1E90FF] h-full transition-all duration-300 shadow-[0_0_8px_#1E90FF]"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>

              {/* Timing & Sound HUD */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="hover:text-[#1E90FF] transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span>
                    0:{currentTimeSec < 10 ? `0${currentTimeSec}` : currentTimeSec} / {clip.duration}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="hover:text-[#1E90FF] transition-colors p-1"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-[11px] text-[#1E90FF]">1080p HD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Details & Short Video Selector */}
        <div className="md:w-5/12 p-6 sm:p-7 flex flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#0F1D38] to-[#050811] text-left">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#1E90FF] mb-1">
                <Flame className="w-4 h-4 text-[#1E90FF]" />
                <span className="uppercase">{clip.artistOrTopic}</span>
                <span className="text-slate-400">· {clip.views}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] leading-tight">
                {clip.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                {clip.subtitle}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/10 pt-3">
              {clip.description}
            </p>

            {/* Social link */}
            <div className="pt-2">
              <a
                href="https://tiktok.com/@Smorkfrmdaeast"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#1E90FF]/20 hover:bg-[#1E90FF] text-[#1E90FF] hover:text-white border border-[#1E90FF]/40 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Watch Full Breakdown on TikTok</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Video Playlist Carousel */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                More Short Video Clips ({videoClips.length})
              </span>

              <div className="grid grid-cols-2 gap-2">
                {videoClips.map((item) => {
                  const isCurrent = item.id === clip.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectClip(item)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#1E90FF]/30 border-[#1E90FF] ring-1 ring-[#1E90FF]'
                          : 'bg-[#050811]/60 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="h-14 rounded-lg overflow-hidden bg-black mb-1.5 relative">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1 rounded">
                          {item.duration}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-white truncate font-['Outfit',sans-serif]">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">
                        {item.tag}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>CELEBRITY SMORK 💙💫</span>
            <span className="text-[#1E90FF]">@Smorkfrmdaeast</span>
          </div>
        </div>
      </div>
    </div>
  );
};
