import { toast } from "sonner";
import JSZip from "jszip";
import { engine } from "./engine";
import { computePeaks } from "./peaks";
import { detectSilence } from "./silence";
import { encodeMp3, encodeWav, sliceBuffer } from "./encode";
import { createDemoMix } from "./demo";
import { downloadBlob, sanitizeFilename } from "@/lib/utils";
import { getSegments, resetEditor, useEditor, type Bitrate, type ExportFormat } from "@/store/editor";
import { clamp } from "./time";

const ACCEPT = /\.(mp3|wav|m4a|aac|ogg|flac|mpeg|mp4)$/i;

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  return ACCEPT.test(file.name);
}

function defaultNames(count: number, stem?: string): string[] {
  const base = stem ? sanitizeFilename(stem.replace(/\.[^.]+$/, "")) : "Song";
  if (count <= 1) return [base || "Song 1"];
  return Array.from({ length: count }, (_, i) => `${base || "Song"} ${String(i + 1).padStart(2, "0")}`);
}

export async function loadFile(file: File) {
  if (!isAudioFile(file)) {
    useEditor.setState({ status: "error", error: "That file isn’t audio. Try an MP3, WAV, M4A, or OGG." });
    toast.error("Unsupported file type");
    return;
  }
  engine.pause();
  useEditor.setState({
    status: "loading",
    error: null,
    loadingLabel: "Decoding audio…",
    playing: false,
    fileName: file.name,
    fileSize: file.size,
  });
  try {
    await engine.resume();
    const ctx = engine.getContext();
    const data = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data.slice(0));
    engine.setBuffer(buffer);
    useEditor.setState({ loadingLabel: "Drawing waveform…" });
    await new Promise<void>((r) => setTimeout(r, 20));
    const peaks = computePeaks(buffer);
    const duration = buffer.duration;
    useEditor.setState({
      status: "ready",
      error: null,
      fileName: file.name,
      fileSize: file.size,
      duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      peaks,
      currentTime: 0,
      playing: false,
      cropStart: 0,
      cropEnd: duration,
      splits: [],
      names: defaultNames(1, file.name),
      selectedIndex: 0,
      zoom: 1,
      pan: 0,
    });
    if (duration > 45 * 60) {
      toast("Long recording", { description: "Encoding may take a minute on this device." });
    }
  } catch (err) {
    console.error(err);
    engine.clear();
    useEditor.setState({
      status: "error",
      error: "Couldn’t decode that file. Try MP3 or WAV.",
      peaks: null,
    });
    toast.error("Couldn’t read that audio file");
  }
}

export async function loadDemo() {
  engine.pause();
  useEditor.setState({
    status: "loading",
    error: null,
    loadingLabel: "Mixing a demo…",
    playing: false,
  });
  try {
    await engine.resume();
    const ctx = engine.getContext();
    const demo = createDemoMix(ctx);
    engine.setBuffer(demo.buffer);
    const peaks = computePeaks(demo.buffer);
    useEditor.setState({
      status: "ready",
      error: null,
      fileName: demo.fileName,
      fileSize: 0,
      duration: demo.buffer.duration,
      sampleRate: demo.buffer.sampleRate,
      channels: demo.buffer.numberOfChannels,
      peaks,
      currentTime: 0,
      playing: false,
      cropStart: 0,
      cropEnd: demo.buffer.duration,
      splits: demo.splits,
      names: demo.names,
      selectedIndex: 0,
      zoom: 1,
      pan: 0,
    });
    toast("Demo mix loaded", { description: "Four songs with silence between them." });
  } catch (err) {
    console.error(err);
    useEditor.setState({ status: "error", error: "Couldn’t build the demo mix." });
  }
}

export function closeFile() {
  engine.clear();
  resetEditor();
}

