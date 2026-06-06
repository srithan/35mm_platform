"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Picker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { BodyPortal } from "@/components/BodyPortal/BodyPortal";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";

const CINEMA_EMOJIS = ["🎬", "🎞️", "📽️", "🎭", "⭐", "❤️", "🔥", "👁️"];
const PANEL_WIDTH_PX = 296;
const ESTIMATED_PANEL_HEIGHT_PX = 310;

const EMOJI_STYLE_MAP = {
  native: EmojiStyle.NATIVE,
  apple: EmojiStyle.APPLE,
  twitter: EmojiStyle.TWITTER,
  facebook: EmojiStyle.FACEBOOK,
} as const;

export type SupportedEmojiStyle = keyof typeof EMOJI_STYLE_MAP;

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (emoji: string) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  emojiStyle?: SupportedEmojiStyle;
}

export function EmojiPicker({
  isOpen,
  onClose,
  onInsert,
  anchorRef,
  emojiStyle = "native",
}: EmojiPickerProps) {
  const pickerStyleVars: CSSProperties = {
    ["--epr-emoji-size" as string]: "20px",
    ["--epr-category-navigation-button-size" as string]: "24px",
    ["--epr-category-icon-active-color" as string]: "#8f8f8f",
  };
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);

  const handleSelect = useCallback(
    function (emoji: string) {
      onInsert(emoji);
      onClose();
    },
    [onInsert, onClose]
  );

  const reposition = useCallback(
    function () {
      const btn = anchorRef.current;
      if (!btn) return;

      const panel = panelRef.current;
      const triggerRect = btn.getBoundingClientRect();
      const menuRect = panel?.getBoundingClientRect();
      const menuHeight =
        menuRect && menuRect.height > 0
          ? menuRect.height
          : ESTIMATED_PANEL_HEIGHT_PX;
      const menuWidth =
        menuRect && menuRect.width > 0 ? menuRect.width : PANEL_WIDTH_PX;
      const margin = 8;
      const sideOffset = 8;
      const spaceAbove = triggerRect.top - margin;
      const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
      const preferAbove =
        spaceAbove >= menuHeight || spaceAbove >= spaceBelow;

      var top = preferAbove
        ? triggerRect.top - menuHeight - sideOffset
        : triggerRect.bottom + sideOffset;
      var left = triggerRect.left;

      left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin));

      setPos({ top: top, left: left });
      setIsPositioned(true);
    },
    [anchorRef]
  );

  const scheduleReposition = useCallback(
    function () {
      reposition();
      window.requestAnimationFrame(function () {
        reposition();
        window.requestAnimationFrame(reposition);
      });
    },
    [reposition]
  );

  const setPanelRef = useCallback(
    function (node: HTMLDivElement | null) {
      panelRef.current = node;
      if (node && isOpen) {
        scheduleReposition();
      }
    },
    [isOpen, scheduleReposition]
  );

  const isInside = useCallback(
    function (target: Node) {
      if (anchorRef.current?.contains(target)) return true;
      if (panelRef.current?.contains(target)) return true;
      if (target instanceof Element && target.closest(".EmojiPickerReact")) {
        return true;
      }
      return false;
    },
    [anchorRef]
  );

  usePopoverLayer({
    open: isOpen,
    reposition: scheduleReposition,
    isInside: isInside,
    onPointerOutsideDismiss: onClose,
    onEscape: onClose,
  });

  useLayoutEffect(
    function () {
      if (!isOpen) {
        setIsPositioned(false);
        return;
      }
      scheduleReposition();
    },
    [isOpen, scheduleReposition]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <BodyPortal>
      <div
        ref={setPanelRef}
        data-emoji-panel
        className="fixed z-[calc(var(--z-composer)+2)] overflow-hidden overscroll-y-contain rounded-lg border border-border bg-elevated"
        style={{
          top: pos.top,
          left: pos.left,
          width: PANEL_WIDTH_PX,
          visibility: isPositioned ? "visible" : "hidden",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div className="border-b border-border bg-elevated px-3 pb-1.5 pt-2">
          <p className="mb-1 px-1 text-[9px] font-semibold uppercase tracking-widest text-fg-faint">
            Cinema quick picks
          </p>
          <div className="grid grid-cols-8 gap-0.5">
            {CINEMA_EMOJIS.map(function (emoji) {
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={function () {
                    handleSelect(emoji);
                  }}
                  className="rounded-md p-0.5 text-center text-[14px] leading-none transition-colors hover:bg-sunken"
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[230px] min-h-0 touch-pan-y">
          <Picker
            onEmojiClick={function (emojiData: EmojiClickData) {
              handleSelect(emojiData.emoji);
            }}
            onReactionClick={function (emojiData: EmojiClickData) {
              handleSelect(emojiData.emoji);
            }}
            lazyLoadEmojis={true}
            emojiStyle={EMOJI_STYLE_MAP[emojiStyle]}
            theme={Theme.LIGHT}
            skinTonesDisabled={false}
            searchDisabled={true}
            width="100%"
            height={200}
            emojiVersion="2.0"
            style={pickerStyleVars}
            previewConfig={{ showPreview: false }}
          />
        </div>
        <style jsx global>{`
          [data-emoji-panel] .EmojiPickerReact .epr-category-nav .epr-cat-btn.epr-active {
            background-position-y: 0 !important;
          }
          [data-emoji-panel] .EmojiPickerReact .epr-body {
            overflow-y: auto !important;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }
        `}</style>
      </div>
    </BodyPortal>
  );
}
