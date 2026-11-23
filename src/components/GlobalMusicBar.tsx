import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ListMusic,
  ChevronUp,
  ChevronDown,
  Disc,
  Radio,
  ExternalLink,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react';
import {
  GlobalAudioState,
  subscribeAudioState,
  sendAudioCommand,
  getLatestAudioState,
} from '../utils/audioChannel';
import { getStoredConfig } from '../utils/siteStore';
import { MusicTrack } from '../data';

const MUSIC_BAR_IDLE_HIDE_MS = 1 * 60 * 1000; // 1 minute without active playback

export const GlobalMusicBar: React.FC = () => {
  const [audioState, setAudioState] = useState<GlobalAudioState>(getLatestAudioState);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showCatalog, setShowCatalog] = useState<boolean>(false);
  const [playlist, setPlaylist] = useState<MusicTrack[]>(() => getStoredConfig().playlist);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const idleHideTimerRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(audioState.isPlaying);
  isPlayingRef.current = audioState.isPlaying;

  const clearIdleHideTimer = useCallback(() => {
    if (idleHideTimerRef.current !== null) {
      window.clearTimeout(idleHideTimerRef.current);
      idleHideTimerRef.current = null;
    }
  }, []);

  const scheduleIdleHide = useCallback(() => {
    clearIdleHideTimer();
    idleHideTimerRef.current = window.setTimeout(() => {
      if (!isPlayingRef.current) {
        setShowCatalog(false);
        setIsMinimized(false);
        setIsVisible(false);
      }
    }, MUSIC_BAR_IDLE_HIDE_MS);
  }, [clearIdleHideTimer]);

  const resetIdleIfPaused = useCallback(() => {
    if (!isPlayingRef.current && isVisible) {
      scheduleIdleHide();
    }
  }, [isVisible, scheduleIdleHide]);

  // Subscribe to reactive audio state from audio bus and playback triggers
  useEffect(() => {
    const unsubscribe = subscribeAudioState((state) => {
      setAudioState(state);
      if (state.isPlaying) {
        setIsVisible(true);
      }
    });

    const handleMusicPlaying = () => {
      setIsVisible(true);
      clearIdleHideTimer();
    };

    const handleConfigChange = () => {
      setPlaylist(getStoredConfig().playlist);
    };

    window.addEventListener('smokyzone_music_playing', handleMusicPlaying);
    window.addEventListener('smokyzone_config_change', handleConfigChange);

    return () => {
      unsubscribe();
      window.removeEventListener('smokyzone_music_playing', handleMusicPlaying);
      window.removeEventListener('smokyzone_config_change', handleConfigChange);
      clearIdleHideTimer();
    };
  }, [clearIdleHideTimer]);

  // Manage 1-minute idle slide-out timer based on playback state
  useEffect(() => {
    if (audioState.isPlaying) {
      setIsVisible(true);
      clearIdleHideTimer();
    } else if (isVisible) {
      scheduleIdleHide();
    }
  }, [audioState.isPlaying, isVisible, clearIdleHideTimer, scheduleIdleHide]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendAudioCommand('toggle');
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetIdleIfPaused();
    sendAudioCommand('next');
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetIdleIfPaused();
    sendAudioCommand('prev');
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetIdleIfPaused();
    sendAudioCommand('toggleMute');
  };

  const handleToggleShuffle = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetIdleIfPaused();
    sendAudioCommand('toggleShuffle');
  };

  const handleToggleRepeat = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetIdleIfPaused();
    sendAudioCommand('toggleRepeat');
  };

  const handleSelectTrack = (index: number) => {
    setIsVisible(true);
    clearIdleHideTimer();
    sendAudioCommand('changeTrack', { index });
    setShowCatalog(false);
  };

  const handleScrollToPlayer = () => {
    resetIdleIfPaused();
    const el = document.getElementById('celebrity') || document.getElementById('celebrity-smork');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Expandable Official Playlist Quick Catalog Drawer */}
      {isVisible && showCatalog && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fadeIn flex items-end sm:items-center justify-center p-3 sm:p-4"
          onClick={() => {
            resetIdleIfPaused();
            setShowCatalog(false);
          }}
        >
          <div
            className="w-full max-w-lg max-h-[70vh] bg-[#0A1327] border border-[#1E90FF]/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left"
            onClick={(e) => {
              e.stopPropagation();
              resetIdleIfPaused();
            }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#070D1B]">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#1E90FF]" />
                <span className="text-white font-bold text-xs uppercase tracking-wider font-mono">
                  Official Playlist ({playlist.length} Tracks)
                </span>
              </div>
              <button
                onClick={() => {
                  resetIdleIfPaused();
                  setShowCatalog(false);
                }}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="p-3 overflow-y-auto space-y-1.5 custom-scrollbar">
              {playlist.map((track, idx) => {
                const isCurrent = idx === audioState.trackIndex;
                return (
                  <button
                    key={track.id || idx}
                    onClick={() => handleSelectTrack(idx)}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#1E90FF]/25 text-white border border-[#1E90FF]/50 shadow-md'
                        : 'bg-[#050811]/60 text-slate-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="font-mono text-[11px] text-slate-400 w-5 flex-shrink-0">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      <div className="truncate text-left">
                        <p className={`font-semibold truncate ${isCurrent ? 'text-[#1E90FF]' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0 font-mono text-[11px] text-slate-400">
                      <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-black/40 text-[#1E90FF]">
                        {track.genre}
                      </span>
                      <span>{track.duration}</span>
                      {isCurrent && audioState.isPlaying && (
                        <span className="w-2 h-2 rounded-full bg-[#1E90FF] animate-ping" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Contextual Global Floating Music Bar (appears on playlist play, slides out after 1m idle) */}
      <div
        aria-hidden={!isVisible}
        className={`fixed z-30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
          isVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-[calc(100%+2.5rem)] opacity-0 pointer-events-none'
        } ${
          isMinimized
            ? 'bottom-4 right-4 sm:bottom-6 sm:right-6'
            : 'bottom-0 left-0 right-0 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-xl sm:mx-auto'
        }`}
      >
        {isMinimized ? (
          /* Relaxed Floating Media Segment */
          <div
            onClick={() => {
              resetIdleIfPaused();
              setIsMinimized(false);
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-full bg-[#081226]/95 border border-[#1E90FF]/40 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl cursor-pointer hover:border-[#1E90FF] hover:shadow-[0_12px_45px_rgba(30,144,255,0.25)] group transition-all duration-300 ring-1 ring-white/10"
            title="Click to expand full player"
          >
            {/* Spinning Album Disc with soft neon pulse */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-black flex-shrink-0 border border-[#1E90FF]/60 shadow-md">
              <img
                src={audioState.albumArt || '/images/StockCake-Neon Music Studio_1758587212.jpg'}
                alt={audioState.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  audioState.isPlaying ? 'scale-110' : ''
                }`}
              />
              {audioState.isPlaying && (
                <div className="absolute inset-0 bg-[#1E90FF]/25 flex items-center justify-center">
                  <Disc className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Track Info (Title & Artist) */}
            <div className="text-left overflow-hidden max-w-[140px] sm:max-w-[180px]">
              <div className="flex items-center gap-1.5">
                <p className="text-white text-xs font-bold truncate leading-tight group-hover:text-[#1E90FF] transition-colors">
                  {audioState.title}
                </p>
                {audioState.isPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate leading-tight mt-0.5">
                {audioState.artist}
              </p>
            </div>

            {/* Relaxed Quick Inline Controls */}
            <div className="flex items-center gap-1 pl-1 border-l border-white/10">
              <button
                onClick={handleToggleShuffle}
                className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-90 ${
                  audioState.isShuffle
                    ? 'bg-[#1E90FF]/30 text-[#1E90FF]'
                    : 'bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white'
                }`}
                title={audioState.isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                aria-label="Toggle Shuffle"
              >
                <Shuffle className="w-2.5 h-2.5" />
              </button>

              <button
                onClick={handlePrev}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors active:scale-90"
                title="Previous track"
                aria-label="Previous track"
              >
                <SkipBack className="w-3 h-3" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-[#1E90FF] to-cyan-500 hover:brightness-110 text-white flex items-center justify-center cursor-pointer shadow-md shadow-[#1E90FF]/40 flex-shrink-0 active:scale-95 transition-all"
                aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                title={audioState.isPlaying ? 'Pause' : 'Play'}
              >
                {audioState.isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors active:scale-90"
                title="Next track"
                aria-label="Next track"
              >
                <SkipForward className="w-3 h-3" />
              </button>

              <button
                onClick={handleToggleRepeat}
                className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-90 relative ${
                  audioState.repeatMode !== 'off'
                    ? 'bg-[#1E90FF]/30 text-[#1E90FF]'
                    : 'bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white'
                }`}
                title={
                  audioState.repeatMode === 'all'
                    ? 'Repeat: ALL'
                    : audioState.repeatMode === 'one'
                    ? 'Repeat: ONE'
                    : 'Repeat: OFF'
                }
                aria-label="Toggle Repeat"
              >
                {audioState.repeatMode === 'one' ? (
                  <Repeat1 className="w-2.5 h-2.5 text-cyan-300" />
                ) : (
                  <Repeat className="w-2.5 h-2.5" />
                )}
              </button>
            </div>

            {/* Expand chevron */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetIdleIfPaused();
                setIsMinimized(false);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Expand player"
              aria-label="Expand player"
            >
              <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        ) : (
          /* Full Global Controller Bar */
          <div className="w-full bg-[#081021]/95 sm:rounded-2xl border-t sm:border border-[#1E90FF]/35 shadow-[0_-8px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden p-2.5 sm:p-3 relative text-left">
            {/* Top Interactive Progress Scrubber Line */}
            <div
              className="absolute top-0 left-0 right-0 h-1 bg-slate-800/80 cursor-pointer overflow-hidden group"
              title="Seek playback"
              onClick={(e) => {
                resetIdleIfPaused();
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                if (audioState.duration) {
                  const parts = audioState.duration.split(':');
                  const totalSecs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                  if (!isNaN(totalSecs) && totalSecs > 0) {
                    sendAudioCommand('seek', { time: pct * totalSecs });
                  }
                }
              }}
            >
              <div
                className="bg-gradient-to-r from-[#1E90FF] via-cyan-400 to-[#1E90FF] h-full transition-all duration-150"
                style={{ width: `${Math.max(1, Math.min(100, audioState.progress))}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2.5 sm:gap-3 pt-0.5">
              {/* Left: Album art, track title, and artist */}
              <div
                onClick={handleScrollToPlayer}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                title="Click to view Studio Player"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-[#1E90FF]/40 relative shadow">
                  <img
                    src={audioState.albumArt || '/images/StockCake-Neon Music Studio_1758587212.jpg'}
                    alt={audioState.title}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      audioState.isPlaying ? 'scale-110' : ''
                    }`}
                  />
                  {audioState.isPlaying && (
                    <div className="absolute inset-0 bg-[#1E90FF]/25 flex items-center justify-center">
                      <Disc className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="overflow-hidden min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white text-xs font-bold font-['Outfit',sans-serif] truncate group-hover:text-[#1E90FF] transition-colors leading-tight">
                      {audioState.title}
                    </p>
                    <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#1E90FF]/20 text-[#1E90FF] border border-[#1E90FF]/30">
                      Slot #{audioState.trackIndex + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate leading-tight">
                    {audioState.artist}
                  </p>
                </div>
              </div>

              {/* Center: Playback Controls with Shuffle & Repeat */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {/* Shuffle Button */}
                <button
                  onClick={handleToggleShuffle}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer active:scale-95 ${
                    audioState.isShuffle
                      ? 'bg-[#1E90FF]/25 text-[#1E90FF] border border-[#1E90FF]/60 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                  title={
                    audioState.isShuffle
                      ? 'Shuffle: ON (Randomize playback order)'
                      : 'Shuffle: OFF (Play sequentially)'
                  }
                  aria-label="Toggle Shuffle"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handlePrev}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95"
                  title="Previous Track"
                  aria-label="Previous Track"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1E90FF] hover:bg-[#1873cc] text-white flex items-center justify-center font-bold transition-all shadow-md shadow-[#1E90FF]/40 cursor-pointer active:scale-95"
                  aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                >
                  {audioState.isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95"
                  title="Next Track"
                  aria-label="Next Track"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                {/* Repeat Button (Cycles: All -> One -> Off) */}
                <button
                  onClick={handleToggleRepeat}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer active:scale-95 relative ${
                    audioState.repeatMode !== 'off'
                      ? 'bg-[#1E90FF]/25 text-[#1E90FF] border border-[#1E90FF]/60 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                  title={
                    audioState.repeatMode === 'all'
                      ? 'Repeat: ALL (Loop entire playlist)'
                      : audioState.repeatMode === 'one'
                      ? 'Repeat: ONE (Loop current track)'
                      : 'Repeat: OFF (Stop at end)'
                  }
                  aria-label="Toggle Repeat"
                >
                  {audioState.repeatMode === 'one' ? (
                    <Repeat1 className="w-3.5 h-3.5 text-cyan-300" />
                  ) : (
                    <Repeat className="w-3.5 h-3.5" />
                  )}
                  {audioState.repeatMode === 'one' && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 text-black text-[7px] font-black flex items-center justify-center font-mono">
                      1
                    </span>
                  )}
                  {audioState.repeatMode === 'all' && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#1E90FF]" />
                  )}
                </button>
              </div>

              {/* Right: Live mini visualizer, Mute, Catalog drawer, and Minimize */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* 4-bar mini visualizer */}
                <div className="hidden sm:flex items-end gap-0.5 h-6 px-1.5 py-1 bg-black/40 rounded-lg border border-white/5">
                  <div
                    className={`w-1 rounded-t-sm bg-[#1E90FF] transition-all duration-100 ${
                      audioState.isPlaying ? 'h-4 animate-pulse' : 'h-1.5'
                    }`}
                  />
                  <div
                    className={`w-1 rounded-t-sm bg-cyan-400 transition-all duration-150 ${
                      audioState.isPlaying ? 'h-5 animate-pulse delay-75' : 'h-2'
                    }`}
                  />
                  <div
                    className={`w-1 rounded-t-sm bg-[#1E90FF] transition-all duration-100 ${
                      audioState.isPlaying ? 'h-3 animate-pulse delay-100' : 'h-1.5'
                    }`}
                  />
                  <div
                    className={`w-1 rounded-t-sm bg-cyan-400 transition-all duration-150 ${
                      audioState.isPlaying ? 'h-4 animate-pulse' : 'h-1'
                    }`}
                  />
                </div>

                <button
                  onClick={handleToggleMute}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title={audioState.isMuted ? 'Unmute' : 'Mute'}
                  aria-label={audioState.isMuted ? 'Unmute' : 'Mute'}
                >
                  {audioState.isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => {
                    resetIdleIfPaused();
                    setShowCatalog(!showCatalog);
                  }}
                  className={`p-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
                    showCatalog
                      ? 'bg-[#1E90FF] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title="Open Playlist Selection"
                  aria-label="Open Playlist"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px] font-semibold">{playlist.length} Tracks</span>
                </button>

                <button
                  onClick={() => {
                    resetIdleIfPaused();
                    setIsMinimized(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Minimize bar"
                  aria-label="Minimize bar"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
