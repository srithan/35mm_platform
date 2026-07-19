import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileSidebar } from "./MobileSidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Test User",
      username: "testuser",
      imageUrl: null,
    },
  }),
}));

vi.mock("@/components/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

vi.mock("@/components/Icon/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-icon-name={name} aria-hidden />,
}));

vi.mock("@/components/layout/PostComposerModalContext", () => ({
  useComposerModal: () => ({ openComposerModal: vi.fn() }),
}));

vi.mock("@/features/profile/hooks/useCurrentUserProfile", () => ({
  initialForName: () => "T",
  useCurrentUserProfile: () => ({
    data: {
      displayName: "Test User",
      username: "testuser",
      avatarUrl: null,
      role: null,
      roleContext: null,
      filmsLoggedCount: 0,
      followerCount: 1_248,
      followingCount: 218,
    },
  }),
}));

describe("MobileSidebar", () => {
  it("contains focus and closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container, rerender } = render(<MobileSidebar open onClose={onClose} />);

    const dialog = screen.getByRole("dialog", { name: "Navigation menu" });
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByText("1,248 followers · 218 following")).toBeInTheDocument();
    expect(screen.queryByText(/films logged/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lists" })).toHaveAttribute(
      "href",
      "/testuser/lists"
    );
    expect(screen.getByRole("link", { name: "Diary" })).toHaveAttribute(
      "href",
      "/testuser/diary"
    );
    expect(screen.getByRole("link", { name: "Settings and privacy" })).toBeInTheDocument();
    expect(screen.queryByText("Your Feed")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New post" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Discover" }).querySelector('[data-icon-name="search"]')
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Short Films" }).querySelector('[data-icon-name="frames"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-icon-name="chat"]')).not.toBeNull();

    const links = screen.getAllByRole("link");
    const lastLink = links[links.length - 1];
    lastLink.focus();
    await user.tab();
    expect(links[0]).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<MobileSidebar open={false} onClose={onClose} />);
    expect(document.body.style.overflow).toBe("");
  });
});
