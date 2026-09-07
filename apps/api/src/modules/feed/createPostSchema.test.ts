import { describe, expect, it } from "vitest";
import { createCommentSchema, createPostSchema } from "@35mm/validators";

describe("createPostSchema quote relation", function () {
  it("accepts a UUID quoted source id", function () {
    var result = createPostSchema.safeParse({
      type: "text",
      body: "My commentary",
      quotedPostId: "11111111-1111-4111-8111-111111111112",
    });
    expect(result.success).toBe(true);
  });

  it("rejects quotes on discussion, log, and review posts", function () {
    var quotedPostId = "11111111-1111-4111-8111-111111111112";
    var film = {
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      title: "Fight Club",
      year: 1999,
      posterUrl: null,
      genres: [],
      rating: null,
    };

    function expectQuotedPostRejected(input: Record<string, unknown>) {
      var result = createPostSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(
        result.error.issues.some(function (issue) {
          return issue.path[0] === "quotedPostId";
        })
      ).toBe(true);
    }

    expectQuotedPostRejected({
      type: "discussion",
      headline: "What did you think?",
      body: "Let's talk about it.",
      quotedPostId,
    });
    expectQuotedPostRejected({
      type: "log",
      body: "Logged it.",
      quotedPostId,
      film,
    });
    expectQuotedPostRejected({
      type: "review",
      body: "A longer review that stays on a regular quote path should still fail.",
      quotedPostId,
      film,
    });
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

describe("NSFW author input validation", function () {
  it("accepts only declared post categories", function () {
    expect(createPostSchema.safeParse({
      type: "text",
      body: "content",
      authorNsfwCategories: ["nudity", "sensitive"],
    }).success).toBe(true);

    expect(createPostSchema.safeParse({
      type: "text",
      body: "content",
      authorNsfwCategories: ["unsupported"],
    }).success).toBe(false);
  });

  it("accepts only declared comment categories", function () {
    expect(createCommentSchema.safeParse({
      body: "content",
      authorNsfwCategories: ["violence"],
    }).success).toBe(true);

    expect(createCommentSchema.safeParse({
      body: "content",
      authorNsfwCategories: ["unsupported"],
    }).success).toBe(false);
  });

  it("strips client-supplied nsfwStatus", function () {
    var post = createPostSchema.parse({
      type: "text",
      body: "content",
      nsfwStatus: "flagged",
    });
    var comment = createCommentSchema.parse({
      body: "content",
      nsfwStatus: "flagged",
    });

    expect(post).not.toHaveProperty("nsfwStatus");
    expect(comment).not.toHaveProperty("nsfwStatus");
  });
});

describe("comment GIPHY validation", function () {
  it("accepts GIPHY media URLs and GIF-only comment payloads", function () {
    expect(createCommentSchema.safeParse({
      body: "",
      gifUrl: "https://media2.giphy.com/media/example/giphy.gif?cid=35mm",
    }).success).toBe(true);
  });

  it("rejects non-GIPHY and insecure GIF URLs", function () {
    expect(createCommentSchema.safeParse({
      body: "reaction",
      gifUrl: "https://attacker.example/giphy.gif",
    }).success).toBe(false);

    expect(createCommentSchema.safeParse({
      body: "reaction",
      gifUrl: "http://media.giphy.com/media/example/giphy.gif",
    }).success).toBe(false);
  });
});
