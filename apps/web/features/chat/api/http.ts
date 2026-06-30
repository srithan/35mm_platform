/**
 * Minimal fetch wrapper for chat REST — timeouts, JSON, idempotency, auth hook.
 */

import { CHAT_HTTP } from "../config/runtimeConfig";
import { ChatApiError } from "./errors";

export type GetAccessToken = () => string | null | Promise<string | null>;

function mergeHeaders(
  base: HeadersInit | undefined,
  extra: Record<string, string>
): Headers {
  const h = new Headers(base);
  Object.keys(extra).forEach(function (k) {
    h.set(k, extra[k]);
  });
  return h;
}

export async function chatHttpJson<T>(opts: {
  baseUrl: string;
  path: string;
  method?: string;
  body?: unknown;
  getAccessToken?: GetAccessToken;
  idempotencyKey?: string;
  signal?: AbortSignal;
}): Promise<T> {
  const url = opts.baseUrl + CHAT_HTTP.restPrefix + opts.path;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }
  const token = opts.getAccessToken ? await opts.getAccessToken() : null;
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const controller = new AbortController();
  const t = window.setTimeout(function () {
    controller.abort();
  }, CHAT_HTTP.timeoutMs);
  if (opts.signal) {
    opts.signal.addEventListener(
      "abort",
      function () {
        window.clearTimeout(t);
        controller.abort();
      },
      { once: true }
    );
  }

  try {
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: mergeHeaders(headers, {}),
      body:
        opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    window.clearTimeout(t);

    const requestId =
      res.headers.get("x-request-id") ||
      res.headers.get("cf-ray") ||
      undefined;
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch (_e) {
        json = null;
      }
    }

    if (!res.ok) {
      let errMsg = res.statusText || "Request failed";
      let errCode = "http_error";
      if (json && typeof json === "object" && json !== null) {
        const o = json as Record<string, unknown>;
        if (typeof o.message === "string" && o.message) {
          errMsg = o.message;
        }
        if (typeof o.code === "string" && o.code) {
          errCode = o.code;
        }
      }
      throw new ChatApiError(errMsg, {
        code: errCode,
        status: res.status,
        requestId: requestId,
        details: json,
      });
    }

    return json as T;
  } catch (e) {
    window.clearTimeout(t);
    if (e instanceof ChatApiError) {
      throw e;
    }
    if (e instanceof Error && e.name === "AbortError") {
      throw new ChatApiError("Request timed out or was aborted", {
        code: "aborted",
        status: 0,
      });
    }
    var networkMessage =
      e instanceof Error && e.message.trim().length > 0
        ? e.message
        : "Network error";
    if (networkMessage === "Failed to fetch" || networkMessage === "fetch failed") {
      networkMessage =
        "Could not reach the chat API. Check that the API is running and CORS is configured.";
    }
    throw new ChatApiError(networkMessage, {
      code: "network",
      status: 0,
    });
  }
}
