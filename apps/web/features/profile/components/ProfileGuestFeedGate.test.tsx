import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPromptProvider } from "@/features/auth/components/AuthPromptProvider";
import { ProfileGuestFeedGate } from "./ProfileGuestFeedGate";

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
    AuthModal: function (props: {
      open: boolean;
      initialMode: string;
      headline: string | null;
    }) {
      if (!props.open) return null;
      return (
        <div role="dialog" data-mode={props.initialMode}>
          {props.headline ?? "Log in"}
        </div>
      );
    },
  };
});

function renderGate(displayName?: string) {
  return render(
    <AuthPromptProvider>
      <ProfileGuestFeedGate username="lemonade" displayName={displayName} />
    </AuthPromptProvider>
  );
}

function gate() {
  return within(screen.getByTestId("profile-guest-feed-gate"));
}

describe("ProfileGuestFeedGate", function () {
  beforeEach(function () {
    class ObserverStub {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("IntersectionObserver", ObserverStub);
  });

  it("renders the teaser headline with the display name", function () {
    renderGate("Lemonade");

    expect(gate().getByText("See Lemonade’s full profile")).toBeInTheDocument();
    expect(gate().getByRole("button", { name: "Continue to 35mm" })).toBeInTheDocument();
  });

  it("falls back to the username when no display name is provided", function () {
    renderGate();

    expect(gate().getByText("See lemonade’s full profile")).toBeInTheDocument();
  });

  it("renders a fixed banner that stays visible while the gate is off-screen", function () {
    renderGate("Lemonade");

    var banner = screen.getByTestId("profile-guest-sticky-banner");
    expect(banner).toHaveAttribute("aria-hidden", "false");
    expect(within(banner).getByText("See Lemonade’s full profile")).toBeInTheDocument();
  });

  it("opens the signup prompt from the primary CTA", function () {
    renderGate("Lemonade");

    fireEvent.click(gate().getByRole("button", { name: "Continue to 35mm" }));

    var dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-mode", "signup");
    expect(dialog).toHaveTextContent("See Lemonade's full profile");
  });

  it("opens the signup prompt from the fixed banner", function () {
    renderGate("Lemonade");

    var banner = screen.getByTestId("profile-guest-sticky-banner");
    fireEvent.click(within(banner).getByRole("button", { name: "Continue to 35mm" }));

    expect(screen.getByRole("dialog")).toHaveAttribute("data-mode", "signup");
  });

  it("opens the login prompt from the secondary link", function () {
    renderGate("Lemonade");

    fireEvent.click(gate().getByRole("button", { name: "Already have an account? Log in" }));

    expect(screen.getByRole("dialog")).toHaveAttribute("data-mode", "login");
  });
});
