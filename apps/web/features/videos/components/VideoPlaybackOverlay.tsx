"use client";

import { Loader2, Play } from "lucide-react";

/** Keep video identity visible without covering the player's bottom controls. */
export function VideoPlaybackOverlay({ loading, onPlay }: { loading: boolean; onPlay?: () => void }) {
  return <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
    {onPlay && <button type="button" aria-label="Play video" onClick={onPlay}
      className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/75 text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
      <Play aria-hidden="true" className="h-6 w-6 fill-current" />
    </button>}
    {loading && <span role="status" className="flex items-center gap-2 rounded-full bg-black/75 px-3 py-2 text-sm text-white">
      <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
      Loading video…
    </span>}
  </div>;
}
