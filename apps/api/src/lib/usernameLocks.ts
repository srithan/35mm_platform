import { eq } from "drizzle-orm";
import { usernameLocks } from "@35mm/db/schema";
import type { Db } from "@35mm/db";

export type UsernameLockLookup = {
  state: string;
} | null;

export async function findUsernameLock(db: Db, username: string): Promise<UsernameLockLookup> {
  try {
    var rows = await db
      .select({ state: usernameLocks.state })
      .from(usernameLocks)
      .where(eq(usernameLocks.username, username))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    if (isMissingUsernameLocksTable(error)) {
      return null;
    }

    throw error;
  }
}

function isMissingUsernameLocksTable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  var record = error as Record<string, unknown>;

  if (isMissingUsernameLocksTable(record.cause)) {
    return true;
  }

  return (
    record.code === "42P01" ||
    String(record.message ?? "").includes('relation "username_locks" does not exist')
  );
}
