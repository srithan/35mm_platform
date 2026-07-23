import { useAuth } from "@clerk/expo";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { BootstrapLoadingSurface } from "@/providers/bootstrapLoading";
import { ReactQueryLifecycleProvider } from "@/providers/lifecycle";
import { reportMobileDiagnostic } from "@/services/diagnostics";
import { createMobileQueryClient } from "@/services/queryClient";
import {
  MOBILE_QUERY_CACHE_MAX_AGE_MS,
  createMobileQueryPersister,
  shouldPersistMobileQuery,
  transitionQueryCacheScope,
} from "@/services/queryPersistence";

function QuerySession({
  appVersion,
  children,
  scope,
}: {
  readonly appVersion: string;
  readonly children: ReactNode;
  readonly scope: string;
}) {
  const queryClient = useMemo(() => createMobileQueryClient(), []);
  const persister = useMemo(() => createMobileQueryPersister(scope), [scope]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      onError={() =>
        reportMobileDiagnostic({
          source: "persistence",
          code: "QUERY_CACHE_RESTORE_FAILED",
          operation: "query-cache.restore",
        })
      }
      persistOptions={{
        persister,
        maxAge: MOBILE_QUERY_CACHE_MAX_AGE_MS,
        buster: `${appVersion}:mobile-query-v1`,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistMobileQuery },
      }}
    >
      <ReactQueryLifecycleProvider>{children}</ReactQueryLifecycleProvider>
    </PersistQueryClientProvider>
  );
}

export function MobileQueryProvider({
  appVersion,
  children,
}: {
  readonly appVersion: string;
  readonly children: ReactNode;
}) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const requestedUserId = isLoaded && isSignedIn ? userId : null;
  const requestedIdentity = !isLoaded
    ? null
    : requestedUserId
      ? `user:${requestedUserId}`
      : "guest";
  const [session, setSession] = useState<{
    readonly error: Error | null;
    readonly identity: string;
    readonly scope: string | null;
  } | null>(null);

  useEffect(() => {
    if (!requestedIdentity) return;
    let isCurrent = true;
    void transitionQueryCacheScope(requestedUserId)
      .then((nextScope) => {
        if (isCurrent) {
          setSession({ error: null, identity: requestedIdentity, scope: nextScope });
        }
      })
      .catch((error: unknown) => {
        reportMobileDiagnostic({
          source: "persistence",
          code: "QUERY_CACHE_SCOPE_FAILED",
          operation: "query-cache.scope",
        });
        if (isCurrent) {
          setSession({
            error:
              error instanceof Error
                ? error
                : new Error("Query cache scope failed."),
            identity: requestedIdentity,
            scope: null,
          });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [requestedIdentity, requestedUserId]);

  if (!requestedIdentity || session?.identity !== requestedIdentity) {
    return <BootstrapLoadingSurface />;
  }
  if (session.error) throw session.error;
  if (!session.scope) return <BootstrapLoadingSurface />;
  return (
    <QuerySession key={session.scope} appVersion={appVersion} scope={session.scope}>
      {children}
    </QuerySession>
  );
}
