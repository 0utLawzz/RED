import { createFileRoute } from "@tanstack/react-router";
import { Landing, LoadingScreen, useGlobalDrop } from "@/components/landing";
import { Wordmark } from "@/components/logo";
import { Studio } from "@/components/studio";
import { useEditor } from "@/store/editor";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const status = useEditor((s) => s.status);
  const { over, bind } = useGlobalDrop();

  return (
    <div className="flex min-h-dvh flex-col" {...bind}>
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Wordmark compact={status === "ready"} />
      </header>
      {status === "loading" ? <LoadingScreen /> : status === "ready" ? <Studio /> : <Landing />}
      {over ? (
        <div
          className={cn(
            "pointer-events-none fixed inset-0 z-50 flex items-center justify-center",
            "bg-[color-mix(in_oklab,var(--color-bg)_78%,transparent)]",
          )}
        >
          <p className="rounded-2xl bg-surface px-8 py-5 font-display text-2xl font-medium tracking-tight shadow-[var(--shadow-border)]">
            Drop to open
          </p>
        </div>
      ) : null}
    </div>
  );
}
