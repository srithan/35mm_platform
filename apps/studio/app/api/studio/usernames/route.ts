import { NextResponse } from 'next/server';
import { isReservedUsername, usernameSchema } from '@35mm/validators';
import { getStudioSql } from '@/lib/studio/db';
import { isMissingUsernameLocksTable, missingUsernameLocksMessage } from '@/lib/studio/usernameLocks';

export const dynamic = 'force-dynamic';

type ProfileUsernameRow = {
  username: string;
};

type UsernameLockRow = {
  username: string;
  state: 'locked' | 'reserved';
  owner: string;
  reason: string;
  updated_at: Date | string;
};

function dateOnly(value: Date | string): string {
  var date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    var body = (await request.json()) as {
      username?: unknown;
      state?: unknown;
      owner?: unknown;
      reason?: unknown;
    };
    var parsed = usernameSchema.safeParse(String(body.username ?? ''));

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid username' },
        { status: 400 },
      );
    }

    var username = parsed.data;
    var state = body.state === 'reserved' ? 'reserved' : 'locked';
    var owner = String(body.owner ?? '').trim();
    var reason = String(body.reason ?? '').trim();

    if (!owner) {
      return NextResponse.json({ message: 'Owner is required' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ message: 'Reason is required' }, { status: 400 });
    }

    if (isReservedUsername(username)) {
      return NextResponse.json({ message: 'Username is already reserved by platform policy' }, { status: 409 });
    }

    var db = getStudioSql();
    var existingProfiles = await db<ProfileUsernameRow[]>`
      select username
      from profiles
      where username = ${username}
      limit 1
    `;

    if (existingProfiles.length > 0) {
      return NextResponse.json({ message: 'Username is already taken by a user' }, { status: 409 });
    }

    var rows = await db<UsernameLockRow[]>`
      insert into username_locks (username, state, owner, reason)
      values (${username}, ${state}, ${owner}, ${reason})
      on conflict (username) do update
        set state = excluded.state,
            owner = excluded.owner,
            reason = excluded.reason,
            updated_at = now()
      returning username, state, owner, reason, updated_at
    `;
    var row = rows[0];

    return NextResponse.json({
      username: row.username,
      state: row.state,
      owner: row.owner,
      reason: row.reason,
      updatedAt: dateOnly(row.updated_at),
    });
  } catch (error) {
    if (isMissingUsernameLocksTable(error)) {
      return NextResponse.json({ message: missingUsernameLocksMessage() }, { status: 503 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to lock username' },
      { status: 500 },
    );
  }
}
