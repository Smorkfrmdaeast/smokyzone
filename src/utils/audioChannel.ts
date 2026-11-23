import { MusicTrack } from '../data';

export type RepeatMode = 'off' | 'all' | 'one';

export interface GlobalAudioState {
  isPlaying: boolean;
  trackIndex: number;
  trackId: string;
  title: string;
  artist: string;
  albumArt: string;
  duration: string;
  currentTime: number;
  progress: number;
  isMuted: boolean;
  volume: number;
  playlistCount: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
}

export type AudioAction =
  | 'play'
  | 'pause'
  | 'toggle'
  | 'next'
  | 'prev'
  | 'seek'
  | 'setVolume'
  | 'toggleMute'
  | 'changeTrack'
  | 'toggleShuffle'
  | 'toggleRepeat'
  | 'toggleRepeatOne'
  | 'setShuffle'
  | 'setRepeat';

export interface AudioCommandMessage {
  type: 'AUDIO_COMMAND';
  action: AudioAction;
  payload?: any;
  timestamp: number;
}

export interface AudioStateMessage {
  type: 'PLAYER_STATE_UPDATE';
  state: GlobalAudioState;
  timestamp: number;
}

const STORAGE_KEY_STATE = 'smokyzone_global_audio_state_v1';
const CHANNEL_NAME = 'smokyzone_audio_channel';

// In-memory latest state cache
let latestAudioState: GlobalAudioState = {
  isPlaying: false,
  trackIndex: 0,
  trackId: 'track-1',
  title: 'On One Tonight',
  artist: 'Gunna',
  albumArt: '/images/StockCake-Neon Music Studio_1758587212.jpg',
  duration: '1:53',
  currentTime: 0,
  progress: 0,
  isMuted: false,
  volume: 0.85,
  playlistCount: 11,
  isShuffle: false,
  repeatMode: 'all',
};

// Try reading initial state from localStorage
try {
  const saved = localStorage.getItem(STORAGE_KEY_STATE);
  if (saved) {
    const parsed = JSON.parse(saved);
    latestAudioState = { ...latestAudioState, ...parsed, isPlaying: false };
  }
} catch {
  // fallback
}

// BroadcastChannel instance
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

// Listeners
const commandListeners = new Set<(msg: AudioCommandMessage) => void>();
const stateListeners = new Set<(state: GlobalAudioState) => void>();

// Wire up broadcast channel listener
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (!event.data) return;
    if (event.data.type === 'AUDIO_COMMAND') {
      commandListeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch (e) {
          console.warn('Command listener error:', e);
        }
      });
    } else if (event.data.type === 'PLAYER_STATE_UPDATE') {
      latestAudioState = { ...latestAudioState, ...event.data.state };
      stateListeners.forEach((listener) => {
        try {
          listener(latestAudioState);
        } catch (e) {
          console.warn('State listener error:', e);
        }
      });
    }
  };
}

// Also wire ServiceWorker message listener
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'AUDIO_COMMAND') {
      commandListeners.forEach((listener) => listener(event.data));
    } else if (event.data.type === 'PLAYER_STATE_UPDATE') {
      latestAudioState = { ...latestAudioState, ...event.data.state };
      stateListeners.forEach((listener) => listener(latestAudioState));
    } else if (event.data.type === 'REQUEST_AUDIO_STATE_SYNC') {
      // Re-broadcast state so freshly focused tab receives it
      broadcastAudioState(latestAudioState);
    }
  });
}

// Tab Visibility Restoration: re-sync when user switches back to tab or un-minimizes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Notify listeners of fresh state
      stateListeners.forEach((listener) => listener(latestAudioState));

      // Attempt background sync registration if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((reg: any) => {
          if (reg.sync) {
            reg.sync.register('sync-audio-state').catch(() => {});
          }
        }).catch(() => {});
      }
    }
  });
}

/**
 * Dispatch an audio control command from ANY part of the website or background
 */
export const sendAudioCommand = (action: AudioAction, payload?: any) => {
  const msg: AudioCommandMessage = {
    type: 'AUDIO_COMMAND',
    action,
    payload,
    timestamp: Date.now(),
  };

  // 1. Dispatch locally via DOM CustomEvent
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smokyzone_audio_cmd', { detail: msg }));
  }

  // 2. Broadcast via BroadcastChannel to other tabs / windows
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(msg);
    } catch {
      // ignore
    }
  }

  // 3. Forward to Service Worker
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }

  // 4. Invoke local listeners
  commandListeners.forEach((listener) => {
    try {
      listener(msg);
    } catch {
      // ignore
    }
  });
};

/**
 * Publish the latest player state from AudioPlayer to the global bus
 */
export const broadcastAudioState = (partialState: Partial<GlobalAudioState>) => {
  latestAudioState = { ...latestAudioState, ...partialState };

  const msg: AudioStateMessage = {
    type: 'PLAYER_STATE_UPDATE',
    state: latestAudioState,
    timestamp: Date.now(),
  };

  // 1. Cache to localStorage for page reload continuity
  try {
    localStorage.setItem(
      STORAGE_KEY_STATE,
      JSON.stringify({
        trackIndex: latestAudioState.trackIndex,
        trackId: latestAudioState.trackId,
        title: latestAudioState.title,
        artist: latestAudioState.artist,
        duration: latestAudioState.duration,
        volume: latestAudioState.volume,
        isMuted: latestAudioState.isMuted,
      })
    );
  } catch {
    // quota safety
  }

  // 2. Dispatch locally
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smokyzone_audio_state', { detail: latestAudioState }));
  }

  // 3. Broadcast to other tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(msg);
    } catch {
      // ignore
    }
  }

  // 4. Notify service worker
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }

  // 5. Notify local subscribers
  stateListeners.forEach((listener) => {
    try {
      listener(latestAudioState);
    } catch {
      // ignore
    }
  });
};

/**
 * Subscribe to commands (e.g. from AudioPlayer to execute commands)
 */
export const subscribeAudioCommands = (handler: (msg: AudioCommandMessage) => void): (() => void) => {
  commandListeners.add(handler);

  const localDomHandler = (e: Event) => {
    const custom = e as CustomEvent<AudioCommandMessage>;
    if (custom.detail) {
      handler(custom.detail);
    }
  };
  window.addEventListener('smokyzone_audio_cmd', localDomHandler);

  return () => {
    commandListeners.delete(handler);
    window.removeEventListener('smokyzone_audio_cmd', localDomHandler);
  };
};

/**
 * Subscribe to state updates (e.g. GlobalMusicBar, floating badges, etc.)
 */
export const subscribeAudioState = (handler: (state: GlobalAudioState) => void): (() => void) => {
  stateListeners.add(handler);
  // Send current state immediately
  handler(latestAudioState);

  const localDomHandler = (e: Event) => {
    const custom = e as CustomEvent<GlobalAudioState>;
    if (custom.detail) {
      handler(custom.detail);
    }
  };
  window.addEventListener('smokyzone_audio_state', localDomHandler);

  return () => {
    stateListeners.delete(handler);
    window.removeEventListener('smokyzone_audio_state', localDomHandler);
  };
};

export const getLatestAudioState = (): GlobalAudioState => {
  return latestAudioState;
};
