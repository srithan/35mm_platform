"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";

type ShortcutActions = {
  enabled: boolean;
  rootRef: RefObject<HTMLElement | null>;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  playPause: () => void;
  seekBy: (seconds: number) => void;
  toggleMuted: () => void;
};

type Registration = ShortcutActions & { id: symbol; pointerInsideFrame: boolean };

const players = new Map<symbol, Registration>();
const iframeOwners = new WeakMap<HTMLIFrameElement, Registration>();
let activePlayer: symbol | null = null;
let removeGlobalListeners: (() => void) | null = null;

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

function handleKeyDown(event: KeyboardEvent) {
  const player = activePlayer ? players.get(activePlayer) : undefined;
  const root = player?.rootRef.current;
  if (!player?.enabled || !root || event.defaultPrevented || event.metaKey || event.ctrlKey ||
      event.altKey || isEditable(event.target)) return;
  if (event.target instanceof HTMLElement && event.target !== document.body &&
      event.target !== document.documentElement && !root.contains(event.target)) return;

  let action: (() => void) | undefined;
  switch (event.key.toLowerCase()) {
    case " ":
    case "k":
      if (!event.repeat) action = player.playPause;
      break;
    case "arrowleft":
    case "j":
      action = () => player.seekBy(-10);
      break;
    case "arrowright":
    case "l":
      action = () => player.seekBy(10);
      break;
    case "m":
      if (!event.repeat) action = player.toggleMuted;
      break;
    case "f":
      if (!event.repeat) action = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void root.requestFullscreen();
      };
      break;
  }
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  action();
}

function installGlobalListeners() {
  if (removeGlobalListeners) return;
  const clearOnOutsidePointer = (event: PointerEvent) => {
    const root = activePlayer ? players.get(activePlayer)?.rootRef.current : undefined;
    if (root && !root.contains(event.target as Node)) activePlayer = null;
  };
  const reclaimIframePointerFocus = () => {
    window.setTimeout(() => {
      const frame = document.activeElement;
      if (!(frame instanceof HTMLIFrameElement)) return;
      const player = iframeOwners.get(frame);
      if (!player?.pointerInsideFrame) return;
      activePlayer = player.id;
      player.rootRef.current?.focus({ preventScroll: true });
    });
  };
  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("blur", reclaimIframePointerFocus);
  document.addEventListener("pointerdown", clearOnOutsidePointer, true);
  removeGlobalListeners = () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("blur", reclaimIframePointerFocus);
    document.removeEventListener("pointerdown", clearOnOutsidePointer, true);
    removeGlobalListeners = null;
  };
}

/** Keep common playback keys attached to the last pointer-selected inline player. */
export function useVideoKeyboardShortcuts(options: ShortcutActions) {
  const registration = useRef<Registration>({
    ...options, id: Symbol("video-keyboard"), pointerInsideFrame: false,
  });
  Object.assign(registration.current, options);

  const activate = useCallback(() => {
    activePlayer = registration.current.id;
  }, []);

  useEffect(() => {
    const player = registration.current;
    const root = player.rootRef.current;
    const frame = player.iframeRef?.current;
    if (!root) return;
    players.set(player.id, player);
    installGlobalListeners();
    const enter = () => { player.pointerInsideFrame = true; };
    const leave = () => { player.pointerInsideFrame = false; };
    root.addEventListener("pointerdown", activate, true);
    if (frame) {
      iframeOwners.set(frame, player);
      frame.addEventListener("pointerenter", enter);
      frame.addEventListener("pointerleave", leave);
    }
    return () => {
      root.removeEventListener("pointerdown", activate, true);
      if (frame) {
        iframeOwners.delete(frame);
        frame.removeEventListener("pointerenter", enter);
        frame.removeEventListener("pointerleave", leave);
      }
      players.delete(player.id);
      if (activePlayer === player.id) activePlayer = null;
      if (players.size === 0) removeGlobalListeners?.();
    };
  }, [activate]);

  useEffect(() => {
    if (!options.enabled && activePlayer === registration.current.id) activePlayer = null;
  }, [options.enabled]);

  return activate;
}
