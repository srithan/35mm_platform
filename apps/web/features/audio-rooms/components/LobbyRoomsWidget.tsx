"use client";

import { Radio } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { formatCount } from "@/lib/utils/formatCount";
import { cn } from "@/lib/utils/cn";

export interface AudioRoomPerson {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AudioRoomSummary {
  id: string;
  title: string;
  topic: string | null;
  host: AudioRoomPerson;
  speakers: readonly AudioRoomPerson[];
  listenerCount: number;
}

interface LobbyRoomsWidgetProps {
  rooms?: readonly AudioRoomSummary[];
  onSelectRoom?: (roomId: string) => void;
  /** Guests skip the honest empty state; signed-in users still see it. */
  hideWhenEmpty?: boolean;
}

const MAX_VISIBLE_ROOMS = 4;

function LiveSignal() {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center gap-[2px] rounded-full bg-social-accent-bg"
      aria-hidden
    >
      {[10, 16, 12].map(function (height, index) {
        return (
          <span
            key={height + "-" + index}
            className="w-[2px] animate-pulse rounded-full bg-social-accent motion-reduce:animate-none"
            style={{ height, animationDelay: index * 180 + "ms" }}
          />
        );
      })}
    </span>
  );
}

function ParticipantStack(props: { people: readonly AudioRoomPerson[] }) {
  var visiblePeople = props.people.slice(0, 3);

  return (
    <div className="flex shrink-0 -space-x-2" aria-hidden>
      {visiblePeople.map(function (person) {
        return (
          <Avatar
            key={person.id}
            src={person.avatarUrl}
            initial={person.displayName.slice(0, 1)}
            size="sm"
            className="h-7 w-7 border-2 border-bg text-[10px]"
          />
        );
      })}
    </div>
  );
}

function RoomContent(props: { room: AudioRoomSummary }) {
  var room = props.room;
  var listenerCount = Math.max(0, room.listenerCount);

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar
          src={room.host.avatarUrl}
          initial={room.host.displayName.slice(0, 1)}
          size="sm"
          className="h-7 w-7 text-[10px]"
        />
        <p className="min-w-0 truncate text-[12px] leading-none text-fg-muted">
          <span className="font-bold text-fg">{room.host.displayName}</span>
          {" is hosting"}
        </p>
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-social-accent" aria-hidden />
      </div>

      <h3 className="mt-2 line-clamp-2 text-left text-[15px] font-bold leading-[1.28] tracking-[-0.01em] text-fg">
        {room.title}
      </h3>
      {room.topic ? (
        <p className="mt-1.5 truncate text-left font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-faint">
          {room.topic}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <ParticipantStack people={room.speakers} />
        <span className="font-mono text-[11px] font-semibold tabular-nums text-fg-muted">
          {formatCount(listenerCount)} listening
        </span>
      </div>
    </>
  );
}

function RoomRow(props: {
  room: AudioRoomSummary;
  onSelectRoom?: (roomId: string) => void;
}) {
  var interactive = Boolean(props.onSelectRoom);
  var rowClassName = cn(
    "block w-full px-4 py-3.5",
    interactive &&
      "text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-focus-ring)]"
  );

  if (props.onSelectRoom) {
    return (
      <li>
        <button
          type="button"
          className={rowClassName}
          aria-label={"Open audio room: " + props.room.title}
          onClick={function () {
            props.onSelectRoom?.(props.room.id);
          }}
        >
          <RoomContent room={props.room} />
        </button>
      </li>
    );
  }

  return (
    <li className={rowClassName}>
      <RoomContent room={props.room} />
    </li>
  );
}

export function LobbyRoomsWidget({
  rooms = [],
  onSelectRoom,
  hideWhenEmpty = false,
}: LobbyRoomsWidgetProps) {
  var visibleRooms = rooms.slice(0, MAX_VISIBLE_ROOMS);

  if (hideWhenEmpty && visibleRooms.length === 0) return null;

  return (
    <section
      aria-labelledby="lobby-rooms-heading"
      className="mb-4 overflow-hidden rounded-xl border border-border bg-bg shadow-sm"
    >
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <LiveSignal />
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-social-accent">
            Live conversations
          </p>
          <h2
            id="lobby-rooms-heading"
            className="mt-0.5 font-display text-[21px] font-semibold leading-none text-fg"
          >
            The Lobby
          </h2>
        </div>
      </header>

      {visibleRooms.length > 0 ? (
        <ul className="m-0 list-none divide-y divide-border border-t border-border p-0">
          {visibleRooms.map(function (room) {
            return (
              <RoomRow key={room.id} room={room} onSelectRoom={onSelectRoom} />
            );
          })}
        </ul>
      ) : (
        <div className="border-t border-border px-4 py-5 text-center" role="status">
          <Radio className="mx-auto h-4 w-4 text-fg-faint" strokeWidth={1.75} aria-hidden />
          <p className="mt-2 text-[13px] font-bold text-fg">No rooms live</p>
          <p className="mx-auto mt-1 max-w-[240px] text-[11px] leading-relaxed text-fg-muted">
            Live film conversations will appear here when they begin.
          </p>
        </div>
      )}
    </section>
  );
}
