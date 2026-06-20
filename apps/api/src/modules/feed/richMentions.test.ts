import { describe, expect, it } from "vitest";
import { mentionNotificationRecipientIds } from "./routes.js";

const RICH_TEXT_PREFIX = "__35MM_RICH_TEXT_V1__";

function bodyWithMentions(ids: string[]) {
  return (
    RICH_TEXT_PREFIX +
    JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: ids.map(function (id, index) {
            return {
              type: "mention",
              attrs: {
                id,
                label: "user" + index,
                username: "user" + index,
              },
            };
          }),
        },
      ],
    })
  );
}

describe("mention notification extraction", function () {
  it("extracts unique mention recipients and skips self-mentions", function () {
    var actorId = "11111111-1111-4111-8111-111111111111";
    var mentionedId = "22222222-2222-4222-8222-222222222222";

    expect(
      mentionNotificationRecipientIds(
        bodyWithMentions([actorId, mentionedId, mentionedId]),
        actorId
      )
    ).toEqual([mentionedId]);
  });

  it("ignores plain @username text because it has no stable user id", function () {
    expect(
      mentionNotificationRecipientIds(
        "hello @ava",
        "11111111-1111-4111-8111-111111111111"
      )
    ).toEqual([]);
  });
});
