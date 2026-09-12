import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeSuggestionsSidebar } from "./HomeSuggestionsSidebar";

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

vi.mock("@/features/suggestions/hooks/useSuggestions", function () {
  return {
    usePeopleSuggestions: function () {
      return { data: { suggestions: [] }, isLoading: false };
    },
    useSuggestionFollowMutation: function () {
      return { mutate: vi.fn() };
    },
  };
});

vi.mock("@/features/letterboxd-import", function () {
  return {
    LetterboxdImportWidget: function () {
      return <div>Letterboxd import</div>;
    },
  };
});

describe("HomeSuggestionsSidebar guest rails", function () {
  it("shows suggestions and empty lobby for signed-in users", function () {
    auth.isLoaded = true;
    auth.isSignedIn = true;

    render(<HomeSuggestionsSidebar />);

    expect(screen.getByRole("heading", { name: "Suggestions for you" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Lobby" })).toBeInTheDocument();
    expect(screen.getByText("No rooms live")).toBeInTheDocument();
    expect(screen.getByText("Letterboxd import")).toBeInTheDocument();
  });

  it("hides suggestions and empty lobby for guests", function () {
    auth.isLoaded = true;
    auth.isSignedIn = false;

    render(<HomeSuggestionsSidebar />);

    expect(screen.queryByRole("heading", { name: "Suggestions for you" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The Lobby" })).not.toBeInTheDocument();
    expect(screen.queryByText("No rooms live")).not.toBeInTheDocument();
    expect(screen.queryByText("Letterboxd import")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Site links" })).toBeInTheDocument();
  });
});
