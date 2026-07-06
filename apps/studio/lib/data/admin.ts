import {
  Activity,
  Bell,
  Braces,
  Clapperboard,
  Database,
  FileWarning,
  Film,
  Flag,
  Gauge,
  HardDrive,
  Heart,
  Image,
  ListChecks,
  LucideIcon,
  MessageCircle,
  RadioTower,
  Search,
  Server,
  Shield,
  UserRound,
  Users,
  Webhook,
  Workflow,
} from 'lucide-react';

export type HealthState = 'healthy' | 'degraded' | 'offline' | 'planned';
export type ReviewPriority = 'urgent' | 'high' | 'normal' | 'low';
export type AdminRisk = 'low' | 'medium' | 'high';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminMetric {
  label: string;
  value: string;
  detail: string;
  trend?: string;
  risk?: AdminRisk;
  icon: LucideIcon;
}

export interface PlatformService {
  name: string;
  owner: string;
  state: HealthState;
  detail: string;
  latency?: string;
  uptime?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  handle: string;
  status: 'active' | 'watch' | 'suspended';
  role: 'member' | 'critic' | 'creator' | 'admin';
  joined: string;
  posts: number;
  reports: number;
}

export interface UsernameReservation {
  username: string;
  state: 'locked' | 'brand-protected' | 'staff-held' | 'released';
  reason: string;
  owner: string;
  updatedAt: string;
}

export interface UsernameCooldown {
  username: string;
  previousOwner: string;
  releasedAt: string;
  unlocksAt: string;
  reason: string;
}

export interface UsernameAuditEvent {
  action: string;
  username: string;
  actor: string;
  detail: string;
  time: string;
}

export interface ContentQueueItem {
  id: string;
  type: 'post' | 'film' | 'list' | 'profile';
  title: string;
  owner: string;
  state: 'published' | 'draft' | 'flagged' | 'needs verification';
  detail: string;
  updatedAt: string;
}

export interface ModerationItem {
  id: string;
  subject: string;
  reporter: string;
  reason: string;
  priority: ReviewPriority;
  age: string;
  queue: 'posts' | 'profiles' | 'media' | 'webhooks';
}

export interface QueueJob {
  name: string;
  queue: string;
  state: HealthState;
  waiting: number;
  failed: number;
  throughput: string;
  owner: string;
}

export interface PlatformConfigItem {
  area: string;
  key: string;
  state: HealthState;
  detail: string;
}

export const adminNavGroups: { label: string; items: AdminNavItem[] }[] = [
  {
    label: 'Command',
    items: [
      { label: 'Overview', href: '/dashboard', icon: Gauge },
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Content', href: '/content', icon: Clapperboard },
      { label: 'Moderation', href: '/moderation', icon: Shield },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Films', href: '/films', icon: Film },
      { label: 'Shelves', href: '/shelves', icon: ListChecks },
      { label: 'Import', href: '/import', icon: HardDrive },
    ],
  },
  {
    label: 'Systems',
    items: [
      { label: 'Queues', href: '/queues', icon: Workflow },
      { label: 'Infrastructure', href: '/infrastructure', icon: Server },
      { label: 'APIs', href: '/apis', icon: Braces },
      { label: 'Settings', href: '/settings', icon: Shield },
    ],
  },
];

export const platformMetrics: AdminMetric[] = [
  {
    label: 'Active users',
    value: '18.4K',
    detail: '7-day authenticated accounts',
    trend: '+12.8%',
    icon: UserRound,
  },
  {
    label: 'Feed posts',
    value: '126K',
    detail: 'public, followers-only, and private',
    trend: '+4.1%',
    icon: MessageCircle,
  },
  {
    label: 'Media assets',
    value: '42.9K',
    detail: 'R2 objects awaiting variants: 183',
    risk: 'medium',
    icon: Image,
  },
  {
    label: 'Open reviews',
    value: '37',
    detail: 'moderation and film verification',
    risk: 'high',
    icon: Flag,
  },
];

export const platformServices: PlatformService[] = [
  {
    name: 'Web app',
    owner: 'apps/web',
    state: 'healthy',
    detail: 'Next.js app serving user-facing product surfaces.',
    latency: '118 ms p95',
    uptime: '99.98%',
  },
  {
    name: 'API',
    owner: 'apps/api',
    state: 'healthy',
    detail: 'Hono REST API for auth, feed, media, profiles, and settings.',
    latency: '84 ms p95',
    uptime: '99.95%',
  },
  {
    name: 'Worker',
    owner: 'apps/worker',
    state: 'degraded',
    detail: 'Media processing is live; fanout and digest workers need closer monitoring.',
    latency: '6m oldest job',
    uptime: '99.40%',
  },
  {
    name: 'Database',
    owner: 'Neon Postgres',
    state: 'healthy',
    detail: 'Drizzle schema powering users, posts, follows, films, and lists.',
    latency: '42 ms p95',
    uptime: '99.99%',
  },
  {
    name: 'Redis',
    owner: 'Upstash',
    state: 'healthy',
    detail: 'BullMQ transport and feed cache.',
    latency: '21 ms p95',
    uptime: '99.97%',
  },
  {
    name: 'Realtime',
    owner: 'Ably',
    state: 'planned',
    detail: 'Notification publish path has no-op fallback until realtime is fully wired.',
  },
  {
    name: 'Search',
    owner: 'Meilisearch',
    state: 'planned',
    detail: 'Film and account search indexing is planned but not yet wired.',
  },
];

