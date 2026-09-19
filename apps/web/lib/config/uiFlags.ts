export type DesktopNavigationVariant = "header" | "focused-sidebar";
export type FocusedNavigationAlignment = "top" | "center";
export type BrowseChromeVariant = "classic" | "rail" | "focused";
export type BrowseDensityVariant = "classic" | "compact";
export type PostComposerEntryVariant =
  | "inline"
  | "rich-trigger"
  | "simplified-trigger";

type UiRolloutFlagSource = {
  browseRail?: string;
  focusedNavigation?: string;
  focusedNavigationCentered?: string;
  inlinePostComposer?: string;
  postMediaCarousel?: string;
  simplifiedPostComposerTrigger?: string;
};

export type UiRolloutConfig = {
  desktopNavigation: {
    variant: DesktopNavigationVariant;
    primaryAlignment: FocusedNavigationAlignment;
  };
  browse: {
    chrome: BrowseChromeVariant;
    density: BrowseDensityVariant;
    showDirectoryTabs: boolean;
    showRailMenu: boolean;
  };
  postComposer: {
    entry: PostComposerEntryVariant;
  };
  postCard: {
    mediaPresentation: "grid" | "carousel";
  };
};

function publicBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

export function resolveUiRolloutConfig(
  flags: UiRolloutFlagSource
): UiRolloutConfig {
  const browseRailEnabled = publicBooleanFlag(flags.browseRail, true);
  const focusedNavigationEnabled = publicBooleanFlag(
    flags.focusedNavigation,
    false
  );
  const focusedNavigationCenteredEnabled = publicBooleanFlag(
    flags.focusedNavigationCentered,
    false
  );
  const inlinePostComposerEnabled = publicBooleanFlag(
    flags.inlinePostComposer,
    false
  );
  const postMediaCarouselEnabled = publicBooleanFlag(
    flags.postMediaCarousel,
    false
  );
  const simplifiedPostComposerTriggerEnabled = publicBooleanFlag(
    flags.simplifiedPostComposerTrigger,
    false
  );

  const desktopNavigationVariant: DesktopNavigationVariant =
    focusedNavigationEnabled ? "focused-sidebar" : "header";
  const browseChrome: BrowseChromeVariant = focusedNavigationEnabled
    ? "focused"
    : browseRailEnabled
      ? "rail"
      : "classic";

  return {
    desktopNavigation: {
      variant: desktopNavigationVariant,
      primaryAlignment: focusedNavigationCenteredEnabled ? "center" : "top",
    },
    browse: {
      chrome: browseChrome,
      density: browseRailEnabled ? "compact" : "classic",
      showDirectoryTabs: browseChrome !== "rail",
      showRailMenu: browseChrome === "rail",
    },
    postComposer: {
      entry: simplifiedPostComposerTriggerEnabled
        ? "simplified-trigger"
        : inlinePostComposerEnabled
          ? "inline"
          : "rich-trigger",
    },
    postCard: {
      mediaPresentation: postMediaCarouselEnabled ? "carousel" : "grid",
    },
  };
}

export const UI_ROLLOUT = resolveUiRolloutConfig({
  browseRail: process.env.NEXT_PUBLIC_BROWSE_RAIL,
  focusedNavigation: process.env.NEXT_PUBLIC_FOCUSED_NAVIGATION,
  focusedNavigationCentered:
    process.env.NEXT_PUBLIC_FOCUSED_NAVIGATION_CENTERED,
  inlinePostComposer: process.env.NEXT_PUBLIC_INLINE_POST_COMPOSER,
  postMediaCarousel: process.env.NEXT_PUBLIC_POST_MEDIA_CAROUSEL,
  simplifiedPostComposerTrigger:
    process.env.NEXT_PUBLIC_SIMPLIFIED_POST_COMPOSER_TRIGGER,
});

export const DESKTOP_NAVIGATION_VARIANT =
  UI_ROLLOUT.desktopNavigation.variant;
export const FOCUSED_NAVIGATION_ALIGNMENT =
  UI_ROLLOUT.desktopNavigation.primaryAlignment;
export const BROWSE_CHROME_VARIANT = UI_ROLLOUT.browse.chrome;
export const BROWSE_DENSITY_VARIANT = UI_ROLLOUT.browse.density;
export const BROWSE_DIRECTORY_TABS_ENABLED =
  UI_ROLLOUT.browse.showDirectoryTabs;
export const BROWSE_RAIL_MENU_ENABLED = UI_ROLLOUT.browse.showRailMenu;
export const POST_COMPOSER_ENTRY_VARIANT = UI_ROLLOUT.postComposer.entry;
export const POST_CARD_MEDIA_PRESENTATION =
  UI_ROLLOUT.postCard.mediaPresentation;

export const BROWSE_RAIL_ENABLED = BROWSE_DENSITY_VARIANT === "compact";

export const SIMPLIFIED_POST_COMPOSER_TRIGGER_ENABLED =
  POST_COMPOSER_ENTRY_VARIANT === "simplified-trigger";

export const POST_CARD_MEDIA_CAROUSEL_ENABLED =
  POST_CARD_MEDIA_PRESENTATION === "carousel";

/**
 * Opt-in desktop shell. Replaces the top header with one fixed left navigation rail.
 * Mobile keeps its existing header and tab bar.
 */
export const FOCUSED_NAVIGATION_ENABLED =
  DESKTOP_NAVIGATION_VARIANT === "focused-sidebar";

/**
 * Opt-in alignment for the primary stack inside the focused desktop navigation.
 * Keeps brand top-aligned and account actions bottom-aligned.
 */
export const FOCUSED_NAVIGATION_CENTERED_ENABLED =
  FOCUSED_NAVIGATION_ALIGNMENT === "center";
