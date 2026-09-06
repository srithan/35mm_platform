"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon/Icon";
import { cn } from "@/lib/utils/cn";

type VideoUploadPhase = "ready" | "uploading" | "uploaded" | "complete" | "failed";

interface VideoAttachmentProps {
  file?: File;
  src?: string;
  phase?: VideoUploadPhase;
  progress?: number;
  onRemove?: () => void;
  onRetry?: () => void;
  error?: string | null;
  removeDisabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) + " MB";
}

export function VideoAttachment({
  file,
  src,
  phase = "ready",
  progress = 0,
  onRemove,
  onRetry,
  error,
  removeDisabled = false,
}: VideoAttachmentProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(src ?? null);
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  useEffect(
    function () {
      if (!file) {
        setPreviewUrl(src ?? null);
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return function () {
        URL.revokeObjectURL(objectUrl);
      };
    },
    [file, src]
  );

  if (!previewUrl) return null;

  const status =
    phase === "uploading"
      ? "Uploading video · " + safeProgress + "%"
      : phase === "uploaded"
        ? "Video uploaded · Ready to post; playback is processing"
        : phase === "complete"
          ? "Video ready to post"
          : phase === "failed"
            ? "Video upload failed"
            : "Preparing upload";

  return (
    <section
      className="mt-2 overflow-hidden rounded-xl border border-border bg-black"
      aria-label="Attached video"
    >
      <div className="relative flex min-h-[180px] items-center justify-center bg-black">
        <video
          src={previewUrl}
          controls
          playsInline
          preload="metadata"
          className="mx-auto max-h-[min(42vh,360px)] w-full object-contain"
        >
          Your browser does not support HTML5 video.
        </video>
        {onRemove ? (
          <button
            type="button"
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onRemove}
            disabled={removeDisabled}
            aria-label="Remove video"
            title="Remove video"
          >
            <Icon name="x" className="h-4 w-4" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>

      {file ? (
        <div className="border-t border-white/15 bg-[#151515] px-3 py-2.5 text-white">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.07]">
              <Icon name={phase === "uploaded" ? "check" : "clapperboard"} className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-4">{file.name}</p>
              <p className="font-mono text-[10px] leading-4 text-white/55">
                {status} · {formatBytes(file.size)}
              </p>
            </div>
          </div>
          {error ? <p role="alert" className="mt-2 text-xs text-white">{error}</p> : null}
          {phase === "failed" && onRetry ? (
            <button type="button" onClick={onRetry} className="mt-2 text-xs underline">Retry upload</button>
          ) : null}
          {phase === "uploading" || phase === "uploaded" ? (
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-label="Video upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={safeProgress}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none",
                  phase === "uploaded" ? "bg-white" : "bg-[var(--color-accent)]"
                )}
                style={{ width: safeProgress + "%" }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
