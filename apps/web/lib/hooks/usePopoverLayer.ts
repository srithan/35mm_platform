import { useEffect, useLayoutEffect } from "react";

/**
 * Fixed popovers portaled to body: position on open, follow scroll/resize,
 * pointer-down outside dismiss, optional Escape (e.g. only while a submenu is open).
 */
export function usePopoverLayer(options: {
  open: boolean;
  reposition: () => void;
  isInside: (target: Node) => boolean;
  onPointerOutsideDismiss: () => void;
  onEscape?: () => void;
}) {
  const {
    open,
    reposition,
    isInside,
    onPointerOutsideDismiss,
    onEscape,
  } = options;

  useLayoutEffect(
    function () {
      if (!open) {
        return;
      }
      reposition();
    },
    [open, reposition]
  );

  useEffect(
    function () {
      if (!open) {
        return;
      }
      function onScrollOrResize() {
        reposition();
      }
      window.addEventListener("scroll", onScrollOrResize, true);
      window.addEventListener("resize", onScrollOrResize);
      return function () {
        window.removeEventListener("scroll", onScrollOrResize, true);
        window.removeEventListener("resize", onScrollOrResize);
      };
    },
    [open, reposition]
  );

  useEffect(
    function () {
      if (!open || !onEscape) {
        return;
      }
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape" && onEscape) {
          onEscape();
        }
      }
      window.addEventListener("keydown", onKey);
      return function () {
        window.removeEventListener("keydown", onKey);
      };
    },
    [open, onEscape]
  );

  useEffect(
    function () {
      if (!open) {
        return;
      }
      function onDown(e: MouseEvent) {
        const t = e.target as Node;
        if (isInside(t)) {
          return;
        }
        onPointerOutsideDismiss();
      }
      document.addEventListener("mousedown", onDown);
      return function () {
        document.removeEventListener("mousedown", onDown);
      };
    },
    [open, isInside, onPointerOutsideDismiss]
  );
}
