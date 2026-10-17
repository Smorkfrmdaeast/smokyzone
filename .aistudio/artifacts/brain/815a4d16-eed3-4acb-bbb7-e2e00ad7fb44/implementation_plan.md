# Implementation Plan — Smoky Zone Enhancements & Private Admin Portal

Transform and refine **Smoky Zone** (Smork's official personal website) to incorporate authentic media, dedicated music curation, looping short video previews, and a private, mobile-optimized `/admin` portal for instant phone control.

---

## 1. SMORK UNFILTERED Walk-In Visual & Atmosphere
- **Face Visibility & Framing**:
  - Update the walk-in visual image in `src/components/UnfilteredShowcase.tsx` to strictly use `object-cover` and `object-[center_top]`.
  - Remove all dark overlays and vignettes that obscure the upper half / face area, ensuring Smork's face and eyes remain unobstructed and razor sharp.
- **Tag Cleanup**:
  - Remove the `"Live Stage Crowd"` badge completely.
  - Keep a streamlined, non-intrusive status pill/indicator for `"Primary Walk-In Visual"`.
- **Bottom-Docked Low-Profile Audio Bar**:
  - Restructure the walk-in audio control bar: dock it directly to the bottom border (`bottom-0 inset-x-0`), slimmed down to `py-2 px-4` with translucent glassmorphism (`bg-[#050811]/80 backdrop-blur-md border-t border-white/10`).
  - Keep one-touch play/pause, live equalizer animation, track title (`Gunna — on one tonight`), and volume/mute toggle without intruding into the portrait view.

---

## 2. Music Player — "Smoky Zone Official Selection" (10 Tracks)
- **Curation & Title**:
  - Update playlist header to **"Smoky Zone Official Selection"**.
  - Update track counter dynamically to `10 tracks`.
  - Set Track 01 (`On One Tonight, Gunna`) as default active track on load.
- **Exact 10-Track Roster**:
  1. `01` **On One Tonight** — Gunna *(Melodic Trap)* — default track with active audio
  2. `02` **Dior** — Pop Smoke *(Brooklyn Drill)*
  3. `03` **Shake It** — Kay Flock x Dougie B *(Bronx Drill)*
  4. `04` **11:11** — Jeriq *(Eastern Drill)*
  5. `05` **Do I Remix** — Phyno ft Burna Boy *(Afrobeats)*
  6. `06` **Doja Cat** — Central Cee *(UK Drill)*
  7. `07` **Big Drip** — Fivio Foreign *(Brooklyn Drill)*
  8. `08` **Declan Rice** — Odumodublvck *(Nigerian Rap/Drill)*
  9. `09` **In A Minute** — Lil Baby *(Trap)*
  10. `10` **Fukumean** — Gunna *(Melodic Trap)*
- **Player Engine & Audio Management**:
  - Retain full functionality: Play/Pause, Next/Previous, Volume slider & mute toggle, Web Audio reactive FFT frequency spectrum visualizer, track progress bar, and highlighted active playlist item.
  - Implement dynamic audio source resolving: stream local audio (`gunna_on_one_tonight.mp3`), user-uploaded MP3s from Admin, and fallback rhythmic drill/trap 808 synthesizer so every single track is playable inside the browser.

---

## 3. Short Video Previews & Cultural Clips (5-Second Looping Previews)
- **Looping 5-Second Video Cards**:
  - Upgrade `VIDEO_PREVIEW_CLIPS` and card elements from static image posters to 5-second muted, looping HTML5 video previews that autoplay on scroll/view (`muted`, `loop`, `playsInline`, `autoPlay`).
  - Standardize all duration badges strictly to `0:05`.
- **Dedicated Cultural Content**:
  1. **Bronx Drill short**: *Sha EK singing* — high-energy drill cadence and raw stage energy.
  2. **Eastern Nigeria Upcoming Artist Spotlight**: *Nanni Omologo singing* — indigenous vocal cadence, Eastern youth talent.
  3. **Live Street Party & Concert**: *Enugu street nightlife crowd* — electric street party atmosphere, night lights, community hype.
  4. **Studio Vibes & Late-Night Club Flow**: *Rear-camera studio recording* — behind-the-scenes recording booth, flashing equipment, glowing DAW screens.
- **Interactive Fullscreen Player**:
  - Tapping any card opens `CelebrityVideoModal` in full immersion mode with unmuted high-definition audio, playback scrubber, loop toggle, and clip switching.

---

## 4. Celebrity Smork Card Text Updates
- In `src/App.tsx` (Celebrity Smork section), update the badge text:
  - Change `"Bronx Drill Analyst"` to **`"Drill Music"`**.

---

## 5. Project Portfolio Screenshots & Media Verification
- Ensure all uploaded project photos are mapped to their respective portfolio project cards:
  - **App Architecture & System Analysis**: `app_architecture.png`
  - **Digital Workspace & Remote Operations Lab**: `workspace_flashing.jpg`
  - **Smartphone Firmware Flashing & Diagnostics Suite**: `phone_repair_diag.jpg`
  - **Omnichannel Digital Strategy & Social Campaigns**: `marketing_strategy.jpg`
  - **Interactive 3D / AR Landmark App**: `interactive_ar.jpg`
  - **Prestige Academy Portal**: `prestige_academy_screenshot.svg`
- Ensure zero broken image states and responsive zoom modals.

---

## 6. Private Mobile Owner Admin Portal (`/admin`)
- **Routing & Mobile Navigation**:
  - Support direct access via URL hash `#admin` or `/admin` route, as well as a discreet owner access icon in the website footer.
  - Clean passcode login modal/screen (default passcode configurable, e.g., `smork2026`, with instant biometric/session remember toggle on mobile).
- **Owner Control Capabilities (from Phone or Desktop)**:
  - **Photo & Video Management**:
    - Change/upload the SMORK UNFILTERED walk-in photo.
    - Change/upload any of the 4 cultural short video clips.
    - Replace/update portfolio project screenshots.
  - **Music Playlist Management**:
    - Upload custom MP3 audio files for any of the 10 tracks.
    - Edit song titles, artists, genre tags, and track ordering.
    - Add new tracks or remove tracks with live counter updates.
  - **Live Text & Label Editing**:
    - Quick-edit text labels (e.g. quotes, tags, bio bullet points).
- **Live Persistence Engine**:
  - Store uploaded media and customized configuration in persistent browser database (`IndexedDB` + `localStorage` pipeline) with instant broadcast to the public UI.
  - Include an instant "Export Backup" and "Reset to Factory Defaults" utility so the site can be managed and restored seamlessly on any mobile browser.

---

## 7. Verification & Build Integrity
1. Compile with `compile_applet` to ensure TypeScript compliance.
2. Run `lint_applet` (`tsc --noEmit`) to verify 0 errors.
3. Test dev server endpoints with curl and ensure smooth responsive performance on mobile and desktop viewports.
