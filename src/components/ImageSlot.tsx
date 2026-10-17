import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Check } from 'lucide-react';
import { getStoredPhoto, setStoredPhoto, removeStoredPhoto, compressImageFile } from '../utils/photoStorage';
import { getMediaItem } from '../utils/siteStore';

interface ImageSlotProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  placeholderText?: string;
  storageKey?: string;
  slotLabel?: string;
  allowUpload?: boolean;
}

export const ImageSlot: React.FC<ImageSlotProps> = ({
  src,
  fallbackSrc,
  alt,
  className = '',
  placeholderText,
  storageKey,
  slotLabel,
  allowUpload = false,
}) => {
  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  // Source stage: 'stored' | 'src' | 'fallback' | 'emergency'
  const [sourceStage, setSourceStage] = useState<'stored' | 'src' | 'fallback' | 'emergency'>('stored');
  const [isSavedToast, setIsSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load from local/cloud storage and listen to live changes
  useEffect(() => {
    let isMounted = true;
    const loadPhoto = () => {
      if (storageKey) {
        const saved = getStoredPhoto(storageKey);
        if (saved && saved.trim() !== '') {
          if (isMounted) {
            setStoredUrl(saved);
            setSourceStage('stored');
          }
          return;
        }
        // Async cloud fallback
        getMediaItem(storageKey).then((cloudVal) => {
          if (isMounted && cloudVal && cloudVal.trim() !== '') {
            setStoredUrl(cloudVal);
            setSourceStage('stored');
          }
        });
      }
      if (isMounted) {
        setStoredUrl(null);
        setSourceStage('src');
      }
    };
    loadPhoto();

    const handleMediaChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string; data?: string }>;
      if (!customEvent.detail || customEvent.detail.key === storageKey) {
        loadPhoto();
      }
    };

    const handleConfigChange = () => {
      loadPhoto();
    };

    window.addEventListener('smokyzone_media_change', handleMediaChange);
    window.addEventListener('smokyzone_config_change', handleConfigChange);
    return () => {
      isMounted = false;
      window.removeEventListener('smokyzone_media_change', handleMediaChange);
      window.removeEventListener('smokyzone_config_change', handleConfigChange);
    };
  }, [storageKey, src]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImageFile(file);
      setStoredUrl(base64);
      setSourceStage('stored');
      if (storageKey) {
        setStoredPhoto(storageKey, base64);
      }
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 3000);
    } catch (err) {
      console.error('Failed to convert photo:', err);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (storageKey) {
      removeStoredPhoto(storageKey);
    }
    setStoredUrl(null);
    setSourceStage('src');
  };

  // Determine current active src based on stage
  let activeSrc: string = '/images/celebrity_smork.jpg';
  if (sourceStage === 'stored' && storedUrl) {
    activeSrc = storedUrl;
  } else if (sourceStage === 'src' || (sourceStage === 'stored' && !storedUrl)) {
    activeSrc = src && src.trim() !== '' ? src : (fallbackSrc || '/images/celebrity_smork.jpg');
  } else if (sourceStage === 'fallback') {
    activeSrc = fallbackSrc && fallbackSrc.trim() !== '' ? fallbackSrc : (src || '/images/celebrity_smork.jpg');
  } else {
    activeSrc = src || fallbackSrc || '/images/celebrity_smork.jpg';
  }

  const handleImageError = () => {
    if (sourceStage === 'stored') {
      // If stored photo failed, purge it and fallback to src
      if (storageKey) {
        removeStoredPhoto(storageKey);
      }
      setStoredUrl(null);
      setSourceStage('src');
    } else if (sourceStage === 'src') {
      // If src failed, try fallbackSrc if available
      if (fallbackSrc && fallbackSrc.trim() !== '' && fallbackSrc !== src) {
        setSourceStage('fallback');
      } else {
        setSourceStage('emergency');
      }
    } else {
      setSourceStage('emergency');
    }
  };

  return (
    <div className="relative w-full h-full group overflow-hidden bg-[#050811]">
      <img
        src={activeSrc}
        alt={alt}
        onError={handleImageError}
        className={className}
      />

      {/* Floating Photo Manager affordance (only where explicitly enabled, e.g. profile photos) */}
      {allowUpload && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
          <label
            title={storedUrl ? 'Change custom photo' : 'Set custom photo from device'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#050811]/90 backdrop-blur-md text-slate-200 hover:text-white border border-white/20 text-[11px] font-mono cursor-pointer hover:border-[#1E90FF] shadow-lg transition-all"
          >
            <Camera className="w-3 h-3 text-[#1E90FF]" />
            <span>{storedUrl ? 'Change' : (slotLabel || 'Set Photo')}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {storedUrl && (
            <button
              onClick={handleReset}
              title="Reset to default photo"
              className="p-1 rounded-md bg-[#050811]/90 backdrop-blur-md text-slate-400 hover:text-red-400 border border-white/20 text-[11px] font-mono cursor-pointer hover:border-red-400 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Saved Notification */}
      {isSavedToast && (
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono backdrop-blur-sm animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Photo saved to website!</span>
        </div>
      )}
    </div>
  );
};
