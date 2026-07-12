import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { moderationActionInternalsForTest } from "./actions.js";
import { isUnresolvedReportStatus } from "./reports.js";

describe("moderation decision logic", function () {
  it("dedupes only unresolved report statuses and permits reporting after resolution", function () {
    expect(isUnresolvedReportStatus("open")).toBe(true);
    expect(isUnresolvedReportStatus("reviewing")).toBe(true);
    expect(isUnresolvedReportStatus("actioned")).toBe(false);
    expect(isUnresolvedReportStatus("dismissed")).toBe(false);
  });

  it("maps enforcement actions to content state and strike behavior", function () {
    expect(moderationActionInternalsForTest.desiredContentStatus("content_hidden")).toBe("hidden");
    expect(moderationActionInternalsForTest.desiredContentStatus("content_removed")).toBe("removed");
    expect(moderationActionInternalsForTest.desiredContentStatus("content_warning_added")).toBe("visible");
    expect(moderationActionInternalsForTest.desiredContentStatus("user_warned")).toBeNull();

    expect(moderationActionInternalsForTest.moderationActionAddsStrike("content_removed")).toBe(false);
    expect(moderationActionInternalsForTest.moderationActionAddsStrike("user_warned")).toBe(true);
    expect(moderationActionInternalsForTest.moderationActionAddsStrike("user_suspended")).toBe(true);
    expect(moderationActionInternalsForTest.moderationActionAddsStrike("user_banned")).toBe(true);
    expect(moderationActionInternalsForTest.moderationActionAddsStrike("escalated")).toBe(true);
  });
});

describe("moderation pagination guard", function () {
  it("does not use OFFSET in moderation API or worker sources", function () {
    var root = resolve(process.cwd(), "../..");
    var files = [
      "apps/api/src/modules/moderation/routes.ts",
      "apps/api/src/modules/moderation/reports.ts",
      "apps/api/src/modules/moderation/adminReadService.ts",
      "apps/api/src/modules/moderation/actions.ts",
      "apps/worker/src/jobs/moderationAutoHide.ts",
      "apps/worker/src/jobs/moderationNotifyReporters.ts",
    ];
    for (var file of files) {
      var source = readFileSync(resolve(root, file), "utf8").toLowerCase();
      expect(source).not.toMatch(/\boffset\s+/);
      expect(source).not.toContain(".offset(");
    }
  });
});
