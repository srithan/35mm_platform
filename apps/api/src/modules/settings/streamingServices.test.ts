import { describe, expect, it } from "vitest";
import {
  normalizeStreamingServiceIds,
  streamingProviderIds,
} from "@35mm/types/streaming-services";

describe("streaming service preferences", function () {
  it("rejects unsupported or non-array input", function () {
    expect(normalizeStreamingServiceIds(null)).toBeNull();
    expect(normalizeStreamingServiceIds(["netflix", "unsupported"])).toBeNull();
  });

  it("deduplicates while preserving preference order and resolves provider IDs", function () {
    const serviceIds = normalizeStreamingServiceIds([
      "paramount-plus",
      "netflix",
      "paramount-plus",
    ]);

    expect(serviceIds).toEqual(["paramount-plus", "netflix"]);
    expect(streamingProviderIds(serviceIds ?? [])).toEqual([2303, 2616, 8]);
  });
});
