import { NextResponse } from 'next/server';
import { RESERVED_USERNAMES } from '@35mm/validators';
import { getStudioSql } from '@/lib/studio/db';
import { isMissingUsernameLocksTable } from '@/lib/studio/usernameLocks';

export const dynamic = 'force-dynamic';

var CACHE_MS = 30_000;
var cached: { expiresAt: number; value: unknown } | null = null;

type StatusCountRow = { status: 'active' | 'deactivated' | 'suspended'; value: number };
type AccountRow = {
  id: string;
  email: string;
  status: 'active' | 'deactivated' | 'suspended';
  joined: Date | string;
  username: string;
  display_name: string;
  role: string | null;
  follower_count: number;
  onboarding_completed: boolean;
  posts: number;
};
type UsernameRow = {
  username: string;
  state: 'locked' | 'reserved';
  owner: string;
  reason: string;
  updated_at: Date | string;
};
type CountRow = { value: number };

function dateOnly(value: Date | string): string {
  var date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function roleLabel(value: string | null): string {
  return value?.trim() || 'member';
}

async function buildUsers() {
  var db = getStudioSql();

  var [statusRows, accountRows, usernameRows, takenUsernameRows] = await Promise.all([
    db<StatusCountRow[]>`
      select status, count(*)::int as value
      from users
      group by status
    `,
    db<AccountRow[]>`
      select
        u.id,
        u.email,
        u.status,
        u.created_at as joined,
        p.username,
        p.display_name,
        p.role,
        p.follower_count,
        p.onboarding_completed,
        (
          select count(*)::int
          from posts po
          where po.user_id = u.id
            and po.is_deleted = false
        ) as posts
      from users u
      inner join profiles p on p.user_id = u.id
      order by u.created_at desc
      limit 50
    `,
    db<UsernameRow[]>`
      select username, state, owner, reason, updated_at
      from username_locks
      order by updated_at desc
      limit 200
    `.catch((error) => {
      if (isMissingUsernameLocksTable(error)) {
        return [];
      }

      throw error;
    }),
    db<CountRow[]>`select count(*)::int as value from profiles`,
  ]);

  var statusCounts = {
    active: 0,
    deactivated: 0,
    suspended: 0,
  };

  for (var row of statusRows) {
    statusCounts[row.status] = Number(row.value ?? 0);
  }

  var lockedNames = new Set(usernameRows.map((row) => row.username));
  var reserved = RESERVED_USERNAMES.filter((username) => !lockedNames.has(username)).map((username) => ({
    username,
    state: 'reserved' as const,
    owner: 'username policy',
    reason: 'Reserved by shared availability policy',
    updatedAt: 'policy',
  }));

  var locked = usernameRows.map((row) => ({
    username: row.username,
    state: row.state,
    owner: row.owner,
    reason: row.reason,
    updatedAt: dateOnly(row.updated_at),
  }));

  return {
    stats: {
      ...statusCounts,
      reservedUsernames: RESERVED_USERNAMES.length + usernameRows.length,
      takenUsernames: Number(takenUsernameRows[0]?.value ?? 0),
    },
    accounts: accountRows.map((row) => ({
      id: row.id,
      name: row.display_name,
      handle: `@${row.username}`,
      email: row.email,
      status: row.status,
      role: roleLabel(row.role),
      joined: dateOnly(row.joined),
      posts: Number(row.posts ?? 0),
      followers: row.follower_count,
      onboardingCompleted: row.onboarding_completed,
    })),
    usernames: [...locked, ...reserved],
    cooldowns: [],
    auditEvents: [],
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

    var value = await buildUsers();
    cached = { value, expiresAt: Date.now() + CACHE_MS };

    return NextResponse.json(value, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load Studio users' },
      { status: 500 },
    );
  }
}
