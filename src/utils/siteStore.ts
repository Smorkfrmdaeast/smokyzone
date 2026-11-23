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
import { db, auth, storage, firebaseConfig } from '../firebase';
import { signOut } from 'firebase/auth';
import { arrayUnion, doc, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, onSnapshot, collection, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';

const DB_NAME = 'smokyzone_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_store';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: getUserPrimaryEmail(auth.currentUser),
      emailVerified: isFirebaseUserEmailVerified(auth.currentUser),
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

let firestoreOfflineUntil = 0;
let firestoreOfflineWarned = false;

function isFirestoreOfflineError(error: unknown): boolean {
  const code = ((error as { code?: string })?.code || '').toLowerCase();
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    code === 'unavailable' ||
    msg.includes('the client is offline') ||
    msg.includes('failed to get document because the client is offline')
  );
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
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

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
export type IntegrityStatus = 'idle' | 'verifying' | 'verified' | 'failed';

export interface MediaIntegrityResult {
  valid: boolean;
  mediaType: 'image' | 'audio' | 'video' | 'unknown';
  error?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface CloudSyncState {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  activeItem?: string | null;
  error?: string | null;
  latencyMs?: number;
  targetDb: string;
  targetBucket?: string;
  integrityStatus?: IntegrityStatus;
  verifiedCount?: number;
  storageStatus?: 'idle' | 'uploading' | 'ready' | 'error';
  firebaseAuthVerified?: boolean;
  firebaseAuthEmail?: string | null;
}

export const FIRESTORE_DATABASE_ID =
  firebaseConfig.firestoreDatabaseId || 'ai-studio-smokyzone-d5b406ce-4d73-4af4-b06f-7fc6e2d05b4a';
export const FIREBASE_STORAGE_BUCKET =
  firebaseConfig.storageBucket || 'solid-rush-vn2tx.firebasestorage.app';
const SYNC_STATE_STORAGE_KEY = 'smokyzone_firestore_last_sync_v1';

export const formatMediaLabel = (key: string): string => {
  if (key === 'hero_portrait') return 'Hero Authentic Portrait';
  if (key === 'celebrity_bandana_photo') return 'Celebrity Bandana Photo';
  if (key === 'unfiltered_portrait') return 'Raw Unfiltered Portrait';
  if (key === 'tech_setup') return 'Tech Workstation Photo';
  if (key === 'walkin_custom_media') return 'Walk-In Showcase Visual';
  if (key === 'walkin_photo') return 'Walk-In Photo';
  if (key.startsWith('video_clip_audio_')) return `Cultural Audio (${key.replace('video_clip_audio_', '')})`;
  if (key.startsWith('video_clip_thumb_')) return `Video Cover (${key.replace('video_clip_thumb_', '')})`;
  if (key.startsWith('video_clip_')) return `Cultural Video Loop (${key.replace('video_clip_', '')})`;
  if (key.startsWith('audio_track_')) return `Official Track Audio (${key.replace('audio_track_', '')})`;
  if (key.startsWith('project_photo_')) return `Project Screenshot (${key.replace('project_photo_', '')})`;
  return key;
};

// -------------------------------------------------------------
// Stage 1: Robust Background Media Metadata Integrity Verification
// -------------------------------------------------------------

/**
 * Verify image decodability, non-zero natural dimensions, and header integrity
 */
export const verifyImageIntegrity = (
  src: string,
  timeoutMs = 8000
): Promise<{ valid: boolean; width?: number; height?: number; error?: string }> => {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string' || src.trim() === '') {
      resolve({ valid: false, error: 'Empty image source' });
      return;
    }

    if (typeof Image === 'undefined') {
      resolve({ valid: true });
      return;
    }

    const img = new Image();
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        img.src = '';
        resolve({ valid: false, error: 'Image verification timed out' });
      }
    }, timeoutMs);

    const finish = (valid: boolean, width?: number, height?: number, err?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(valid ? { valid: true, width, height } : { valid: false, error: err || 'Image decode failure' });
    };

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (width > 0 && height > 0) {
        if ('decode' in img && typeof img.decode === 'function') {
          img
            .decode()
            .then(() => finish(true, width, height))
            .catch((e) => finish(false, undefined, undefined, `Decode error: ${e?.message || e}`));
        } else {
          finish(true, width, height);
        }
      } else {
        finish(false, undefined, undefined, 'Natural dimensions are zero');
      }
    };

    img.onerror = () => {
      finish(false, undefined, undefined, 'Image element triggered error event');
    };

    try {
      img.src = src;
    } catch (e) {
      finish(false, undefined, undefined, e instanceof Error ? e.message : 'Invalid image URI');
    }
  });
};

/**
 * Verify audio stream duration, valid header, and non-NaN metadata
 */
export const verifyAudioIntegrity = (
  src: string,
  timeoutMs = 10000
): Promise<{ valid: boolean; duration?: number; error?: string }> => {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string' || src.trim() === '') {
      resolve({ valid: false, error: 'Empty audio source' });
      return;
    }

    if (typeof Audio === 'undefined') {
      resolve({ valid: true });
      return;
    }

    const audio = new Audio();
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          audio.src = '';
          audio.load();
        } catch {
          // ignore
        }
        resolve({ valid: false, error: 'Audio metadata verification timed out' });
      }
    }, timeoutMs);

    const finish = (valid: boolean, duration?: number, err?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        audio.src = '';
        audio.load();
      } catch {
        // ignore
      }
      resolve(valid ? { valid: true, duration } : { valid: false, error: err || 'Audio metadata invalid' });
    };

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      if (!isNaN(dur) && isFinite(dur) && dur > 0) {
        finish(true, dur);
      } else {
        finish(false, undefined, `Invalid audio duration: ${dur}`);
      }
    };

    audio.onerror = () => {
      const mediaErr = audio.error;
      const msg = mediaErr
        ? `Code ${mediaErr.code}: ${mediaErr.message || 'Media playback error'}`
        : 'Audio stream failed to load';
      finish(false, undefined, msg);
    };

    try {
      audio.preload = 'metadata';
      audio.src = src;
    } catch (e) {
      finish(false, undefined, e instanceof Error ? e.message : 'Invalid audio source');
    }
  });
};

/**
 * Verify video stream duration, dimensions, and metadata
 */
export const verifyVideoIntegrity = (
  src: string,
  timeoutMs = 10000
): Promise<{ valid: boolean; duration?: number; width?: number; height?: number; error?: string }> => {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string' || src.trim() === '') {
      resolve({ valid: false, error: 'Empty video source' });
      return;
    }

    if (typeof document === 'undefined') {
      resolve({ valid: true });
      return;
    }

    const video = document.createElement('video');
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          video.src = '';
          video.load();
        } catch {
          // ignore
        }
        resolve({ valid: false, error: 'Video metadata verification timed out' });
      }
    }, timeoutMs);

    const finish = (valid: boolean, width?: number, height?: number, duration?: number, err?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        video.src = '';
        video.load();
      } catch {
        // ignore
      }
      resolve(
        valid
          ? { valid: true, width, height, duration }
          : { valid: false, error: err || 'Video metadata invalid' }
      );
    };

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const dur = video.duration;
      if (width > 0 && height > 0) {
        finish(true, width, height, dur);
      } else {
        finish(false, undefined, undefined, undefined, `Video dimensions zero: ${width}x${height}`);
      }
    };

    video.onerror = () => {
      finish(false, undefined, undefined, undefined, 'Video failed to load');
    };

    try {
      video.preload = 'metadata';
      video.muted = true;
      video.src = src;
    } catch (e) {
      finish(false, undefined, undefined, undefined, e instanceof Error ? e.message : 'Invalid video source');
    }
  });
};

/**
 * Master payload integrity router
 */
export const verifyMediaPayload = async (
  key: string,
  dataUrlOrSrc: string,
  mimeType?: string
): Promise<MediaIntegrityResult> => {
  const isAudio =
    mimeType?.startsWith('audio/') ||
    dataUrlOrSrc.startsWith('data:audio') ||
    key.startsWith('audio_track_') ||
    key.includes('track_') ||
    key.startsWith('video_clip_audio_') ||
    dataUrlOrSrc.endsWith('.mp3') ||
    dataUrlOrSrc.endsWith('.wav') ||
    dataUrlOrSrc.endsWith('.m4a');

  const isVideo =
    mimeType?.startsWith('video/') ||
    dataUrlOrSrc.startsWith('data:video') ||
    (key.startsWith('video_clip_') &&
      !key.startsWith('video_clip_audio_') &&
      !key.startsWith('video_clip_thumb_')) ||
    dataUrlOrSrc.endsWith('.mp4') ||
    dataUrlOrSrc.endsWith('.webm');

  if (isAudio) {
    const res = await verifyAudioIntegrity(dataUrlOrSrc);
    return {
      valid: res.valid,
      mediaType: 'audio',
      duration: res.duration,
      error: res.error,
    };
  }

  if (isVideo) {
    const res = await verifyVideoIntegrity(dataUrlOrSrc);
    return {
      valid: res.valid,
      mediaType: 'video',
      duration: res.duration,
      width: res.width,
      height: res.height,
      error: res.error,
    };
  }

  // Otherwise assume image
  const res = await verifyImageIntegrity(dataUrlOrSrc);
  return {
    valid: res.valid,
    mediaType: 'image',
    width: res.width,
    height: res.height,
    error: res.error,
  };
};

