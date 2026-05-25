import { Hono } from "hono";
import { cursorPaginationSchema, sendMessageSchema } from "@35mm/validators";
import { requireAuth } from "../../lib/middleware.js";

export const chatRoutes = new Hono();
chatRoutes.use("*", requireAuth);

function notImplemented() {
  return {
    code: "NOT_IMPLEMENTED",
    message: "Chat persistence is not wired yet",
  } as const;
}

chatRoutes.get("/conversations", function (c) {
  cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });

  // Chat pagination not yet implemented. Returns empty envelope to prevent client crashes.
  return c.json({ items: [], nextCursor: null, hasMore: false }, 200);
});

chatRoutes.get("/conversations/:conversationId/messages", function (c) {
  c.req.param("conversationId");
  cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });

  // Chat pagination not yet implemented. Returns empty envelope to prevent client crashes.
  return c.json({ items: [], nextCursor: null, hasMore: false }, 200);
});

chatRoutes.post("/conversations/:conversationId/messages", async function (c) {
  c.req.param("conversationId");
  sendMessageSchema.parse(await c.req.json());

  return c.json(notImplemented(), 501);
});
