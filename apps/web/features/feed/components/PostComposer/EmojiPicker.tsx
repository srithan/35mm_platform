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

const PANEL_WIDTH_PX = 356;
const PANEL_MAX_HEIGHT_PX = 484;
const PANEL_MIN_HEIGHT_PX = 340;
const ESTIMATED_PANEL_HEIGHT_PX = 448;

const EMOJI_STYLE_MAP = {
  native: EmojiStyle.NATIVE,
  apple: EmojiStyle.APPLE,
  twitter: EmojiStyle.TWITTER,
  facebook: EmojiStyle.FACEBOOK,
} as const;

const EMOJI_CATEGORIES = [
  { category: Categories.SUGGESTED, name: "Frequently used" },
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
    ["--epr-emoji-padding" as string]: "6px",
    ["--epr-category-navigation-button-size" as string]: "29px",
    ["--epr-search-input-border-radius" as string]: "999px",
    ["--epr-search-input-height" as string]: "46px",
    ["--epr-skin-tone-size" as string]: "18px",
    ["--epr-horizontal-padding" as string]: "12px",
    ["--epr-header-padding" as string]: "10px 10px 6px",
    ["--epr-category-label-height" as string]: "0px",
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
      const pickerHeight = Math.max(PANEL_MIN_HEIGHT_PX, maxHeight);

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
        data-emoji-picker-surface
        className="fixed z-[calc(var(--z-composer)+2)] overflow-hidden overscroll-y-contain rounded-[22px] border border-white/[0.09] bg-[#111111]"
        style={{
          top: pos.top,
          left: pos.left,
          width: `min(${PANEL_WIDTH_PX}px, calc(100vw - 16px))`,
          maxHeight: pos.maxHeight,
          visibility: isPositioned ? "visible" : "hidden",
          boxShadow:
            "0 22px 64px rgba(0,0,0,0.34), 0 8px 24px rgba(0,0,0,0.24)",
        }}
      >
        <div className="min-h-0 touch-pan-y" style={{ height: pos.pickerHeight }}>
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
            theme={Theme.DARK}
            categories={EMOJI_CATEGORIES}
            defaultSkinTone={selectedSkinTone}
            onSkinToneChange={setSelectedSkinTone}
            skinTonesDisabled={false}
            skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
            searchPlaceholder="Describe an Emoji"
            searchPlaceHolder="Describe an Emoji"
            width="100%"
            height={pos.pickerHeight}
            emojiVersion="15.0"
            style={pickerStyleVars}
            previewConfig={{ showPreview: false }}
          />
        </div>
      </div>
    </BodyPortal>
  );
}
