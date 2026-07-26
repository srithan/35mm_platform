export const SEARCH_INDEXES = {
  films: "films",
  profiles: "users",
  posts: "posts",
} as const;

export type SearchIndexName = (typeof SEARCH_INDEXES)[keyof typeof SEARCH_INDEXES];

export type SearchEntityType = "film" | "profile" | "post";

export interface FilmSearchDocument {
  id: string;
  title: string;
  originalTitle: string | null;
  year: number | null;
  overview: string | null;
  genres: string[];
  director: string | null;
  posterUrl: string | null;
  updatedAt: number;
}

export interface ProfileSearchDocument {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  role: string | null;
  headline: string | null;
  isPrivate: boolean;
  avatarUrl: string | null;
  followerCount: number;
  updatedAt: number;
}

export interface PostSearchDocument {
  id: string;
  authorId: string;
  username: string;
  displayName: string;
  headline: string | null;
  body: string;
  filmTitle: string | null;
  createdAt: number;
  updatedAt: number;
}

export type SearchDocument =
  | FilmSearchDocument
  | ProfileSearchDocument
  | PostSearchDocument;

export interface MeilisearchTaskSummary {
  taskUid: number;
  status: "enqueued" | "processing" | "succeeded" | "failed" | "canceled";
  type: string;
  indexUid?: string | null;
  error?: {
    message?: string;
    code?: string;
    type?: string;
    link?: string;
  } | null;
}

export interface MeilisearchSearchQuery {
  indexUid: SearchIndexName;
  q: string;
  limit: number;
  attributesToRetrieve?: string[];
  filter?: string | string[];
  sort?: string[];
}

export interface MeilisearchSearchResult<THit = Record<string, unknown>> {
  indexUid: string;
  hits: THit[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
}

export interface MeilisearchIndexSettings {
  searchableAttributes: string[];
  displayedAttributes: string[];
  filterableAttributes?: string[];
  sortableAttributes?: string[];
  rankingRules?: string[];
  typoTolerance?: {
    enabled?: boolean;
    minWordSizeForTypos?: {
      oneTypo?: number;
      twoTypos?: number;
    };
  };
  pagination?: {
    maxTotalHits?: number;
  };
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
};

export class MeilisearchRequestError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "MeilisearchRequestError";
    this.status = status;
    this.code = code;
  }
}

function normalizedHost(host: string): string {
  var value = host.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(value)) {
    throw new Error("MEILISEARCH_HOST must be an absolute HTTP(S) URL");
  }
  return value;
}

function responseErrorMessage(payload: unknown, status: number): {
  message: string;
  code: string | null;
} {
  if (payload && typeof payload === "object") {
    var record = payload as Record<string, unknown>;
    return {
      message:
        typeof record.message === "string"
          ? record.message
          : "Meilisearch request failed with status " + status,
      code: typeof record.code === "string" ? record.code : null,
    };
  }
  return {
    message: "Meilisearch request failed with status " + status,
    code: null,
  };
}

export class MeilisearchHttpClient {
  private readonly host: string;
  private readonly apiKey: string;
  private readonly defaultTimeoutMs: number;

