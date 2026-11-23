# Smoky Zone — Cloud playlist sync review

## What changed in this review copy

- Removed the unauthenticated `/api/sync-playlist-code` Express endpoint. It wrote uploaded data directly into source files and was not compatible with the static Vite deployment on Vercel.
- Removed `server.ts` from this review copy and changed local development/start scripts to use Vite directly.
- Replaced the browser-to-Express source writer with an owner-authenticated Firestore save (`site_content/global_v1`).
- Kept audio uploads on the existing Firebase Storage path (`audio/tracks/...`). The existing Firebase Storage upload helper continues to enforce the signed-in owner session and use the configured Storage rules.
- Updated admin portal messages so they no longer claim that saving a playlist rewrites `src/data.ts` or `/music/`.
- Updated README documentation and the GitHub repository reference.

## Security and deployment boundaries

- Firestore and Storage rules were not changed or deployed.
- Firebase configuration was not changed.
- No GitHub `main` branch changes were made.
- No Vercel deployment was made.
- The ZIP archive does not include GitHub-only `.aistudio/` workspace files. Merge its project files into the review branch; preserve those existing GitHub files.

## Verification performed

- ZIP archive integrity passed before editing.
- Modified TypeScript files passed TypeScript transpilation syntax checks.
- `package.json` and `vercel.json` parsed as valid JSON.
- No remaining source references to `/api/sync-playlist-code` or `syncPlaylistToCodebase` were found.
- A full `tsc --noEmit` / Vite build could not be completed because dependencies are not installed in this environment and the npm package cache is unavailable offline. Install dependencies in the review branch and run `npm run build` before merging or deploying.

## Required tests before merge/deployment

1. Sign in with the verified owner Google account.
2. Confirm Firestore can read and write `site_content/global_v1`.
3. Upload a small MP3 and confirm it appears in Firebase Storage under `audio/tracks/`.
4. Save/reorder/edit/delete a playlist track and confirm the public player updates on a second browser/device.
5. Sign out and confirm unauthenticated visitors cannot upload, edit, or delete cloud media.
6. Only after those pass, review Firebase rules and decide whether any rule deployment is needed.
