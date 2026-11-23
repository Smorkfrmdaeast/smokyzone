import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Film,
  Music,
  Briefcase,
  Quote,
  Shield,
  Check,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Eye,
  Smartphone,
  Save,
  Download,
  FileText,
  KeyRound,
  RefreshCw,
  Plus,
  Radio,
  Activity,
  Edit3,
  ArrowUp,
  ArrowDown,
  LogOut,
  UserCheck,
  AlertTriangle,
  GitBranch,
  Copy,
  Terminal,
  CheckCircle2,
  Database,
  Wand2,
  Code,
  Zap,
} from 'lucide-react';
import {
  SiteConfig,
  getStoredConfig,
  saveStoredConfig,
  resetStoredConfig,
  setMediaItem,
  getMediaItem,
  removeMediaItem,
  adminSignOut,
  exportSiteConfigJSON,
  importSiteConfigJSON,
  addActivityLog,
  ActivityLogItem,
  FIRESTORE_DATABASE_ID,
  FIREBASE_STORAGE_BUCKET,
  syncPlaylistToCloud,
  generatePlaylistCodeSnippet,
  isUserAdminAuthenticated,
  hasFirebaseGoogleOwnerSession,
  getCloudSyncState,
  CloudSyncState,
  uploadAudioTrackToStorage,
  getUserPrimaryEmail,
  OWNER_EMAIL,
  OWNER_EMAIL_DISPLAY,
} from '../utils/siteStore';
import { SyncIndicator } from './SyncIndicator';
import { FirebaseDiagnostics, runFirebaseConsoleDiagnostics } from './FirebaseDiagnostics';
import { fileToBase64, compressImageFile, setStoredPhoto, getStoredPhoto, removeStoredPhoto } from '../utils/photoStorage';
import { MusicTrack, VideoClipItem, PortfolioProject, UnfilteredThought, PORTFOLIO_PROJECTS, UNFILTERED_THOUGHTS } from '../data';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  logoutOwner,
  loginOwnerWithGoogle,
  changeOwnerPasscode,
  getDeviceInfo,
} from '../utils/authManager';
import {
  extractAudioMetadataFromFile,
  parseSongFilename,
  detectBestMatchingGenre,
  GENRE_PRESETS,
} from '../utils/genreMatcher';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVerifiedSession?: boolean;
}