export const platformActivity = [
  {
    title: 'Media process backlog crossed threshold',
    detail: 'Oldest job is 6 minutes; review Cloudflare R2 credentials and worker concurrency.',
    icon: Workflow,
    tone: 'warning',
  },
  {
    title: 'Film identity migration still open',
    detail: 'Posts must move from TMDB JSON references to 35mm ULID film IDs before API contract freeze.',
    icon: Database,
    tone: 'danger',
  },
  {
    title: 'Notifications surface is live',
    detail: 'Realtime publish remains gated behind Ably wiring; digest jobs are ready for review.',
    icon: Bell,
    tone: 'neutral',
  },
  {
    title: 'Follow suggestions job updated',
    detail: 'Suggestion worker is available and should be monitored after fanout activation.',
    icon: Heart,
    tone: 'neutral',
  },
];

export const adminUsers: AdminUser[] = [
  {
    id: 'usr_01HQA2K7R9',
    name: 'Maya Srinivas',
    handle: '@maya',
    status: 'active',
    role: 'critic',
    joined: '2026-05-04',
    posts: 412,
    reports: 0,
  },
  {
    id: 'usr_01HQB5M2AJ',
    name: 'Arun Mehta',
    handle: '@arunframes',
    status: 'watch',
    role: 'creator',
    joined: '2026-05-19',
    posts: 97,
    reports: 3,
  },
  {
    id: 'usr_01HQCA17PM',
    name: 'Nila Varma',
    handle: '@nila',
    status: 'active',
    role: 'member',
    joined: '2026-05-27',
    posts: 31,
    reports: 0,
  },
  {
    id: 'usr_01HQD4TD9V',
    name: 'Ops Admin',
    handle: '@ops',
    status: 'active',
    role: 'admin',
    joined: '2026-04-20',
    posts: 12,
    reports: 0,
  },
  {
    id: 'usr_01HQE9Z8BK',
    name: 'Rohan K',
    handle: '@rk_watch',
    status: 'suspended',
    role: 'member',
    joined: '2026-05-31',
    posts: 18,
    reports: 8,
  },
];

export const usernameReservations: UsernameReservation[] = [
  {
    username: 'admin',
    state: 'staff-held',
    reason: 'Reserved for internal staff routing.',
    owner: 'platform',
    updatedAt: '2026-06-10',
  },
  {
    username: '35mm',
    state: 'brand-protected',
    reason: 'Core brand namespace.',
    owner: 'brand',
    updatedAt: '2026-06-08',
  },
  {
    username: 'support',
    state: 'locked',
    reason: 'Public support account planned.',
    owner: 'trust',
    updatedAt: '2026-06-05',
  },
  {
    username: 'cinema',
    state: 'locked',
    reason: 'High-value generic namespace.',
    owner: 'catalog',
    updatedAt: '2026-05-30',
  },
];

export const usernameCooldowns: UsernameCooldown[] = [
  {
    username: 'arunframes',
    previousOwner: 'usr_01HQA7M9JQ',
    releasedAt: '2026-06-13 09:24',
    unlocksAt: '2026-06-20 09:24',
    reason: 'User changed handle.',
  },
  {
    username: 'mumbai35',
    previousOwner: 'usr_01HQV2B9KD',
    releasedAt: '2026-06-12 17:02',
    unlocksAt: '2026-06-19 17:02',
    reason: 'Account deactivated.',
  },
  {
    username: 'rk_watch',
    previousOwner: 'usr_01HQE9Z8BK',
    releasedAt: '2026-06-11 21:41',
    unlocksAt: '2026-06-25 21:41',
    reason: 'Suspension review hold.',
  },
];

export const usernameAuditEvents: UsernameAuditEvent[] = [
  {
    action: 'Cooldown removed',
    username: 'oldstudio',
    actor: '@ops',
    detail: 'Released after verified owner transfer.',
    time: 'Today, 10:42',
  },
  {
    action: 'Username locked',
    username: 'support',
    actor: '@ops',
    detail: 'Reserved for public support account.',
    time: 'Jun 13, 16:20',
  },
  {
    action: 'Reservation updated',
    username: '35mm',
    actor: '@ops',
    detail: 'Moved to brand-protected state.',
    time: 'Jun 10, 09:15',
  },
];

