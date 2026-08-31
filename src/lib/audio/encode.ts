import { clamp } from "./time";

const LAME_RATES = new Set([8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000]);

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = clamp(input[i]!, -1, 1);
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

function applyFade(channel: Float32Array, fadeSamples: number) {
  const n = channel.length;
  const fade = Math.min(fadeSamples, Math.floor(n / 2));
  if (fade <= 0) return;
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    channel[i]! *= g;
    channel[n - 1 - i]! *= g;
  }
}

export function sliceBuffer(
  source: AudioBuffer,
  ctx: AudioContext | OfflineAudioContext,
  startSec: number,
  endSec: number,
  fadeMs: number,
): AudioBuffer {
  const sr = source.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sr));
  const end = Math.min(source.length, Math.floor(endSec * sr));
  const length = Math.max(1, end - start);
  const out = ctx.createBuffer(source.numberOfChannels, length, sr);
  const fadeSamples = Math.floor((Math.max(0, fadeMs) / 1000) * sr);
  for (let c = 0; c < source.numberOfChannels; c++) {
    const dst = out.getChannelData(c);
    dst.set(source.getChannelData(c).subarray(start, end));
    applyFade(dst, fadeSamples);
  }
  return out;
}

async function resample(buffer: AudioBuffer, targetRate: number): Promise<AudioBuffer> {
  if (buffer.sampleRate === targetRate) return buffer;
  const length = Math.max(1, Math.ceil(buffer.duration * targetRate));
  const offline = new OfflineAudioContext(buffer.numberOfChannels, length, targetRate);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start();
  return offline.startRendering();
}

function pickEncodeRate(rate: number): number {
  if (LAME_RATES.has(rate)) return rate;
  return rate > 44100 ? 48000 : 44100;
}

export async function encodeMp3(
  buffer: AudioBuffer,
  bitrate: number,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const targetRate = pickEncodeRate(buffer.sampleRate);
  const prepared = await resample(buffer, targetRate);
  const channels = Math.min(2, prepared.numberOfChannels) as 1 | 2;
  const encoder = new Mp3Encoder(channels, prepared.sampleRate, bitrate);
  const leftF = prepared.getChannelData(0);
  const rightF = channels === 2 ? prepared.getChannelData(Math.min(1, prepared.numberOfChannels - 1)) : null;
  const left = floatTo16(leftF);
  const right = rightF ? floatTo16(rightF) : null;

  const block = 1152;
  const parts: BlobPart[] = [];
  const total = left.length;
  const tmpL = new Int16Array(block);
  const tmpR = new Int16Array(block);

  for (let i = 0; i < total; i += block) {
    const len = Math.min(block, total - i);
    tmpL.fill(0);
    tmpL.set(left.subarray(i, i + len));
    let encoded: Uint8Array;
    if (right) {
      tmpR.fill(0);
      tmpR.set(right.subarray(i, i + len));
      encoded = encoder.encodeBuffer(tmpL, tmpR);
    } else {
      encoded = encoder.encodeBuffer(tmpL);
    }
    if (encoded.length > 0) parts.push(encoded.slice());
    if (i % (block * 40) === 0) {
      onProgress?.(i / total);
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  const flushed = encoder.flush();
  if (flushed.length > 0) parts.push(flushed.slice());
  onProgress?.(1);
  return new Blob(parts, { type: "audio/mpeg" });
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = clamp(channels[c]![i]!, -1, 1);
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}
