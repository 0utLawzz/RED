const DEFAULT_BARS = 10000;

export function computePeaks(buffer: AudioBuffer, bars = DEFAULT_BARS): Float32Array {
  const channelCount = buffer.numberOfChannels;
  const channels: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) channels.push(buffer.getChannelData(c));
  const length = buffer.length;
  const count = Math.min(bars, length);
  const peaks = new Float32Array(count * 2);
  const samplesPerBar = length / count;

  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * samplesPerBar);
    const end = Math.min(length, Math.floor((i + 1) * samplesPerBar));
    let min = 1;
    let max = -1;
    for (let j = start; j < end; j++) {
      let mix = 0;
      for (let c = 0; c < channelCount; c++) mix += channels[c]![j]!;
      mix /= channelCount;
      if (mix < min) min = mix;
      if (mix > max) max = mix;
    }
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }
  return peaks;
}

export function peakBarCount(peaks: Float32Array): number {
  return peaks.length / 2;
}