export async function togglePlay() {
  const s = useEditor.getState();
  if (s.status !== "ready" || !engine.buffer) return;
  await engine.resume();
  if (engine.isPlaying()) {
    engine.pause();
    useEditor.setState({ playing: false, currentTime: engine.getCurrentTime() });
    return;
  }
  let from = engine.getCurrentTime();
  if (from >= s.cropEnd - 0.05) from = s.cropStart;
  engine.onEnded = () => {
    useEditor.setState({ playing: false, currentTime: engine.getCurrentTime() });
  };
  engine.playRange(from, s.cropEnd);
  useEditor.setState({ playing: true });
}

export async function playSegment(index: number) {
  const segs = getSegments(useEditor.getState());
  const seg = segs[index];
  if (!seg || !engine.buffer) return;
  await engine.resume();
  engine.onEnded = () => {
    useEditor.setState({ playing: false, currentTime: seg.end });
  };
  engine.playRange(seg.start, seg.end);
  useEditor.setState({ playing: true, selectedIndex: index, currentTime: seg.start });
}

export function seekTo(time: number) {
  const s = useEditor.getState();
  const t = clamp(time, 0, s.duration);
  engine.seek(t);
  useEditor.setState({ currentTime: t });
}

export function setVolume(v: number) {
  const vol = clamp(v, 0, 1);
  engine.setVolume(useEditor.getState().muted ? 0 : vol);
  useEditor.setState({ volume: vol });
}

export function toggleMute() {
  const s = useEditor.getState();
  const muted = !s.muted;
  engine.setVolume(muted ? 0 : s.volume);
  useEditor.setState({ muted });
}

export function addSplit(time: number) {
  const s = useEditor.getState();
  const t = clamp(time, s.cropStart + 0.05, s.cropEnd - 0.05);
  if (s.splits.some((x) => Math.abs(x - t) < 0.08)) return;
  const splits = [...s.splits, t].sort((a, b) => a - b);
  const idx = splits.indexOf(t);
  const names = [...s.names];
  const left = names[idx] ?? `Song ${idx + 1}`;
  names.splice(idx + 1, 0, `${left} b`);
  if (!names[idx]) names[idx] = `Song ${idx + 1}`;
  useEditor.setState({ splits, names, selectedIndex: idx + 1 });
}

export function moveBoundary(index: number, time: number) {
  const s = useEditor.getState();
  const points = [s.cropStart, ...s.splits, s.cropEnd];
  const min = (points[index - 1] ?? 0) + 0.05;
  const max = (points[index + 1] ?? s.duration) - 0.05;
  const t = clamp(time, min, max);
  if (index === 0) {
    useEditor.setState({ cropStart: t });
    return;
  }
  if (index === points.length - 1) {
    useEditor.setState({ cropEnd: t });
    return;
  }
  const splits = [...s.splits];
  splits[index - 1] = t;
  useEditor.setState({ splits });
}

export function removeSplit(splitIndex: number) {
  const s = useEditor.getState();
  if (splitIndex < 0 || splitIndex >= s.splits.length) return;
  const splits = s.splits.filter((_, i) => i !== splitIndex);
  const names = [...s.names];
  names.splice(splitIndex + 1, 1);
  useEditor.setState({
    splits,
    names: names.length ? names : ["Song 1"],
    selectedIndex: Math.max(0, splitIndex),
  });
}

export function splitAtPlayhead() {
  const s = useEditor.getState();
  addSplit(s.currentTime);
}

export function applySilenceSplits() {
  if (!engine.buffer) return;
  const found = detectSilence(engine.buffer);
  const s = useEditor.getState();
  const interior = found.filter((t) => t > s.cropStart + 0.2 && t < s.cropEnd - 0.2);
  if (interior.length === 0) {
    toast("No silence found", { description: "Add splits by double-clicking the waveform." });
    return;
  }
  const count = interior.length + 1;
  useEditor.setState({
    splits: interior,
    names: defaultNames(count, s.fileName ?? "Song"),
    selectedIndex: 0,
  });
  toast(`Split into ${count} songs`);
}

export function renameSegment(index: number, name: string) {
  const names = [...useEditor.getState().names];
  names[index] = name;
  useEditor.setState({ names });
}

