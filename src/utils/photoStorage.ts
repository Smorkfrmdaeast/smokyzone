// Persistent client-side and cloud photo storage for Smork's official website
import { getMediaItem, setMediaItem, removeMediaItem, getStoredConfig, saveStoredConfig } from './siteStore';

const STORAGE_PREFIX = 'smokyzone_photo_';

export const getStoredPhoto = (key: string): string | null => {
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (val && val.trim() !== '') return val;

    const mediaVal = localStorage.getItem(`smokyzone_media_${key}`);
    if (mediaVal && mediaVal.trim() !== '') return mediaVal;

    const config = getStoredConfig();
    if (config.brandPhotos?.[key]) return config.brandPhotos[key];
    if (config.projectPhotos?.[key]) return config.projectPhotos[key];

    return null;
  } catch (err) {
    console.warn('Storage read error:', err);
    return null;
  }
};

export const setStoredPhoto = (key: string, base64Url: string): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, base64Url);
    localStorage.setItem(`smokyzone_media_${key}`, base64Url);
  } catch (err) {
    console.warn('Storage write error:', err);
  }

  // Update siteConfig brandPhotos or projectPhotos
  try {
    const config = getStoredConfig();
    const updated = {
      ...config,
      brandPhotos: {
        ...(config.brandPhotos || {}),
        [key]: base64Url,
      },
    };
    saveStoredConfig(updated);
  } catch {
    // ignore
  }

  // Also sync to cloud media items and dispatch event
  setMediaItem(key, base64Url, 'image/jpeg').catch(() => {});
};

export const removeStoredPhoto = (key: string): void => {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    localStorage.removeItem(`smokyzone_media_${key}`);
  } catch (err) {
    console.warn('Storage delete error:', err);
  }

  try {
    const config = getStoredConfig();
    const updatedBrandPhotos = { ...(config.brandPhotos || {}) };
    delete updatedBrandPhotos[key];
    const updated = {
      ...config,
      brandPhotos: updatedBrandPhotos,
    };
    saveStoredConfig(updated);
  } catch {
    // ignore
  }

  removeMediaItem(key).catch(() => {});
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Intelligent client-side image compression:
 * Resizes large smartphone camera photos (often 5MB - 15MB) to high-def web dimensions (max 1280px)
 * and ~80-150KB JPEG so they upload instantly, don't stall cellular data, and easily fit in Firestore.
 */
export const compressImageFile = (
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If not an image (e.g. video or audio), read as direct DataURL
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = blobUrl;
  });
};
