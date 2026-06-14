"use client";

import { useState, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { MobileScrollChromeListener } from "@/components/layout/MobileScrollChromeListener";
import { ComposerModalProvider } from "@/components/layout/PostComposerModalContext";
import { ROUTES } from "@/lib/constants/routes";
import { syncSiteHeaderStickyOffset } from "@/lib/utils/syncSiteHeaderStickyOffset";
import { HomeSuggestionsSidebar } from "@/features/feed/components/HomeSuggestionsSidebar";
import { useIsDesktopLg } from "@/lib/hooks/useIsDesktopLg";

/** Inlined — imported helpers can go stale in Turbopack client bundles. */
function isProfileShellPath(pathname: string): boolean {
  const match = pathname.match(/^\/([^/]+)(?:\/(diary|lists|stats))?\/?$/);
  if (!match) return false;
  switch (match[1]) {
    case "bookmarks":
    case "discover":
    case "drafts":
    case "for-you":
    case "new":
    case "notifications":
    case "settings":
    case "short-films":
    case "title":
    case "person":
    case "profile":
      return false;
    default:
      return true;
  }
}

export function ShellGrid({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isTitlePage = Boolean(pathname?.startsWith("/title/"));
  const isShortFilmsSection =
    pathname === ROUTES.SHORT_FILMS ||
    Boolean(pathname?.startsWith("/short-films/"));
  const isHomePage = pathname === "/";
  const isProfileUsernamePage =
    pathname != null ? isProfileShellPath(pathname) : false;
  const isDesktopLg = useIsDesktopLg();

  const isWideMainContent =
    pathname === "/discover" ||
    pathname === ROUTES.BOOKMARKS ||
    pathname === ROUTES.SUGGESTIONS_PEOPLE ||
    isShortFilmsSection ||
    isTitlePage;

  /** Home keeps a fixed 640px center column inside a lg+ three-column strip; shell var stays aligned. */
  const shellMainMaxWidth = isWideMainContent ? "1400px" : "640px";

  useLayoutEffect(
    function () {
      syncSiteHeaderStickyOffset();
      const raf = window.requestAnimationFrame(function () {
        syncSiteHeaderStickyOffset();
      });
      return function () {
        window.cancelAnimationFrame(raf);
      };
    },
    [isWideMainContent]
  );

  /** Profiles use a horizontal tab strip only below `lg`; wide layout uses left rail instead. */
  const hasStickyBarBelow =
    pathname === "/discover" ||
    pathname?.startsWith("/profile") ||
    (isProfileUsernamePage && isDesktopLg !== true) ||
    isShortFilmsSection ||
    pathname === "/notifications" ||
    pathname === "/settings";

  const useHomeRailLayout = isHomePage;
  /** Profile spans main except the widgets column (`xl:`). */
  const useProfileRailLayout = isProfileUsernamePage;

  return (
    <ComposerModalProvider>
      <div
        className="flex flex-col min-h-screen w-full bg-bg"
        style={
          {
            "--shell-main-max-width": shellMainMaxWidth,
          } as React.CSSProperties
        }
      >
        <div className="md:hidden">
          <MobileHeader
            onProfileClick={() => setSidebarOpen(true)}
            hideBottomBorder={hasStickyBarBelow}
          />
        </div>

        <MobileSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="hidden md:block">
          <SiteHeader />
        </div>

        <main
          id="main-content"
          className={cn(
            /* Horizontal clip lives on <html>; overflow-x on <main> breaks position:sticky for TopStickyBar. */
            "w-full pb-[calc(5.25rem+max(0.625rem,env(safe-area-inset-bottom,0px)))] md:pb-0",
            useHomeRailLayout
              ? "md:max-w-[640px] md:mx-auto xl:max-w-none xl:mx-0"
              : useProfileRailLayout
                ? "w-full max-w-none mx-0"
                : "md:max-w-[var(--shell-main-max-width,640px)] md:mx-auto",
            hasStickyBarBelow
              ? cn(
                  "pt-[var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))] md:pt-[var(--site-header-sticky-offset,4.5rem)]",
                  (useHomeRailLayout || useProfileRailLayout) &&
                    "md:pt-[calc(var(--site-header-sticky-offset,4.5rem)+var(--home-main-below-header-gap,1rem))]"
                )
              : cn(
                  "pt-20 md:pt-[var(--site-header-sticky-offset,4.5rem)]",
                  (useHomeRailLayout || useProfileRailLayout) &&
                    "md:pt-[calc(var(--site-header-sticky-offset,4.5rem)+var(--home-main-below-header-gap,1rem))]"
                )
          )}
        >
          {useHomeRailLayout ? (
            <>
              <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_640px_minmax(0,1fr)] xl:gap-x-8 xl:w-full xl:items-start">
                <div className="hidden min-w-0 xl:block xl:min-h-px" aria-hidden />
                <div className="min-w-0 w-full max-w-[640px] xl:w-[640px] xl:max-w-[640px] xl:justify-self-start mx-auto xl:mx-0">
                  {children}
                </div>
                <div className="hidden min-w-0 xl:block xl:min-h-px xl:justify-self-start" aria-hidden />
              </div>
              {/* Fixed viewport rail (below modals/backdrops — z below --z-modal) */}
              <HomeSuggestionsSidebar />
            </>
          ) : useProfileRailLayout ? (
            <div className="xl:w-full xl:flex xl:justify-center">
              <div
                className={
                  "xl:box-border xl:w-full xl:max-w-[1400px] xl:mx-auto xl:px-6 " +
                  "xl:flex xl:flex-row xl:gap-[var(--home-sidebar-gap,2rem)] xl:items-start"
                }
              >
                <div className="min-w-0 flex-1 w-full">{children}</div>
                <div
                  className="hidden xl:block shrink-0 w-[320px] self-start xl:sticky xl:z-10 xl:pb-12 min-h-0 overflow-y-auto [scrollbar-width:thin]"
                  style={
                    {
                      top: "calc(var(--site-header-sticky-offset, 4.5rem) + var(--home-main-below-header-gap, 1rem))",
                      maxHeight:
                        "calc(100vh - var(--site-header-sticky-offset, 4.5rem) - var(--home-main-below-header-gap, 1rem) - env(safe-area-inset-bottom, 0px))",
                    } as React.CSSProperties
                  }
                >
                  <HomeSuggestionsSidebar layout="attached" />
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        <div className="md:hidden">
          <MobileScrollChromeListener />
          <MobileTabBar />
        </div>
      </div>
    </ComposerModalProvider>
  );
}
