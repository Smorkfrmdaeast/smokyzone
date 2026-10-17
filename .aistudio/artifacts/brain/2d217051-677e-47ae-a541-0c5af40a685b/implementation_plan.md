# Smoky Zone Official Selection — 10-Track Catalog Integration

Integrate and auto-populate the official 10-track audio selection into Smork's **"Smoky Zone Official Selection"** player and Admin Studio with verified acoustic signatures, real file durations, Cloud Firestore persistence, zero-latency local caching, and single-source playback coordination.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following decisions during Phase 1 clarification:
> - **Lead Track (Slot 01)**: Gunna – *endless* (One of Wun, 02:11) set as the default starting track.
> - **Track Sequence**: Slots 02 through 10 maintain the user's attached order.
> - **Review Labels**: Track 01 and Track 08 will be tagged with review indicators: `"Put Work (Needs Review)"` and `"11:11 Instrumental (Needs Review)"`, allowing immediate editing via `/admin`.
> - **Cloud Storage & Sync**: Audio assets and track metadata are persisted to Cloud Firestore (`media_items` and `site_content`) with client-side IndexedDB caching so updates immediately reflect across devices worldwide.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades the audio engine in the "Celebrity Smork" and "Unfiltered" sections of Smoky Zone to play the 10 freshly identified tracks, featuring Gunna, Pop Smoke, ODUMODUBLVCK, Lil Baby, Fivio Foreign, Phyno, JeriQ, and Kay Flock.
- **Target Audience / Persona**: Visitors, clients, and fans of Smork exploring his cultural drill roots, hip-hop influences, and Nigerian street-hop authenticity.
- **Key Value**: Provides an authentic, real-time syncable 10-track experience with accurate durations, rich genre tagging, animated neon sound bars, full player controls (previous/next, seek, scrub, volume), and an audit log in `/admin`.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Visitor Landing**: Visitor arrives at the Celebrity Smork section. The audio player displays **01 / 10** with Gunna's *endless*, showing real-time animated equalizer bars in electric blue (`#1E90FF`).
2. **Track Switching**: Clicking any track in the tracklist instantly loads its audio, updates the duration display, shifts the highlighted active row, and resets the visualizer without page reload.
3. **Mutual Audio Pause**: When a visitor opens a cultural video short modal with sound, the music player automatically pauses to prevent audio overlap.
4. **Admin Management**: Smork can open the `/admin` portal (via floating lock or passcode), view all 10 tracks, edit titles/genres/artists, swap MP3 files, and see the recorded import event in the **Activity Log** tab.

### Visual Identity & Theme
- **Canvas**: Stark obsidian night (`#050811`).
- **Accent**: Electric cobalt glow (`#1E90FF`, `rgba(30, 144, 255, 0.25)`).
- **Typography**: Display headlines in `Outfit`, body copy in `Plus Jakarta Sans`, tabular durations and track indices in `tabular-nums font-mono`.
- **Zero-Pill Restraint**: Track genres and durations use quiet typographic separators (`·`), avoiding cluttered capsule badges.

---

## 3. Track Catalog Specification

| Slot | Title | Artist | Genre | Duration | Confidence | Review Tag |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **endless** | Gunna | Melodic Trap | 02:11 | High | Default |
| **02** | **Put Work** | Smork / Underground Artist | Afrobeats / Street-Hop | 02:53 | Medium | ⚠️ Needs Review |
| **03** | **Dior** | Pop Smoke | Brooklyn Drill | 02:52 | High | Confirmed |
| **04** | **Declan Rice** | ODUMODUBLVCK | Afro-Drill / Okporoko | 02:06 | High | Confirmed |
| **05** | **In A Minute** | Lil Baby | Melodic Trap | 03:26 | High | Confirmed |
| **06** | **Big Drip** | Fivio Foreign | Brooklyn Drill | 02:48 | High | Confirmed |
| **07** | **Do I** | Phyno | Igbo Rap / Afro-Fusion | 02:19 | High | Confirmed |
| **08** | **11:11** | JeriQ | Indigenous Drill | 02:00 | High | Confirmed |
| **09** | **11:11 (Instrumental / Session)** | JeriQ & Insane Chips | Trap Instrumental | 02:31 | Medium | ⚠️ Needs Review |
| **10** | **Shake It** | Kay Flock ft. Cardi B, Dougie B & Bory300 | Bronx Drill | 02:16 | High | Confirmed |