let currentSyncState: CloudSyncState = {
  status: 'idle',
  integrityStatus: 'idle',
  storageStatus: 'idle',
  lastSyncedAt: (() => {
    try {
      return localStorage.getItem(SYNC_STATE_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  })(),
  activeItem: null,
  error: null,
  targetDb: FIRESTORE_DATABASE_ID,
  targetBucket: FIREBASE_STORAGE_BUCKET,
  firebaseAuthVerified: false,
  firebaseAuthEmail: null,
};

export const getCloudSyncState = (): CloudSyncState => ({
  ...currentSyncState,
  firebaseAuthVerified: hasFirebaseGoogleOwnerSession(),
  firebaseAuthEmail: getUserPrimaryEmail(auth.currentUser),
});

export const updateCloudSyncState = (update: Partial<CloudSyncState>): CloudSyncState => {
  currentSyncState = {
    ...currentSyncState,
    ...update,
    targetDb: FIRESTORE_DATABASE_ID,
    targetBucket: FIREBASE_STORAGE_BUCKET,
    firebaseAuthVerified: hasFirebaseGoogleOwnerSession(),
    firebaseAuthEmail: getUserPrimaryEmail(auth.currentUser),
  };
  if (update.lastSyncedAt) {
    try {
      localStorage.setItem(SYNC_STATE_STORAGE_KEY, update.lastSyncedAt);
    } catch {
      // ignore
    }
  }
  window.dispatchEvent(
    new CustomEvent('smokyzone_sync_state', { detail: { ...currentSyncState } })
  );
  return { ...currentSyncState };
};

export interface FirestoreConnectionStatus {
  success: boolean;
  databaseId: string;
  latencyMs: number;
  docExists?: boolean;
  errorCode?: string;
  error?: string;
}

export interface StorageConnectionStatus {
  status: 'connected' | 'unauthorized' | 'bucket_not_found' | 'offline' | 'error';
  reachable: boolean;
  bucket: string;
  latencyMs: number;
  code?: string;
  message?: string;
}

export const testFirestoreConnection = async (): Promise<FirestoreConnectionStatus> => {
  const start = performance.now();
  updateCloudSyncState({ status: 'syncing', activeItem: 'Firestore Connection Ping', error: null });
  try {
    const snap = await getDocFromServer(doc(db, 'site_content', 'global_v1'));
    const latency = Math.round(performance.now() - start);
    updateCloudSyncState({
      status: 'synced',
      activeItem: 'Firestore Connection Ping',
      lastSyncedAt: new Date().toISOString(),
      latencyMs: latency,
      error: null,
    });
    return {
      success: true,
      databaseId: FIRESTORE_DATABASE_ID,
      latencyMs: latency,
      docExists: snap.exists(),
    };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const msg = err instanceof Error ? err.message : String(err);
    if (isFirestoreOfflineError(err)) {
      firestoreOfflineUntil = Date.now() + 20_000;
      if (!firestoreOfflineWarned) {
        firestoreOfflineWarned = true;
        console.warn('[SmokyZone Cloud] Firestore currently offline or unreachable; using local/bundled assets.');
      }
    } else {
      handleFirestoreError(err, OperationType.GET, 'site_content/global_v1');
    }
    updateCloudSyncState({
      status: 'error',
      activeItem: 'Firestore Connection Ping',
      error: msg,
    });
    return {
      success: false,
      databaseId: FIRESTORE_DATABASE_ID,
      latencyMs: Math.round(performance.now() - start),
      errorCode: code,
      error: msg,
    };
  }
};

export const testStorageConnection = async (): Promise<StorageConnectionStatus> => {
  const start = performance.now();
  try {
    const probeRef = ref(storage, 'audio/_diagnostic_ping');
    await getMetadata(probeRef);
    const latency = Math.round(performance.now() - start);
    updateCloudSyncState({ storageStatus: 'ready' });
    return {
      status: 'connected',
      reachable: true,
      bucket: FIREBASE_STORAGE_BUCKET,
      latencyMs: latency,
      message: 'Storage bucket reachable and probe object metadata read succeeded.',
    };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    const code = (err as { code?: string })?.code || '';
    const msg = err instanceof Error ? err.message : String(err);

    if (code === 'storage/object-not-found' || msg.includes('storage/object-not-found')) {
      updateCloudSyncState({ storageStatus: 'ready' });
      return {
        status: 'connected',
        reachable: true,
        bucket: FIREBASE_STORAGE_BUCKET,
        latencyMs: latency,
        code,
        message: 'Bucket reachable and public read rule allowed (probe object does not exist, which is expected).',
      };
    }

    if (code === 'storage/unauthorized' || code === 'storage/unauthenticated' || msg.includes('storage/unauthorized')) {
      updateCloudSyncState({ storageStatus: 'error' });
      return {
        status: 'unauthorized',
        reachable: true,
        bucket: FIREBASE_STORAGE_BUCKET,
        latencyMs: latency,
        code,
        message: 'Bucket responded, but Storage Security Rules denied access (deploy storage.rules and verify Google owner auth).',
      };
    }

    if (code === 'storage/bucket-not-found' || msg.includes('storage/bucket-not-found')) {
      updateCloudSyncState({ storageStatus: 'error' });
      return {
        status: 'bucket_not_found',
        reachable: false,
        bucket: FIREBASE_STORAGE_BUCKET,
        latencyMs: latency,
        code,
        message: `Bucket ${FIREBASE_STORAGE_BUCKET} was not found. Enable Firebase Storage in Firebase Console for solid-rush-vn2tx.`,
      };
    }

    const isOffline =
      (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      msg.toLowerCase().includes('network') ||
      msg.toLowerCase().includes('offline');

    updateCloudSyncState({ storageStatus: 'error' });
    return {
      status: isOffline ? 'offline' : 'error',
      reachable: false,
      bucket: FIREBASE_STORAGE_BUCKET,
      latencyMs: latency,
      code: code || undefined,
      message: msg,
    };
  }
};

export interface MediaUploadResult {
  cloudSynced: boolean;
  localUrl: string;
  downloadUrl?: string;
  storagePath?: string;
  warning?: string;
}

function inferExtensionFromMimeOrName(mimeType?: string, filename?: string): string {
  if (filename) {
    const ext = filename.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (ext) return ext[1].toLowerCase();
  }
  const m = (mimeType || '').toLowerCase();
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mp4')) return m.startsWith('audio/') ? 'm4a' : 'mp4';
  if (m.includes('aac')) return 'aac';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('flac')) return 'flac';
  if (m.includes('webm')) return 'webm';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return 'bin';
}

function inferMediaCategory(key: string, mimeType?: string): 'audio' | 'videos' | 'images' {
  const m = (mimeType || '').toLowerCase();
  if (m.startsWith('audio/') || key.startsWith('audio_track_') || key.startsWith('video_clip_audio_')) {
    return 'audio';
  }
  if (
    m.startsWith('video/') ||
    (key.startsWith('video_clip_') && !key.startsWith('video_clip_thumb_') && !key.startsWith('video_clip_audio_'))
  ) {
    return 'videos';
  }
  return 'images';
}

function dataUrlToBlob(dataUrl: string, fallbackMime?: string): Blob {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return new Blob([dataUrl], { type: fallbackMime || 'application/octet-stream' });
  }
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime || 'application/octet-stream';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function mapFirebaseStorageError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);
  if (code === 'storage/unauthorized' || msg.includes('storage/unauthorized')) {
    return `Firebase Storage denied upload (storage/unauthorized). Verify Google Sign-In (${OWNER_EMAIL_DISPLAY}), ensure system/admin_status exists in Firestore, and verify storage.rules are deployed on ${FIREBASE_STORAGE_BUCKET}.`;
  }
  if (code === 'storage/unauthenticated' || msg.includes('storage/unauthenticated')) {
    return `Firebase Google Sign-In (${OWNER_EMAIL_DISPLAY}) is required to upload to Firebase Storage.`;
  }
  if (code === 'storage/bucket-not-found' || msg.includes('storage/bucket-not-found')) {
    return `Firebase Storage bucket (${FIREBASE_STORAGE_BUCKET}) is not provisioned yet in Firebase Console for solid-rush-vn2tx.`;
  }
  return msg;
}

