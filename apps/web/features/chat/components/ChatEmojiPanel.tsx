"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Picker, {
  Categories,
  EmojiStyle,
  SkinTonePickerLocation,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { cn } from "@/lib/utils/cn";

const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🎬", "🔥", "👏"];
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
  const panelRef = useRef<HTMLDivElement>(null);

  const pickerStyleVars: CSSProperties = {
    ["--epr-emoji-size" as string]: variant === "composer" ? "24px" : "22px",
    ["--epr-emoji-padding" as string]: variant === "composer" ? "6px" : "5px",
    ["--epr-category-navigation-button-size" as string]:
      variant === "composer" ? "29px" : "27px",
    ["--epr-search-input-border-radius" as string]: "999px",
    ["--epr-search-input-height" as string]: variant === "composer" ? "46px" : "42px",
    ["--epr-skin-tone-size" as string]: "18px",
    ["--epr-horizontal-padding" as string]: variant === "composer" ? "12px" : "10px",
    ["--epr-header-padding" as string]:
      variant === "composer" ? "10px 10px 6px" : "8px 8px 5px",
    ["--epr-category-label-height" as string]: "0px",
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
    ? "w-[min(100vw-24px,336px)]"
    : variant === "composer"
      ? "w-[min(100vw-24px,356px)]"
      : "w-[min(100vw-24px,312px)]";

  const pickerHeight = pickerOnly
    ? 344
    : variant === "composer"
      ? 392
      : 286;

  return (
    <div
      ref={panelRef}
      data-chat-emoji-panel
      data-emoji-picker-surface
      className={cn(
        "absolute z-[80] overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#111111] shadow-xl",
        widthClass,
        variant === "composer" ? "bottom-full mb-2" : "bottom-full mb-1.5",
        align === "right" ? "right-0" : "left-0"
      )}
      style={{
        boxShadow:
          "0 22px 64px rgba(0,0,0,0.34), 0 8px 24px rgba(0,0,0,0.24)",
      }}
    >
      {!pickerOnly && variant !== "composer" ? (
        <div className="border-b border-white/[0.08] px-2.5 pb-1.5 pt-2">
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
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
                  className="h-9 w-9 rounded-xl text-[20px] leading-none transition-colors hover:bg-white/[0.12]"
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
          pickerOnly
            ? "h-[344px]"
            : variant === "composer"
              ? "h-[392px]"
              : "h-[286px]"
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
          emojiStyle={EmojiStyle.APPLE}
          theme={Theme.DARK}
          categories={EMOJI_CATEGORIES}
          skinTonesDisabled={false}
          skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
          searchDisabled={false}
          searchPlaceholder="Describe an Emoji"
          searchPlaceHolder="Describe an Emoji"
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
