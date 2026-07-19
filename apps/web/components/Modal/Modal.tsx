"use client";

import { useEffect, useRef, useState, type RefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import { popModalFocusSnapshot, pushModalFocusSnapshot } from "@/lib/modal/focusStack";

type Focusable = HTMLElement & { disabled?: boolean };

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isElementHidden(el: HTMLElement): boolean {
  if (!el.isConnected) return true;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return true;
  let node: HTMLElement | null = el;
  while (node) {
    if (node.getAttribute("aria-hidden") === "true") return true;
    node = node.parentElement;
  }
  return false;
}

function getFocusableInContainer(container: HTMLElement): Focusable[] {
  return Array.from(container.querySelectorAll<Focusable>(FOCUSABLE_SELECTOR)).filter(
    function (el) {
      if (el.disabled) return false;
      if (el.getAttribute("tabindex") === "-1") return false;
      if (isElementHidden(el)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    }
  );
}

const PRIMARY_FIELD_SELECTOR =
  "input:not([disabled]):not([type='hidden']):not([type='button']), textarea:not([disabled]), select:not([disabled])";

function pickInitialFocusTarget(
  container: HTMLElement,
  initialFocusRef: RefObject<HTMLElement | null> | undefined,
  initialFocusWithinSelector: string | undefined
): HTMLElement {
  if (initialFocusRef && initialFocusRef.current) {
    return initialFocusRef.current;
  }
  if (initialFocusWithinSelector) {
    const scope = container.querySelector(initialFocusWithinSelector);
    if (scope instanceof HTMLElement) {
      const scoped = getFocusableInContainer(scope);
      for (let i = 0; i < scoped.length; i++) {
        const el = scoped[i];
        if (el.matches(PRIMARY_FIELD_SELECTOR)) {
          return el;
        }
      }
      if (scoped.length > 0) {
        return scoped[0];
      }
    }
  }
  const focusables = getFocusableInContainer(container);
  return focusables[0] || container;
}

export type ModalVariant = "centered" | "bottomSheet" | "lightbox" | "bare";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name when no visible title (required if ariaLabelledBy omitted). */
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /** dialog (default) or alertdialog for confirmations. */
  role?: "dialog" | "alertdialog";
  children: ReactNode;
  variant?: ModalVariant;
  /** Extra class for the full-screen container. */
  containerClassName?: string;
  /** Extra class for the backdrop. */
  backdropClassName?: string;
  /** Extra class for the content panel. */
  contentClassName?: string;
  /** Whether clicking the backdrop closes the modal. */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes the modal. */
  closeOnEsc?: boolean;
  /** Push/pop global focus stack on open/close (nested modals). */
  restoreFocus?: boolean;
  /** Optional element to focus first. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * When set, initial focus prefers the first text field inside this selector
   * (e.g. `[data-dialog-body]`) so header close buttons do not steal focus.
   */
  initialFocusWithinSelector?: string;
  /** Trap Tab within the modal panel. */
  trapFocus?: boolean;
  /** Lock document scroll while open. */
  lockScroll?: boolean;
  /** z-index: "modal" | "lightbox" or arbitrary Tailwind z class. */
  zIndex?: "modal" | "lightbox" | string;
  /** Framer Motion enter/exit. Set false for instant open/close (legacy viewers, confirms). */
  animated?: boolean;
  /** Sibling content rendered in the viewport below the panel (outside the panel box). */
  outsidePanel?: ReactNode;
}

const VARIANT_PANEL: Record<ModalVariant, string> = {
  centered:
    "relative max-h-[calc(100vh-32px)] w-full max-w-3xl overflow-hidden rounded-2xl bg-elevated border border-border shadow-2xl font-sans",
  bottomSheet:
    "relative max-h-[min(88dvh,680px)] w-full overflow-hidden rounded-t-[32px] bg-sunken pb-[env(safe-area-inset-bottom)] shadow-2xl font-sans",
  lightbox:
    "relative max-h-[90vh] w-full max-w-[min(96vw,56rem)] overflow-visible rounded-lg border border-white/10 bg-transparent shadow-2xl font-sans",
  bare: "relative w-full max-w-none overflow-visible rounded-none border-0 bg-transparent shadow-none font-sans",
};

const VARIANT_CONTAINER: Record<ModalVariant, string> = {
  centered: "fixed inset-0 flex items-center justify-center p-4 pointer-events-auto",
  bottomSheet: "fixed inset-0 flex items-end justify-center p-0 pointer-events-auto",
  lightbox: "fixed inset-0 flex items-center justify-center p-6 sm:p-10 pointer-events-auto",
  bare: "fixed inset-0 flex items-center justify-center p-0 pointer-events-auto",
};

const VARIANT_BACKDROP: Record<ModalVariant, string> = {
  centered: "absolute inset-0 bg-black/60 backdrop-blur-sm",
  bottomSheet:
    "absolute inset-0 bg-[rgb(15_15_15/0.38)] backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]",
  lightbox: "absolute inset-0 bg-black/85 backdrop-blur-md",
  bare: "absolute inset-0 bg-black/40 backdrop-blur-[2px]",
};

const VARIANT_PANEL_MOTION = {
  centered: {
    initial: { opacity: 0, scale: 0.98, y: 6 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 6 },
  },
  bottomSheet: {
    initial: { opacity: 1, scale: 1, y: "105%" },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 1, scale: 1, y: "105%" },
  },
  lightbox: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
  bare: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
} as const;

