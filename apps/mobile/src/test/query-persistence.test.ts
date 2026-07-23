import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, dehydrate } from "@tanstack/react-query";

import {
  deserializeMobileQueryCache,
  serializeMobileQueryCache,
  shouldPersistMobileQuery,
  transitionQueryCacheScope,
} from "@/services/queryPersistence";

describe("mobile query persistence policy", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("persists only successful, idle queries with explicit bounded classification", async () => {
    const client = new QueryClient();
    await client.fetchQuery({
      queryKey: ["film", "film-1"],
      queryFn: async () => ({ id: "film-1" }),
      meta: {
        mobilePersistence: {
          bounded: true,
          classification: "non-sensitive-public",
        },
      },
    });
    await client.fetchQuery({
      queryKey: ["private", "profile"],
      queryFn: async () => ({ email: "private@example.test" }),
    });

    const persisted = {
      timestamp: Date.now(),
      buster: "test",
      clientState: dehydrate(client, {
        shouldDehydrateQuery: shouldPersistMobileQuery,
      }),
    };
    const restored = deserializeMobileQueryCache(
      serializeMobileQueryCache(persisted),
    );

    expect(restored.clientState.queries).toHaveLength(1);
    expect(restored.clientState.queries[0]?.queryKey).toEqual([
      "film",
      "film-1",
    ]);
    expect(JSON.stringify(restored)).not.toContain("private@example.test");
    client.clear();
  });

  it("drops oversized entries instead of creating an unbounded device cache", () => {
    const client = new QueryClient();
    client.setQueryData(["oversized"], "x".repeat(300 * 1_024));
    const dehydrated = dehydrate(client);
    const restored = deserializeMobileQueryCache(
      serializeMobileQueryCache({
        timestamp: Date.now(),
        buster: "test",
        clientState: dehydrated,
      }),
    );

    expect(restored.clientState.queries).toHaveLength(0);
    client.clear();
  });

  it("pseudonymizes user scopes and removes the prior account cache", async () => {
    const firstScope = await transitionQueryCacheScope("user-a");
    expect(firstScope).toMatch(/^user-[a-f0-9]{24}$/);
    expect(firstScope).not.toContain("user-a");
    const firstCacheKey = `@35mm/query-cache/v1/${firstScope}`;
    await AsyncStorage.setItem(firstCacheKey, "cached-data");

    const secondScope = await transitionQueryCacheScope("different-user-id");

    expect(secondScope).not.toBe(firstScope);
    expect(await AsyncStorage.getItem(firstCacheKey)).toBeNull();
  });
});
