// Global Audio & Media Manager for Smoky Zone
// Guarantees:
// 1. Only ONE media source plays at a time.
// 2. Immediate, zero-latency pause of background music when any video starts (ensuring 'On One Tonight' NEVER overlaps with videos).
// 3. Smooth 500ms cross-fade in when resuming music after video finishes/closes.
// 4. Music resumes from the exact position where it paused, ONLY if it was playing beforehand.
// 5. Switching browser tabs immediately pauses all playing media.
// 6. Explicit synchronization between AudioPlayer, CelebrityVideoModal, and Unfiltered walk-in audio.

export type MediaSourceType = 'music' | 'video' | 'walkin' | 'none';

export interface MediaManagerState {
  activeSource: MediaSourceType;
  activeVideoId: string | null;
  wasMusicPlayingBeforeVideo: boolean;
  musicPosition: number;
  isFading: boolean;
}

export interface MusicController {
  fadeOut: (durationMs: number) => Promise<void>;
  fadeIn: (targetPosition: number, durationMs: number) => Promise<void>;
  getPosition: () => number;
  isPlaying: () => boolean;
  pauseImmediate: () => void;
}

class MediaManager {
  private state: MediaManagerState = {
    activeSource: 'none',
    activeVideoId: null,
    wasMusicPlayingBeforeVideo: false,
    musicPosition: 0,
    isFading: false,
  };

  private listeners: Set<(state: MediaManagerState) => void> = new Set();
  private musicController: MusicController | null = null;
  private fadeDurationMs: number = 500; // 500ms smooth cross-fade duration

