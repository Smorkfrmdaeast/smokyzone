import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Disc,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ListMusic,
  Sparkles,
  Radio,
} from 'lucide-react';
import { CELEBRITY_PLAYLIST, MusicTrack } from '../data';
import { getStoredConfig, getMediaItem, SiteConfig } from '../utils/siteStore';

import { mediaManager } from '../utils/mediaManager';

interface AudioPlayerProps {
  initialTrackIndex?: number;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  initialTrackIndex = 0,
  compact = false,
}) => {
  const [playlist, setPlaylist] = useState<MusicTrack[]>(getStoredConfig().playlist);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(initialTrackIndex);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [barHeights, setBarHeights] = useState<number[]>([12, 18, 25, 40, 20, 15, 30, 25, 18, 12, 10, 8]);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);
  const [trackProgress, setTrackProgress] = useState<number>(0);
  const [customAudioSrc, setCustomAudioSrc] = useState<string | null>(null);

  const safeIndex = currentTrackIndex < playlist.length ? currentTrackIndex : 0;
  const currentTrack: MusicTrack = playlist[safeIndex] || CELEBRITY_PLAYLIST[0];

  useEffect(() => {
    const handleConfig = (e: Event) => {
      const custom = e as CustomEvent<SiteConfig>;
      if (custom.detail?.playlist?.length) {
        setPlaylist(custom.detail.playlist);
      } else {
        setPlaylist(getStoredConfig().playlist);
      }
    };

    const handlePauseMusic = () => {
      if (audioRef.current) audioRef.current.pause();
      stopSynthesizedBeat();
      stopVisualizer();
      setIsPlaying(false);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };

    const handleResumeMusic = (e: Event) => {
      const custom = e as CustomEvent<{ position?: number }>;
      if (!isPlaying) {
        if (audioRef.current && typeof custom.detail?.position === 'number') {
          audioRef.current.currentTime = custom.detail.position;
        }
        startPlayback();
      }
    };

    window.addEventListener('smokyzone_config_change', handleConfig);
    window.addEventListener('smokyzone_pause_music', handlePauseMusic);
    window.addEventListener('smokyzone_resume_music', handleResumeMusic);
    return () => {
      window.removeEventListener('smokyzone_config_change', handleConfig);
      window.removeEventListener('smokyzone_pause_music', handlePauseMusic);
      window.removeEventListener('smokyzone_resume_music', handleResumeMusic);
    };
  }, [isPlaying]);

  useEffect(() => {
    let isMounted = true;
    if (currentTrack) {
      getMediaItem(`audio_track_${currentTrack.id}`).then((src) => {
        if (isMounted) setCustomAudioSrc(src || currentTrack.audioSrc || null);
      });
    }

    const handleMedia = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string; data?: string }>;
      if (!customEvent.detail || customEvent.detail.key === `audio_track_${currentTrack?.id}`) {
        getMediaItem(`audio_track_${currentTrack?.id}`).then((src) => {
          if (isMounted) setCustomAudioSrc(src || currentTrack?.audioSrc || null);
        });
      }
    };
    window.addEventListener('smokyzone_media_change', handleMedia);
    return () => {
      isMounted = false;
      window.removeEventListener('smokyzone_media_change', handleMedia);
    };
  }, [currentTrack?.id]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (synthTimerRef.current !== null) {
        clearInterval(synthTimerRef.current);
        synthTimerRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Initialize Web Audio Context
  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;

        if (audioRef.current) {
          try {
            const src = ctx.createMediaElementSource(audioRef.current);
            src.connect(analyser);
            analyser.connect(ctx.destination);
            sourceRef.current = src;
          } catch {
            // Already connected or browser security restriction
          }
        }

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      } catch (err) {
        console.warn('Web Audio initialization note:', err);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Synthesize musical beat for preview tracks that don't have local MP3 files
  const playSynthesizedBeat = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Rhythmic 808 kick & hi-hat pattern
    const bpm = currentTrack.genre.includes('Drill') ? 142 : 130;
    const stepDuration = 60 / bpm / 2;
    let step = 0;

    const tick = () => {
      if (!audioContextRef.current) return;
      const now = ctx.currentTime;

      // 808 Kick on beats 0, 6, 10
      if (step % 16 === 0 || step % 16 === 6 || step % 16 === 10) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);

          gain.gain.setValueAtTime((isMuted ? 0 : volume) * 0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);
          if (analyserRef.current) gain.connect(analyserRef.current);

          osc.start(now);
          osc.stop(now + 0.3);
        } catch {
          // Ignore
        }
      }

      // Snare / Clap on beats 4, 12
      if (step % 16 === 4 || step % 16 === 12) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

          gain.gain.setValueAtTime((isMuted ? 0 : volume) * 0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          osc.connect(gain);
          gain.connect(ctx.destination);
          if (analyserRef.current) gain.connect(analyserRef.current);

          osc.start(now);
          osc.stop(now + 0.16);
        } catch {
          // Ignore
        }
      }

      // Hi-hats on every 2nd step
      if (step % 2 === 0) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(6000, now);

          gain.gain.setValueAtTime((isMuted ? 0 : volume) * 0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

          osc.connect(gain);
          gain.connect(ctx.destination);
          if (analyserRef.current) gain.connect(analyserRef.current);

          osc.start(now);
          osc.stop(now + 0.05);
        } catch {
          // Ignore
        }
      }

      step++;
    };

    synthTimerRef.current = window.setInterval(tick, stepDuration * 1000);
  };

  const stopSynthesizedBeat = () => {
    if (synthTimerRef.current !== null) {
      clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  };

  const startVisualizer = () => {
    const loop = () => {
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const data = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(data);

        const heights: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 12));
        for (let i = 0; i < 12; i++) {
          const raw = data[i * step] || 0;
          const pct = Math.max(10, (raw / 255) * 100);
          heights.push(pct);
        }
        setBarHeights(heights);
      } else {
        // Fallback smooth animated bars
        const t = Date.now() / 150;
        const heights = Array.from({ length: 12 }, (_, i) => {
          const wave = Math.sin(t + i * 0.8) * 35 + 45;
          const jitter = Math.random() * 20;
          return Math.min(100, Math.max(10, wave + jitter));
        });
        setBarHeights(heights);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const stopVisualizer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setBarHeights([10, 15, 12, 18, 14, 12, 16, 14, 12, 10, 8, 6]);
  };

  const startPlayback = async () => {
    ensureAudioContext();
    const activeAudioSrc = customAudioSrc || currentTrack.audioSrc;
    setIsPlaying(true);
    startVisualizer();
    window.dispatchEvent(new CustomEvent('smokyzone_music_playing'));

    const currentPos = audioRef.current?.currentTime || 0;
    mediaManager.onMusicPlay(currentPos);

    if (activeAudioSrc && audioRef.current) {
      try {
        if (!audioRef.current.src || !audioRef.current.src.includes(activeAudioSrc)) {
          audioRef.current.src = activeAudioSrc;
        }
        audioRef.current.volume = isMuted ? 0 : volume;
        await audioRef.current.play();
      } catch {
        playSynthesizedBeat();
      }
    } else {
      playSynthesizedBeat();
    }

    if (!progressTimerRef.current) {
      progressTimerRef.current = window.setInterval(() => {
        setTrackProgress((prev) => (prev >= 100 ? 0 : prev + 0.8));
        if (audioRef.current) {
          mediaManager.updateMusicPosition(audioRef.current.currentTime);
        }
      }, 1000);
    }
  };

  const togglePlay = async () => {
    ensureAudioContext();
    const activeAudioSrc = customAudioSrc || currentTrack.audioSrc;

    if (isPlaying) {
      // Pause
      if (audioRef.current && activeAudioSrc) {
        audioRef.current.pause();
      }
      stopSynthesizedBeat();
      stopVisualizer();
      setIsPlaying(false);
      mediaManager.onMusicPause(true);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    } else {
      await startPlayback();
    }
  };

  const changeTrack = (index: number) => {
    const wasPlaying = isPlaying;
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      stopSynthesizedBeat();
    }

    const safeIndex = index < playlist.length ? index : 0;
    setCurrentTrackIndex(safeIndex);
    setTrackProgress(0);

    if (wasPlaying) {
      window.dispatchEvent(new CustomEvent('smokyzone_music_playing'));
      setTimeout(() => {
        const nextTrack = playlist[safeIndex];
        const nextSrc = nextTrack.audioSrc;
        if (nextSrc && audioRef.current) {
          audioRef.current.src = nextSrc;
          audioRef.current.play().catch(() => playSynthesizedBeat());
        } else {
          playSynthesizedBeat();
        }
      }, 150);
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % playlist.length;
    changeTrack(nextIdx);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    changeTrack(prevIdx);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
    if (v === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  };


  return (
    <div className="w-full max-w-xl mx-auto p-5 sm:p-6 bg-gradient-to-br from-[#0A192F]/90 via-[#0F1D38]/90 to-[#050811]/95 border-2 border-[#1E90FF]/40 rounded-2xl shadow-[0_12px_40px_rgba(30,144,255,0.18)] backdrop-blur-xl relative overflow-hidden">
      {/* Background neon visualizer glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-[#1E90FF]/15 blur-3xl pointer-events-none" />

      {/* Header bar: Track info and Playlist toggle */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-[#1E90FF]/40 relative">
            <img
              src={currentTrack.albumArt || '/images/StockCake-Neon Music Studio_1758587212.jpg'}
              alt={currentTrack.title}
              className={`w-full h-full object-cover ${isPlaying ? 'scale-110 transition-transform duration-700' : ''}`}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-[#1E90FF]/20 flex items-center justify-center">
                <Disc className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="text-left overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm sm:text-base font-['Outfit',sans-serif] truncate">
                {currentTrack.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E90FF]/20 text-[#1E90FF] font-mono border border-[#1E90FF]/30 flex-shrink-0">
                {currentTrack.genre}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate">
              {currentTrack.artist} · <span className="text-slate-300">{currentTrack.energyVibe}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className={`p-2 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
            showPlaylist
              ? 'bg-[#1E90FF] text-white border-[#1E90FF]'
              : 'bg-[#050811] text-slate-300 border-white/10 hover:border-[#1E90FF]/50'
          }`}
          title="Toggle Track Catalog"
        >
          <ListMusic className="w-4 h-4" />
          <span className="hidden sm:inline">{playlist.length} Tracks</span>
        </button>
      </div>

      {/* Simulated progress line */}
      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-4">
        <div
          className="bg-gradient-to-r from-[#1E90FF] to-cyan-400 h-full transition-all duration-300"
          style={{ width: isPlaying ? `${Math.max(5, trackProgress)}%` : '0%' }}
        />
      </div>

      {/* Main player controls & 12-bar equalizer */}
      <div className="flex items-center justify-between gap-4 py-2">
        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrev}
            className="p-2 sm:p-2.5 rounded-xl bg-[#050811] hover:bg-[#1E90FF]/20 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Previous Track"
            aria-label="Previous Track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1E90FF] hover:bg-[#1873cc] text-white flex items-center justify-center font-bold text-lg transition-all shadow-lg shadow-[#1E90FF]/40 cursor-pointer active:scale-95"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
          </button>

          <button
            onClick={handleNext}
            className="p-2 sm:p-2.5 rounded-xl bg-[#050811] hover:bg-[#1E90FF]/20 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Next Track"
            aria-label="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* 12-Bar Equalizer Display */}
        <div className="flex justify-between items-end flex-1 max-w-[220px] h-16 px-3 py-1.5 bg-[#050811]/90 rounded-xl border border-white/10 shadow-inner">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="w-2 rounded-t-sm transition-all duration-75"
              style={{
                height: `${Math.max(8, Math.min(100, h))}%`,
                backgroundColor: i % 2 === 0 ? '#1E90FF' : '#00D2FF',
                boxShadow: isPlaying ? '0 0 8px rgba(30,144,255,0.6)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer controls: volume slider & track tag */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-[#1E90FF] transition-colors p-1"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 accent-[#1E90FF] cursor-pointer h-1.5 bg-slate-900 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-[#1E90FF] flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" />
            {currentTrack.tag}
          </span>
          <span className="text-slate-400">({currentTrack.duration})</span>
        </div>
      </div>

      {/* Expandable Track Catalog */}
      {showPlaylist && (
        <div className="mt-5 pt-4 border-t border-white/10 max-h-72 overflow-y-auto space-y-1.5 text-left custom-scrollbar">
          <div className="flex items-center justify-between text-xs font-mono text-[#1E90FF] mb-2 px-1">
            <span>SMOKY ZONE OFFICIAL SELECTION</span>
            <span>{playlist.length} TRACKS</span>
          </div>

          {playlist.map((track, idx) => {
            const isCurrent = idx === currentTrackIndex;
            const needsReview = track.tag?.toLowerCase().includes('review') || track.title?.toLowerCase().includes('review');
            return (
              <button
                key={`${track.id}-${idx}`}
                onClick={() => changeTrack(idx)}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#1E90FF]/20 text-white border border-[#1E90FF]/50'
                    : 'bg-[#050811]/60 text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="font-mono text-[11px] text-slate-400 w-4">
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </span>
                  <div className="truncate text-left">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-semibold truncate ${isCurrent ? 'text-[#1E90FF]' : 'text-white'}`}>
                        {track.title}
                      </p>
                      {needsReview && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                          Review
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{track.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 text-slate-400 font-mono text-[11px]">
                  <span className="hidden sm:inline px-2 py-0.5 rounded bg-black/40 text-[#1E90FF] border border-white/5">
                    {track.genre}
                  </span>
                  <span>{track.duration}</span>
                  {isCurrent && isPlaying && <span className="w-2 h-2 rounded-full bg-[#1E90FF] animate-ping" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Hidden audio element for physical media */}
      <audio
        ref={audioRef}
        src={currentTrack.audioSrc || '/music/gunna_on_one_tonight.mp3'}
        preload="auto"
        onEnded={handleNext}
      />
    </div>
  );
};
