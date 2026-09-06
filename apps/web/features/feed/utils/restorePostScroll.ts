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
  // The URL can commit before the cached feed mounts. Wait for its DOM commit,
  // not a paint or a timer, and restore exactly once after slot layout effects.
  const observer = new MutationObserver(() => {
    const mounted = findAnchor();
    if (!mounted) return;
    stop();
    restore(mounted);
  });
  const stop = () => {
    observer.disconnect();
    clearTimeout(timeout);
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
      window.removeEventListener(event, stop, true);
  };
  const timeout = setTimeout(stop, 10_000);
  observer.observe(document.body, { childList: true, subtree: true });
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
    window.addEventListener(event, stop, { capture: true, passive: true });
  return stop;
}