  constructor() {
    if (typeof window !== 'undefined') {
      // Switching browser tabs pauses everything immediately
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseAllMedia('tab_hidden');
        }
      });
    }
  }

  public setFadeDuration(ms: number) {
    this.fadeDurationMs = Math.max(50, ms);
  }

  public getFadeDuration(): number {
    return this.fadeDurationMs;
  }

  // Register the active music player controller
  public registerMusicController(controller: MusicController): () => void {
    this.musicController = controller;
    return () => {
      if (this.musicController === controller) {
        this.musicController = null;
      }
    };
  }

  public subscribe(listener: (state: MediaManagerState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  public pauseAllMedia(reason: string = 'global_pause') {
    if (this.musicController && this.musicController.isPlaying()) {
      this.musicController.pauseImmediate();
    }
    if (this.state.activeSource === 'music') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_music', { detail: { reason } }));
    }
    if (this.state.activeSource === 'video') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_video', { detail: { reason } }));
    }
    if (this.state.activeSource === 'walkin') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_walkin', { detail: { reason } }));
    }
    this.state.activeSource = 'none';
    this.state.activeVideoId = null;
    this.notify();
  }

  // Music Player notifies when it starts playback
  public onMusicPlay(position?: number) {
    if (typeof position === 'number') {
      this.state.musicPosition = position;
    } else if (this.musicController) {
      this.state.musicPosition = this.musicController.getPosition();
    }

    // Since user explicitly pressed play on music, clear wasMusicPlayingBeforeVideo
    this.state.wasMusicPlayingBeforeVideo = false;

    // Immediately stop any video or walkin audio if playing
    if (this.state.activeSource === 'video') {
      window.dispatchEvent(
        new CustomEvent('smokyzone_pause_video', { detail: { reason: 'music_started' } })
      );
    }
    if (this.state.activeSource === 'walkin') {
      window.dispatchEvent(
        new CustomEvent('smokyzone_pause_walkin', { detail: { reason: 'music_started' } })
      );
    }

    this.state.activeSource = 'music';
    this.state.activeVideoId = null;
    this.notify();
  }

  // Track music position continuously
  public updateMusicPosition(pos: number) {
    this.state.musicPosition = pos;
  }

  // User manually toggles music pause in the AudioPlayer UI
  public onMusicPause(isManualUserAction = false) {
    if (isManualUserAction) {
      this.state.wasMusicPlayingBeforeVideo = false;
      if (this.state.activeSource === 'music') {
        this.state.activeSource = 'none';
      }
    }
    this.notify();
  }

  // Video plays with sound (e.g. Fullscreen modal opened or unmuted)
  public onVideoPlay(videoId: string, hasSound: boolean) {
    // If another video was already playing, stop it first
    if (this.state.activeSource === 'video' && this.state.activeVideoId && this.state.activeVideoId !== videoId) {
      window.dispatchEvent(
        new CustomEvent('smokyzone_pause_video', { detail: { previousId: this.state.activeVideoId } })
      );
    }

    if (hasSound) {
      // Check if background music is currently active
      const isMusicActive =
        this.state.activeSource === 'music' ||
        (this.musicController ? this.musicController.isPlaying() : false);

      if (isMusicActive) {
        this.state.wasMusicPlayingBeforeVideo = true;
        if (this.musicController) {
          this.state.musicPosition = this.musicController.getPosition();
          // IMMEDIATELY pause background music with zero latency so 'On One Tonight' NEVER overlaps with video sound!
          this.musicController.pauseImmediate();
        } else {
          window.dispatchEvent(
            new CustomEvent('smokyzone_pause_music', { detail: { reason: 'video_sound' } })
          );
        }
      }

      if (this.state.activeSource === 'walkin') {
        window.dispatchEvent(
          new CustomEvent('smokyzone_pause_walkin', { detail: { reason: 'video_sound' } })
        );
      }

      this.state.activeSource = 'video';
      this.state.activeVideoId = videoId;
    }
    this.notify();
  }

  // Walk-in atmospheric audio plays
  public onWalkinPlay() {
    const isMusicActive =
      this.state.activeSource === 'music' ||
      (this.musicController ? this.musicController.isPlaying() : false);

    if (isMusicActive) {
      this.state.wasMusicPlayingBeforeVideo = true;
      if (this.musicController) {
        this.state.musicPosition = this.musicController.getPosition();
        this.musicController.pauseImmediate();
      } else {
        window.dispatchEvent(
          new CustomEvent('smokyzone_pause_music', { detail: { reason: 'walkin_audio' } })
        );
      }
    }

    if (this.state.activeSource === 'video') {
      window.dispatchEvent(
        new CustomEvent('smokyzone_pause_video', { detail: { reason: 'walkin_audio' } })
      );
    }
    this.state.activeSource = 'walkin';
    this.notify();
  }

  // Walk-in audio stopped or paused
  public async onWalkinStop() {
    if (this.state.activeSource === 'walkin') {
      this.state.activeSource = 'none';

      // Resume music with 500ms fade-in if it was playing before
      if (this.state.wasMusicPlayingBeforeVideo) {
        this.state.wasMusicPlayingBeforeVideo = false;
        const resumePos = this.state.musicPosition;

        this.state.isFading = true;
        this.state.activeSource = 'music';
        this.notify();

        if (this.musicController) {
          try {
            await this.musicController.fadeIn(resumePos, this.fadeDurationMs);
          } catch {
            window.dispatchEvent(
              new CustomEvent('smokyzone_resume_music', { detail: { position: resumePos } })
            );
          }
        } else {
          window.dispatchEvent(
            new CustomEvent('smokyzone_fade_resume_music', {
              detail: { durationMs: this.fadeDurationMs, position: resumePos },
            })
          );
          window.dispatchEvent(
            new CustomEvent('smokyzone_resume_music', { detail: { position: resumePos, fadeDuration: this.fadeDurationMs } })
          );
        }
        this.state.isFading = false;
      }
    }
    this.notify();
  }

  // Video modal closed, video paused, or finished
  public async onVideoStop(videoId?: string) {
    if (this.state.activeSource === 'video' && (!videoId || this.state.activeVideoId === videoId)) {
      this.state.activeSource = 'none';
      this.state.activeVideoId = null;

      // Resume music with 500ms cross-fade from exact same spot, only if it was playing before!
      if (this.state.wasMusicPlayingBeforeVideo) {
        this.state.wasMusicPlayingBeforeVideo = false;
        const resumePos = this.state.musicPosition;

        this.state.isFading = true;
        this.state.activeSource = 'music';
        this.notify();

        if (this.musicController) {
          try {
            await this.musicController.fadeIn(resumePos, this.fadeDurationMs);
          } catch {
            window.dispatchEvent(
              new CustomEvent('smokyzone_resume_music', { detail: { position: resumePos } })
            );
          }
        } else {
          window.dispatchEvent(
            new CustomEvent('smokyzone_fade_resume_music', {
              detail: { durationMs: this.fadeDurationMs, position: resumePos },
            })
          );
          window.dispatchEvent(
            new CustomEvent('smokyzone_resume_music', { detail: { position: resumePos, fadeDuration: this.fadeDurationMs } })
          );
        }
        this.state.isFading = false;
      }
    }
    this.notify();
  }

  public getState(): MediaManagerState {
    return { ...this.state };
  }
}

export const mediaManager = new MediaManager();