export function setZoom(zoom: number, anchorTime?: number) {
  const s = useEditor.getState();
  const z = clamp(zoom, 1, 48);
  const duration = s.duration;
  const span = duration / z;
  const maxStart = Math.max(0, duration - span);
  let start: number;
  if (anchorTime !== undefined && z > 1) {
    const { start: oldStart, end: oldEnd } = { start: s.pan * Math.max(0, duration - duration / s.zoom), end: 0 };
    void oldEnd;
    const oldSpan = duration / Math.max(1, s.zoom);
    const oldS = s.pan * Math.max(0, duration - oldSpan);
    const ratio = oldSpan <= 0 ? 0.5 : (anchorTime - oldS) / oldSpan;
    start = clamp(anchorTime - ratio * span, 0, maxStart);
  } else {
    start = s.pan * maxStart;
  }
  const pan = maxStart === 0 ? 0 : start / maxStart;
  useEditor.setState({ zoom: z, pan });
}

export function setPan(pan: number) {
  useEditor.setState({ pan: clamp(pan, 0, 1) });
}

export function setFormat(format: ExportFormat) {
  useEditor.setState({ format });
}

export function setBitrate(bitrate: Bitrate) {
  useEditor.setState({ bitrate });
}

export function setFadeMs(fadeMs: number) {
  useEditor.setState({ fadeMs: clamp(fadeMs, 0, 500) });
}

async function encodeSlice(start: number, end: number, onProgress?: (p: number) => void): Promise<Blob> {
  const s = useEditor.getState();
  if (!engine.buffer) throw new Error("No audio loaded");
  const ctx = engine.getContext();
  const sliced = sliceBuffer(engine.buffer, ctx, start, end, s.fadeMs);
  if (s.format === "wav") {
    onProgress?.(1);
    return encodeWav(sliced);
  }
  return encodeMp3(sliced, s.bitrate, onProgress);
}

function extFor(format: ExportFormat): string {
  return format === "wav" ? "wav" : "mp3";
}

export async function downloadSegment(index: number) {
  const s = useEditor.getState();
  const segs = getSegments(s);
  const seg = segs[index];
  if (!seg) return;
  useEditor.setState({ exporting: true, exportProgress: 0, exportLabel: `Encoding ${seg.name}…` });
  try {
    const blob = await encodeSlice(seg.start, seg.end, (p) => {
      useEditor.setState({ exportProgress: p });
    });
    downloadBlob(blob, `${sanitizeFilename(seg.name)}.${extFor(s.format)}`);
    toast("Downloaded", { description: seg.name });
  } catch (err) {
    console.error(err);
    toast.error("Export failed");
  } finally {
    useEditor.setState({ exporting: false, exportProgress: 0, exportLabel: "" });
  }
}

export async function downloadAll() {
  const s = useEditor.getState();
  const segs = getSegments(s);
  if (segs.length === 0) return;
  useEditor.setState({ exporting: true, exportProgress: 0, exportLabel: "Preparing…" });
  try {
    if (segs.length === 1) {
      await downloadSegment(0);
      return;
    }
    const zip = new JSZip();
    const ext = extFor(s.format);
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]!;
      useEditor.setState({
        exportLabel: `Encoding ${i + 1} of ${segs.length} · ${seg.name}`,
        exportProgress: i / segs.length,
      });
      const blob = await encodeSlice(seg.start, seg.end, (p) => {
        useEditor.setState({ exportProgress: (i + p) / segs.length });
      });
      const padded = String(i + 1).padStart(2, "0");
      zip.file(`${padded} ${sanitizeFilename(seg.name)}.${ext}`, blob);
    }
    useEditor.setState({ exportLabel: "Packing ZIP…", exportProgress: 0.97 });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const stem = sanitizeFilename((s.fileName ?? "red").replace(/\.[^.]+$/, ""));
    downloadBlob(zipBlob, `${stem}-songs.zip`);
    toast("ZIP ready", { description: `${segs.length} songs` });
  } catch (err) {
    console.error(err);
    toast.error("Export failed");
  } finally {
    useEditor.setState({ exporting: false, exportProgress: 0, exportLabel: "" });
  }
}
