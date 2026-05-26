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

export function FlashToast(props: { message: string; tone?: FlashToastTone }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed left-1/2 z-[9999] -translate-x-1/2 rounded-full px-4 py-2.5 text-xs font-medium shadow-lg",
        "bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6",
        props.tone === "error" ? "bg-accent text-white" : "bg-fg text-bg"
      )}
      role="status"
      aria-live="polite"
    >
      {props.message}
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
