# Smoky Zone Live Site Control Studio & Real-Time Content Management

Empower Ifeanyi Emmanuel Nnamani (SMORK) with complete, immediate control over his official digital home—allowing him to upload and change any photo, video clip, audio track, project showcase, and headline text directly from his smartphone or laptop, with changes appearing instantly for all visitors worldwide.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed based on your direct preferences:
> - **Access Point**: A sleek floating lock button pinned on mobile and laptop with a fast passcode modal (`smork2026` default, changeable by you anytime).
> - **Global Persistence**: Dual-layer storage combining instant browser IndexedDB/LocalStorage caching with Cloud Database sync so every visitor and fan across the globe sees your latest photos, videos, and music updates immediately.
> - **Scope of Control**: 100% of the site's media and copy—Hero portrait & bio, Smork Unfiltered Walk-In visual, 5-second Cultural Shorts (drill, eastern, nightlife, studio), Smoky Zone Official Selection MP3 playlist, and Tech Portfolio showcases.

- **Confirmed Decision 1**: Discreet floating lock button (`fixed bottom-6 right-6` on mobile, plus subtle top-bar lock toggle) that opens a quick passcode gate without disrupting visitors' browsing experience.
- **Confirmed Decision 2**: Multi-category media management covering photos (`image/*`), short video clips (`video/*`), music tracks (`audio/mp3`, `audio/wav`), and live text labels.
- **Recommended Default**: Automatic client-side image/video compression and Base64/Blob streaming to guarantee lightning-fast uploads even on standard mobile cellular connections in Nigeria.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms Smoky Zone from a static showcase into a dynamic, self-hosted Content Management Studio. Smork can pull out his phone at an event, concert, or repair bench, tap the lock button, enter his passcode, and instantly upload photos from his camera roll, post new 5-second drill/nightlife video previews, add hot music tracks to his official playlist, or update project case studies.
- **Target Audience & Context**: 
  - **Smork (Site Owner / Admin)**: One-handed mobile phone management on Android/iOS, as well as laptop workstation browser access.
  - **Visitors & Fans**: Experience a living, authentic platform that always reflects Smork's latest work, appearances, and tracks without lag or broken links.
- **Key Value**: No domain setup or coding required to keep the official site fresh. Immediate broadcast power right from today.

---

### 2. User Experience & Visual Design

#### Key User Flows

```
[ Visitor / Fan View ] ──────────────────────────────────────────┐
 │                                                              │
 ├─ Explores Hero, Services, Cultural Shorts, Music, Portfolio  │
 └─ Instant reactive updates as new media is published          │
                                                                │
[ Smork (Site Owner) Mobile / Laptop Flow ]                     │
 ┌──────────────────────────────────────────────────────────────┘
 │
 ├── 1. Tap Floating Lock Button (bottom-right on phone or nav bar)
 ├── 2. Enter Passcode (Quick numeric/text input with 'Remember Me')
 ├── 3. Open Admin Control Studio (Full-screen mobile sheet / desktop modal)
 │        ├── Tab 1: Identity & Walk-In (Hero photo, bio, walk-in visual)
 │        ├── Tab 2: 5s Cultural Shorts (Sha EK drill, Nanni Omologo, Enugu nightlife, Studio)
 │        ├── Tab 3: Official Music Playlist (Upload MP3s, song titles, artists, reorder)
 │        ├── Tab 4: Portfolio & Repairs (Phone flashing, web dev screenshots)
 │        ├── Tab 5: Site Copy & Quotes (Celebrity quotes, tags, WhatsApp number)
 │        └── Tab 6: Security & Backup (Change passcode, export site backup JSON)
 └── 4. Tap "Save & Publish" ──> Immediate live reflection across the entire website
```

#### Visual Identity & Theme
- **Aesthetic Direction**: Authentic, nocturnal electric atmosphere fitting Smoky Zone's East Nigerian drill & tech culture. Deep obsidian canvas (`#050811`), dark navy structural cards (`#0F1D38`), electric cobalt blue accents (`#1E90FF`), and crisp typography.
- **Mobile Ergonomics**:
  - Touch targets minimum $44 \times 44\text{px}$ for all buttons and upload triggers.
  - Natural thumb-zone bottom navigation and floating quick-action trigger.
  - Mobile file pickers that seamlessly open the native device camera, photo gallery, or file manager.
- **Interactive Feedback & Upload States**:
  - Visual image and video preview cards showing instantaneous thumbnails before committing.
  - Inline progress bars with live audio playback testing directly in the admin panel.
  - Toast confirmation notifications ("Photo updated successfully", "New drill short published").

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Floating Lock Trigger vs Hidden Admin Route**
  - *Chosen Approach*: Floating lock icon with smooth modal unlock.
  - *Why*: Smork can instantly edit any section while viewing the actual page on his smartphone without remembering complex subpaths or leaving his live site.
  - *Alternatives Considered*: Hidden `/admin` route only (less convenient on mobile where typing URLs is cumbersome).

