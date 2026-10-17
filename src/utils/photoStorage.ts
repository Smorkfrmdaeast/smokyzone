// Persistent client-side photo storage for Smork's official website
const STORAGE_PREFIX = 'smokyzone_photo_';

export const getStoredPhoto = (key: string): string | null => {
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return val && val.trim() !== '' ? val : null;
  } catch (err) {
    console.warn('Storage read error:', err);
    return null;
  }
};

export const setStoredPhoto = (key: string, base64Url: string): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, base64Url);
  } catch (err) {
    console.warn('Storage write error:', err);
  }
};

export const removeStoredPhoto = (key: string): void => {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (err) {
    console.warn('Storage delete error:', err);
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
