import { describe, expect, it } from "vitest";
import {
  appearanceSettingsSchema,
  notificationSettingsSchema,
  privacySettingsSchema,
  profileSettingsSchema,
} from "./settingsSchemas";

describe("settings schemas", () => {
  it("accepts a valid profile payload", () => {
    const result = profileSettingsSchema.safeParse({
      displayName: "Jane Doe",
      username: "jane.doe",
      email: "jane@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid profile payload", () => {
    const result = profileSettingsSchema.safeParse({
      displayName: "A",
      username: "bad user!",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("accepts privacy, notifications, and appearance payloads", () => {
    expect(
      privacySettingsSchema.safeParse({
        privateAccount: false,
        allowMessagesFromAnyone: true,
        showActivityStatus: true,
      }).success
    ).toBe(true);

    expect(
      notificationSettingsSchema.safeParse({
        newFollowers: true,
        likesOnPosts: true,
        commentsAndReplies: true,
        mentions: true,
        festivalUpdates: true,
        watchlistStreaming: false,
        emailDigest: false,
      }).success
    ).toBe(true);

    expect(
      appearanceSettingsSchema.safeParse({
        theme: "dark",
        accentColor: "warm-red",
        videoAutoplay: true,
      }).success
    ).toBe(true);
  });
});
