// apps/api/src/routes/poster-proxy.ts
import { Hono } from "hono";

const app = new Hono();

const ALLOWED_PREFIXES = [
  "https://image.tmdb.org/",
  "https://imagedelivery.net/",
];

app.get("/", async (c) => {
  const url = c.req.query("url");

  if (!url) return c.text("Missing url param", 400);
  if (!ALLOWED_PREFIXES.some((p) => url.startsWith(p))) {
    return c.text("Domain not allowed", 403);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return c.text("Upstream fetch failed", 502);
  }

  if (!upstream.ok) return c.text("Upstream error", 502);

  const blob = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new Response(blob, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

export default app;