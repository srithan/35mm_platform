"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { BunnyVideoPlayer } from "./BunnyVideoPlayer";
import { FeedVideoPlayer } from "./FeedVideoPlayer";

type Media = { postId: string; assetId?: string; src?: string };
type Slot = { element: HTMLDivElement; path: string };
type Session = { media: Media; slots: Map<symbol, Slot>; retainedUntil: number; retainedFrom?: string; height: number; aspectRatio?: number };
type Registry = {
  attach: (media: Media, slot: Slot) => () => void;
  retain: (postId: string) => void;
};
const Context = createContext<Registry | null>(null);
const mediaKey = (media: Media) => JSON.stringify([media.postId, media.assetId ?? null, media.src ?? null]);
/**
 * Body-fixed players are JS-synced to a slot. WebKit pauses that sync during
 * momentum scroll and `position:fixed` uses visualViewport, so the iframe
 * smears, drifts, and punches through sticky chrome. Keep those players in flow.
 */
const IN_FLOW_VIDEO_QUERY = "(max-width: 767px), (hover: none) and (pointer: coarse)";

function prefersInFlowVideo(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(IN_FLOW_VIDEO_QUERY).matches;
}

function usePortaledVideo(): boolean {
  const [portaled, setPortaled] = useState(() => !prefersInFlowVideo());
  useLayoutEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(IN_FLOW_VIDEO_QUERY);
    const sync = () => setPortaled(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return portaled;
}

function visualViewportOffset(): { left: number; top: number } {
  const viewport = window.visualViewport;
  return { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0 };
}

function shellNavClipBottom(): number {
  const nav = document.getElementById(window.innerWidth >= 768 ? "site-nav" : "mobile-site-nav");
  if (!nav || nav.getAttribute("aria-hidden") === "true") return 0;
  return nav.getBoundingClientRect().bottom;
}

function stickyChromeClipBottom(videoRect: DOMRect): number {
  let bottom = 0;
  for (const chrome of document.querySelectorAll("[data-sticky-chrome]")) {
    const box = chrome.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    if (box.right <= videoRect.left || box.left >= videoRect.right) continue;
    bottom = Math.max(bottom, box.bottom);
  }
  return bottom;
}

/** Portaled media must not cover the shell nav or in-flow sticky page chrome. */
function portaledVideoClipInset(videoRect: DOMRect): number {
  const clipBottom = Math.max(shellNavClipBottom(), stickyChromeClipBottom(videoRect));
  return Math.max(0, clipBottom - videoRect.top);
}

/** The shell owns players; routes own only their positions. Never reparent a live iframe. */
export function PostVideoProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  return <PlayerRegistry key={userId ?? "anonymous"}>{children}</PlayerRegistry>;
}

function PlayerRegistry({ children }: { children: ReactNode }) {
  const path = usePathname();
  const portaled = usePortaledVideo();
  const sessions = useRef(new Map<string, Session>());
  // Geometry survives player disposal, not playback grants or DOM. Bounded per account.
  const geometry = useRef(new Map<string, number>());
  const rememberGeometry = useCallback((media: Media, ratio: number) => {
    const key = mediaKey(media);
    geometry.current.delete(key);
    geometry.current.set(key, ratio);
    if (geometry.current.size > 256) geometry.current.delete(geometry.current.keys().next().value!);
  }, []);
  const [, refresh] = useState(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const notify = useCallback(() => refresh(value => value + 1), []);
  const attach = useCallback((media: Media, slot: Slot) => {
    const key = mediaKey(media);
    let session = sessions.current.get(key);
    if (!session) {
      session = { media, slots: new Map(), retainedUntil: 0, height: 0, aspectRatio: geometry.current.get(key) };
      sessions.current.set(key, session);
    }
    const token = Symbol();
    if (session.retainedFrom && session.retainedFrom !== slot.path) {
      session.retainedUntil = 0;
      session.retainedFrom = undefined;
    }
    session.slots.set(token, slot);
    if (session.aspectRatio) {
      slot.element.style.height = `${Math.min(slot.element.getBoundingClientRect().width / session.aspectRatio, window.innerHeight * 0.7)}px`;
    } else if (session.height) slot.element.style.height = `${session.height}px`;
    notify();
    return () => {
      session.slots.delete(token);
      // A route can detach and attach in the same commit. Defer disposal until it finishes.
      const dispose = () => {
        if (session.slots.size || sessions.current.get(key) !== session) return;
        const remaining = session.retainedUntil - Date.now();
        if (remaining > 0) {
          const timer = setTimeout(() => { timers.current.delete(timer); dispose(); }, remaining);
          timers.current.add(timer);
        } else {
          sessions.current.delete(key);
          notify();
        }
      };
      queueMicrotask(dispose);
    };
  }, [notify]);
  const retain = useCallback((postId: string) => {
    for (const session of sessions.current.values()) {
      session.retainedUntil = session.media.postId === postId ? Date.now() + 10_000 : 0;
      session.retainedFrom = session.media.postId === postId ? path : undefined;
    }
  }, [path]);
  const registry = useMemo<Registry | null>(() => portaled ? { attach, retain } : null, [portaled, attach, retain]);
  useLayoutEffect(() => {
    if (portaled || !sessions.current.size) return;
    sessions.current.clear();
    notify();
  }, [portaled, notify]);
  useLayoutEffect(() => {
    let removed = false;
    for (const [key, session] of sessions.current) {
      if (session.retainedFrom && path !== session.retainedFrom &&
          !path.endsWith(`/post/${encodeURIComponent(session.media.postId)}`)) {
        session.retainedUntil = 0;
        session.retainedFrom = undefined;
        if (!session.slots.size) {
          sessions.current.delete(key);
          removed = true;
        }
      }
    }
    if (removed) notify();
  }, [path, notify]);
  useLayoutEffect(() => () => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current.clear();
  }, []);
  return <Context.Provider value={registry}>
    {children}
    {portaled && typeof document !== "undefined" && createPortal(
      Array.from(sessions.current, ([key, session]) =>
        <PlayerSurface key={key} session={session} path={path} rememberGeometry={rememberGeometry} />), document.body)}
  </Context.Provider>;
}

