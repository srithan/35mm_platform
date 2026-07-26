import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MeilisearchHttpClient,
  SEARCH_INDEXES,
} from "@35mm/search";

describe("MeilisearchHttpClient", function () {
  afterEach(function () {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends server key and bounded multi-search payload", async function () {
    var fetchMock = vi.fn(async function (
      _input: string | URL | Request,
      _init?: RequestInit
    ): Promise<Response> {
      return new Response(
        JSON.stringify({
          results: [
            {
              indexUid: SEARCH_INDEXES.films,
              hits: [{ id: "01HX0000000000000000000000" }],
              query: "alien",
              processingTimeMs: 1,
              limit: 5,
              offset: 0,
              estimatedTotalHits: 1,
            },
          ],
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    var client = new MeilisearchHttpClient({
      host: "https://search.example.com/",
      apiKey: "server-key",
    });
    await client.multiSearch([
      {
        indexUid: SEARCH_INDEXES.films,
        q: "alien",
        limit: 5,
        attributesToRetrieve: ["id"],
      },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    var [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://search.example.com/multi-search");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer server-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      queries: [
        {
          indexUid: SEARCH_INDEXES.films,
          q: "alien",
          limit: 5,
          attributesToRetrieve: ["id"],
        },
      ],
    });
  });

  it("surfaces failed asynchronous tasks", async function () {
    vi.stubGlobal(
      "fetch",
      vi.fn(async function () {
        return new Response(
          JSON.stringify({
            taskUid: 12,
            status: "failed",
            type: "documentAdditionOrUpdate",
            error: {
              message: "invalid document",
              code: "invalid_document",
            },
          }),
          { status: 200 }
        );
      })
    );
    var client = new MeilisearchHttpClient({
      host: "https://search.example.com",
      apiKey: "server-key",
    });

    await expect(
      client.waitForTask({
        taskUid: 12,
        status: "enqueued",
        type: "documentAdditionOrUpdate",
      })
    ).rejects.toMatchObject({
      code: "invalid_document",
    });
  });
});
