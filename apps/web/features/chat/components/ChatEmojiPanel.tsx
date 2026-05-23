"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Picker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { useTheme } from "@/lib/theme/useTheme";
import { cn } from "@/lib/utils/cn";

const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🎬", "🔥", "👏"];

interface ChatEmojiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Wider panel + search for composer */
  variant?: "composer" | "bubble";
  align?: "left" | "right";
  /** Only the searchable grid (e.g. opened from + on message reactions) */
  pickerOnly?: boolean;
  /** Pointer events inside this ref do not dismiss (e.g. quick reaction bar + smile) */
  dismissInsideRef?: React.RefObject<HTMLElement | null>;
}

export function ChatEmojiPanel({
  isOpen,
  onClose,
  onPick,
  anchorRef,
  variant = "bubble",
  align = "left",
  pickerOnly = false,
  dismissInsideRef,
}: ChatEmojiPanelProps) {
  const { resolvedTheme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const pickerTheme =
    resolvedTheme === "light" || resolvedTheme === "barbie"
      ? Theme.LIGHT
      : Theme.DARK;

  const pickerStyleVars: CSSProperties = {
    ["--epr-emoji-size" as string]: variant === "composer" ? "22px" : "20px",
    ["--epr-category-navigation-button-size" as string]: "26px",
  };

  useEffect(
    function () {
      if (!isOpen) {
        return;
      }
      function onPointerDown(e: PointerEvent) {
        const target = e.target as Node | null;
        if (!target) {
          return;
        }
        if (panelRef.current && panelRef.current.contains(target)) {
          return;
        }
        if (anchorRef.current && anchorRef.current.contains(target)) {
          return;
        }
        if (
          dismissInsideRef &&
          dismissInsideRef.current &&
          dismissInsideRef.current.contains(target)
        ) {
          return;
        }
        onClose();
      }
      document.addEventListener("pointerdown", onPointerDown);
      return function () {
        document.removeEventListener("pointerdown", onPointerDown);
      };
    },
    [isOpen, onClose, anchorRef, dismissInsideRef]
  );

  if (!isOpen) {
    return null;
  }

  const widthClass = pickerOnly
    ? "w-[min(100vw-24px,320px)]"
    : variant === "composer"
      ? "w-[min(100vw-24px,340px)]"
      : "w-[min(100vw-24px,300px)]";

  const pickerHeight = pickerOnly
    ? 300
    : variant === "composer"
      ? 300
      : 240;

  return (
    <div
      ref={panelRef}
      data-chat-emoji-panel
      className={cn(
        "absolute z-[80] rounded-2xl border border-border bg-elevated/95 backdrop-blur-md shadow-xl overflow-hidden",
        widthClass,
        variant === "composer" ? "bottom-full mb-2" : "bottom-full mb-1.5",
        align === "right" ? "right-0" : "left-0"
      )}
      style={{
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {!pickerOnly ? (
        <div className="px-2.5 pt-2 pb-1.5 border-b border-border">
          <p className="text-[10px] font-semibold tracking-wide uppercase text-fg-muted px-1 mb-1">
            Quick
          </p>
          <div className="flex flex-wrap gap-1">
            {QUICK.map(function (emoji) {
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={function () {
                    onPick(emoji);
                  }}
                  className="text-[20px] leading-none w-9 h-9 rounded-xl hover:bg-hover transition-colors"
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          "overflow-hidden",
          pickerOnly ? "max-h-[320px]" : variant === "composer" ? "max-h-[320px]" : "max-h-[260px]"
        )}
      >
        <Picker
          onEmojiClick={function (data: EmojiClickData) {
            onPick(data.emoji);
          }}
          onReactionClick={function (data: EmojiClickData) {
            onPick(data.emoji);
          }}
          lazyLoadEmojis={true}
          emojiStyle={EmojiStyle.NATIVE}
          theme={pickerTheme}
          skinTonesDisabled={false}
          searchDisabled={false}
          width="100%"
          height={pickerHeight}
          emojiVersion="15.0"
          style={pickerStyleVars}
          previewConfig={{ showPreview: false }}
        />
      </div>
    </div>
  );
}
