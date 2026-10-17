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
} from 'lucide-react';
import {
  SiteConfig,
  getStoredConfig,
  saveStoredConfig,
  resetStoredConfig,
  setMediaItem,
  getMediaItem,
  removeMediaItem,
  getAdminPasscode,
  setAdminPasscode,
  adminSignOut,
  exportSiteConfigJSON,
  importSiteConfigJSON,
} from '../utils/siteStore';
import { fileToBase64, compressImageFile, setStoredPhoto, getStoredPhoto, removeStoredPhoto } from '../utils/photoStorage';
import { MusicTrack, VideoClipItem, PortfolioProject, UnfilteredThought, PORTFOLIO_PROJECTS, UNFILTERED_THOUGHTS } from '../data';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'photos' | 'shorts' | 'music' | 'projects' | 'thoughts' | 'labels' | 'security';

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('photos');
  const [config, setConfig] = useState<SiteConfig>(getStoredConfig());
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Core brand photos preview cache
  const [walkinMedia, setWalkinMedia] = useState<string | null>(null);
  const [heroPhoto, setHeroPhoto] = useState<string | null>(null);
  const [celebrityPhoto, setCelebrityPhoto] = useState<string | null>(null);
  const [techSetupPhoto, setTechSetupPhoto] = useState<string | null>(null);

  // Music testing preview state
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('Smork');
  const [newTrackGenre, setNewTrackGenre] = useState('Drill');
  const [newTrackTag, setNewTrackTag] = useState('Exclusive');
  const [newTrackAudioSrc, setNewTrackAudioSrc] = useState<string | null>(null);
  const [testingAudioId, setTestingAudioId] = useState<string | null>(null);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Passcode change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Load latest photos and config on open
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4000);
  };

  // 1. Core Brand Photo Upload Handler (Hero, Celebrity, Tech, Walk-In)
  const handleBrandPhotoUpload = async (key: string, file: File) => {
    setIsUploading(true);
    try {
      const base64 = file.type.startsWith('image/')
        ? await compressImageFile(file)
        : await fileToBase64(file);

      // Save to photo storage (IndexedDB + localStorage + Firestore media_items)
      setStoredPhoto(key, base64);

      if (key === 'hero_portrait') setHeroPhoto(base64);
      if (key === 'celebrity_bandana_photo') setCelebrityPhoto(base64);
      if (key === 'tech_setup') setTechSetupPhoto(base64);
      if (key === 'walkin_custom_media') {
        setWalkinMedia(base64);
        await setMediaItem('walkin_custom_media', base64, file.type);
      }

      // Update in config.brandPhotos as well
      const updatedConfig = {
        ...config,
        brandPhotos: {
          ...(config.brandPhotos || {}),
          [key]: base64,
        },
        ...(key === 'walkin_custom_media' ? { walkinPhoto: base64 } : {}),
      };
      setConfig(updatedConfig);
      saveStoredConfig(updatedConfig);

      showToast(`Photo updated and synced across all pages & devices!`);
    } catch {
      showToast('Error uploading photo. Please try another file.', 'error');
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
    try {
      const base64 = (isThumbnail || file.type.startsWith('image/'))
        ? await compressImageFile(file)
        : await fileToBase64(file);

      if (isThumbnail) {
        const updatedClips = config.videoClips.map((c) =>
          c.id === clipId ? { ...c, thumbnail: base64 } : c
        );
        const updated = { ...config, videoClips: updatedClips };
        setConfig(updated);
        saveStoredConfig(updated);
        showToast('Clip thumbnail updated and synced across site!');
      } else {
        await setMediaItem(`video_clip_${clipId}`, base64, file.type);
        const updatedClips = config.videoClips.map((c) =>
          c.id === clipId ? { ...c, videoSrc: base64 } : c
        );
        const updated = { ...config, videoClips: updatedClips };
        setConfig(updated);
        saveStoredConfig(updated);
        showToast('Clip 0:05 video uploaded and looping preview active!');
      }
    } catch {
      showToast('Error uploading media for video clip.', 'error');
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

  // 3. Music Track Handler
  const handleMusicFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      setNewTrackAudioSrc(base64);
      if (!newTrackTitle) {
        setNewTrackTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      showToast('Audio MP3 attached! Tap "Add to Playlist" below.');
    } catch {
      showToast('Failed to load audio file.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTrack = async () => {
    if (!newTrackTitle.trim()) {
      showToast('Please enter a track title.', 'error');
      return;
    }

    const newId = `track_${Date.now()}`;
    if (newTrackAudioSrc) {
      await setMediaItem(`audio_track_${newId}`, newTrackAudioSrc, 'audio/mp3');
    }

    const newTrack: MusicTrack = {
      id: newId,
      title: newTrackTitle.trim(),
      artist: newTrackArtist.trim() || 'Smork',
      genre: newTrackGenre.trim() || 'Official Drill',
      duration: '3:20',
      audioSrc: newTrackAudioSrc || undefined,
      tag: newTrackTag.trim() || 'Exclusive',
      energyVibe: 'High Energy Official Anthem',
    };

    const updated = {
      ...config,
      playlist: [newTrack, ...config.playlist],
    };
    setConfig(updated);
    saveStoredConfig(updated);

    setNewTrackTitle('');
    setNewTrackAudioSrc(null);
    showToast('Song added to Smoky Zone Official Selection!');
  };

  const handleDeleteTrack = (id: string) => {
    const updated = {
      ...config,
      playlist: config.playlist.filter((t) => t.id !== id),
    };
    setConfig(updated);
    saveStoredConfig(updated);
    removeMediaItem(`audio_track_${id}`);
    showToast('Track removed from playlist.');
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

  // 7. Change Passcode
  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = getAdminPasscode();
    if (currentPass.trim() !== stored.trim()) {
      showToast('Current passcode is incorrect.', 'error');
      return;
    }
    if (newPass.length < 4) {
      showToast('New passcode must be at least 4 characters.', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      showToast('New passcodes do not match.', 'error');
      return;
    }

    setAdminPasscode(newPass.trim());
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    showToast('Secret owner passcode updated successfully!');
  };

  if (!isOpen) return null;

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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white font-['Outfit',sans-serif] tracking-tight">
                  Smoky Zone Live Studio
                </h2>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Cloud Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct phone & laptop controls for photos, videos, music, projects, and text
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                adminSignOut();
                onClose();
              }}
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

        {/* Status Toast Banner */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-mono flex items-center justify-between transition-all ${
              statusMsg.type === 'error'
                ? 'bg-rose-900/80 text-rose-200 border-b border-rose-500/40'
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
            <FileText className="w-3.5 h-3.5" /> Headlines & WhatsApp
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
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: CORE BRAND PHOTOS & WALK-IN VISUAL */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Core Website Photos & Brand Visuals
                </h3>
                <p className="text-xs text-slate-400">
                  Select and upload high-resolution images or videos straight from your phone camera roll or laptop. Changes sync instantly across the site and appear to all visitors.
                </p>
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

                <button
                  onClick={() => setIsAddingShort(!isAddingShort)}
                  className="px-3.5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingShort ? 'Cancel' : 'Add New Short'}</span>
                </button>
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
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <label className="py-2 px-3 rounded-lg bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 border border-[#1E90FF]/40 text-[#1E90FF] text-[11px] font-semibold text-center cursor-pointer transition-colors block">
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

                      <label className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-semibold text-center cursor-pointer transition-colors block">
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
                        <span>Change Cover</span>
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

          {/* TAB 3: OFFICIAL PLAYLIST (AUDIO MP3) */}
          {activeTab === 'music' && (
            <div className="space-y-6">
              {/* Add New Track Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#1E90FF]" /> Add Song or MP3 from Phone / Laptop
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Track Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. On One Tonight / Eastside Anthem"
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

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Genre
                    </label>
                    <input
                      type="text"
                      placeholder="Drill / Hip-Hop / Eastern Drill"
                      value={newTrackGenre}
                      onChange={(e) => setNewTrackGenre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none"
                    />
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
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <label className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#1E90FF]/20 hover:bg-[#1E90FF]/30 border border-[#1E90FF]/40 text-[#1E90FF] text-xs font-semibold uppercase tracking-wider text-center cursor-pointer transition-colors block">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleMusicFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <span>{newTrackAudioSrc ? 'Audio File Attached' : 'Select MP3 from Device'}</span>
                  </label>

                  <button
                    onClick={handleAddTrack}
                    className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-[#1E90FF]/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Add to Playlist
                  </button>
                </div>
              </div>

              {/* Current Playlist Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Smoky Zone Official Selection ({config.playlist.length} Tracks)
                </h4>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {config.playlist.map((track, idx) => (
                    <div
                      key={track.id}
                      className="p-3 rounded-xl bg-[#0D182F] border border-white/5 flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-slate-400 w-5 flex-shrink-0">
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-white text-xs font-bold truncate">{track.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {track.artist} · <span className="text-[#1E90FF]">{track.genre}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline-block">
                          {track.tag}
                        </span>
                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          className="w-7 h-7 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-500/20 text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
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

          {/* TAB 6: TITLES, BIO, WHATSAPP & SOCIAL LINKS */}
          {activeTab === 'labels' && (
            <div className="space-y-5">
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

          {/* TAB 7: PASSCODE & CLOUD BACKUP */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Passcode update */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#1E90FF]" /> Change Owner Secret Passcode
                </h3>
                <p className="text-xs text-slate-300">
                  Default passcode is <code className="text-[#1E90FF] font-mono">smork2026</code>. You can set your private PIN to open this control panel on your phone or laptop.
                </p>

                <form onSubmit={handleChangePasscode} className="space-y-3 max-w-sm">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Current Passcode
                    </label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="smork2026"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      New Passcode
                    </label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="At least 4 characters"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Confirm New Passcode
                    </label>
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Confirm new passcode"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#050811] border border-white/10 text-white text-xs focus:border-[#1E90FF] focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 px-5 rounded-xl bg-[#1E90FF] hover:bg-[#1873cc] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow cursor-pointer"
                  >
                    Update Passcode
                  </button>
                </form>
              </div>

              {/* Cloud Sync Status & Backup */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D182F] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" /> Firebase Firestore Cloud Sync
                </h3>

                <div className="p-3.5 rounded-xl bg-[#050811] border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <p className="text-white text-xs font-bold font-mono">Cloud Database Active & Synchronized</p>
                      <p className="text-[10px] text-slate-400">All added media and text sync immediately across all phones and laptops</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    Real-Time Active
                  </span>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
