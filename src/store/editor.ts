import { create } from "zustand";

export type Bitrate = 128 | 192 | 320;
export type ExportFormat = "mp3" | "wav";
export type Status = "idle" | "loading" | "ready" | "error";

export type Segment = {
  id: string;
  name: string;
  start: number;
  end: number;
};

export type EditorState = {
  status: Status;
  error: string | null;
  loadingLabel: string;
  fileName: string | null;
  fileSize: number;
  duration: number;
  sampleRate: number;
  channels: number;
  peaks: Float32Array | null;
  currentTime: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  cropStart: number;
  cropEnd: number;
  splits: number[];
  names: string[];
  selectedIndex: number | null;
  zoom: number;
  pan: number;
  format: ExportFormat;
  bitrate: Bitrate;
  fadeMs: number;
  exporting: boolean;
  exportProgress: number;
  exportLabel: string;
};

const initial: EditorState = {
  status: "idle",
  error: null,
  loadingLabel: "Reading audio…",
  fileName: null,
  fileSize: 0,
  duration: 0,
  sampleRate: 0,
  channels: 0,
  peaks: null,
  currentTime: 0,
  playing: false,
  volume: 0.9,
  muted: false,
  cropStart: 0,
  cropEnd: 0,
  splits: [],
  names: ["Song 1"],
  selectedIndex: 0,
  zoom: 1,
  pan: 0,
  format: "mp3",
  bitrate: 192,
  fadeMs: 20,
  exporting: false,
  exportProgress: 0,
  exportLabel: "",
};

export const useEditor = create<EditorState>(() => ({ ...initial }));

export function resetEditor() {
  useEditor.setState({ ...initial });
}

export function getSegments(s: Pick<EditorState, "cropStart" | "cropEnd" | "splits" | "names">): Segment[] {
  const points = [s.cropStart, ...s.splits, s.cropEnd];
  const segs: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!;
    const end = points[i + 1]!;
    if (end - start < 0.01) continue;
    segs.push({
      id: `seg-${i}`,
      name: s.names[i] ?? `Song ${i + 1}`,
      start,
      end,
    });
  }
  return segs;
}

export function viewWindow(s: Pick<EditorState, "duration" | "zoom" | "pan">): { start: number; end: number } {
  const zoom = Math.max(1, s.zoom);
  const span = s.duration / zoom;
  const maxStart = Math.max(0, s.duration - span);
  const start = s.pan * maxStart;
  return { start, end: start + span };
}
