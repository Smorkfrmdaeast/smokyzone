// IndexedDB, LocalStorage & Firebase Firestore persistent reactive store for Smoky Zone
// Full real-time synchronization across all devices and visitors.

import {
  CELEBRITY_PLAYLIST,
  VIDEO_PREVIEW_CLIPS,
  SMORK_BIO,
  PORTFOLIO_PROJECTS,
  UNFILTERED_THOUGHTS,
  MusicTrack,
  VideoClipItem,
  PortfolioProject,
  UnfilteredThought,
} from '../data';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';

const DB_NAME = 'smokyzone_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_store';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.warn('Firestore Note:', JSON.stringify(errInfo));
}

// IndexedDB Helper for large media (video files, audio MP3s, photos)
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains(STORE_NAME)) {
        idb.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const setMediaItem = async (key: string, dataUrlOrBlob: string, mimeType?: string): Promise<void> => {
  // 1. Save to local IndexedDB for immediate zero-latency playback
  try {
    const idb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrlOrBlob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // fallback to localStorage
  }

  try {
    localStorage.setItem(`smokyzone_media_${key}`, dataUrlOrBlob);
    localStorage.setItem(`smokyzone_photo_${key}`, dataUrlOrBlob);
  } catch {
    // Local quota safety
  }

  // Trigger instant local event across active components
  window.dispatchEvent(new CustomEvent('smokyzone_media_change', { detail: { key, data: dataUrlOrBlob } }));

  // 2. Persist to Firestore Cloud Database so all visitors worldwide see it in real-time
  try {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'media_items', sanitizedKey);
    await setDoc(docRef, {
      key: sanitizedKey,
      data: dataUrlOrBlob,
      mimeType: mimeType || 'image/jpeg',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `media_items/${key}`);
  }
};

export const getMediaItem = async (key: string): Promise<string | null> => {
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

  // 1. Try local IndexedDB
  try {
    const idb = await openDB();
    const val = await new Promise<string | null>((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(sanitizedKey);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    });
    if (val) return val;
  } catch {
    // fallback
  }

  // 2. Try localStorage
  const localVal =
    localStorage.getItem(`smokyzone_media_${sanitizedKey}`) ||
    localStorage.getItem(`smokyzone_photo_${sanitizedKey}`);
  if (localVal) return localVal;

  // 3. Fallback to Cloud Firestore
  try {
    const docRef = doc(db, 'media_items', sanitizedKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const cloudVal = data?.data as string;
      if (cloudVal) {
        // Cache locally for fast future reads
        try {
          const idb = await openDB();
          const tx = idb.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(cloudVal, sanitizedKey);
        } catch {
          // ignore cache errors
        }
        try {
          localStorage.setItem(`smokyzone_media_${sanitizedKey}`, cloudVal);
          localStorage.setItem(`smokyzone_photo_${sanitizedKey}`, cloudVal);
        } catch {
          // ignore
        }
        return cloudVal;
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `media_items/${sanitizedKey}`);
  }

  return null;
};

export const removeMediaItem = async (key: string): Promise<void> => {
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const idb = await openDB();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(sanitizedKey);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // fallback
  }
  localStorage.removeItem(`smokyzone_media_${sanitizedKey}`);
  localStorage.removeItem(`smokyzone_photo_${sanitizedKey}`);
  window.dispatchEvent(new CustomEvent('smokyzone_media_change', { detail: { key: sanitizedKey, removed: true } }));
};

// Site Config State: Complete dynamic control over all parts of Smoky Zone
export interface SiteConfig {
  walkinPhoto: string | null;
  playlist: MusicTrack[];
  videoClips: VideoClipItem[];
  projects: PortfolioProject[];
  unfilteredThoughts: UnfilteredThought[];
  labels: {
    heroTitle: string;
    heroSubtitle: string;
    celebrityBadge: string;
    celebrityQuote: string;
    walkinTagline: string;
    whatsappPhone: string;
    contactEmail: string;
    aboutBio: string;
    tiktokUrl: string;
    youtubeUrl: string;
    instagramUrl: string;
    xTwitterUrl: string;
  };
  projectPhotos: Record<string, string>;
  brandPhotos: Record<string, string>;
  updatedAt?: string;
}

const CONFIG_STORAGE_KEY = 'smokyzone_site_config_v1';

export const getDefaultConfig = (): SiteConfig => {
  return {
    walkinPhoto: null,
    playlist: CELEBRITY_PLAYLIST,
    videoClips: VIDEO_PREVIEW_CLIPS,
    projects: PORTFOLIO_PROJECTS,
    unfilteredThoughts: UNFILTERED_THOUGHTS,
    labels: {
      heroTitle: 'ONE MIND. DIFFERENT WORLDS. ONE AUTHENTIC JOURNEY.',
      heroSubtitle: 'Technology Engineering · Raw Cultural Commentary · Real Community Life',
      celebrityBadge: 'Drill Music',
      celebrityQuote: "Real recognizes real. When you come from where I come from, you don't speak to impress; you speak what is real.",
      walkinTagline: 'RAW ENERGY. NO CUTS.',
      whatsappPhone: '+2348144087198',
      contactEmail: 'ifeanyinuels32@gmail.com',
      aboutBio: SMORK_BIO.aboutStory.join('\n\n'),
      tiktokUrl: 'https://tiktok.com/@Smorkfrmdaeast',
      youtubeUrl: 'https://youtube.com/@Smorkfrmdaeast',
      instagramUrl: 'https://instagram.com/Smork_frmdaeast',
      xTwitterUrl: 'https://x.com/Smorkfrmdaeast',
    },
    projectPhotos: {},
    brandPhotos: {},
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
      projects: parsed.projects?.length ? parsed.projects : PORTFOLIO_PROJECTS,
      unfilteredThoughts: parsed.unfilteredThoughts?.length ? parsed.unfilteredThoughts : UNFILTERED_THOUGHTS,
      labels: {
        ...getDefaultConfig().labels,
        ...(parsed.labels || {}),
      },
      projectPhotos: parsed.projectPhotos || {},
      brandPhotos: parsed.brandPhotos || {},
    };
  } catch {
    return getDefaultConfig();
  }
};

