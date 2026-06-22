"use client";

import { useEffect } from "react";

const APP_SCROLLBAR_GUTTER_VAR = "--app-scrollbar-gutter";

let lockCount = 0;
let savedBodyPaddingRight = "";
let savedBodyOverflow = "";
let savedAppScrollbarGutter = "";

function scrollbarWidth() {
  if (typeof window === "undefined") return 0;
  return window.innerWidth - document.documentElement.clientWidth;
}

function lock() {
  lockCount++;
  if (lockCount !== 1) return;

  const root = document.documentElement;
  const body = document.body;
  const sw = scrollbarWidth();

  savedBodyPaddingRight = body.style.paddingRight;
  savedBodyOverflow = body.style.overflow;
  savedAppScrollbarGutter = root.style.getPropertyValue(APP_SCROLLBAR_GUTTER_VAR);

  /* Compensate on body so main content does not jump when the scrollbar is removed. */
  if (sw > 0) {
    const base = parseFloat(savedBodyPaddingRight);
    const extra = Number.isFinite(base) && savedBodyPaddingRight.trim() !== "" ? base : 0;
    body.style.paddingRight = `${extra + sw}px`;
  }

  /*
   * Fixed elements (e.g. SiteHeader) ignore body padding; mirror the gutter so they stay aligned.
   */
  root.style.setProperty(APP_SCROLLBAR_GUTTER_VAR, sw > 0 ? `${sw}px` : "0px");

  /*
   * Keep html overflow untouched so `scrollbar-gutter: stable` continues reserving
   * the scrollbar lane. Toggling html overflow removes the lane in some browsers
   * and causes centered layouts to shift when modals open.
   */
  body.style.overflow = "hidden";
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return;

  const root = document.documentElement;
  const body = document.body;

  body.style.overflow = savedBodyOverflow;
  body.style.paddingRight = savedBodyPaddingRight;
  savedBodyPaddingRight = "";
  savedBodyOverflow = "";

  if (savedAppScrollbarGutter.trim() === "") {
    root.style.removeProperty(APP_SCROLLBAR_GUTTER_VAR);
  } else {
    root.style.setProperty(APP_SCROLLBAR_GUTTER_VAR, savedAppScrollbarGutter);
  }
  savedAppScrollbarGutter = "";
}

export function useScrollLock(active: boolean) {
  useEffect(function () {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
