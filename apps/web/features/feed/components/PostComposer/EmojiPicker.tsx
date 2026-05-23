"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import Picker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";

const CINEMA_EMOJIS = ["🎬", "🎞️", "📽️", "🎭", "⭐", "❤️", "🔥", "👁️"];

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
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (emoji: string) => {
      onInsert(emoji);
      onClose();
    },
    [onInsert, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, onClose, anchorRef]);

  return (
    isOpen && (
      <div
        ref={panelRef}
        data-emoji-panel
        className="absolute bottom-full mb-2 left-0 bg-elevated border border-border rounded-lg w-[296px] z-50 overflow-hidden"
        style={{
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div className="px-3 pt-2 pb-1.5 border-b border-border bg-elevated">
          <p className="text-[9px] font-semibold tracking-widest uppercase text-fg-faint px-1 mb-1">
            Cinema quick picks
          </p>
          <div className="grid grid-cols-8 gap-0.5">
            {CINEMA_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="text-[14px] p-0.5 rounded-md text-center leading-none hover:bg-sunken transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[230px] overflow-hidden">
          <Picker
            onEmojiClick={(emojiData: EmojiClickData) =>
              handleSelect(emojiData.emoji)
            }
            onReactionClick={(emojiData: EmojiClickData) =>
              handleSelect(emojiData.emoji)
            }
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
        `}</style>
      </div>
    )
  );
}
