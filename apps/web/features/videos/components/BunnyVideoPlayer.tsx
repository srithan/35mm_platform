"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSettingsQuery } from "@/features/settings/hooks/useSettings";
import { getVideoPlayback } from "../api/videoApi";
import { videoKeys } from "../hooks/queryKeys";
import { useVideoSound } from "../hooks/useVideoSound";
import { useExclusiveVideoPlayback } from "../hooks/useExclusiveVideoPlayback";
import { useVideoVisibility } from "../hooks/useVideoVisibility";
import { Loader2 } from "lucide-react";
import { VideoPlaybackOverlay } from "./VideoPlaybackOverlay";
import { useVideoKeyboardShortcuts } from "../hooks/useVideoKeyboardShortcuts";

export function BunnyVideoPlayer({ assetId, title = "Video" }: {
  assetId: string;
  title?: string;
}) {
  const { userId, isLoaded, getToken } = useAuth();
  const settings = useSettingsQuery();
  const autoplay = settings.data?.appearance.videoAutoplay ?? false;
  const { ref, nearby, visible } = useVideoVisibility();
  const queryClient = useQueryClient();
  const [pollBaseline, setPollBaseline] = useState(0);
  useEffect(() => setPollBaseline(0), [assetId, userId]);
  const playback = useQuery({
    queryKey: videoKeys.playback(assetId, userId ?? null),
    queryFn: async () => getVideoPlayback(assetId, await getToken()),
    enabled: nearby && isLoaded,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Reads only: encoding is driven by the worker, never by viewers.
    // Limit each visible watch period to 40 checks (~10 minutes).
    refetchInterval: (query) => visible && query.state.data &&
      "state" in query.state.data && query.state.data.state === "processing" &&
      !query.state.error && query.state.dataUpdateCount - pollBaseline < 40
        ? 15000 : false,
    refetchIntervalInBackground: false,
  });
  const src = useMemo(() => {
    if (!playback.data || !("embedUrl" in playback.data)) return undefined;
    const url = new URL(playback.data.embedUrl);
    // Playback is controlled through Player.js, so scrolling never reloads the iframe.
    url.searchParams.set("autoplay", "false");
    url.searchParams.set("muted", "true");
    url.searchParams.set("preload", "true");
    url.searchParams.set("responsive", "false");
    url.searchParams.set("disableAirplay", "true");
    return url.toString();
  }, [playback.data]);
  const width = playback.data?.width;
  const height = playback.data?.height;

  return (
    <div ref={ref} tabIndex={-1}
      className="relative mx-auto w-full overflow-hidden rounded-xl bg-neutral-200 text-fg"
      style={{ aspectRatio: width && height ? `${width} / ${height}` : "16 / 9",
        maxWidth: width && height ? `min(100%, ${70 * width / height}vh)` : undefined }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}>
      {src ? <BunnyFrame key={src} src={src} posterUrl={playback.data && "posterUrl" in playback.data ? playback.data.posterUrl : undefined} title={title} visible={visible} autoplay={autoplay} rootRef={ref} /> : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
          {playback.error ? <>
            <p role="alert" className="text-sm">{playback.error.message}</p>
            <button type="button" className="underline" onClick={() => void playback.refetch()}>Retry</button>
          </> : playback.data && "state" in playback.data ? <>
            {playback.data.state === "processing" && <Loader2 aria-hidden="true" className="h-8 w-8 motion-safe:animate-spin" />}
            <p role={playback.data.state === "failed" ? "alert" : "status"} className="text-sm">
              {playback.data.message}
            </p>
            {playback.data.state === "processing" && <button type="button" className="text-sm underline"
              onClick={() => {
                setPollBaseline(queryClient.getQueryState(videoKeys.playback(assetId, userId ?? null))?.dataUpdateCount ?? 0);
                void playback.refetch();
              }}>Check status</button>}
          </> : <VideoPlaybackOverlay loading={visible && playback.isFetching} />}
        </div>
      )}
    </div>
  );
}

