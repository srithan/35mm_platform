import { isApiClientError } from "@35mm/api-client";

import type { CurrentUserBootstrapProfile } from "@/features/auth/bootstrap/api";

export type AuthBootstrapDestination =
  | { readonly status: "signedOut" }
  | {
      readonly status: "onboarding";
      readonly profile: CurrentUserBootstrapProfile;
    }
  | {
      readonly status: "authenticated";
      readonly profile: CurrentUserBootstrapProfile;
    };

export type AuthBootstrapState =
  | { readonly status: "loading" }
  | AuthBootstrapDestination
  | {
      readonly status: "recovery";
      readonly kind: "offline" | "error";
      readonly message: string;
    };

interface BootstrapQuerySnapshot {
  readonly data:
    | {
        readonly profile: CurrentUserBootstrapProfile;
        readonly onboarding: { readonly completed: boolean };
      }
    | undefined;
  readonly error: unknown;
  readonly isPending: boolean;
}

export function resolveAuthBootstrapState(input: {
  readonly isLoaded: boolean;
  readonly isSignedIn: boolean;
  readonly userId: string | null | undefined;
  readonly query: BootstrapQuerySnapshot;
}): AuthBootstrapState {
  if (!input.isLoaded) return { status: "loading" };
  if (!input.isSignedIn) return { status: "signedOut" };
  if (!input.userId) {
    return {
      status: "recovery",
      kind: "error",
      message: "We couldn’t restore this session. Retry or sign out.",
    };
  }
  if (input.query.isPending && !input.query.data) {
    return { status: "loading" };
  }
  if (input.query.error || !input.query.data) {
    const isOffline =
      isApiClientError(input.query.error) &&
      (input.query.error.kind === "network" ||
        input.query.error.kind === "timeout");
    return {
      status: "recovery",
      kind: isOffline ? "offline" : "error",
      message: isOffline
        ? "35mm couldn’t reach the service. Check your connection and retry."
        : "35mm couldn’t finish restoring your session. Retry or sign out.",
    };
  }
  if (!input.query.data.onboarding.completed) {
    return { status: "onboarding", profile: input.query.data.profile };
  }
  return { status: "authenticated", profile: input.query.data.profile };
}
