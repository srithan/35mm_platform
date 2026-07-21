import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Comment } from "./types";
import { CommentCardReplies } from "./CommentCardReplies";

vi.mock("./CommentCard", function () {
  return {
    CommentCard: ({ comment }: { comment: Comment }) => (
      <div data-testid="visible-reply">{comment.text}</div>
    ),
  };
});

function makeReply(id: string): Comment {
  return {
    id,
    username: id,
    avatarInitial: id.charAt(0),
    text: id,
    timestamp: "now",
    likeCount: 0,
    replyCount: 0,
    replies: [],
  };
}

describe("CommentCardReplies", function () {
  it("shows three replies and reveals the remaining replies on click", async function () {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    const replies = ["reply-1", "reply-2", "reply-3", "reply-4", "reply-5"].map(makeReply);
    const { rerender } = render(
      <CommentCardReplies
        replies={replies}
        postId="post-1"
        depth={0}
        expanded={false}
        onExpand={onExpand}
      />
    );

    expect(screen.getAllByTestId("visible-reply")).toHaveLength(3);
    expect(screen.queryByText("reply-4")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show 2 more replies" }));
    expect(onExpand).toHaveBeenCalledTimes(1);

    rerender(
      <CommentCardReplies
        replies={replies}
        postId="post-1"
        depth={0}
        expanded
        onExpand={onExpand}
      />
    );

    expect(screen.getAllByTestId("visible-reply")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /more replies/i })).not.toBeInTheDocument();
  });

  it("shows every reply without a disclosure when three or fewer exist", function () {
    render(
      <CommentCardReplies
        replies={["reply-1", "reply-2"].map(makeReply)}
        postId="post-1"
        depth={0}
        expanded={false}
        onExpand={vi.fn()}
      />
    );

    expect(screen.getAllByTestId("visible-reply")).toHaveLength(2);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
