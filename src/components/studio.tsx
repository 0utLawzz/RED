import { useEffect, useRef } from "react";
import {
  Download,
  FolderDown,
  Loader2,
  Pause,
  Play,
  Plus,
  Scissors,
  SkipBack,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Waveform } from "@/components/waveform";
import { engine } from "@/lib/audio/engine";
import {
  addSplit,
  applySilenceSplits,
  closeFile,
  downloadAll,
  downloadSegment,
  playSegment,
  renameSegment,
  seekTo,
  setBitrate,
  setFadeMs,
  setFormat,
  setPan,
  setVolume,
  setZoom,
  splitAtPlayhead,
  toggleMute,
  togglePlay,
} from "@/lib/audio/actions";
import { formatTime } from "@/lib/audio/time";
import { getSegments, useEditor, viewWindow, type Bitrate, type ExportFormat } from "@/store/editor";
import { cn } from "@/lib/utils";

function IconTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Studio() {
  const fileName = useEditor((s) => s.fileName);
  const duration = useEditor((s) => s.duration);
  const sampleRate = useEditor((s) => s.sampleRate);
  const channels = useEditor((s) => s.channels);
  const playing = useEditor((s) => s.playing);
  const currentTime = useEditor((s) => s.currentTime);
  const volume = useEditor((s) => s.volume);
  const muted = useEditor((s) => s.muted);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const format = useEditor((s) => s.format);
  const bitrate = useEditor((s) => s.bitrate);
  const fadeMs = useEditor((s) => s.fadeMs);
  const exporting = useEditor((s) => s.exporting);
  const exportProgress = useEditor((s) => s.exportProgress);
  const exportLabel = useEditor((s) => s.exportLabel);
  const splits = useEditor((s) => s.splits);
  const names = useEditor((s) => s.names);
  const cropStart = useEditor((s) => s.cropStart);
  const cropEnd = useEditor((s) => s.cropEnd);
  const selectedIndex = useEditor((s) => s.selectedIndex);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const segs = getSegments({ cropStart, cropEnd, splits, names });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (engine.isPlaying()) {
        useEditor.setState({ currentTime: engine.getCurrentTime() });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        splitAtPlayhead();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekTo(useEditor.getState().currentTime - (e.shiftKey ? 5 : 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekTo(useEditor.getState().currentTime + (e.shiftKey ? 5 : 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        seekTo(useEditor.getState().cropStart);
      } else if (e.key === "End") {
        e.preventDefault();
        seekTo(useEditor.getState().cropEnd);
      } else if ((e.key === "Backspace" || e.key === "Delete") && selectedIndex !== null && selectedIndex > 0) {
        e.preventDefault();
        const { removeSplit } = require("@/lib/audio/actions") as typeof import("@/lib/audio/actions");
        removeSplit(selectedIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex]);

  const chLabel = channels === 1 ? "Mono" : "Stereo";
  const srLabel = sampleRate >= 1000 ? `${Math.round(sampleRate / 1000)} kHz` : `${sampleRate} Hz`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pb-16 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-medium tracking-tight sm:text-3xl">
            {fileName ?? "Untitled"}
          </h1>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted">
            {formatTime(duration)} · {chLabel} · {srLabel} · {segs.length} {segs.length === 1 ? "song" : "songs"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Replace file
          </Button>
          <Button variant="ghost" size="sm" onClick={closeFile}>
            Close
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void import("@/lib/audio/actions").then((m) => m.loadFile(file));
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <Waveform />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <IconTip label="To start">
            <Button variant="ghost" size="icon" onClick={() => seekTo(cropStart)} aria-label="Skip to start">
              <SkipBack />
            </Button>
          </IconTip>
          <Button
            size="icon"
            className="size-12 rounded-full"
            onClick={() => void togglePlay()}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
          </Button>
          <div className="ml-2 min-w-28 font-mono text-sm tabular-nums text-fg">
            {formatTime(currentTime, true)}
            <span className="text-subtle"> / {formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <IconTip label={muted ? "Unmute" : "Mute"}>
              <Button variant="ghost" size="icon-sm" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
              </Button>
            </IconTip>
            <Slider
              className="w-24"
              min={0}
              max={1}
              step={0.01}
              value={[muted ? 0 : volume]}
              onValueChange={(v) => setVolume(v[0] ?? 0)}
              aria-label="Volume"
            />
          </div>
          <div className="flex items-center gap-1">
            <IconTip label="Zoom out">
              <Button variant="ghost" size="icon-sm" onClick={() => setZoom(zoom / 1.4)} aria-label="Zoom out">
                <ZoomOut />
              </Button>
            </IconTip>
            <Slider
              className="w-24"
              min={1}
              max={24}
              step={0.1}
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0] ?? 1)}
              aria-label="Zoom"
            />
            <IconTip label="Zoom in">
              <Button variant="ghost" size="icon-sm" onClick={() => setZoom(zoom * 1.4)} aria-label="Zoom in">
                <ZoomIn />
              </Button>
            </IconTip>
          </div>
        </div>
      </div>

      {zoom > 1.05 ? (
        <Slider
          min={0}
          max={1}
          step={0.001}
          value={[pan]}
          onValueChange={(v) => setPan(v[0] ?? 0)}
          aria-label="Scroll waveform"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={applySilenceSplits}>
          <Scissors />
          Split on silence
        </Button>
        <Button variant="outline" onClick={splitAtPlayhead}>
          <Plus />
          Split at playhead
        </Button>
        <p className="hidden items-center text-xs text-subtle sm:flex">
          Double-click the waveform to cut · Space plays · S splits
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="min-w-0">
          <h2 className="mb-3 text-sm font-medium text-muted">Songs</h2>
          <ol className="flex flex-col gap-2">
            {segs.map((seg, i) => {
              const active = selectedIndex === i;
              return (
                <li
                  key={seg.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:flex-row sm:items-center",
                    active && "shadow-[var(--shadow-border-hover)]",
                  )}
                >
                  <button
                    type="button"
                    className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg"
                    onClick={() => void playSegment(i)}
                    aria-label={`Play ${seg.name}`}
                  >
                    <Play className="size-4 translate-x-px" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <Input
                      value={seg.name}
                      onChange={(e) => renameSegment(i, e.target.value)}
                      onFocus={() => useEditor.setState({ selectedIndex: i })}
                      className="h-9 bg-transparent shadow-none focus-visible:bg-surface-2"
                      aria-label={`Name for song ${i + 1}`}
                    />
                    <p className="mt-1 font-mono text-xs tabular-nums text-subtle">
                      {formatTime(seg.start, true)} – {formatTime(seg.end, true)}
                      <span className="ml-2 text-muted">{formatTime(seg.end - seg.start, true)}</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:ml-auto"
                    disabled={exporting}
                    onClick={() => void downloadSegment(i)}
                  >
                    <Download />
                    Download
                  </Button>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="h-fit rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <h2 className="text-sm font-medium text-muted">Export</h2>
          <div className="mt-4 space-y-4">
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-subtle">Format</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["mp3", "wav"] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={cn(
                      "h-11 rounded-md text-sm font-medium uppercase tracking-wide transition-[background-color,color,box-shadow] duration-150 ease-out",
                      format === f ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted hover:text-fg",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </fieldset>
            {format === "mp3" ? (
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-subtle">MP3 bitrate</legend>
                <div className="grid grid-cols-3 gap-2">
                  {([128, 192, 320] as Bitrate[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBitrate(b)}
                      className={cn(
                        "h-11 rounded-md font-mono text-sm tabular-nums transition-[background-color,color] duration-150 ease-out",
                        bitrate === b ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg",
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-subtle">
                <span>Edge fade</span>
                <span className="font-mono tabular-nums">{fadeMs} ms</span>
              </div>
              <Slider min={0} max={200} step={5} value={[fadeMs]} onValueChange={(v) => setFadeMs(v[0] ?? 0)} />
            </div>
            <Button className="w-full" disabled={exporting || segs.length === 0} onClick={() => void downloadAll()}>
              {exporting ? <Loader2 className="animate-spin" /> : <FolderDown />}
              {segs.length > 1 ? "Download all as ZIP" : "Download song"}
            </Button>
            {exporting ? (
              <div>
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full bg-accent transition-[width] duration-200 ease-out"
                    style={{ width: `${Math.round(exportProgress * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted">{exportLabel}</p>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-subtle">
                A short fade avoids clicks at each cut. Files never leave this browser.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// Keep viewWindow referenced so zoom/pan unused-import tools stay quiet if tree-shaken.
void viewWindow;