---

## 4. Key Product Decisions & Trade-Offs

- **Decision 1: Gunna "endless" as Slot 01 Default**
  - *Chosen Approach*: Put Gunna's *endless* in Slot 01, followed by Slots 02–10 in attached order.
  - *Why*: Satisfies user constraint to lead with Gunna as default track while preserving the user's sequential listening experience.
- **Decision 2: Hybrid Storage (IndexedDB + Firestore Sync + Public Fallback)**
  - *Chosen Approach*: Store encoded audio data items in IndexedDB locally and sync document records via Cloud Firestore (`media_items` and `site_content/global_v1`).
  - *Why*: Provides sub-50ms instant audio playback on mobile and laptop with offline tolerance, while keeping changes live across devices.
- **Decision 3: Single Media Authority**
  - *Chosen Approach*: Broadcast custom window events (`smokyzone_media_play`, `smokyzone_video_play`) to pause background music whenever video preview modals open.
  - *Why*: Eliminates competing sound sources without fragile global state coupling.

---

## 5. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface Views                            │
│   ┌───────────────────────────┐    ┌─────────────────────────────────┐ │
│   │ AudioPlayer Component     │    │ AdminPortalModal (Music & Logs) │ │
│   │ • 10-Track Interactive UI │    │ • Metadata & File Editor        │ │
│   │ • Real-time Soundbars     │    │ • Real-time Activity Tab Log    │ │
│   └─────────────┬─────────────┘    └────────────────┬────────────────┘ │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Site Store & Sync Engine                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ siteStore.ts                                                   │   │
│   │ • CELEBRITY_PLAYLIST State (10 items)                          │   │
│   │ • Activity Log State: "Imported 10-Track Official Selection"   │   │
│   │ • Single Media Source Playback Coordinator                     │   │
│   └─────────────┬───────────────────────────────────┬──────────────┘   │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  ▼                                   ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│      Client IndexedDB Cache     │   │     Cloud Firestore Database     │
│   • Instant zero-latency audio  │   │   • site_content/global_v1       │
│   • Persistent local storage    │   │   • media_items/{track_key}      │
└─────────────────────────────────┘   └──────────────────────────────────┘
```

### State & Component Changes
1. **`src/data.ts`**: Update default `CELEBRITY_PLAYLIST` with the exact 10 identified tracks, accurate durations, genres, artists, and default audio references.
2. **`src/utils/siteStore.ts`**:
   - Extend `SiteConfig` to support an Activity Log entry documenting the catalog import.
   - Configure audio caching for track keys `track_audio_1` through `track_audio_10`.
   - Update `getDefaultConfig()` with the new 10-track selection.
3. **`src/components/AudioPlayer.tsx`**:
   - Verify dynamic track count (10 tracks), responsive mobile layout, previous/next bounds, time seeking, volume slider, and audio playback error handling with graceful fallback.
4. **`src/components/AdminPortalModal.tsx`**:
   - Ensure all 10 tracks are cleanly editable in the "Music Tracks" tab.
   - Add an "Activity Tab" or log viewer confirming the catalog import.

---

## 6. Execution Steps (Post-Approval)

1. **Update Data Specification**: Update `CELEBRITY_PLAYLIST` in `src/data.ts` with all 10 tracks, durations, genres, and artists.
2. **Configure Storage & Activity Log**: Update `src/utils/siteStore.ts` to support activity logs and real-time syncing for all 10 tracks.
3. **Verify Audio Player & Admin Portal**: Check `AudioPlayer.tsx` and `AdminPortalModal.tsx` for tracklist rendering, time formatting, and log viewing.
4. **Compile & Lint Verification**: Run `compile_applet` and `lint_applet` to verify clean compilation.
