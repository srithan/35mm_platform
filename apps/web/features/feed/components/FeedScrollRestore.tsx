"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { PROFILE_TAB_SEGMENTS } from "@/features/profile/lib/profileRoutes";
import {
  SCROLL_KEY,
  RESTORE_FLAG_KEY,
  FROM_PATH_KEY,
  ANCHOR_KEY,
} from "./PostPageBackButton";
import { restorePostScroll } from "../utils/restorePostScroll";

function isSameProfilePage(previousPathname: string, pathname: string): boolean {
  const previousParts = previousPathname.split("/").filter(Boolean);
  const parts = pathname.split("/").filter(Boolean);
  if (
    previousParts[0] !== parts[0] ||
    previousParts.length > 2 ||
    parts.length > 2
  ) {
    return false;
  }

  const isProfilePath = (segments: string[]) =>
    segments.length === 1 ||
    (segments.length === 2 &&
      PROFILE_TAB_SEGMENTS.includes(
        segments[1] as (typeof PROFILE_TAB_SEGMENTS)[number]
      ));

  return isProfilePath(previousParts) && isProfilePath(parts);
}

function isPostDetailPage(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 3 && parts[1] === "post";
}

export function ScrollRestore() {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    const shouldRestore = sessionStorage.getItem(RESTORE_FLAG_KEY);
    const scrollY = sessionStorage.getItem(SCROLL_KEY);
    const fromPath = sessionStorage.getItem(FROM_PATH_KEY);
    const shouldRestoreCurrentPath =
      fromPath === pathname &&
      scrollY !== null &&
      (shouldRestore === "1" || isPostDetailPage(previousPathname));

    if (shouldRestoreCurrentPath) {
      const anchor = sessionStorage.getItem(ANCHOR_KEY);
      sessionStorage.removeItem(ANCHOR_KEY);
      sessionStorage.removeItem(RESTORE_FLAG_KEY);
      sessionStorage.removeItem(SCROLL_KEY);
      sessionStorage.removeItem(FROM_PATH_KEY);
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
    }

    if (
      previousPathname !== pathname &&
      !isSameProfilePage(previousPathname, pathname)
    ) {
      const frame = requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [pathname]);

  return null;
}
