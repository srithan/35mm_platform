import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsNotificationsPanel } from "./SettingsNotificationsPanel";

describe("SettingsNotificationsPanel", () => {
  it("updates toggle values and submits payload", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);

    render(
      <SettingsNotificationsPanel
        initialValues={{
          newFollowers: true,
          likesOnPosts: true,
          commentsAndReplies: true,
          mentions: true,
          festivalUpdates: true,
          watchlistStreaming: true,
          emailDigest: false,
          emailPreferences: {
            likesOnPosts: false,
            repostsOnPosts: false,
            newFollowers: true,
            followRequests: true,
            followRequestApproved: true,
            comments: true,
            replies: true,
            mentions: true,
            filmLogged: false,
          },
        }}
        onSave={onSave}
      />
    );

    const toggles = screen.getAllByRole("checkbox");
    await user.click(toggles[0]);
    await user.click(toggles[6]);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      newFollowers: false,
      likesOnPosts: true,
      commentsAndReplies: true,
      mentions: true,
      festivalUpdates: true,
      watchlistStreaming: true,
      emailDigest: true,
      emailPreferences: {
        likesOnPosts: false,
        repostsOnPosts: false,
        newFollowers: true,
        followRequests: true,
        followRequestApproved: true,
        comments: true,
        replies: true,
        mentions: true,
        filmLogged: false,
      },
    });
  });
});
