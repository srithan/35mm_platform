"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  ChevronDown,
  Copy,
  Facebook,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type CopyState = "idle" | "copied" | "error";

export function buildPersonShareLinks(url: string, title: string) {
  return {
    facebook:
      "https://www.facebook.com/sharer/sharer.php?u=" +
      encodeURIComponent(url),
    whatsapp:
      "https://wa.me/?text=" + encodeURIComponent(title + " " + url),
    x:
      "https://twitter.com/intent/tweet?url=" +
      encodeURIComponent(url) +
      "&text=" +
      encodeURIComponent(title),
  };
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

const itemClassName = cn(
  "flex min-h-10 cursor-default select-none items-center gap-3 rounded-[2px] px-3 py-2",
  "font-sans text-[13px] font-medium text-fg-muted outline-none",
  "transition-colors duration-150 focus:bg-hover focus:text-fg motion-reduce:transition-none",
);

export function PersonShareButton({
  path,
  title,
}: {
  path: string;
  title: string;
}) {
  const [shareUrl, setShareUrl] = useState(path);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    function setAbsoluteShareUrl() {
      setShareUrl(new URL(path, window.location.origin).toString());
      setCanNativeShare(typeof navigator.share === "function");
    },
    [path],
  );

  useEffect(function clearStatusTimerOnUnmount() {
    return function cleanup() {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  function showStatus(nextState: Exclude<CopyState, "idle">) {
    setCopyState(nextState);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(function resetStatus() {
      setCopyState("idle");
    }, 2400);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showStatus("copied");
    } catch (error) {
      console.error("[person-share] Failed to copy person URL", {
        error,
        path,
      });
      showStatus("error");
    }
  }

  async function shareWithDevice() {
    try {
      await navigator.share({ title, url: shareUrl });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("[person-share] Native share failed", { error, path });
      showStatus("error");
    }
  }

  const links = buildPersonShareLinks(shareUrl, title);
  const statusLabel =
    copyState === "copied"
      ? "Link copied"
      : copyState === "error"
        ? "Share failed"
        : "Share";

  return (
    <div className="mt-5 w-full max-w-[260px]">
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          className={cn(
            "group flex h-10 w-full items-center justify-center gap-2 rounded-sm border border-border-strong px-4",
            "font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-fg outline-none",
            "transition-colors duration-150 hover:bg-hover focus-visible:border-fg",
            "data-[state=open]:bg-hover motion-reduce:transition-none",
          )}
        >
          {copyState === "copied" ? (
            <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Share2 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          )}
          <span aria-live="polite">{statusLabel}</span>
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            strokeWidth={2}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            collisionPadding={12}
            aria-label="Share options"
            className="z-50 w-[260px] rounded-sm border border-border-strong bg-elevated p-1 text-fg"
          >
            {canNativeShare ? (
              <DropdownMenu.Item
                className={itemClassName}
                onSelect={shareWithDevice}
              >
                <Share2 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                Share with device
              </DropdownMenu.Item>
            ) : null}
            <DropdownMenu.Item className={itemClassName} onSelect={copyLink}>
              <Copy aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              Copy link
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="mx-2 my-1 h-px bg-border" />
            <DropdownMenu.Item asChild className={itemClassName}>
              <a href={links.x} target="_blank" rel="noopener noreferrer">
                <XIcon className="h-3.5 w-3.5" />
                Share on X
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild className={itemClassName}>
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle
                  aria-hidden="true"
                  className="h-4 w-4"
                  strokeWidth={2}
                />
                Share on WhatsApp
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild className={itemClassName}>
              <a
                href={links.facebook}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook
                  aria-hidden="true"
                  className="h-4 w-4"
                  strokeWidth={2}
                />
                Share on Facebook
              </a>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
