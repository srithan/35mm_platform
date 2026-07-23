import { describe, expect, it, vi } from "vitest";

import { ApiClient, ApiClientError } from "../src/index.js";

function client(
  fetchImpl: typeof fetch,
  overrides: Partial<ConstructorParameters<typeof ApiClient>[0]> = {},
) {
  return new ApiClient({
    baseUrl: "https://api.example.test",
    fetch: fetchImpl,
    createRequestId: () => "request-1",
    platform: {
      platform: "ios",
      appVersion: "1.0.0",
      appVariant: "development",
    },
    ...overrides,
  });
}

describe("ApiClient", () => {
  it("injects bearer, request, and platform headers", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer session-token");
      expect(headers.get("X-Request-ID")).toBe("request-1");
      expect(headers.get("X-35mm-Platform")).toBe("ios");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    await expect(
      client(fetchImpl, { getToken: async () => "session-token" }).request("/v1/me", {
        auth: "required",
        operation: "profile.me",
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("decodes standard API errors without retaining response payloads", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ code: "RATE_LIMITED", message: "Slow down", private: "discarded" }),
        { status: 429, headers: { "x-request-id": "server-request" } },
      ),
    ) as typeof fetch;

    await expect(
      client(fetchImpl).request("/v1/feed", { operation: "feed.home" }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      kind: "http",
      message: "Slow down",
      requestId: "server-request",
      retryable: true,
      status: 429,
    });
  });

  it("requires an idempotency key before retrying a mutation", async () => {
    await expect(
      client(vi.fn() as unknown as typeof fetch).request("/v1/feed", {
        method: "POST",
        maxAttempts: 2,
        operation: "feed.create",
      }),
    ).rejects.toMatchObject({
      code: "CLIENT_CONFIGURATION_ERROR",
      kind: "configuration",
    });
  });

  it("retries bounded safe reads and validates response contracts", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 7 }), { status: 200 })) as typeof fetch;
    const sleep = vi.fn(async () => undefined);

    const result = await client(fetchImpl, { sleep, random: () => 0.5 }).request(
      "/v1/value",
      {
        maxAttempts: 2,
        operation: "value.read",
        parser(value) {
          if (typeof value !== "object" || value === null || !("value" in value)) {
            throw new Error("invalid");
          }
          return Number((value as { value: unknown }).value);
        },
      },
    );

    expect(result).toBe(7);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("distinguishes required-auth and caller cancellation failures", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}")) as typeof fetch;
    await expect(
      client(fetchImpl, { getToken: async () => null }).request("/v1/me", {
        auth: "required",
        operation: "profile.me",
      }),
    ).rejects.toMatchObject({ code: "AUTH_REQUIRED", kind: "auth" });

    const controller = new AbortController();
    controller.abort();
    const abortingFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return new Response("{}");
    }) as typeof fetch;
    await expect(
      client(abortingFetch).request("/v1/feed", {
        operation: "feed.home",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: "REQUEST_ABORTED", kind: "aborted" });
  });

  it("reports only redacted diagnostic context", async () => {
    const onDiagnostic = vi.fn();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("contains network details");
    }) as typeof fetch;

    await expect(
      client(fetchImpl, { onDiagnostic }).request("/v1/feed?viewer=private", {
        operation: "feed.home",
      }),
    ).rejects.toBeInstanceOf(ApiClientError);

    expect(onDiagnostic).toHaveBeenCalledWith({
      kind: "network",
      code: "NETWORK_ERROR",
      operation: "feed.home",
      requestId: "request-1",
      status: null,
      retryable: true,
    });
    expect(JSON.stringify(onDiagnostic.mock.calls)).not.toContain("viewer=private");
  });
});
