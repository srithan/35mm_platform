"use client";

import { useCallback, useRef, useState } from "react";
import { Archive, ArchiveRestore, Flag, Trash2 } from "lucide-react";
import { Icon } from "@/components/Icon/Icon";
import { cn } from "@/lib/utils/cn";
import { BodyPortal } from "@/components/BodyPortal/BodyPortal";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";

export type ChatHeaderMenuAction =
  | "delete"
  | "archive"
  | "unarchive"
  | "report";

const MENU_MIN_WIDTH_PX = 188;

interface ChatHeaderMoreMenuProps {
  onAction?: (action: ChatHeaderMenuAction) => void;
  align?: "left" | "right";
  /** When true, show Unarchive instead of Archive. */
  conversationArchived?: boolean;
}

export function ChatHeaderMoreMenu({
  onAction,
  align = "right",
  conversationArchived = false,
}: ChatHeaderMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(
    function (): void {
      const btn = btnRef.current;
      if (!btn) {
        return;
      }
      const rect = btn.getBoundingClientRect();
      const mw = MENU_MIN_WIDTH_PX;
      let left = align === "right" ? rect.right - mw : rect.left;
      const maxLeft = window.innerWidth - mw - 8;
      left = Math.max(8, Math.min(left, maxLeft));
      setPos({ top: rect.bottom + 4, left: left });
    },
    [align]
  );

  const dismiss = useCallback(function () {
    setOpen(false);
  }, []);

  const isInside = useCallback(function (t: Node): boolean {
    return !!(
      btnRef.current?.contains(t) || menuRef.current?.contains(t)
    );
  }, []);

  usePopoverLayer({
    open: open,
    reposition: updatePosition,
    isInside: isInside,
    onPointerOutsideDismiss: dismiss,
    onEscape: dismiss,
  });

  function emit(action: ChatHeaderMenuAction): void {
    onAction?.(action);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={function () {
          setOpen(function (v) {
            return !v;
          });
        }}
        className="p-2 rounded-xl text-fg-muted hover:text-fg hover:bg-hover transition-colors"
        aria-label="Chat options"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon name="more-horizontal" className="w-5 h-5" strokeWidth={2} />
      </button>
      {open ? (
        <BodyPortal>
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              "fixed z-[300] min-w-[188px] py-1 rounded-xl border border-border",
              "bg-elevated text-fg shadow-xl"
            )}
            style={{
              top: pos.top,
              left: pos.left,
              boxShadow:
                "0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2.5 text-left text-[13px] text-fg hover:bg-hover flex items-center gap-2"
              onClick={function () {
                emit(conversationArchived ? "unarchive" : "archive");
              }}
            >
              {conversationArchived ? (
                <ArchiveRestore
                  className="w-4 h-4 text-fg-muted shrink-0"
                  strokeWidth={2}
                />
              ) : (
                <Archive className="w-4 h-4 text-fg-muted shrink-0" strokeWidth={2} />
              )}
              {conversationArchived ? "Unarchive" : "Archive"}
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2.5 text-left text-[13px] text-fg hover:bg-hover flex items-center gap-2"
              onClick={function () {
                emit("report");
              }}
            >
              <Flag className="w-4 h-4 text-fg-muted shrink-0" strokeWidth={2} />
              Report
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2.5 text-left text-[13px] text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2"
              onClick={function () {
                emit("delete");
              }}
            >
              <Trash2 className="w-4 h-4 shrink-0" strokeWidth={2} />
              Delete
            </button>
          </div>
        </BodyPortal>
      ) : null}
    </div>
  );
}
