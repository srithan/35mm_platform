import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostActions } from "./PostActions";

const viewport = vi.hoisted(function () {
  return { isDesktopMd: true };
});

const authPrompt = vi.hoisted(function () {
  return {
    isSignedIn: true,
    promptLogin: vi.fn(),
  };
});

vi.mock("@/lib/hooks/useIsDesktopMd", function () {
  return {
    useIsDesktopMd: function () {
      return viewport.isDesktopMd;
    },
  };
});

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return {
    useAuthPrompt: function () {
      return {
        isLoaded: true,
        isSignedIn: authPrompt.isSignedIn,
        promptLogin: authPrompt.promptLogin,
        requireAuth: function (action: () => void, options?: { message?: string }) {
          if (authPrompt.isSignedIn) {
            action();
            return;
          }
          authPrompt.promptLogin(options);
        },
      };
    },
  };
});

function renderPostActions(options?: {
  initialReposted?: boolean;
  onQuote?: () => void;
  onViewQuotes?: () => void;
  onRepostToggle?: (state: { isReposted: boolean }) => void;
}) {
  return render(
    <PostActions
      likes={12}
      comments={3}
      reposts={1_200}
      initialReposted={options?.initialReposted}
      onQuote={options?.onQuote ?? vi.fn()}
      onViewQuotes={options?.onViewQuotes}
      onRepostToggle={options?.onRepostToggle ?? vi.fn()}
    />
  );
}

describe("PostActions repost options", function () {
  beforeEach(function () {
    viewport.isDesktopMd = true;
    authPrompt.isSignedIn = true;
    authPrompt.promptLogin.mockReset();
  });

  it("opens an anchored Repost and Quote menu on desktop", function () {
    renderPostActions();

    expect(screen.getByText("1.2k")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Repost" }));

    const menu = screen.getByRole("menu", { name: "Repost options" });
    expect(within(menu).getByRole("menuitem", { name: "Repost" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Quote" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "View quotes" })).not.toBeInTheDocument();
  });

  it("renders repost options as a bottom action sheet on mobile", function () {
    viewport.isDesktopMd = false;
    renderPostActions();

    fireEvent.click(screen.getByRole("button", { name: "Repost" }));

    const sheet = screen.getByRole("dialog", { name: "Repost options" });
    expect(within(sheet).getByRole("menuitem", { name: "Repost" })).toBeInTheDocument();
    expect(within(sheet).getByRole("menuitem", { name: "Quote" })).toBeInTheDocument();
    expect(within(sheet).queryByRole("menuitem", { name: "View quotes" })).not.toBeInTheDocument();
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

  it("opens the quote index from the repost menu", function () {
    const onViewQuotes = vi.fn();
    renderPostActions({ onViewQuotes });

    fireEvent.click(screen.getByRole("button", { name: "Repost" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "View quotes" }));

    expect(onViewQuotes).toHaveBeenCalledOnce();
  });

  it("prompts login instead of quoting or reposting when signed out", function () {
    authPrompt.isSignedIn = false;
    const onQuote = vi.fn();
    const onRepostToggle = vi.fn();
    renderPostActions({ onQuote, onRepostToggle });

    fireEvent.click(screen.getByRole("button", { name: "Repost" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Quote" }));
    expect(onQuote).not.toHaveBeenCalled();
    expect(authPrompt.promptLogin).toHaveBeenCalledWith({
      message: "Log in to quote this post.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Repost" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Repost" }));
    expect(onRepostToggle).not.toHaveBeenCalled();
    expect(authPrompt.promptLogin).toHaveBeenCalledWith({
      message: "Log in to repost.",
    });
  });
});