  constructor(input: { host: string; apiKey: string; timeoutMs?: number }) {
    this.host = normalizedHost(input.host);
    this.apiKey = input.apiKey.trim();
    this.defaultTimeoutMs = Math.max(500, input.timeoutMs ?? 5_000);
    if (!this.apiKey) throw new Error("Meilisearch API key is required");
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    var controller = new AbortController();
    var timeout = setTimeout(
      function () {
        controller.abort();
      },
      Math.max(500, options.timeoutMs ?? this.defaultTimeoutMs)
    );

    try {
      var response = await fetch(this.host + path, {
        method: options.method ?? "GET",
        headers: {
          Authorization: "Bearer " + this.apiKey,
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      var text = await response.text();
      var payload: unknown = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }
      if (!response.ok) {
        var error = responseErrorMessage(payload, response.status);
        throw new MeilisearchRequestError(error.message, response.status, error.code);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof MeilisearchRequestError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new MeilisearchRequestError("Meilisearch request timed out", 0, "timeout");
      }
      throw new MeilisearchRequestError(
        error instanceof Error ? error.message : "Meilisearch request failed",
        0,
        "network_error"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/health");
  }

  async multiSearch(
    queries: MeilisearchSearchQuery[]
  ): Promise<{ results: MeilisearchSearchResult[] }> {
    return this.request<{ results: MeilisearchSearchResult[] }>("/multi-search", {
      method: "POST",
      body: { queries },
    });
  }

  async createIndex(indexUid: SearchIndexName): Promise<MeilisearchTaskSummary> {
    return this.request<MeilisearchTaskSummary>("/indexes", {
      method: "POST",
      body: { uid: indexUid, primaryKey: "id" },
    });
  }

  async getIndex(
    indexUid: SearchIndexName
  ): Promise<{ uid: string; primaryKey: string | null }> {
    return this.request<{ uid: string; primaryKey: string | null }>(
      "/indexes/" + encodeURIComponent(indexUid)
    );
  }

  async updateSettings(
    indexUid: SearchIndexName,
    settings: MeilisearchIndexSettings
  ): Promise<MeilisearchTaskSummary> {
    return this.request<MeilisearchTaskSummary>(
      "/indexes/" + encodeURIComponent(indexUid) + "/settings",
      {
        method: "PATCH",
        body: settings,
      }
    );
  }

  async replaceDocuments(
    indexUid: SearchIndexName,
    documents: SearchDocument[]
  ): Promise<MeilisearchTaskSummary | null> {
    if (documents.length === 0) return null;
    return this.request<MeilisearchTaskSummary>(
      "/indexes/" + encodeURIComponent(indexUid) + "/documents?primaryKey=id",
      {
        method: "POST",
        body: documents,
        timeoutMs: Math.max(this.defaultTimeoutMs, 15_000),
      }
    );
  }

  async deleteDocuments(
    indexUid: SearchIndexName,
    ids: string[]
  ): Promise<MeilisearchTaskSummary | null> {
    if (ids.length === 0) return null;
    return this.request<MeilisearchTaskSummary>(
      "/indexes/" + encodeURIComponent(indexUid) + "/documents/delete-batch",
      {
        method: "POST",
        body: ids,
      }
    );
  }

  async deleteDocumentsByFilter(
    indexUid: SearchIndexName,
    filter: string
  ): Promise<MeilisearchTaskSummary> {
    return this.request<MeilisearchTaskSummary>(
      "/indexes/" + encodeURIComponent(indexUid) + "/documents/delete",
      {
        method: "POST",
        body: { filter },
      }
    );
  }

  async getTask(taskUid: number): Promise<MeilisearchTaskSummary> {
    return this.request<MeilisearchTaskSummary>("/tasks/" + taskUid);
  }

  async waitForTask(
    task: MeilisearchTaskSummary | null,
    options: { timeoutMs?: number; intervalMs?: number } = {}
  ): Promise<MeilisearchTaskSummary | null> {
    if (!task) return null;
    var timeoutMs = Math.max(1_000, options.timeoutMs ?? 30_000);
    var intervalMs = Math.max(50, options.intervalMs ?? 150);
    var startedAt = Date.now();
    var current = task;

    while (current.status === "enqueued" || current.status === "processing") {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new MeilisearchRequestError(
          "Meilisearch task " + task.taskUid + " timed out",
          0,
          "task_timeout"
        );
      }
      await new Promise<void>(function (resolve) {
        setTimeout(resolve, intervalMs);
      });
      current = await this.getTask(task.taskUid);
    }

    if (current.status !== "succeeded") {
      throw new MeilisearchRequestError(
        current.error?.message ??
          "Meilisearch task " + current.taskUid + " ended with status " + current.status,
        0,
        current.error?.code ?? "task_" + current.status
      );
    }
    return current;
  }
}

export const SEARCH_INDEX_SETTINGS: Record<SearchIndexName, MeilisearchIndexSettings> = {
  [SEARCH_INDEXES.films]: {
    searchableAttributes: ["title", "originalTitle", "director", "genres", "overview"],
    displayedAttributes: ["id"],
    sortableAttributes: ["updatedAt", "year"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    pagination: { maxTotalHits: 200 },
  },
  [SEARCH_INDEXES.profiles]: {
    searchableAttributes: ["username", "displayName", "headline", "bio", "role"],
    displayedAttributes: ["id"],
    filterableAttributes: ["isPrivate"],
    sortableAttributes: ["followerCount", "updatedAt"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
      "followerCount:desc",
    ],
    pagination: { maxTotalHits: 200 },
  },
  [SEARCH_INDEXES.posts]: {
    searchableAttributes: ["headline", "body", "filmTitle", "username", "displayName"],
    displayedAttributes: ["id"],
    filterableAttributes: ["authorId"],
    sortableAttributes: ["createdAt", "updatedAt"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
      "createdAt:desc",
    ],
    pagination: { maxTotalHits: 200 },
  },
};
