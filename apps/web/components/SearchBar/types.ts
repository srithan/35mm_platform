import type { ReactNode } from "react";

/** A single result item rendered in the search dropdown. */
export interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
  type?: "film" | "user" | "community" | "festival";
  imageUrl?: string | null;
  initial?: string;
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
}
