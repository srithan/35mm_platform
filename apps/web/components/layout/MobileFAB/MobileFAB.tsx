"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { PostComposer } from "@/features/feed/components/PostComposer";
import { cn } from "@/lib/utils/cn";

export function MobileFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();
  const isDiscover = pathname === "/discover";

  useEffect(() => {
    if (!isDiscover) return;

    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (delta > 5) setVisible(false);
      else if (delta < -5) setVisible(true);
      lastY = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDiscover]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          "md:hidden fixed right-4 bottom-[72px] z-50 w-12 h-12 rounded-full bg-accent text-bg shadow-lg flex items-center justify-center transition-transform duration-200 active:scale-95 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          isDiscover && !visible && "translate-y-16 opacity-0 pointer-events-none"
        )}
        aria-label="New post"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] flex flex-col bg-bg"
          role="dialog"
          aria-modal="true"
          aria-label="New post"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border pt-[env(safe-area-inset-top,0px)]">
            <button
              type="button"
              onClick={close}
              className="text-fg-muted text-sm font-medium active:opacity-80"
            >
              Cancel
            </button>
            <span className="text-sm font-semibold text-fg">New Post</span>
            <div className="w-14" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 border-b border-border">
              <PostComposer />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
