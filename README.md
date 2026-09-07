<div align="center">

# RED
### Audio cutter — OutLawZ Edition

[![Live](https://img.shields.io/badge/Live-red--biominute.vercel.app-C44536?style=flat)](https://red-biominute.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vitejs.dev/)
[![Status](https://img.shields.io/badge/Status-Active-success)]()

*Cut long MP3 mixes into named songs in the browser. Split, trim, and download — nothing leaves this device.*

[Open the app](https://red-biominute.vercel.app) · [Install & run](INSTALL.md)

<br />

<img src="public/og.jpg" alt="RED — Cut long mixes into songs" width="800" />

</div>

---

## Overview

RED is a fully client-side audio cutter. Drop a long mix, detect silence between tracks, manually refine splits, trim intro/outro, name each song, and export individual files or a ZIP. Decoding, silence detection, waveform rendering, and MP3/WAV encoding all run in the browser (Web Audio API + lamejs + JSZip). No audio is uploaded.

---

## Features

| Feature | Description |
|---------|-------------|
| Drop zone | MP3, WAV, M4A, OGG, AAC, FLAC |
| Waveform | Interactive peaks with playhead |
| Split on silence | Automatic gap detection between songs |
| Manual split | Click playhead or press `S` |
| Crop handles | Trim intro and outro |
| Track naming | Rename each slice before export |
| Export | MP3 (128 / 192 / 320 kbps) or WAV |
| Batch ZIP | Download the full set in one click |
| Privacy | All processing stays on-device |

---

## Quick start

```bash
git clone https://github.com/0utLawzz/RED.git
cd RED
npm install
npm run dev
```

Open the URL printed by Vite, drop a mix, split it, download the songs.

Full steps, keyboard map, build, deploy, and troubleshooting: **[INSTALL.md](INSTALL.md)**.

---

## Keyboard

| Key | Action |
|-----|--------|
| Space | Play / pause |
| S | Split at playhead |
| ← / → | Nudge 1s (Shift = 5s) |
| Home / End | Jump to crop start / end |
| Delete | Remove the selected split |

---

## How it works

| Stage | Technology |
|-------|------------|
| Decode | Web Audio API |
| Waveform | Downsampled peaks |
| Silence detection | Quiet-stretch analysis between songs |
| Encode | lamejs (MP3) / native WAV |
| Batch | JSZip |

Related desktop tool: [MP3-WinTool](https://github.com/0utLawzz/MP3-WinTool).

---

## Project structure (core)

```text
src/routes/index.tsx       Landing → loading → studio
src/components/studio.tsx  Waveform editor + export
src/components/landing.tsx Drop zone
src/components/waveform.tsx Peak rendering
src/lib/audio/             Decode, silence, encode, time helpers
public/og.jpg              Share / GitHub preview card
```

---

## Tech stack

- React 19 + TypeScript + Vite 8
- TanStack Start / Router
- Tailwind CSS 4 + Radix UI
- lamejs, JSZip, Web Audio API
- Deployed on Vercel

---

## Contributing & Security

- See [CONTRIBUTING.md](CONTRIBUTING.md)
- Security reports: [SECURITY.md](SECURITY.md)
- Code of Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**Made by OutLawZ**

</div>
