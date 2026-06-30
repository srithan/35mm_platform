import { describe, expect, it } from "vitest";
import { getBucketRange, getMessageBucket, truncatePreview } from "./chatUtils.js";

describe("chatUtils", function () {
  describe("getMessageBucket", function () {
    it("formats dates as YYYYMM integers", function () {
      expect(getMessageBucket(new Date("2026-06-15T00:00:00Z"))).toBe(202606);
      expect(getMessageBucket(new Date("2026-01-01T00:00:00Z"))).toBe(202601);
      expect(getMessageBucket(new Date("2025-12-31T00:00:00Z"))).toBe(202512);
      expect(getMessageBucket(new Date("2026-10-01T00:00:00Z"))).toBe(202610);
    });
  });

  describe("getBucketRange", function () {
    it("returns a 12 month inclusive range", function () {
      expect(getBucketRange(new Date("2026-06-01T00:00:00Z"))).toEqual([202507, 202606]);
      expect(getBucketRange(new Date("2026-01-01T00:00:00Z"))).toEqual([202502, 202601]);
    });
  });

  describe("truncatePreview", function () {
    it("returns text and media previews", function () {
      expect(truncatePreview("hello", "text")).toBe("hello");
      expect(truncatePreview(null, "image")).toBe("📷 Photo");
      expect(truncatePreview(null, "gif")).toBe("GIF");
      expect(truncatePreview(null, "file")).toBe("📎 File");
      expect(truncatePreview(null, "link")).toBe("🔗 Link");
    });

    it("truncates long previews to 200 characters", function () {
      expect(truncatePreview("a".repeat(201), "text")).toHaveLength(200);
      expect(truncatePreview("a".repeat(201), "text").endsWith("…")).toBe(true);
      expect(truncatePreview("a".repeat(200), "text")).toHaveLength(200);
      expect(truncatePreview("a".repeat(200), "text").endsWith("…")).toBe(true);
      expect(truncatePreview("a".repeat(199), "text")).toBe("a".repeat(199));
    });
  });
});
