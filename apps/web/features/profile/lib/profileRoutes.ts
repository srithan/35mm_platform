export const PROFILE_TAB_SEGMENTS = ["diary", "lists", "stats"] as const;

export type ProfileTab = "posts" | "diary" | "lists" | "stats";

export type ProfileTabSegment = (typeof PROFILE_TAB_SEGMENTS)[number];

const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
  posts: "Posts",
  diary: "Diary",
  lists: "Lists",
  stats: "Stats",
};

export function profileTabHref(username: string, tab: ProfileTab): string {
  var normalizedUsername = username.toLowerCase();
  if (tab === "posts") return `/${normalizedUsername}`;
  return `/${normalizedUsername}/${tab}`;
}

export function profileTabLabel(tab: ProfileTab): string {
  return PROFILE_TAB_LABELS[tab];
}

export function resolveProfileTabFromPathname(
  pathname: string,
  username: string
): ProfileTab | null {
  var normalizedUsername = username.toLowerCase();
  var basePath = `/${normalizedUsername}`;

  if (pathname === basePath) return "posts";

  for (var i = 0; i < PROFILE_TAB_SEGMENTS.length; i += 1) {
    var segment = PROFILE_TAB_SEGMENTS[i];
    if (pathname === `${basePath}/${segment}`) {
      return segment;
    }
  }

  return null;
}

export function isProfileTabPath(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;

  var parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1) return true;
  if (parts.length !== 2) return false;

  for (var i = 0; i < PROFILE_TAB_SEGMENTS.length; i += 1) {
    if (parts[1] === PROFILE_TAB_SEGMENTS[i]) return true;
  }

  return false;
}
