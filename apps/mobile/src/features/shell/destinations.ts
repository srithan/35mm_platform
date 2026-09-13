import type { AppIconName } from "@35mm/mobile-ui";

export type ShellDestinationId =
  | "home"
  | "discover"
  | "create"
  | "notifications"
  | "profile"
  | "bookmarks"
  | "lists"
  | "diary"
  | "chat"
  | "settings"
  | "help"
  | "seventy-mm"
  | "drafts";

export type DestinationReadiness = "production" | "client-gated" | "product-gated";

export interface ShellDestination {
  readonly id: ShellDestinationId;
  readonly title: string;
  readonly icon: AppIconName;
  readonly readiness: DestinationReadiness;
  readonly webPath: string;
  readonly gateTitle: string;
  readonly gateMessage: string;
}

export const PRIMARY_TABS: readonly ShellDestinationId[] = [
  "home",
  "discover",
  "create",
  "notifications",
  "profile",
];

export const DRAWER_DESTINATIONS: readonly ShellDestinationId[] = [
  "profile",
  "discover",
  "seventy-mm",
  "bookmarks",
  "lists",
  "diary",
  "drafts",
  "chat",
  "notifications",
  "settings",
  "help",
];

export const SHELL_DESTINATIONS: Readonly<Record<ShellDestinationId, ShellDestination>> = {
  home: {
    id: "home",
    title: "Home",
    icon: "home",
    readiness: "production",
    webPath: "/",
    gateTitle: "Home unavailable",
    gateMessage: "The production feed did not load.",
  },
  discover: {
    id: "discover",
    title: "Discover",
    icon: "discover",
    readiness: "client-gated",
    webPath: "/discover",
    gateTitle: "Discover is next in the native build",
    gateMessage:
      "Catalog search, shelves, filters, title routing, and canonical TMDB-to-catalog resolution remain gated until the mobile Phase 6 slice lands.",
  },
  create: {
    id: "create",
    title: "Create",
    icon: "compose",
    readiness: "production",
    webPath: "/new",
    gateTitle: "Composer unavailable",
    gateMessage: "The production composer could not open.",
  },
  notifications: {
    id: "notifications",
    title: "Notifications",
    icon: "bell",
    readiness: "production",
    webPath: "/notifications",
    gateTitle: "Notifications are gated",
    gateMessage:
      "The API and worker paths are wired, but the native list, bundles, mark-read flows, and realtime reconciliation still need the Phase 8 slice.",
  },
  profile: {
    id: "profile",
    title: "Profile",
    icon: "user",
    readiness: "production",
    webPath: "/:username",
    gateTitle: "Profile unavailable",
    gateMessage: "The production profile surface did not load.",
  },
  bookmarks: {
    id: "bookmarks",
    title: "Bookmarks",
    icon: "bookmark",
    readiness: "production",
    webPath: "/bookmarks",
    gateTitle: "Bookmarks unavailable",
    gateMessage: "The production bookmarks surface did not load.",
  },
  lists: {
    id: "lists",
    title: "Lists",
    icon: "folder",
    readiness: "production",
    webPath: "/lists",
    gateTitle: "Lists unavailable",
    gateMessage: "The production lists surface did not load.",
  },
  diary: {
    id: "diary",
    title: "Diary",
    icon: "calendar",
    readiness: "client-gated",
    webPath: "/:username/diary",
    gateTitle: "Diary is gated",
    gateMessage:
      "Diary tabs must use the profile feed contracts with cursor pagination and canonical film IDs before exposure.",
  },
  chat: {
    id: "chat",
    title: "Chat",
    icon: "message",
    readiness: "production",
    webPath: "/chat",
    gateTitle: "Chat unavailable",
    gateMessage: "The production chat surface did not load.",
  },
  settings: {
    id: "settings",
    title: "Settings",
    icon: "settings",
    readiness: "client-gated",
    webPath: "/settings",
    gateTitle: "Settings are gated",
    gateMessage:
      "Account, privacy, notifications, appearance, media, data/security, and safety surfaces need the Phase 10 mobile slice.",
  },
  help: {
    id: "help",
    title: "Help",
    icon: "shield-alert",
    readiness: "client-gated",
    webPath: "/help",
    gateTitle: "Help is gated",
    gateMessage:
      "Help, legal, and app information need approved native presentation or safe web-content routing before exposure.",
  },
  "seventy-mm": {
    id: "seventy-mm",
    title: "70mm",
    icon: "play",
    readiness: "product-gated",
    webPath: "/70mm",
    gateTitle: "70mm is product-gated",
    gateMessage:
      "Video discovery and upload beyond current post-video support remain gated until Cloudflare Stream or the approved production video backend is in scope.",
  },
  drafts: {
    id: "drafts",
    title: "Drafts",
    icon: "archive",
    readiness: "client-gated",
    webPath: "/drafts",
    gateTitle: "Drafts are gated",
    gateMessage:
      "Draft persistence requires a privacy-reviewed local schema and cleanup policy before it appears in the native drawer.",
  },
};
