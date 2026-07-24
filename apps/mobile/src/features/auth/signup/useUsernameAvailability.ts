import { isApiClientError } from "@35mm/api-client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  checkUsernameAvailability,
  type UsernameAvailabilityClient,
} from "@/features/auth/signup/api";
import { signupKeys } from "@/features/auth/signup/queryKeys";
import { validateSignupUsername } from "@/features/auth/signup/validation";

export const USERNAME_AVAILABILITY_DEBOUNCE_MS = 450;

export type UsernameAvailabilityState =
  | { readonly status: "idle" }
  | { readonly status: "invalid"; readonly message: string }
  | { readonly status: "checking" }
  | { readonly status: "available" }
  | { readonly status: "unavailable"; readonly message: string }
  | { readonly status: "error"; readonly message: string; readonly retry: () => void };

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
}

export function useUsernameAvailability(
  client: UsernameAvailabilityClient,
  usernameInput: string,
): UsernameAvailabilityState {
  const localValidation = useMemo(
    () => validateSignupUsername(usernameInput),
    [usernameInput],
  );
  const normalizedUsername =
    localValidation.value ?? usernameInput.trim().toLowerCase();
  const debouncedUsername = useDebouncedValue(
    normalizedUsername,
    USERNAME_AVAILABILITY_DEBOUNCE_MS,
  );
  const isLocallyValid = localValidation.error === null;
  const isDebounced = debouncedUsername === normalizedUsername;
  const query = useQuery({
    queryKey: signupKeys.usernameAvailability(debouncedUsername),
    queryFn: ({ signal }) =>
      checkUsernameAvailability(client, debouncedUsername, signal),
    enabled: isLocallyValid && isDebounced,
    gcTime: 0,
    retry: false,
    staleTime: 30_000,
  });

  if (usernameInput.length === 0) return { status: "idle" };
  if (localValidation.error) {
    return { status: "invalid", message: localValidation.error };
  }
  if (!isDebounced || query.isPending || query.isFetching) {
    return { status: "checking" };
  }
  if (query.isError) {
    const message =
      isApiClientError(query.error) &&
      (query.error.kind === "network" || query.error.kind === "timeout")
        ? "Couldn’t check this username. Check your connection and try again."
        : "Couldn’t check this username. Please try again.";
    return {
      status: "error",
      message,
      retry: () => {
        void query.refetch();
      },
    };
  }
  if (query.data?.available === true) return { status: "available" };
  if (query.data?.available === false) {
    return {
      status: "unavailable",
      message: query.data.reason ?? "Username is unavailable",
    };
  }
  return { status: "checking" };
}
