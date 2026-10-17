// Global Audio & Media Manager for Smoky Zone
// Guarantees:
// 1. Only ONE media source plays at a time.
// 2. When any video preview or walk-in video plays with sound, music pauses automatically.
// 3. When that video/walk-in is closed, paused, or finished, music resumes from the exact spot (only if it was playing before).
// 4. Inline short-video previews stay strictly muted until tapped.
// 5. Switching browser tabs immediately pauses all playing media.
// 6. Opening another video stops the first one.

export type MediaSourceType = 'music' | 'video' | 'walkin' | 'none';

export interface MediaManagerState {
  activeSource: MediaSourceType;
  activeVideoId: string | null;
  wasMusicPlayingBeforeVideo: boolean;
  musicPosition: number;
}

class MediaManager {
  private state: MediaManagerState = {
    activeSource: 'none',
    activeVideoId: null,
    wasMusicPlayingBeforeVideo: false,
    musicPosition: 0,
  };

  private listeners: Set<(state: MediaManagerState) => void> = new Set();

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
    if (this.state.activeSource === 'music') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_music', { detail: { reason } }));
    }
    if (this.state.activeSource === 'video') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_video', { detail: { reason } }));
    }
    if (this.state.activeSource === 'walkin') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_walkin', { detail: { reason } }));
    }
  }

  // Music Player notifies when it starts playback
  public onMusicPlay(position?: number) {
    if (typeof position === 'number') {
      this.state.musicPosition = position;
    }

    // Immediately stop any video or walkin audio if playing
    if (this.state.activeSource === 'video') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_video', { detail: { reason: 'music_started' } }));
    }
    if (this.state.activeSource === 'walkin') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_walkin', { detail: { reason: 'music_started' } }));
    }

    this.state.activeSource = 'music';
    this.state.activeVideoId = null;
    this.notify();
  }

  // Track music position continuously
  public updateMusicPosition(pos: number) {
    this.state.musicPosition = pos;
  }

  // User manually toggles music pause
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
      // If music was playing, remember it and pause automatically
      if (this.state.activeSource === 'music') {
        this.state.wasMusicPlayingBeforeVideo = true;
        window.dispatchEvent(new CustomEvent('smokyzone_pause_music', { detail: { reason: 'video_sound' } }));
      }
      if (this.state.activeSource === 'walkin') {
        window.dispatchEvent(new CustomEvent('smokyzone_pause_walkin', { detail: { reason: 'video_sound' } }));
      }

      this.state.activeSource = 'video';
      this.state.activeVideoId = videoId;
    }
    this.notify();
  }

  // Walk-in atmospheric audio plays
  public onWalkinPlay() {
    if (this.state.activeSource === 'music') {
      this.state.wasMusicPlayingBeforeVideo = true;
      window.dispatchEvent(new CustomEvent('smokyzone_pause_music', { detail: { reason: 'walkin_audio' } }));
    }
    if (this.state.activeSource === 'video') {
      window.dispatchEvent(new CustomEvent('smokyzone_pause_video', { detail: { reason: 'walkin_audio' } }));
    }
    this.state.activeSource = 'walkin';
    this.notify();
  }

  // Walk-in audio stopped or paused
  public onWalkinStop() {
    if (this.state.activeSource === 'walkin') {
      this.state.activeSource = 'none';
      if (this.state.wasMusicPlayingBeforeVideo) {
        this.state.wasMusicPlayingBeforeVideo = false;
        window.dispatchEvent(
          new CustomEvent('smokyzone_resume_music', { detail: { position: this.state.musicPosition } })
        );
      }
    }
    this.notify();
  }

  // Video modal closed, video paused, or finished
  public onVideoStop(videoId?: string) {
    if (this.state.activeSource === 'video' && (!videoId || this.state.activeVideoId === videoId)) {
      this.state.activeSource = 'none';
      this.state.activeVideoId = null;

      // Resume music from the exact same spot, but only if it was playing before!
      if (this.state.wasMusicPlayingBeforeVideo) {
        this.state.wasMusicPlayingBeforeVideo = false;
        window.dispatchEvent(
          new CustomEvent('smokyzone_resume_music', { detail: { position: this.state.musicPosition } })
        );
      }
    }
    this.notify();
  }

  public getState(): MediaManagerState {
    return { ...this.state };
  }
}

export const mediaManager = new MediaManager();
