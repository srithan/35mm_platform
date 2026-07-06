import { NextResponse } from 'next/server';
import { isReservedUsername, usernameSchema } from '@35mm/validators';
import { getStudioSql } from '@/lib/studio/db';
import { isMissingUsernameLocksTable } from '@/lib/studio/usernameLocks';

export const dynamic = 'force-dynamic';

type UsernameLockRow = {
  username: string;
  state: 'locked' | 'reserved';
  owner: string;
  reason: string;
  updated_at: Date | string;
};

type ProfileUsernameRow = {
  username: string;
  user_id: string;
  display_name: string;
};

function dateOnly(value: Date | string): string {
  var date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    var params = await context.params;
    var parsed = usernameSchema.safeParse(params.username);

    if (!parsed.success) {
      return NextResponse.json({
        username: params.username,
        status: 'invalid',
        available: false,
        canLock: false,
        message: parsed.error.issues[0]?.message ?? 'Invalid username',
      });
    }

    var username = parsed.data;

    if (isReservedUsername(username)) {
      return NextResponse.json({
        username,
        status: 'reserved',
        available: false,
        canLock: false,
        owner: 'username policy',
        reason: 'Reserved by shared availability policy',
        message: `@${username} is reserved by platform policy.`,
      });
    }

    var db = getStudioSql();
    var usernameLocksReady = true;
    var [lockRows, profileRows] = await Promise.all([
      db<UsernameLockRow[]>`
        select username, state, owner, reason, updated_at
        from username_locks
        where username = ${username}
        limit 1
      `.catch((error) => {
        if (isMissingUsernameLocksTable(error)) {
          usernameLocksReady = false;
          return [];
        }

        throw error;
      }),
      db<ProfileUsernameRow[]>`
        select username, user_id, display_name
        from profiles
        where username = ${username}
        limit 1
      `,
    ]);

    var lock = lockRows[0];
    if (lock) {
      return NextResponse.json({
        username,
        status: lock.state,
        available: false,
        canLock: false,
        owner: lock.owner,
        reason: lock.reason,
        updatedAt: dateOnly(lock.updated_at),
        message: `@${username} is ${lock.state}.`,
      });
    }

    var profile = profileRows[0];
    if (profile) {
      return NextResponse.json({
        username,
        status: 'taken',
        available: false,
        canLock: false,
        owner: profile.display_name,
        reason: `Assigned to ${profile.user_id}`,
        message: `@${username} is taken by ${profile.display_name}.`,
      });
    }

    return NextResponse.json({
      username,
      status: 'available',
      available: true,
      canLock: usernameLocksReady,
      message: usernameLocksReady
        ? `@${username} is available to lock.`
        : `@${username} is available, but username lock migration has not run yet.`,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to check username' },
      { status: 500 },
    );
  }
}
