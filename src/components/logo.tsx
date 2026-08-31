import { cn } from "@/lib/utils";

export function VinylMark({ className, spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn(spinning && "red-spin", className)}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.45" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
      <circle cx="16" cy="16" r="4.2" fill="var(--color-accent)" />
      <circle cx="16" cy="16" r="1.35" fill="var(--color-bg)" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <VinylMark className="size-7 text-fg" />
      <div className="leading-none">
        <div className="font-display text-xl font-semibold tracking-tight text-fg">Red</div>
        {!compact ? (
          <div className="mt-0.5 text-[0.7rem] font-medium tracking-wide text-muted">Audio cutter</div>
        ) : null}
      </div>
    </div>
  );
}
