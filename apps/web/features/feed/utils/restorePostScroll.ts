/** Called after route slots reserve their known dimensions, before paint. */
export function restorePostScroll(y: number, savedAnchor: string | null) {
  let anchor: { id: string; top: number } | undefined;
  if (savedAnchor) {
    try {
      const value: unknown = JSON.parse(savedAnchor);
      if (value && typeof value === "object" && "id" in value && "top" in value &&
          typeof value.id === "string" && typeof value.top === "number" && Number.isFinite(value.top)) {
        anchor = { id: value.id, top: value.top };
      }
    } catch {
      // Invalid session data falls back to the saved absolute scroll position.
      anchor = undefined;
    }
  }
  const findAnchor = () => anchor ? document.querySelector<HTMLElement>(
      `[data-post-scroll-anchor="${CSS.escape(anchor.id)}"]`) : null;
  const restore = (element: HTMLElement | null) => {
    const target = element && anchor
      ? window.scrollY + element.getBoundingClientRect().top - anchor.top : y;
    window.scrollTo(0, Math.max(0, target));
  };
  const element = findAnchor();
  if (!anchor || element) {
    restore(element);
    return;
  }
  // Virtualized feeds need the absolute scroll first so the target row can mount.
  // For delayed rows, retry the same Y instead of anchor-correcting after paint.
  let observer: MutationObserver | null = null;
  let frame: number | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
    if (timeout !== null) clearTimeout(timeout);
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
      window.removeEventListener(event, stop, true);
  };

  const tryRestore = () => {
    if (stopped || frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (stopped) return;
      const mounted = findAnchor();
      if (mounted) {
        stop();
        restore(null);
        return;
      }
      restore(null);
    });
  };

  restore(null);
  observer = new MutationObserver(() => {
    const mounted = findAnchor();
    if (!mounted) {
      tryRestore();
      return;
    }
    stop();
    restore(null);
  });
  timeout = setTimeout(stop, 10_000);
  observer.observe(document.body, { childList: true, subtree: true });
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
    window.addEventListener(event, stop, { capture: true, passive: true });
  return stop;
}
