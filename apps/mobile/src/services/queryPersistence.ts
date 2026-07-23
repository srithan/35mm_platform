import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import * as Crypto from "expo-crypto";

import { reportMobileDiagnostic } from "@/services/diagnostics";

export const MOBILE_QUERY_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1_000;
const QUERY_CACHE_PREFIX = "@35mm/query-cache/v1";
const ACTIVE_SCOPE_KEY = `${QUERY_CACHE_PREFIX}/active-scope`;
const MAX_PERSISTED_QUERIES = 32;
const MAX_PERSISTED_QUERY_BYTES = 256 * 1_024;
const MAX_PERSISTED_CACHE_BYTES = 1_024 * 1_024;
let scopeTransitionQueue: Promise<void> = Promise.resolve();

export interface MobileQueryPersistencePolicy {
  readonly classification: "non-sensitive-public" | "non-sensitive-user";
  readonly bounded: true;
}

export interface MobileQueryMeta {
  readonly mobilePersistence?: MobileQueryPersistencePolicy;
}

function isPersistedClient(value: unknown): value is PersistedClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "timestamp" in value &&
    "buster" in value &&
    "clientState" in value &&
    typeof (value as { clientState?: unknown }).clientState === "object" &&
    (value as { clientState?: { queries?: unknown } }).clientState !== null &&
    Array.isArray((value as { clientState: { queries?: unknown } }).clientState.queries)
  );
}

export function shouldPersistMobileQuery(query: Query): boolean {
  const meta = query.meta as MobileQueryMeta | undefined;
  return (
    query.state.status === "success" &&
    query.state.fetchStatus === "idle" &&
    meta?.mobilePersistence?.bounded === true &&
    (meta.mobilePersistence.classification === "non-sensitive-public" ||
      meta.mobilePersistence.classification === "non-sensitive-user")
  );
}

export function serializeMobileQueryCache(client: PersistedClient): string {
  const newestFirst = [...client.clientState.queries].sort(
    (left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt,
  );
  const queries: typeof client.clientState.queries = [];
  let bytes = 0;
  for (const query of newestFirst) {
    if (queries.length >= MAX_PERSISTED_QUERIES) break;
    const serialized = JSON.stringify(query);
    if (serialized.length > MAX_PERSISTED_QUERY_BYTES) continue;
    if (bytes + serialized.length > MAX_PERSISTED_CACHE_BYTES) break;
    bytes += serialized.length;
    queries.push(query);
  }
  return JSON.stringify({
    ...client,
    clientState: { ...client.clientState, queries },
  });
}

export function deserializeMobileQueryCache(value: string): PersistedClient {
  const parsed = JSON.parse(value) as unknown;
  if (!isPersistedClient(parsed)) throw new Error("Persisted query cache is invalid.");
  return parsed;
}

function storageKey(scope: string): string {
  return `${QUERY_CACHE_PREFIX}/${scope}`;
}

export async function resolveQueryCacheScope(userId: string | null): Promise<string> {
  if (!userId) return "guest";
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, userId);
  return `user-${digest.slice(0, 24)}`;
}

async function performScopeTransition(userId: string | null): Promise<string> {
  const nextScope = await resolveQueryCacheScope(userId);
  const previousScope = await AsyncStorage.getItem(ACTIVE_SCOPE_KEY);
  if (previousScope && previousScope !== nextScope) {
    await AsyncStorage.removeItem(storageKey(previousScope));
  }
  await AsyncStorage.setItem(ACTIVE_SCOPE_KEY, nextScope);
  return nextScope;
}

export function transitionQueryCacheScope(userId: string | null): Promise<string> {
  const transition = scopeTransitionQueue.then(() => performScopeTransition(userId));
  scopeTransitionQueue = transition.then(
    () => undefined,
    () => undefined,
  );
  return transition;
}

export function createMobileQueryPersister(scope: string) {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: storageKey(scope),
    throttleTime: 1_000,
    serialize: serializeMobileQueryCache,
    deserialize: deserializeMobileQueryCache,
    retry: ({ error }) => {
      reportMobileDiagnostic({
        source: "persistence",
        code: "QUERY_CACHE_WRITE_FAILED",
        operation: "query-cache.persist",
      });
      if (!(error instanceof Error)) {
        reportMobileDiagnostic({
          source: "persistence",
          code: "QUERY_CACHE_WRITE_UNKNOWN_ERROR",
          operation: "query-cache.persist",
        });
      }
      return undefined;
    },
  });
}
