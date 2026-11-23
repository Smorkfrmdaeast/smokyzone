# SMOKY ZONE — The Official Digital Home of SMORK

> One Mind. Different Worlds. One Authentic Journey.  
> Official Web Portal of Ifeanyi Emmanuel Nnamani (Smork)

Smoky Zone is an interactive portfolio, cultural digital stage, and creative engineering hub built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Cloud Firestore**. It showcases tech services (full-stack web development, phone & hardware flashing, virtual assistance), Nigerian drill culture & lifestyle shorts, portfolio projects, and a studio-grade continuous audio player.

---

## ⚡ Core Features

- **Organic & Grounded Visual Design**: Clean typography, dark navy & electric blue palette, zero-pill discipline, authentic Eastern Nigerian and drill culture heritage.
- **Continuous 11-Track Audio Player**:
  - Seamless auto-advance across all 11 curated tracks with zero synthetic delays or hypnotic frequencies.
  - Active track title & artist displayed directly beneath the 12-bar real-time audio visualizer.
  - Background playback, lock-screen widget, and system notification controls via the **MediaSession API**.
  - Relaxed floating media player pill with quick play/pause/skip and expand toggle.
- **Cloud Firestore & Firebase Storage Sync**:
  - Site settings and playlist metadata are saved to the `site_content/global_v1` Firestore document.
  - Uploaded audio, images, and videos are stored in Firebase Storage; IndexedDB provides local caching.
  - Firestore and Storage security rules restrict cloud writes to the verified owner account.
- **Discreet Owner Studio (Admin Portal)**:
  - 100% hidden from public visitors.
  - Unlocked via secret shortcut (`Shift + S` / `Ctrl + Shift + A`), triple-clicking the footer copyright branding, or navigating to `#admin`.
  - Full management of playlist, brand photos, short video clips, portfolio projects, headlines, and WhatsApp contact details.
- **Official GitHub Sync**:
  - Export guidance and one-click commands to link and push this codebase to your official GitHub repository (`Smorkfrmdaeast/smokyzone`).

---

## 🚀 GitHub Repository Sync & Setup

To establish this project as your official GitHub repository:

```bash
# 1. Initialize git and stage all files
git init
git add .
git commit -m "feat: official Smoky Zone release with full persistent media and audio player"

# 2. Rename branch to main and link to your GitHub repo
git branch -M main
git remote add origin https://github.com/Smorkfrmdaeast/smokyzone.git

# 3. Push to GitHub
git push -u origin main
```

Or run the automated helper script:
```bash
bash scripts/github-sync.sh https://github.com/nuelsbussiness/smoky-zone.git
```

---

## 🌐 Deploy to Vercel

This repository is pre-configured with `vercel.json` for immediate production hosting on Vercel:

### Option 1: 1-Click via GitHub
1. Push this repository to your GitHub account (see above).
2. Visit [vercel.com/new](https://vercel.com/new).
3. Select your `smoky-zone` repository.
4. Framework is automatically detected as **Vite**.
5. Click **Deploy**.

### Option 2: Deploy with Vercel CLI
```bash
# Preview deployment
npx vercel

# Production release
npx vercel --prod
```

All uploaded media, videos, authentic portraits, audio tracks, and client-side single-page routing (`/admin`, `#admin`, etc.) work out of the box with zero additional configuration needed.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Database**: Google Cloud Firestore (`ai-studio-smokyzone-d5b406ce-4d73-4af4-b06f-7fc6e2d05b4a`)
- **Audio & Media**: Web Audio API `AudioContext` & `AnalyserNode`, HTML5 Audio, `navigator.mediaSession`
- **Client Cache**: IndexedDB + LocalStorage

---

## 💻 Development

```bash
npm install
npm run dev
```

The Vite development server runs on `http://localhost:3000`.

To verify compilation:
```bash
npm run build
```

\n## 🎵 Playlist & Audio Persistence\n\nThe admin portal publishes playlist metadata to Cloud Firestore. Audio files are uploaded to Firebase Storage and the playlist stores their download URLs. The Vercel site remains a static Vite deployment; it does not run an Express file-writing API and does not modify its own deployed source files.\n