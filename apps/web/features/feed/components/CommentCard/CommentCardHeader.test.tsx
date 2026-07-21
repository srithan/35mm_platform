import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommentCardHeader } from "./CommentCardHeader";
import type { Comment } from "./types";

vi.mock("@/components/Avatar", () => ({
  Avatar: ({ className }: { className?: string }) => (
    <div data-testid="comment-avatar" className={className} />
  ),
}));

vi.mock("@/components/UsernameLink/UsernameLink", () => ({
  UsernameLink: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/lib/utils/userRoleHeadline", () => ({
  UserRoleHeadline: () => null,
}));

const comment: Comment = {
  id: "comment-1",
  username: "maya",
  displayName: "Maya",
  avatarInitial: "M",
  text: "Great film.",
  timestamp: "2m",
  likeCount: 0,
  replyCount: 0,
};

function renderHeader(depth: number) {
  render(
    <CommentCardHeader comment={comment} depth={depth} menu={null}>
      <span>Comment body</span>
    </CommentCardHeader>
  );

  return screen.getByTestId("comment-avatar");
}

describe("CommentCardHeader", () => {
  it("keeps the current avatar size for parent comments", () => {
    expect(renderHeader(0)).toHaveClass("h-10", "w-10");
  });

  it("uses a smaller avatar for replies at every nested depth", () => {
    expect(renderHeader(2)).toHaveClass("h-8", "w-8");
  });
});
