/**
 * Notifications mock payload served by `/api/notifications`.
 * Keep mock notification data centralized here.
 */

export interface AvatarItem {
  initial: string;
  bg: string;
  color: string;
}

export interface NotificationUserMeta {
  initial: string;
  avatarBg: string;
  avatarColor: string;
  role?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  variant: "primary" | "secondary";
}

export interface NotificationTextPart {
  type: "text" | "user" | "film" | "strong";
  value: string;
}

export interface NotificationRecord {
  id: string;
  unread: boolean;
  avatar?: AvatarItem;
  avatarStack?: AvatarItem[];
  time: string;
  preview?: string;
  thumbnail?: string;
  thumbnailAlt?: string;
  actions?: NotificationAction[];
  contentParts: NotificationTextPart[];
}

export const USER_META: Record<string, NotificationUserMeta> = {
  "k.szabo": {
    initial: "K",
    avatarBg: "linear-gradient(135deg,#2d3a4a,#1a2530)",
    avatarColor: "#7a9eb0",
    role: "Editor, Budapest",
  },
  "nora.dop": {
    initial: "N",
    avatarBg: "linear-gradient(135deg,#2a1e30,#3a2a40)",
    avatarColor: "#9a7ab0",
  },
  "t.osei": {
    initial: "T",
    avatarBg: "linear-gradient(135deg,#1e2a1a,#2a3a22)",
    avatarColor: "#7a9e6a",
  },
  "maya.frames": {
    initial: "M",
    avatarBg: "linear-gradient(135deg,#3a2218,#5a3828)",
    avatarColor: "#c89878",
  },
  "r.malik": {
    initial: "R",
    avatarBg: "linear-gradient(135deg,#1a2a3a,#2a4050)",
    avatarColor: "#78a8c8",
    role: "Cinematographer, London",
  },
  "l.vasquez": {
    initial: "L",
    avatarBg: "linear-gradient(135deg,#2a1218,#4a2028)",
    avatarColor: "#c87888",
  },
};

