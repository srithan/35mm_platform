import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LobbyRoomsWidget,
  type AudioRoomSummary,
} from "./LobbyRoomsWidget";

const ROOM: AudioRoomSummary = {
  id: "room_01",
  title: "Does the director's cut change the ending?",
  topic: "After the credits",
  host: {
    id: "user_host",
    displayName: "Maya Chen",
    avatarUrl: null,
  },
  speakers: [
    { id: "user_1", displayName: "Nico", avatarUrl: null },
    { id: "user_2", displayName: "Sam", avatarUrl: null },
    { id: "user_3", displayName: "Jo", avatarUrl: null },
    { id: "user_4", displayName: "Ari", avatarUrl: null },
  ],
  listenerCount: 1284,
};

describe("LobbyRoomsWidget", () => {
  it("shows an honest empty state when no live-room source is connected", () => {
    render(<LobbyRoomsWidget />);

    expect(screen.getByRole("heading", { name: "The Lobby" })).toBeInTheDocument();
    expect(screen.getByText("No rooms live")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders bounded room summaries and opens the selected room", async () => {
    var onSelectRoom = vi.fn();
    var user = userEvent.setup();

    render(<LobbyRoomsWidget rooms={[ROOM]} onSelectRoom={onSelectRoom} />);

    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
    expect(screen.getByText("Does the director's cut change the ending?")).toBeInTheDocument();
    expect(screen.getByText("1.3k listening")).toBeInTheDocument();
    expect(document.querySelectorAll("img")).toHaveLength(4);

    await user.click(
      screen.getByRole("button", {
        name: "Open audio room: Does the director's cut change the ending?",
      })
    );

    expect(onSelectRoom).toHaveBeenCalledOnce();
    expect(onSelectRoom).toHaveBeenCalledWith("room_01");
  });

  it("caps the sidebar list at four room cards", () => {
    var rooms = Array.from({ length: 6 }, function (_, index) {
      return {
        ...ROOM,
        id: "room_" + index,
        title: "Room " + index,
      };
    });

    render(<LobbyRoomsWidget rooms={rooms} onSelectRoom={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByText("Room 4")).not.toBeInTheDocument();
  });
});
