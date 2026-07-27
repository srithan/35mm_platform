import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchProfileConnections,
  followUser,
  unfollowUser,
} from "@/features/profile/api/profileApi";
import { ProfileConnectionsModal } from "./ProfileConnectionsModal";

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return {
        getToken: vi.fn().mockResolvedValue("token"),
        isLoaded: true,
        isSignedIn: true,
      };
    },
  };
});

vi.mock("@/features/profile/api/profileApi", function () {
  return {
    fetchProfileConnections: vi.fn(),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
  };
});

vi.mock("@/features/profile/hooks/useCurrentUserProfile", function () {
  return {
    useCurrentUserProfile: function () {
      return {
        data: {
          userId: "viewer-1",
          username: "ava",
          displayName: "Ava Reed",
          avatarUrl: null,
          role: null,
          roleContext: null,
          filmsLoggedCount: 0,
          followerCount: 12840,
          followingCount: 316,
        },
      };
    },
  };
});

vi.mock("./ProfileFollowRequestsSection", function () {
  return {
    ProfileFollowRequestsSection: function (props: { query?: string }) {
      return <div>Requests query: {props.query}</div>;
    },
  };
});

function renderModal(props?: Partial<React.ComponentProps<typeof ProfileConnectionsModal>>) {
  var queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileConnectionsModal
        open
        onClose={vi.fn()}
        username="ava"
        kind="followers"
        isOwnProfile
        displayName="Ava Reed"
        followerCount={12840}
        followingCount={316}
        {...props}
      />
    </QueryClientProvider>
  );
}

afterEach(function () {
  vi.clearAllMocks();
});

