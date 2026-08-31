export type SilenceOptions = {
  threshold?: number;
  minSilence?: number;
  minSegment?: number;
};

/**
 * Return split times (seconds) at the midpoint of silent gaps.
 * Designed for mixtapes / DJ sets / "album as one file".
 */
export function detectSilence(buffer: AudioBuffer, opts: SilenceOptions = {}): number[] {
  const threshold = opts.threshold ?? 0.018;
  const minSilence = opts.minSilence ?? 0.55;
  const minSegment = opts.minSegment ?? 1.6;
  const sr = buffer.sampleRate;
  const window = Math.max(1, Math.floor(sr * 0.05));
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const rms: number[] = [];

  for (let i = 0; i < ch0.length; i += window) {
    const end = Math.min(i + window, ch0.length);
    let sum = 0;
    for (let j = i; j < end; j++) {
      const l = ch0[j]!;
      const r = ch1 ? ch1[j]! : l;
      sum += l * l + r * r;
    }
    const n = (end - i) * (ch1 ? 2 : 1);
    rms.push(Math.sqrt(sum / n));
  }

  const raw: number[] = [];
  let silentStart: number | null = null;
  for (let i = 0; i <= rms.length; i++) {
    const silent = i < rms.length && rms[i]! < threshold;
    if (silent && silentStart === null) silentStart = i;
    if ((!silent || i === rms.length) && silentStart !== null) {
      const end = i;
      const dur = ((end - silentStart) * window) / sr;
      if (dur >= minSilence) {
        const mid = (((silentStart + end) / 2) * window) / sr;
        raw.push(mid);
      }
      silentStart = null;
    }
  }

  const duration = buffer.duration;
  const filtered: number[] = [];
  for (const t of raw) {
    if (t < minSegment || t > duration - minSegment) continue;
    const prev = filtered[filtered.length - 1];
    if (prev !== undefined && t - prev < minSegment) continue;
    filtered.push(t);
  }
  return filtered;
}
