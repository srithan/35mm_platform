import { describe, expect, it } from "vitest";
import { createPostSchema } from "@35mm/validators";

describe("createPostSchema quote relation", function () {
  it("accepts a UUID quoted source id", function () {
    var result = createPostSchema.safeParse({
      type: "text",
      body: "My commentary",
      quotedPostId: "11111111-1111-4111-8111-111111111112",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed quoted source id", function () {
    var result = createPostSchema.safeParse({
      type: "text",
      body: "My commentary",
      quotedPostId: "not-a-post-id",
    });
    expect(result.success).toBe(false);
  });
});
