"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { PostComposer } from "@/features/feed/components/PostComposer";
import { cn } from "@/lib/utils/cn";
import { useMobileBottomChromeStore } from "@/stores/useMobileBottomChromeStore";

export function MobileFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navVisible = useMobileBottomChromeStore(function (state) {
    return state.navVisible;
  });

  const open = useCallback(function () {
    setIsOpen(true);
  }, []);
  const close = useCallback(function () {
    setIsOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          "md:hidden fixed right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full",
          "bg-accent text-bg shadow-lg transition-[transform,opacity,bottom] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          navVisible
            ? "bottom-[calc(3.75rem+max(0.625rem,env(safe-area-inset-bottom,0px)))]"
            : "bottom-[max(0.875rem,env(safe-area-inset-bottom,0px))]"
        )}
        aria-label="New post"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {isOpen ? (
        <div
          className="md:hidden fixed inset-0 z-[60] flex flex-col bg-bg"
          role="dialog"
          aria-modal="true"
          aria-label="New post"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[env(safe-area-inset-top,0px)]">
            <button
              type="button"
              onClick={close}
              className="text-sm font-medium text-fg-muted active:opacity-80"
            >
              Cancel
            </button>
            <span className="text-sm font-semibold text-fg">New Post</span>
            <div className="w-14" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-border px-4 py-4">
              <PostComposer />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
