"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { QuotedPost } from "@/stores/useComposerModalStore";
import type { EditingPost } from "@/stores/useComposerModalStore";
import type { ComposerInitialMode } from "@/stores/useComposerModalStore";
import { PostComposer } from "../PostComposer";
import { Icon } from "@/components/Icon/Icon";

export interface PostComposerModalUser {
  name: string;
  avatarUrl: string | null;
  initial: string;
  handle?: string;
}

interface PostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: PostComposerModalUser;
  quotedPost?: QuotedPost | null;
  editingPost?: EditingPost | null;
  initialMode?: ComposerInitialMode | null;
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function useFocusTrap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  active: boolean
) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const el = containerRef.current;
    const focusable = Array.from<HTMLElement>(
      el.querySelectorAll(FOCUSABLE)
    ).filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus({ preventScroll: true });
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus({ preventScroll: true });
        }
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(max-width: 767px)").matches;
    }
    return false;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const listener = () => setIsMobile(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  return isMobile;
}

export function PostComposerModal({
  isOpen,
  onClose,
  user,
  quotedPost,
  editingPost,
  initialMode,
}: PostComposerModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const transformOrigin = !isMobile ? "top center" : undefined;

  useFocusTrap(modalRef, isOpen && !showDiscardConfirm && !isMobile);

  useEffect(
    function () {
      if (!isOpen || isMobile) return;

      function shouldAllowScroll(target: EventTarget | null) {
        if (!(target instanceof Node)) return false;
        if (dialogRef.current?.contains(target)) return true;
        if (target instanceof Element) {
          return Boolean(
            target.closest(
              "[data-emoji-panel], [data-composer-popover], .EmojiPickerReact"
            )
          );
        }
        return false;
      }

      function preventBackgroundScroll(ev: Event) {
        if (shouldAllowScroll(ev.target)) return;
        ev.preventDefault();
      }

      document.addEventListener("wheel", preventBackgroundScroll, { passive: false });
      document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });

      return function () {
        document.removeEventListener("wheel", preventBackgroundScroll);
        document.removeEventListener("touchmove", preventBackgroundScroll);
      };
    },
    [isOpen, isMobile]
  );

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose]);

  const handleKeepWriting = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  useEffect(() => {
    if (!isOpen) setShowDiscardConfirm(false);
  }, [isOpen]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (showDiscardConfirm) {
          handleKeepWriting();
        } else {
          handleClose();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const composer = modalRef.current?.querySelector("[data-composer-root]");
        const primary = composer?.querySelector(
          "[data-composer-primary-action]"
        ) as HTMLButtonElement | null;
        if (primary && !primary.disabled) primary.click();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, showDiscardConfirm, handleClose, handleKeepWriting]);

  if (!isMounted || !isOpen) return null;

  /** Narrow viewports use `/new` instead of this modal. */
  if (isMobile) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[var(--z-composer)] font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-composer-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--composer-backdrop)] backdrop-blur-[2px]"
        onClick={handleClose}
      />

      <div
        className="absolute inset-0 overflow-y-auto overscroll-y-contain"
        onClick={handleClose}
      >
        <div className="min-h-full flex items-end md:items-start md:pt-[12vh] md:px-4">
          {/* Modal card */}
          <motion.div
            ref={modalRef}
            initial={
              isMobile
                ? { y: "100%" }
                : { opacity: 0, scale: 0.85 }
            }
            animate={
              isMobile
                ? { y: 0 }
                : { opacity: 1, scale: 1 }
            }
            transition={{
              duration: isMobile ? 0.25 : 0.2,
              ease: "easeOut",
            }}
            className="relative mx-auto flex max-h-[92vh] w-full max-w-[580px] flex-col overflow-hidden border border-[var(--composer-border)] bg-[var(--composer-bg)]
              rounded-t-[var(--composer-radius)] rounded-b-none md:rounded-[var(--composer-radius)] md:rounded-b-[var(--composer-radius)]
              border-b-0 shadow-2xl pointer-events-auto will-change-transform md:border-b"
            style={{ transformOrigin }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle - mobile only */}
            <div
              className="md:hidden w-10 h-1 bg-sunken-2 rounded-full mx-auto mt-3 mb-1 flex-shrink-0"
              aria-hidden
            />

            {/* Composer */}
            <div data-composer-root className="min-w-0 relative">
              <PostComposer
                variant="modal"
                onDirtyChange={setIsDirty}
                onSubmit={() => onClose()}
                onClose={handleClose}
                quotedPost={quotedPost}
                editingPost={editingPost}
                initialMode={initialMode}
              />
            </div>

            {/* Discard confirmation overlay */}
            <AnimatePresence>
              {showDiscardConfirm && (
                <motion.div
                  key="discard-confirm"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--composer-bg)]/95 p-4 backdrop-blur-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex w-full max-w-[320px] flex-col items-center justify-center rounded-[var(--composer-dialog-radius)] border border-[var(--composer-border)] bg-[var(--composer-field-bg)] p-6 text-center shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-film-red">
                      <Icon name="trash-2" className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-semibold text-fg mb-2">
                      Discard post?
                    </h3>
                    <p className="text-[15px] text-fg-muted max-w-[260px] mx-auto mb-6">
                      This can't be undone and you'll lose your draft.
                    </p>

                    <div className="flex flex-col gap-2 w-full">
                      <button
                        type="button"
                        onClick={handleDiscard}
                        className="w-full bg-film-red text-white rounded-xl py-3 text-[15px] font-semibold transition-transform active:scale-[0.98]"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={handleKeepWriting}
                        className="w-full bg-sunken text-fg border border-border rounded-xl py-3 text-[15px] font-semibold transition-transform active:scale-[0.98]"
                      >
                        Keep writing
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>,
    document.body
  );
}
