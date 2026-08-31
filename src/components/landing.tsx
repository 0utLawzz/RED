import { useRef, useState } from "react";
import { Music2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VinylMark } from "@/components/logo";
import { isAudioFile, loadDemo, loadFile } from "@/lib/audio/actions";
import { useEditor } from "@/store/editor";
import { cn } from "@/lib/utils";

export function Landing() {
  const inputRef = useRef<HTMLInputElement>(null);
  const error = useEditor((s) => s.error);
  const [over, setOver] = useState(false);

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void loadFile(file);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-16 pt-6 sm:pt-10">
      <p className="red-rise font-display text-4xl font-medium tracking-tight text-fg sm:text-5xl">
        Cut long recordings into songs.
      </p>
      <p className="red-rise-2 mt-4 max-w-md text-center text-base leading-relaxed text-muted">
        Drop an MP3, mark the cuts, name each track, download. Decoding and encoding stay on this device.
      </p>

      <div
        className={cn(
          "red-rise-3 mt-10 w-full rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-200 ease-out",
          over && "shadow-[var(--shadow-border-hover)]",
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            onFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center rounded-xl px-6 py-14 text-center transition-[background-color] duration-200 ease-out",
            over ? "bg-surface-2" : "bg-transparent",
          )}
        >
          <VinylMark className="size-14 text-muted" />
          <span className="mt-5 font-display text-2xl font-medium tracking-tight text-fg">
            Drop an MP3
          </span>
          <span className="mt-2 text-sm text-muted">or click to browse · MP3, WAV, M4A, OGG, AAC</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error ? (
        <p className="mt-4 text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}

      <div className="red-rise-4 mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => inputRef.current?.click()}>
          <Upload />
          Browse files
        </Button>
        <Button variant="outline" onClick={() => void loadDemo()}>
          <Music2 />
          Try a demo mix
        </Button>
      </div>

      <ul className="mt-14 grid w-full gap-3 text-sm text-muted sm:grid-cols-3">
        {[
          { title: "Split on silence", body: "Find the gaps between songs automatically." },
          { title: "Trim the edges", body: "Drag the red handles to crop intro and outro." },
          { title: "Download MP3 or ZIP", body: "Each song, named, encoded in the browser." },
        ].map((item) => (
          <li key={item.title} className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
            <div className="font-medium text-fg">{item.title}</div>
            <p className="mt-1 leading-relaxed">{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LoadingScreen() {
  const label = useEditor((s) => s.loadingLabel);
  const fileName = useEditor((s) => s.fileName);
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
      <VinylMark className="size-16 text-fg" spinning />
      <p className="mt-6 font-display text-2xl font-medium tracking-tight">{label}</p>
      {fileName ? <p className="mt-2 max-w-sm truncate text-sm text-muted">{fileName}</p> : null}
    </div>
  );
}

export function useGlobalDrop() {
  const [over, setOver] = useState(false);
  const status = useEditor((s) => s.status);

  const bind = {
    onDragOver: (e: React.DragEvent) => {
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget === e.target) setOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const file = e.dataTransfer.files[0];
      if (file && isAudioFile(file)) void loadFile(file);
    },
  };

  return { over: over && status !== "loading", bind };
}
