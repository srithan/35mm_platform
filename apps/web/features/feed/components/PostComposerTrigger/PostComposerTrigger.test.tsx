import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostComposerTrigger } from "./index";

vi.mock("@/components/Avatar", () => ({
  Avatar: ({ initial, className }: { initial: string; className?: string }) => (
    <div className={className} data-testid="avatar">
      {initial}
    </div>
  ),
}));

const user = {
  name: "Sofia Coppola",
  avatarUrl: null,
  initial: "S",
};

describe("PostComposerTrigger", () => {
  it("renders the simplified trigger when enabled", () => {
    render(
      <PostComposerTrigger
        onOpen={vi.fn()}
        user={user}
        simplified
      />
    );

    expect(screen.getByText("Sofia, What's on your mind?")).toBeInTheDocument();
    expect(screen.getByTestId("avatar")).toHaveClass("h-10", "w-10");
    expect(screen.queryByText("Post")).not.toBeInTheDocument();
    expect(screen.queryByText("Photos/Video")).not.toBeInTheDocument();
  });

  it("keeps the full trigger by default", () => {
    render(
      <PostComposerTrigger
        onOpen={vi.fn()}
        user={user}
      />
    );

    expect(screen.getByText("Post")).toBeInTheDocument();
    expect(screen.getByText("Photos/Video")).toBeInTheDocument();
    expect(screen.queryByText("Sofia, What's on your mind?")).not.toBeInTheDocument();
  });
});
