export class AudioEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  buffer: AudioBuffer | null = null;
  private playing = false;
  private startedAt = 0;
  private offset = 0;
  private stopTimer: number | null = null;
  onEnded: (() => void) | null = null;

  getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.9;
      this.gain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async resume() {
    const ctx = this.getContext();
    if (ctx.state !== "running") await ctx.resume();
  }

  setBuffer(buffer: AudioBuffer | null) {
    this.stopSource();
    this.buffer = buffer;
    this.offset = 0;
    this.playing = false;
  }

  setVolume(v: number) {
    if (!this.gain) this.getContext();
    if (this.gain) this.gain.gain.value = v;
  }

  getCurrentTime(): number {
    if (!this.ctx || !this.playing) return this.offset;
    return this.offset + (this.ctx.currentTime - this.startedAt);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  play(from: number, until?: number) {
    if (!this.buffer) return;
    const ctx = this.getContext();
    this.stopSource();
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gain!);
    const start = Math.max(0, Math.min(from, this.buffer.duration - 0.001));
    const dur =
      until !== undefined
        ? Math.max(0.01, Math.min(until, this.buffer.duration) - start)
        : Math.max(0.01, this.buffer.duration - start);
    src.start(0, start, dur);
    src.onended = () => {
      if (this.source !== src) return;
      this.playing = false;
      this.offset = until ?? this.buffer?.duration ?? start;
      this.source = null;
      this.onEnded?.();
    };
    this.source = src;
    this.offset = start;
    this.startedAt = ctx.currentTime;
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.getCurrentTime();
    this.stopSource();
    this.playing = false;
  }

  seek(time: number) {
    const duration = this.buffer?.duration ?? 0;
    const t = Math.max(0, Math.min(time, duration));
    if (this.playing) {
      const until = this._until;
      this.play(t, until ?? undefined);
    } else {
      this.offset = t;
    }
  }

  private _until: number | null = null;

  playRange(from: number, until: number) {
    this._until = until;
    this.play(from, until);
  }

  playFrom(from: number) {
    this._until = null;
    this.play(from);
  }

  private stopSource() {
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
      this.source = null;
    }
  }

  clear() {
    this.pause();
    this.buffer = null;
    this.offset = 0;
  }
}

export const engine = new AudioEngine();
