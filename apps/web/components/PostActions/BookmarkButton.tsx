"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/Icon/Icon";
import { BookmarkFolderPicker } from "./BookmarkFolderPicker";
import type { BookmarkFolderWithCount } from "@/features/bookmarks/types";

const LONG_PRESS_MS = 450;

interface BookmarkButtonProps {
  bookmarked: boolean;
  folderId?: string | null;
  hideLabel?: boolean;
  className?: string;
  disabled?: boolean;
  enableFolderPicker?: boolean;
  folders?: BookmarkFolderWithCount[];
  foldersLoading?: boolean;
  creatingFolder?: boolean;
  onToggle: () => void;
  onFolderSelect?: (folderId: string | null) => Promise<void> | void;
  onCreateFolder?: (name: string) => Promise<void>;
}

export function BookmarkButton({
  bookmarked,
  folderId = null,
  hideLabel = false,
  className,
  disabled = false,
  enableFolderPicker = false,
  folders = [],
  foldersLoading = false,
  creatingFolder = false,
  onToggle,
  onFolderSelect,
  onCreateFolder,
}: BookmarkButtonProps) {
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const clearLongPressTimer = useCallback(function () {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openPicker = useCallback(function () {
    if (!enableFolderPicker || !onFolderSelect || !onCreateFolder) return;
    setPickerOpen(true);
  }, [enableFolderPicker, onFolderSelect, onCreateFolder]);

  const toggleSave = useCallback(function () {
    if (disabled) return;
    onToggle();
    if (bookmarked) {
      setPickerOpen(false);
    }

    const btn = saveBtnRef.current;
    if (!btn) return;

    btn.classList.remove("save-pop");
    void btn.offsetWidth;
    btn.classList.add("save-pop");
    btn.addEventListener("animationend", function () {
      saveBtnRef.current?.classList.remove("save-pop");
    }, { once: true });
  }, [disabled, onToggle, bookmarked]);

  const handlePointerDown = useCallback(
    function (e: React.PointerEvent<HTMLButtonElement>) {
      if (disabled) return;
      if (!enableFolderPicker || e.button !== 0) return;
      longPressTriggeredRef.current = false;
      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(function () {
        longPressTriggeredRef.current = true;
        openPicker();
      }, LONG_PRESS_MS);
    },
    [clearLongPressTimer, disabled, enableFolderPicker, openPicker]
  );

  const handlePointerEnd = useCallback(function () {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleClick = useCallback(
    function (e: React.MouseEvent<HTMLButtonElement>) {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        e.preventDefault();
        return;
      }
      if (disabled) return;
      toggleSave();
    },
    [disabled, toggleSave]
  );

  const handleContextMenu = useCallback(
    function (e: React.MouseEvent<HTMLButtonElement>) {
      if (disabled) return;
      if (!enableFolderPicker) return;
      e.preventDefault();
      openPicker();
    },
    [disabled, enableFolderPicker, openPicker]
  );

  return (
    <>
      <button
        ref={saveBtnRef}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={handleContextMenu}
        className={cn("action-btn save-btn", className, bookmarked && "saved")}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Saved" : "Save"}
        aria-haspopup={enableFolderPicker ? "dialog" : undefined}
        title={enableFolderPicker ? "Tap to save · hold for folders" : undefined}
      >
        <Icon name="bookmark" fill={bookmarked ? "currentColor" : "none"} strokeWidth={1.6} />
        {!hideLabel && (
          <span className="action-count hidden md:inline">{bookmarked ? "Saved" : "Save"}</span>
        )}
      </button>

      {enableFolderPicker && onFolderSelect && onCreateFolder ? (
        <BookmarkFolderPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          bookmarked={bookmarked}
          folderId={folderId ?? null}
          folders={folders}
          foldersLoading={foldersLoading}
          creatingFolder={creatingFolder}
          onSelectFolder={onFolderSelect}
          onCreateFolder={onCreateFolder}
        />
      ) : null}
    </>
  );
}