export const saveStoredConfig = (config: SiteConfig): void => {
  const configWithTimestamp = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save locally for instant reaction
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configWithTimestamp));
    window.dispatchEvent(new CustomEvent('smokyzone_config_change', { detail: configWithTimestamp }));
  } catch (err) {
    console.warn('Failed to save local config:', err);
  }

  // 2. Sync to Cloud Firestore so all visitors receive it in real-time
  try {
    const docRef = doc(db, 'site_content', 'global_v1');
    setDoc(docRef, configWithTimestamp).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, 'site_content/global_v1');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'site_content/global_v1');
  }
};

export const resetStoredConfig = (): void => {
  const defaultConf = getDefaultConfig();
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('smokyzone_config_change', { detail: defaultConf }));
  } catch (err) {
    console.warn('Failed to reset config:', err);
  }
  try {
    const docRef = doc(db, 'site_content', 'global_v1');
    setDoc(docRef, defaultConf).catch(() => {});
  } catch {
    // ignore
  }
};

// Initialize Cloud Firestore Sync Listeners (Config & Media)
let syncInitialized = false;
export const initCloudSync = (): (() => void) => {
  if (syncInitialized || typeof window === 'undefined') {
    return () => {};
  }
  syncInitialized = true;

  try {
    // 1. Listen to global configuration document changes
    const docRef = doc(db, 'site_content', 'global_v1');
    const unsubConfig = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const cloudConfig = snapshot.data() as Partial<SiteConfig>;
          const localConfig = getStoredConfig();

          if (cloudConfig) {
            const merged: SiteConfig = {
              ...getDefaultConfig(),
              ...cloudConfig,
              playlist: cloudConfig.playlist?.length ? cloudConfig.playlist : localConfig.playlist,
              videoClips: cloudConfig.videoClips?.length ? cloudConfig.videoClips : localConfig.videoClips,
              projects: cloudConfig.projects?.length ? cloudConfig.projects : localConfig.projects,
              unfilteredThoughts: cloudConfig.unfilteredThoughts?.length
                ? cloudConfig.unfilteredThoughts
                : localConfig.unfilteredThoughts,
              labels: {
                ...getDefaultConfig().labels,
                ...(cloudConfig.labels || {}),
              },
              projectPhotos: {
                ...localConfig.projectPhotos,
                ...(cloudConfig.projectPhotos || {}),
              },
              brandPhotos: {
                ...localConfig.brandPhotos,
                ...(cloudConfig.brandPhotos || {}),
              },
            };

            // Mirror brand photos to localStorage for instant ImageSlot access
            if (merged.brandPhotos) {
              Object.entries(merged.brandPhotos).forEach(([k, v]) => {
                try {
                  localStorage.setItem(`smokyzone_photo_${k}`, v);
                  localStorage.setItem(`smokyzone_media_${k}`, v);
                } catch {
                  // ignore
                }
              });
            }

            try {
              localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(merged));
            } catch {
              // quota safe
            }
            window.dispatchEvent(new CustomEvent('smokyzone_config_change', { detail: merged }));
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'site_content/global_v1');
      }
    );

    // 2. Listen to real-time media changes (photos, videos, MP3s)
    const mediaColRef = collection(db, 'media_items');
    const unsubMedia = onSnapshot(
      mediaColRef,
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added' || change.type === 'modified') {
            const docData = change.doc.data();
            const key = docData.key || change.doc.id;
            const dataUrl = docData.data;
            if (key && dataUrl) {
              try {
                const idb = await openDB();
                const tx = idb.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(dataUrl, key);
              } catch {
                // ignore
              }
              try {
                localStorage.setItem(`smokyzone_media_${key}`, dataUrl);
                localStorage.setItem(`smokyzone_photo_${key}`, dataUrl);
              } catch {
                // ignore
              }
              window.dispatchEvent(
                new CustomEvent('smokyzone_media_change', { detail: { key, data: dataUrl } })
              );
            }
          } else if (change.type === 'removed') {
            const key = change.doc.id;
            try {
              const idb = await openDB();
              const tx = idb.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).delete(key);
            } catch {
              // ignore
            }
            localStorage.removeItem(`smokyzone_media_${key}`);
            localStorage.removeItem(`smokyzone_photo_${key}`);
            window.dispatchEvent(
              new CustomEvent('smokyzone_media_change', { detail: { key, removed: true } })
            );
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'media_items');
      }
    );

    return () => {
      unsubConfig();
      unsubMedia();
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'site_content/global_v1');
    return () => {};
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
    window.dispatchEvent(new CustomEvent('smokyzone_auth_change', { detail: { authenticated: true } }));
    return true;
  }
  return false;
};

export const adminSignOut = (): void => {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('smokyzone_auth_change', { detail: { authenticated: false } }));
};

// Export and Import Site Config JSON
export const exportSiteConfigJSON = (): string => {
  const config = getStoredConfig();
  return JSON.stringify(config, null, 2);
};

export const importSiteConfigJSON = (jsonStr: string): boolean => {
  try {
    const parsed = JSON.parse(jsonStr);
    saveStoredConfig(parsed);
    return true;
  } catch (e) {
    console.error('Invalid config JSON:', e);
    return false;
  }
};
