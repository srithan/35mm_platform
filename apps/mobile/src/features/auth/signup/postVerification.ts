import type { ApiClient } from "@35mm/api-client";
import { dateOfBirthSchema } from "@35mm/validators/date-of-birth";

import {
  parseCurrentUserBootstrapProfile,
  parseOnboardingStatus,
  type CurrentUserBootstrapProfile,
  type OnboardingStatus,
} from "@/features/auth/bootstrap/api";

export interface VerifiedSignupCompletion {
  readonly profile: CurrentUserBootstrapProfile;
  readonly onboarding: OnboardingStatus;
  readonly dateOfBirth: string;
}

function record(value: unknown, contract: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function parseDateOfBirthUpdate(
  value: unknown,
  expectedDateOfBirth: string,
): string {
  const response = record(value, "ProfileDateOfBirthUpdate");
  if (response.ok !== true) {
    throw new Error("ProfileDateOfBirthUpdate.ok must be true.");
  }
  const profile = record(
    response.profile,
    "ProfileDateOfBirthUpdate.profile",
  );
  if (profile.dateOfBirth !== expectedDateOfBirth) {
    throw new Error(
      "ProfileDateOfBirthUpdate.profile.dateOfBirth did not match the request.",
    );
  }
  return expectedDateOfBirth;
}

export async function persistVerifiedSignupDateOfBirth(
  client: ApiClient,
  input: {
    readonly dateOfBirth: string;
    readonly idempotencyKey: string;
    readonly signal: AbortSignal;
  },
): Promise<VerifiedSignupCompletion> {
  const dateOfBirth = dateOfBirthSchema.parse(input.dateOfBirth);
  if (!input.idempotencyKey.trim()) {
    throw new Error("DOB persistence requires an idempotency key.");
  }

  const profile = await client.request("/v1/me", {
    auth: "required",
    maxAttempts: 2,
    operation: "auth.signup.completion.bootstrap-profile",
    parser: parseCurrentUserBootstrapProfile,
    signal: input.signal,
  });

  await client.request("/v1/profiles/me", {
    auth: "required",
    body: { dateOfBirth },
    idempotencyKey: input.idempotencyKey,
    maxAttempts: 2,
    method: "PATCH",
    operation: "auth.signup.completion.persist-date-of-birth",
    parser: (value) => parseDateOfBirthUpdate(value, dateOfBirth),
    requestClass: "mutation",
    signal: input.signal,
  });

  const onboarding = await client.request("/v1/me/onboarding-status", {
    auth: "required",
    maxAttempts: 2,
    operation: "auth.signup.completion.onboarding-status",
    parser: parseOnboardingStatus,
    signal: input.signal,
  });

  return { profile, onboarding, dateOfBirth };
}
