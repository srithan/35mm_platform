import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostCardRepostContext } from "./PostCardRepostContext";

vi.mock("@/components/UsernameLink/UsernameLink", function () {
  return {
    UsernameLink: function ({
      username,
      children,
      className,
    }: {
      username: string;
      children: React.ReactNode;
      className?: string;
    }) {
      return (
        <a href={`/${username}`} className={className}>
          {children}
        </a>
      );
    },
  };
});

describe("PostCardRepostContext", function () {
  it("shows reposter context without replacing original post identity", function () {
    render(
      <PostCardRepostContext
        context={{
          activityId: "activity-1",
          repostedAt: "2026-07-19T16:00:00.000Z",
          user: {
            id: "user-1",
            username: "maya",
            displayName: "Maya Chen",
          },
          users: [
            {
              id: "user-1",
              username: "maya",
              displayName: "Maya Chen",
            },
          ],
          totalCount: 1,
          includesOriginal: true,
        }}
      />
    );

    var mayaLink = screen.getByRole("link", { name: "Maya Chen" });
    expect(mayaLink.parentElement).toHaveTextContent("Maya Chen reposted");
    expect(mayaLink).toHaveAttribute("href", "/maya");
  });

  it("names two reposters", function () {
    var maya = { id: "user-1", username: "maya", displayName: "Maya" };
    var teju = { id: "user-2", username: "teju", displayName: "Teju" };
    render(
      <PostCardRepostContext
        context={{
          activityId: "activity-1",
          repostedAt: "2026-07-19T16:00:00.000Z",
          user: maya,
          users: [maya, teju],
          totalCount: 2,
          includesOriginal: true,
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Maya" }).parentElement)
      .toHaveTextContent("Maya and Teju reposted");
  });

  it("summarizes additional reposters", function () {
    var maya = { id: "user-1", username: "maya", displayName: "Maya" };
    var teju = { id: "user-2", username: "teju", displayName: "Teju" };
    render(
      <PostCardRepostContext
        context={{
          activityId: "activity-1",
          repostedAt: "2026-07-19T16:00:00.000Z",
          user: maya,
          users: [maya, teju],
          totalCount: 8,
          includesOriginal: true,
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Maya" }).parentElement)
      .toHaveTextContent("Maya, Teju and 6 others reposted");
  });

  it("uses You when the viewer reposted the source", function () {
    var maya = { id: "user-1", username: "maya", displayName: "Maya" };
    render(
      <PostCardRepostContext
        context={{
          activityId: "activity-1",
          repostedAt: "2026-07-19T16:00:00.000Z",
          user: maya,
          users: [maya],
          totalCount: 1,
          includesOriginal: true,
        }}
        viewerUserId="user-1"
        viewerHasReposted
      />
    );

    expect(screen.getByText("You").parentElement).toHaveTextContent("You reposted");
    expect(screen.queryByText("Maya")).not.toBeInTheDocument();
  });
});
