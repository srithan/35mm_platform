export function isMissingUsernameLocksTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  var record = error as Record<string, unknown>;

  if (isMissingUsernameLocksTable(record.cause)) {
    return true;
  }

  return (
    record.code === '42P01' ||
    String(record.message ?? '').includes('relation "username_locks" does not exist')
  );
}

export function missingUsernameLocksMessage(): string {
  return 'username_locks table missing. Run the 0036_username_locks database migration before locking usernames.';
}
