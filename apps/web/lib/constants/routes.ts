import { toUrlSlug } from "@/lib/routing/slugs";
import { normalizePersonRoleSlug } from "@/lib/routing/personRoles";

export const ROUTES = {
  HOME: "/",
  AUTH_LOGIN: "/login",
  AUTH_SIGNUP: "/signup",
  AUTH_FORGOT: "/forgot",
  AUTH_RESET: "/reset",
  AUTH_VERIFY: "/verify",
  NEW_POST: "/new",
  CHAT: "/chat",
  CHAT_WITH: (chatId: string) => `/chat/${encodeURIComponent(chatId.toLowerCase())}`,
  DISCOVER: "/discover",
  FILMS: "/films",
  LISTS: "/lists",
  COMMUNITIES: "/communities",
  COMMUNITY: (slug: string) => `/communities/${slug}`,
  SEVENTY_MM: "/70mm",
  SEVENTY_MM_UPLOAD: "/70mm/upload",
  SEVENTY_MM_FILM: (id: string) => `/70mm/${id}`,
  FESTIVALS: "/festivals",
  FESTIVAL: (slug: string) => `/festivals/${slug}`,
  FESTIVALS_PROJECTS: "/festivals/projects",
  FESTIVALS_SUBMISSIONS: "/festivals/submissions",
  SUGGESTIONS_PEOPLE: "/suggestions/people",
  CAREERS: "/careers",
  HELP: "/help",
  WAITLIST: "/waitlist",
  /** Public title URL. Catalog-owned slugs disambiguate duplicate names. */
  TITLE: (media: "movie" | "tv", titleOrSlug: string) =>
    `/${media === "movie" ? "film" : "tv"}/${toUrlSlug(titleOrSlug)}`,
  /** Legacy title URL retained only for permanent redirects. */
  LEGACY_TITLE: (media: "movie" | "tv", id: string | number) =>
    `/title/${media}/${id}`,
  /** Clean role/name person URL. Resolution must never guess between duplicates. */
  PERSON_ROLE: (nameOrSlug: string, role: string) =>
    `/${encodeURIComponent(normalizePersonRoleSlug(role))}/${toUrlSlug(nameOrSlug)}`,
  /** TMDB production company id — studio/network catalog page. */
  COMPANY: (id: string | number) => `/company/${id}`,
  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_TAB: (tab: string) => `/notifications/${tab}`,
  PROFILE: (username: string) => `/${username}`,
  PROFILE_REPOSTS: (username: string) => `/${username}/reposts`,
  PROFILE_DIARY: (username: string) => `/${username}/diary`,
  PROFILE_LISTS: (username: string) => `/${username}/lists`,
  LIST: (listId: string) => `/list/${listId}`,
  PROFILE_STATS: (username: string) => `/${username}/stats`,
  POST: (username: string, postId: string) => `/${username}/post/${postId}`,
  POST_QUOTES: (username: string, postId: string) => `/${username}/post/${postId}/quotes`,
  SETTINGS: "/settings",
  SETTINGS_ACCOUNT: "/settings/account",
  SETTINGS_APPEARANCE: "/settings/appearance",
  SETTINGS_MEDIA: "/settings/media",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
  SETTINGS_PRIVACY: "/settings/privacy",
  SETTINGS_PRIVACY_BLOCKED: "/settings/privacy/blocked",
  SETTINGS_PRIVACY_MUTED: "/settings/privacy/muted",
  SETTINGS_PRIVACY_REPORTS: "/settings/privacy/reports",
  SETTINGS_PRIVACY_REPORT: (reportId: string) =>
    `/settings/privacy/reports/${encodeURIComponent(reportId)}`,
  SETTINGS_DATA_SECURITY: "/settings/data-security",
  BOOKMARKS: "/bookmarks",
  DRAFTS: "/drafts",
  CONTRIBUTE: "/contribute",
  CONTRIBUTE_FORM: (slug: string) => `/contribute/${slug}`,
  CONTRIBUTE_SUBMISSIONS: "/contribute/submissions",
  /** Discover search by hashtag (query param; page may narrow results later). */
  DISCOVER_TAG: (tag: string) => `/discover?tag=${encodeURIComponent(tag)}`,
} as const;
