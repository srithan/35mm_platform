import type { ApiClient } from "@35mm/api-client";

export interface CurrentUserBootstrapProfile {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly avatarUrlLg: string | null;
  readonly role: string | null;
  readonly roleContext: string | null;
  readonly filmsLoggedCount: number;
  readonly followerCount: number;
  readonly followingCount: number;
}

export interface OnboardingStatus {
  readonly completed: boolean;
  readonly completedAt: string | null;
}

export interface AuthBootstrapData {
  readonly profile: CurrentUserBootstrapProfile;
  readonly onboarding: OnboardingStatus;
}

function record(value: unknown, contract: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringField(
  value: Record<string, unknown>,
  key: string,
  contract: string,
): string {
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new Error(`${contract}.${key} must be a non-empty string.`);
  }
  return field;
}

function nullableStringField(
  value: Record<string, unknown>,
  key: string,
  contract: string,
): string | null {
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "string") {
    throw new Error(`${contract}.${key} must be a string or null.`);
  }
  return field;
}

function countField(
  value: Record<string, unknown>,
  key: string,
  contract: string,
): number {
  const field = value[key];
  if (
    typeof field !== "number" ||
    !Number.isSafeInteger(field) ||
    field < 0
  ) {
    throw new Error(`${contract}.${key} must be a non-negative integer.`);
  }
  return field;
}

export function parseCurrentUserBootstrapProfile(
  value: unknown,
): CurrentUserBootstrapProfile {
  const profile = record(value, "CurrentUserBootstrapProfile");
  return {
    userId: stringField(profile, "userId", "CurrentUserBootstrapProfile"),
    username: stringField(profile, "username", "CurrentUserBootstrapProfile"),
    displayName: stringField(
      profile,
      "displayName",
      "CurrentUserBootstrapProfile",
    ),
    avatarUrl: nullableStringField(
      profile,
      "avatarUrl",
      "CurrentUserBootstrapProfile",
    ),
    avatarUrlLg: nullableStringField(
      profile,
      "avatarUrlLg",
      "CurrentUserBootstrapProfile",
    ),
    role: nullableStringField(profile, "role", "CurrentUserBootstrapProfile"),
    roleContext: nullableStringField(
      profile,
      "roleContext",
      "CurrentUserBootstrapProfile",
    ),
    filmsLoggedCount: countField(
      profile,
      "filmsLoggedCount",
      "CurrentUserBootstrapProfile",
    ),
    followerCount: countField(
      profile,
      "followerCount",
      "CurrentUserBootstrapProfile",
    ),
    followingCount: countField(
      profile,
      "followingCount",
      "CurrentUserBootstrapProfile",
    ),
  };
}

export function parseOnboardingStatus(value: unknown): OnboardingStatus {
  const status = record(value, "OnboardingStatus");
  if (typeof status.completed !== "boolean") {
    throw new Error("OnboardingStatus.completed must be a boolean.");
  }
  const completedAt = nullableStringField(
    status,
    "completedAt",
    "OnboardingStatus",
  );
  if (completedAt !== null && !Number.isFinite(Date.parse(completedAt))) {
    throw new Error("OnboardingStatus.completedAt must be an ISO date or null.");
  }
  return { completed: status.completed, completedAt };
}

export async function fetchAuthBootstrap(
  client: ApiClient,
  signal: AbortSignal,
): Promise<AuthBootstrapData> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });

  try {
    const [profile, onboarding] = await Promise.all([
      client.request("/v1/me", {
        auth: "required",
        operation: "auth-bootstrap.profile",
        parser: parseCurrentUserBootstrapProfile,
        signal: controller.signal,
      }),
      client.request("/v1/me/onboarding-status", {
        auth: "required",
        operation: "auth-bootstrap.onboarding-status",
        parser: parseOnboardingStatus,
        signal: controller.signal,
      }),
    ]);
    return { profile, onboarding };
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
