import { describe, expect, it } from "vitest";
import { ChatApiError, isRetryableChatError } from "./errors";

describe("isRetryableChatError", function () {
  it("does not retry rate limits", function () {
    expect(
      isRetryableChatError(
        new ChatApiError("Too many requests", {
          code: "RATE_LIMITED",
          status: 429,
        })
      )
    ).toBe(false);
  });

  it("retries transient transport and server failures", function () {
    expect(
      isRetryableChatError(
        new ChatApiError("Network", {
          code: "NETWORK_ERROR",
          status: 0,
        })
      )
    ).toBe(true);
    expect(
      isRetryableChatError(
        new ChatApiError("Unavailable", {
          code: "UNAVAILABLE",
          status: 503,
        })
      )
    ).toBe(true);
  });
});
