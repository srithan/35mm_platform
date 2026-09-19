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
import { AuthPromptProvider } from "@/features/auth/components/AuthPromptProvider";
import {
  BROWSE_CHROME_VARIANT,
  BROWSE_DENSITY_VARIANT,
  DESKTOP_NAVIGATION_VARIANT,
} from "@/lib/config/uiFlags";
import { FocusedNavigationSidebar } from "@/components/layout/FocusedNavigationSidebar";
import { ROUTES } from "@/lib/constants/routes";
import { syncSiteHeaderStickyOffset } from "@/lib/utils/syncSiteHeaderStickyOffset";
import { isPersonRolePath } from "@/lib/routing/personRoles";
import { HomeSuggestionsSidebar } from "@/features/feed/components/HomeSuggestionsSidebar";
import { HomeProfileCompletionSidebar } from "@/features/profile/components/HomeProfileCompletionSidebar";
import { useIsDesktopLg } from "@/lib/hooks/useIsDesktopLg";
import { ShellLayoutContext } from "@/components/layout/ShellLayoutContext";

/** Inlined — imported helpers can go stale in Turbopack client bundles. */
function getProfileShellUsername(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)(?:\/(reposts|diary|lists|stats))?\/?$/);
  if (!match) return null;
  switch (match[1]) {
    case "bookmarks":
    case "chat":
    case "contribute":
    case "discover":
    case "drafts":
    case "films":
    case "for-you":
    case "lists":
    case "new":
    case "notifications":
    case "settings":
    case "70mm":
    case "title":
    case "person":
    case "company":
    case "profile":
      return null;
    default:
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
  }
}