export const NOTIFICATION_GROUPS = [
  {
    dateLabel: "Today" as const,
    items: [
      {
        id: "n1",
        unread: true,
        avatar: { initial: "K", bg: "linear-gradient(135deg,#2d3a4a,#1a2530)", color: "#7a9eb0" },
        time: "2m ago · Editor, Budapest",
        actions: [
          { id: "follow", label: "Follow back", variant: "primary" },
          { id: "dismiss", label: "Dismiss", variant: "secondary" },
        ],
        contentParts: [
          { type: "user", value: "k.szabo" },
          { type: "text", value: " started following you" },
        ],
      },
      {
        id: "n2",
        unread: true,
        actions: [],
        avatarStack: [
          { initial: "N", bg: "linear-gradient(135deg,#2a1e30,#3a2a40)", color: "#9a7ab0" },
          { initial: "T", bg: "linear-gradient(135deg,#1e2a1a,#2a3a22)", color: "#7a9e6a" },
          { initial: "R", bg: "linear-gradient(135deg,#2d3a4a,#1a2530)", color: "#7a9eb0" },
        ],
        time: "14m ago",
        preview: '"Sean Baker has never been more precise. The last shot will stay with you for weeks."',
        thumbnail: "https://image.tmdb.org/t/p/w92/4vFD3zsAIpVFNzd9KRSzaFGwH3K.jpg",
        thumbnailAlt: "Anora",
        contentParts: [
          { type: "user", value: "nora.dop" },
          { type: "text", value: ", " },
          { type: "user", value: "t.osei" },
          { type: "text", value: " and " },
          { type: "strong", value: "3 others" },
          { type: "text", value: " liked your review of " },
          { type: "film", value: "Anora" },
        ],
      },
      {
        id: "n3",
        unread: true,
        avatar: { initial: "T", bg: "linear-gradient(135deg,#1e2a1a,#2a3a22)", color: "#7a9e6a" },
        time: "38m ago",
        preview: '"Completely agree — the first act feels almost alien compared to the rest. That\'s the point though."',
        actions: [
          { id: "reply", label: "Reply", variant: "secondary" },
          { id: "like", label: "Like", variant: "secondary" },
        ],
        thumbnail: "https://image.tmdb.org/t/p/w92/vcFW09U4834DyFOeRZpsx9x1D3r.jpg",
        thumbnailAlt: "The Brutalist",
        contentParts: [
          { type: "user", value: "t.osei" },
          { type: "text", value: " replied to your comment on " },
          { type: "film", value: "The Brutalist" },
        ],
      },
      {
        id: "n4",
        unread: true,
        avatar: { initial: "M", bg: "linear-gradient(135deg,#3a2218,#5a3828)", color: "#c89878" },
        time: "1h ago",
        actions: [],
        contentParts: [
          { type: "user", value: "maya.frames" },
          { type: "text", value: " reposted your list " },
          { type: "film", value: "\"Best Cinematography of 2024\"" },
        ],
      },
      {
        id: "n5",
        unread: true,
        avatar: { initial: "📅", bg: "linear-gradient(135deg,#1a1230,#2a1a48)", color: "#9a78c8" },
        time: "2h ago · Early deadline: Apr 15",
        actions: [
          { id: "viewFestival", label: "View Festival", variant: "primary" },
          { id: "dismiss", label: "Dismiss", variant: "secondary" },
        ],
        contentParts: [
          { type: "strong", value: "Tribeca Film Festival 2025" },
          { type: "text", value: " has opened submissions. Your project " },
          { type: "film", value: "\"Dusk Protocol\"" },
          { type: "text", value: " may be eligible." },
        ],
      },
      {
        id: "n6",
        unread: true,
        avatar: { initial: "R", bg: "linear-gradient(135deg,#1a2a3a,#2a4050)", color: "#78a8c8" },
        time: "3h ago · Cinematographer, London",
        actions: [{ id: "follow", label: "Follow back", variant: "primary" }],
        contentParts: [
          { type: "user", value: "r.malik" },
          { type: "text", value: " started following you · Also followed by " },
          { type: "user", value: "nora.dop" },
          { type: "text", value: ", " },
          { type: "user", value: "t.osei" },
        ],
      },
      {
        id: "n7",
        unread: true,
        avatar: { initial: "L", bg: "linear-gradient(135deg,#2a1218,#4a2028)", color: "#c87888" },
        time: "4h ago",
        preview: '"@a.chen this shot breakdown you posted is exactly what I needed. The Tarkovsky reference is so apt."',
        actions: [{ id: "viewPost", label: "View Post", variant: "secondary" }],
        contentParts: [
          { type: "user", value: "l.vasquez" },
          { type: "text", value: " mentioned you in a post" },
        ],
      },
    ],
  },
  {
    dateLabel: "Yesterday" as const,
    items: [
      {
        id: "n8",
        unread: false,
        avatar: { initial: "▶", bg: "linear-gradient(135deg,#0a1a0a,#1a3a1a)", color: "#5a9a5a" },
        time: "Yesterday · Added to watchlist Jan 5",
        actions: [
          { id: "watchMubi", label: "Watch on MUBI", variant: "primary" },
          { id: "logReview", label: "Log & Review", variant: "secondary" },
        ],
        thumbnail: "https://image.tmdb.org/t/p/w92/k3waqVXGOYGGbQFJYPCkVFaFGV.jpg",
        thumbnailAlt: "Past Lives",
        contentParts: [
          { type: "film", value: "Past Lives" },
          { type: "text", value: " is now streaming on MUBI — it's in your watchlist" },
        ],
      },
      {
        id: "n9",
        unread: false,
        avatarStack: [
          { initial: "K", bg: "linear-gradient(135deg,#2d3a4a,#1a2530)", color: "#7a9eb0" },
          { initial: "M", bg: "linear-gradient(135deg,#3a2218,#5a3828)", color: "#c89878" },
        ],
        time: "Yesterday",
        actions: [],
        contentParts: [
          { type: "user", value: "k.szabo" },
          { type: "text", value: " and " },
          { type: "user", value: "maya.frames" },
          { type: "text", value: " liked your list " },
          { type: "film", value: "\"Hungarian New Wave Essentials\"" },
        ],
      },
      {
        id: "n10",
        unread: false,
        avatar: { initial: "👥", bg: "linear-gradient(135deg,#1a1414,#3a2020)", color: "#c87878" },
        time: "Yesterday",
        preview: '"Does Tarkovsky\'s Stalker hold up as a meditation on faith in 2025? Starting a rewatch series."',
        actions: [{ id: "viewDiscussion", label: "View Discussion", variant: "secondary" }],
        contentParts: [
          { type: "strong", value: "Slow Cinema Collective" },
          { type: "text", value: " — " },
          { type: "user", value: "nora.dop" },
          { type: "text", value: " posted a new discussion" },
        ],
      },
      {
        id: "n11",
        unread: false,
        avatar: { initial: "★", bg: "linear-gradient(135deg,#1a1a0a,#30300a)", color: "#c8c840" },
        time: "Yesterday",
        actions: [],
        contentParts: [
          { type: "text", value: "Your review of " },
          { type: "film", value: "The Zone of Interest" },
          { type: "text", value: " reached " },
          { type: "strong", value: "100 likes" },
        ],
      },
    ],
  },
  {
    dateLabel: "This Week" as const,
    items: [
      {
        id: "n12",
        unread: false,
        avatar: { initial: "N", bg: "linear-gradient(135deg,#2a1e30,#3a2a40)", color: "#9a7ab0" },
        time: "Feb 17 · 3 days ago",
        preview: '"Hey, are you submitting to Berlinale? I saw your short and it would be perfect for their Shorts program."',
        actions: [{ id: "reply", label: "Reply", variant: "primary" }],
        contentParts: [
          { type: "user", value: "nora.dop" },
          { type: "text", value: " sent you a message" },
        ],
      },
      {
        id: "n13",
        unread: false,
        avatar: { initial: "✓", bg: "linear-gradient(135deg,#0a1420,#142038)", color: "#4a8ac8" },
        time: "Feb 17 · Confirmation #SX2025-48291",
        actions: [{ id: "trackSubmission", label: "Track Submission", variant: "secondary" }],
        contentParts: [
          { type: "text", value: "Your submission to " },
          { type: "strong", value: "SXSW 2025" },
          { type: "text", value: " has been received for " },
          { type: "film", value: "\"Dusk Protocol\"" },
        ],
      },
      {
        id: "n14",
        unread: false,
        avatar: { initial: "T", bg: "linear-gradient(135deg,#1e2a1a,#2a3a22)", color: "#7a9e6a" },
        time: "Feb 16",
        actions: [],
        contentParts: [
          { type: "user", value: "t.osei" },
          { type: "text", value: " watched " },
          { type: "film", value: "Jeanne Dielman" },
          { type: "text", value: " from your list " },
          { type: "film", value: "\"Feminist Masterpieces\"" },
          { type: "text", value: " and rated it ★★★★★" },
        ],
      },
    ],
  },
] as const;

export const UNREAD_IDS = ["n1", "n2", "n3", "n4", "n5", "n6", "n7"];

export const NOTIFICATIONS_MOCK_DATA = {
  userMeta: USER_META,
  groups: NOTIFICATION_GROUPS,
  unreadIds: UNREAD_IDS,
};
