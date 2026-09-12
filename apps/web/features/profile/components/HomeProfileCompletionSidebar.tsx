"use client";

import type { CSSProperties } from "react";
import { useAuth } from "@clerk/nextjs";
import { ProfileCompletionWidget } from "./ProfileCompletionWidget";

export function HomeProfileCompletionSidebar() {
  var { isLoaded, isSignedIn } = useAuth();
  var top =
    "calc(var(--site-header-sticky-offset, 4.5rem) + var(--home-main-below-header-gap, 1rem))";
  var maxHeight =
    "calc(100vh - var(--site-header-sticky-offset, 4.5rem) - var(--home-main-below-header-gap, 1rem) - env(safe-area-inset-bottom, 0px))";
  var style: CSSProperties = {
    top,
    right: "calc(50vw + 320px + var(--home-sidebar-gap, 2rem))",
    maxHeight,
  };

  if (!isLoaded || !isSignedIn) return null;

  return (
    <aside
      aria-label="Profile setup"
      className="fixed z-10 hidden w-[min(300px,calc((100vw-640px)*0.5-2.5rem))] min-w-0 overflow-y-auto pb-8 [scrollbar-width:thin] xl:block"
      style={style}
    >
      <ProfileCompletionWidget />
    </aside>
  );
}
