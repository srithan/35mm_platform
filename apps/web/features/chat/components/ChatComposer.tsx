"use client";

import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { ArrowUp, FolderOpen, ImagePlus, Paperclip, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ChatSendPayload } from "../types";
import { ChatEmojiPanel } from "./ChatEmojiPanel";
import { TenorGifPicker } from "./TenorGifPicker";

export interface ChatComposerReplyTarget {
  id: string;
  snippet: string;
  isOwn: boolean;
}

export interface ChatComposerEditTarget {
  id: string;
  text: string;
}

interface ChatComposerProps {
  onSend: (payload: ChatSendPayload) => void;
  editingMessage?: ChatComposerEditTarget | null;
  onSaveEdit?: (messageId: string, body: string) => void;
  onCancelEdit?: () => void;
  disabled?: boolean;
  isSending?: boolean;
  onFocusChange?: (focused: boolean) => void;
  replyingTo: ChatComposerReplyTarget | null;
  onCancelReply: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return String(bytes) + " B";
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(bytes < 10240 ? 1 : 0) + " KB";
  }
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

type PendingMedia =
  | { kind: "gif"; url: string }
  | { kind: "image"; dataUrl: string }
  | { kind: "file"; name: string; sizeLabel?: string };

export function ChatComposer({
  onSend,
  editingMessage = null,
  onSaveEdit,
  onCancelEdit,
  disabled = false,
  isSending = false,
  onFocusChange,
  replyingTo,
  onCancelReply,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<PendingMedia | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);
  const attachBtnRef = useRef<HTMLButtonElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const desktopPhotoInputRef = useRef<HTMLInputElement>(null);
  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const previousEditingIdRef = useRef<string | null>(null);

  useEffect(
    function syncEditTargetIntoInput() {
      const previousId = previousEditingIdRef.current;
      const nextId = editingMessage?.id ?? null;
      if (previousId === nextId) {
        return;
      }
      previousEditingIdRef.current = nextId;
      if (editingMessage) {
        setValue(editingMessage.text);
        setPending(null);
        setShowEmoji(false);
        setShowGif(false);
        setAttachOpen(false);
        requestAnimationFrame(function () {
          taRef.current?.focus();
          const len = editingMessage.text.length;
          taRef.current?.setSelectionRange(len, len);
        });
      } else if (previousId) {
        setValue("");
      }
    },
    [editingMessage]
  );

  useEffect(
    function () {
      const el = taRef.current;
      if (!el) {
        return;
      }
      el.style.height = "auto";
      el.style.height = Math.min(120, el.scrollHeight) + "px";
    },
    [value]
  );

  useEffect(
    function () {
      if (!attachOpen) {
        return;
      }
      function close(e: MouseEvent) {
        const t = e.target as Node;
        if (attachBtnRef.current && attachBtnRef.current.contains(t)) {
          return;
        }
        const menu = document.querySelector("[data-chat-attach-menu]");
        if (menu && menu.contains(t)) {
          return;
        }
        setAttachOpen(false);
      }
      document.addEventListener("mousedown", close);
      return function () {
        document.removeEventListener("mousedown", close);
      };
    },
    [attachOpen]
  );

  function buildPayload(): ChatSendPayload | null {
    const text = value.trim();
    const hasPending = Boolean(pending);
    if (!text && !hasPending) {
      return null;
    }
    const payload: ChatSendPayload = { text: text };
    if (replyingTo) {
      payload.replyToId = replyingTo.id;
    }
    if (pending) {
      if (pending.kind === "gif") {
        payload.gifUrl = pending.url;
      } else if (pending.kind === "image") {
        payload.imageDataUrl = pending.dataUrl;
      } else {
        payload.file = {
          name: pending.name,
          sizeLabel: pending.sizeLabel,
        };
      }
    }
    return payload;
  }

  function submit(): void {
    if (editingMessage) {
      const next = value.trim();
      if (!next || disabled || isSending) {
        return;
      }
      if (next === editingMessage.text.trim()) {
        onCancelEdit?.();
        return;
      }
      onSaveEdit?.(editingMessage.id, next);
      return;
    }
    const payload = buildPayload();
    if (!payload || disabled || isSending) {
      return;
    }
    onSend(payload);
    setValue("");
    setPending(null);
    if (taRef.current) {
      taRef.current.style.height = "auto";
    }
    taRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Escape" && editingMessage) {
      e.preventDefault();
      onCancelEdit?.();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function readImageFile(file: File): void {
    if (!file.type.startsWith("image/")) {
      setPending({
        kind: "file",
        name: file.name,
        sizeLabel: formatFileSize(file.size),
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const r = reader.result;
      if (typeof r === "string") {
        setPending({ kind: "image", dataUrl: r });
      }
    };
    reader.readAsDataURL(file);
  }

  function onPhotoVideoChange(e: ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) {
      return;
    }
    if (f.type.startsWith("video/")) {
      setPending({
        kind: "file",
        name: f.name,
        sizeLabel: formatFileSize(f.size),
      });
      return;
    }
    readImageFile(f);
  }

  function onAnyFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) {
      return;
    }
    if (f.type.startsWith("image/")) {
      readImageFile(f);
      return;
    }
    setPending({
      kind: "file",
      name: f.name,
      sizeLabel: formatFileSize(f.size),
    });
  }

  const payloadPreview = buildPayload();
  const canSend =
    editingMessage
      ? Boolean(value.trim()) && !disabled && !isSending
      : Boolean(payloadPreview) && !disabled && !isSending;
  const isEditing = editingMessage != null;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        aria-hidden
        onChange={onPhotoVideoChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        aria-hidden
        onChange={onAnyFileChange}
      />
      <input
        ref={desktopPhotoInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        aria-hidden
        onChange={onPhotoVideoChange}
      />
      <input
        ref={desktopFileInputRef}
        type="file"
        className="hidden"
        aria-hidden
        onChange={onAnyFileChange}
      />

      {isEditing ? (
        <div className="flex items-start gap-2 rounded-xl border border-[#007AFF]/25 bg-[#007AFF]/[0.08] px-3 py-2">
          <div className="flex-1 min-w-0 border-l-2 border-[#007AFF] pl-2.5">
            <p className="text-[11px] font-semibold text-[#007AFF] uppercase tracking-wide">
              Editing message
            </p>
            <p className="text-[13px] text-fg-muted line-clamp-1 mt-0.5">
              Press Enter to save, Escape to cancel
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-1 rounded-full text-fg-muted hover:bg-hover"
            aria-label="Cancel edit"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      ) : replyingTo ? (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-sunken px-3 py-2">
          <div className="flex-1 min-w-0 border-l-2 border-[#007AFF] pl-2.5">
            <p className="text-[11px] font-semibold text-[#007AFF] uppercase tracking-wide">
              Replying to {replyingTo.isOwn ? "you" : "them"}
            </p>
            <p className="text-[13px] text-fg-muted line-clamp-2 mt-0.5">
              {replyingTo.snippet}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-full text-fg-muted hover:bg-hover"
            aria-label="Cancel reply"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      {pending ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-elevated/90 px-2 py-1.5">
          {pending.kind === "gif" || pending.kind === "image" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={pending.kind === "gif" ? pending.url : pending.dataUrl}
              alt=""
              className="w-14 h-14 rounded-lg object-cover bg-black/10"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-fg-muted" strokeWidth={1.5} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-fg truncate">
              {pending.kind === "file" ? pending.name : pending.kind === "gif" ? "GIF" : "Photo"}
            </p>
            {pending.kind === "file" && pending.sizeLabel ? (
              <p className="text-[11px] text-fg-muted">{pending.sizeLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={function () {
              setPending(null);
            }}
            className="p-1.5 rounded-full text-fg-muted hover:bg-hover"
            aria-label="Remove attachment"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "relative flex items-end gap-1 rounded-[23px] bg-elevated/95 border border-border pl-1 pr-1 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-[#007AFF]/25 focus-within:border-[#007AFF]/40 transition-shadow"
        )}
      >
        <div className="flex items-center shrink-0 pl-0.5">
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={function () {
                photoInputRef.current?.click();
              }}
              className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-full transition-colors"
              aria-label="Photos and videos"
              disabled={disabled || isSending || isEditing}
            >
              <ImagePlus className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={function () {
                fileInputRef.current?.click();
              }}
              className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-full transition-colors"
              aria-label="Files"
              disabled={disabled || isSending || isEditing}
            >
              <FolderOpen className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>

          <div className="hidden md:block relative">
            <button
              ref={attachBtnRef}
              type="button"
              onClick={function () {
                setAttachOpen(function (v) {
                  return !v;
                });
              }}
              className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-full transition-colors"
              aria-label="Attach"
              aria-expanded={attachOpen}
              disabled={disabled || isSending || isEditing}
            >
              <Paperclip className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            {attachOpen ? (
              <div
                data-chat-attach-menu
                className="absolute bottom-full mb-2 left-0 min-w-[200px] py-1 rounded-xl border border-border bg-elevated/95 backdrop-blur-md shadow-lg z-50"
              >
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-[13px] text-fg hover:bg-hover flex items-center gap-2"
                  onClick={function () {
                    setAttachOpen(false);
                    desktopPhotoInputRef.current?.click();
                  }}
                >
                  <ImagePlus className="w-4 h-4 text-[#007AFF]" strokeWidth={2} />
                  Photos &amp; videos
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-[13px] text-fg hover:bg-hover flex items-center gap-2"
                  onClick={function () {
                    setAttachOpen(false);
                    desktopFileInputRef.current?.click();
                  }}
                >
                  <FolderOpen className="w-4 h-4 text-[#007AFF]" strokeWidth={2} />
                  Files
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              ref={emojiBtnRef}
              type="button"
              onClick={function () {
                setShowEmoji(function (s) {
                  return !s;
                });
                setShowGif(false);
              }}
              className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-full transition-colors"
              aria-label="Emoji"
              disabled={disabled || isSending}
            >
              <Smile className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <ChatEmojiPanel
              isOpen={showEmoji}
              onClose={function () {
                setShowEmoji(false);
              }}
              onPick={function (emoji) {
                setValue(function (v) {
                  return v + emoji;
                });
                setShowEmoji(false);
              }}
              anchorRef={emojiBtnRef}
              variant="composer"
              align="left"
            />
          </div>

          <div className="relative">
            <button
              ref={gifBtnRef}
              type="button"
              onClick={function () {
                setShowGif(function (s) {
                  return !s;
                });
                setShowEmoji(false);
              }}
              className="px-2 py-2 text-[12px] font-bold text-[#007AFF] hover:bg-[#007AFF]/10 rounded-full transition-colors tracking-tight"
              aria-label="GIF"
              disabled={disabled || isSending || isEditing}
            >
              GIF
            </button>
            <TenorGifPicker
              isOpen={showGif}
              onClose={function () {
                setShowGif(false);
              }}
              onSelect={function (url) {
                setPending({ kind: "gif", url: url });
              }}
              anchorRef={gifBtnRef}
              align="left"
            />
          </div>
        </div>

        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={function (e) {
            setValue(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onFocus={function () {
            onFocusChange?.(true);
          }}
          onBlur={function () {
            onFocusChange?.(false);
          }}
          placeholder={isEditing ? "Edit message" : "Message"}
          disabled={disabled || isSending}
          className="flex-1 min-w-0 max-h-[120px] py-2.5 px-0.5 text-[16px] md:text-[15px] leading-[1.35] bg-transparent text-fg placeholder:text-fg-muted/70 resize-none focus:outline-none disabled:opacity-50"
          aria-label={isEditing ? "Edit message" : "Message"}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 mb-0.5 mr-0.5",
            canSend
              ? "bg-[#007AFF] text-white shadow-sm scale-100 hover:bg-[#0066d6] active:scale-95"
              : "bg-sunken-2 text-fg-muted scale-95 opacity-80"
          )}
          aria-label={isEditing ? "Save edit" : "Send message"}
        >
          <ArrowUp className="w-[17px] h-[17px]" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
