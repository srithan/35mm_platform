/**
 * LIFO stack of elements to restore focus when nested modals close.
 * Each Modal layer pushes on open and pops on cleanup.
 */

const stack: Array<HTMLElement | null> = [];

export function pushModalFocusSnapshot(element: HTMLElement | null): void {
  stack.push(element);
}

export function popModalFocusSnapshot(): void {
  const el = stack.pop();
  if (el && typeof el.focus === "function") {
    try {
      if (document.contains(el)) {
        el.focus({ preventScroll: true });
      }
    } catch {
      /* ignore */
    }
  }
}

/** Clears the stack (vitest only; modals must be closed first). */
export function resetModalFocusStackForTests(): void {
  stack.length = 0;
}
