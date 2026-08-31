export function formatTime(seconds: number, withTenths = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const tenth = Math.floor((seconds % 1) * 10);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  const core = h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  return withTenths ? `${core}.${tenth}` : core;
}

export function parseTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  return null;
}

/** Pick a ruler interval (seconds) that yields ~6–10 ticks in `span`. */
export function rulerInterval(span: number): number {
  const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const target = span / 8;
  for (const step of steps) {
    if (step >= target) return step;
  }
  return 3600;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
