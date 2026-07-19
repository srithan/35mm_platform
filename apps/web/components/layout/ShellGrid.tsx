"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { ShellLayoutContext } from "@/components/layout/ShellLayoutContext";

/** Inlined — imported helpers can go stale in Turbopack client bundles. */
function isProfileShellPath(pathname: string): boolean {
  const match = pathname.match(/^\/([^/]+)(?:\/(diary|lists|stats))?\/?$/);
  if (!match) return false;
  switch (match[1]) {
    case "bookmarks":
    case "chat":
    case "contribute":
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
  const [sidebarViewportTop, setSidebarViewportTop] = useState(0);
  const mobilePageContentRef = useRef<HTMLDivElement | null>(null);
  const [profileRailDisabled, setProfileRailDisabled] = useState(false);
  const openSidebar = useCallback(function () {
    setSidebarViewportTop(window.scrollY);
    setSidebarOpen(true);
  }, []);
  const closeSidebar = useCallback(function () {
    setSidebarOpen(false);
  }, []);
  const shellLayoutContextValue = useMemo(
    function () {
      return { profileRailDisabled, setProfileRailDisabled };
    },
    [profileRailDisabled, setProfileRailDisabled]
  );
  const isTitlePage = Boolean(pathname?.startsWith("/title/"));
  const isPersonPage = Boolean(pathname?.startsWith("/person/"));
  const isShortFilmsSection =
    pathname === ROUTES.SHORT_FILMS ||
    Boolean(pathname?.startsWith("/short-films/"));
  const isSettingsSection =
    pathname === "/settings" || Boolean(pathname?.startsWith("/settings/"));
  const isChatSection =
    pathname === ROUTES.CHAT || Boolean(pathname?.startsWith("/chat/"));
  const isContributeSection =
    pathname === ROUTES.CONTRIBUTE || Boolean(pathname?.startsWith("/contribute/"));
  const isChatDetailPage = Boolean(pathname?.startsWith("/chat/"));
  const isNewPostPage = pathname === ROUTES.NEW_POST;
  const isHomePage = pathname === "/";
  const isProfileUsernamePage =
    pathname != null ? isProfileShellPath(pathname) : false;
  const isDesktopLg = useIsDesktopLg();

  const isWideMainContent =
    pathname === "/discover" ||
    isContributeSection ||
    pathname === ROUTES.BOOKMARKS ||
    pathname === ROUTES.SUGGESTIONS_PEOPLE ||
    isSettingsSection ||
    isChatSection ||
    isShortFilmsSection ||
    isPersonPage ||
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

  useEffect(
    function () {
      setSidebarOpen(false);
    },
    [pathname]
  );

  useEffect(
    function () {
      const pageContent = mobilePageContentRef.current;
      if (!pageContent) return;
      pageContent.inert = sidebarOpen;
      return function () {
        pageContent.inert = false;
      };
    },
    [sidebarOpen]
  );

  /** Profiles use a horizontal tab strip only below `lg`; wide layout uses left rail instead. */
  const hasStickyBarBelow =
    pathname === "/discover" ||
    pathname?.startsWith("/profile") ||
    isContributeSection ||
    (isProfileUsernamePage && isDesktopLg !== true) ||
    isShortFilmsSection ||
    pathname === "/notifications" ||
    isSettingsSection;

  const useHomeRailLayout = isHomePage;
  const useProfileFullWidthLayout = isProfileUsernamePage && profileRailDisabled;
  /** Profile spans main except the widgets column (`xl:`). */
  const useProfileRailLayout = isProfileUsernamePage && !profileRailDisabled;

  return (
    <ShellLayoutContext.Provider value={shellLayoutContextValue}>
      <ComposerModalProvider>
      <div
        className="relative min-h-screen w-full overflow-x-clip bg-bg"
        style={
          {
            "--shell-main-max-width": shellMainMaxWidth,
            "--mobile-sidebar-width": "min(82vw, 320px)",
            "--mobile-sidebar-viewport-top": `${sidebarViewportTop}px`,
            "--mobile-sidebar-viewport-bottom":
              "calc(100% - var(--mobile-sidebar-viewport-top) - 100dvh)",
          } as React.CSSProperties
        }
      >
        <MobileSidebar open={sidebarOpen} onClose={closeSidebar} />

        <div ref={mobilePageContentRef} className="min-h-screen w-full bg-bg">
          <div className="md:hidden">
            <MobileScrollChromeListener />
            {!isChatDetailPage && !isNewPostPage ? (
              <MobileHeader
                onProfileClick={openSidebar}
                title={isChatSection ? "Messages" : undefined}
                hideBottomBorder={hasStickyBarBelow || isChatSection}
                sidebarOpen={sidebarOpen}
              />
            ) : null}
          </div>

          <div
            data-mobile-sidebar-surface
            className={cn(
              "relative z-10 min-h-screen w-full bg-bg",
              "transition-[transform,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "motion-reduce:transition-none md:transform-none md:overflow-visible md:rounded-none md:shadow-none",
              sidebarOpen
                ? "mobile-sidebar-surface-open overflow-clip translate-x-[var(--mobile-sidebar-width)] rounded-l-[2rem] [will-change:transform]"
                : "transform-none overflow-visible rounded-l-none shadow-none [will-change:auto]"
            )}
          >
            <div className="hidden md:block">
              <SiteHeader />
            </div>

            <main
              id="main-content"
              className={cn(
                /* Horizontal clip lives on <html>; overflow-x on <main> breaks position:sticky for TopStickyBar. */
                "w-full",
                isChatSection
                  ? "box-border h-dvh pb-0 md:pb-0"
                  : "pb-[calc(5.25rem+max(0.625rem,env(safe-area-inset-bottom,0px)))] md:pb-0",
                useHomeRailLayout
                  ? "md:max-w-[640px] md:mx-auto xl:max-w-none xl:mx-0"
                  : useProfileRailLayout || useProfileFullWidthLayout
                    ? "w-full max-w-none mx-0"
                    : "md:max-w-[var(--shell-main-max-width,640px)] md:mx-auto",
                isNewPostPage
                  ? "pt-0 md:pt-[var(--site-header-sticky-offset,4.5rem)]"
                  : isChatSection
                  ? isChatDetailPage
                    ? "pt-0 md:pt-[var(--site-header-sticky-offset,4.5rem)]"
                    : "pt-[var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))] md:pt-[var(--site-header-sticky-offset,4.5rem)]"
                  : hasStickyBarBelow
                  ? cn(
                      "pt-[var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))] md:pt-[var(--site-header-sticky-offset,4.5rem)]",
                      (useHomeRailLayout || useProfileRailLayout) &&
                        "md:pt-[calc(var(--site-header-sticky-offset,4.5rem)+var(--home-main-below-header-gap,1rem))]"
                    )
                  : cn(
                      isHomePage
                        ? "pt-[calc(var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))-0.25rem)]"
                        : "pt-20",
                      "md:pt-[var(--site-header-sticky-offset,4.5rem)]",
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

          </div>

          <div className="md:hidden">
            {!isChatSection ? (
              <MobileTabBar sidebarOpen={sidebarOpen} />
            ) : null}
          </div>
        </div>

        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
          tabIndex={sidebarOpen ? 0 : -1}
          className={cn(
            "md:hidden fixed inset-0 z-[90] bg-fg/25 transition-[transform,opacity,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            sidebarOpen
              ? "translate-x-[var(--mobile-sidebar-width)] rounded-l-[2rem] opacity-100 shadow-[-10px_0_32px_rgba(0,0,0,0.16)]"
              : "pointer-events-none translate-x-0 rounded-l-none opacity-0 shadow-none"
          )}
        />
      </div>
      </ComposerModalProvider>
    </ShellLayoutContext.Provider>
  );
}
