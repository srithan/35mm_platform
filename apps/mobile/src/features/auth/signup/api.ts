import type { ApiClient } from "@35mm/api-client";

export interface UsernameAvailability {
  readonly available: boolean;
  readonly reason: string | null;
}

export type UsernameAvailabilityClient = Pick<ApiClient, "request">;

export function parseUsernameAvailability(value: unknown): UsernameAvailability {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Username availability response must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.available !== "boolean") {
    throw new Error("Username availability response is missing available.");
  }
  if (
    record.reason !== undefined &&
    (typeof record.reason !== "string" ||
      record.reason.length === 0 ||
      record.reason.length > 160)
  ) {
    throw new Error("Username availability response has an invalid reason.");
  }
  return {
    available: record.available,
    reason: typeof record.reason === "string" ? record.reason : null,
  };
}

export function checkUsernameAvailability(
  client: UsernameAvailabilityClient,
  username: string,
  signal: AbortSignal,
): Promise<UsernameAvailability> {
  return client.request(
    `/v1/usernames/${encodeURIComponent(username)}/available`,
    {
      auth: "none",
      maxAttempts: 1,
      operation: "auth.signup.username-availability",
      parser: parseUsernameAvailability,
      signal,
    },
  );
}
