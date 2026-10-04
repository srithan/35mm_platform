import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPromptProvider } from "@/features/auth/components/AuthPromptProvider";
import { ProfileHeader } from "./ProfileHeader";

const followMutate = vi.hoisted(function () {
  return vi.fn();
});
const followMutationState = vi.hoisted(function () {
  return {
    isPending: false,
    variables: undefined as
      | { userId: string; followState: "none" | "requested" | "following" | "self" }
      | undefined,
  };
});

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return {
        getToken: vi.fn().mockResolvedValue(null),
        isLoaded: true,
        isSignedIn: false,
      };
    },
  };
});

vi.mock("@/features/auth/components/AuthModal", function () {
  return {
    AuthModal: function (props: { open: boolean; message: string | null }) {
      if (!props.open) return null;
      return <div role="dialog">{props.message ?? "Log in"}</div>;
    },
  };
});

vi.mock("../hooks/useProfile", function () {
  return {
    useFollowToggle: function () {
      return { ...followMutationState, mutate: followMutate };
    },
    useBlockUserMutation: function () {
      return { isPending: false, mutate: vi.fn() };
    },
    useMuteUserMutation: function () {
      return { isPending: false, mutate: vi.fn() };
    },
  };
});

vi.mock("@/features/moderation/components/ReportFlow", function () {
  return {
    ReportFlow: function (props: { open: boolean }) {
      return props.open ? <div>Report flow</div> : null;
    },
  };
});

vi.mock("./ProfileStats", function () {
  return {
    ProfileStats: function () {
      return <div>Stats</div>;
    },
  };
});

vi.mock("./ProfileDetails", function () {
  return {
    ProfileDetails: function () {
      return <div>Details</div>;
    },
  };
});

vi.mock("./ProfilePictureUpload", function () {
  return {
    ProfilePictureUpload: function (props: { children: unknown }) {
      return props.children;
    },
  };
});

vi.mock("./EditProfileModal", function () {
  return {
    EditProfileModal: function () {
      return null;
    },
  };
});

const baseProps = {
  userId: "user-1",
  username: "pat",
  displayName: "Pat",
  bio: "Hello",
  followerCount: 12,
  followingCount: 3,
  filmsLoggedCount: 8,
  followState: "none" as const,
};

function renderHeader(props?: Partial<ComponentProps<typeof ProfileHeader>>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthPromptProvider>
        <ProfileHeader {...baseProps} {...props} />
      </AuthPromptProvider>
    </QueryClientProvider>
  );
}

describe("ProfileHeader guest actions", function () {
  beforeEach(function () {
    followMutate.mockReset();
    followMutationState.isPending = false;
    followMutationState.variables = undefined;
  });
  it("prompts login for follow and message, and keeps More to Share only", function () {
    const onMessageClick = vi.fn();
    renderHeader({ onMessageClick });

    fireEvent.click(screen.getAllByRole("button", { name: "Follow" })[0]);
    expect(followMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Log in to follow this profile."
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Message Pat" })[0]);
    expect(onMessageClick).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Log in to send a message.");

    fireEvent.click(screen.getByRole("button", { name: "More profile actions" }));
    expect(screen.getByRole("menuitem", { name: "Share profile" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Report" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Mute/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Block/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Add to list" })).not.toBeInTheDocument();
  });

  it("aligns single-column desktop actions beside the overlapping avatar", function () {
    const { container } = renderHeader({
      isOwnProfile: true,
      followState: "self",
      singleColumnDesktop: true,
    });

    const desktopEditButton = screen
      .getAllByRole("button", { name: "Edit profile" })
      .find((button) => button.classList.contains("h-auto"));
    const desktopActionRow = desktopEditButton?.parentElement?.parentElement;

    expect(desktopActionRow).toHaveClass("md:min-h-20", "md:items-start", "md:pt-4");
    expect(screen.getAllByText("Details")[0].parentElement).toHaveClass("pt-2");
    expect(container.querySelector(".ProfileHeader")).not.toHaveClass(
      "md:border-b"
    );
  });

  it("prompts login for a follow request on a private profile", function () {
    renderHeader({ isPrivate: true });

    fireEvent.click(screen.getAllByRole("button", { name: "Request" })[0]);
    expect(followMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Log in to request to follow this profile."
    );
  });

  it("separates incoming follow requests from primary profile actions", function () {
    renderHeader({ hasIncomingFollowRequest: true });

    expect(screen.getAllByLabelText("Follow request from Pat")).toHaveLength(2);
    expect(screen.getAllByText("Wants to follow you")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Follow" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Accept follow request" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Decline follow request" })).toHaveLength(2);
  });

  it("shows optimistic follow state without network-progress copy", function () {
    followMutationState.isPending = true;
    followMutationState.variables = { userId: "user-1", followState: "none" };

    renderHeader({ followState: "following" });

    expect(screen.getAllByRole("button", { name: "Following" })).toHaveLength(2);
    expect(screen.queryByText("Following...")).not.toBeInTheDocument();
  });

  it("shows optimistic unfollow state without network-progress copy", function () {
    followMutationState.isPending = true;
    followMutationState.variables = { userId: "user-1", followState: "following" };

    renderHeader({ followState: "none" });

    expect(screen.getAllByRole("button", { name: "Follow" })).toHaveLength(2);
    expect(screen.queryByText("Unfollowing...")).not.toBeInTheDocument();
  });
});
