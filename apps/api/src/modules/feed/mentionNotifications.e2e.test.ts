import { describe, expect, it } from "vitest";
import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";

const runE2e = process.env.RUN_MENTION_E2E === "1";
const describeMentionE2e = runE2e ? describe : describe.skip;
const apiBaseUrl = process.env.API_E2E_BASE_URL ?? "http://127.0.0.1:4000";

type E2eUser = {
  clerkId: string;
  dbId: string;
  username: string;
};

function richMentionBody(prefix: string, user: E2eUser) {
  return "__35MM_RICH_TEXT_V1__" + JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: prefix + " " },
          {
            type: "mention",
            attrs: { id: user.dbId, label: user.username, username: user.username },
          },
        ],
      },
    ],
  });
}

async function apiRequest(path: string, token: string, options: RequestInit = {}) {
  var response = await fetch(apiBaseUrl + path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: "Bearer " + token,
      ...options.headers,
    },
  });
  var text = await response.text();
  var body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch (_error) {
    body = text;
  }
  expect(response.ok, `${options.method ?? "GET"} ${path} -> ${response.status}: ${text}`).toBe(true);
  return body;
}

async function activeUsers(): Promise<E2eUser[]> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  var sql = neon(process.env.DATABASE_URL);
  var rows = await sql`
    select u.id, u.clerk_user_id, p.username
    from users u
    inner join profiles p on p.user_id = u.id
    where u.status = 'active'
      and u.clerk_user_id is not null
    order by p.created_at desc
    limit 10
  `;
  return rows.map(function (row) {
    return {
      dbId: String(row.id),
      clerkId: String(row.clerk_user_id),
      username: String(row.username),
    };
  });
}

async function unmutedRecipient(actorId: string, exclude: Set<string>) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  var sql = neon(process.env.DATABASE_URL);
  var rows = await sql`
    select u.id, u.clerk_user_id, p.username
    from users u
    inner join profiles p on p.user_id = u.id
    left join user_settings s on s.user_id = u.id
    where u.status = 'active'
      and u.id <> ${actorId}
      and coalesce(s.notify_mentions, true) = true
      and not exists (
        select 1 from user_mutes m
        where m.muter_id = u.id
          and m.muted_id = ${actorId}
      )
      and not exists (
        select 1 from user_blocks b
        where (b.blocker_id = u.id and b.blocked_id = ${actorId})
           or (b.blocker_id = ${actorId} and b.blocked_id = u.id)
      )
    order by p.created_at desc
  `;
  for (var row of rows) {
    var id = String(row.id);
    if (exclude.has(id)) continue;
    return {
      dbId: id,
      clerkId: String(row.clerk_user_id),
      username: String(row.username),
    };
  }
  throw new Error("Need at least one active unmuted recipient");
}

describeMentionE2e("mention notifications e2e", function () {
  it("creates retrievable mention notifications for posts and comments through real API", async function () {
    if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required");

    var users = await activeUsers();
    expect(users.length).toBeGreaterThanOrEqual(3);
    var actor = users[0];
    var firstRecipient = await unmutedRecipient(actor.dbId, new Set([actor.dbId]));
    var secondRecipient = await unmutedRecipient(actor.dbId, new Set([actor.dbId, firstRecipient.dbId]));

    var clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    var sessionIds: string[] = [];

    async function tokenFor(user: E2eUser) {
      var session = await clerk.sessions.createSession({ userId: user.clerkId });
      sessionIds.push(session.id);
      var token = await clerk.sessions.getToken(session.id, undefined, 300);
      return token.jwt;
    }

    try {
      var actorToken = await tokenFor(actor);
      var firstRecipientToken = await tokenFor(firstRecipient);
      var secondRecipientToken = await tokenFor(secondRecipient);
      var stamp = new Date().toISOString();

      var post = await apiRequest("/v1/feed", actorToken, {
        method: "POST",
        body: JSON.stringify({
          type: "text",
          body: richMentionBody("e2e post mention " + stamp, firstRecipient),
          postToFeed: false,
          visibility: "public",
          media: [],
          mediaUrls: [],
          linkPreview: null,
        }),
      }) as { id: string };

      var comment = await apiRequest(`/v1/feed/posts/${encodeURIComponent(post.id)}/comments`, actorToken, {
        method: "POST",
        body: JSON.stringify({
          body: richMentionBody("e2e comment mention " + stamp, secondRecipient),
          parentId: null,
        }),
      }) as { id: string };

      var postNotifications = await apiRequest("/v1/me/notifications?limit=5", firstRecipientToken) as {
        items: Array<{ type: string; entity: { type: string; id: string } | null }>;
      };
      expect(postNotifications.items).toContainEqual(
        expect.objectContaining({
          type: "mention",
          entity: expect.objectContaining({ type: "post", id: post.id }),
        })
      );

      var commentNotifications = await apiRequest("/v1/me/notifications?limit=5", secondRecipientToken) as {
        items: Array<{ type: string; entity: { type: string; id: string } | null }>;
      };
      expect(commentNotifications.items).toContainEqual(
        expect.objectContaining({
          type: "mention",
          entity: expect.objectContaining({ type: "comment", id: comment.id }),
        })
      );
    } finally {
      await Promise.allSettled(sessionIds.map(function (sessionId) {
        return clerk.sessions.revokeSession(sessionId);
      }));
    }
  }, 60000);
});
