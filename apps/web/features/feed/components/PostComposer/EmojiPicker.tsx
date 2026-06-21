"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Picker, {
  Categories,
  EmojiStyle,
  SkinTonePickerLocation,
  SkinTones,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { BodyPortal } from "@/components/BodyPortal/BodyPortal";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";

const CINEMA_EMOJIS = ["🎬", "🎞️", "📽️", "🎭", "⭐", "❤️", "🔥", "👁️"];
const PANEL_WIDTH_PX = 296;
const PANEL_MAX_HEIGHT_PX = 420;
const PANEL_MIN_HEIGHT_PX = 280;
const QUICK_PICK_HEIGHT_PX = 62;
const ESTIMATED_PANEL_HEIGHT_PX = 340;

const EMOJI_STYLE_MAP = {
  native: EmojiStyle.NATIVE,
  apple: EmojiStyle.APPLE,
  twitter: EmojiStyle.TWITTER,
  facebook: EmojiStyle.FACEBOOK,
} as const;

const EMOJI_CATEGORIES = [
  { category: Categories.SMILEYS_PEOPLE, name: "Smileys & people" },
  { category: Categories.ANIMALS_NATURE, name: "Animals & nature" },
  { category: Categories.FOOD_DRINK, name: "Food & drink" },
  { category: Categories.TRAVEL_PLACES, name: "Travel & places" },
  { category: Categories.ACTIVITIES, name: "Activities" },
  { category: Categories.OBJECTS, name: "Objects" },
  { category: Categories.SYMBOLS, name: "Symbols" },
  { category: Categories.FLAGS, name: "Flags" },
];

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
    ["--epr-emoji-size" as string]: "24px",
    ["--epr-emoji-padding" as string]: "4px",
    ["--epr-category-navigation-button-size" as string]: "26px",
    ["--epr-category-icon-active-color" as string]: "#8f8f8f",
    ["--epr-search-input-border-radius" as string]: "999px",
    ["--epr-search-input-height" as string]: "36px",
    ["--epr-skin-tone-size" as string]: "18px",
  };
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    maxHeight: ESTIMATED_PANEL_HEIGHT_PX,
    pickerHeight: 230,
  });
  const [isPositioned, setIsPositioned] = useState(false);
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinTones>(SkinTones.NEUTRAL);

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
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportBottom = viewportTop + viewportHeight;
      const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const maxPanelHeight = Math.min(PANEL_MAX_HEIGHT_PX, viewportHeight - margin * 2);
      const preferredTop = triggerRect.bottom + sideOffset;
      const belowHeight = viewportBottom - preferredTop - margin;
      const targetHeight = Math.min(menuHeight, maxPanelHeight);

      let top = preferredTop;
      if (belowHeight < PANEL_MIN_HEIGHT_PX) {
        top = viewportBottom - targetHeight - margin;
      }

      let left = triggerRect.left;
      left = Math.max(
        viewportLeft + margin,
        Math.min(left, viewportLeft + viewportWidth - menuWidth - margin)
      );
      top = Math.max(viewportTop + margin, Math.min(top, viewportBottom - PANEL_MIN_HEIGHT_PX - margin));

      const availableHeight = Math.max(PANEL_MIN_HEIGHT_PX, viewportBottom - top - margin);
      const maxHeight = Math.min(maxPanelHeight, availableHeight);
      const pickerHeight = Math.max(220, maxHeight - QUICK_PICK_HEIGHT_PX);

      setPos({ top: top, left: left, maxHeight: maxHeight, pickerHeight: pickerHeight });
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
        className="fixed z-[calc(var(--z-composer)+2)] overflow-visible overscroll-y-contain rounded-lg border border-border bg-elevated"
        style={{
          top: pos.top,
          left: pos.left,
          width: PANEL_WIDTH_PX,
          maxHeight: pos.maxHeight,
          visibility: isPositioned ? "visible" : "hidden",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div className="min-h-0 touch-pan-y" style={{ maxHeight: pos.pickerHeight }}>
          <Picker
            key={`${emojiStyle}-${selectedSkinTone}`}
            onEmojiClick={function (emojiData: EmojiClickData) {
              handleSelect(emojiData.emoji);
            }}
            onReactionClick={function (emojiData: EmojiClickData) {
              handleSelect(emojiData.emoji);
            }}
            lazyLoadEmojis={true}
            emojiStyle={EMOJI_STYLE_MAP[emojiStyle]}
            theme={Theme.LIGHT}
            categories={EMOJI_CATEGORIES}
            defaultSkinTone={selectedSkinTone}
            onSkinToneChange={setSelectedSkinTone}
            skinTonesDisabled={false}
            skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
            width="100%"
            height={pos.pickerHeight}
            emojiVersion="2.0"
            style={pickerStyleVars}
            previewConfig={{ showPreview: false }}
          />
        </div>

        <div className="border-t border-border bg-elevated px-3 pb-1.5 pt-2">
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

        <style jsx global>{`
          [data-emoji-panel] .EmojiPickerReact {
            overflow: visible !important;
          }
          [data-emoji-panel] .EmojiPickerReact .epr-search-container input {
            border-radius: 999px !important;
          }
          [data-emoji-panel] .EmojiPickerReact .epr-skin-tones {
            overflow: visible !important;
            position: relative;
            z-index: 3;
          }
          [data-emoji-panel] .EmojiPickerReact .epr-category-nav .epr-cat-btn.epr-active {
            background-position-y: 0 !important;
          }
          [data-emoji-panel] .EmojiPickerReact .epr-body {
            overflow-y: auto !important;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }
          [data-emoji-panel] .EmojiPickerReact .epr-emoji-category-content,
          [data-emoji-panel] .EmojiPickerReact .epr-emoji-category-content > div {
            justify-content: center;
          }
        `}</style>
      </div>
    </BodyPortal>
  );
}