export const contentQueue: ContentQueueItem[] = [
  {
    id: 'post_8451',
    type: 'post',
    title: 'A long thread on Kannada new wave cinema',
    owner: '@maya',
    state: 'published',
    detail: 'High engagement; no active reports.',
    updatedAt: '12 min ago',
  },
  {
    id: 'film_01HQCINEMA',
    type: 'film',
    title: 'Kummatty',
    owner: '@catalog-team',
    state: 'needs verification',
    detail: 'Imported from TMDB; missing 35mm canonical metadata review.',
    updatedAt: '36 min ago',
  },
  {
    id: 'list_01994',
    type: 'list',
    title: 'Indian Regional Cinema Starter Pack',
    owner: '@editorial',
    state: 'draft',
    detail: 'Awaiting poster coverage and contributor notes.',
    updatedAt: '2h ago',
  },
  {
    id: 'profile_5902',
    type: 'profile',
    title: 'Creator profile media refresh',
    owner: '@arunframes',
    state: 'flagged',
    detail: 'Avatar upload failed derivative generation.',
    updatedAt: '3h ago',
  },
];

export const moderationQueue: ModerationItem[] = [
  {
    id: 'mod_901',
    subject: 'Spoiler report on review post',
    reporter: '@nila',
    reason: 'Unmarked spoiler in first paragraph',
    priority: 'urgent',
    age: '18 min',
    queue: 'posts',
  },
  {
    id: 'mod_902',
    subject: 'Profile impersonation check',
    reporter: '@maya',
    reason: 'Possible duplicate creator account',
    priority: 'high',
    age: '41 min',
    queue: 'profiles',
  },
  {
    id: 'mod_903',
    subject: 'Webhook retry exceeded',
    reporter: 'system',
    reason: 'Clerk webhook failed 3 delivery attempts',
    priority: 'normal',
    age: '1h 12m',
    queue: 'webhooks',
  },
  {
    id: 'mod_904',
    subject: 'Poster image quality review',
    reporter: 'system',
    reason: 'Low-confidence image variant generated',
    priority: 'low',
    age: '4h',
    queue: 'media',
  },
];

export const queueJobs: QueueJob[] = [
  {
    name: 'media.process',
    queue: 'media',
    state: 'degraded',
    waiting: 183,
    failed: 7,
    throughput: '1.8K/day',
    owner: 'apps/worker',
  },
  {
    name: 'feed.fanout',
    queue: 'feed',
    state: 'planned',
    waiting: 0,
    failed: 0,
    throughput: 'not enabled',
    owner: 'apps/worker',
  },
  {
    name: 'notification.publish',
    queue: 'notifications',
    state: 'planned',
    waiting: 0,
    failed: 0,
    throughput: 'noop transport',
    owner: 'apps/worker',
  },
  {
    name: 'notification.digest',
    queue: 'notifications',
    state: 'healthy',
    waiting: 11,
    failed: 0,
    throughput: '420/day',
    owner: 'apps/worker',
  },
  {
    name: 'suggestion.worker',
    queue: 'suggestions',
    state: 'healthy',
    waiting: 4,
    failed: 1,
    throughput: '2.1K/day',
    owner: 'apps/worker',
  },
];

export const platformConfig: PlatformConfigItem[] = [
  {
    area: 'Auth',
    key: 'Clerk keys and webhook secret',
    state: 'healthy',
    detail: 'Required API and web auth variables are represented in platform setup docs.',
  },
  {
    area: 'Media',
    key: 'Cloudflare R2',
    state: 'degraded',
    detail: 'Worker requires R2 public base URL and credentials for full media processing.',
  },
  {
    area: 'Realtime',
    key: 'Ably',
    state: 'planned',
    detail: 'Server and browser keys exist as optional variables; publish path needs activation.',
  },
  {
    area: 'Search',
    key: 'Meilisearch',
    state: 'planned',
    detail: 'Search remains planned for film, account, and content discovery.',
  },
  {
    area: 'Email',
    key: 'Resend',
    state: 'planned',
    detail: 'Transactional email is listed in platform architecture but not wired.',
  },
  {
    area: 'Rate limiting',
    key: 'RATE_LIMIT_DISABLED',
    state: 'healthy',
    detail: 'Production should leave local bypass disabled.',
  },
];

export const platformSurfaces = [
  { label: 'Auth', detail: '/v1/me and username availability', icon: Shield },
  { label: 'Profiles', detail: 'Public profiles and self profile updates', icon: Users },
  { label: 'Feed', detail: 'Posts, likes, reposts, bookmarks, and caches', icon: Activity },
  { label: 'Follows', detail: 'Follow graph and account suggestions', icon: Heart },
  { label: 'Lists', detail: 'User film lists and list items', icon: ListChecks },
  { label: 'Media', detail: 'Presigned uploads, variants, and processing', icon: Image },
  { label: 'Notifications', detail: 'Notification reads, bundling, and digests', icon: Bell },
  { label: 'Chat', detail: 'Realtime and persisted conversation transport', icon: MessageCircle },
  { label: 'Webhooks', detail: 'Clerk profile and session sync', icon: Webhook },
  { label: 'Search', detail: 'Planned Meilisearch indexing surface', icon: Search },
  { label: 'Realtime', detail: 'Planned Ably publish and subscribe layer', icon: RadioTower },
  { label: 'Incidents', detail: 'Operational review and audit tracking', icon: FileWarning },
];
