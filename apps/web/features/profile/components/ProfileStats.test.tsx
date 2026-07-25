import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileStats } from "./ProfileStats";

vi.mock("./ProfileConnectionsModal", function () {
  return {
    ProfileConnectionsModal: function (props: {
      open: boolean;
      kind: "followers" | "following";
    }) {
      return props.open ? <div role="dialog">{props.kind}</div> : null;
    },
  };
});

describe("ProfileStats", function () {
  it("preserves stat order and opens the selected connections view", function () {
    render(
      <ProfileStats
        username="cinemafan"
        displayName="Cinema Fan"
        followerCount={12840}
        followingCount={316}
        filmsLoggedCount={642}
        isOwnProfile
      />
    );

    const stats = screen.getByLabelText("Profile stats");
    expect(stats).toHaveClass("font-sans");
    expect(stats.querySelector(".font-mono")).toBeNull();
    expect(within(stats).getAllByText(/Followers|Following|Films/)).toHaveLength(3);
    expect(stats).toHaveTextContent("316Following12.8kFollowers642Films");

    fireEvent.click(within(stats).getByRole("button", { name: "View 316 following" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("following");
  });
});