export interface StorageUploadResult {
  downloadUrl: string;
  storagePath: string;
  bytes: number;
  contentType: string;
}

function inferUploadContentType(
  storagePath: string,
  mimeType?: string,
  blobType?: string,
  filename?: string
): string {
  const candidates = [mimeType, blobType].map((v) => (v || '').trim().toLowerCase());
  const validDirect = candidates.find(
    (v) => v && v !== 'application/octet-stream' && (v.startsWith('audio/') || v.startsWith('video/') || v.startsWith('image/'))
  );
  if (validDirect) return validDirect;

  const target = (filename || storagePath || '').toLowerCase();
  if (target.endsWith('.mp3')) return 'audio/mpeg';
  if (target.endsWith('.wav')) return 'audio/wav';
  if (target.endsWith('.m4a') || target.endsWith('.mp4a')) return 'audio/mp4';
  if (target.endsWith('.aac')) return 'audio/aac';
  if (target.endsWith('.ogg') || target.endsWith('.oga')) return 'audio/ogg';
  if (target.endsWith('.flac')) return 'audio/flac';
  if (target.endsWith('.webm')) return storagePath.startsWith('audio/') || storagePath.includes('/audio/') ? 'audio/webm' : 'video/webm';
  if (target.endsWith('.mp4') || target.endsWith('.mov')) return 'video/mp4';
  if (target.endsWith('.png')) return 'image/png';
  if (target.endsWith('.webp')) return 'image/webp';
  if (target.endsWith('.gif')) return 'image/gif';
  if (target.endsWith('.jpg') || target.endsWith('.jpeg')) return 'image/jpeg';

  if (storagePath.startsWith('audio/') || storagePath.includes('/audio/')) return 'audio/mpeg';
  if (storagePath.includes('/videos/')) return 'video/mp4';
  if (storagePath.includes('/images/')) return 'image/jpeg';
  return 'application/octet-stream';
}

export const uploadFileToFirebaseStorage = async (
  storagePath: string,
  fileOrBlobOrDataUrl: File | Blob | string,
  mimeType?: string,
  onProgress?: (pct: number) => void
): Promise<StorageUploadResult> => {
  if (!hasFirebaseGoogleOwnerSession()) {
    throw new Error(
      `Google Sign-In (${OWNER_EMAIL_DISPLAY}) is required before uploading to Firebase Storage.`
    );
  }

  // Ensure cross-service owner doc in Firestore exists before hitting Storage rules
  await ensureOwnerAdminStatusDoc().catch((err) => {
    console.warn('[SmokyZone Storage] Could not pre-sync system/admin_status doc:', err);
  });

  const blob =
    typeof fileOrBlobOrDataUrl === 'string'
      ? dataUrlToBlob(fileOrBlobOrDataUrl, mimeType)
      : fileOrBlobOrDataUrl;

  const fileName = fileOrBlobOrDataUrl instanceof File ? fileOrBlobOrDataUrl.name : undefined;
  const contentType = inferUploadContentType(storagePath, mimeType, blob.type, fileName);
  const storageRef = ref(storage, storagePath);

  updateCloudSyncState({
    status: 'syncing',
    storageStatus: 'uploading',
    activeItem: `Uploading to Storage (${storagePath.split('/').pop()})`,
    error: null,
  });

  try {
    const result = await new Promise<StorageUploadResult>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob, {
        contentType,
        cacheControl: 'public, max-age=31536000',
      });

      task.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (error) => reject(error),
        async () => {
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            resolve({
              downloadUrl,
              storagePath,
              bytes: task.snapshot.totalBytes || blob.size,
              contentType,
            });
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });

    updateCloudSyncState({
      storageStatus: 'ready',
      error: null,
    });
    return result;
  } catch (err) {
    const mapped = mapFirebaseStorageError(err);
    updateCloudSyncState({
      status: 'error',
      storageStatus: 'error',
      activeItem: `Storage Upload (${storagePath.split('/').pop()})`,
      error: mapped,
    });
    throw new Error(mapped);
  }
};

