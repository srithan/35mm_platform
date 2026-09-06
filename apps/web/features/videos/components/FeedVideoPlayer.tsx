"use client";

import { useEffect, useRef, useState } from "react";
import { useSettingsQuery } from "@/features/settings/hooks/useSettings";
import { useVideoSound } from "../hooks/useVideoSound";
import { useExclusiveVideoPlayback } from "../hooks/useExclusiveVideoPlayback";
import { useVideoVisibility } from "../hooks/useVideoVisibility";
import { VideoPlaybackOverlay } from "./VideoPlaybackOverlay";

/** Legacy direct uploads use the same viewport and preference rules as Stream. */
export function FeedVideoPlayer({ src }: { src: string }) {
  const { ref, nearby, visible } = useVideoVisibility();
  const video = useRef<HTMLVideoElement>(null);
  const settings = useSettingsQuery();
  const { muted, getMuted, setMuted, volume } = useVideoSound();
  const autoplay = settings.data?.appearance.videoAutoplay ?? false;
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (video.current) video.current.volume = volume;
  }, [volume]);

  const playbackAttempt = useRef(0);
  const play = () => {
    const element = video.current;
    if (!element) return;
    const attempt = ++playbackAttempt.current;
    setLoading(true);
    element.muted = getMuted();
    void element.play().catch((cause: unknown) => {
      if (attempt !== playbackAttempt.current) return;
      setLoading(false);
      // Browser policy can require a gesture; native controls remain available.
      if (cause instanceof DOMException && ["NotAllowedError", "AbortError"].includes(cause.name)) return;
      console.error("Feed video playback failed", cause);
      setError("Video could not play. Try the player controls again.");
    });
  };
  const claimPlayback = useExclusiveVideoPlayback({
    eligible: visible && autoplay && nearby,
    play,
    pause: () => { ++playbackAttempt.current; setLoading(false); video.current?.pause(); },
  });

  useEffect(() => {
    if (!visible) video.current?.pause();
  }, [visible]);

  return <div ref={ref} className="relative overflow-hidden rounded-lg bg-black"
    onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <video ref={video} src={nearby ? src : undefined} controls playsInline muted={muted}
      onVolumeChange={(event) => {
        if (event.currentTarget.muted !== getMuted()) setMuted(event.currentTarget.muted);
      }}
      preload="metadata" className="mx-auto block max-h-[70vh] w-full object-contain"
      onPlay={() => { claimPlayback(); setPaused(false); setLoading(true); }}
      onPlaying={() => { setError(null); setLoading(false); setPaused(false); }}
      onWaiting={() => setLoading(true)}
      onSeeking={() => { if (!video.current?.paused) setLoading(true); }}
      onSeeked={() => { if ((video.current?.readyState ?? 0) >= 3) setLoading(false); }}
      onPause={() => { setPaused(true); setLoading(false); }}
      onEnded={() => { setPaused(true); setLoading(false); }}
      onError={() => { setLoading(false); setError("Video could not load. Reload to retry."); }} />
    {!error && <VideoPlaybackOverlay loading={visible && loading} onPlay={paused && nearby ? play : undefined} />}
    {error && <p role="alert" className="p-3 text-sm text-white">{error}</p>}
  </div>;
}
