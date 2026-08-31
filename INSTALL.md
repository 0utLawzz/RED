# Install and run RED

RED is a browser audio cutter. You can use the live app, or run it on your machine.

**Live:** https://red-biominute.vercel.app

---

## What you need

- **Node.js 22** or newer ([nodejs.org](https://nodejs.org/))
- **npm** (comes with Node)
- Git
- A modern browser (Chrome, Edge, Firefox, or Safari)

Check versions:

```bash
node -v
npm -v
```

---

## Install

```bash
git clone https://github.com/0utLawzz/RED.git
cd RED
npm install
```

That downloads React, Vite, TanStack Start, lamejs, JSZip, and the rest.

---

## Run (development)

```bash
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:8080`).

### First use

1. Drop an MP3 (or WAV, M4A, OGG, AAC, FLAC) onto the page — or click **Browse files**.
2. Wait for the waveform. Long mixes take a few seconds; nothing is uploaded.
3. Click **Split on silence** or press **S** at the playhead to cut songs.
4. Drag the red handles to trim intro and outro.
5. Name each track in the list.
6. Download one song, or **Download ZIP** for the whole set.

**Try a demo mix** on the home screen if you do not have a file handy.

---

## Keyboard

| Key | Action |
|-----|--------|
| Space | Play / pause |
| S | Split at playhead |
| ← / → | Nudge 1 second (Shift = 5 seconds) |
| Home / End | Jump to crop start / end |
| Delete | Remove the selected split |

---

## Production build

```bash
npm run build
npm run typecheck
```

`npm run build` must finish with no errors before you deploy.

---

## Deploy

This repo is already linked to Vercel. A push to `main` deploys production:

```bash
git add -A
git commit -m "Your message"
git push origin main
```

Live URL: https://red-biominute.vercel.app

To deploy a fork yourself:

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. Framework: TanStack Start (auto-detected).
3. Build command: `npm run build` (already in `package.json`).
4. No environment variables required. Audio never leaves the browser.

---

## Troubleshooting

**`npm install` fails**  
Use Node 22+. Delete `node_modules` and `package-lock.json` only if you know you need a clean lockfile, then run `npm install` again.

**Blank page after `npm run dev`**  
Wait for Vite to finish compiling. Hard-refresh the tab. Check the terminal for a red error.

**File will not load**  
Use a real audio file (MP3/WAV/M4A/OGG/AAC/FLAC). DRM-protected or video-only files will fail.

**Export is slow**  
320 kbps MP3 on a long mix is CPU-heavy. Stay on the tab until the ZIP finishes. 192 kbps is the default.

**No sound**  
Unmute the app slider and the OS. Some browsers block autoplay until you click Play.

---

## Project layout (the parts that matter)

```
src/routes/index.tsx      Home: landing, loading, studio
src/components/studio.tsx Waveform editor and export
src/components/landing.tsx Drop zone
src/lib/audio/            Decode, silence split, MP3/WAV encode
src/store/editor.ts       Editor state
public/og.jpg             Share / GitHub preview card
```

Audio decode uses the Web Audio API. MP3 encode uses lamejs. ZIP uses JSZip. All of that runs in the browser.

Related desktop tool: [MP3-WinTool](https://github.com/0utLawzz/MP3-WinTool).
