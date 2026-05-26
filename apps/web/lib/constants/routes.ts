export const ROUTES = {
  HOME: "/",
  AUTH_LOGIN: "/login",
  AUTH_SIGNUP: "/signup",
  AUTH_FORGOT: "/forgot",
  AUTH_RESET: "/reset",
  AUTH_VERIFY: "/verify",
  NEW_POST: "/new",
  CHAT: "/chat",
  CHAT_WITH: (chatId: string) => `/chat/${chatId}`,
  DISCOVER: "/discover",
  COMMUNITIES: "/communities",
  COMMUNITY: (slug: string) => `/communities/${slug}`,
  SHORT_FILMS: "/short-films",
  SHORT_FILM: (id: string) => `/short-films/${id}`,
  FESTIVALS: "/festivals",
  FESTIVAL: (slug: string) => `/festivals/${slug}`,
  FESTIVALS_PROJECTS: "/festivals/projects",
  FESTIVALS_SUBMISSIONS: "/festivals/submissions",
  SUGGESTIONS_PEOPLE: "/suggestions/people",
  /**
   * TMDB-backed title: `movie` or `tv` (numeric id; media disambiguates ID collisions).
   * Films, shorts, docs use `movie`; series / mini-series / web series use `tv`.
   */
  TITLE: (media: "movie" | "tv", id: string | number) => `/title/${media}/${id}`,
  /** TMDB person id — dedicated page links out to more detail. */
  PERSON: (id: string | number) => `/person/${id}`,
  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_TAB: (tab: string) => `/notifications/${tab}`,
  PROFILE: (username: string) => `/${username}`,
  PROFILE_DIARY: (username: string) => `/${username}/diary`,
  PROFILE_LISTS: (username: string) => `/${username}/lists`,
  PROFILE_STATS: (username: string) => `/${username}/stats`,
  POST: (username: string, postId: string) => `/${username}/post/${postId}`,
  SETTINGS: "/settings",
  BOOKMARKS: "/bookmarks",
  DISCOVER_TAB: (tab: string) => `/discover/${tab}`,
  /** Discover search by hashtag (query param; page may narrow results later). */
  DISCOVER_TAG: (tag: string) => `/discover?tag=${encodeURIComponent(tag)}`,
} as const;
