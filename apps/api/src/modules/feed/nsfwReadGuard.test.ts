import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("NSFW read-path guard", function () {
  it("does not exclude flagged content in feed predicate builders", function () {
    var root = resolve(process.cwd(), "../..");
    var routes = readFileSync(
      resolve(root, "apps/api/src/modules/feed/routes.ts"),
      "utf8"
    );
    var moderation = readFileSync(
      resolve(root, "apps/api/src/lib/moderation.ts"),
      "utf8"
    );
    var moderationRead = readFileSync(
      resolve(root, "apps/api/src/lib/moderationRead.ts"),
      "utf8"
    );

    expect(routes).not.toMatch(/(?:eq|ne)\([^)]*nsfwStatus/);
    expect(routes.toLowerCase()).not.toContain("nsfw_status");
    expect(moderation).not.toContain("nsfwStatus");
    expect(moderationRead).not.toContain("nsfwStatus");
  });
});
