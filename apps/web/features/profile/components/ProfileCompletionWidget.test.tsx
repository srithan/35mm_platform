import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileCompletionWidget } from "./ProfileCompletionWidget";

const mocks = vi.hoisted(function () {
  return {
    profileCompletion: {
      avatar: false,
      cover: false,
      bio: false,
      location: false,
    },
  };
});

vi.mock("@/features/profile/hooks/useCurrentUserProfile", function () {
  return {
    useCurrentUserProfile: function () {
      return {
        data: {
          username: "maya.frames",
          displayName: "Maya Frames",
          avatarUrl: null,
          profileCompletion: mocks.profileCompletion,
        },
      };
    },
  };
});

describe("ProfileCompletionWidget", function () {
  afterEach(function () {
    mocks.profileCompletion = {
      avatar: false,
      cover: false,
      bio: false,
      location: false,
    };
  });

  it("shows progress and deep-links each missing detail into profile editing", function () {
    mocks.profileCompletion = {
      avatar: true,
      cover: false,
      bio: true,
      location: false,
    };

    render(<ProfileCompletionWidget />);

    expect(screen.getByRole("progressbar", { name: "Profile completion" })).toHaveAttribute(
      "aria-valuenow",
      "50"
    );
    expect(screen.getByText("50%")).toBeVisible();
    expect(screen.getByText("2 details left — you're almost there.")).toBeVisible();
    expect(screen.getByText("Profile photo")).toBeVisible();
    expect(screen.getByText("Bio")).toBeVisible();
    expect(screen.getByRole("link", { name: "Add cover photo" })).toHaveAttribute(
      "href",
      "/maya.frames?editProfile=cover"
    );
    expect(screen.getByRole("link", { name: "Add location" })).toHaveAttribute(
      "href",
      "/maya.frames?editProfile=location"
    );
    expect(screen.queryByRole("link", { name: "Add profile photo" })).not.toBeInTheDocument();
  });

  it("uses starter copy when nothing is complete yet", function () {
    render(<ProfileCompletionWidget />);

    expect(
      screen.getByText("Four quick details help people know who they're following.")
    ).toBeVisible();
  });

  it("leaves no sidebar card behind once profile is complete", function () {
    mocks.profileCompletion = {
      avatar: true,
      cover: true,
      bio: true,
      location: true,
    };

    var { container } = render(<ProfileCompletionWidget />);

    expect(container).toBeEmptyDOMElement();
  });
});