type TabType = 'photos' | 'shorts' | 'music' | 'projects' | 'thoughts' | 'labels' | 'security' | 'activity' | 'github';

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  isVerifiedSession = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('photos');
  const [githubRepoUrl, setGithubRepoUrl] = useState('https://github.com/nuelsbussiness/smoky-zone.git');
  const [copiedGithubCmd, setCopiedGithubCmd] = useState(false);
  const [config, setConfig] = useState<SiteConfig>(getStoredConfig());
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Core brand photos preview cache
  const [walkinMedia, setWalkinMedia] = useState<string | null>(null);
  const [heroPhoto, setHeroPhoto] = useState<string | null>(null);
  const [celebrityPhoto, setCelebrityPhoto] = useState<string | null>(null);
  const [techSetupPhoto, setTechSetupPhoto] = useState<string | null>(null);

  // Music testing preview & fast batch / code-sync state
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('Smork');
  const [newTrackGenre, setNewTrackGenre] = useState('Street Drill');
  const [newTrackTag, setNewTrackTag] = useState('Exclusive');
  const [newTrackDuration, setNewTrackDuration] = useState('3:20');
  const [newTrackEnergyVibe, setNewTrackEnergyVibe] = useState('Authentic Smoky Zone street drill energy & nocturnal bounce');
  const [newTrackAudioUrl, setNewTrackAudioUrl] = useState('');
  const [newTrackFileName, setNewTrackFileName] = useState<string | null>(null);
  const [newTrackAudioSrc, setNewTrackAudioSrc] = useState<string | null>(null);
  const [newTrackAudioFile, setNewTrackAudioFile] = useState<File | null>(null);
  const [newTrackAudioBlobUrl, setNewTrackAudioBlobUrl] = useState<string | null>(null);
  const [isGoogleVerified, setIsGoogleVerified] = useState<boolean>(() => hasFirebaseGoogleOwnerSession());
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);
  const [googleVerifyError, setGoogleVerifyError] = useState<string | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>(() => getCloudSyncState());
  const [testingAudioId, setTestingAudioId] = useState<string | null>(null);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const [detectedGenreReason, setDetectedGenreReason] = useState<string | null>(null);
  const [showInCodeSyncPanel, setShowInCodeSyncPanel] = useState<boolean>(false);
  const [copiedCodeSuccess, setCopiedCodeSuccess] = useState<boolean>(false);
  const [isDraggingAudio, setIsDraggingAudio] = useState<boolean>(false);
  const [isSyncingCode, setIsSyncingCode] = useState<boolean>(false);
  const [codeSyncResult, setCodeSyncResult] = useState<{
    syncedToCloud: boolean;
    updatedAt?: string;
    error?: string;
  } | null>(null);
  const [batchUploadStatus, setBatchUploadStatus] = useState<string | null>(null);

  // Track editing state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackTitle, setEditTrackTitle] = useState('');
  const [editTrackArtist, setEditTrackArtist] = useState('');
  const [editTrackGenre, setEditTrackGenre] = useState('');
  const [editTrackDuration, setEditTrackDuration] = useState('');
  const [editTrackTag, setEditTrackTag] = useState('');
  const [editGenreReason, setEditGenreReason] = useState<string | null>(null);

  // Activity Log Form State
  const [activityFilter, setActivityFilter] = useState<'all' | 'music' | 'media' | 'system'>('all');
  const [customLogTitle, setCustomLogTitle] = useState('');
  const [customLogDetails, setCustomLogDetails] = useState('');

  // New Short Video Form State
  const [isAddingShort, setIsAddingShort] = useState(false);
  const [newShortTitle, setNewShortTitle] = useState('');
  const [newShortCategory, setNewShortCategory] = useState<'drill' | 'eastern' | 'street' | 'studio'>('drill');
  const [newShortArtist, setNewShortArtist] = useState('');
  const [newShortTag, setNewShortTag] = useState('0:05 Loop');
  const [newShortVideoSrc, setNewShortVideoSrc] = useState<string | null>(null);
  const [newShortThumbnail, setNewShortThumbnail] = useState<string | null>(null);

  // New Project Form State
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<'web' | 'phone' | 'va' | 'marketing'>('phone');
  const [newProjectRole, setNewProjectRole] = useState('Lead Specialist');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTech, setNewProjectTech] = useState('');
  const [newProjectImage, setNewProjectImage] = useState<string | null>(null);

  // New Thought Form State
  const [isAddingThought, setIsAddingThought] = useState(false);
  const [newThoughtTopic, setNewThoughtTopic] = useState('');
  const [newThoughtQuote, setNewThoughtQuote] = useState('');
  const [newThoughtReflection, setNewThoughtReflection] = useState('');

  // Passcode Management State
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');

  const canRenderStudio = Boolean(isVerifiedSession || isUserAdminAuthenticated());

  // Keep Google Cloud Auth and Sync state synchronized in real-time
  useEffect(() => {
    const refreshCloudStatus = () => {
      setIsGoogleVerified(hasFirebaseGoogleOwnerSession());
      setCloudSyncState(getCloudSyncState());
    };
    refreshCloudStatus();
    const unsubAuth = onAuthStateChanged(auth, () => {
      refreshCloudStatus();
    });
    window.addEventListener('smokyzone_sync_state', refreshCloudStatus);
    window.addEventListener('smokyzone_auth_change', refreshCloudStatus);
    return () => {
      unsubAuth();
      window.removeEventListener('smokyzone_sync_state', refreshCloudStatus);
      window.removeEventListener('smokyzone_auth_change', refreshCloudStatus);
    };
  }, [isOpen]);

  // Load latest photos and config on open
  useEffect(() => {
    if (isOpen && canRenderStudio) {
      console.info('[SmokyZone Auth] AdminPortalModal launching cleanly:', {
        isVerifiedSession,
        isAuthAdmin: isUserAdminAuthenticated(),
        firebaseGoogleVerified: hasFirebaseGoogleOwnerSession(),
        currentUserEmail: getUserPrimaryEmail(auth.currentUser),
      });
      const current = getStoredConfig();
      setConfig(current);

      getMediaItem('walkin_custom_media').then((val) => {
        if (val) setWalkinMedia(val);
        else if (current.walkinPhoto) setWalkinMedia(current.walkinPhoto);
      });

      const hero = getStoredPhoto('hero_portrait');
      if (hero) setHeroPhoto(hero);
      else getMediaItem('hero_portrait').then((val) => val && setHeroPhoto(val));

      const celeb = getStoredPhoto('celebrity_bandana_photo');
      if (celeb) setCelebrityPhoto(celeb);
      else getMediaItem('celebrity_bandana_photo').then((val) => val && setCelebrityPhoto(val));

      const tech = getStoredPhoto('tech_setup');
      if (tech) setTechSetupPhoto(tech);
      else getMediaItem('tech_setup').then((val) => val && setTechSetupPhoto(val));
    } else if (isOpen && !canRenderStudio) {
      console.warn('[SmokyZone Auth] AdminPortalModal blocked: isOpen=true but session not verified', {
        isVerifiedSession,
        isAuthAdmin: isUserAdminAuthenticated(),
        currentUserEmail: getUserPrimaryEmail(auth.currentUser),
      });
    }
  }, [isOpen, canRenderStudio, isVerifiedSession]);

  const handleVerifyGoogleCloud = async () => {
    setIsConnectingGoogle(true);
    setGoogleVerifyError(null);
    try {
      await loginOwnerWithGoogle({ forceAccountChooser: true });
      setIsGoogleVerified(hasFirebaseGoogleOwnerSession());
      setCloudSyncState(getCloudSyncState());
      void runFirebaseConsoleDiagnostics('google_verify');
      showToast(`Google session verified (${OWNER_EMAIL_DISPLAY}). Cloud Firestore & Storage writes enabled!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google verification failed.';
      setGoogleVerifyError(msg);
      showToast(msg, 'error');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4000);
  };

  // 1. Core Brand Photo Upload Handler (Hero, Celebrity, Tech, Walk-In)
  const handleBrandPhotoUpload = async (key: string, file: File) => {
    setIsUploading(true);
    setUploadProgress(20);
    try {
      setUploadProgress(50);
      const base64 = file.type.startsWith('image/')
        ? await compressImageFile(file)
        : await fileToBase64(file);

      setUploadProgress(80);
      await setStoredPhoto(key, base64);

      if (key === 'hero_portrait') setHeroPhoto(base64);
      if (key === 'celebrity_bandana_photo') setCelebrityPhoto(base64);
      if (key === 'tech_setup') setTechSetupPhoto(base64);
      let walkinCloudOk = true;
      let walkinWarn: string | undefined;
      let savedUrl = base64;
      if (key === 'walkin_custom_media') {
        const res = await setMediaItem('walkin_custom_media', file, file.type, (pct) =>
          setUploadProgress(Math.max(80, Math.min(99, pct)))
        );
        walkinCloudOk = res.cloudSynced;
        walkinWarn = res.warning;
        savedUrl = res.downloadUrl || base64;
        setWalkinMedia(savedUrl);
      }

      // Update in config.brandPhotos as well
      const updatedConfig = {
        ...config,
        brandPhotos: {
          ...(config.brandPhotos || {}),
          [key]: savedUrl,
        },
        ...(key === 'walkin_custom_media' ? { walkinPhoto: savedUrl } : {}),
      };
      setConfig(updatedConfig);
      saveStoredConfig(updatedConfig);

      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 600);
      if (!hasFirebaseGoogleOwnerSession() || !walkinCloudOk) {
        showToast(
          walkinWarn ||
            `Saved locally only. Verify Google Sign-In (${OWNER_EMAIL_DISPLAY}) in Passcode & Cloud to sync across devices.`,
          'info'
        );
      } else {
        showToast(`Photo uploaded to Firebase Storage & synced across all devices!`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error uploading photo. Please try another file.', 'error');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetBrandPhoto = async (key: string) => {
    removeStoredPhoto(key);
    if (key === 'hero_portrait') setHeroPhoto(null);
    if (key === 'celebrity_bandana_photo') setCelebrityPhoto(null);
    if (key === 'tech_setup') setTechSetupPhoto(null);
    if (key === 'walkin_custom_media') {
      setWalkinMedia(null);
      await removeMediaItem('walkin_custom_media');
    }

    const updatedBrandPhotos = { ...(config.brandPhotos || {}) };
    delete updatedBrandPhotos[key];
    const updatedConfig = {
      ...config,
      brandPhotos: updatedBrandPhotos,
      ...(key === 'walkin_custom_media' ? { walkinPhoto: null } : {}),
    };
    setConfig(updatedConfig);
    saveStoredConfig(updatedConfig);
    showToast('Reset photo to original brand default.');
  };

  // 2. 5s Cultural Short Media Upload
  const handleClipMediaUpload = async (clipId: string, file: File, isThumbnail = false) => {
    setIsUploading(true);
    setUploadProgress(15);
    try {
      if (!isThumbnail && file.type.startsWith('video/')) {
        // Validate duration: warn if clip is longer than 5 seconds
        try {
          const videoEl = document.createElement('video');
          videoEl.preload = 'metadata';
          const objectUrl = URL.createObjectURL(file);
          videoEl.src = objectUrl;
          await new Promise<void>((resolve) => {
            videoEl.onloadedmetadata = () => {
              URL.revokeObjectURL(objectUrl);
              if (videoEl.duration > 5.5) {
                const durSec = Math.round(videoEl.duration);
                showToast(`⚠️ Warning: Clip is ${durSec}s long. 5-second clips are recommended for best short looping.`, 'info');
              }
              resolve();
            };
            videoEl.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              resolve();
            };
          });
        } catch {
          // ignore error
        }
      }

      setUploadProgress(45);
      if (isThumbnail) {
        const base64 = await compressImageFile(file);
        const res = await setMediaItem(`video_clip_thumb_${clipId}`, base64, file.type || 'image/jpeg');
        const updatedClips = config.videoClips.map((c) =>
          c.id === clipId ? { ...c, thumbnail: res.downloadUrl || base64 } : c
        );
        const updated = { ...config, videoClips: updatedClips };
        setConfig(updated);
        saveStoredConfig(updated);
        addActivityLog('Thumbnail Updated', `Updated thumbnail for short video (${clipId})`, 'media');
        showToast(res.cloudSynced ? 'Clip thumbnail uploaded to Firebase Storage!' : res.warning || 'Saved locally only.', res.cloudSynced ? 'success' : 'info');
      } else if (file.type.startsWith('audio/')) {
        const res = await setMediaItem(`video_clip_audio_${clipId}`, file, file.type, (pct) =>
          setUploadProgress(Math.max(45, pct))
        );
        const updatedClips = config.videoClips.map((c) =>
          c.id === clipId ? { ...c, audioSrc: res.downloadUrl || res.localUrl } : c
        );
        const updated = { ...config, videoClips: updatedClips };
        setConfig(updated);
        saveStoredConfig(updated);
        addActivityLog('Audio Clip Uploaded', `Uploaded audio track for short video (${clipId})`, 'media');
        showToast(res.cloudSynced ? 'Clip audio uploaded to Firebase Storage!' : res.warning || 'Saved locally only.', res.cloudSynced ? 'success' : 'info');
      } else {
        const res = await setMediaItem(`video_clip_${clipId}`, file, file.type, (pct) =>
          setUploadProgress(Math.max(45, pct))
        );
        const updatedClips = config.videoClips.map((c) =>
          c.id === clipId ? { ...c, videoSrc: res.downloadUrl || res.localUrl } : c
        );
        const updated = { ...config, videoClips: updatedClips };
        setConfig(updated);
        saveStoredConfig(updated);
        addActivityLog('Video Clip Uploaded', `Uploaded new video clip media for short (${clipId})`, 'media');
        showToast(res.cloudSynced ? 'Clip 0:05 video uploaded to Firebase Storage!' : res.warning || 'Saved locally only.', res.cloudSynced ? 'success' : 'info');
      }
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 600);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error uploading media for video clip.', 'error');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateNewShort = async () => {
    if (!newShortTitle.trim() || !newShortThumbnail) {
      showToast('Please enter a title and upload at least a cover thumbnail.', 'error');
      return;
    }

    const newId = `short_${Date.now()}`;
    if (newShortVideoSrc) {
      await setMediaItem(`video_clip_${newId}`, newShortVideoSrc, 'video/mp4');
    }

    const newClip: VideoClipItem = {
      id: newId,
      title: newShortTitle.trim(),
      subtitle: newShortArtist.trim() || 'Eastern Drill & Culture',
      category: newShortCategory,
      thumbnail: newShortThumbnail,
      duration: '0:05',
      description: 'Exclusive raw moment recorded in Eastern Nigeria.',
      tag: newShortTag.trim() || 'Official Clip',
      views: '1.2K',
      artistOrTopic: newShortArtist.trim() || 'Smork Culture',
      videoSrc: newShortVideoSrc || undefined,
    };

    const updated = {
      ...config,
      videoClips: [...config.videoClips, newClip],
    };
    setConfig(updated);
    saveStoredConfig(updated);

    setNewShortTitle('');
    setNewShortArtist('');
    setNewShortVideoSrc(null);
    setNewShortThumbnail(null);
    setIsAddingShort(false);
    showToast('New cultural short added to Smoky Zone!');
  };

  const handleDeleteShort = (clipId: string) => {
    const updated = {
      ...config,
      videoClips: config.videoClips.filter((c) => c.id !== clipId),
    };
    setConfig(updated);
    saveStoredConfig(updated);
    removeMediaItem(`video_clip_${clipId}`);
    showToast('Short clip removed.');
  };

  // 3. Music Track Handlers (Fast Upload, Best-Match Genre Loader & Cloud Sync)
  const runCodeSync = async (baseConfig: SiteConfig) => {
    setIsSyncingCode(true);
    try {
      const syncRes = await syncPlaylistToCloud(baseConfig);
      if (syncRes.syncedToCloud) {
        setCodeSyncResult({
          syncedToCloud: true,
          updatedAt: new Date().toLocaleTimeString(),
        });
        return syncRes;
      } else {
        setCodeSyncResult({
          syncedToCloud: false,
          updatedAt: new Date().toLocaleTimeString(),
          error: syncRes.error,
        });
        return syncRes;
      }
    } finally {
      setIsSyncingCode(false);
    }
  };

  const handleBatchFastAudioUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) =>
        f.type.startsWith('audio/') ||
        /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(f.name)
    );
    if (files.length === 0) {
      showToast('Please drop or select valid MP3, WAV, M4A, or AAC audio files.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setBatchUploadStatus(`Analyzing ${files.length} audio file${files.length > 1 ? 's' : ''} & loading best genres...`);

    try {
      const baseTime = Date.now();
      const albumArtPool = [
        '/images/StockCake-Neon Music Studio_1758587212.jpg',
        '/images/celebrity_smork.jpg',
        '/images/drill_culture.jpg',
        '/images/street_party.jpg',
      ];

      let allCloudSynced = true;
      let lastCloudWarning: string | undefined;

      const processedTracks = await Promise.all(
        files.map(async (file, idx) => {
          const objUrl = URL.createObjectURL(file);
          try {
            const [meta, base64] = await Promise.all([
              extractAudioMetadataFromFile(file, objUrl),
              fileToBase64(file),
            ]);

            const trackId = `track_${baseTime}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
            const uploadRes = await uploadAudioTrackToStorage(trackId, file, (pct) => {
              setUploadProgress(Math.max(20, Math.min(90, pct)));
            });
            if (!uploadRes.cloudSynced) {
              allCloudSynced = false;
              lastCloudWarning = uploadRes.warning;
            }


            window.dispatchEvent(
              new CustomEvent('smokyzone_media_change', {
                detail: { key: `audio_track_${trackId}`, data: uploadRes.downloadUrl || base64, verified: true },
              })
            );

            const track: MusicTrack = {
              id: trackId,
              title: meta.title,
              artist: meta.artist,
              genre: meta.genre,
              duration: meta.duration,
              audioSrc: uploadRes.downloadUrl || `audio_track_${trackId}`,
              albumArt: albumArtPool[idx % albumArtPool.length],
              energyVibe: meta.energyVibe,
              tag: meta.tag || 'Exclusive',
            };
            return track;
          } finally {
            try {
              URL.revokeObjectURL(objUrl);
            } catch {
              // ignore
            }
          }
        })
      );

      setUploadProgress(75);
      setBatchUploadStatus('Saving playlist & syncing references...');

      const updated: SiteConfig = {
        ...config,
        playlist: [...processedTracks, ...config.playlist],
      };
      setConfig(updated);
      saveStoredConfig(updated);

      const syncRes = await runCodeSync(updated);

      setUploadProgress(100);
      setBatchUploadStatus(null);
      setTimeout(() => setUploadProgress(null), 600);

      const genresLoaded = Array.from(new Set(processedTracks.map((t) => t.genre))).join(', ');
      addActivityLog(
        `Fast Batch Upload (${processedTracks.length} Songs)`,
        `Added ${processedTracks.map((t) => `"${t.title}" [${t.genre}]`).join(', ')} (${allCloudSynced ? 'Firebase Storage' : 'Local Cache Only'}).`,
        'music'
      );

      if (!allCloudSynced) {
        showToast(
          lastCloudWarning ||
            `Saved locally only. Verify Google Sign-In (${OWNER_EMAIL_DISPLAY}) or deploy storage.rules to upload audio to Firebase Storage.`,
          'error'
        );
      } else if (syncRes && 'syncedToCloud' in syncRes && syncRes.syncedToCloud) {
        showToast(
          `✓ ${processedTracks.length} song${processedTracks.length > 1 ? 's' : ''} uploaded to Firebase Storage (${genresLoaded}) & saved to Firestore!`
        );
      } else {
        showToast(
          `✓ Songs uploaded to Firebase Storage, but the playlist could not be confirmed in Firestore: ${syncRes && 'error' in syncRes ? syncRes.error : 'Unknown sync error'}`
        );
      }
    } catch (err) {
      console.error('Batch upload error:', err);
      setBatchUploadStatus(null);
      setUploadProgress(null);
      showToast(err instanceof Error ? err.message : 'Some audio files failed to process. Please try MP3/WAV/M4A files.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMusicFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Fast path if multiple files selected at once
    if (files.length > 1) {
      e.target.value = '';
      await handleBatchFastAudioUpload(files);
      return;
    }

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(20);
    try {
      setNewTrackFileName(file.name);
      setNewTrackAudioFile(file);
      const objUrl = URL.createObjectURL(file);
      setNewTrackAudioBlobUrl(objUrl);

      setUploadProgress(50);
      const [meta, base64] = await Promise.all([
        extractAudioMetadataFromFile(file, objUrl),
        fileToBase64(file),
      ]);

      setNewTrackTitle(meta.title);
      setNewTrackArtist(meta.artist);
      setNewTrackGenre(meta.genre);
      setNewTrackTag(meta.tag || 'Exclusive');
      setNewTrackDuration(meta.duration);
      setNewTrackEnergyVibe(meta.energyVibe);
      setDetectedGenreReason(
        `${meta.genreMatch.genre} (${Math.round(meta.genreMatch.confidence * 100)}% match) — ${meta.genreMatch.reason}`
      );

      setNewTrackAudioSrc(base64);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 600);
      showToast(
        `Loaded "${meta.title}" · Auto-matched genre: ${meta.genre}. Press Add & Save to upload to Firebase Storage!`
      );
    } catch {
      showToast('Failed to load audio file. Please ensure it is an MP3, WAV, or AAC audio file.', 'error');
      setUploadProgress(null);
    } finally {
      e.target.value = '';
      setIsUploading(false);
    }
  };

  const handleAutoMatchSingleGenre = (mode: 'new' | 'edit') => {
    if (mode === 'new') {
      const parsed = parseSongFilename(newTrackTitle || newTrackFileName || '');
      const titleInput = newTrackTitle.trim() || parsed.title;
      const artistInput = newTrackArtist.trim() || parsed.artist || 'Smork';
      const match = detectBestMatchingGenre(titleInput, artistInput);
      setNewTrackGenre(match.genre);
      setNewTrackTag(match.suggestedTag);
      setNewTrackEnergyVibe(match.energyVibe);
      setDetectedGenreReason(
        `${match.genre} (${Math.round(match.confidence * 100)}% match) — ${match.reason}`
      );
      showToast(`Best genre loaded: ${match.genre}`);
    } else {
      const match = detectBestMatchingGenre(editTrackTitle, editTrackArtist);
      setEditTrackGenre(match.genre);
      if (!editTrackTag.trim() || editTrackTag === 'Needs Review') {
        setEditTrackTag(match.suggestedTag);
      }
      setEditGenreReason(
        `${match.genre} (${Math.round(match.confidence * 100)}% match) — ${match.reason}`
      );
      showToast(`Best genre matched for "${editTrackTitle}": ${match.genre}`);
    }
  };

  const handleAutoMatchAllGenres = async () => {
    const updatedPlaylist = config.playlist.map((track) => {
      const match = detectBestMatchingGenre(track.title, track.artist);
      return {
        ...track,
        genre: match.genre,
        energyVibe: match.energyVibe || track.energyVibe,
      };
    });
    const updated = { ...config, playlist: updatedPlaylist };
    setConfig(updated);
    saveStoredConfig(updated);
    const syncRes = await runCodeSync(updated);
    addActivityLog('Genres Auto-Matched', `Loaded best matching genres across all ${updatedPlaylist.length} tracks.`, 'music');
    showToast(
      syncRes.syncedToCloud
        ? `✓ Updated genres for ${updatedPlaylist.length} tracks and saved to Cloud Firestore.`
        : `Genres updated locally, but Cloud Firestore save failed: ${syncRes.error || 'Check owner sign-in and rules.'}`,
      syncRes.syncedToCloud ? 'success' : 'error'
    );
  };

  const handleToggleTrackPreview = async (trackId: string, trackAudioSrc?: string) => {
    if (testingAudioId === trackId && isTestPlaying) {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
      }
      setIsTestPlaying(false);
      setTestingAudioId(null);
      return;
    }

    let src = trackAudioSrc;
    if (!src || src.startsWith('audio_track_')) {
      const custom = await getMediaItem(`audio_track_${trackId}`);
      if (custom) src = custom;
    }
    if (!src) src = '/music/gunna_on_one_tonight.mp3';

    if (!testAudioRef.current) {
      testAudioRef.current = new Audio();
    }
    testAudioRef.current.src = src;
    testAudioRef.current.onended = () => {
      setIsTestPlaying(false);
      setTestingAudioId(null);
    };

    try {
      await testAudioRef.current.play();
      setIsTestPlaying(true);
      setTestingAudioId(trackId);
    } catch {
      showToast('Could not play audio preview in browser.', 'error');
      setIsTestPlaying(false);
      setTestingAudioId(null);
    }
  };

  const handleAddTrack = async () => {
    if (!newTrackTitle.trim()) {
      showToast('Please enter a track title.', 'error');
      return;
    }

    const newId = `track_${Date.now()}`;
    const cleanAudioUrl = newTrackAudioUrl.trim();
    const finalAudioRef = cleanAudioUrl || (newTrackAudioSrc ? `audio_track_${newId}` : undefined);

    // Ensure best matching genre is populated if user left default empty
    const genreMatch = detectBestMatchingGenre(newTrackTitle.trim(), newTrackArtist.trim());
    const resolvedGenre = newTrackGenre.trim() || genreMatch.genre;

    let uploadedAudioUrl: string | undefined;
    let cloudUploadWarning: string | undefined;
    let cloudUploadOk = true;

    if (newTrackAudioFile) {
      setIsUploading(true);
      setUploadProgress(10);
      const uploadRes = await uploadAudioTrackToStorage(newId, newTrackAudioFile, (pct) =>
        setUploadProgress(Math.max(10, pct))
      );
      cloudUploadOk = uploadRes.cloudSynced;
      cloudUploadWarning = uploadRes.warning;
      uploadedAudioUrl = uploadRes.downloadUrl;
      setUploadProgress(null);
      setIsUploading(false);
    } else if (newTrackAudioSrc) {
      const uploadRes = await setMediaItem(`audio_track_${newId}`, newTrackAudioSrc, 'audio/mp3');
      cloudUploadOk = uploadRes.cloudSynced;
      cloudUploadWarning = uploadRes.warning;
      uploadedAudioUrl = uploadRes.downloadUrl;
    }

    const newTrack: MusicTrack = {
      id: newId,
      title: newTrackTitle.trim(),
      artist: newTrackArtist.trim() || 'Smork',
      genre: resolvedGenre,
      duration: newTrackDuration.trim() || '3:20',
      audioSrc: uploadedAudioUrl || finalAudioRef,
      tag: newTrackTag.trim() || genreMatch.suggestedTag || 'Official Anthem',
      energyVibe: newTrackEnergyVibe.trim() || genreMatch.energyVibe,
      albumArt: '/images/StockCake-Neon Music Studio_1758587212.jpg',
    };

    const updated: SiteConfig = {
      ...config,
      playlist: [newTrack, ...config.playlist],
    };
    setConfig(updated);
    saveStoredConfig(updated);

    // Notify AudioPlayer and global music bus immediately
    window.dispatchEvent(
      new CustomEvent('smokyzone_media_change', {
        detail: { key: `audio_track_${newId}`, data: uploadedAudioUrl || newTrackAudioSrc || cleanAudioUrl },
      })
    );

    const syncRes = await runCodeSync(updated);

    setNewTrackTitle('');
    setNewTrackAudioSrc(null);
    setNewTrackAudioFile(null);
    setNewTrackAudioBlobUrl(null);
    setNewTrackFileName(null);
    setNewTrackAudioUrl('');
    setNewTrackDuration('3:20');
    setDetectedGenreReason(null);
    addActivityLog(
      'Track Added & Synced',
      `Added "${newTrack.title}" by ${newTrack.artist} (${newTrack.genre}) to playlist (${cloudUploadOk ? 'Firebase Storage' : 'Local Only'}).`,
      'music'
    );

    if (!cloudUploadOk) {
      showToast(
        cloudUploadWarning ||
          `Track saved locally only. Sign in with Google (${OWNER_EMAIL_DISPLAY}) to upload audio to Firebase Storage.`,
        'error'
      );
    } else if (syncRes && 'syncedToCloud' in syncRes && syncRes.syncedToCloud) {
      showToast(`✓ "${newTrack.title}" (${newTrack.genre}) uploaded to Firebase Storage & saved to Firestore!`);
    } else {
      showToast(`Audio uploaded, but the playlist could not be confirmed in Firestore: ${syncRes && 'error' in syncRes ? syncRes.error : 'Unknown sync error'}`);
    }
  };

  const handleMoveTrack = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= config.playlist.length) return;
    const nextList = [...config.playlist];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIdx, 0, moved);
    const updated = { ...config, playlist: nextList };
    setConfig(updated);
    saveStoredConfig(updated);
    showToast(`Moved "${moved.title}" ${direction}. Press Save Playlist to publish changes.`);
  };

  const handleSavePlaylist = async () => {
    saveStoredConfig(config);
    const syncRes = await runCodeSync(config);
    addActivityLog(
      'Playlist Saved to Cloud',
      `Saved Smoky Zone playlist with ${config.playlist.length} tracks.`,
      'music'
    );
    if (syncRes && 'syncedToCloud' in syncRes && syncRes.syncedToCloud) {
      showToast(`✓ Saved! ${config.playlist.length} tracks published to Cloud Firestore.`);
    } else {
      showToast(
        syncRes && 'error' in syncRes
          ? `Playlist could not be published: ${syncRes.error || 'Check Google owner sign-in and Firestore rules.'}`
          : 'Playlist could not be confirmed in Firestore. Check the Cloud Sync status.',
        'error'
      );
    }
  };

  const handleDeleteTrack = async (id: string) => {
    const trackToDelete = config.playlist.find((t) => t.id === id);
    const updated = {
      ...config,
      playlist: config.playlist.filter((t) => t.id !== id),
    };
    setConfig(updated);
    saveStoredConfig(updated);
    removeMediaItem(`audio_track_${id}`);
    const syncRes = await runCodeSync(updated);
    addActivityLog('Track Removed', `Removed track "${trackToDelete?.title || id}" from playlist.`, 'music');
    showToast(
      syncRes.syncedToCloud
        ? 'Track removed and playlist saved to Cloud Firestore.'
        : `Track removed locally, but Cloud Firestore save failed: ${syncRes.error || 'Check owner sign-in and rules.'}`,
      syncRes.syncedToCloud ? 'success' : 'error'
    );
  };

  const handleStartEditTrack = (track: MusicTrack) => {
    setEditingTrackId(track.id);
    setEditTrackTitle(track.title);
    setEditTrackArtist(track.artist);
    setEditTrackGenre(track.genre);
    setEditTrackDuration(track.duration);
    setEditTrackTag(track.tag);
    setEditGenreReason(null);
  };

  const handleSaveEditTrack = async (trackId: string) => {
    const updatedPlaylist = config.playlist.map((t) => {
      if (t.id === trackId) {
        return {
          ...t,
          title: editTrackTitle.trim() || t.title,
          artist: editTrackArtist.trim() || t.artist,
          genre: editTrackGenre.trim() || t.genre,
          duration: editTrackDuration.trim() || t.duration,
          tag: editTrackTag.trim() || t.tag,
        };
      }
      return t;
    });
    const updated = {
      ...config,
      playlist: updatedPlaylist,
    };
    setConfig(updated);
    saveStoredConfig(updated);
    const syncRes = await runCodeSync(updated);
    setEditingTrackId(null);
    setEditGenreReason(null);
    addActivityLog('Track Metadata Updated', `Saved updates for "${editTrackTitle}" (${editTrackGenre})`, 'music');
    showToast(
      syncRes.syncedToCloud
        ? `✓ Track "${editTrackTitle}" saved to Cloud Firestore.`
        : `Track updated locally, but Cloud Firestore save failed: ${syncRes.error || 'Check owner sign-in and rules.'}`,
      syncRes.syncedToCloud ? 'success' : 'error'
    );
  };

  const handleReplaceTrackAudio = async (trackId: string, file: File) => {
    setIsUploading(true);
    setUploadProgress(20);
    try {
      setUploadProgress(50);
      const objUrl = URL.createObjectURL(file);
      const [meta, base64] = await Promise.all([
        extractAudioMetadataFromFile(file, objUrl),
        fileToBase64(file),
      ]);
      try {
        URL.revokeObjectURL(objUrl);
      } catch {
        // ignore
      }

      setUploadProgress(65);
      const uploadRes = await uploadAudioTrackToStorage(trackId, file, (pct) =>
        setUploadProgress(Math.max(65, Math.min(98, pct)))
      );

      const updatedPlaylist = config.playlist.map((t) =>
        t.id === trackId
          ? {
              ...t,
              audioSrc: uploadRes.downloadUrl || `audio_track_${trackId}`,
              duration: meta.duration || t.duration,
              genre: t.genre || meta.genre,
            }
          : t
      );
      const updated = { ...config, playlist: updatedPlaylist };
      setConfig(updated);
      saveStoredConfig(updated);

      // Trigger instant live update across audio components
      window.dispatchEvent(
        new CustomEvent('smokyzone_media_change', {
          detail: { key: `audio_track_${trackId}`, data: uploadRes.downloadUrl || base64 },
        })
      );

      const syncRes = await runCodeSync(updated);

      const track = config.playlist.find((t) => t.id === trackId);
      addActivityLog(
        'Audio File Updated',
        `Replaced audio file for "${track?.title || trackId}" (${uploadRes.cloudSynced ? 'Firebase Storage' : 'Local Cache Only'}).`,
        'music'
      );
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 600);
      if (uploadRes.cloudSynced && syncRes.syncedToCloud) {
        showToast(`✓ Audio uploaded to Firebase Storage and playlist saved for "${track?.title || 'track'}"!`);
      } else {
        showToast(
          uploadRes.warning || syncRes.error || 'Audio or playlist update was saved locally only.',
          'error'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to replace audio file. Please check file format.', 'error');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCustomActivityLog = () => {
    if (!customLogTitle.trim()) {
      showToast('Please enter a log title.', 'error');
      return;
    }
    addActivityLog(customLogTitle.trim(), customLogDetails.trim() || 'Manual log entry', 'system');
    setConfig(getStoredConfig());
    setCustomLogTitle('');
    setCustomLogDetails('');
    showToast('Activity log recorded!');
  };

  // 4. Project Showcase Handlers
  const handleProjectPhotoUpload = async (projectId: string, file: File) => {
    setIsUploading(true);
    try {
      const base64 = await compressImageFile(file);
      await setMediaItem(`project_photo_${projectId}`, base64, file.type);
      setStoredPhoto(`project_photo_${projectId}`, base64);

      const updated = {
        ...config,
        projectPhotos: {
          ...config.projectPhotos,
          [projectId]: base64,
        },
      };
      setConfig(updated);
      saveStoredConfig(updated);
      showToast(`Project photo updated and synced across site!`);
    } catch {
      showToast('Error uploading project photo.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateNewProject = async () => {
    if (!newProjectTitle.trim() || !newProjectDesc.trim()) {
      showToast('Please fill out title and description.', 'error');
      return;
    }

    const newId = `project_${Date.now()}`;
    const techArray = newProjectTech.split(',').map((t) => t.trim()).filter(Boolean);

    if (newProjectImage) {
      await setMediaItem(`project_photo_${newId}`, newProjectImage, 'image/jpeg');
      setStoredPhoto(`project_photo_${newId}`, newProjectImage);
    }

    const newProj: PortfolioProject = {
      id: newId,
      title: newProjectTitle.trim(),
      category: newProjectCategory,
      description: newProjectDesc.trim(),
      technologies: techArray.length ? techArray : ['Web & Phone Tech', 'Real-world Deployment'],
      role: newProjectRole.trim() || 'Lead Specialist',
      image: newProjectImage || '/images/phone_repair_diag.jpg',
      fallbackImage: '/images/images-3.jpeg',
      features: ['Client specification satisfied', 'Verified performance and quality'],
    };

    const updatedProjects = [newProj, ...config.projects];
    const updated = {
      ...config,
      projects: updatedProjects,
      projectPhotos: newProjectImage
        ? { ...config.projectPhotos, [newId]: newProjectImage }
        : config.projectPhotos,
    };
    setConfig(updated);
    saveStoredConfig(updated);

    setNewProjectTitle('');
    setNewProjectDesc('');
    setNewProjectTech('');
    setNewProjectImage(null);
    setIsAddingProject(false);
    showToast('New project created and published to portfolio!');
  };

  const handleDeleteProject = (projId: string) => {
    const updated = {
      ...config,
      projects: config.projects.filter((p) => p.id !== projId),
    };
    setConfig(updated);
    saveStoredConfig(updated);
    removeMediaItem(`project_photo_${projId}`);
    showToast('Project removed.');
  };

  // 5. Unfiltered Thoughts Handlers
  const handleAddThought = () => {
    if (!newThoughtTopic.trim() || !newThoughtQuote.trim()) {
      showToast('Please enter topic and quote.', 'error');
      return;
    }

    const newThought: UnfilteredThought = {
      id: `thought_${Date.now()}`,
      topic: newThoughtTopic.trim(),
      quote: newThoughtQuote.trim(),
      reflection: newThoughtReflection.trim() || 'Authentic reflection by Smork.',
    };

    const updated = {
      ...config,
      unfilteredThoughts: [newThought, ...config.unfilteredThoughts],
    };
    setConfig(updated);
    saveStoredConfig(updated);

    setNewThoughtTopic('');
    setNewThoughtQuote('');
    setNewThoughtReflection('');
    setIsAddingThought(false);
    showToast('New unfiltered thought published!');
  };

  const handleDeleteThought = (id: string) => {
    const updated = {
      ...config,
      unfilteredThoughts: config.unfilteredThoughts.filter((t) => t.id !== id),
    };
    setConfig(updated);
    saveStoredConfig(updated);
    showToast('Reflection removed.');
  };

  // 6. Save Labels & Text
  const handleSaveLabels = () => {
    saveStoredConfig(config);
    showToast('All titles, bio, WhatsApp, and social links saved & synced across site!');
  };

  // Reorder Item Helpers (Requirement 4: Phone & PC Content Control)
  const moveTrack = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= config.playlist.length) return;
    const nextList = [...config.playlist];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIdx, 0, moved);
    const updated = { ...config, playlist: nextList };
    setConfig(updated);
    saveStoredConfig(updated);
    addActivityLog('Reordered Playlist', `Moved "${moved.title}" to slot #${targetIdx + 1} from ${getDeviceInfo()}`, 'system');
    showToast(`Track "${moved.title}" moved ${direction}.`);
  };

  const moveShort = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= config.videoClips.length) return;
    const nextList = [...config.videoClips];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIdx, 0, moved);
    const updated = { ...config, videoClips: nextList };
    setConfig(updated);
    saveStoredConfig(updated);
    addActivityLog('Reordered Shorts', `Moved "${moved.title}" to position #${targetIdx + 1} from ${getDeviceInfo()}`, 'system');
    showToast(`Short "${moved.title}" moved ${direction}.`);
  };

  const moveProject = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const list = config.projects || [];
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const nextList = [...list];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIdx, 0, moved);
    const updated = { ...config, projects: nextList };
    setConfig(updated);
    saveStoredConfig(updated);
    addActivityLog('Reordered Projects', `Moved "${moved.title}" to position #${targetIdx + 1} from ${getDeviceInfo()}`, 'system');
    showToast(`Project "${moved.title}" moved ${direction}.`);
  };

  const moveThought = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const list = config.unfilteredThoughts || [];
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const nextList = [...list];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIdx, 0, moved);
    const updated = { ...config, unfilteredThoughts: nextList };
    setConfig(updated);
    saveStoredConfig(updated);
    addActivityLog('Reordered Thoughts', `Moved reflection to position #${targetIdx + 1} from ${getDeviceInfo()}`, 'system');
    showToast(`Thought moved ${direction}.`);
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changeOwnerPasscode(currentPassInput, newPassInput, confirmPassInput);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      showToast('Owner passcode updated successfully!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update passcode.', 'error');
    }
  };

  const handleOwnerLogout = async () => {
    try {
      await logoutOwner();
    } catch {
      await adminSignOut();
    }
    onClose();
    showToast('Signed out of Smoky Zone Owner Studio.');
  };

  if (!isOpen || !canRenderStudio) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl bg-[#091124] border border-[#1E90FF]/30 shadow-2xl flex flex-col overflow-hidden text-left">
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-[#050811] border-b border-white/10 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1E90FF] text-white flex items-center justify-center shadow-lg shadow-[#1E90FF]/30 font-bold text-base">
              ⚡
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white font-['Outfit',sans-serif] tracking-tight">
                  Smoky Zone Live Studio
                </h2>
                <SyncIndicator compact={false} />
              </div>
              <p className="text-[11px] text-slate-400">
                Direct phone & laptop controls for photos, videos, music, projects, and text
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOwnerLogout}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-rose-500/40 cursor-pointer"
              title="Sign out of admin session"
            >
              Sign Out
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Firebase Cloud Auth / Storage Write Gate Banner */}
        {!isGoogleVerified && (
          <div className="px-6 py-2.5 bg-amber-950/75 border-b border-amber-500/35 text-xs flex flex-col gap-2 text-amber-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  Local browser mode active. Sign in with Google (<span className="font-mono text-white">{OWNER_EMAIL_DISPLAY}</span>) to enable live Firestore &amp; Firebase Storage sync.
                </span>
              </div>
              <div className="flex items-center gap-2">
                {googleVerifyError?.includes('auth/unauthorized-domain') && typeof window !== 'undefined' && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.hostname);
                      showToast(`Copied "${window.location.hostname}" to clipboard!`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] whitespace-nowrap cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Domain</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleVerifyGoogleCloud}
                  disabled={isConnectingGoogle}
                  className="px-3 py-1.5 rounded-lg bg-[#1E90FF] hover:bg-[#1873cc] disabled:opacity-60 text-white font-semibold text-[11px] whitespace-nowrap cursor-pointer"
                >
                  {isConnectingGoogle ? 'Connecting...' : 'Sign In with Google'}
                </button>
              </div>
            </div>
            {googleVerifyError && (
              <p className="text-[11px] text-rose-200 bg-rose-950/60 border border-rose-500/35 rounded-lg px-2.5 py-1.5 font-mono">
                {googleVerifyError}
              </p>
            )}
          </div>
        )}

        {/* Status Toast Banner */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-mono flex items-center justify-between transition-all ${
              statusMsg.type === 'error'
                ? 'bg-rose-900/80 text-rose-200 border-b border-rose-500/40'
                : statusMsg.type === 'info'
                ? 'bg-amber-900/80 text-amber-100 border-b border-amber-500/40'
                : 'bg-emerald-900/80 text-emerald-200 border-b border-emerald-500/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-white/60 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Live Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="w-full bg-[#050811] px-6 py-2.5 border-b border-[#1E90FF]/30 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono text-[#1E90FF] mb-1.5">
              <span className="flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 animate-bounce" /> Uploading media & syncing live across site...
              </span>
              <span className="font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#1E90FF] via-cyan-400 to-emerald-400 transition-all duration-200 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tab Navigation Controls (Mobile touch-friendly) */}
        <div className="flex items-center gap-1 px-4 sm:px-6 py-2 bg-[#060C1B] border-b border-white/5 overflow-x-auto no-scrollbar flex-shrink-0">
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Brand Photos
          </button>

          <button
            onClick={() => setActiveTab('shorts')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'shorts'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" /> 5s Shorts (Drill/Live)
          </button>

          <button
            onClick={() => setActiveTab('music')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'music'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Music className="w-3.5 h-3.5" /> Official Playlist
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Projects & Portfolio
          </button>

          <button
            onClick={() => setActiveTab('thoughts')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'thoughts'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Quote className="w-3.5 h-3.5" /> Unfiltered Reflections
          </button>

          <button
            onClick={() => setActiveTab('labels')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'labels'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Site Content
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Passcode & Cloud
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'github'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" /> Official GitHub Sync
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-[#1E90FF] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Activity Log ({config.activityLogs?.length || 0})
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: CORE BRAND PHOTOS & WALK-IN VISUAL */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#060D1E] border border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Core Website Photos & Brand Visuals
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload from phone camera roll or laptop. Automatically chunked, cached in IndexedDB, and acknowledged by Cloud Firestore.
                  </p>
                </div>
                <SyncIndicator compact={true} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Walk-In Visual */}
                <div className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#1E90FF]" /> Smork Unfiltered Walk-In
                    </span>
                    <span className="text-[10px] font-mono text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded">
                      Main Showcase
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center">
                    {walkinMedia ? (
                      walkinMedia.startsWith('data:video') ? (
                        <video src={walkinMedia} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <img src={walkinMedia} alt="Walk-In Custom Preview" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <img src="/images/smork_walkin.jpg" alt="Walk-In Default" className="w-full h-full object-cover opacity-80" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-2.5 px-3 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider text-center cursor-pointer transition-all shadow">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandPhotoUpload('walkin_custom_media', file);
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <span>{isUploading ? 'Uploading...' : 'Upload Walk-In Media'}</span>
                    </label>

                    {walkinMedia && (
                      <button
                        onClick={() => handleResetBrandPhoto('walkin_custom_media')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Reset to default"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Hero Authentic Portrait */}
                <div className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#1E90FF]" /> Hero Authentic Portrait
                    </span>
                    <span className="text-[10px] font-mono text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded">
                      Homepage Top
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center">
                    <img
                      src={heroPhoto || '/images/celebrity_smork.jpg'}
                      alt="Hero Portrait"
                      className="w-full h-full object-cover object-top"
                    />
                    {heroPhoto && (
                      <span className="absolute top-2 right-2 text-[9px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded shadow">
                        Live Upload
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-2.5 px-3 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider text-center cursor-pointer transition-all shadow">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandPhotoUpload('hero_portrait', file);
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <span>Upload Hero Photo</span>
                    </label>

                    {heroPhoto && (
                      <button
                        onClick={() => handleResetBrandPhoto('hero_portrait')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Reset to default"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Celebrity Smork Bandana Spotlight Photo */}
                <div className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                      <span className="text-xs">💙💫</span> Celebrity Smork (Bandana)
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded">
                      Drill & Personality
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center">
                    <img
                      src={celebrityPhoto || '/images/celebrity_smork.jpg'}
                      alt="Celebrity Bandana Portrait"
                      className="w-full h-full object-cover object-top"
                    />
                    {celebrityPhoto && (
                      <span className="absolute top-2 right-2 text-[9px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded shadow">
                        Live Upload
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-2.5 px-3 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider text-center cursor-pointer transition-all shadow">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandPhotoUpload('celebrity_bandana_photo', file);
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <span>Upload Bandana Photo</span>
                    </label>

                    {celebrityPhoto && (
                      <button
                        onClick={() => handleResetBrandPhoto('celebrity_bandana_photo')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Reset to default"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Tech Workstation Lab Photo */}
                <div className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Tech Workstation Lab
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                      Phone Flashing & Bench
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center">
                    <img
                      src={techSetupPhoto || '/images/workspace_flashing.jpg'}
                      alt="Tech Workstation Photo"
                      className="w-full h-full object-cover"
                    />
                    {techSetupPhoto && (
                      <span className="absolute top-2 right-2 text-[9px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded shadow">
                        Live Upload
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider text-center cursor-pointer transition-all shadow">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandPhotoUpload('tech_setup', file);
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <span>Upload Workstation Photo</span>
                    </label>

                    {techSetupPhoto && (
                      <button
                        onClick={() => handleResetBrandPhoto('tech_setup')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Reset to default"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 5-SECOND CULTURAL SHORTS */}
          {activeTab === 'shorts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Cultural Shorts ({config.videoClips.length} Clips)
                  </h3>
                  <p className="text-xs text-slate-400">
                    5-second high-energy looping clips. Upload your own video files (MP4/MOV) or custom cover photos.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <SyncIndicator compact={true} />
                  <button
                    onClick={() => setIsAddingShort(!isAddingShort)}
                    className="px-3.5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingShort ? 'Cancel' : 'Add New Short'}</span>
                  </button>
                </div>
              </div>

              {/* Add New Short Drawer */}
              {isAddingShort && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#081226] border border-[#1E90FF]/40 space-y-4 animate-fadeIn">
                  <h4 className="text-xs font-bold text-white uppercase font-mono text-[#1E90FF]">
                    Create New Cultural Short Video
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Short Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sha EK Raw Studio Freestyle"
                        value={newShortTitle}
                        onChange={(e) => setNewShortTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Category
                      </label>
                      <select
                        value={newShortCategory}
                        onChange={(e) => setNewShortCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      >
                        <option value="drill">Drill Energy</option>
                        <option value="eastern">Eastern Music & Art</option>
                        <option value="street">Street & Nightlife</option>
                        <option value="studio">Studio Session</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Artist / Topic
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sha EK / Nanni Omologo / Enugu Night"
                        value={newShortArtist}
                        onChange={(e) => setNewShortArtist(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Tag Badge
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bronx Drill / 0:05 Loop / Eastern Vibe"
                        value={newShortTag}
                        onChange={(e) => setNewShortTag(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <label className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold text-center cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const b64 = await compressImageFile(file);
                            setNewShortThumbnail(b64);
                          }
                        }}
                        className="hidden"
                      />
                      <span>{newShortThumbnail ? 'Cover Thumbnail Selected' : 'Upload Cover Image'}</span>
                    </label>

                    <label className="py-2.5 px-3 rounded-xl bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 border border-[#1E90FF]/40 text-[#1E90FF] text-xs font-semibold text-center cursor-pointer block">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const b64 = await fileToBase64(file);
                            setNewShortVideoSrc(b64);
                          }
                        }}
                        className="hidden"
                      />
                      <span>{newShortVideoSrc ? 'Video File Attached' : 'Upload 5s Video File (Optional)'}</span>
                    </label>
                  </div>

                  <button
                    onClick={handleCreateNewShort}
                    className="w-full py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow"
                  >
                    Publish Short Video to Site
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.videoClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#1E90FF] font-bold uppercase">{clip.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{clip.tag}</span>
                        {config.videoClips.length > 2 && (
                          <button
                            onClick={() => handleDeleteShort(clip.id)}
                            className="text-slate-500 hover:text-rose-400"
                            title="Delete short"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                      <img src={clip.thumbnail} alt={clip.title} className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-mono font-bold bg-black/70 px-2 py-0.5 rounded border border-white/10">
                          {clip.duration} Loop
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={clip.title}
                        onChange={(e) => {
                          const updated = config.videoClips.map((c) =>
                            c.id === clip.id ? { ...c, title: e.target.value } : c
                          );
                          setConfig({ ...config, videoClips: updated });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Artist / Topic
                      </label>
                      <input
                        type="text"
                        value={clip.artistOrTopic}
                        onChange={(e) => {
                          const updated = config.videoClips.map((c) =>
                            c.id === clip.id ? { ...c, artistOrTopic: e.target.value } : c
                          );
                          setConfig({ ...config, videoClips: updated });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>

                    {/* Upload File Triggers */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2">
                      <label className="py-2 px-1.5 sm:px-2 rounded-lg bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 border border-[#1E90FF]/40 text-[#1E90FF] text-[10px] sm:text-[11px] font-semibold text-center cursor-pointer transition-colors block truncate">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleClipMediaUpload(clip.id, file, false);
                          }}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <span>Upload Video</span>
                      </label>

                      <label className="py-2 px-1.5 sm:px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-[11px] font-semibold text-center cursor-pointer transition-colors block truncate">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleClipMediaUpload(clip.id, file, false);
                          }}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <span>Upload Audio</span>
                      </label>

                      <label className="py-2 px-1.5 sm:px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] sm:text-[11px] font-semibold text-center cursor-pointer transition-colors block truncate">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleClipMediaUpload(clip.id, file, true);
                          }}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <span>Cover Photo</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveLabels}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <Save className="w-3.5 h-3.5" /> Save All Shorts
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: OFFICIAL PLAYLIST (FAST UPLOAD, GENRE AUTO-LOADER & IN-CODE SYNC) */}
          {activeTab === 'music' && (
            <div className="space-y-6">
              {/* Instant Fast Batch Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingAudio(true);
                }}
                onDragLeave={() => setIsDraggingAudio(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingAudio(false);
                  if (e.dataTransfer.files?.length) {
                    handleBatchFastAudioUpload(e.dataTransfer.files);
                  }
                }}
                className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center ${
                  isDraggingAudio
                    ? 'bg-[#1E90FF]/20 border-[#1E90FF] shadow-lg shadow-[#1E90FF]/25'
                    : 'bg-gradient-to-br from-[#0D182F] via-[#091326] to-[#050811] border-[#1E90FF]/40 hover:border-[#1E90FF]/70'
                }`}
              >
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#1E90FF]/20 border border-[#1E90FF]/40 flex items-center justify-center text-[#1E90FF]">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Fast 1-Click Song Upload &amp; Auto Genre Loader
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 max-w-xl mx-auto">
                      Drop or select MP3 / WAV / M4A files. Reads track metadata, matches genres, uploads audio to Firebase Storage, and publishes the playlist to Firestore.
                    </p>
                  </div>

                  {batchUploadStatus && (
                    <div className="px-3 py-1.5 rounded-lg bg-[#1E90FF]/15 border border-[#1E90FF]/40 text-[#1E90FF] text-xs font-mono flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{batchUploadStatus}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <label className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1E90FF] to-blue-600 hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-[#1E90FF]/30 flex items-center gap-2 transition-all active:scale-95">
                      <input
                        type="file"
                        accept="audio/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            handleBatchFastAudioUpload(e.target.files);
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Upload className="w-4 h-4" />
                      <span>{isUploading ? 'Uploading & Matching...' : 'Fast Upload Songs (Multi-Select)'}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowInCodeSyncPanel(!showInCodeSyncPanel)}
                      className="px-4 py-2.5 rounded-xl bg-[#050811] hover:bg-white/5 border border-white/15 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Code className="w-3.5 h-3.5 text-[#1E90FF]" />
                      <span>{showInCodeSyncPanel ? 'Hide Cloud Sync' : 'View Playlist Code Backup'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Status Banner & Copyable Snippet Drawer */}
              {(codeSyncResult || showInCodeSyncPanel) && (
                <div className="p-4 rounded-2xl bg-[#071124] border border-[#1E90FF]/35 space-y-3 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {codeSyncResult?.syncedToCloud ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Terminal className="w-4 h-4 text-[#1E90FF] flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-white font-mono">
                          {codeSyncResult?.syncedToCloud
                            ? `Saved to Cloud (${codeSyncResult.updatedAt})`
                            : 'Cloud Playlist Sync'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {codeSyncResult?.syncedToCloud
                            ? 'Playlist saved to Cloud Firestore. Audio files are stored in Firebase Storage.'
                            : 'Changes are published to Cloud Firestore when you save. Copy the snippet only if you need a static code backup.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatePlaylistCodeSnippet(config.playlist));
                        setCopiedCodeSuccess(true);
                        setTimeout(() => setCopiedCodeSuccess(false), 2500);
                        showToast('Copied CELEBRITY_PLAYLIST TypeScript code to clipboard!');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 text-[#1E90FF] border border-[#1E90FF]/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      {copiedCodeSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCodeSuccess ? 'Copied!' : 'Copy src/data.ts Code'}</span>
                    </button>
                  </div>

                  {showInCodeSyncPanel && (
                    <pre className="p-3 rounded-xl bg-[#03060E] border border-white/10 text-[10px] font-mono text-cyan-200 overflow-x-auto max-h-56 custom-scrollbar">
                      {generatePlaylistCodeSnippet(config.playlist)}
                    </pre>
                  )}
                </div>
              )}

              {/* Add Single Song Box (Full Control + Auto Genre Loader) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Music className="w-4 h-4 text-[#1E90FF]" /> Add Single Song &amp; Match Genre
                  </h3>
                  <button
                    onClick={handleSavePlaylist}
                    disabled={isSyncingCode}
                    className="px-4 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#1E90FF]/30 flex items-center gap-1.5 cursor-pointer active:scale-95 self-start sm:self-auto"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSyncingCode ? 'Saving to Cloud...' : 'Save to Cloud'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Track Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Endless / Eastside Anthem"
                      value={newTrackTitle}
                      onChange={(e) => setNewTrackTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Artist
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Gunna / Smork / Sha EK"
                      value={newTrackArtist}
                      onChange={(e) => setNewTrackArtist(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <label className="text-xs font-mono text-slate-400 uppercase">
                        Genre (Auto-Matched or Select Preset)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAutoMatchSingleGenre('new')}
                        className="px-2.5 py-1 rounded-lg bg-[#1E90FF]/20 hover:bg-[#1E90FF]/35 border border-[#1E90FF]/40 text-[#1E90FF] text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Wand2 className="w-3 h-3" /> Auto-Load Best Genre
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Melodic Trap / Street Drill / Eastern Cultural Rap"
                        value={newTrackGenre}
                        onChange={(e) => setNewTrackGenre(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                      <select
                        value={GENRE_PRESETS.includes(newTrackGenre as any) ? newTrackGenre : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewTrackGenre(e.target.value);
                            setDetectedGenreReason(`Loaded preset genre: ${e.target.value}`);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-slate-200 text-xs focus:border-[#1E90FF] focus:outline-none"
                      >
                        <option value="">Load from Smoky Zone Genre Library...</option>
                        {GENRE_PRESETS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    {detectedGenreReason && (
                      <p className="text-[11px] text-emerald-400 font-mono mt-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 flex-shrink-0" />
                        <span>{detectedGenreReason}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Tag / Badge
                    </label>
                    <input
                      type="text"
                      placeholder="Official Anthem / Trending / Exclusive"
                      value={newTrackTag}
                      onChange={(e) => setNewTrackTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      placeholder="3:20"
                      value={newTrackDuration}
                      onChange={(e) => setNewTrackDuration(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs font-mono focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      External Audio URL (Optional fallback if hosting online)
                    </label>
                    <input
                      type="url"
                      placeholder="https://.../audio.mp3 (Leave empty if uploading MP3 file below)"
                      value={newTrackAudioUrl}
                      onChange={(e) => setNewTrackAudioUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Attached Audio Preview Bar */}
                {(newTrackFileName || newTrackAudioSrc) && (
                  <div className="p-3 rounded-xl bg-[#050811] border border-[#1E90FF]/40 flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5 truncate">
                      <Music className="w-4 h-4 text-[#1E90FF] flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-white text-xs font-semibold truncate">{newTrackFileName || 'Audio Track Attached'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Duration: {newTrackDuration} · Genre: {newTrackGenre} · Ready
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleTrackPreview('new_track', newTrackAudioBlobUrl || newTrackAudioSrc || undefined)
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        testingAudioId === 'new_track' && isTestPlaying
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 text-[#1E90FF] border border-[#1E90FF]/40'
                      }`}
                    >
                      {testingAudioId === 'new_track' && isTestPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" /> Stop Preview
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Test Audio
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <label className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 border border-[#1E90FF]/40 text-[#1E90FF] text-xs font-semibold uppercase tracking-wider text-center cursor-pointer transition-colors block">
                    <input
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={handleMusicFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <span>{newTrackAudioSrc ? '✓ Replace Attached MP3' : 'Select Audio File(s)'}</span>
                  </label>

                  <button
                    onClick={handleAddTrack}
                    disabled={isSyncingCode || isUploading}
                    className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-[#1E90FF]/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Song &amp; Save to Cloud
                  </button>

                  <button
                    onClick={handleSavePlaylist}
                    disabled={isSyncingCode}
                    className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer sm:ml-auto"
                  >
                    <Save className="w-4 h-4" /> Save Playlist to Cloud
                  </button>
                </div>
              </div>

              {/* Current Playlist Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#091124] border border-[#1E90FF]/30">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Music className="w-4 h-4 text-[#1E90FF]" /> Smoky Zone Official Selection ({config.playlist.length} Tracks)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Pressing Save publishes your playlist to Cloud Firestore. Audio files are stored in Firebase Storage.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <SyncIndicator compact={true} />
                    <button
                      type="button"
                      onClick={handleAutoMatchAllGenres}
                      disabled={isSyncingCode}
                      className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Detect and load the best matching genre for all tracks"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Match All Genres</span>
                    </button>
                    <button
                      onClick={handleSavePlaylist}
                      disabled={isSyncingCode}
                      className="px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#1E90FF]/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Save className="w-4 h-4" /> Save Playlist to Cloud
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {config.playlist.map((track, idx) => {
                    const isEditing = editingTrackId === track.id;
                    const isCurrentlyTesting = testingAudioId === track.id && isTestPlaying;
                    const needsReview =
                      track.tag?.toLowerCase().includes('review') ||
                      track.title?.toLowerCase().includes('review');

                    if (isEditing) {
                      return (
                        <div
                          key={track.id}
                          className="p-3.5 rounded-xl bg-[#091224] border border-[#1E90FF]/50 space-y-3 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-[#1E90FF] font-bold">
                              Edit Track #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {track.id}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                                Title
                              </label>
                              <input
                                type="text"
                                value={editTrackTitle}
                                onChange={(e) => setEditTrackTitle(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                                Artist
                              </label>
                              <input
                                type="text"
                                value={editTrackArtist}
                                onChange={(e) => setEditTrackArtist(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[10px] font-mono text-slate-400 uppercase">
                                  Genre
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleAutoMatchSingleGenre('edit')}
                                  className="text-[10px] font-mono text-[#1E90FF] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Wand2 className="w-3 h-3" /> Auto-Match Best Genre
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={editTrackGenre}
                                  onChange={(e) => setEditTrackGenre(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                                />
                                <select
                                  value={GENRE_PRESETS.includes(editTrackGenre as any) ? editTrackGenre : ''}
                                  onChange={(e) => {
                                    if (e.target.value) setEditTrackGenre(e.target.value);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-slate-200 text-xs focus:border-[#1E90FF] focus:outline-none"
                                >
                                  <option value="">Select preset genre...</option>
                                  {GENRE_PRESETS.map((g) => (
                                    <option key={g} value={g}>
                                      {g}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {editGenreReason && (
                                <p className="text-[10px] text-emerald-400 font-mono mt-1">{editGenreReason}</p>
                              )}
                            </div>

                            <div>
                              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                                Duration
                              </label>
                              <input
                                type="text"
                                value={editTrackDuration}
                                onChange={(e) => setEditTrackDuration(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                                Tag
                              </label>
                              <input
                                type="text"
                                value={editTrackTag}
                                onChange={(e) => setEditTrackTag(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleSaveEditTrack(track.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow"
                            >
                              <Check className="w-3.5 h-3.5" /> Save &amp; Sync to Cloud
                            </button>
                            <button
                              onClick={() => {
                                setEditingTrackId(null);
                                setEditGenreReason(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={track.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-colors ${
                          isCurrentlyTesting
                            ? 'bg-[#1E90FF]/15 border-[#1E90FF]/60 shadow-md'
                            : 'bg-[#0D182F] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-slate-400 w-5 flex-shrink-0">
                            {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </span>

                          {/* Instant Audio Preview Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleTrackPreview(track.id, track.audioSrc)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                              isCurrentlyTesting
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 animate-pulse'
                                : 'bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 text-[#1E90FF] border border-[#1E90FF]/40'
                            }`}
                            title={isCurrentlyTesting ? 'Stop preview' : 'Play preview in browser'}
                          >
                            {isCurrentlyTesting ? (
                              <Pause className="w-4 h-4 fill-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-[#1E90FF] ml-0.5" />
                            )}
                          </button>

                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <p className="text-white text-xs font-bold truncate">{track.title}</p>
                              {needsReview && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                                  Review
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {track.artist} · <span className="text-[#1E90FF]">{track.genre}</span> ·{' '}
                              <span className="font-mono text-slate-300">{track.duration}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 self-end sm:self-center">
                          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline-block mr-1">
                            {track.tag}
                          </span>

                          {/* Reorder Buttons */}
                          <button
                            type="button"
                            onClick={() => handleMoveTrack(idx, 'up')}
                            disabled={idx === 0}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                            title="Move track up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTrack(idx, 'down')}
                            disabled={idx === config.playlist.length - 1}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                            title="Move track down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleStartEditTrack(track)}
                            className="px-2.5 py-1 rounded-lg bg-[#1E90FF]/15 hover:bg-[#1E90FF]/30 text-[#1E90FF] border border-[#1E90FF]/30 text-xs flex items-center gap-1 cursor-pointer"
                            title="Edit Title, Artist, Genre, Duration"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span className="text-[11px]">Edit</span>
                          </button>

                          <label
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            title="Replace MP3 Audio File"
                          >
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleReplaceTrackAudio(track.id, f);
                              }}
                              className="hidden"
                              disabled={isUploading}
                            />
                            <Upload className="w-3 h-3" />
                            <span className="text-[11px]">Replace Audio</span>
                          </label>

                          <button
                            onClick={() => handleDeleteTrack(track.id)}
                            className="w-7 h-7 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-500/20 text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Master Save Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-[#091124] border border-[#1E90FF]/40">
                  <div className="text-left">
                    <span className="text-white text-xs font-bold flex items-center gap-1.5">
                      <Save className="w-4 h-4 text-[#1E90FF]" /> Save Playlist to Cloud
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Saves your playlist to Firestore; uploaded audio files are stored in Firebase Storage.
                    </p>
                  </div>
                  <button
                    onClick={handleSavePlaylist}
                    disabled={isSyncingCode}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1E90FF] to-blue-600 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#1E90FF]/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4" /> {isSyncingCode ? 'Saving to Cloud...' : 'Save Playlist to Cloud'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROJECTS & PORTFOLIO */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Projects & Services ({config.projects.length} Showcases)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload photos from your workbench or phone roll. You can also add brand-new projects and client work.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingProject(!isAddingProject)}
                  className="px-3.5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingProject ? 'Cancel' : 'Add New Project'}</span>
                </button>
              </div>

              {/* Add New Project Drawer */}
              {isAddingProject && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#081226] border border-[#1E90FF]/40 space-y-4 animate-fadeIn">
                  <h4 className="text-xs font-bold text-white uppercase font-mono text-[#1E90FF]">
                    Add New Project or Client Service Showcase
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Project Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Samsung S22 Ultra Bootloop Recovery"
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Category
                      </label>
                      <select
                        value={newProjectCategory}
                        onChange={(e) => setNewProjectCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      >
                        <option value="phone">Phone Flashing & Firmware</option>
                        <option value="web">Web Development</option>
                        <option value="va">Virtual Assistance</option>
                        <option value="marketing">Digital Marketing</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Role / Specialization
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Lead Firmware Engineer"
                        value={newProjectRole}
                        onChange={(e) => setNewProjectRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                        Technologies (Comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Odin3, Fastboot, Stock Firmware, React"
                        value={newProjectTech}
                        onChange={(e) => setNewProjectTech(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                      Project Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe what was accomplished, client outcome, or technical challenge..."
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold text-center cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const b64 = await compressImageFile(file);
                            setNewProjectImage(b64);
                          }
                        }}
                        className="hidden"
                      />
                      <span>{newProjectImage ? 'Project Screenshot Selected' : 'Upload Screenshot from Phone'}</span>
                    </label>
                  </div>

                  <button
                    onClick={handleCreateNewProject}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow"
                  >
                    Publish Project to Website
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.projects.map((proj) => {
                  const customPhoto = config.projectPhotos[proj.id];
                  return (
                    <div
                      key={proj.id}
                      className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                          {proj.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#1E90FF] uppercase">
                            {proj.category}
                          </span>
                          {config.projects.length > 2 && (
                            <button
                              onClick={() => handleDeleteProject(proj.id)}
                              className="text-slate-500 hover:text-rose-400"
                              title="Delete project"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                        <img
                          src={customPhoto || proj.image}
                          alt={proj.title}
                          className="w-full h-full object-cover"
                        />
                        {customPhoto && (
                          <span className="absolute top-2 right-2 text-[9px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded shadow">
                            Custom Upload
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <label className="flex-1 py-2 px-3 rounded-lg bg-[#1E90FF] hover:bg-[#1873cc] text-white text-[11px] font-semibold text-center cursor-pointer transition-colors block shadow">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleProjectPhotoUpload(proj.id, file);
                            }}
                            className="hidden"
                            disabled={isUploading}
                          />
                          <span>Upload Photo from Phone</span>
                        </label>

                        {customPhoto && (
                          <button
                            onClick={() => {
                              const updatedPhotos = { ...config.projectPhotos };
                              delete updatedPhotos[proj.id];
                              const updated = { ...config, projectPhotos: updatedPhotos };
                              setConfig(updated);
                              saveStoredConfig(updated);
                              removeMediaItem(`project_photo_${proj.id}`);
                              showToast(`Reset photo for ${proj.title}`);
                            }}
                            className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs transition-colors"
                            title="Reset to default"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: UNFILTERED THOUGHTS & REFLECTIONS */}
          {activeTab === 'thoughts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Smork Unfiltered Thoughts ({config.unfilteredThoughts.length} Reflections)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real, raw reflections and quotes displayed on the Unfiltered section of your homepage.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingThought(!isAddingThought)}
                  className="px-3.5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingThought ? 'Cancel' : 'Add New Thought'}</span>
                </button>
              </div>

              {isAddingThought && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#081226] border border-[#1E90FF]/40 space-y-4 animate-fadeIn">
                  <h4 className="text-xs font-bold text-white uppercase font-mono text-[#1E90FF]">
                    Add New Unfiltered Thought
                  </h4>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                      Topic Headline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Overcoming Quiet Battles / Discipline Over Motivation"
                      value={newThoughtTopic}
                      onChange={(e) => setNewThoughtTopic(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                      Quote
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. When the world was silent, the grind spoke the loudest."
                      value={newThoughtQuote}
                      onChange={(e) => setNewThoughtQuote(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                      Full Reflection
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Elaborate on the struggle, lesson, or truth..."
                      value={newThoughtReflection}
                      onChange={(e) => setNewThoughtReflection(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleAddThought}
                    className="w-full py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow"
                  >
                    Publish Reflection to Site
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {config.unfilteredThoughts.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#1E90FF] font-bold uppercase">
                        {t.topic}
                      </span>
                      {config.unfilteredThoughts.length > 1 && (
                        <button
                          onClick={() => handleDeleteThought(t.id)}
                          className="text-slate-500 hover:text-rose-400"
                          title="Delete reflection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <blockquote className="text-sm font-semibold text-white italic">
                      "{t.quote}"
                    </blockquote>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t.reflection}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: SITE CONTENT (TITLES, BIO, WHATSAPP & SOCIAL LINKS) */}
          {activeTab === 'labels' && (
            <div className="space-y-5">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-[#1E90FF]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Site Content & Page Copy
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Update hero headlines, walk-in tagline, celebrity quote, bio story, WhatsApp, and social links live.
                  </p>
                </div>
                <button
                  onClick={handleSaveLabels}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 flex-shrink-0"
                >
                  <Save className="w-3.5 h-3.5" /> Save & Publish
                </button>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Hero Headline & Identity
                </h3>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    Hero Main Headline
                  </label>
                  <input
                    type="text"
                    value={config.labels.heroTitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        labels: { ...config.labels, heroTitle: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    Hero Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={config.labels.heroSubtitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        labels: { ...config.labels, heroSubtitle: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    Walk-In Tagline
                  </label>
                  <input
                    type="text"
                    value={config.labels.walkinTagline}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        labels: { ...config.labels, walkinTagline: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Celebrity Smork 💙💫 Quote & Badge
                </h3>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    Celebrity Badge Label
                  </label>
                  <input
                    type="text"
                    value={config.labels.celebrityBadge}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        labels: { ...config.labels, celebrityBadge: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    Celebrity Smork Official Quote
                  </label>
                  <textarea
                    rows={3}
                    value={config.labels.celebrityQuote}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        labels: { ...config.labels, celebrityQuote: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  About Smork Narrative Story (Bio)
                </h3>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    Full Bio Paragraphs (Separate paragraphs with double enter)
                  </label>
                  <textarea
                    rows={5}
                    value={config.labels.aboutBio || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        labels: { ...config.labels, aboutBio: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-sans leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Contact & Global Social Channels
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      WhatsApp Phone Number
                    </label>
                    <input
                      type="text"
                      value={config.labels.whatsappPhone}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          labels: { ...config.labels, whatsappPhone: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Contact Form Recipient Email
                    </label>
                    <input
                      type="email"
                      value={config.labels.contactEmail || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          labels: { ...config.labels, contactEmail: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      TikTok URL
                    </label>
                    <input
                      type="text"
                      value={config.labels.tiktokUrl || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          labels: { ...config.labels, tiktokUrl: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      YouTube URL
                    </label>
                    <input
                      type="text"
                      value={config.labels.youtubeUrl || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          labels: { ...config.labels, youtubeUrl: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Instagram URL
                    </label>
                    <input
                      type="text"
                      value={config.labels.instagramUrl || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          labels: { ...config.labels, instagramUrl: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Facebook URL
                    </label>
                    <input
                      type="text"
                      value={config.labels.facebookUrl || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          labels: { ...config.labels, facebookUrl: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      X (Twitter) URL
                    </label>
                    <input
                      type="text"
                      value={config.labels.xTwitterUrl || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          labels: { ...config.labels, xTwitterUrl: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveLabels}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <Save className="w-4 h-4" /> Save & Publish All Updates (Syncs Across Site)
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: OWNER AUTHENTICATION & SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Owner Account Session & Auto-Logout Notice */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Authenticated Owner Account
                      </h3>
                      <p className="text-xs text-slate-300 font-mono">
                        {getUserPrimaryEmail(auth.currentUser) || OWNER_EMAIL_DISPLAY}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleOwnerLogout}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out of Studio
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#050811] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Session Persistence</span>
                    <p className="text-white font-medium">Stays Signed In Until Logout</p>
                    <p className="text-[11px] text-slate-400">Your studio session stays active across visits until you explicitly sign out.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050811] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Authorized Owner Email</span>
                    <p className="text-white font-mono font-medium">{OWNER_EMAIL_DISPLAY}</p>
                    <p className="text-[11px] text-slate-400">Passcode & optional Google sign-in locked exclusively to {OWNER_EMAIL}.</p>
                  </div>
                </div>
              </div>

              {/* Change Owner Passcode */}
              <form
                onSubmit={handleChangePasscode}
                className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4"
              >
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#1E90FF]" /> Owner Passcode Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                      Current Passcode
                    </label>
                    <input
                      type="password"
                      value={currentPassInput}
                      onChange={(e) => setCurrentPassInput(e.target.value)}
                      placeholder="Current (if set)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                      New Passcode
                    </label>
                    <input
                      type="password"
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      placeholder="Min 4 chars"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                      Confirm Passcode
                    </label>
                    <input
                      type="password"
                      value={confirmPassInput}
                      onChange={(e) => setConfirmPassInput(e.target.value)}
                      placeholder="Re-enter new"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Update Owner Passcode
                </button>
              </form>

              {/* Cloud Sync Status & Backup */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" /> Firebase Auth, Firestore &amp; Storage Diagnostics
                </h3>

                <div
                  className={`p-3.5 rounded-xl bg-[#050811] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isGoogleVerified && cloudSyncState.status !== 'error'
                      ? 'border-emerald-500/30'
                      : 'border-amber-500/35'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                        isGoogleVerified && cloudSyncState.status !== 'error'
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-amber-400'
                      }`}
                    />
                    <div className="space-y-1">
                      <p className="text-white text-xs font-bold font-mono">
                        {isGoogleVerified
                          ? `Firebase Google Auth Active (${getUserPrimaryEmail(auth.currentUser) || OWNER_EMAIL_DISPLAY})`
                          : 'Local Passcode Only — Google Auth Required for Cloud/Storage Writes'}
                      </p>
                      {auth.currentUser?.uid && (
                        <p className="text-[10px] text-emerald-300 font-mono break-all">
                          Owner UID: {auth.currentUser.uid}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-mono">
                        Firestore DB: {FIRESTORE_DATABASE_ID}
                      </p>
                      <p className="text-[10px] text-cyan-300 font-mono">
                        Storage Bucket: {FIREBASE_STORAGE_BUCKET}
                      </p>
                      {cloudSyncState.error && (
                        <p className="text-[11px] text-amber-300 pt-1 leading-relaxed">
                          {cloudSyncState.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <SyncIndicator compact={false} />
                    {!isGoogleVerified && (
                      <button
                        type="button"
                        onClick={handleVerifyGoogleCloud}
                        disabled={isConnectingGoogle}
                        className="px-3 py-1.5 rounded-lg bg-[#1E90FF] hover:bg-[#1873cc] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                      >
                        {isConnectingGoogle ? 'Connecting...' : `Sign In with Google (${OWNER_EMAIL_DISPLAY})`}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      const json = exportSiteConfigJSON();
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `smokyzone_backup_${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      showToast('Backup JSON downloaded to your device!');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Site Backup JSON
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Reset all labels, media, and playlist to factory defaults?')) {
                        resetStoredConfig();
                        setConfig(getStoredConfig());
                        showToast('Reset to factory configuration.');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to Factory Defaults
                  </button>
                </div>
              </div>

              <FirebaseDiagnostics showDebugPanel />
            </div>
          )}

          {/* TAB 8: OFFICIAL GITHUB SYNC & REPOSITORY EXPORT */}
          {activeTab === 'github' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[#1E90FF]" /> Official GitHub Sync & Repository Setup
                  </h3>
                  <p className="text-xs text-slate-400">
                    Connect and push this production codebase to your official GitHub account to make Smoky Zone your permanent official repository.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-mono border border-amber-500/30 flex items-center gap-1.5 self-start sm:self-center">
                  <GitBranch className="w-3.5 h-3.5" /> Local Only · Push via Terminal
                </span>
              </div>

              {/* Repository Configurator */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-white font-bold uppercase">
                  <Terminal className="w-4 h-4 text-[#1E90FF]" /> Step 1: Your Official GitHub Repository Link
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    GitHub Remote URL
                  </label>
                  <input
                    type="text"
                    value={githubRepoUrl}
                    onChange={(e) => setGithubRepoUrl(e.target.value)}
                    placeholder="https://github.com/nuelsbussiness/smoky-zone.git"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#050811] border border-white/10 text-white text-xs font-mono focus:border-[#1E90FF] focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    You can create a new empty repository at <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-[#1E90FF] hover:underline">github.com/new</a> named <span className="text-white font-mono">smoky-zone</span> and paste its URL above.
                  </p>
                </div>

                {/* Command Snippet */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300 font-semibold">
                      Step 2: Run in your terminal / shell to sync:
                    </span>
                    <button
                      onClick={() => {
                        const cmd = `git init\ngit add .\ngit commit -m "feat: official Smoky Zone release with persistent studio and auth"\ngit branch -M main\ngit remote set-url origin ${githubRepoUrl} 2>/dev/null || git remote add origin ${githubRepoUrl}\ngit push -u origin main`;
                        navigator.clipboard.writeText(cmd);
                        setCopiedGithubCmd(true);
                        showToast('✓ Git sync commands copied to clipboard!');
                        setTimeout(() => setCopiedGithubCmd(false), 3000);
                      }}
                      className="px-3 py-1 rounded-lg bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 text-[#1E90FF] hover:text-white border border-[#1E90FF]/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedGithubCmd ? 'Copied! ✓' : 'Copy Commands'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#050811] border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto space-y-1">
                    <p className="text-slate-500"># 1. Initialize repository and stage all production code</p>
                    <p className="text-white">git init</p>
                    <p className="text-white">git add .</p>
                    <p className="text-white">git commit -m &quot;feat: official Smoky Zone release with persistent studio and auth&quot;</p>
                    <p className="text-slate-500 pt-1"># 2. Set default branch to main and link to your GitHub</p>
                    <p className="text-white">git branch -M main</p>
                    <p className="text-white">git remote set-url origin {githubRepoUrl} || git remote add origin {githubRepoUrl}</p>
                    <p className="text-slate-500 pt-1"># 3. Push and establish official repository</p>
                    <p className="text-[#1E90FF] font-bold">git push -u origin main</p>
                  </div>
                </div>
              </div>

              {/* Step 3: Vercel Deployment */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-[#1E90FF]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-white font-bold uppercase">
                    <ExternalLink className="w-4 h-4 text-[#1E90FF]" /> Step 3: Host on Vercel (1-Click or CLI)
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                    vercel.json Configured ✓
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The codebase is fully equipped with an optimized <span className="text-white font-mono">vercel.json</span>, SPA client routing, and in-code media fallbacks so all videos, portraits, and audio sync effortlessly on Vercel.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-[#050811] border border-white/5 space-y-1.5">
                    <p className="text-white font-semibold font-mono flex items-center gap-1.5">
                      <span>Method A:</span> 1-Click via GitHub Dashboard
                    </p>
                    <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[11px]">
                      <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-[#1E90FF] hover:underline">vercel.com/new</a> and log in.</li>
                      <li>Import your <span className="text-white font-mono">smoky-zone</span> GitHub repository.</li>
                      <li>Framework preset is auto-detected as <strong>Vite</strong>. Click <strong>Deploy</strong>.</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050811] border border-white/5 space-y-1.5">
                    <p className="text-white font-semibold font-mono flex items-center gap-1.5">
                      <span>Method B:</span> Deploy directly via Terminal / CLI
                    </p>
                    <div className="p-2 rounded bg-black/60 font-mono text-[11px] text-[#1E90FF] space-y-1">
                      <p>npx vercel</p>
                      <p className="text-slate-400"># For instant production live URL:</p>
                      <p>npx vercel --prod</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Verification Badges */}
              <div className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Official Release Status & Production Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#050811] border border-emerald-500/20 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Cloud Firestore Database</p>
                      <p className="text-[11px] text-slate-400 font-mono">ai-studio-smokyzone-d5b406ce-4d73-4af4-b06f-7fc6e2d05b4a</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050811] border border-emerald-500/20 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">10-Track Official Audio Player</p>
                      <p className="text-[11px] text-slate-400">Seamless auto-advance, zero hypnotic sound</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050811] border border-emerald-500/20 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Background Sync & Lock Screen</p>
                      <p className="text-[11px] text-slate-400">MediaSession API + active audio channels</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050811] border border-emerald-500/20 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Global Media Link Sync</p>
                      <p className="text-[11px] text-slate-400">Auto-compression & 600KB chunked Firestore sync</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: ACTIVITY LOG (IMPORT & AUDIT TRAIL) */}
          {activeTab === 'activity' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#1E90FF]" /> Smoky Zone System & Catalog Activity Log
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time audit trail of catalog imports, media replacements, and configuration events.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1 p-1 bg-[#050811] rounded-xl border border-white/10 text-xs font-mono">
                  {(['all', 'music', 'media', 'system'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActivityFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                        activityFilter === cat
                          ? 'bg-[#1E90FF] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log List */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {(!config.activityLogs || config.activityLogs.length === 0) ? (
                  <div className="p-8 text-center bg-[#0D182F] rounded-2xl border border-white/5 text-slate-400 text-xs font-mono">
                    No activity logs recorded yet.
                  </div>
                ) : (
                  config.activityLogs
                    .filter((log) => activityFilter === 'all' || log.type === activityFilter)
                    .map((log) => {
                      const typeColors = {
                        music: 'bg-[#1E90FF]/20 text-[#1E90FF] border-[#1E90FF]/30',
                        media: 'bg-purple-900/40 text-purple-300 border-purple-500/30',
                        system: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
                        security: 'bg-amber-900/40 text-amber-300 border-amber-500/30',
                      };
                      const dateStr = new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      return (
                        <div
                          key={log.id}
                          className="p-3.5 rounded-xl bg-[#0D182F] border border-white/5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase font-bold ${
                                  typeColors[log.type] || typeColors.system
                                }`}
                              >
                                {log.type}
                              </span>
                              <span className="text-white text-xs font-bold font-['Outfit',sans-serif]">
                                {log.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                              {dateStr}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-mono">
                            {log.details}
                          </p>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Add Custom Note Box */}
              <div className="p-4 rounded-2xl bg-[#0D182F] border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#1E90FF]" /> Record Management Note
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Log Title (e.g. Verified New MP3)"
                    value={customLogTitle}
                    onChange={(e) => setCustomLogTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Details / Description"
                    value={customLogDetails}
                    onChange={(e) => setCustomLogDetails(e.target.value)}
                    className="w-full sm:col-span-2 px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleAddCustomActivityLog}
                    className="px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Activity Note
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Clear all activity logs?')) {
                        const updated = { ...config, activityLogs: [] };
                        setConfig(updated);
                        saveStoredConfig(updated);
                        showToast('Activity logs cleared.');
                      }
                    }}
                    className="text-[11px] font-mono text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
