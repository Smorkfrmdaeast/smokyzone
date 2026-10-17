// IndexedDB & LocalStorage persistent reactive store for Smoky Zone
// Supports instant phone editing, photos, videos, MP3s, playlist curation, and text labels.

import { CELEBRITY_PLAYLIST, VIDEO_PREVIEW_CLIPS, MusicTrack, VideoClipItem } from '../data';

const DB_NAME = 'smokyzone_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_store';

// IndexedDB Helper for large media (video files, audio MP3s, photos)
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const setMediaItem = async (key: string, dataUrlOrBlob: string): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrlOrBlob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    // Trigger store update event for live public reactivity
    window.dispatchEvent(new CustomEvent('smokyzone_media_change', { detail: { key } }));
  } catch {
    try {
      localStorage.setItem(`smokyzone_media_${key}`, dataUrlOrBlob);
      window.dispatchEvent(new CustomEvent('smokyzone_media_change', { detail: { key } }));
    } catch {
      // Storage fallback
    }
  }
};

export const getMediaItem = async (key: string): Promise<string | null> => {
  try {
    const db = await openDB();
    const val = await new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (val) return val;
  } catch {
    // fallback to localStorage
  }
  return localStorage.getItem(`smokyzone_media_${key}`) || null;
};

export const removeMediaItem = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // fallback
  }
  localStorage.removeItem(`smokyzone_media_${key}`);
  window.dispatchEvent(new CustomEvent('smokyzone_media_change', { detail: { key } }));
};

// Site Config State: Playlist, Short Videos, Text Labels
export interface SiteConfig {
  walkinPhoto: string | null;
  playlist: MusicTrack[];
  videoClips: VideoClipItem[];
  labels: {
    heroTitle: string;
    heroSubtitle: string;
    celebrityBadge: string;
    celebrityQuote: string;
    walkinTagline: string;
  };
  projectPhotos: Record<string, string>;
}

const CONFIG_STORAGE_KEY = 'smokyzone_site_config_v1';

export const getDefaultConfig = (): SiteConfig => {
  return {
    walkinPhoto: null,
    playlist: CELEBRITY_PLAYLIST,
    videoClips: VIDEO_PREVIEW_CLIPS,
    labels: {
      heroTitle: 'ONE MIND. DIFFERENT WORLDS. ONE AUTHENTIC JOURNEY.',
      heroSubtitle: 'Technology Engineering · Raw Cultural Commentary · Real Community Life',
      celebrityBadge: 'Drill Music',
      celebrityQuote: 'Real recognizes real. When you come from where I come from, you don\'t speak to impress; you speak what is real.',
      walkinTagline: 'RAW ENERGY. NO CUTS.',
    },
    projectPhotos: {},
  };
};

export const getStoredConfig = (): SiteConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return getDefaultConfig();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultConfig(),
      ...parsed,
      playlist: parsed.playlist?.length ? parsed.playlist : CELEBRITY_PLAYLIST,
      videoClips: parsed.videoClips?.length ? parsed.videoClips : VIDEO_PREVIEW_CLIPS,
      labels: {
        ...getDefaultConfig().labels,
        ...(parsed.labels || {}),
      },
      projectPhotos: parsed.projectPhotos || {},
    };
  } catch {
    return getDefaultConfig();
  }
};

export const saveStoredConfig = (config: SiteConfig): void => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('smokyzone_config_change', { detail: config }));
  } catch (err) {
    console.warn('Failed to save config:', err);
  }
};

export const resetStoredConfig = (): void => {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('smokyzone_config_change', { detail: getDefaultConfig() }));
  } catch (err) {
    console.warn('Failed to reset config:', err);
  }
};

// Passcode Authentication
const ADMIN_PASSCODE_KEY = 'smokyzone_admin_passcode';
const ADMIN_SESSION_KEY = 'smokyzone_admin_auth_session';
const DEFAULT_PASSCODE = 'smork2026';

export const getAdminPasscode = (): string => {
  return localStorage.getItem(ADMIN_PASSCODE_KEY) || DEFAULT_PASSCODE;
};

export const setAdminPasscode = (newPass: string): void => {
  localStorage.setItem(ADMIN_PASSCODE_KEY, newPass);
};

export const isUserAdminAuthenticated = (): boolean => {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true' || localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
};

export const verifyAdminPasscode = (input: string, remember = true): boolean => {
  const current = getAdminPasscode();
  if (input.trim() === current.trim()) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    if (remember) {
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    }
    return true;
  }
  return false;
};

export const adminSignOut = (): void => {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('smokyzone_auth_change'));
};