export function ShellGrid({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const useFocusedNavigation =
    DESKTOP_NAVIGATION_VARIANT === "focused-sidebar";
  const useBrowseRailDensity = BROWSE_DENSITY_VARIANT === "compact";
  const useBrowseRailChrome = BROWSE_CHROME_VARIANT === "rail";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarViewportTop, setSidebarViewportTop] = useState(0);
  const mobilePageContentRef = useRef<HTMLDivElement | null>(null);
  const [profileRailDisabled, setProfileRailDisabled] = useState(false);
  const [navigationPathnames, setNavigationPathnames] = useState<{
    current: string | null;
    previous: string | null;
  }>(function () {
    return { current: pathname, previous: null };
  });
  const previousPathname =
    navigationPathnames.current === pathname
      ? navigationPathnames.previous
      : navigationPathnames.current;
  const openSidebar = useCallback(function () {
    setSidebarViewportTop(window.scrollY);
    setSidebarOpen(true);
  }, []);
  const closeSidebar = useCallback(function () {
    setSidebarOpen(false);
  }, []);
  const shellLayoutContextValue = useMemo(
    function () {
      return { profileRailDisabled, setProfileRailDisabled, previousPathname };
    },
    [previousPathname, profileRailDisabled, setProfileRailDisabled]
  );
  const isTitlePage = Boolean(
    pathname?.startsWith("/film/") ||
      pathname?.startsWith("/tv/") ||
      pathname?.startsWith("/title/"),
  );
  const isPersonPage =
    Boolean(pathname?.startsWith("/person/")) || isPersonRolePath(pathname);
  const isCompanyPage = Boolean(pathname?.startsWith("/company/"));
  const isShortFilmsSection =
    pathname === ROUTES.SEVENTY_MM ||
    Boolean(pathname?.startsWith("/70mm/"));
  const isSettingsSection =
    pathname === "/settings" || Boolean(pathname?.startsWith("/settings/"));
  const isChatSection =
    pathname === ROUTES.CHAT || Boolean(pathname?.startsWith("/chat/"));
  const isContributeSection =
    pathname === ROUTES.CONTRIBUTE || Boolean(pathname?.startsWith("/contribute/"));
  const isBrowseDirectoryPage =
    pathname === ROUTES.DISCOVER ||
    pathname === ROUTES.FILMS ||
    pathname === ROUTES.LISTS;
  const isHomeRailRefreshPage =
    useBrowseRailDensity &&
    (isBrowseDirectoryPage || isTitlePage || isPersonPage);
  const isListDetailPage = Boolean(pathname?.startsWith("/list/"));
  const isPostDetailPage = Boolean(pathname?.match(/^\/[^/]+\/post\/[^/]+\/?$/));
  const isNotificationsPage = pathname === "/notifications";
  const isChatDetailPage = Boolean(pathname?.startsWith("/chat/"));
  const isNewPostPage = pathname === ROUTES.NEW_POST;
  const isHomePage = pathname === "/";
  const profileShellUsername =
    pathname != null ? getProfileShellUsername(pathname) : null;
  const isProfileUsernamePage = profileShellUsername != null;
  const isDesktopLg = useIsDesktopLg();

  const isWideMainContent =
    isBrowseDirectoryPage ||
    isListDetailPage ||
    isContributeSection ||
    pathname === ROUTES.BOOKMARKS ||
    pathname === ROUTES.SUGGESTIONS_PEOPLE ||
    isSettingsSection ||
    isChatSection ||
    isShortFilmsSection ||
    isPersonPage ||
    isCompanyPage ||
    isTitlePage;

  /** Home keeps a fixed 640px center column inside a lg+ three-column strip; shell var stays aligned. */
  const shellMainMaxWidth = isWideMainContent ? "1400px" : "640px";

  useLayoutEffect(
    function trackPreviousPathname() {
      setNavigationPathnames(function (current) {
        if (current.current === pathname) return current;
        return { current: pathname, previous: current.current };
      });
    },
    [pathname]
  );

  useLayoutEffect(
    function () {
      if (useFocusedNavigation) {
        document.documentElement.style.setProperty("--site-header-sticky-offset", "0px");
        return function () {
          document.documentElement.style.removeProperty("--site-header-sticky-offset");
        };
      }
      syncSiteHeaderStickyOffset();
      const raf = window.requestAnimationFrame(function () {
        syncSiteHeaderStickyOffset();
      });
      return function () {
        window.cancelAnimationFrame(raf);
      };
    },
    [isWideMainContent, useFocusedNavigation]
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
    (!useBrowseRailDensity && isBrowseDirectoryPage) ||
    pathname?.startsWith("/profile") ||
    isContributeSection ||
    (isProfileUsernamePage && isDesktopLg !== true) ||
    isShortFilmsSection ||
    pathname === "/notifications" ||
    isSettingsSection;

  const useHomeRailLayout =
    isHomePage ||
    (useBrowseRailDensity && isListDetailPage);
  /** Focused nav keeps home feed viewport-centered with an inert left spacer. */
  const useFocusedHomeThreeColumnLayout =
    useFocusedNavigation && isHomePage;
  const useHomeRailTwoColumnLayout =
    useBrowseRailDensity && isListDetailPage;
  const useFocusedSingleColumnLayout =
    useFocusedNavigation &&
    (isBrowseDirectoryPage || isTitlePage || isPersonPage);
  /** Main canvas starts after fixed rail; narrow focused pages need half-rail offset to center in viewport. */
  const useFocusedViewportCenteredLayout =
    useFocusedNavigation && (isPostDetailPage || isNotificationsPage);
  const useBrowseRailDirectoryLayout =
    useBrowseRailChrome &&
    !useFocusedSingleColumnLayout &&
    (pathname === ROUTES.DISCOVER ||
      pathname === ROUTES.FILMS ||
      isTitlePage ||
      isPersonPage);
  const useExploreRailLayout =
    isHomeRailRefreshPage &&
    !useBrowseRailDirectoryLayout &&
    !useFocusedSingleColumnLayout;
  const useProfileFullWidthLayout = isProfileUsernamePage && profileRailDisabled;
  /** Profile spans main except the widgets column (`xl:`). */
  const useProfileRailLayout = isProfileUsernamePage && !profileRailDisabled;

  return (
    <ShellLayoutContext.Provider value={shellLayoutContextValue}>
      <ComposerModalProvider>
      <AuthPromptProvider>
      <div
        className="relative min-h-screen w-full overflow-x-clip bg-bg"
        style={
          {
            "--shell-main-max-width": shellMainMaxWidth,
            "--home-sidebar-gap": useFocusedHomeThreeColumnLayout ? "3rem" : undefined,
            "--home-explore-center-column-width": "864px",
            "--focused-navigation-content-max-width": "1240px",
            "--home-explore-center-column-half-width": "432px",
            "--home-explore-left-rail-width": "220px",
            "--home-explore-right-rail-width":
              "max(0px, calc(min(50vw, 700px) - 1rem - var(--home-explore-center-column-half-width, 432px) - var(--home-sidebar-gap, 2rem)))",
            "--home-explore-page-span-width":
              "calc(var(--home-explore-center-column-width) + var(--home-sidebar-gap, 2rem) + var(--home-explore-right-rail-width))",
            "--home-explore-directory-layout-width":
              "calc(var(--home-explore-left-rail-width) + var(--home-sidebar-gap, 2rem) + var(--home-explore-page-span-width))",
            "--home-right-rail-width":
              "max(0px, calc(min(50vw, 700px) - 1rem - 320px - var(--home-sidebar-gap, 2rem)))",
            "--mobile-sidebar-width": "min(82vw, 320px)",
            "--mobile-sidebar-viewport-top": `${sidebarViewportTop}px`,
            "--mobile-sidebar-viewport-bottom":
              "calc(100% - var(--mobile-sidebar-viewport-top) - 100dvh)",
            "--focused-navigation-width": "15.5rem",
            "--focused-home-left-spacer-width":
              "max(0px, calc(50vw - var(--focused-navigation-width) - 20rem - var(--home-sidebar-gap, 2rem)))",
          } as React.CSSProperties
        }
      >
        <MobileSidebar open={sidebarOpen} onClose={closeSidebar} />
        {useFocusedNavigation ? <FocusedNavigationSidebar /> : null}

        <div ref={mobilePageContentRef} className="min-h-screen w-full bg-bg">
          <div className="md:hidden">
            <MobileScrollChromeListener />
            {!isChatDetailPage && !isNewPostPage ? (
              <MobileHeader
                onProfileClick={openSidebar}
                title={isChatSection ? "Messages" : undefined}
                hideBottomBorder={hasStickyBarBelow || isChatSection}
                sidebarOpen={sidebarOpen}
                compactProfileUsername={profileShellUsername ?? undefined}
              />
            ) : null}
          </div>

          <div
            data-mobile-sidebar-surface
            className={cn(
              "relative z-10 min-h-screen w-full bg-bg",
              useFocusedNavigation && "md:pl-[var(--focused-navigation-width)]",
              "transition-[transform,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "motion-reduce:transition-none md:transform-none md:overflow-visible md:rounded-none md:shadow-none",
              sidebarOpen
                ? "mobile-sidebar-surface-open overflow-clip translate-x-[var(--mobile-sidebar-width)] rounded-l-[2rem] [will-change:transform]"
                : "transform-none overflow-visible rounded-l-none shadow-none [will-change:auto]"
            )}
          >
            {!useFocusedNavigation ? (
              <div className="hidden md:block">
                <SiteHeader />
              </div>
            ) : null}

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
                  : useFocusedSingleColumnLayout
                    ? "md:max-w-[var(--focused-navigation-content-max-width)] md:mx-auto"
                  : useExploreRailLayout || useBrowseRailDirectoryLayout
                    ? "md:max-w-[var(--home-explore-center-column-width)] md:mx-auto xl:max-w-none xl:mx-0"
                  : useProfileRailLayout || useProfileFullWidthLayout
                    ? "w-full max-w-none mx-0"
                    : "md:max-w-[var(--shell-main-max-width,640px)] md:mx-auto",
                useFocusedViewportCenteredLayout &&
                  "min-[1136px]:relative min-[1136px]:left-[calc(var(--focused-navigation-width)/-2)]",
                isNewPostPage
                  ? "pt-0 md:pt-[var(--site-header-sticky-offset,4.5rem)]"
                  : isChatSection
                  ? isChatDetailPage
                    ? "pt-0 md:pt-[var(--site-header-sticky-offset,4.5rem)]"
                    : "pt-[var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))] md:pt-[var(--site-header-sticky-offset,4.5rem)]"
                  : hasStickyBarBelow
                  ? cn(
                      "pt-[var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))] md:pt-[var(--site-header-sticky-offset,4.5rem)]",
                      (useHomeRailLayout || useExploreRailLayout || useBrowseRailDirectoryLayout || useProfileRailLayout) &&
                        "md:pt-[calc(var(--site-header-sticky-offset,4.5rem)+var(--home-main-below-header-gap,1rem))]"
                    )
                  : cn(
                      isHomePage
                        ? "pt-[calc(var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))-0.25rem)]"
                        : "pt-20",
                      "md:pt-[var(--site-header-sticky-offset,4.5rem)]",
                      (useHomeRailLayout || useExploreRailLayout || useBrowseRailDirectoryLayout || useProfileRailLayout) &&
                        "md:pt-[calc(var(--site-header-sticky-offset,4.5rem)+var(--home-main-below-header-gap,1rem))]"
                    )
              )}
            >
              {useHomeRailLayout ? (
                <>
                  <div
                    className={cn(
                      "xl:grid xl:w-full xl:items-start",
                      useFocusedHomeThreeColumnLayout
                        ? "xl:gap-x-[var(--home-sidebar-gap,2rem)]"
                        : "xl:gap-x-8",
                      useHomeRailTwoColumnLayout
                        ? "xl:grid-cols-[minmax(0,1fr)_640px_var(--home-right-rail-width)_minmax(0,1fr)]"
                        : useFocusedHomeThreeColumnLayout
                          ? "xl:grid-cols-[var(--focused-home-left-spacer-width)_640px_minmax(0,1fr)]"
                          : "xl:grid-cols-[minmax(0,1fr)_640px_minmax(0,1fr)]"
                    )}
                  >
                    {!useHomeRailTwoColumnLayout ? (
                      <div className="hidden min-w-0 xl:block xl:min-h-px" aria-hidden />
                    ) : null}
                    <div
                      className={cn(
                        "min-w-0 w-full mx-auto xl:mx-0",
                        useHomeRailTwoColumnLayout
                          ? "max-w-[640px] xl:col-start-2 xl:col-span-2 xl:w-full xl:max-w-none xl:justify-self-stretch"
                          : "max-w-[640px] xl:w-[640px] xl:max-w-[640px] xl:justify-self-start"
                      )}
                    >
                      {children}
                    </div>
                    {!useHomeRailTwoColumnLayout && !useFocusedHomeThreeColumnLayout ? (
                      <div className="hidden min-w-0 xl:block xl:min-h-px xl:justify-self-start" aria-hidden />
                    ) : null}
                  </div>
                  {/* Fixed viewport rail (below modals/backdrops — z below --z-modal) */}
                  <HomeProfileCompletionSidebar />
                  {!useHomeRailTwoColumnLayout ? <HomeSuggestionsSidebar /> : null}
                </>
              ) : useFocusedSingleColumnLayout ? (
                children
              ) : useBrowseRailDirectoryLayout ? (
                <div className="xl:mx-auto xl:grid xl:w-full xl:max-w-[min(calc(100vw-2rem),var(--home-explore-directory-layout-width))] xl:grid-cols-[var(--home-explore-left-rail-width)_minmax(0,1fr)] xl:items-start xl:gap-x-8">
                  <HomeProfileCompletionSidebar layout="directory" placement="inline" />
                  <div className="min-w-0 w-full max-w-[var(--home-explore-center-column-width)] xl:w-full xl:max-w-none mx-auto xl:mx-0">
                    {children}
                  </div>
                </div>
              ) : useExploreRailLayout ? (
                <>
                  <div className="xl:grid xl:w-full xl:grid-cols-[minmax(0,1fr)_var(--home-explore-center-column-width)_minmax(0,1fr)] xl:items-start xl:gap-x-8">
                    <div className="hidden min-w-0 xl:block xl:min-h-px" aria-hidden />
                    <div className="min-w-0 w-full max-w-[var(--home-explore-center-column-width)] xl:w-[var(--home-explore-center-column-width)] xl:max-w-[var(--home-explore-center-column-width)] xl:col-start-2 xl:justify-self-start mx-auto xl:mx-0">
                      {children}
                    </div>
                  </div>
                  <HomeProfileCompletionSidebar layout="directory" />
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
      </AuthPromptProvider>
      </ComposerModalProvider>
    </ShellLayoutContext.Provider>
  );
}
