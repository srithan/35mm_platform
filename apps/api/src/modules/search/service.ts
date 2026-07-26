import { and, eq, inArray, ne } from "drizzle-orm";
import {
  films,
  posts,
  profiles,
  users,
} from "@35mm/db/schema";
import {
  MeilisearchHttpClient,
  SEARCH_INDEXES,
} from "@35mm/search";
import type {
  SiteSearchResponse,
  SiteSearchResult,
} from "@35mm/types";
import { richTextBodyToVisibleText } from "@35mm/validators";
import { getDb } from "../../lib/db.js";
import { loadEnv } from "../../lib/env.js";
import {
  blockFiltersForAuthor,
  notBlockedWithViewerSql,
  notMutedByViewerSql,
} from "../../lib/moderation.js";
import { resolveProfileAvatarUrl } from "../media/url.js";

type SearchHit = { id?: unknown };

var client: MeilisearchHttpClient | null = null;

function getMeilisearch(): MeilisearchHttpClient {
  if (client) return client;
  var env = loadEnv();
  client = new MeilisearchHttpClient({
    host: env.MEILISEARCH_HOST,
    apiKey: env.MEILISEARCH_SEARCH_API_KEY,
    timeoutMs: env.MEILISEARCH_REQUEST_TIMEOUT_MS,
  });
  return client;
}

function hitIds(hits: SearchHit[], kind: "text" | "uuid"): string[] {
  var seen = new Set<string>();
  var ids: string[] = [];
  for (var hit of hits) {
    if (typeof hit.id !== "string") continue;
    var id = hit.id.trim();
    if (!id || seen.has(id)) continue;
    if (
      kind === "uuid" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function ranked<T extends { id: string }>(ids: string[], rows: T[]): T[] {
  var byId = new Map(
    rows.map(function (row) {
      return [row.id, row];
    })
  );
  return ids
    .map(function (id) {
      return byId.get(id);
    })
    .filter(function (row): row is T {
      return Boolean(row);
    });
}

function excerpt(value: string, maxLength = 140): string {
  var visible = richTextBodyToVisibleText(value).replace(/\s+/g, " ").trim();
  if (visible.length <= maxLength) return visible;
  return visible.slice(0, maxLength - 1).trimEnd() + "…";
}

async function hydrateFilms(ids: string[]): Promise<SiteSearchResult[]> {
  if (ids.length === 0) return [];
  var rows = await getDb()
    .select({
      id: films.id,
      title: films.title,
      year: films.year,
      posterUrl: films.posterUrl,
      director: films.director,
      genres: films.genres,
    })
    .from(films)
    .where(inArray(films.id, ids));
  return ranked(ids, rows).map(function (row) {
    return {
      id: row.id,
      type: "film" as const,
      title: row.title,
      year: row.year,
      posterUrl: row.posterUrl,
      director: row.director,
      genres: row.genres,
    };
  });
}

async function hydrateProfiles(
  ids: string[],
  viewerUserId: string
): Promise<SiteSearchResult[]> {
  if (ids.length === 0) return [];
  var rows = await getDb()
    .select({
      id: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      isPrivate: profiles.isPrivate,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(
      and(
        inArray(profiles.userId, ids),
        eq(users.status, "active"),
        eq(profiles.moderationStatus, "visible"),
        notBlockedWithViewerSql(viewerUserId, profiles.userId)
      )
    );
  var ordered = ranked(ids, rows);
  return Promise.all(
    ordered.map(async function (row) {
      return {
        id: row.id,
        type: "user" as const,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: await resolveProfileAvatarUrl(
          row.avatarUrl,
          row.id,
          row.avatarVariants,
          "sm"
        ),
        isPrivate: row.isPrivate,
      };
    })
  );
}

async function hydratePosts(
  ids: string[],
  viewerUserId: string
): Promise<SiteSearchResult[]> {
  if (ids.length === 0) return [];
  var rows = await getDb()
    .select({
      id: posts.id,
      username: profiles.username,
      headline: posts.headline,
      body: posts.body,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .innerJoin(users, eq(users.id, posts.userId))
    .where(
      and(
        inArray(posts.id, ids),
        eq(posts.visibility, "public"),
        eq(posts.isDeleted, false),
        eq(posts.moderationStatus, "visible"),
        ne(posts.nsfwStatus, "flagged"),
        eq(posts.isRepost, false),
        eq(users.status, "active"),
        eq(profiles.moderationStatus, "visible"),
        ...blockFiltersForAuthor(viewerUserId, posts.userId),
        notMutedByViewerSql(viewerUserId, posts.userId)
      )
    );
  return ranked(ids, rows).map(function (row) {
    return {
      id: row.id,
      type: "post" as const,
      username: row.username,
      headline: row.headline,
      excerpt: excerpt(row.body),
      createdAt: row.createdAt.toISOString(),
    };
  });
}

function interleave(groups: SiteSearchResult[][]): SiteSearchResult[] {
  var result: SiteSearchResult[] = [];
  var max = Math.max(
    0,
    ...groups.map(function (group) {
      return group.length;
    })
  );
  for (var index = 0; index < max; index += 1) {
    for (var group of groups) {
      if (group[index]) result.push(group[index]);
    }
  }
  return result;
}

export async function searchSite(input: {
  query: string;
  limit: number;
  viewerUserId: string;
}): Promise<SiteSearchResponse> {
  var candidateLimit = Math.min(Math.max(input.limit * 4, 12), 32);
  var response = await getMeilisearch().multiSearch([
    {
      indexUid: SEARCH_INDEXES.films,
      q: input.query,
      limit: candidateLimit,
      attributesToRetrieve: ["id"],
    },
    {
      indexUid: SEARCH_INDEXES.profiles,
      q: input.query,
      limit: candidateLimit,
      attributesToRetrieve: ["id"],
    },
    {
      indexUid: SEARCH_INDEXES.posts,
      q: input.query,
      limit: candidateLimit,
      attributesToRetrieve: ["id"],
    },
  ]);

  var filmsResult = response.results[0];
  var profilesResult = response.results[1];
  var postsResult = response.results[2];
  var [filmItems, profileItems, postItems] = await Promise.all([
    hydrateFilms(hitIds((filmsResult?.hits ?? []) as SearchHit[], "text")).then(
      function (items) {
        return items.slice(0, input.limit);
      }
    ),
    hydrateProfiles(
      hitIds((profilesResult?.hits ?? []) as SearchHit[], "uuid"),
      input.viewerUserId
    ).then(function (items) {
      return items.slice(0, input.limit);
    }),
    hydratePosts(
      hitIds((postsResult?.hits ?? []) as SearchHit[], "uuid"),
      input.viewerUserId
    ).then(function (items) {
      return items.slice(0, input.limit);
    }),
  ]);

  return {
    items: interleave([filmItems, profileItems, postItems]),
    nextCursor: null,
    hasMore: false,
  };
}

export function resetSearchClientForTests(): void {
  client = null;
}
