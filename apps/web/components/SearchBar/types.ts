import type { ComponentType, ReactNode } from "react";

/** A single result item rendered in the search dropdown. */
export interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
  type?: "film" | "user" | "community" | "festival" | "hashtag" | "post";
  imageUrl?: string | null;
  initial?: string;
  isPrivate?: boolean;
  followState?: "none" | "requested" | "following" | "self";
  /** Optional navigation target when the item is selected. */
  href?: string;
}

/** Trending pill shown in the empty search dropdown. */
export interface SearchTrendingPill {
  id: string;
  label: string;
  query: string;
}

/** Quick-link row shown in the empty search dropdown. */
export interface SearchQuickLink {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

/** Props accepted by the SearchBar component. */
export interface SearchBarProps {
  /** Placeholder text for the input. */
  placeholder?: string;

  /**
   * Called whenever the debounced query changes.
   * Use this to drive external filtering or API calls.
   */
  onSearch?: (query: string) => void;

  /**
   * Called when a result or recent-search item is selected.
   */
  onSelect?: (result: SearchResult) => void;

  /**
   * Called when a result or quick link should navigate (e.g. `router.push`).
   */
  onNavigate?: (href: string) => void;

  /**
   * Called when the input is cleared via the clear button.
   */
  onClear?: () => void;

  /**
   * External results to render in the dropdown.
   * When provided, the built-in mock API is bypassed.
   */
  results?: SearchResult[];

  /**
   * Whether externally-provided results are currently loading.
   * Only used when `results` is provided.
   */
  isLoading?: boolean;

  /**
   * Layout variant.
   * - `"default"` — standalone bar with outer padding (Discover / Festivals)
   * - `"inline"` — flush, no outer padding, rounded-xl (Communities header)
   */
  variant?: "default" | "inline";

  /**
   * Visual density. `"compact"` matches the SiteHeader search (smaller type, padding, icon).
   */
  size?: "default" | "compact";

  /** Auto-focus the input on mount. */
  autoFocus?: boolean;

  /** Extra CSS class names forwarded to the root element. */
  className?: string;

  /**
   * Category hint passed to the mock API.
   * Ignored when external `results` are supplied.
   */
  category?: "films" | "communities" | "festivals" | "users" | "all";

  /**
   * Whether to show the dropdown with results/recents.
   * Defaults to `true`. Set to `false` for a pure input mode.
   */
  showDropdown?: boolean;

  /**
   * When true, focus opens an empty-state panel with trending pills and
   * suggestions (used in the site header). Defaults to `false`.
   */
  showEmptySuggestions?: boolean;
}
