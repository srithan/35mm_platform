import { describe, expect, it } from "vitest";
import { ApiRequestError, shouldRetryApiRead } from "./http";

describe("shouldRetryApiRead", function () {
  it("does not retry client errors or rate limits", function () {
    expect(shouldRetryApiRead(0, new ApiRequestError("Too many requests", 429))).toBe(false);
    expect(shouldRetryApiRead(0, new ApiRequestError("Not found", 404))).toBe(false);
  });

  it("retries transient read failures with a two-retry ceiling", function () {
    expect(shouldRetryApiRead(0, new ApiRequestError("Network", 0))).toBe(true);
    expect(shouldRetryApiRead(1, new ApiRequestError("Unavailable", 503))).toBe(true);
    expect(shouldRetryApiRead(2, new ApiRequestError("Unavailable", 503))).toBe(false);
  });
});
