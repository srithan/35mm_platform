import { useAuth } from "@clerk/expo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { fetchAuthBootstrap } from "@/features/auth/bootstrap/api";
import { authBootstrapKeys } from "@/features/auth/bootstrap/queryKeys";
import {
  resolveAuthBootstrapState,
  type AuthBootstrapState,
} from "@/features/auth/bootstrap/state";
import { reportMobileDiagnostic } from "@/services/diagnostics";
import { useApiClient } from "@/services/api";
import { resetMobileUiState } from "@/state/ui";

export interface AuthBootstrapController {
  readonly state: AuthBootstrapState;
  readonly isRetrying: boolean;
  readonly isSigningOut: boolean;
  readonly actionError: string | null;
  readonly retry: () => void;
  readonly signOut: () => void;
}

export type {
  AuthBootstrapDestination,
  AuthBootstrapState,
} from "@/features/auth/bootstrap/state";

export function useAuthBootstrap(): AuthBootstrapController {
  const { isLoaded, isSignedIn, signOut, userId } = useAuth();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: authBootstrapKeys.session(userId ?? "unresolved"),
    queryFn: ({ signal }) => fetchAuthBootstrap(client, signal),
    enabled: isLoaded && Boolean(isSignedIn) && Boolean(userId),
    staleTime: 60_000,
  });
  const state = useMemo(
    () =>
      resolveAuthBootstrapState({
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        userId,
        query: {
          data: query.data,
          error: query.error,
          isPending: query.isPending,
        },
      }),
    [
      isLoaded,
      isSignedIn,
      query.data,
      query.error,
      query.isPending,
      userId,
    ],
  );

  const retry = useCallback(() => {
    if (query.isFetching || isSigningOut) return;
    setActionError(null);
    void query.refetch();
  }, [isSigningOut, query]);

  const handleSignOut = useCallback(() => {
    if (isSigningOut || query.isFetching) return;
    setActionError(null);
    setIsSigningOut(true);
    void queryClient
      .cancelQueries({ queryKey: authBootstrapKeys.all })
      .then(async () => {
        await signOut();
        queryClient.removeQueries({ queryKey: authBootstrapKeys.all });
        resetMobileUiState();
      })
      .catch(() => {
        reportMobileDiagnostic({
          source: "provider",
          code: "AUTH_BOOTSTRAP_SIGN_OUT_FAILED",
          operation: "auth-bootstrap.sign-out",
        });
        setActionError("35mm couldn’t sign you out. Please retry.");
      })
      .finally(() => {
        setIsSigningOut(false);
      });
  }, [isSigningOut, query.isFetching, queryClient, signOut]);

  return {
    state,
    isRetrying: query.isFetching && state.status === "recovery",
    isSigningOut,
    actionError,
    retry,
    signOut: handleSignOut,
  };
}
