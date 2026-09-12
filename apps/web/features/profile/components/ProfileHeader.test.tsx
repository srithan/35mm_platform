import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPromptProvider } from "@/features/auth/components/AuthPromptProvider";
import { ProfileHeader } from "./ProfileHeader";

const followMutate = vi.hoisted(function () {
  return vi.fn();
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
      return { isPending: false, mutate: followMutate, variables: undefined };
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

function renderHeader(props?: Partial<typeof baseProps> & { onMessageClick?: () => void; isPrivate?: boolean }) {
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

  it("prompts login for a follow request on a private profile", function () {
    renderHeader({ isPrivate: true });

    fireEvent.click(screen.getAllByRole("button", { name: "Request" })[0]);
    expect(followMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Log in to request to follow this profile."
    );
  });
});
