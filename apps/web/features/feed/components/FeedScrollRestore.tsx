"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  SCROLL_KEY,
  RESTORE_FLAG_KEY,
  FROM_PATH_KEY,
  ANCHOR_KEY,
  FROM_HISTORY_LENGTH_KEY,
} from "./PostPageBackButton";
import { restorePostScroll } from "../utils/restorePostScroll";

const ROUTE_SCROLL_POSITIONS_KEY = "35mm.routeScrollPositions";
const MAX_ROUTE_SCROLL_POSITIONS = 120;

type RouteScrollEntry = {
  y: number;
  updatedAt: number;
};

function isPostDetailPage(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 3 && parts[1] === "post";
}

function routeScrollKey(pathname: string | null): string {
  return pathname || "/";
}

function readRouteScrollPositions(): Record<string, RouteScrollEntry> {
  try {
    const raw = sessionStorage.getItem(ROUTE_SCROLL_POSITIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, RouteScrollEntry>;
  } catch {
    return {};
  }
}

function writeRouteScrollPositions(positions: Record<string, RouteScrollEntry>) {
  try {
    const entries = Object.entries(positions)
      .filter(([, entry]) => Number.isFinite(entry.y) && entry.y >= 0)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .slice(0, MAX_ROUTE_SCROLL_POSITIONS);
    sessionStorage.setItem(
      ROUTE_SCROLL_POSITIONS_KEY,
      JSON.stringify(Object.fromEntries(entries))
    );
  } catch {
    // Best-effort UI state. Failing storage should not break navigation.
  }
}

function saveRouteScrollPosition(routeKey: string, y: number) {
  if (!Number.isFinite(y) || y < 0) return;
  const positions = readRouteScrollPositions();
  positions[routeKey] = {
    y,
    updatedAt: Date.now(),
  };
  writeRouteScrollPositions(positions);
}

function readRouteScrollPosition(routeKey: string): number | null {
  const entry = readRouteScrollPositions()[routeKey];
  if (!entry || !Number.isFinite(entry.y) || entry.y < 0) return null;
  return entry.y;
}

export function ScrollRestore() {
  const pathname = usePathname();
  const routeKeyRef = useRef(routeScrollKey(pathname));
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    let frame: number | null = null;
    const saveCurrentRoute = () => {
      frame = null;
      const routeKey = routeKeyRef.current;
      if (routeKey !== routeScrollKey(window.location.pathname)) return;
      saveRouteScrollPosition(routeKey, lastScrollYRef.current);
    };
    const scheduleSave = () => {
      lastScrollYRef.current = window.scrollY;
      if (frame !== null) return;
      frame = requestAnimationFrame(saveCurrentRoute);
    };
    const flushSave = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      saveRouteScrollPosition(routeKeyRef.current, window.scrollY);
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", scheduleSave, { passive: true });
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", flushSave);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      flushSave();
      window.removeEventListener("scroll", scheduleSave);
      window.removeEventListener("pagehide", flushSave);
      document.removeEventListener("visibilitychange", flushSave);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const previousPathname = routeKeyRef.current;
    const currentPathname = routeScrollKey(pathname);
    const pathChanged = previousPathname !== currentPathname;
    if (pathChanged) {
      saveRouteScrollPosition(previousPathname, lastScrollYRef.current);
      routeKeyRef.current = currentPathname;
    }

    const shouldRestore = sessionStorage.getItem(RESTORE_FLAG_KEY);
    const scrollY = sessionStorage.getItem(SCROLL_KEY);
    const fromPath = sessionStorage.getItem(FROM_PATH_KEY);
    const shouldRestoreCurrentPath =
      fromPath === currentPathname &&
      scrollY !== null &&
      (shouldRestore === "1" || isPostDetailPage(previousPathname));

    if (shouldRestoreCurrentPath) {
      const anchor = sessionStorage.getItem(ANCHOR_KEY);
      sessionStorage.removeItem(ANCHOR_KEY);
      sessionStorage.removeItem(RESTORE_FLAG_KEY);
      sessionStorage.removeItem(SCROLL_KEY);
      sessionStorage.removeItem(FROM_PATH_KEY);
      sessionStorage.removeItem(FROM_HISTORY_LENGTH_KEY);
      const y = Number(scrollY);
      if (Number.isFinite(y) && y >= 0) {
        return restorePostScroll(y, anchor);
      }
    }

    if (shouldRestore === "1") {
      sessionStorage.removeItem(ANCHOR_KEY);
      sessionStorage.removeItem(RESTORE_FLAG_KEY);
      sessionStorage.removeItem(SCROLL_KEY);
      sessionStorage.removeItem(FROM_PATH_KEY);
      sessionStorage.removeItem(FROM_HISTORY_LENGTH_KEY);
    }

    if (pathChanged) {
      const y = readRouteScrollPosition(currentPathname) ?? 0;
      const frame = requestAnimationFrame(() => {
        window.scrollTo(0, y);
        lastScrollYRef.current = y;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [pathname]);

  return null;
}
