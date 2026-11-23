import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Disc,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ListMusic,
  Radio,
  ExternalLink,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react';
import { CELEBRITY_PLAYLIST, MusicTrack } from '../data';
import { getStoredConfig, getMediaItem, SiteConfig } from '../utils/siteStore';
import { mediaManager } from '../utils/mediaManager';
import {
  broadcastAudioState,
  subscribeAudioCommands,
  RepeatMode,
} from '../utils/audioChannel';

interface AudioPlayerProps {
  initialTrackIndex?: number;
  compact?: boolean;
}

const PLAYER_STATE_KEY = 'smokyzone_player_state_v2';

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  initialTrackIndex = 0,
}) => {
  // Load initial index from local storage if previously selected
  const getInitialIndex = (): number => {
    try {
      const saved = localStorage.getItem(PLAYER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.trackIndex === 'number' && !isNaN(parsed.trackIndex)) {
          return parsed.trackIndex;
        }
      }
    } catch {
      // fallback
    }
    return initialTrackIndex;
  };

  const [playlist, setPlaylist] = useState<MusicTrack[]>(() => {
    const stored = getStoredConfig().playlist;
    return stored?.length ? stored : CELEBRITY_PLAYLIST;
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(getInitialIndex);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [barHeights, setBarHeights] = useState<number[]>([12, 18, 25, 40, 20, 15, 30, 25, 18, 12, 10, 8]);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);
  const [trackProgress, setTrackProgress] = useState<number>(0);
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState<string>('0:00');
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(PLAYER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.isShuffle === 'boolean') return parsed.isShuffle;
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    try {
      const saved = localStorage.getItem(PLAYER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.repeatMode === 'off' || parsed.repeatMode === 'all' || parsed.repeatMode === 'one') {
          return parsed.repeatMode;
        }
      }
    } catch {
      // ignore
    }
    return 'all';
  });
  const [shuffleHistory, setShuffleHistory] = useState<number[]>([]);

  const safeIndex =
    playlist.length > 0
      ? (currentTrackIndex % playlist.length + playlist.length) % playlist.length
      : 0;
  const currentTrack: MusicTrack = playlist[safeIndex] || CELEBRITY_PLAYLIST[0];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const fadeAnimationRef = useRef<number | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  const loadedSrcRef = useRef<string | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const isManualSwitchingRef = useRef<boolean>(false);

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const currentTrackRef = useRef<MusicTrack>(currentTrack);
  currentTrackRef.current = currentTrack;

  const playlistRef = useRef<MusicTrack[]>(playlist);
  playlistRef.current = playlist;

  const currentTrackIndexRef = useRef<number>(safeIndex);
  currentTrackIndexRef.current = safeIndex;

  const isShuffleRef = useRef<boolean>(isShuffle);
  isShuffleRef.current = isShuffle;

  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;

  const shuffleHistoryRef = useRef<number[]>(shuffleHistory);
  shuffleHistoryRef.current = shuffleHistory;

  // Save state to localStorage for seamless continuity
  useEffect(() => {
    try {
      localStorage.setItem(
        PLAYER_STATE_KEY,
        JSON.stringify({
          trackIndex: safeIndex,
          volume,
          isMuted,
          isShuffle,
          repeatMode,
        })
      );
    } catch {
      // ignore
    }
  }, [safeIndex, volume, isMuted, isShuffle, repeatMode]);

  // Stop visualizer animation
  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setBarHeights([10, 15, 12, 18, 14, 12, 16, 14, 12, 10, 8, 6]);
  }, []);

  // Initialize Web Audio Context and Analyser (safe for same-origin, blob, and data URIs)
  const ensureAudioContext = useCallback(async (srcHint?: string) => {
    const activeSrc = srcHint || loadedSrcRef.current || audioRef.current?.src || '';
    const isCrossOriginExternal =
      activeSrc.startsWith('http') &&
      typeof window !== 'undefined' &&
      !activeSrc.startsWith(window.location.origin);

    if (!audioContextRef.current && !isCrossOriginExternal) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;

        if (audioRef.current && !sourceRef.current) {
          try {
            const src = ctx.createMediaElementSource(audioRef.current);
            src.connect(analyser);
            analyser.connect(ctx.destination);
            sourceRef.current = src;
          } catch {
            // Already connected or browser limitation; playback still proceeds cleanly
          }
        }

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      } catch (err) {
        console.warn('AudioContext note:', err);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch {
        // ignore resume lock
      }
    }
  }, []);

  // Visualizer loop: uses real analyser frequency data with organic animation
  const startVisualizer = useCallback(() => {
    if (animFrameRef.current) return;

    const loop = () => {
      if (analyserRef.current && audioContextRef.current?.state === 'running') {
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
        // Fallback organic wave animation
        const t = Date.now() / 150;
        const heights = Array.from({ length: 12 }, (_, i) => {
          const wave = Math.sin(t + i * 0.7) * 32 + 42;
          const jitter = Math.random() * 18;
          return Math.min(100, Math.max(10, wave + jitter));
        });
        setBarHeights(heights);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, []);

  // Update MediaSession API for lock-screen, background, and notifications playback
  const updateMediaSession = useCallback((track: MusicTrack, playing: boolean) => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist || 'Smork',
          album: 'Smoky Zone Official Selection',
          artwork: [
            {
              src: track.albumArt || '/images/StockCake-Neon Music Studio_1758587212.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
            },
            {
              src: track.albumArt || '/images/StockCake-Neon Music Studio_1758587212.jpg',
              sizes: '256x256',
              type: 'image/jpeg',
            },
          ],
        });

        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      } catch {
        // ignore MediaMetadata unsupported properties
      }
    }
  }, []);

  const handlePauseMusic = useCallback(() => {
    if (fadeAnimationRef.current) {
      cancelAnimationFrame(fadeAnimationRef.current);
      fadeAnimationRef.current = null;
    }
    if (audioRef.current) {
      pausedTimeRef.current = audioRef.current.currentTime || 0;
      audioRef.current.pause();
    }
    stopVisualizer();
    setIsPlaying(false);
    updateMediaSession(currentTrackRef.current, false);

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, [stopVisualizer, updateMediaSession]);

  // 500ms Cross-Fade: smooth fade-out before pausing for video/walkin
  const fadeOutMusic = useCallback((durationMs = 500): Promise<void> => {
    return new Promise((resolve) => {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
        fadeAnimationRef.current = null;
      }

      const audio = audioRef.current;
      if (!audio || !isPlayingRef.current) {
        handlePauseMusic();
        resolve();
        return;
      }

      const startVol = audio.volume;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const currentFadeVol = Math.max(0, startVol * (1 - progress));

        if (audioRef.current) {
          audioRef.current.volume = currentFadeVol;
        }

        if (progress < 1) {
          fadeAnimationRef.current = requestAnimationFrame(step);
        } else {
          fadeAnimationRef.current = null;
          handlePauseMusic();
          if (audioRef.current) {
            audioRef.current.volume = isMutedRef.current ? 0 : volumeRef.current;
          }
          resolve();
        }
      };

      fadeAnimationRef.current = requestAnimationFrame(step);
    });
  }, [handlePauseMusic]);

  // 500ms Cross-Fade: smooth fade-in after video finishes/closes
  const fadeInMusic = useCallback((targetPosition: number, durationMs = 500): Promise<void> => {
    return new Promise((resolve) => {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
        fadeAnimationRef.current = null;
      }

      const audio = audioRef.current;
      const targetVol = isMutedRef.current ? 0 : volumeRef.current;

      if (audio && typeof targetPosition === 'number' && !isNaN(targetPosition)) {
        try {
          audio.currentTime = targetPosition;
        } catch {
          // ignore seek restriction
        }
        audio.volume = 0;
      }

      // Start playback with 0 volume then fade in
      ensureAudioContext(loadedSrcRef.current || undefined).then(() => {
        if (audio) {
          audio.play().then(() => {
          setIsPlaying(true);
          startVisualizer();
          updateMediaSession(currentTrackRef.current, true);

          const startTime = performance.now();
          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / durationMs);
            const currentFadeVol = Math.min(targetVol, targetVol * progress);

            if (audioRef.current) {
              audioRef.current.volume = currentFadeVol;
            }

            if (progress < 1) {
              fadeAnimationRef.current = requestAnimationFrame(step);
            } else {
              fadeAnimationRef.current = null;
              if (audioRef.current) {
                audioRef.current.volume = targetVol;
              }
              resolve();
            }
          };

          fadeAnimationRef.current = requestAnimationFrame(step);
        }).catch(() => {
          resolve();
        });
      } else {
        resolve();
      }
      });
    });
  }, [ensureAudioContext, startVisualizer, updateMediaSession]);

  // Resolve audio source for a given track (checks IndexedDB/Firestore upload, valid track.audioSrc, then fallback)
  const resolveAudioSrc = useCallback(async (track: MusicTrack): Promise<string> => {
    try {
      const custom = await getMediaItem(`audio_track_${track.id}`);
      if (custom) return custom;
    } catch {
      // ignore
    }
    const rawSrc = track.audioSrc?.trim();
    if (rawSrc) {
      if (
        rawSrc.startsWith('/') ||
        rawSrc.startsWith('http://') ||
        rawSrc.startsWith('https://') ||
        rawSrc.startsWith('data:') ||
        rawSrc.startsWith('blob:')
      ) {
        return rawSrc;
      }
      // If it's a media storage key (e.g. audio_track_...), resolve it safely
      try {
        const storedByKey = await getMediaItem(rawSrc);
        if (storedByKey) return storedByKey;
      } catch {
        // ignore
      }
    }
    // Fallback real track to ensure continuous music with ZERO synthetic hypnotic noise
    return '/music/gunna_on_one_tonight.mp3';
  }, []);

  // Start continuous audio playback or resume current track from exact paused timestamp
  const startPlayback = useCallback(async (skipVolumeReset: boolean = false) => {
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    if (!audio) return;

    const isSameTrack = loadedTrackIdRef.current === track.id;
    const hasLoadedSource = Boolean(
      loadedSrcRef.current &&
      audio.src &&
      audio.src !== '' &&
      audio.src !== window.location.href
    );

    if (isSameTrack && hasLoadedSource) {
      await ensureAudioContext(loadedSrcRef.current || undefined);

      if (audio.ended) {
        audio.currentTime = 0;
        pausedTimeRef.current = 0;
      } else if (audio.currentTime === 0 && pausedTimeRef.current > 0) {
        try {
          audio.currentTime = pausedTimeRef.current;
        } catch {
          // ignore
        }
      }

      if (!skipVolumeReset) {
        audio.volume = isMutedRef.current ? 0 : volumeRef.current;
      }

      try {
        await audio.play();
        setIsPlaying(true);
        startVisualizer();
        updateMediaSession(track, true);
        window.dispatchEvent(new CustomEvent('smokyzone_music_playing'));
        mediaManager.onMusicPlay(audio.currentTime || 0);
        return;
      } catch (err) {
        console.warn('Direct resume notice, reloading track source...', err);
      }
    }

    // Load fresh track source
    const resolvedSrc = await resolveAudioSrc(track);
    if (!audioRef.current) return;

    await ensureAudioContext(resolvedSrc);

    const activeAudio = audioRef.current;
    const prevTime = isSameTrack ? pausedTimeRef.current : 0;

    if (loadedSrcRef.current !== resolvedSrc || loadedTrackIdRef.current !== track.id) {
      activeAudio.src = resolvedSrc;
      loadedSrcRef.current = resolvedSrc;
      loadedTrackIdRef.current = track.id;
      if (prevTime > 0) {
        const restorePos = () => {
          try {
            if (activeAudio && prevTime > 0) {
              activeAudio.currentTime = prevTime;
            }
          } catch {
            // ignore
          }
          activeAudio.removeEventListener('loadedmetadata', restorePos);
        };
        activeAudio.addEventListener('loadedmetadata', restorePos);
      }
    }

    if (!skipVolumeReset) {
      activeAudio.volume = isMutedRef.current ? 0 : volumeRef.current;
    }

    try {
      await activeAudio.play();
      setIsPlaying(true);
      startVisualizer();
      updateMediaSession(track, true);
      window.dispatchEvent(new CustomEvent('smokyzone_music_playing'));
      mediaManager.onMusicPlay(activeAudio.currentTime || 0);
    } catch (err) {
      console.warn('Audio play request notice (autoplay or user interaction):', err);
      setIsPlaying(false);
      stopVisualizer();
      updateMediaSession(track, false);
    }
  }, [ensureAudioContext, resolveAudioSrc, startVisualizer, stopVisualizer, updateMediaSession]);

  // Toggle Play / Pause using authoritative DOM paused state
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    const isActuallyPlaying = audio ? (!audio.paused && !audio.ended) : isPlayingRef.current;

    if (isActuallyPlaying) {
      if (audio) {
        pausedTimeRef.current = audio.currentTime || 0;
        audio.pause();
      }
      stopVisualizer();
      setIsPlaying(false);
      mediaManager.onMusicPause(true);
      updateMediaSession(currentTrackRef.current, false);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    } else {
      await startPlayback();
    }
  }, [startPlayback, stopVisualizer, updateMediaSession]);

  // Change Track: seamless transition across all tracks with zero hypnotic sound
  const changeTrack = useCallback(async (index: number, shouldAutoPlay: boolean = true) => {
    const list = playlistRef.current;
    if (list.length === 0) return;

    const nextIndex = (index % list.length + list.length) % list.length;
    const targetTrack = list[nextIndex];
    if (!targetTrack) return;

    isManualSwitchingRef.current = true;
    pausedTimeRef.current = 0;
    loadedTrackIdRef.current = targetTrack.id;
    setCurrentTrackIndex(nextIndex);
    setTrackProgress(0);
    setCurrentTimeFormatted('0:00');

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }

    try {
      const nextSrc = await resolveAudioSrc(targetTrack);

      if (audio) {
        await ensureAudioContext(nextSrc);
        audio.src = nextSrc;
        loadedSrcRef.current = nextSrc;
        loadedTrackIdRef.current = targetTrack.id;
        audio.currentTime = 0;
        audio.volume = isMutedRef.current ? 0 : volumeRef.current;

        if (shouldAutoPlay) {
          try {
            await audio.play();
            setIsPlaying(true);
            startVisualizer();
            updateMediaSession(targetTrack, true);
            mediaManager.onMusicPlay(0);
            window.dispatchEvent(new CustomEvent('smokyzone_music_playing'));
          } catch {
            setIsPlaying(false);
            stopVisualizer();
            updateMediaSession(targetTrack, false);
          }
        } else {
          setIsPlaying(false);
          stopVisualizer();
          updateMediaSession(targetTrack, false);
        }
      }
    } finally {
      isManualSwitchingRef.current = false;
    }
  }, [ensureAudioContext, resolveAudioSrc, startVisualizer, stopVisualizer, updateMediaSession]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      isShuffleRef.current = next;
      setShuffleHistory([]);
      broadcastAudioState({ isShuffle: next });
      return next;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      let next: RepeatMode = 'all';
      if (prev === 'all') next = 'one';
      else if (prev === 'one') next = 'off';
      else next = 'all';
      repeatModeRef.current = next;
      broadcastAudioState({ repeatMode: next });
      return next;
    });
  }, []);

  const toggleRepeatOne = useCallback(() => {
    setRepeatMode((prev) => {
      const next: RepeatMode = prev === 'one' ? 'all' : 'one';
      repeatModeRef.current = next;
      broadcastAudioState({ repeatMode: next });
      return next;
    });
  }, []);

  const handleNext = useCallback(
    async (isUserInitiated: boolean = true) => {
      const list = playlistRef.current;
      if (list.length === 0) return;

      // If track ended naturally and repeatMode is 'one', replay current track immediately
      if (!isUserInitiated && repeatModeRef.current === 'one') {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          try {
            await audio.play();
            setIsPlaying(true);
            startVisualizer();
            mediaManager.onMusicPlay(0);
            return;
          } catch {
            // fallback to changeTrack
          }
        }
      }

      // Shuffle active: randomly pick an index that is not the current track
      if (isShuffleRef.current && list.length > 1) {
        const currentIdx = currentTrackIndexRef.current;
        const candidates = list.map((_, i) => i).filter((i) => i !== currentIdx);
        const randomIdx = candidates[Math.floor(Math.random() * candidates.length)];
        setShuffleHistory((prev) => [...prev.slice(-25), currentIdx]);
        await changeTrack(randomIdx, true);
        return;
      }

      const currentIdx = currentTrackIndexRef.current;
      const isLastTrack = currentIdx === list.length - 1;

      // If repeat is off and track naturally reached end of playlist, pause playback
      if (!isUserInitiated && repeatModeRef.current === 'off' && isLastTrack) {
        handlePauseMusic();
        setTrackProgress(0);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        return;
      }

      const nextIdx = (currentIdx + 1) % list.length;
      await changeTrack(nextIdx, true);
    },
    [changeTrack, handlePauseMusic, startVisualizer]
  );

  const handlePrev = useCallback(async () => {
    const list = playlistRef.current;
    if (list.length === 0) return;

    // If played more than 3s, restart current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    // If shuffle is active and history exists, rewind to previously played track
    if (isShuffleRef.current && shuffleHistoryRef.current.length > 0) {
      const historyCopy = [...shuffleHistoryRef.current];
      const prevIdx = historyCopy.pop()!;
      setShuffleHistory(historyCopy);
      await changeTrack(prevIdx, true);
      return;
    }

    const prevIdx = (currentTrackIndexRef.current - 1 + list.length) % list.length;
    await changeTrack(prevIdx, true);
  }, [changeTrack]);

  // When a track finishes naturally, seamlessly auto-advance with repeat/shuffle logic
  const handleTrackEnded = useCallback(() => {
    handleNext(false);
  }, [handleNext]);

  // Audio timeupdate handler: synchronizes real progress bar and counter
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const cur = audio.currentTime || 0;
    const dur = audio.duration;

    const mins = Math.floor(cur / 60);
    const secs = Math.floor(cur % 60);
    setCurrentTimeFormatted(`${mins}:${secs < 10 ? '0' : ''}${secs}`);

    if (dur && !isNaN(dur) && dur > 0) {
      setTrackProgress((cur / dur) * 100);
    }
    mediaManager.updateMusicPosition(cur);

    // Update MediaSession position state for background lock-screen scrub bar
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      try {
        if (dur && !isNaN(dur) && dur > 0) {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: audio.playbackRate || 1,
            position: cur,
          });
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Configure navigator.mediaSession action handlers for system-wide controls (even when leaving the web page)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          startPlayback();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          togglePlay();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlePrev();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handleNext();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
          }
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          if (audioRef.current) {
            const skip = details.seekOffset || 10;
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skip);
          }
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          if (audioRef.current) {
            const skip = details.seekOffset || 10;
            audioRef.current.currentTime = Math.min(
              audioRef.current.duration || 9999,
              audioRef.current.currentTime + skip
            );
          }
        });
      } catch (err) {
        console.warn('MediaSession handler setup note:', err);
      }
    }
  }, [handleNext, handlePrev, startPlayback, togglePlay]);

  // Load audio source imperatively ONLY when track ID or actual audio URL changes (never disrupts paused position!)
  useEffect(() => {
    let isMounted = true;
    const trackSnapshot = currentTrack;

    const applyResolvedSrc = async (forceReload: boolean = false) => {
      if (isManualSwitchingRef.current && !forceReload) return;
      const src = await resolveAudioSrc(trackSnapshot);
      const audio = audioRef.current;
      if (!isMounted || !audio) return;
      if (isManualSwitchingRef.current && !forceReload) return;

      const trackChanged = loadedTrackIdRef.current !== trackSnapshot.id;
      const srcChanged = loadedSrcRef.current !== src;

      if (!trackChanged && !srcChanged && !forceReload) {
        return;
      }

      const wasPlaying = !audio.paused && !audio.ended;
      const savedTime = trackChanged ? 0 : audio.currentTime || pausedTimeRef.current || 0;

      if (trackChanged) {
        pausedTimeRef.current = 0;
      }

      audio.src = src;
      loadedSrcRef.current = src;
      loadedTrackIdRef.current = trackSnapshot.id;

      if (savedTime > 0 && !trackChanged) {
        const restorePos = () => {
          try {
            if (audioRef.current) audioRef.current.currentTime = savedTime;
          } catch {
            // ignore
          }
          audio.removeEventListener('loadedmetadata', restorePos);
        };
        audio.addEventListener('loadedmetadata', restorePos);
      }

      if (wasPlaying) {
        audio.play().catch(() => {});
      }
    };

    applyResolvedSrc(false);

    const handleMedia = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string; data?: string }>;
      if (!customEvent.detail || customEvent.detail.key === `audio_track_${trackSnapshot.id}`) {
        applyResolvedSrc(true);
      }
    };

    window.addEventListener('smokyzone_media_change', handleMedia);
    return () => {
      isMounted = false;
      window.removeEventListener('smokyzone_media_change', handleMedia);
    };
  }, [currentTrack.id, currentTrack.audioSrc, resolveAudioSrc]);

  // Global event listeners and mediaManager cross-fade registration
  useEffect(() => {
    const handleConfig = (e: Event) => {
      const custom = e as CustomEvent<SiteConfig>;
      if (custom.detail?.playlist?.length) {
        setPlaylist(custom.detail.playlist);
      } else {
        setPlaylist(getStoredConfig().playlist);
      }
    };

    const handleResumeMusic = (e: Event) => {
      const custom = e as CustomEvent<{ position?: number; fadeDuration?: number }>;
      const fadeDur = custom.detail?.fadeDuration ?? 500;
      const pos = custom.detail?.position ?? (audioRef.current?.currentTime || 0);
      fadeInMusic(pos, fadeDur);
    };

    const handleFadePauseMusic = (e: Event) => {
      const custom = e as CustomEvent<{ durationMs?: number }>;
      fadeOutMusic(custom.detail?.durationMs ?? 500);
    };

    const handleFadeResumeMusic = (e: Event) => {
      const custom = e as CustomEvent<{ durationMs?: number; position?: number }>;
      fadeInMusic(
        custom.detail?.position ?? (audioRef.current?.currentTime || 0),
        custom.detail?.durationMs ?? 500
      );
    };

    const unregisterController = mediaManager.registerMusicController({
      fadeOut: (dur) => fadeOutMusic(dur),
      fadeIn: (pos, dur) => fadeInMusic(pos, dur),
      getPosition: () => audioRef.current?.currentTime || 0,
      isPlaying: () => isPlayingRef.current,
      pauseImmediate: () => handlePauseMusic(),
    });

    window.addEventListener('smokyzone_config_change', handleConfig);
    window.addEventListener('smokyzone_pause_music', handlePauseMusic);
    window.addEventListener('smokyzone_resume_music', handleResumeMusic);
    window.addEventListener('smokyzone_fade_pause_music', handleFadePauseMusic);
    window.addEventListener('smokyzone_fade_resume_music', handleFadeResumeMusic);

    return () => {
      unregisterController();
      window.removeEventListener('smokyzone_config_change', handleConfig);
      window.removeEventListener('smokyzone_pause_music', handlePauseMusic);
      window.removeEventListener('smokyzone_resume_music', handleResumeMusic);
      window.removeEventListener('smokyzone_fade_pause_music', handleFadePauseMusic);
      window.removeEventListener('smokyzone_fade_resume_music', handleFadeResumeMusic);
    };
  }, [fadeInMusic, fadeOutMusic, handlePauseMusic]);

  // Broadcast state to global audio bus and service worker
  useEffect(() => {
    broadcastAudioState({
      isPlaying,
      trackIndex: safeIndex,
      trackId: currentTrack.id,
      title: currentTrack.title,
      artist: currentTrack.artist,
      albumArt: currentTrack.albumArt || '/images/StockCake-Neon Music Studio_1758587212.jpg',
      duration: currentTrack.duration,
      currentTime: audioRef.current?.currentTime || 0,
      progress: trackProgress,
      isMuted,
      volume,
      playlistCount: playlist.length,
      isShuffle,
      repeatMode,
    });
  }, [
    isPlaying,
    safeIndex,
    currentTrack,
    trackProgress,
    isMuted,
    volume,
    playlist.length,
    isShuffle,
    repeatMode,
  ]);

  // Subscribe to commands from GlobalMusicBar, background sync, and service worker
  useEffect(() => {
    const unsubscribe = subscribeAudioCommands((msg) => {
      switch (msg.action) {
        case 'play':
          startPlayback();
          break;
        case 'pause':
          handlePauseMusic();
          break;
        case 'toggle':
          togglePlay();
          break;
        case 'next':
          handleNext(true);
          break;
        case 'prev':
          handlePrev();
          break;
        case 'changeTrack':
          if (typeof msg.payload?.index === 'number') {
            changeTrack(msg.payload.index, true);
          }
          break;
        case 'seek':
          if (audioRef.current && typeof msg.payload?.time === 'number') {
            audioRef.current.currentTime = msg.payload.time;
          }
          break;
        case 'toggleMute':
          toggleMute();
          break;
        case 'toggleShuffle':
          toggleShuffle();
          break;
        case 'toggleRepeat':
          toggleRepeat();
          break;
        case 'toggleRepeatOne':
          toggleRepeatOne();
          break;
        case 'setShuffle':
          if (typeof msg.payload?.value === 'boolean') {
            setIsShuffle(msg.payload.value);
            isShuffleRef.current = msg.payload.value;
          }
          break;
        case 'setRepeat':
          if (msg.payload?.mode) {
            setRepeatMode(msg.payload.mode);
            repeatModeRef.current = msg.payload.mode;
          }
          break;
        case 'setVolume':
          if (typeof msg.payload?.volume === 'number') {
            setVolume(msg.payload.volume);
            if (audioRef.current) audioRef.current.volume = msg.payload.volume;
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [startPlayback, handlePauseMusic, togglePlay, handleNext, handlePrev, changeTrack]);

  // Tab un-minimize / visibility sync: ensures UI remains perfectly synchronized without manual refresh
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && audioRef.current) {
        const audio = audioRef.current;
        const actuallyPlaying = !audio.paused && !audio.ended;
        if (actuallyPlaying !== isPlayingRef.current) {
          setIsPlaying(actuallyPlaying);
        }
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setTrackProgress((audio.currentTime / audio.duration) * 100);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
        fadeAnimationRef.current = null;
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

  // Scrub progress on click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const audio = audioRef.current;
    if (audio && audio.duration && !isNaN(audio.duration)) {
      audio.currentTime = pct * audio.duration;
      setTrackProgress(pct * 100);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-5 sm:p-6 bg-gradient-to-br from-[#0A192F]/95 via-[#0F1D38]/95 to-[#050811]/98 border border-[#1E90FF]/30 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden text-left">
      {/* Background neon visualizer glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-[#1E90FF]/15 blur-3xl pointer-events-none" />

      {/* Header bar: Track info and Playlist toggle */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-[#1E90FF]/40 relative shadow-md">
            <img
              src={currentTrack.albumArt || '/images/StockCake-Neon Music Studio_1758587212.jpg'}
              alt={currentTrack.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-110' : ''}`}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-[#1E90FF]/25 flex items-center justify-center">
                <Disc className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="text-left overflow-hidden min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-sm sm:text-base font-['Outfit',sans-serif] tracking-tight truncate">
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
          className={`p-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
            showPlaylist
              ? 'bg-[#1E90FF] text-white border-[#1E90FF] shadow-md shadow-[#1E90FF]/30'
              : 'bg-[#050811] text-slate-300 border-white/10 hover:border-[#1E90FF]/50'
          }`}
          title="Toggle Track Catalog"
          aria-label="Toggle Track Catalog"
        >
          <ListMusic className="w-4 h-4" />
          <span className="hidden sm:inline font-semibold">{playlist.length} Tracks</span>
        </button>
      </div>

      {/* Interactive progress bar */}
      <div
        onClick={handleProgressClick}
        className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden mb-2 cursor-pointer group relative"
        title="Click to seek"
      >
        <div
          className="bg-gradient-to-r from-[#1E90FF] via-cyan-400 to-[#1E90FF] h-full transition-all duration-150"
          style={{ width: `${Math.max(1, Math.min(100, trackProgress))}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mb-3 px-0.5">
        <span>{currentTimeFormatted}</span>
        <span className="text-slate-300">{currentTrack.duration}</span>
      </div>

      {/* Main player controls & 12-bar equalizer */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 py-1">
        {/* Playback Controls with Shuffle & Repeat */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Shuffle Button */}
          <button
            onClick={toggleShuffle}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              isShuffle
                ? 'bg-[#1E90FF]/25 text-[#1E90FF] border-[#1E90FF] shadow-sm shadow-[#1E90FF]/30'
                : 'bg-[#050811] text-slate-400 hover:text-white border-white/10 hover:border-white/20'
            }`}
            title={isShuffle ? 'Shuffle: ON (Randomize playback order)' : 'Shuffle: OFF (Play sequentially)'}
            aria-label="Toggle Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Previous Track */}
          <button
            onClick={handlePrev}
            className="p-2 sm:p-2.5 rounded-xl bg-[#050811] hover:bg-[#1E90FF]/20 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
            title="Previous Track"
            aria-label="Previous Track"
          >
            <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Main Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#1873cc] to-[#1E90FF] hover:brightness-110 text-white flex items-center justify-center font-bold text-lg transition-all shadow-lg shadow-[#1E90FF]/40 cursor-pointer active:scale-95 flex-shrink-0"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            title={isPlaying ? 'Pause playback' : 'Play track'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={() => handleNext(true)}
            className="p-2 sm:p-2.5 rounded-xl bg-[#050811] hover:bg-[#1E90FF]/20 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
            title="Next Track"
            aria-label="Next Track"
          >
            <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Repeat One Button */}
          <button
            onClick={toggleRepeatOne}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 relative ${
              repeatMode === 'one'
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/30'
                : 'bg-[#050811] text-slate-400 hover:text-white border-white/10 hover:border-white/20'
            }`}
            title={
              repeatMode === 'one'
                ? 'Repeat One: ON (Looping current track)'
                : 'Repeat One: OFF (Click to loop single track)'
            }
            aria-label="Toggle Repeat One"
          >
            <Repeat1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 text-black text-[8px] font-black flex items-center justify-center font-mono">
                1
              </span>
            )}
          </button>
        </div>

        {/* 12-Bar Equalizer Display with Track Info beneath */}
        <div className="flex flex-col items-center flex-1 max-w-[220px]">
          <div className="flex justify-between items-end w-full h-16 px-3 py-1.5 bg-[#050811]/90 rounded-xl border border-white/10 shadow-inner">
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

          {/* Currently playing track title and artist beneath the visualizer */}
          <div className="w-full text-center mt-2 px-1 overflow-hidden">
            <p className="text-white text-xs font-bold font-['Outfit',sans-serif] truncate leading-tight tracking-tight">
              {currentTrack.title}
            </p>
            <p className="text-[11px] text-[#1E90FF] font-mono truncate leading-tight mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
        </div>
      </div>

      {/* Footer controls: volume slider & track tag */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-[#1E90FF] transition-colors p-1 cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-300" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume slider"
            className="w-20 accent-[#1E90FF] cursor-pointer h-1.5 bg-slate-900 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap justify-end">
          {isShuffle && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1E90FF]/20 text-[#1E90FF] border border-[#1E90FF]/30">
              SHUFFLE
            </span>
          )}
          {repeatMode !== 'off' && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
              {repeatMode === 'one' ? 'REPEAT 1' : 'REPEAT ALL'}
            </span>
          )}
          <span className="text-[#1E90FF] flex items-center gap-1 font-semibold">
            <Radio className="w-3 h-3 animate-pulse text-[#1E90FF]" />
            {currentTrack.tag}
          </span>
          <span className="text-slate-400">({currentTrack.duration})</span>
        </div>
      </div>

      {/* Smoky Zone Official Selection Playlist Controls & Catalog */}
      <div className="mt-5 pt-4 border-t border-white/10 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-[#1E90FF]" />
            <span className="text-xs font-mono text-[#1E90FF] font-bold tracking-wider">
              SMOKY ZONE OFFICIAL SELECTION
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
              {playlist.length} TRACKS
            </span>
          </div>

          {/* Buttons to toggle 'Repeat One' and 'Shuffle' modes */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                isShuffle
                  ? 'bg-[#1E90FF]/25 text-[#1E90FF] border-[#1E90FF] shadow-sm shadow-[#1E90FF]/30'
                  : 'bg-[#050811] text-slate-300 hover:text-white border-white/10 hover:border-white/20'
              }`}
              aria-label="Toggle Shuffle"
              title="Toggle Shuffle mode for Smoky Zone Official Selection playlist"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  isShuffle ? 'bg-[#1E90FF] text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {isShuffle ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleRepeatOne}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                repeatMode === 'one'
                  ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/30'
                  : 'bg-[#050811] text-slate-300 hover:text-white border-white/10 hover:border-white/20'
              }`}
              aria-label="Toggle Repeat One"
              title="Toggle Repeat One mode for Smoky Zone Official Selection playlist"
            >
              <Repeat1 className="w-3.5 h-3.5 text-cyan-300" />
              <span>Repeat One</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  repeatMode === 'one' ? 'bg-cyan-400 text-black' : 'bg-white/10 text-slate-400'
                }`}
              >
                {repeatMode === 'one' ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-[#050811] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              title={showPlaylist ? 'Hide Track List' : 'View Track List'}
              aria-label={showPlaylist ? 'Hide Track List' : 'View Track List'}
            >
              {showPlaylist ? 'Hide ✕' : 'View List'}
            </button>
          </div>
        </div>

        {showPlaylist && (
          <div className="max-h-72 overflow-y-auto space-y-1.5 text-left custom-scrollbar pt-1">

          {playlist.map((track, idx) => {
            const isCurrent = idx === safeIndex;
            const needsReview =
              track.tag?.toLowerCase().includes('review') ||
              track.title?.toLowerCase().includes('review');

            return (
              <button
                key={track.id || `track-${idx}`}
                onClick={() => changeTrack(idx, true)}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#1E90FF]/25 text-white border border-[#1E90FF]/60 shadow-md shadow-[#1E90FF]/15'
                    : 'bg-[#050811]/70 text-slate-300 hover:bg-white/5 border border-white/5'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="font-mono text-[11px] text-slate-400 w-5 flex-shrink-0">
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
      </div>

      {/* Hidden audio element for real continuous media playback with MediaSession background support */}
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => {
          setIsPlaying(true);
          startVisualizer();
          updateMediaSession(currentTrackRef.current, true);
        }}
        onPause={() => {
          if (audioRef.current) {
            pausedTimeRef.current = audioRef.current.currentTime || 0;
          }
          setIsPlaying(false);
          stopVisualizer();
          updateMediaSession(currentTrackRef.current, false);
        }}
        onEnded={handleTrackEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={() => {
          if (!loadedSrcRef.current) return;
          console.warn('Track audio source error, gracefully advancing...');
          handleNext();
        }}
      />
    </div>
  );
};