function PlayerSurface({ session, path, rememberGeometry }: { session: Session; path: string; rememberGeometry: (media: Media, ratio: number) => void }) {
  const surface = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = surface.current;
    if (!element) return;
    let frame = 0;
    const position = () => {
      const slots = Array.from(session.slots.values());
      const slot = slots.find(slot => slot.path === path && slot.element.isConnected)
        ?? slots.find(slot => slot.element.isConnected);
      if (!slot) return; // During navigation the live surface keeps its last position.
      const rect = slot.element.getBoundingClientRect();
      const viewport = visualViewportOffset();
      element.style.left = `${rect.left - viewport.left}px`;
      element.style.top = `${rect.top - viewport.top}px`;
      element.style.width = `${rect.width}px`;
      element.style.visibility = rect.width > 0 ? "visible" : "hidden";
      element.inert = Boolean(slot.element.closest("[inert]"));
      if (element.inert) element.style.visibility = "hidden";
      const clip = `inset(${portaledVideoClipInset(rect)}px 0 0)`;
      element.style.clipPath = clip;
      element.style.setProperty("-webkit-clip-path", clip);
      const height = element.getBoundingClientRect().height;
      if (height > 0 && Math.abs(height - slot.element.getBoundingClientRect().height) > 0.5) {
        slot.element.style.height = `${height}px`;
      }
      if (height > 0) session.height = height;
      const ratio = Number((element.firstElementChild as HTMLElement | null)?.dataset.videoAspectRatio);
      if (Number.isFinite(ratio) && ratio > 0) {
        session.aspectRatio = ratio;
        rememberGeometry(session.media, ratio);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; position(); });
    };
    position();
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    for (const slot of session.slots.values()) observer.observe(slot.element);
    // Ancestor resizing includes loaded images/content above the video.
    observer.observe(document.body);
    const attributes = new MutationObserver(schedule);
    for (const slot of session.slots.values()) {
      for (let ancestor = slot.element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        observer.observe(ancestor);
        attributes.observe(ancestor, { attributes: true, attributeFilter: ["inert"] });
      }
    }
    const mobileNav = document.getElementById("mobile-site-nav");
    if (mobileNav) attributes.observe(mobileNav, { attributes: true, attributeFilter: ["aria-hidden"] });
    for (const chrome of document.querySelectorAll("[data-sticky-chrome]")) {
      observer.observe(chrome);
    }
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const viewport = window.visualViewport;
    viewport?.addEventListener("scroll", schedule);
    viewport?.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      attributes.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      viewport?.removeEventListener("resize", schedule);
    };
  });
  return <div ref={surface} data-post-video={session.media.postId}
    style={{ position: "fixed", zIndex: "var(--z-post-video)", visibility: "hidden" }}>
    {session.media.assetId
      ? <BunnyVideoPlayer assetId={session.media.assetId} initialAspectRatio={session.aspectRatio} />
      : session.media.src ? <FeedVideoPlayer src={session.media.src} initialAspectRatio={session.aspectRatio} /> : null}
  </div>;
}

export function useRetainPostVideo() {
  return useContext(Context)?.retain;
}

export function PostVideoSlot({ postId, assetId, src }: Media) {
  const registry = useContext(Context);
  const attach = registry?.attach;
  const path = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!attach || !ref.current) return;
    return attach({ postId, assetId, src }, { element: ref.current, path });
  }, [attach, postId, assetId, src, path]);
  if (!registry) return assetId ? <BunnyVideoPlayer assetId={assetId} />
    : src ? <FeedVideoPlayer src={src} /> : null;
  return <div ref={ref} data-post-video-slot={postId} className="w-full" />;
}
