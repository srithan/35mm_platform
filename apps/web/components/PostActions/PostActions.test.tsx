import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostActions } from "./PostActions";

const viewport = vi.hoisted(function () {
  return { isDesktopMd: true };
});

vi.mock("@/lib/hooks/useIsDesktopMd", function () {
  return {
    useIsDesktopMd: function () {
      return viewport.isDesktopMd;
    },
  };
});

function renderPostActions(options?: {
  initialReposted?: boolean;
  onQuote?: () => void;
  onRepostToggle?: (state: { isReposted: boolean }) => void;
}) {
  return render(
    <PostActions
      likes={12}
      comments={3}
      reposts={1_200}
      initialReposted={options?.initialReposted}
      onQuote={options?.onQuote ?? vi.fn()}
      onRepostToggle={options?.onRepostToggle ?? vi.fn()}
    />
  );
}

describe("PostActions repost options", function () {
  beforeEach(function () {
    viewport.isDesktopMd = true;
  });

  it("opens an anchored Repost and Quote menu on desktop", function () {
    renderPostActions();

    expect(screen.getByText("1.2k")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Repost" }));

    const menu = screen.getByRole("menu", { name: "Repost options" });
    expect(within(menu).getByRole("menuitem", { name: "Repost" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Quote" })).toBeInTheDocument();
  });

  it("renders repost options as a bottom action sheet on mobile", function () {
    viewport.isDesktopMd = false;
    renderPostActions();

    fireEvent.click(screen.getByRole("button", { name: "Repost" }));

    const sheet = screen.getByRole("dialog", { name: "Repost options" });
    expect(within(sheet).getByRole("menuitem", { name: "Repost" })).toBeInTheDocument();
    expect(within(sheet).getByRole("menuitem", { name: "Quote" })).toBeInTheDocument();
  });

  it("runs selected action and exposes undo when already reposted", function () {
    const onQuote = vi.fn();
    const onRepostToggle = vi.fn();
    const { rerender } = renderPostActions({ onQuote, onRepostToggle });

    fireEvent.click(screen.getByRole("button", { name: "Repost" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Quote" }));
    expect(onQuote).toHaveBeenCalledOnce();
    expect(onRepostToggle).not.toHaveBeenCalled();

    rerender(
      <PostActions
        likes={12}
        comments={3}
        reposts={1_200}
        initialReposted
        onQuote={onQuote}
        onRepostToggle={onRepostToggle}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Repost" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Undo repost" }));
    expect(onRepostToggle).toHaveBeenCalledWith({ isReposted: false });
  });
});
