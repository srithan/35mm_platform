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

  it("accepts a validated link preview", function () {
    var result = createPostSchema.safeParse({
      type: "text",
      body: "Read this https://example.com/story",
      linkPreview: {
        url: "https://example.com/story",
        title: "Example story",
        description: "Story description",
        image: "https://example.com/story.jpg",
        domain: "example.com",
        provider: "link",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkPreview?.presentation).toBe("url_and_card");
    }
  });

  it("rejects spoofed link preview domains", function () {
    var result = createPostSchema.safeParse({
      type: "text",
      body: "Read this https://example.com/story",
      linkPreview: {
        url: "https://example.com/story",
        title: "Example story",
        description: null,
        image: null,
        domain: "attacker.example",
        provider: "link",
      },
    });

    expect(result.success).toBe(false);
  });
});
