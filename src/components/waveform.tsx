import { useCallback, useEffect, useRef } from "react";
import { getSegments, useEditor, viewWindow } from "@/store/editor";
import { addSplit, moveBoundary, seekTo, setPan, setZoom } from "@/lib/audio/actions";
import { formatTime, rulerInterval } from "@/lib/audio/time";
import { cn } from "@/lib/utils";

type DragKind = "boundary" | "pan" | "scrub" | null;

export function Waveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const peaks = useEditor((s) => s.peaks);
  const duration = useEditor((s) => s.duration);
  const cropStart = useEditor((s) => s.cropStart);
  const cropEnd = useEditor((s) => s.cropEnd);
  const splits = useEditor((s) => s.splits);
  const names = useEditor((s) => s.names);
  const currentTime = useEditor((s) => s.currentTime);
  const playing = useEditor((s) => s.playing);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const selectedIndex = useEditor((s) => s.selectedIndex);

  const drag = useRef<{
    kind: DragKind;
    index: number;
    lastX: number;
    moved: boolean;
  }>({ kind: null, index: -1, lastX: 0, moved: false });
  const hoverX = useRef<number | null>(null);
  const hoverTime = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || duration <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const styles = getComputedStyle(canvas);
    const bg = styles.getPropertyValue("--color-surface").trim() || "#161210";
    const wave = styles.getPropertyValue("--color-wave").trim() || "#c44536";
    const waveDim = styles.getPropertyValue("--color-wave-dim").trim() || "#5c2a24";
    const fg = styles.getPropertyValue("--color-fg").trim() || "#f4efe8";
    const muted = styles.getPropertyValue("--color-muted").trim() || "#9a9088";
    const border = styles.getPropertyValue("--color-border").trim() || "#2c2622";
    const accent = styles.getPropertyValue("--color-accent").trim() || "#c44536";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cssW, cssH);

    const { start: viewStart, end: viewEnd } = viewWindow({ duration, zoom, pan });
    const span = Math.max(0.001, viewEnd - viewStart);
    const xAt = (t: number) => ((t - viewStart) / span) * cssW;
    const tAt = (x: number) => viewStart + (x / cssW) * span;

    const rulerH = 22;
    const labelH = 22;
    const waveTop = rulerH;
    const waveBot = cssH - labelH;
    const waveH = waveBot - waveTop;
    const mid = waveTop + waveH / 2;

    // Ruler
    ctx.fillStyle = border;
    ctx.fillRect(0, rulerH - 1, cssW, 1);
    const interval = rulerInterval(span);
    const first = Math.ceil(viewStart / interval) * interval;
    ctx.font = "500 10px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = muted;
    ctx.textBaseline = "middle";
    for (let t = first; t <= viewEnd + 1e-6; t += interval) {
      const x = xAt(t);
      ctx.fillStyle = border;
      ctx.fillRect(x, rulerH - 6, 1, 6);
      ctx.fillStyle = muted;
      ctx.fillText(formatTime(t), x + 4, 10);
    }

    // Waveform
    const barCount = peaks.length / 2;
    const amp = waveH * 0.42;
    for (let x = 0; x < cssW; x++) {
      const t = tAt(x + 0.5);
      const p = (t / duration) * barCount;
      const i = Math.floor(p);
      if (i < 0 || i >= barCount) continue;
      let min = peaks[i * 2]!;
      let max = peaks[i * 2 + 1]!;
      const next = Math.min(barCount - 1, i + 1);
      min = Math.min(min, peaks[next * 2]!);
      max = Math.max(max, peaks[next * 2 + 1]!);
      const inCrop = t >= cropStart && t <= cropEnd;
      ctx.fillStyle = inCrop ? wave : waveDim;
      const y1 = mid - max * amp;
      const y2 = mid - min * amp;
      const h = Math.max(1, y2 - y1);
      ctx.fillRect(x, y1, 1, h);
    }

    // Center line
    ctx.fillStyle = border;
    ctx.fillRect(0, mid, cssW, 1);

    // Dim outside crop
    ctx.fillStyle = "rgba(12, 10, 9, 0.45)";
    if (cropStart > viewStart) {
      ctx.fillRect(0, waveTop, Math.max(0, xAt(cropStart)), waveH);
    }
    if (cropEnd < viewEnd) {
      const x = xAt(cropEnd);
      ctx.fillRect(x, waveTop, cssW - x, waveH);
    }

    const points = [cropStart, ...splits, cropEnd];
    const segs = getSegments({ cropStart, cropEnd, splits, names });

    // Segment labels
    ctx.font = "500 11px Figtree, ui-sans-serif, sans-serif";
    ctx.textBaseline = "middle";
    segs.forEach((seg, i) => {
      const x1 = Math.max(0, xAt(seg.start));
      const x2 = Math.min(cssW, xAt(seg.end));
      if (x2 - x1 < 28) return;
      ctx.fillStyle = i === selectedIndex ? fg : muted;
      const label = seg.name;
      const tw = ctx.measureText(label).width;
      if (tw + 8 < x2 - x1) {
        ctx.fillText(label, x1 + 6, cssH - labelH / 2);
      }
    });

    // Boundaries
    points.forEach((t, i) => {
      const x = xAt(t);
      if (x < -8 || x > cssW + 8) return;
      const isCrop = i === 0 || i === points.length - 1;
      ctx.strokeStyle = isCrop ? accent : fg;
      ctx.globalAlpha = isCrop ? 1 : 0.55;
      ctx.lineWidth = isCrop ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, waveTop);
      ctx.lineTo(x, waveBot);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Handle
      const hw = isCrop ? 5 : 4;
      const hh = 10;
      ctx.fillStyle = isCrop ? accent : fg;
      ctx.beginPath();
      ctx.roundRect(x - hw, waveTop, hw * 2, hh, 2);
      ctx.fill();
    });

    // Hover
    if (hoverX.current !== null && hoverTime.current !== null) {
      const x = hoverX.current;
      ctx.fillStyle = "rgba(244, 239, 232, 0.2)";
      ctx.fillRect(x, waveTop, 1, waveH);
      const label = formatTime(hoverTime.current, true);
      ctx.font = "500 10px 'IBM Plex Mono', ui-monospace, monospace";
      const tw = ctx.measureText(label).width;
      const bx = Math.min(cssW - tw - 12, Math.max(4, x + 8));
      ctx.fillStyle = "rgba(22, 18, 16, 0.92)";
      ctx.beginPath();
      ctx.roundRect(bx, waveTop + 4, tw + 8, 16, 4);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.fillText(label, bx + 4, waveTop + 12);
    }

    // Playhead
    const px = xAt(currentTime);
    if (px >= 0 && px <= cssW) {
      ctx.fillStyle = fg;
      ctx.fillRect(px - 0.5, waveTop, 1.5, waveH);
      ctx.beginPath();
      ctx.moveTo(px, waveTop);
      ctx.lineTo(px - 5, waveTop - 7);
      ctx.lineTo(px + 5, waveTop - 7);
      ctx.closePath();
      ctx.fill();
    }
  }, [peaks, duration, cropStart, cropEnd, splits, names, currentTime, zoom, pan, selectedIndex]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, draw]);

  const hitBoundary = (x: number, cssW: number) => {
    const { start: viewStart, end: viewEnd } = viewWindow(useEditor.getState());
    const span = viewEnd - viewStart;
    const s = useEditor.getState();
    const points = [s.cropStart, ...s.splits, s.cropEnd];
    const threshold = 10;
    let best = -1;
    let bestDist = threshold;
    points.forEach((t, i) => {
      const px = ((t - viewStart) / span) * cssW;
      const d = Math.abs(px - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  const timeFromEvent = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const { start: viewStart, end: viewEnd } = viewWindow(useEditor.getState());
    const x = clientX - rect.left;
    return viewStart + (x / rect.width) * (viewEnd - viewStart);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const boundary = hitBoundary(x, rect.width);
    if (boundary >= 0) {
      drag.current = { kind: "boundary", index: boundary, lastX: e.clientX, moved: false };
      return;
    }
    const z = useEditor.getState().zoom;
    drag.current = {
      kind: z > 1.05 ? "pan" : "scrub",
      index: -1,
      lastX: e.clientX,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    hoverX.current = e.clientX - rect.left;
    hoverTime.current = timeFromEvent(e.clientX);
    const d = drag.current;
    if (d.kind === "boundary") {
      d.moved = true;
      moveBoundary(d.index, timeFromEvent(e.clientX));
    } else if (d.kind === "scrub") {
      d.moved = true;
      seekTo(timeFromEvent(e.clientX));
    } else if (d.kind === "pan") {
      const dx = e.clientX - d.lastX;
      if (Math.abs(dx) > 2) d.moved = true;
      d.lastX = e.clientX;
      const s = useEditor.getState();
      const { start, end } = viewWindow(s);
      const span = end - start;
      const dt = -(dx / rect.width) * span;
      const maxStart = Math.max(0, s.duration - span);
      const nextStart = Math.min(maxStart, Math.max(0, start + dt));
      setPan(maxStart === 0 ? 0 : nextStart / maxStart);
    } else {
      draw();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (d.kind && !d.moved) {
      seekTo(timeFromEvent(e.clientX));
    }
    drag.current = { kind: null, index: -1, lastX: 0, moved: false };
  };

  const onPointerLeave = () => {
    hoverX.current = null;
    hoverTime.current = null;
    draw();
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    addSplit(timeFromEvent(e.clientX));
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const s = useEditor.getState();
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const { start, end } = viewWindow(s);
      const span = end - start;
      const dt = ((e.deltaX || e.deltaY) / 400) * span;
      const maxStart = Math.max(0, s.duration - span);
      const nextStart = Math.min(maxStart, Math.max(0, start + dt));
      setPan(maxStart === 0 ? 0 : nextStart / maxStart);
      return;
    }
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    setZoom(s.zoom * factor, timeFromEvent(e.clientX));
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]",
        "h-44 sm:h-52",
      )}
    >
      <canvas
        ref={canvasRef}
        className="size-full touch-none cursor-crosshair"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        role="img"
        aria-label="Audio waveform. Click to seek, double-click to split, drag handles to adjust."
      />
    </div>
  );
}
