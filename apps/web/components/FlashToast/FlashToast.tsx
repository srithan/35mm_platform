"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "35mm-flash-toast";
const EVENT_NAME = "35mm:flash-toast";
const DEFAULT_DURATION_MS = 2600;

export type FlashToastTone = "success" | "error";

type FlashToastPayload = {
  message: string;
  tone: FlashToastTone;
};

export function showGlobalFlashToast(message: string, tone: FlashToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<FlashToastPayload>(EVENT_NAME, {
      detail: { message, tone },
    })
  );
}

export function queueFlashToast(message: string, tone: FlashToastTone = "success") {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ message, tone }));
}

function readQueuedFlashToast(): FlashToastPayload | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  sessionStorage.removeItem(STORAGE_KEY);

  try {
    const parsed = JSON.parse(stored) as FlashToastPayload;
    if (parsed && typeof parsed.message === "string") {
      return {
        message: parsed.message,
        tone: parsed.tone === "error" ? "error" : "success",
      };
    }
  } catch {
    return { message: stored, tone: "success" };
  }

  return null;
}

/** Compact glass-like pill — no backdrop-filter (too expensive on a fixed overlay). */
export function flashToastSurfaceClass(tone: FlashToastTone = "success") {
  return cn(
    "relative isolate w-max max-w-full overflow-hidden",
    "rounded-full border px-4 py-2.5 text-xs font-medium text-fg",
    "border-[color-mix(in_srgb,var(--fg)_12%,transparent)]",
    "bg-[linear-gradient(165deg,var(--elevated)_0%,color-mix(in_srgb,var(--fg)_7%,var(--sunken))_100%)]",
    "shadow-[0_10px_28px_-10px_color-mix(in_srgb,var(--bg)_50%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--fg)_18%,transparent)]",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:content-[''] before:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--fg)_10%,transparent),transparent_42%)]",
    tone === "error" && "border-[color-mix(in_srgb,var(--fg)_18%,transparent)]"
  );
}

const flashToastAnchorClass =
  "pointer-events-none fixed inset-x-0 z-[9999] flex justify-center px-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6";

export function FlashToast(props: { message: string; tone?: FlashToastTone }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={flashToastAnchorClass} role="status" aria-live="polite">
      <div className={cn("animate-fade-up", flashToastSurfaceClass(props.tone))}>
        <span className="relative z-[1]">{props.message}</span>
      </div>
    </div>,
    document.body
  );
}

export function useFlashToast(durationMs = DEFAULT_DURATION_MS) {
  function show(message: string, tone: FlashToastTone = "success") {
    showGlobalFlashToast(message, tone);
    void durationMs;
  }

  function Toast() {
    return null;
  }

  return { show, Toast };
}

export function FlashToastHost() {
  const pathname = usePathname();
  const [toast, setToast] = useState<FlashToastPayload | null>(null);
  const timerRef = useRef<number | null>(null);

  const displayToast = useCallback(function (message: string, tone: FlashToastTone = "success") {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setToast({ message, tone });
    timerRef.current = window.setTimeout(function () {
      setToast(null);
      timerRef.current = null;
    }, DEFAULT_DURATION_MS);
  }, []);

  useEffect(function () {
    function onFlashToast(event: Event) {
      const detail = (event as CustomEvent<FlashToastPayload>).detail;
      if (!detail?.message) return;
      displayToast(detail.message, detail.tone ?? "success");
    }

    window.addEventListener(EVENT_NAME, onFlashToast);
    return function () {
      window.removeEventListener(EVENT_NAME, onFlashToast);
    };
  }, [displayToast]);

  useEffect(function () {
    const queued = readQueuedFlashToast();
    if (queued) {
      displayToast(queued.message, queued.tone);
    }
  }, [pathname, displayToast]);

  useEffect(function () {
    return function () {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!toast) return null;
  return <FlashToast message={toast.message} tone={toast.tone} />;
}