function BunnyFrame({ src, posterUrl, title, visible, autoplay, rootRef }: {
  src: string; posterUrl?: string; title: string; visible: boolean; autoplay: boolean;
  rootRef: React.RefObject<HTMLDivElement | null>;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const { muted, getMuted, setMuted, volume } = useVideoSound();
  const soundRequest = useRef<{ listener: string; muted: boolean } | null>(null);
  const soundSequence = useRef(0);
  const seekSequence = useRef(0);
  const seekRequest = useRef<{ listener: string; delta: number } | null>(null);
  const seekTimeout = useRef<number>();
  const playing = useRef(false);
  const [ready, setReady] = useState(false);
  const [needsControls, setNeedsControls] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  // Snapshot the initial policy. Later viewport/settings changes use messages only.
  const [initialSrc] = useState(() => {
    const url = new URL(src);
    url.searchParams.set("autoplay", "false");
    url.searchParams.set("muted", String(getMuted()));
    return url.toString();
  });
  const origin = new URL(src).origin;
  const revealed = ready || needsControls;

  useEffect(() => {
    if (!ready) return;
    iframe.current?.contentWindow?.postMessage(JSON.stringify({
      context: "player.js", version: "0.0.11", method: "setVolume", value: volume * 100,
    }), origin);
  }, [ready, volume, origin]);

  const claimPlayback = useExclusiveVideoPlayback({
    eligible: ready && visible && autoplay,
    play: () => {
      const send = (method: string) => iframe.current?.contentWindow?.postMessage(
        JSON.stringify({ context: "player.js", version: "0.0.11", method }), origin);
      send(getMuted() ? "mute" : "unmute");
      send("play");
    },
    pause: () => {
      iframe.current?.contentWindow?.postMessage(
        JSON.stringify({ context: "player.js", version: "0.0.11", method: "pause" }), origin);
    },
  });

  useEffect(() => {
    const send = (method: string, value?: string | number) => iframe.current?.contentWindow?.postMessage(
      JSON.stringify({ context: "player.js", version: "0.0.11", method, value }), origin);
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== iframe.current?.contentWindow) return;
      let message: unknown;
      try { message = typeof event.data === "string" ? JSON.parse(event.data) : event.data; }
      catch { return; } // Other messages from the embed are not Player.js events.
      if (!message || typeof message !== "object" || !("context" in message) ||
          message.context !== "player.js" || !("event" in message)) return;
      if (message.event === "ready") {
        send("addEventListener", "play");
        send("addEventListener", "pause");
        send("addEventListener", "ended");
        send("addEventListener", "error");
        setReady(true);
      } else if (message.event === "play") {
        playing.current = true;
        claimPlayback();
      } else if (message.event === "pause" || message.event === "ended") {
        playing.current = false;
      } else if (message.event === "getMuted" && "listener" in message &&
          soundRequest.current && message.listener === soundRequest.current.listener &&
          soundRequest.current.muted === getMuted() && "value" in message &&
          typeof message.value === "boolean") {
        soundRequest.current = null;
        setMuted(message.value);
      } else if (message.event === "getCurrentTime" && "listener" in message &&
          seekRequest.current && message.listener === seekRequest.current.listener &&
          "value" in message && typeof message.value === "number" && Number.isFinite(message.value)) {
        const nextTime = Math.max(0, message.value + seekRequest.current.delta);
        seekRequest.current = null;
        if (seekTimeout.current !== undefined) window.clearTimeout(seekTimeout.current);
        send("setCurrentTime", nextTime);
      } else if (message.event === "error") {
        setNeedsControls(true);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [origin, claimPlayback, getMuted, setMuted]);

  useEffect(() => {
    if (!ready) return;
    iframe.current?.contentWindow?.postMessage(JSON.stringify({
      context: "player.js", version: "0.0.11", method: muted ? "mute" : "unmute",
    }), origin);
    // Player.js has no standard volume-change event. Read only visible players;
    // these messages stay in the browser and never call the playback API.
    if (!visible) return;
    const timer = window.setInterval(() => {
      const listener = `sound-${++soundSequence.current}`;
      soundRequest.current = { listener, muted: getMuted() };
      iframe.current?.contentWindow?.postMessage(JSON.stringify({
        context: "player.js", version: "0.0.11", method: "getMuted", listener,
      }), origin);
    }, 500);
    return () => {
      window.clearInterval(timer);
      soundRequest.current = null;
    };
  }, [ready, muted, visible, origin, getMuted]);

  useEffect(() => {
    if (!ready) return;
    const send = (method: string) => iframe.current?.contentWindow?.postMessage(
      JSON.stringify({ context: "player.js", version: "0.0.11", method }), origin);
    if (!visible || !autoplay) {
      send("pause");
    }
  }, [ready, visible, autoplay, origin]);

  useEffect(() => {
    if (!visible || revealed) return;
    // A blocked autoplay or failed provider must not leave an inaccessible hidden player.
    const timeout = window.setTimeout(() => setNeedsControls(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [visible, revealed]);

  useEffect(() => () => {
    if (seekTimeout.current !== undefined) window.clearTimeout(seekTimeout.current);
  }, []);

  const send = (method: string, value?: number) => iframe.current?.contentWindow?.postMessage(
    JSON.stringify({ context: "player.js", version: "0.0.11", method, value }), origin);
  const activateShortcuts = useVideoKeyboardShortcuts({
    enabled: ready,
    rootRef,
    iframeRef: iframe,
    playPause: () => {
      if (playing.current) {
        playing.current = false;
        send("pause");
      } else {
        playing.current = true;
        send(getMuted() ? "mute" : "unmute");
        send("play");
      }
    },
    seekBy: (delta) => {
      if (seekRequest.current) {
        seekRequest.current.delta += delta;
        return;
      }
      const listener = `seek-${++seekSequence.current}`;
      seekRequest.current = { listener, delta };
      seekTimeout.current = window.setTimeout(() => { seekRequest.current = null; }, 1500);
      iframe.current?.contentWindow?.postMessage(JSON.stringify({
        context: "player.js", version: "0.0.11", method: "getCurrentTime", listener,
      }), origin);
    },
    toggleMuted: () => setMuted(!getMuted()),
  });

  return <>
    <iframe ref={iframe} src={initialSrc} title={title}
      aria-hidden={!revealed} tabIndex={revealed ? 0 : -1}
      style={{ opacity: revealed ? 1 : 0, pointerEvents: revealed ? "auto" : "none" }}
      className="absolute inset-0 h-full w-full border-0 bg-black"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture 'none'; fullscreen"
      allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    {!revealed && <div className="pointer-events-none absolute inset-0 bg-neutral-200" aria-label="Video preview">
      {posterUrl && !posterFailed && <img src={posterUrl} alt="" referrerPolicy="strict-origin-when-cross-origin"
        className="h-full w-full object-contain" onError={() => setPosterFailed(true)} />}
    </div>}
    {!revealed && <VideoPlaybackOverlay loading={false} onPlay={() => {
      // Let the provider handle user gestures and report its real buffering state.
      activateShortcuts();
      setNeedsControls(true);
    }} />}
  </>;
}
