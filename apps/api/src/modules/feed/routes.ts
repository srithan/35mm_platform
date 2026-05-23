import { Hono } from "hono";
import type { FeedPage, FeedPost } from "@35mm/types";
import { createPostSchema, cursorPaginationSchema } from "@35mm/validators";

export const feedRoutes = new Hono();

const posts: FeedPost[] = [
  {
    id: "post_001",
    author: {
      id: "user_001",
      username: "srithan",
      displayName: "Srithan"
    },
    body: "The production backend starts here: cursor feeds, validated writes, and room to add ranking later.",
    createdAt: new Date("2026-05-20T12:00:00.000Z").toISOString(),
    likeCount: 128,
    replyCount: 12,
    repostCount: 9
  }
];

feedRoutes.get("/", function (c) {
  const parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit")
  });

  const start = parsed.cursor
    ? posts.findIndex((post) => post.id === parsed.cursor) + 1
    : 0;
  const items = posts.slice(start, start + parsed.limit);
  const next = posts[start + parsed.limit];

  const page: FeedPage = {
    items,
    nextCursor: next?.id ?? null,
    hasMore: Boolean(next)
  };

  return c.json(page);
});

feedRoutes.post("/", async function (c) {
  const input = createPostSchema.parse(await c.req.json());
  const now = new Date().toISOString();
  const post: FeedPost = {
    id: `post_${posts.length + 1}`,
    author: {
      id: "user_current",
      username: "current_user",
      displayName: "Current User"
    },
    body: input.body,
    createdAt: now,
    likeCount: 0,
    replyCount: 0,
    repostCount: 0
  };

  posts.unshift(post);
  return c.json(post, 201);
});
