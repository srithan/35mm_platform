import { NextResponse } from 'next/server';
import { getStudioSql } from '@/lib/studio/db';
import { getStudioEnv } from '@/lib/studio/env';

export const dynamic = 'force-dynamic';

var CACHE_MS = 30_000;
var cached: { expiresAt: number; value: unknown } | null = null;

type CountRow = { value: number };
type RecentUserRow = {
  id: string;
  username: string;
  display_name: string;
  status: string;
  created_at: Date | string;
};
type RecentPostRow = {
  id: string;
  username: string;
  display_name: string;
  visibility: string;
  created_at: Date | string;
};
type RecentJobRow = {
  id: string;
  target_table: string;
  counter_name: string;
  status: string;
  attempts: number;
  created_at: Date | string;
};

function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function relativeTime(value: Date | string): string {
  var date = typeof value === 'string' ? new Date(value) : value;
  var diffMs = Date.now() - date.getTime();
  var minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function envEnabled(name: string): boolean {
  return Boolean(getStudioEnv(name).trim());
}

async function buildOverview() {
  var db = getStudioSql();

  var [
    activeRows,
    postRows,
    mediaPostRows,
    pendingJobRows,
    filmRows,
    verifiedFilmRows,
    manualFilmRows,
    shelfRows,
    unreadNotificationRows,
    recentUserRows,
    recentPostRows,
    recentJobRows,
  ] = await Promise.all([
    db<CountRow[]>`select count(*)::int as value from users where status = 'active'`,
    db<CountRow[]>`select count(*)::int as value from posts where is_deleted = false`,
    db<CountRow[]>`
      select count(*)::int as value
      from posts
      where coalesce(array_length(media_urls, 1), 0) > 0
        or jsonb_array_length(media) > 0
    `,
    db<CountRow[]>`select count(*)::int as value from counter_jobs where status in ('pending', 'failed')`,
    db<CountRow[]>`select count(*)::int as value from films`,
    db<CountRow[]>`select count(*)::int as value from films where is_verified = true`,
    db<CountRow[]>`select count(*)::int as value from films where source = 'user_contributed'`,
    db<CountRow[]>`select count(*)::int as value from film_lists where is_deleted = false`,
    db<CountRow[]>`select count(*)::int as value from notifications where is_read = false`,
    db<RecentUserRow[]>`
      select u.id, p.username, p.display_name, u.status, u.created_at
      from users u
      inner join profiles p on p.user_id = u.id
      order by u.created_at desc
      limit 3
    `,
    db<RecentPostRow[]>`
      select po.id, p.username, p.display_name, po.visibility, po.created_at
      from posts po
      inner join profiles p on p.user_id = po.user_id
      where po.is_deleted = false
      order by po.created_at desc
      limit 3
    `,
    db<RecentJobRow[]>`
      select id, target_table, counter_name, status, attempts, created_at
      from counter_jobs
      where status in ('pending', 'failed')
      order by created_at desc
      limit 3
    `,
  ]);

  var activeUsers = Number(activeRows[0]?.value ?? 0);
  var feedPosts = Number(postRows[0]?.value ?? 0);
  var mediaPosts = Number(mediaPostRows[0]?.value ?? 0);
  var pendingJobs = Number(pendingJobRows[0]?.value ?? 0);
  var unreadNotifications = Number(unreadNotificationRows[0]?.value ?? 0);

  var activity = [
    ...recentJobRows.map((job) => ({
      id: `job-${job.id}`,
      kind: 'job' as const,
      title: `${job.counter_name} ${job.status}`,
      detail: `${job.target_table} counter job, ${job.attempts} attempts`,
      meta: relativeTime(job.created_at),
    })),
    ...recentUserRows.map((user) => ({
      id: `user-${user.id}`,
      kind: 'user' as const,
      title: `New account @${user.username}`,
      detail: `${user.display_name} joined with ${user.status} status`,
      meta: relativeTime(user.created_at),
    })),
    ...recentPostRows.map((post) => ({
      id: `post-${post.id}`,
      kind: 'post' as const,
      title: `${post.display_name} posted`,
      detail: `@${post.username}, ${post.visibility.replace('_', ' ')} visibility`,
      meta: relativeTime(post.created_at),
    })),
  ].slice(0, 8);

  return {
    metrics: [
      {
        key: 'activeUsers',
        label: 'Active users',
        value: compactNumber(activeUsers),
        detail: 'active account records',
      },
      {
        key: 'feedPosts',
        label: 'Feed posts',
        value: compactNumber(feedPosts),
        detail: 'non-deleted posts',
      },
      {
        key: 'mediaPosts',
        label: 'Media posts',
        value: compactNumber(mediaPosts),
        detail: 'posts with media attachments',
      },
      {
        key: 'pendingJobs',
        label: 'Pending jobs',
        value: compactNumber(pendingJobs),
        detail: `${compactNumber(unreadNotifications)} unread notifications`,
        risk: pendingJobs > 0 ? 'medium' : undefined,
      },
    ],
    services: [
      {
        name: 'Database',
        owner: getStudioEnv('STUDIO_DATABASE_URL') ? 'Studio read DSN' : 'DATABASE_URL',
        state: 'healthy',
        detail: 'Studio reads aggregates directly from Postgres with a 30s cache.',
      },
      {
        name: 'Media storage',
        owner: 'Cloudflare R2',
        state: envEnabled('R2_PUBLIC_BASE_URL') ? 'healthy' : 'degraded',
        detail: envEnabled('R2_PUBLIC_BASE_URL') ? 'Public media base URL configured.' : 'R2 public base URL missing.',
      },
      {
        name: 'Queue transport',
        owner: 'Upstash Redis',
        state: envEnabled('UPSTASH_REDIS_URL') ? 'healthy' : 'planned',
        detail: envEnabled('UPSTASH_REDIS_URL') ? 'Worker queue Redis configured.' : 'Worker queue Redis not configured.',
      },
      {
        name: 'Feed cache',
        owner: 'Upstash REST',
        state: envEnabled('UPSTASH_REDIS_REST_URL') && envEnabled('UPSTASH_REDIS_REST_TOKEN') ? 'healthy' : 'planned',
        detail: envEnabled('UPSTASH_REDIS_REST_URL') && envEnabled('UPSTASH_REDIS_REST_TOKEN') ? 'Feed cache REST credentials configured.' : 'Feed cache REST credentials not configured.',
      },
      {
        name: 'Realtime',
        owner: 'Ably',
        state: envEnabled('ABLY_API_KEY') ? 'healthy' : 'planned',
        detail: envEnabled('ABLY_API_KEY') ? 'Realtime publish key configured.' : 'Realtime publish key not configured.',
      },
    ],
    activity,
    catalog: {
      films: Number(filmRows[0]?.value ?? 0),
      verifiedFilms: Number(verifiedFilmRows[0]?.value ?? 0),
      manualFilms: Number(manualFilmRows[0]?.value ?? 0),
      shelves: Number(shelfRows[0]?.value ?? 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.value, {
        headers: { 'Cache-Control': 'private, max-age=30' },
      });
    }

    var value = await buildOverview();
    cached = { value, expiresAt: Date.now() + CACHE_MS };

    return NextResponse.json(value, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load Studio overview' },
      { status: 500 },
    );
  }
}