describe("ProfileConnectionsModal", function () {
  it("renders a count-led follower view with real avatars and clear identity hierarchy", async function () {
    vi.mocked(fetchProfileConnections).mockResolvedValue({
      items: [
        {
          userId: "user-1",
          username: "mira",
          displayName: "Mira Chen",
          avatarUrl: "https://images.example/mira.jpg",
          followedAt: "2026-07-20T00:00:00.000Z",
          followState: "none",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    renderModal();

    expect(screen.getByRole("heading", { name: "Connections" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Followers/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("12,840 people follow your work.")).toBeInTheDocument();
    expect(await screen.findByText("Mira Chen")).toBeInTheDocument();
    expect(screen.getByText("@mira")).toBeInTheDocument();
    expect(document.querySelector('img[src="https://images.example/mira.jpg"]')).toBeTruthy();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("font-sans");
    expect(dialog.querySelector(".font-mono")).toBeNull();
  });

  it("lets profile owners unfollow directly from their following list", async function () {
    vi.mocked(fetchProfileConnections).mockResolvedValue({
      items: [
        {
          userId: "user-1",
          username: "mira",
          displayName: "Mira Chen",
          avatarUrl: null,
          followedAt: "2026-07-20T00:00:00.000Z",
          followState: "following",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(unfollowUser).mockResolvedValue({
      ok: true,
      isFollowing: false,
      deleted: true,
    });

    renderModal({ kind: "following" });

    await screen.findByText("Mira Chen");
    fireEvent.click(screen.getByRole("button", { name: "Unfollow" }));

    await waitFor(function () {
      expect(unfollowUser).toHaveBeenCalledWith("user-1", "token");
      expect(screen.queryByText("Mira Chen")).not.toBeInTheDocument();
    });
  });

  it("lets viewers unfollow mutual followers without removing the follower row", async function () {
    vi.mocked(fetchProfileConnections).mockResolvedValue({
      items: [
        {
          userId: "user-1",
          username: "mira",
          displayName: "Mira Chen",
          avatarUrl: null,
          followedAt: "2026-07-20T00:00:00.000Z",
          followState: "following",
        },
      ],
      nextCursor: null,
      hasMore: false,
      viewerOwnsProfile: true,
    });
    vi.mocked(unfollowUser).mockResolvedValue({
      ok: true,
      isFollowing: false,
      deleted: true,
    });

    renderModal({ kind: "followers" });

    await screen.findByText("Mira Chen");
    fireEvent.click(screen.getByRole("button", { name: "Unfollow" }));

    await waitFor(function () {
      expect(unfollowUser).toHaveBeenCalledWith("user-1", "token");
      expect(screen.getByText("Mira Chen")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Follow back" })
      ).toBeInTheDocument();
    });
  });

  it("filters loaded connections and exposes follower requests as a proper tab", async function () {
    vi.mocked(fetchProfileConnections).mockResolvedValue({
      items: [
        {
          userId: "user-1",
          username: "mira",
          displayName: "Mira Chen",
          avatarUrl: null,
          followedAt: "2026-07-20T00:00:00.000Z",
          followState: "none",
        },
        {
          userId: "user-2",
          username: "theo",
          displayName: "Theo Bell",
          avatarUrl: null,
          followedAt: "2026-07-19T00:00:00.000Z",
          followState: "following",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    renderModal();
    await screen.findByText("Mira Chen");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search loaded followers" }), {
      target: { value: "theo" },
    });
    expect(screen.queryByText("Mira Chen")).not.toBeInTheDocument();
    expect(screen.getByText("Theo Bell")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Requests" }));
    await waitFor(function () {
      expect(screen.getByRole("tab", { name: "Requests" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
    expect(screen.getByText("Requests query:")).toBeInTheDocument();
  });

  it("switches between Followers and Following without closing the modal", async function () {
    vi.mocked(fetchProfileConnections).mockImplementation(async function (params) {
      return {
        items:
          params.kind === "followers"
            ? [
                {
                  userId: "follower-1",
                  username: "mira",
                  displayName: "Mira Follower",
                  avatarUrl: null,
                  followedAt: "2026-07-20T00:00:00.000Z",
                  followState: "none" as const,
                },
              ]
            : [
                {
                  userId: "following-1",
                  username: "theo",
                  displayName: "Theo Following",
                  avatarUrl: null,
                  followedAt: "2026-07-19T00:00:00.000Z",
                  followState: "following" as const,
                },
              ],
        nextCursor: null,
        hasMore: false,
      };
    });

    renderModal();
    expect(await screen.findByText("Mira Follower")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Following/ }));

    expect(await screen.findByText("Theo Following")).toBeInTheDocument();
    expect(screen.queryByText("Mira Follower")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Connections" })).toBeInTheDocument();
    expect(fetchProfileConnections).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "followers" })
    );
    expect(fetchProfileConnections).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "following" })
    );
  });

  it("lets profile owners follow back people they do not follow", async function () {
    vi.mocked(fetchProfileConnections).mockResolvedValue({
      items: [
        {
          userId: "user-1",
          username: "mira",
          displayName: "Mira Chen",
          avatarUrl: null,
          followedAt: "2026-07-20T00:00:00.000Z",
          followState: "none",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(followUser).mockResolvedValue({
      ok: true,
      isFollowing: true,
      status: "accepted",
      created: true,
    });

    renderModal();
    await screen.findByText("Mira Chen");
    fireEvent.click(screen.getByRole("button", { name: "Follow back" }));

    await waitFor(function () {
      expect(followUser).toHaveBeenCalledWith("user-1", "token");
      expect(screen.queryByRole("button", { name: "Follow back" })).not.toBeInTheDocument();
    });
  });

  it("uses server-authoritative ownership when page identity is stale", async function () {
    vi.mocked(fetchProfileConnections).mockResolvedValue({
      items: [
        {
          userId: "user-1",
          username: "mira",
          displayName: "Mira Chen",
          avatarUrl: null,
          followedAt: "2026-07-20T00:00:00.000Z",
          followState: "none",
        },
      ],
      nextCursor: null,
      hasMore: false,
      viewerOwnsProfile: true,
    });

    renderModal({ isOwnProfile: false });

    await screen.findByText("Mira Chen");
    expect(
      screen.getByRole("button", { name: "Follow back" })
    ).toBeInTheDocument();
  });

  it("shows Requested when follow back targets a private profile", async function () {
    vi.mocked(fetchProfileConnections).mockResolvedValue({
      items: [
        {
          userId: "user-1",
          username: "mira",
          displayName: "Mira Chen",
          avatarUrl: null,
          followedAt: "2026-07-20T00:00:00.000Z",
          followState: "none",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(followUser).mockResolvedValue({
      ok: true,
      isFollowing: false,
      status: "pending",
      created: true,
    });

    renderModal();
    await screen.findByText("Mira Chen");
    fireEvent.click(screen.getByRole("button", { name: "Follow back" }));

    expect(await screen.findByRole("button", { name: "Requested" })).toBeDisabled();
  });
});