- **Decision 2: Dual-Layer Storage (IndexedDB + Cloud Sync)**
  - *Chosen Approach*: Reactive local IndexedDB storage coupled with Cloud Database synchronization.
  - *Why*: Uploads are instant, never hang on slow mobile networks, work reliably in preview, and persist permanently for every visitor.
  - *Alternatives Considered*: Pure local storage (would only save on Smork's single device, not visible to visitors).

- **Decision 3: Media Handling (Videos & Audio)**
  - *Chosen Approach*: Support both direct file uploads (MP4/WebM/MP3) and external streaming links/embeds with an automated 5-second canvas loop engine as a fallback for rich preview cards.
  - *Why*: Allows Smork to drop raw mobile video clips directly from his phone, while keeping payload sizes fast and responsive.

---

### 4. Technical Architecture & Data Strategy

#### System & Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SMOKY ZONE APP                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────┐             ┌────────────────────────────────┐  │
│  │   Floating Lock CTA   │ ──────────> │      Admin Passcode Modal      │  │
│  │  (Fixed bottom-right) │             │    (Fast keypad / password)    │  │
│  └───────────────────────┘             └───────────────┬────────────────┘  │
│                                                        │                    │
│                                                        ▼ Verified           │
│                                        ┌────────────────────────────────┐  │
│                                        │   Admin Control Studio Modal   │  │
│                                        ├────────────────────────────────┤  │
│                                        │ • Identity & Walk-in Visual    │  │
│                                        │ • Cultural 5s Video Clips      │  │
│                                        │ • Music Playlist & MP3 Audio   │  │
│                                        │ • Portfolio & Tech Showcases   │  │
│                                        │ • Quotes, Bio & Social Links   │  │
│                                        │ • Passcode & Backup Manager    │  │
│                                        └───────────────┬────────────────┘  │
│                                                        │                    │
│                                                        ▼ Mutations          │
│                      ┌──────────────────────────────────────────────────┐   │
│                      │              siteStore.ts (State Bus)            │   │
│                      └──────────────┬────────────────────┬──────────────┘   │
│                                     │                    │                  │
│                     ┌───────────────▼──────────┐ ┌───────▼──────────────┐   │
│                     │  IndexedDB Media Store   │ │  Cloud Database Sync │   │
│                     │  (Photos, Videos, MP3s)  │ │  (Public Live Feed)  │   │
│                     └───────────────┬──────────┘ └───────┬──────────────┘   │
│                                     │                    │                  │
│                                     ▼                    ▼                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Reactive UI Consumers                         │  │
│  ├────────────────────┬────────────────────┬─────────────────────────────┤  │
│  │ UnfilteredShowcase │ ShortVideoCard (5s)│ AudioPlayer (Official Select)│
│  │ (Walk-in Portrait) │ (Drill/East/Live)  │ (10+ Curated Tracks)        │  │
│  └────────────────────┴────────────────────┴─────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### State & Data Schema
- **`SiteConfig`**:
  - `walkinPhoto`: Base64/URL string of the full-bleed walk-in visual
  - `videoClips`: Array of `VideoClipItem` with `id`, `title`, `subtitle`, `category`, `videoSrc`, `thumbnail`, `tag`, `views`, `artistOrTopic`
  - `playlist`: Array of `MusicTrack` with `id`, `title`, `artist`, `audioSrc`, `genre`, `tag`, `energyVibe`
  - `projectPhotos`: Record mapping project IDs (`phone_flashing`, `prestige_academy`, etc.) to custom uploaded screenshots
  - `labels`: Hero title, subtitle, celebrity badge, celebrity quote, walk-in tagline, contact details
- **`PasscodeAuth`**:
  - `passcode`: Default `smork2026`, customizable in Admin Studio
  - `sessionToken`: Auto-login memory for Smork's personal phone and laptop

#### Verification Plan
1. **Security & Passcode Verification**: Verify unlock modal accepts `smork2026`, rejects invalid passcodes, and supports updating to a new custom passcode.
2. **Mobile Photo Upload**: Test uploading an image from phone/laptop camera or storage to replace Walk-In portrait and Project screenshots. Verify immediate live replacement.
3. **Short Video Loop Upload**: Test uploading video clips for the 4 cultural cards; verify 0:05 muted loop playback and modal unmuted full player.
4. **Music MP3 Upload & Playback**: Test adding/replacing MP3 audio in the Smoky Zone Official Selection player; verify waveform visualizer, play/pause, next/prev, and volume.
5. **Cross-Device Reactivity**: Ensure public visitors see the updated images and media seamlessly.