export function Modal({
  open,
  onClose,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  role = "dialog",
  children,
  variant = "centered",
  containerClassName,
  backdropClassName,
  contentClassName,
  closeOnBackdrop = true,
  closeOnEsc = true,
  restoreFocus = true,
  initialFocusRef,
  initialFocusWithinSelector,
  trapFocus = true,
  lockScroll = true,
  zIndex,
  animated = true,
  outsidePanel,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const dragControls = useDragControls();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const hasOutsidePanel = Boolean(outsidePanel);
  const onCloseRef = useRef(onClose);
  const wasOpenRef = useRef(false);
  const blockGhostClicksUntilRef = useRef(0);
  const savedBodyPointerEventsRef = useRef("");
  onCloseRef.current = onClose;

  useEffect(function () {
    setMounted(true);
  }, []);

  useEffect(
    function () {
      if (!open) return;
      if (restoreFocus) {
        pushModalFocusSnapshot(document.activeElement as HTMLElement | null);
      }
      return function () {
        if (restoreFocus) {
          popModalFocusSnapshot();
        }
      };
    },
    [open, restoreFocus]
  );

  useScrollLock(open && lockScroll);

  useEffect(
    function () {
      if (!open) return;
      savedBodyPointerEventsRef.current = document.body.style.pointerEvents;
      document.body.style.pointerEvents = "none";
      return function () {
        document.body.style.pointerEvents = savedBodyPointerEventsRef.current;
      };
    },
    [open]
  );

  useEffect(
    function () {
      if (wasOpenRef.current && !open) {
        blockGhostClicksUntilRef.current = Date.now() + 450;
      }
      wasOpenRef.current = open;
    },
    [open]
  );

  useEffect(function () {
    function blockGhostClick(e: Event) {
      if (Date.now() >= blockGhostClicksUntilRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    document.addEventListener("click", blockGhostClick, true);
    document.addEventListener("pointerdown", blockGhostClick, true);
    return function () {
      document.removeEventListener("click", blockGhostClick, true);
      document.removeEventListener("pointerdown", blockGhostClick, true);
    };
  }, []);

  useEffect(
    function () {
      if (!open || !trapFocus) return;
      const container = hasOutsidePanel ? viewportRef.current : contentRef.current;
      if (!container) return;

      const runFocus = function () {
        const target = pickInitialFocusTarget(
          container,
          initialFocusRef,
          initialFocusWithinSelector
        );
        target.focus({ preventScroll: true });
      };

      const raf = requestAnimationFrame(runFocus);

      const handleKey = function (e: KeyboardEvent) {
        const focusables = getFocusableInContainer(container);
        if (e.key === "Tab" && focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus({ preventScroll: true });
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus({ preventScroll: true });
            }
          }
        }
        if (closeOnEsc && e.key === "Escape") {
          e.stopPropagation();
          onCloseRef.current();
        }
      };

      container.addEventListener("keydown", handleKey);
      return function () {
        cancelAnimationFrame(raf);
        container.removeEventListener("keydown", handleKey);
      };
    },
    [open, closeOnEsc, initialFocusRef, initialFocusWithinSelector, trapFocus, hasOutsidePanel]
  );

  useEffect(
    function () {
      if (!open || trapFocus) return;
      if (!closeOnEsc) return;
      const onDoc = function (e: KeyboardEvent) {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCloseRef.current();
        }
      };
      document.addEventListener("keydown", onDoc, true);
      return function () {
        document.removeEventListener("keydown", onDoc, true);
      };
    },
    [open, closeOnEsc, trapFocus]
  );

  if (!mounted) return null;

  const defaultZ =
    variant === "lightbox" ? "z-[var(--z-modal-lightbox)]" : "z-[var(--z-modal)]";
  const zClass =
    zIndex === "lightbox"
      ? "z-[var(--z-modal-lightbox)]"
      : zIndex === "modal"
        ? "z-[var(--z-modal)]"
        : zIndex
          ? zIndex
          : defaultZ;

  const pm = VARIANT_PANEL_MOTION[variant];
  const viewportClassName = cn(
    VARIANT_CONTAINER[variant],
    zClass,
    containerClassName,
    hasOutsidePanel && "flex-col gap-6"
  );
  const panelClassName = cn(VARIANT_PANEL[variant], contentClassName);
  const dialogLabelProps = {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
  };
  const isBottomSheet = variant === "bottomSheet";
  const onBottomSheetDragEnd = function (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) {
    if (info.offset.y >= 96 || info.velocity.y >= 700) {
      onCloseRef.current();
    }
  };
  const bottomSheetDragProps = isBottomSheet
    ? {
        drag: "y" as const,
        dragConstraints: { top: 0, bottom: 0 },
        dragControls,
        dragElastic: { top: 0, bottom: 0.45 },
        dragListener: false,
        dragMomentum: false,
        onDragEnd: onBottomSheetDragEnd,
      }
    : {};
  const bottomSheetHandle = isBottomSheet ? (
    <div
      aria-hidden
      data-bottom-sheet-handle
      className="flex shrink-0 touch-none cursor-grab justify-center pb-3 pt-4 active:cursor-grabbing"
      onPointerDown={function (event) {
        dragControls.start(event);
      }}
    >
      <span className="h-[5px] w-10 rounded-full bg-border-strong/90" />
    </div>
  ) : null;

  if (!animated) {
    return createPortal(
      open ? (
        <div
          ref={hasOutsidePanel ? viewportRef : undefined}
          className={viewportClassName}
          {...(hasOutsidePanel
            ? { role, "aria-modal": true as const, ...dialogLabelProps }
            : {})}
        >
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className={cn(VARIANT_BACKDROP[variant], backdropClassName, "z-0")}
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <div
            role={hasOutsidePanel ? undefined : role}
            aria-modal={hasOutsidePanel ? undefined : true}
            {...(hasOutsidePanel ? {} : dialogLabelProps)}
            ref={contentRef}
            data-modal-variant={variant}
            className={cn(panelClassName, "relative z-10")}
            onPointerDown={function (e) {
              e.stopPropagation();
            }}
            onClick={function (e) {
              e.stopPropagation();
            }}
          >
            {bottomSheetHandle}
            {children}
          </div>
          {outsidePanel}
        </div>
      ) : null,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal-root"
          ref={hasOutsidePanel ? viewportRef : undefined}
          className={viewportClassName}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          {...(hasOutsidePanel
            ? { role, "aria-modal": true as const, ...dialogLabelProps }
            : {})}
        >
          <motion.button
            key="backdrop"
            type="button"
            aria-hidden
            tabIndex={-1}
            className={cn(VARIANT_BACKDROP[variant], backdropClassName, "z-0")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          <motion.div
            key="panel"
            role={hasOutsidePanel ? undefined : role}
            aria-modal={hasOutsidePanel ? undefined : true}
            {...(hasOutsidePanel ? {} : dialogLabelProps)}
            ref={contentRef}
            data-modal-variant={variant}
            initial={pm.initial}
            animate={pm.animate}
            exit={pm.exit}
            transition={
              isBottomSheet
                ? { type: "spring", damping: 30, stiffness: 320, mass: 0.85 }
                : { type: "spring", damping: 26, stiffness: 240, mass: 0.9 }
            }
            {...bottomSheetDragProps}
            className={cn(panelClassName, "relative z-10")}
            onPointerDown={function (e) {
              e.stopPropagation();
            }}
            onClick={function (e) {
              e.stopPropagation();
            }}
          >
            {bottomSheetHandle}
            {children}
          </motion.div>
          {outsidePanel}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
