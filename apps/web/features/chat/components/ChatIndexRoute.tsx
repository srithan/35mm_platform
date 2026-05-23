"use client";

import { ChatContent } from "./ChatContent";
import { ChatPageMobile } from "./ChatPageMobile";
import { useIsDesktopMd } from "@/lib/hooks/useIsDesktopMd";

export function ChatIndexRoute() {
  const isDesktop = useIsDesktopMd();

  if (isDesktop === null) {
    return (
      <div
        className="h-full min-h-[50vh] w-full"
        aria-busy="true"
      />
    );
  }

  if (isDesktop) {
    return (
      <div className="h-full">
        <ChatContent />
      </div>
    );
  }

  return (
    <div className="h-full">
      <ChatPageMobile />
    </div>
  );
}
