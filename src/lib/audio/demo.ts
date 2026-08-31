export type DemoMix = {
  buffer: AudioBuffer;
  names: string[];
  splits: number[];
  fileName: string;
};

function midi(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

type Voice = "organ" | "pluck" | "pad" | "bass";

function voiceSample(type: Voice, freq: number, t: number): number {
  const w = 2 * Math.PI * freq * t;
  switch (type) {
    case "organ":
      return Math.sin(w) * 0.62 + Math.sin(w * 2) * 0.22 + Math.sin(w * 3) * 0.1 + Math.sin(w * 4) * 0.05;
    case "pluck":
      return (Math.sin(w) + 0.35 * Math.sin(w * 2) + 0.12 * Math.sin(w * 3)) * Math.exp(-t * 2.8);
    case "pad":
      return Math.sin(w) * 0.5 + Math.sin(w * 1.002) * 0.28 + Math.sin(w * 2) * 0.12 + Math.sin(w * 0.5) * 0.1;
    case "bass":
      return Math.sin(w) * 0.75 + Math.sin(w * 2) * 0.12 + Math.sin(w * 0.5) * 0.08;
  }
}

function addNote(
  L: Float32Array,
  R: Float32Array,
  sr: number,
  freq: number,
  start: number,
  dur: number,
  vel: number,
  type: Voice,
) {
  const s0 = Math.floor(start * sr);
  const n = Math.floor(dur * sr);
  const attack = Math.max(1, Math.floor(0.018 * sr));
  const release = Math.max(1, Math.floor(Math.min(0.22, dur * 0.35) * sr));
  const pan = type === "bass" ? 0 : Math.sin(freq * 0.01) * 0.35;
  const gL = vel * (1 - pan) * 0.38;
  const gR = vel * (1 + pan) * 0.38;
  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx < 0 || idx >= L.length) continue;
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > n - release) env = Math.max(0, (n - i) / release);
    const t = i / sr;
    const s = voiceSample(type, freq, t) * env;
    L[idx]! += s * gL;
    R[idx]! += s * gR;
  }
}

type Phrase = {
  name: string;
  start: number;
  duration: number;
  voice: Voice;
  notes: { midi: number; at: number; dur: number; vel: number }[];
};

const GAP = 1.2;

const PHRASES: Phrase[] = [
  {
    name: "Harbor",
    start: 0,
    duration: 4.0,
    voice: "organ",
    notes: [
      { midi: 45, at: 0.0, dur: 3.8, vel: 0.7 },
      { midi: 52, at: 0.0, dur: 0.7, vel: 0.9 },
      { midi: 55, at: 0.7, dur: 0.7, vel: 0.9 },
      { midi: 60, at: 1.4, dur: 0.7, vel: 0.95 },
      { midi: 64, at: 2.1, dur: 0.7, vel: 0.9 },
      { midi: 67, at: 2.8, dur: 1.1, vel: 0.85 },
    ],
  },
  {
    name: "Noon",
    start: 4.0 + GAP,
    duration: 4.2,
    voice: "pluck",
    notes: [
      { midi: 62, at: 0.0, dur: 0.55, vel: 1 },
      { midi: 65, at: 0.5, dur: 0.55, vel: 0.9 },
      { midi: 69, at: 1.0, dur: 0.55, vel: 0.95 },
      { midi: 72, at: 1.5, dur: 0.7, vel: 1 },
      { midi: 69, at: 2.2, dur: 0.5, vel: 0.85 },
      { midi: 65, at: 2.7, dur: 0.5, vel: 0.8 },
      { midi: 62, at: 3.2, dur: 0.9, vel: 0.9 },
      { midi: 50, at: 0.0, dur: 4.0, vel: 0.45 },
    ],
  },
  {
    name: "Glass",
    start: 4.0 + GAP + 4.2 + GAP,
    duration: 3.8,
    voice: "pad",
    notes: [
      { midi: 76, at: 0.0, dur: 1.6, vel: 0.7 },
      { midi: 79, at: 0.8, dur: 1.6, vel: 0.55 },
      { midi: 83, at: 1.6, dur: 2.0, vel: 0.65 },
      { midi: 71, at: 0.2, dur: 3.4, vel: 0.4 },
    ],
  },
  {
    name: "Ember",
    start: 4.0 + GAP + 4.2 + GAP + 3.8 + GAP,
    duration: 4.4,
    voice: "bass",
    notes: [
      { midi: 40, at: 0.0, dur: 4.2, vel: 0.95 },
      { midi: 47, at: 0.0, dur: 4.2, vel: 0.55 },
      { midi: 52, at: 0.6, dur: 0.8, vel: 0.7 },
      { midi: 55, at: 1.5, dur: 0.8, vel: 0.7 },
      { midi: 59, at: 2.4, dur: 0.8, vel: 0.75 },
      { midi: 64, at: 3.3, dur: 1.0, vel: 0.8 },
    ],
  },
];

export function createDemoMix(ctx: AudioContext): DemoMix {
  const last = PHRASES[PHRASES.length - 1]!;
  const duration = last.start + last.duration;
  const sr = 44100;
  const length = Math.floor(duration * sr);
  const buffer = ctx.createBuffer(2, length, sr);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);

  for (const phrase of PHRASES) {
    for (const note of phrase.notes) {
      addNote(L, R, sr, midi(note.midi), phrase.start + note.at, note.dur, note.vel, phrase.voice);
    }
    // A faint noise floor so songs read as "signal" vs true-zero gaps.
    const s0 = Math.floor(phrase.start * sr);
    const n = Math.floor(phrase.duration * sr);
    for (let i = 0; i < n; i++) {
      const idx = s0 + i;
      if (idx >= L.length) break;
      const noise = (Math.random() * 2 - 1) * 0.008;
      L[idx]! += noise;
      R[idx]! += noise;
    }
  }

  // Soft limiter
  for (let i = 0; i < length; i++) {
    L[i] = Math.tanh(L[i]! * 1.15);
    R[i] = Math.tanh(R[i]! * 1.15);
  }

  const splits = PHRASES.slice(0, -1).map((p, i) => {
    const next = PHRASES[i + 1]!;
    return (p.start + p.duration + next.start) / 2;
  });

  return {
    buffer,
    names: PHRASES.map((p) => p.name),
    splits,
    fileName: "Red demo mix.mp3",
  };
}