export const uploadAudioTrackToStorage = async (
  trackId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<MediaUploadResult> => {
  const sanitizedKey = `audio_track_${trackId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || `${trackId}.mp3`;
  const storagePath = `audio/${trackId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${cleanName}`;
  return setMediaItem(sanitizedKey, file, file.type || 'audio/mpeg', onProgress, storagePath);
};

export const setMediaItem = async (
  key: string,
  dataUrlOrFileOrBlob: string | File | Blob,
  mimeType?: string,
  onProgress?: (pct: number) => void,
  explicitStoragePath?: string
): Promise<MediaUploadResult> => {
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const startTime = performance.now();
  const label = formatMediaLabel(sanitizedKey);
  const resolvedMime =
    mimeType ||
    (typeof dataUrlOrFileOrBlob !== 'string' ? dataUrlOrFileOrBlob.type : undefined) ||
    'application/octet-stream';

  // 1. Stage in background and verify metadata integrity first
  updateCloudSyncState({
    status: 'syncing',
    activeItem: `Verifying ${label}`,
    integrityStatus: 'verifying',
    error: null,
  });

  let verifyTarget: string;
  let objectUrlToRevoke: string | null = null;
  if (typeof dataUrlOrFileOrBlob === 'string') {
    verifyTarget = dataUrlOrFileOrBlob;
  } else {
    objectUrlToRevoke = URL.createObjectURL(dataUrlOrFileOrBlob);
    verifyTarget = objectUrlToRevoke;
  }

  let integrity: MediaIntegrityResult;
  try {
    integrity = await verifyMediaPayload(sanitizedKey, verifyTarget, resolvedMime);
  } finally {
    if (objectUrlToRevoke) {
      try {
        URL.revokeObjectURL(objectUrlToRevoke);
      } catch {
        // ignore
      }
    }
  }

  if (!integrity.valid) {
    console.warn(`[setMediaItem] Rejected corrupted media for ${sanitizedKey}:`, integrity.error);
    updateCloudSyncState({
      status: 'error',
      activeItem: label,
      integrityStatus: 'failed',
      error: `Media integrity rejected: ${integrity.error}`,
    });
    throw new Error(`Media integrity check failed: ${integrity.error}`);
  }

  // Convert File/Blob to DataURL once for local IndexedDB playback when offline or passcode-only
  const localCacheValue =
    typeof dataUrlOrFileOrBlob === 'string'
      ? dataUrlOrFileOrBlob
      : await blobToDataUrl(dataUrlOrFileOrBlob);

  // 2. Save to local IndexedDB for immediate zero-latency local playback
  try {
    const idb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(localCacheValue, sanitizedKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // fallback
  }

  // 3. LocalStorage cache for small assets
  if (localCacheValue.length < 500 * 1024) {
    try {
      localStorage.setItem(`smokyzone_media_${sanitizedKey}`, localCacheValue);
      localStorage.setItem(`smokyzone_photo_${sanitizedKey}`, localCacheValue);
    } catch {
      // Local quota safety
    }
  }

  window.dispatchEvent(
    new CustomEvent('smokyzone_media_change', {
      detail: { key: sanitizedKey, data: localCacheValue, verified: true },
    })
  );

  // 4. Gate Cloud Storage + Firestore writes strictly on verified Firebase Google Auth
  if (!hasFirebaseGoogleOwnerSession()) {
    const warning = `Saved locally only. Sign in with Google (${OWNER_EMAIL_DISPLAY}) in Passcode & Cloud to upload to Firebase Storage & Firestore.`;
    updateCloudSyncState({
      status: 'error',
      storageStatus: 'error',
      activeItem: label,
      integrityStatus: 'verified',
      error: warning,
    });
    return { cloudSynced: false, localUrl: localCacheValue, warning };
  }

  // 5. Upload binary payload to Firebase Storage and write compact pointer doc to Firestore
  const isRemoteHttp =
    typeof dataUrlOrFileOrBlob === 'string' &&
    (dataUrlOrFileOrBlob.startsWith('http://') || dataUrlOrFileOrBlob.startsWith('https://'));

  try {
    let downloadUrl = isRemoteHttp ? (dataUrlOrFileOrBlob as string) : '';
    let storagePath = '';
    let bytes = typeof dataUrlOrFileOrBlob === 'string' ? dataUrlOrFileOrBlob.length : dataUrlOrFileOrBlob.size;

    if (!isRemoteHttp) {
      const category = inferMediaCategory(sanitizedKey, resolvedMime);
      const fileName = dataUrlOrFileOrBlob instanceof File ? dataUrlOrFileOrBlob.name : undefined;
      const ext = inferExtensionFromMimeOrName(resolvedMime, fileName);
      const targetPath =
        explicitStoragePath ||
        (category === 'audio'
          ? `audio/${sanitizedKey}.${ext}`
          : category === 'videos'
          ? `media/videos/${sanitizedKey}.${ext}`
          : `media/images/${sanitizedKey}.${ext}`);

      const uploadRes = await uploadFileToFirebaseStorage(
        targetPath,
        dataUrlOrFileOrBlob,
        resolvedMime,
        onProgress
      );
      downloadUrl = uploadRes.downloadUrl;
      storagePath = uploadRes.storagePath;
      bytes = uploadRes.bytes;
    }

    updateCloudSyncState({
      status: 'syncing',
      activeItem: `Saving ${label} pointer to Firestore`,
      integrityStatus: 'verified',
      error: null,
    });

    const docRef = doc(db, 'media_items', sanitizedKey);
    await setDoc(docRef, {
      key: sanitizedKey,
      data: downloadUrl,
      downloadUrl,
      storagePath,
      mimeType: resolvedMime,
      bytes,
      storageProvider: 'firebase_storage',
      isChunked: false,
      updatedAt: new Date().toISOString(),
    });

    // Update IndexedDB & dispatch live URL event so all devices use the Storage CDN URL
    try {
      const idb = await openDB();
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(downloadUrl, sanitizedKey);
    } catch {
      // ignore
    }

    window.dispatchEvent(
      new CustomEvent('smokyzone_media_change', {
        detail: { key: sanitizedKey, data: downloadUrl, verified: true },
      })
    );

    const latency = Math.round(performance.now() - startTime);
    updateCloudSyncState({
      status: 'synced',
      storageStatus: 'ready',
      activeItem: label,
      integrityStatus: 'verified',
      lastSyncedAt: new Date().toISOString(),
      latencyMs: latency,
      error: null,
    });

    return {
      cloudSynced: true,
      localUrl: downloadUrl,
      downloadUrl,
      storagePath,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    handleFirestoreError(err, OperationType.WRITE, `media_items/${sanitizedKey}`);
    updateCloudSyncState({
      status: 'error',
      storageStatus: 'error',
      activeItem: label,
      error: errMsg,
    });
    return {
      cloudSynced: false,
      localUrl: localCacheValue,
      warning: errMsg,
    };
  }
};

// Authoritative In-Code Media Map: Ensures all uploaded videos, photos, and music
// are 100% synchronized through the code when hosted on Vercel or running offline.
export const CODE_SYNCED_FALLBACKS: Record<string, string> = {
  hero_portrait: '/images/celebrity_smork.jpg',
  celebrity_bandana_photo: '/images/celebrity_smork.jpg',
  unfiltered_portrait: '/images/IMG_20250105_181849.jpg',
  tech_setup: '/images/workspace_flashing.jpg',
  walkin_photo: '/images/smork_walkin.jpg',
  walkin_custom_media: '/images/smork_walkin.jpg',
  video_clip_clip_drill: '/images/drill_culture.jpg',
  video_clip_clip_eastern: '/images/StockCake-Neon Dance Silhouette_1758587304.jpg',
  video_clip_clip_street_party: '/images/street_party.jpg',
  video_clip_clip_studio: '/images/StockCake-Neon Music Studio_1758587212.jpg',
  'audio_track_track-1': '/music/Gunna - on one tonight [Official Visualizer].mp3',
  'audio_track_track-2': '/music/Gunna - on one tonight [Official Visualizer].mp3',
  'audio_track_track-3': '/music/Gunna - on one tonight [Official Visualizer].mp3',
  'audio_track_track-4': '/music/gunna_on_one_tonight.mp3',
  'audio_track_track-5': '/music/gunna_on_one_tonight.mp3',
  'audio_track_track-6': '/music/gunna_on_one_tonight.mp3',
  'audio_track_track-7': '/music/gunna_on_one_tonight.mp3',
  'audio_track_track-8': '/music/gunna_on_one_tonight.mp3',
  'audio_track_track-9': '/music/gunna_on_one_tonight.mp3',
  'audio_track_track-10': '/music/gunna_on_one_tonight.mp3',
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
  try {
    const localVal =
      localStorage.getItem(`smokyzone_media_${sanitizedKey}`) ||
      localStorage.getItem(`smokyzone_photo_${sanitizedKey}`);
    if (localVal) return localVal;
  } catch {
    // ignore
  }

  // 3. Fallback to Cloud Firestore (supports single docs and chunked multi-part media)
  const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!isBrowserOffline && Date.now() >= firestoreOfflineUntil) {
    try {
      const docRef = doc(db, 'media_items', sanitizedKey);
      const snap = await getDoc(docRef);
      firestoreOfflineUntil = 0;
      firestoreOfflineWarned = false;
      if (snap.exists()) {
        const data = snap.data();
        if (data.isChunked && typeof data.chunkCount === 'number') {
          const chunkPromises: Promise<string>[] = [];
          for (let i = 0; i < data.chunkCount; i++) {
            const chunkRef = doc(db, 'media_items', `${sanitizedKey}_chunk_${i}`);
            chunkPromises.push(
              getDoc(chunkRef).then((chunkSnap) => {
                if (chunkSnap.exists()) {
                  return (chunkSnap.data()?.data as string) || '';
                }
                return '';
              })
            );
          }
          const chunks = await Promise.all(chunkPromises);
          const assembled = chunks.join('');
          if (assembled) {
            // Cache in IndexedDB for fast subsequent loads
            try {
              const idb = await openDB();
              const tx = idb.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).put(assembled, sanitizedKey);
            } catch {
              // ignore
            }
            return assembled;
          }
        } else if (data.downloadUrl || data.data) {
          const cloudVal = (data.downloadUrl || data.data) as string;
          try {
            const idb = await openDB();
            const tx = idb.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(cloudVal, sanitizedKey);
          } catch {
            // ignore
          }
          return cloudVal;
        }
      }
    } catch (err) {
      if (isFirestoreOfflineError(err)) {
        firestoreOfflineUntil = Date.now() + 20_000;
        if (!firestoreOfflineWarned) {
          firestoreOfflineWarned = true;
          console.warn(
            `[SmokyZone Cloud] Firestore offline while fetching media_items/${sanitizedKey}; serving bundled fallback until reconnected.`
          );
        }
      } else {
        handleFirestoreError(err, OperationType.GET, `media_items/${sanitizedKey}`);
      }
    }
  }

  // 4. In-code static fallback for seamless Vercel hosting
  return CODE_SYNCED_FALLBACKS[sanitizedKey] || CODE_SYNCED_FALLBACKS[key] || null;
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
  try {
    localStorage.removeItem(`smokyzone_media_${sanitizedKey}`);
    localStorage.removeItem(`smokyzone_photo_${sanitizedKey}`);
  } catch {
    // ignore
  }
  if (hasFirebaseGoogleOwnerSession()) {
    try {
      const docRef = doc(db, 'media_items', sanitizedKey);
      const existingSnap = await getDoc(docRef);
      const storagePath = existingSnap.exists() ? (existingSnap.data()?.storagePath as string | undefined) : undefined;
      if (storagePath) {
        await deleteObject(ref(storage, storagePath)).catch(() => {});
      }
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `media_items/${sanitizedKey}`);
    }
  }
  window.dispatchEvent(new CustomEvent('smokyzone_media_change', { detail: { key: sanitizedKey, removed: true } }));
};

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  title: string;
  details: string;
  type: 'music' | 'media' | 'system' | 'security';
}

// Site Config State: Complete dynamic control over all parts of Smoky Zone
export interface SiteConfig {
  walkinPhoto: string | null;
  playlist: MusicTrack[];
  videoClips: VideoClipItem[];
  projects: PortfolioProject[];
  unfilteredThoughts: UnfilteredThought[];
  activityLogs: ActivityLogItem[];
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
    facebookUrl: string;
    xTwitterUrl: string;
  };
  projectPhotos: Record<string, string>;
  brandPhotos: Record<string, string>;
  updatedAt?: string;
}

const CONFIG_STORAGE_KEY = 'smokyzone_site_config_v1';

export const getDefaultConfig = (): SiteConfig => {
  return {
    walkinPhoto: '/images/smork_walkin.jpg',
    playlist: CELEBRITY_PLAYLIST,
    videoClips: VIDEO_PREVIEW_CLIPS,
    projects: PORTFOLIO_PROJECTS,
    unfilteredThoughts: UNFILTERED_THOUGHTS,
    activityLogs: [
      {
        id: 'log-catalog-import-1',
        timestamp: new Date().toISOString(),
        title: 'Smoky Zone Music Catalog Finalized',
        details:
          'Imported and verified 10-track Official Selection leading with Gunna "endless" with verified durations, genres, and Cloud Firestore real-time synchronization.',
        type: 'music',
      },
    ],
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
      instagramUrl: 'https://instagram.com/Smorkfrmdaeast1',
      facebookUrl: 'https://facebook.com/Smorkfrmdaeast1',
      xTwitterUrl: 'https://x.com/Smorkfrmdaeast',
    },
    projectPhotos: {},
    brandPhotos: {
      hero_portrait: '/images/celebrity_smork.jpg',
      celebrity_bandana_photo: '/images/celebrity_smork.jpg',
      unfiltered_portrait: '/images/IMG_20250105_181849.jpg',
      tech_setup: '/images/workspace_flashing.jpg',
      walkin_photo: '/images/smork_walkin.jpg',
      walkin_custom_media: '/images/smork_walkin.jpg',
    },
  };
};

export const getStoredConfig = (): SiteConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return getDefaultConfig();
    const parsed = JSON.parse(raw);
    const hasOldPlaceholder =
      (parsed.playlist?.length || 0) <= 5 &&
      parsed.playlist?.some(
        (t: MusicTrack) =>
          t.title === 'Fukumean' ||
          t.artist === 'Central Cee' ||
          t.title === 'On One Tonight'
      );
    const activePlaylist =
      hasOldPlaceholder || !parsed.playlist || !parsed.playlist.length ? CELEBRITY_PLAYLIST : parsed.playlist;

    const brandPhotos = {
      ...getDefaultConfig().brandPhotos,
      ...(parsed.brandPhotos || {}),
    };
    if (brandPhotos.celebrity_bandana_photo === '/images/bandana_smork.jpg') {
      brandPhotos.celebrity_bandana_photo = '/images/celebrity_smork.jpg';
    }

    return {
      ...getDefaultConfig(),
      ...parsed,
      playlist: activePlaylist,
      videoClips: parsed.videoClips?.length ? parsed.videoClips : VIDEO_PREVIEW_CLIPS,
      projects: parsed.projects?.length ? parsed.projects : PORTFOLIO_PROJECTS,
      unfilteredThoughts: parsed.unfilteredThoughts?.length ? parsed.unfilteredThoughts : UNFILTERED_THOUGHTS,
      activityLogs: parsed.activityLogs?.length ? parsed.activityLogs : getDefaultConfig().activityLogs,
      labels: {
        ...getDefaultConfig().labels,
        ...(parsed.labels || {}),
        instagramUrl:
          parsed.labels?.instagramUrl && !parsed.labels.instagramUrl.includes('Smorkfrmdaeast1')
            ? 'https://instagram.com/Smorkfrmdaeast1'
            : parsed.labels?.instagramUrl || 'https://instagram.com/Smorkfrmdaeast1',
        facebookUrl:
          parsed.labels?.facebookUrl && !parsed.labels.facebookUrl.includes('Smorkfrmdaeast1')
            ? 'https://facebook.com/Smorkfrmdaeast1'
            : parsed.labels?.facebookUrl || 'https://facebook.com/Smorkfrmdaeast1',
      },
      projectPhotos: parsed.projectPhotos || {},
      brandPhotos,
    };
  } catch {
    return getDefaultConfig();
  }
};

export const publishCurrentConfigToCloud = async (configToPublish?: SiteConfig): Promise<boolean> => {
  if (!hasFirebaseGoogleOwnerSession()) {
    return false;
  }

  const targetConfig = configToPublish || getStoredConfig();
  const uploadInlineMedia = async (key: string, value: string | null | undefined, fallbackMime: string): Promise<string | null | undefined> => {
    if (!value || !value.startsWith('data:')) return value;
    const mime = value.match(/^data:([^;,]+)/i)?.[1] || fallbackMime;
    const result = await setMediaItem(key, value, mime);
    if (!result.cloudSynced || !result.downloadUrl) {
      throw new Error(result.warning || `Could not upload ${key} to Firebase Storage.`);
    }
    return result.downloadUrl;
  };

  updateCloudSyncState({
    status: 'syncing',
    activeItem: 'Preparing media & site configuration',
    error: null,
  });

  try {
    // Move legacy inline media to Storage before writing the small Firestore config.
    const [playlist, videoClips, brandPhotoEntries, projectPhotoEntries, projects, walkinPhoto] = await Promise.all([
      Promise.all(targetConfig.playlist.map(async (track) => ({
        ...track,
        audioSrc: await uploadInlineMedia(`audio_track_${track.id}`, track.audioSrc, 'audio/mpeg') as string,
      }))),
      Promise.all(targetConfig.videoClips.map(async (clip) => ({
        ...clip,
        videoSrc: await uploadInlineMedia(`video_clip_${clip.id}`, clip.videoSrc, 'video/mp4') as string,
        audioSrc: await uploadInlineMedia(`video_clip_audio_${clip.id}`, clip.audioSrc, 'audio/mpeg') as string,
        thumbnail: await uploadInlineMedia(`video_clip_thumb_${clip.id}`, clip.thumbnail, 'image/jpeg') as string,
      }))),
      Promise.all(Object.entries(targetConfig.brandPhotos || {}).map(async ([key, value]) => [
        key,
        await uploadInlineMedia(`brand_${key}`, value, 'image/jpeg') as string,
      ] as const)),
      Promise.all(Object.entries(targetConfig.projectPhotos || {}).map(async ([key, value]) => [
        key,
        await uploadInlineMedia(`project_photo_${key}`, value, 'image/jpeg') as string,
      ] as const)),
      Promise.all(targetConfig.projects.map(async (project) => ({
        ...project,
        image: await uploadInlineMedia(`project_photo_${project.id}`, project.image, 'image/jpeg') as string,
      }))),
      uploadInlineMedia('walkin_custom_media', targetConfig.walkinPhoto, 'image/jpeg') as Promise<string | null>,
    ]);

    const payload: SiteConfig = {
      ...targetConfig,
      playlist,
      videoClips,
      projects,
      brandPhotos: Object.fromEntries(brandPhotoEntries),
      projectPhotos: Object.fromEntries(projectPhotoEntries),
      walkinPhoto,
      updatedAt: new Date().toISOString(),
    };

    updateCloudSyncState({
      status: 'syncing',
      activeItem: 'Site Configuration',
      error: null,
    });

    const syncStartTime = performance.now();
    const docRef = doc(db, 'site_content', 'global_v1');
    await setDoc(docRef, payload);
    const latency = Math.round(performance.now() - syncStartTime);
    updateCloudSyncState({
      status: 'synced',
      activeItem: 'Site Configuration',
      lastSyncedAt: new Date().toISOString(),
      latencyMs: latency,
      error: null,
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'site_content/global_v1');
    updateCloudSyncState({
      status: 'error',
      activeItem: 'Site Configuration',
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
};

export const saveStoredConfig = (config: SiteConfig): void => {
  // Sanitize playlist: ensure audioSrc doesn't store raw multi-megabyte base64 blobs inside config doc
  const cleanPlaylist = config.playlist.map((track) => {
    if (track.audioSrc && track.audioSrc.startsWith('data:audio')) {
      const mediaKey = `audio_track_${track.id}`;
      setMediaItem(mediaKey, track.audioSrc, 'audio/mp3').catch(() => {});
      return {
        ...track,
        audioSrc: mediaKey,
      };
    }
    return track;
  });

  // Sanitize video clips: ensure videoSrc and audioSrc don't bloat config doc
  const cleanVideoClips = config.videoClips.map((clip) => {
    let cleanVideo = clip.videoSrc;
    let cleanAudio = clip.audioSrc;
    let cleanThumb = clip.thumbnail;

    if (clip.videoSrc && clip.videoSrc.startsWith('data:video')) {
      const mediaKey = `video_clip_${clip.id}`;
      setMediaItem(mediaKey, clip.videoSrc, 'video/mp4').catch(() => {});
      cleanVideo = mediaKey;
    }
    if (clip.audioSrc && clip.audioSrc.startsWith('data:audio')) {
      const mediaKey = `video_clip_audio_${clip.id}`;
      setMediaItem(mediaKey, clip.audioSrc, 'audio/mp3').catch(() => {});
      cleanAudio = mediaKey;
    }
    if (clip.thumbnail && clip.thumbnail.startsWith('data:image') && clip.thumbnail.length > 500 * 1024) {
      const mediaKey = `video_clip_thumb_${clip.id}`;
      setMediaItem(mediaKey, clip.thumbnail, 'image/jpeg').catch(() => {});
      cleanThumb = mediaKey;
    }
    return {
      ...clip,
      videoSrc: cleanVideo,
      audioSrc: cleanAudio,
      thumbnail: cleanThumb,
    };
  });

  const configWithTimestamp: SiteConfig = {
    ...config,
    playlist: cleanPlaylist,
    videoClips: cleanVideoClips,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save locally for instant reaction
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configWithTimestamp));
    window.dispatchEvent(new CustomEvent('smokyzone_config_change', { detail: configWithTimestamp }));
  } catch (err) {
    console.warn('Failed to save local config:', err);
  }

  // 2. Sync to Cloud Firestore only when Firebase Google Auth is verified as owner
  if (!hasFirebaseGoogleOwnerSession()) {
    updateCloudSyncState({
      status: 'error',
      activeItem: 'Site Configuration',
      error: `Saved locally only. Sign in with Google (${OWNER_EMAIL_DISPLAY}) to publish changes to Cloud Firestore.`,
    });
    return;
  }

  void publishCurrentConfigToCloud(configWithTimestamp);
};

/**
 * Generates clean TypeScript source for CELEBRITY_PLAYLIST in src/data.ts
 */
export const generatePlaylistCodeSnippet = (playlist: MusicTrack[]): string => {
  const formattedTracks = playlist
    .map((track) => {
      const esc = (v?: string) => JSON.stringify(v ?? '');
      return [
        '  {',
        `    id: ${esc(track.id)},`,
        `    title: ${esc(track.title)},`,
        `    artist: ${esc(track.artist)},`,
        `    genre: ${esc(track.genre)},`,
        `    duration: ${esc(track.duration)},`,
        `    audioSrc: ${esc(track.audioSrc || '/music/gunna_on_one_tonight.mp3')},`,
        `    albumArt: ${esc(track.albumArt || '/images/StockCake-Neon Music Studio_1758587212.jpg')},`,
        `    energyVibe: ${esc(track.energyVibe || 'Smoky Zone Official Selection')},`,
        `    tag: ${esc(track.tag || 'Official Selection')},`,
        '  },',
      ].join('\n');
    })
    .join('\n');

  return `export const CELEBRITY_PLAYLIST: MusicTrack[] = [\n${formattedTracks}\n];`;
};

/**
 * Persists the current playlist through the authenticated Firestore site configuration.
 * Audio binaries are uploaded separately to Firebase Storage by uploadAudioTrackToStorage.
 * This intentionally does not attempt to write into the deployed application's source files.
 */
export const syncPlaylistToCloud = async (
  configToSync: SiteConfig
): Promise<{
  syncedToCloud: boolean;
  error?: string;
}> => {
  if (!hasFirebaseGoogleOwnerSession()) {
    return {
      syncedToCloud: false,
      error: `Google Sign-In (${OWNER_EMAIL_DISPLAY}) is required to publish playlist changes.`,
    };
  }

  const syncedToCloud = await publishCurrentConfigToCloud(configToSync);
  return {
    syncedToCloud,
    error: syncedToCloud ? undefined : getCloudSyncState().error || 'Could not save playlist to Firestore.',
  };
};

export const resetStoredConfig = (): void => {
  const defaultConf = getDefaultConfig();
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('smokyzone_config_change', { detail: defaultConf }));
  } catch (err) {
    console.warn('Failed to reset config:', err);
  }
  if (!hasFirebaseGoogleOwnerSession()) {
    updateCloudSyncState({
      status: 'error',
      activeItem: 'Reset Site Config',
      error: `Reset saved locally only. Verify Google Sign-In (${OWNER_EMAIL_DISPLAY}) to reset Cloud Firestore.`,
    });
    return;
  }
  try {
    const docRef = doc(db, 'site_content', 'global_v1');
    setDoc(docRef, defaultConf).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, 'site_content/global_v1');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'site_content/global_v1');
  }
};

// Initialize Cloud Firestore Sync Listeners (Config & Media)
// Uses staged background caching layer with integrity checks before transitioning to live state.
let syncInitialized = false;
export const initCloudSync = (): (() => void) => {
  if (syncInitialized || typeof window === 'undefined') {
    return () => {};
  }
  syncInitialized = true;

  // Startup connection validation against configured named Firestore database
  void testFirestoreConnection();

  try {
    // 1. Listen to global configuration document changes
    const docRef = doc(db, 'site_content', 'global_v1');
    const unsubConfig = onSnapshot(
      docRef,
      async (snapshot) => {
        firestoreOfflineUntil = 0;
        firestoreOfflineWarned = false;
        if (snapshot.exists()) {
          const cloudConfig = snapshot.data() as Partial<SiteConfig>;
          const localConfig = getStoredConfig();

          if (cloudConfig) {
            updateCloudSyncState({
              status: 'syncing',
              activeItem: 'Verifying Config & Media Integrity',
              integrityStatus: 'verifying',
            });

            // Stage brand photos in background verification
            const stagedBrandPhotos: Record<string, string> = { ...localConfig.brandPhotos };
            if (cloudConfig.brandPhotos) {
              for (const [k, v] of Object.entries(cloudConfig.brandPhotos)) {
                if (!v) continue;
                if (v === '/images/bandana_smork.jpg') {
                  stagedBrandPhotos[k] = '/images/celebrity_smork.jpg';
                  continue;
                }
                // If unchanged from existing local verified cache, keep
                if (v === localConfig.brandPhotos?.[k]) {
                  stagedBrandPhotos[k] = v;
                  continue;
                }
                // Run background decodability check
                const check = await verifyImageIntegrity(v);
                if (check.valid) {
                  stagedBrandPhotos[k] = v;
                } else {
                  console.warn(`[initCloudSync] Corrupt brand photo rejected for ${k}:`, check.error);
                }
              }
            }

            // Stage walkinPhoto
            let stagedWalkinPhoto = localConfig.walkinPhoto;
            if (cloudConfig.walkinPhoto && cloudConfig.walkinPhoto !== localConfig.walkinPhoto) {
              const walkinCheck = await verifyImageIntegrity(cloudConfig.walkinPhoto);
              if (walkinCheck.valid) {
                stagedWalkinPhoto = cloudConfig.walkinPhoto;
              }
            }

            const merged: SiteConfig = {
              ...getDefaultConfig(),
              walkinPhoto: stagedWalkinPhoto,
              playlist:
                Array.isArray(cloudConfig.playlist) &&
                cloudConfig.playlist.length > 0 &&
                !(
                  cloudConfig.playlist.length <= 5 &&
                  cloudConfig.playlist.some((t) => t.title === 'On One Tonight' || t.title === 'Fukumean')
                )
                  ? cloudConfig.playlist
                  : localConfig.playlist,
              videoClips: cloudConfig.videoClips?.length ? cloudConfig.videoClips : localConfig.videoClips,
              projects: cloudConfig.projects?.length ? cloudConfig.projects : localConfig.projects,
              unfilteredThoughts: cloudConfig.unfilteredThoughts?.length
                ? cloudConfig.unfilteredThoughts
                : localConfig.unfilteredThoughts,
              activityLogs: cloudConfig.activityLogs?.length
                ? cloudConfig.activityLogs
                : localConfig.activityLogs || getDefaultConfig().activityLogs,
              labels: {
                ...getDefaultConfig().labels,
                ...(cloudConfig.labels || {}),
                instagramUrl:
                  cloudConfig.labels?.instagramUrl && !cloudConfig.labels.instagramUrl.includes('Smorkfrmdaeast1')
                    ? 'https://instagram.com/Smorkfrmdaeast1'
                    : cloudConfig.labels?.instagramUrl || 'https://instagram.com/Smorkfrmdaeast1',
                facebookUrl:
                  cloudConfig.labels?.facebookUrl && !cloudConfig.labels.facebookUrl.includes('Smorkfrmdaeast1')
                    ? 'https://facebook.com/Smorkfrmdaeast1'
                    : cloudConfig.labels?.facebookUrl || 'https://facebook.com/Smorkfrmdaeast1',
              },
              projectPhotos: {
                ...localConfig.projectPhotos,
                ...(cloudConfig.projectPhotos || {}),
              },
              brandPhotos: stagedBrandPhotos,
            };

            if (merged.brandPhotos?.celebrity_bandana_photo === '/images/bandana_smork.jpg') {
              merged.brandPhotos.celebrity_bandana_photo = '/images/celebrity_smork.jpg';
            }

            // Mirror verified brand photos to localStorage for instant ImageSlot access
            if (merged.brandPhotos) {
              Object.entries(merged.brandPhotos).forEach(([k, v]) => {
                if (v && v !== '/images/bandana_smork.jpg') {
                  try {
                    localStorage.setItem(`smokyzone_photo_${k}`, v);
                    localStorage.setItem(`smokyzone_media_${k}`, v);
                  } catch {
                    // ignore
                  }
                }
              });
            }

            // Commit verified state to localStorage
            try {
              localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(merged));
            } catch {
              // quota safe
            }

            // Transition to live state
            window.dispatchEvent(new CustomEvent('smokyzone_config_change', { detail: merged }));
            updateCloudSyncState({
              status: 'synced',
              activeItem: 'Site Configuration',
              integrityStatus: 'verified',
              lastSyncedAt: new Date().toISOString(),
            });
          }
        }
      },
      (error) => {
        if (isFirestoreOfflineError(error)) {
          firestoreOfflineUntil = Date.now() + 20_000;
        } else {
          handleFirestoreError(error, OperationType.GET, 'site_content/global_v1');
        }
      }
    );

    // 2. Listen to real-time media changes (photos, videos, MP3s) with staged integrity verification
    const mediaColRef = collection(db, 'media_items');
    const unsubMedia = onSnapshot(
      mediaColRef,
      async (snapshot) => {
        firestoreOfflineUntil = 0;
        firestoreOfflineWarned = false;
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added' || change.type === 'modified') {
            const docData = change.doc.data();
            const key = docData.key || change.doc.id;

            // Skip individual chunk child docs
            if (change.doc.id.includes('_chunk_')) {
              continue;
            }

            const label = formatMediaLabel(key);

            if (docData.isChunked) {
              // Asynchronously reassemble chunks from Firestore
              getMediaItem(key).then(async (fullData) => {
                if (fullData) {
                  // Stage in background verification before transitioning to live state
                  updateCloudSyncState({
                    status: 'syncing',
                    activeItem: `Verifying ${label}`,
                    integrityStatus: 'verifying',
                  });

                  const verification = await verifyMediaPayload(key, fullData, docData.mimeType);
                  if (verification.valid) {
                    // Cache in IndexedDB
                    try {
                      const idb = await openDB();
                      const tx = idb.transaction(STORE_NAME, 'readwrite');
                      tx.objectStore(STORE_NAME).put(fullData, key);
                    } catch {
                      // ignore
                    }

                    // Transition to live state
                    window.dispatchEvent(
                      new CustomEvent('smokyzone_media_change', {
                        detail: { key, data: fullData, verified: true, integrity: verification },
                      })
                    );

                    updateCloudSyncState({
                      status: 'synced',
                      activeItem: label,
                      integrityStatus: 'verified',
                      lastSyncedAt: new Date().toISOString(),
                    });
                  } else {
                    console.warn(`[initCloudSync] Rejected corrupt chunked media for ${key}:`, verification.error);
                    updateCloudSyncState({
                      status: 'error',
                      activeItem: label,
                      integrityStatus: 'failed',
                      error: `Integrity check failed: ${verification.error}`,
                    });
                  }
                }
              });
            } else if (docData.downloadUrl || docData.data) {
              const dataUrl = (docData.downloadUrl || docData.data) as string;

              // Stage in background verification
              updateCloudSyncState({
                status: 'syncing',
                activeItem: `Verifying ${label}`,
                integrityStatus: 'verifying',
              });

              const verification = await verifyMediaPayload(key, dataUrl, docData.mimeType);
              if (verification.valid) {
                try {
                  const idb = await openDB();
                  const tx = idb.transaction(STORE_NAME, 'readwrite');
                  tx.objectStore(STORE_NAME).put(dataUrl, key);
                } catch {
                  // ignore
                }
                if (dataUrl.length < 500 * 1024) {
                  try {
                    localStorage.setItem(`smokyzone_media_${key}`, dataUrl);
                    localStorage.setItem(`smokyzone_photo_${key}`, dataUrl);
                  } catch {
                    // ignore
                  }
                }

                // Transition to live state
                window.dispatchEvent(
                  new CustomEvent('smokyzone_media_change', {
                    detail: { key, data: dataUrl, verified: true, integrity: verification },
                  })
                );

                updateCloudSyncState({
                  status: 'synced',
                  activeItem: label,
                  integrityStatus: 'verified',
                  lastSyncedAt: new Date().toISOString(),
                });
              } else {
                console.warn(`[initCloudSync] Rejected corrupt media for ${key}:`, verification.error);
                updateCloudSyncState({
                  status: 'error',
                  activeItem: label,
                  integrityStatus: 'failed',
                  error: `Integrity check failed: ${verification.error}`,
                });
              }
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
        if (isFirestoreOfflineError(error)) {
          firestoreOfflineUntil = Date.now() + 20_000;
        } else {
          handleFirestoreError(error, OperationType.GET, 'media_items');
        }
      }
    );

    const handleOnlineRecovery = () => {
      firestoreOfflineUntil = 0;
      firestoreOfflineWarned = false;
    };
    window.addEventListener('online', handleOnlineRecovery);

    return () => {
      unsubConfig();
      unsubMedia();
      window.removeEventListener('online', handleOnlineRecovery);
    };
  } catch (err) {
    if (!isFirestoreOfflineError(err)) {
      handleFirestoreError(err, OperationType.GET, 'site_content/global_v1');
    }
    return () => {};
  }
};

// Only these two verified Google accounts can administer Smoky Zone.
export const OWNER_EMAILS = ['ifeanyinuels32@gmail.com', 'nuelsbussiness@gmail.com'] as const;
export const OWNER_EMAIL_DISPLAY = 'approved Google accounts';
export const OWNER_EMAIL = OWNER_EMAILS[0];
export const ADMIN_SESSION_KEY = 'smokyzone_admin_auth_session';
const VERIFIED_SESSION_CACHE_KEY = 'smokyzone_verified_owner_cache_v1';

let firebaseAuthInitialized = false;

export const markFirebaseAuthInitialized = () => {
  firebaseAuthInitialized = true;
};

export const setVerifiedOwnerSessionCache = (email: string | null, uid?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (email && isVerifiedOwnerEmail(email)) {
      let preservedUid = uid || null;
      if (!preservedUid) {
        const existingRaw = localStorage.getItem(VERIFIED_SESSION_CACHE_KEY);
        if (existingRaw) {
          const existingParsed = JSON.parse(existingRaw);
          if (existingParsed && typeof existingParsed.uid === 'string') {
            preservedUid = existingParsed.uid;
          }
        }
      }
      localStorage.setItem(
        VERIFIED_SESSION_CACHE_KEY,
        JSON.stringify({
          email: email.trim().toLowerCase(),
          ...(preservedUid ? { uid: preservedUid } : {}),
          verifiedAt: Date.now(),
        })
      );
    } else {
      localStorage.removeItem(VERIFIED_SESSION_CACHE_KEY);
    }
  } catch {
    // ignore
  }
};

export const getVerifiedOwnerSessionCache = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VERIFIED_SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === 'string' && isVerifiedOwnerEmail(parsed.email)) {
      return parsed.email;
    }
  } catch {
    // ignore
  }
  return null;
};

export const getVerifiedOwnerUidMatch = (uid?: string | null): boolean => {
  if (typeof window === 'undefined' || !uid) return false;
  try {
    const raw = localStorage.getItem(VERIFIED_SESSION_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(
      parsed &&
        typeof parsed.email === 'string' &&
        isVerifiedOwnerEmail(parsed.email) &&
        typeof parsed.uid === 'string' &&
        parsed.uid === uid
    );
  } catch {
    return false;
  }
};

const normalizeEmail = (email?: string | null): string =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

export interface ResolvedFirebaseIdentity {
  email: string | null;
  emailVerified: boolean;
  source: string;
  claimKeys?: string[];
  hasTokenEmailClaim?: boolean;
}

const uidIdentityCache = new Map<string, ResolvedFirebaseIdentity>();

export const setUidIdentityCache = (uid: string, identity: ResolvedFirebaseIdentity) => {
  if (!uid) return;
  uidIdentityCache.set(uid, {
    ...identity,
    email: identity.email ? identity.email.trim().toLowerCase() : null,
  });
};

export const getUidIdentityCache = (uid?: string | null): ResolvedFirebaseIdentity | null => {
  if (!uid) return null;
  return uidIdentityCache.get(uid) ?? null;
};

export const clearUidIdentityCache = (uid?: string) => {
  if (uid) {
    uidIdentityCache.delete(uid);
  } else {
    uidIdentityCache.clear();
  }
};

export const getUserPrimaryEmail = (
  user?: {
    uid?: string;
    email?: string | null;
    providerData?: Array<{ providerId?: string | null; email?: string | null }>;
  } | null
): string | null => {
  if (!user) return null;
  if (user.email && user.email.trim()) return user.email.trim().toLowerCase();
  const googleProviderEmail = user.providerData?.find(
    (p) => p?.providerId === 'google.com' && p?.email && p.email.trim()
  )?.email;
  if (googleProviderEmail) return googleProviderEmail.trim().toLowerCase();
  const providerEmail = user.providerData?.find((p) => p?.email && p.email.trim())?.email;
  if (providerEmail) return providerEmail.trim().toLowerCase();
  if (user.uid) {
    const cached = uidIdentityCache.get(user.uid);
    if (cached?.email && cached.email.trim()) {
      return cached.email.trim().toLowerCase();
    }
    const isGoogleLinked = Boolean(
      user.providerData?.some((p) => p?.providerId === 'google.com')
    );
    if (isGoogleLinked && getVerifiedOwnerUidMatch(user.uid)) {
      return OWNER_EMAIL;
    }
  }
  return null;
};

export const isFirebaseUserEmailVerified = (
  user?: {
    uid?: string;
    emailVerified?: boolean | null;
    providerData?: Array<{ providerId?: string | null; email?: string | null }>;
  } | null
): boolean => {
  if (!user) return false;
  if (user.emailVerified === true) return true;
  if (user.uid) {
    const cached = uidIdentityCache.get(user.uid);
    if (cached?.emailVerified === true) return true;
    const isGoogleLinked = Boolean(
      user.providerData?.some((p) => p?.providerId === 'google.com')
    );
    if (isGoogleLinked && getVerifiedOwnerUidMatch(user.uid)) {
      return true;
    }
  }
  return false;
};

export const isVerifiedOwnerEmail = (email?: string | null): boolean => {
  const norm = normalizeEmail(email);
  return OWNER_EMAILS.includes(norm as (typeof OWNER_EMAILS)[number]);
};

export const hasActivePasscodeSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.verified === true && isVerifiedOwnerEmail(parsed.email));
  } catch {
    return false;
  }
};

export const setPasscodeSession = (email: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        verified: true,
        email: normalizeEmail(email),
        method: 'passcode',
        verifiedAt: Date.now(),
      })
    );
    setVerifiedOwnerSessionCache(email);
  } catch {
    // ignore
  }
};

export const clearPasscodeSession = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // ignore
  }
};

export const hasFirebaseGoogleOwnerSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  const user = auth.currentUser;
  if (!user) return false;
  const email = getUserPrimaryEmail(user);
  return Boolean(email && isVerifiedOwnerEmail(email) && isFirebaseUserEmailVerified(user));
};

export const ensureOwnerAdminStatusDoc = async (deviceInfo?: string): Promise<boolean> => {
  const user = auth.currentUser;
  const email = getUserPrimaryEmail(user);
  const emailVerified = isFirebaseUserEmailVerified(user);
  if (!user || !email || !isVerifiedOwnerEmail(email) || !emailVerified) {
    return false;
  }

  const adminStatusRef = doc(db, 'system', 'admin_status');
  const ownerStatusRef = doc(db, 'system', 'owner_status');
  const normalizedEmail = email.trim().toLowerCase();
  const registration = {
    owner_registered: true,
    owner_email: normalizedEmail,
    owner_uid: user.uid,
    owner_uids: [user.uid],
    owner_emails: [normalizedEmail],
    createdAt: new Date().toISOString(),
    createdDevice: deviceInfo || 'Unknown Device',
  };

  try {
    const [ownerStatus, adminStatus] = await Promise.all([
      getDoc(ownerStatusRef),
      getDoc(adminStatusRef),
    ]);

    if (!adminStatus.exists()) {
      if (ownerStatus.exists()) {
        throw new Error('Owner setup indicator exists but system/admin_status is missing. Repair the existing owner record before signing in.');
      }
      // First approved account atomically claims the owner record and setup flag.
      const batch = writeBatch(db);
      batch.set(adminStatusRef, registration);
      batch.set(ownerStatusRef, { owner_registered: true });
      await batch.commit();
    } else {
      // Preserve the primary owner UID and add this approved account's UID.
      await updateDoc(adminStatusRef, {
        owner_registered: true,
        owner_uids: arrayUnion(user.uid),
        owner_emails: arrayUnion(normalizedEmail),
      });
    }

    return true;
  } catch (err) {
    const errInfo = handleFirestoreError(err, OperationType.WRITE, 'system/admin_status');
    const cachedIdentity = getUidIdentityCache(user.uid);
    const missingTokenEmail =
      cachedIdentity && cachedIdentity.claimKeys?.length && !cachedIdentity.hasTokenEmailClaim;
    updateCloudSyncState({
      status: 'error',
      error: missingTokenEmail
        ? `Signed in as ${email} (UID: ${user.uid}), but Firestore denied owner registration because the ID token lacks an email claim. Verify the deployed firestore.rules on ${FIRESTORE_DATABASE_ID}.`
        : `Could not register owner in system/admin_status (${errInfo.error}). Verify deployed firestore.rules on ${FIRESTORE_DATABASE_ID}.`,
    });
    throw err;
  }
};

export const checkOwnerAdminStatusDoc = async (): Promise<{
  exists: boolean;
  matchesOwnerUid: boolean;
  ownerRegistered?: boolean;
  ownerEmail?: string;
  ownerEmails?: string[];
  ownerUids?: string[];
  error?: string;
}> => {
  const user = auth.currentUser;
  if (!user) {
    return {
      exists: false,
      matchesOwnerUid: false,
      error: 'No Firebase Auth user signed in (system/admin_status is owner-read only).',
    };
  }
  try {
    const snap = await getDocFromServer(doc(db, 'system', 'admin_status'));
    if (!snap.exists()) {
      return { exists: false, matchesOwnerUid: false };
    }
    const data = snap.data() as Record<string, unknown>;
    return {
      exists: true,
      ownerRegistered: data.owner_registered === true,
      ownerEmail: typeof data.owner_email === 'string' ? data.owner_email : undefined,
      ownerEmails: Array.isArray(data.owner_emails) ? data.owner_emails.filter((value): value is string => typeof value === 'string') : undefined,
      ownerUids: Array.isArray(data.owner_uids) ? data.owner_uids.filter((value): value is string => typeof value === 'string') : undefined,
      matchesOwnerUid: data.owner_uid === user.uid || (Array.isArray(data.owner_uids) && data.owner_uids.includes(user.uid)),
    };
  } catch (err) {
    return {
      exists: false,
      matchesOwnerUid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

export const isUserAdminAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Check persistent passcode owner session (stays active until explicit Sign Out)
  if (hasActivePasscodeSession()) {
    return true;
  }

  // 2. Check active Firebase Google owner session
  const email = getUserPrimaryEmail(auth.currentUser);
  if (email && isVerifiedOwnerEmail(email)) {
    setVerifiedOwnerSessionCache(email);
    return true;
  }

  // 3. While Firebase Auth finishes restoring from IndexedDB on boot, honor verified local session cache
  if (!firebaseAuthInitialized && !auth.currentUser) {
    const cachedEmail = getVerifiedOwnerSessionCache();
    if (cachedEmail) {
      console.debug('[SmokyZone Auth] Using verified session cache while Firebase initializes:', cachedEmail);
      return true;
    }
  }

  // Clear stale Google session cache if Firebase confirmed no owner is signed in
  try {
    if (firebaseAuthInitialized && !auth.currentUser) {
      localStorage.removeItem(VERIFIED_SESSION_CACHE_KEY);
    }
  } catch {
    // ignore
  }
  return false;
};

export const adminSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {
    // fallback
  }
  clearUidIdentityCache();
  clearPasscodeSession();
  setVerifiedOwnerSessionCache(null);
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

export const addActivityLog = (
  title: string,
  details: string,
  type: 'music' | 'media' | 'system' | 'security' = 'music'
): void => {
  const current = getStoredConfig();
  const newLog: ActivityLogItem = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    title,
    details,
    type,
  };
  const updatedLogs = [newLog, ...(current.activityLogs || [])].slice(0, 50);
  saveStoredConfig({
    ...current,
    activityLogs: updatedLogs,
  });
};

