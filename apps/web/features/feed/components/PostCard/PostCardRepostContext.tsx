"use client";

import { Icon } from "@/components/Icon/Icon";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import type { PostCardRepostContext as RepostContext } from "./types";

type RepostActor =
  | { kind: "viewer" }
  | { kind: "user"; user: RepostContext["user"] };

export function PostCardRepostContext({
  context,
  viewerUserId,
  viewerHasReposted = false,
}: {
  context: RepostContext;
  viewerUserId?: string | null;
  viewerHasReposted?: boolean;
}) {
  var namedUsers = context.users.length > 0 ? context.users : [context.user];
  var viewerIsNamed = Boolean(
    viewerUserId && namedUsers.some(function (user) { return user.id === viewerUserId; })
  );
  var showViewer = viewerHasReposted || viewerIsNamed;
  var otherUsers = viewerUserId
    ? namedUsers.filter(function (user) { return user.id !== viewerUserId; })
    : showViewer
      ? namedUsers.slice(1)
      : namedUsers;
  var actors: RepostActor[] = showViewer
    ? [
        { kind: "viewer" },
        ...otherUsers.slice(0, 1).map(function (user): RepostActor {
          return { kind: "user", user };
        }),
      ]
    : namedUsers.slice(0, 2).map(function (user): RepostActor {
        return { kind: "user", user };
      });
  var totalCount = Math.max(context.totalCount, actors.length);
  var remainingCount = Math.max(0, totalCount - actors.length);

  function renderActor(actor: RepostActor) {
    if (actor.kind === "viewer") {
      return <span className="font-semibold text-fg-muted">You</span>;
    }
    return (
      <UsernameLink
        username={actor.user.username}
        className="font-semibold text-fg-muted hover:text-fg hover:underline"
      >
        {actor.user.displayName}
      </UsernameLink>
    );
  }

  return (
    <div className="mb-1 flex min-h-5 items-center gap-1.5 pl-[42px] pr-8 text-[12px] leading-5 text-fg-muted">
      <Icon
        name="repost"
        className="h-3.5 w-3.5 shrink-0 text-repost"
        strokeWidth={1.9}
        aria-hidden
      />
      <span className="min-w-0 truncate">
        {renderActor(actors[0])}
        {actors[1] ? (
          <>
            {remainingCount > 0 ? ", " : " and "}
            {renderActor(actors[1])}
          </>
        ) : null}
        {remainingCount > 0 ? (
          <> and {remainingCount} {remainingCount === 1 ? "other" : "others"}</>
        ) : null}
        {" reposted"}
      </span>
    </div>
  );
}
