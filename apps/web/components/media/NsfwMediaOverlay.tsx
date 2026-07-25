"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { NsfwCategory, NsfwStatus } from "@35mm/types";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CATEGORY_LABELS: Record<NsfwCategory, string> = {
  nudity: "nudity",
  sexual_content: "sexual content",
  violence: "violence",
  graphic_content: "graphic imagery",
  sensitive: "sensitive themes",
};

export function nsfwCategoryLabel(categories: NsfwCategory[]): string {
  const labels = Array.from(new Set(categories)).map(function (category) {
    return CATEGORY_LABELS[category];
  });
  if (labels.length === 0) return "This media may be sensitive.";
  if (labels.length === 1) return `May contain ${labels[0]}.`;
  if (labels.length === 2) return `May contain ${labels[0]} and ${labels[1]}.`;
  return `May contain ${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}.`;
}

interface NsfwMediaOverlayProps {
  status: NsfwStatus;
  categories: NsfwCategory[];
  children: ReactNode;
  className?: string;
  compact?: boolean;
  revealed?: boolean;
  onReveal?: () => void;
  style?: CSSProperties;
}

export function NsfwMediaOverlay({
  status,
  categories,
  children,
  className,
  compact = false,
  revealed: controlledRevealed,
  onReveal,
  style,
}: NsfwMediaOverlayProps) {
  const [localRevealed, setLocalRevealed] = useState(false);
  const revealed = controlledRevealed ?? localRevealed;
  const hidden = status !== "none" && !revealed;

  function reveal() {
    setLocalRevealed(true);
    onReveal?.();
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={style}
      data-nsfw-status={status}
      data-nsfw-revealed={revealed ? "true" : "false"}
    >
      <div
        className={cn(
          "h-full w-full transition-[filter,transform] duration-300",
          hidden && "pointer-events-none scale-[1.025] blur-xl"
        )}
        aria-hidden={hidden || undefined}
      >
        {children}
      </div>
      {hidden ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg)_68%,transparent)] p-3 text-fg backdrop-saturate-50">
          <div className={cn("max-w-[20rem] text-center", compact ? "space-y-1.5" : "space-y-2")}>
            <EyeOff
              className={cn("mx-auto text-fg", compact ? "h-5 w-5" : "h-7 w-7")}
              strokeWidth={1.7}
              aria-hidden
            />
            <div>
              <p className={cn("font-semibold text-fg", compact ? "text-xs" : "text-sm")}>
                Sensitive content
              </p>
              {!compact ? (
                <p className="mt-1 text-[11.5px] leading-snug text-fg-muted">
                  {nsfwCategoryLabel(categories)}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={function (event) {
                event.stopPropagation();
                reveal();
              }}
              className="rounded-full border border-border-strong bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4 py-1.5 text-[11px] font-semibold text-fg shadow-sm transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--fg)_38%,transparent)]"
            >
              View
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface NsfwTextRevealProps {
  status: NsfwStatus;
  categories: NsfwCategory[];
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function NsfwTextReveal({
  status,
  categories,
  children,
  className,
  compact = false,
}: NsfwTextRevealProps) {
  const [revealed, setRevealed] = useState(false);
  if (status === "none" || revealed) return <>{children}</>;

  return (
    <div className={cn(compact ? "mt-1.5" : "mt-2", className)}>
      <button
        type="button"
        onClick={function (event) {
          event.stopPropagation();
          setRevealed(true);
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-border-strong bg-[color-mix(in_srgb,var(--fg)_4%,var(--elevated))] px-3 py-2 text-left text-[12px] text-fg transition-colors hover:bg-hover"
      >
        <EyeOff className="h-4 w-4 shrink-0 text-fg-muted" strokeWidth={1.8} aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          This {compact ? "comment" : "post"} may contain sensitive content — tap to view
        </span>
        <span className="sr-only">{nsfwCategoryLabel(categories)}</span>
      </button>
    </div>
  );
}
