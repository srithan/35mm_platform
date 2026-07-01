import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

export const QUERY_PERSISTENCE_KEY = "35mm-query-cache";
const CHAT_MESSAGE_PERSIST_LIMIT = 100;

function isChatQueryKey(value: unknown): value is readonly unknown[] {
  return (
    Array.isArray(value) &&
    value[0] === "35mm" &&
    value[1] === "chat"
  );
}

function isFeedQueryKey(value: unknown): value is readonly unknown[] {
  return Array.isArray(value) && value[0] === "feed";
}

function isPersistedClient(value: unknown): value is PersistedClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "clientState" in value &&
    typeof (value as { clientState?: unknown }).clientState === "object" &&
    (value as { clientState?: unknown }).clientState !== null
  );
}

function trimMessageItems(data: unknown): unknown {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as { items?: unknown }).items)
  ) {
    return data;
  }
  const record = data as { items: unknown[] };
  return {
    ...record,
    items: record.items.slice(-CHAT_MESSAGE_PERSIST_LIMIT),
  };
}

function sanitizeChatQueryData(queryKey: readonly unknown[], data: unknown): unknown {
  const scope = queryKey[2];
  if (scope === "messages") {
    return trimMessageItems(data);
  }
  if (scope === "messagesInfinite") {
    return undefined;
  }
  return data;
}

function sanitizePersistedClient(client: PersistedClient): PersistedClient {
  const queries = client.clientState.queries
    .map(function (query) {
      if (isFeedQueryKey(query.queryKey)) {
        return null;
      }
      if (!isChatQueryKey(query.queryKey)) {
        return query;
      }
      const data = sanitizeChatQueryData(query.queryKey, query.state.data);
      if (data === undefined) {
        return null;
      }
      return {
        ...query,
        state: {
          ...query.state,
          data: data,
        },
      };
    })
    .filter(function (query): query is NonNullable<typeof query> {
      return query !== null;
    });
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: queries,
    },
  };
}

function getStorage(): Storage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

export const queryPersister = createSyncStoragePersister({
  storage: getStorage(),
  key: QUERY_PERSISTENCE_KEY,
  throttleTime: 1000,
  serialize: function (client) {
    return JSON.stringify(sanitizePersistedClient(client));
  },
  deserialize: function (cachedString) {
    return sanitizePersistedClient(JSON.parse(cachedString) as PersistedClient);
  },
});

export function removePersistedChatQueries(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const raw = storage.getItem(QUERY_PERSISTENCE_KEY);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedClient(parsed)) {
      return;
    }
    const next: PersistedClient = {
      ...parsed,
      clientState: {
        ...parsed.clientState,
        queries: parsed.clientState.queries.filter(function (query) {
          return !isChatQueryKey(query.queryKey);
        }),
      },
    };
    storage.setItem(QUERY_PERSISTENCE_KEY, JSON.stringify(next));
  } catch {
    storage.removeItem(QUERY_PERSISTENCE_KEY);
  }
}

export function removePersistedQueryCache(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(QUERY_PERSISTENCE_KEY);
}
