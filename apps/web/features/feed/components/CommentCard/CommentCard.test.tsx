import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommentCard } from "./CommentCard";
import type { Comment } from "./types";

vi.mock("@/features/profile/hooks/useCurrentUserProfile", () => ({
  useCurrentUserProfile: () => ({ data: null }),
}));

vi.mock("../../hooks/useCommentMutations", () => ({
  useUpdateComment: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("../../hooks/useClampText", () => ({
  useClampText: () => ({
    bodyRef: { current: null },
    measureRef: { current: null },
    isOverflowing: false,
    truncatedText: "",
  }),
}));

vi.mock("@/components/media/NsfwMediaOverlay", () => ({
  NsfwTextReveal: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./CommentCardHeader", () => ({
  CommentCardHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./CommentCardBody", () => ({ CommentCardBody: () => <div>Body</div> }));
vi.mock("./CommentCardActionsBar", () => ({ CommentCardActionsBar: () => null }));
vi.mock("./CommentCardReplyComposer", () => ({ CommentCardReplyComposer: () => null }));
vi.mock("./CommentCardMoreMenu", () => ({ CommentCardMoreMenu: () => null }));
vi.mock("./CommentCardOverlays", () => ({ CommentCardOverlays: () => null }));

function makeComment(id: string, replies: Comment[] = []): Comment {
  return {
    id,
    username: id,
    avatarInitial: id.charAt(0),
    text: id,
    timestamp: "now",
    likeCount: 0,
    replyCount: replies.length,
    replies,
  };
}

describe("CommentCard", () => {
  it("renders replies outside the parent hover surface", () => {
    const parent = makeComment("parent", [makeComment("reply")]);
    const { container } = render(<CommentCard comment={parent} postId="post-1" />);

    const parentCard = container.querySelector<HTMLElement>("#comment-parent");
    const parentHoverSurface = parentCard?.querySelector<HTMLElement>(":scope > .CommentCardHover");
    const replyCard = container.querySelector<HTMLElement>("#comment-reply");

    expect(parentCard).toContainElement(replyCard);
    expect(parentHoverSurface).not.toContainElement(replyCard);
  });
});
