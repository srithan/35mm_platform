import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeProfileCompletionSidebar } from "./HomeProfileCompletionSidebar";

const auth = vi.hoisted(function () {
  return { isLoaded: true, isSignedIn: true };
});

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return auth;
    },
  };
});

vi.mock("./ProfileCompletionWidget", function () {
  return {
    ProfileCompletionWidget: function () {
      return <div>Profile completion</div>;
    },
  };
});

describe("HomeProfileCompletionSidebar", function () {
  it("renders the profile setup rail for signed-in users", function () {
    auth.isLoaded = true;
    auth.isSignedIn = true;

    render(<HomeProfileCompletionSidebar />);

    expect(screen.getByLabelText("Profile setup")).toBeInTheDocument();
    expect(screen.getByText("Profile completion")).toBeInTheDocument();
  });

  it("does not render for guests", function () {
    auth.isLoaded = true;
    auth.isSignedIn = false;

    var { container } = render(<HomeProfileCompletionSidebar />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Profile completion")).not.toBeInTheDocument();
  });
});
