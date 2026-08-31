<div align="center">

# RED
### Audio cutter — OutLawZ Edition

[![Live](https://img.shields.io/badge/Live-red--biominute.vercel.app-C44536?style=flat)](https://red-biominute.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)

*Cut long MP3 mixes into named songs in the browser. Split, trim, and download — nothing leaves this device.*

[Open the app](https://red-biominute.vercel.app) · [Install & run](INSTALL.md)

<br />

<img src="public/og.jpg" alt="RED — Cut long mixes into songs" width="800" />

</div>

---

## Features

- **Drop an MP3** (or WAV, M4A, OGG, AAC, FLAC) and see a waveform
- **Split on silence** to find the gaps between songs automatically
- **Click the playhead** or press `S` to cut at the current time
- **Trim intro and outro** with the red crop handles
- **Name each track**, preview it, then download as MP3 or WAV
- **ZIP the whole set** in one click
- **On-device encoding** with lamejs — audio never uploads

## Quick start

```bash
git clone https://github.com/0utLawzz/RED.git
cd RED
npm install
npm run dev
```

Open the URL Vite prints, drop a mix, split it, download the songs.

Full steps, keyboard map, build, deploy, and troubleshooting: **[INSTALL.md](INSTALL.md)**.

## Keyboard

| Key | Action |
|-----|--------|
| Space | Play / pause |
| S | Split at playhead |
| ← / → | Nudge 1s (Shift = 5s) |
| Home / End | Jump to crop start / end |
| Delete | Remove the selected split |

## How it works

Decoding uses the Web Audio API. Peaks are downsampled for the waveform. Silence detection looks for quiet stretches between songs. Export encodes each slice to MP3 (128 / 192 / 320 kbps) or WAV and can zip the batch with JSZip.

Related desktop tool: [MP3-WinTool](https://github.com/0utLawzz/MP3-WinTool).

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**Made by OutLawZ**

</div>
