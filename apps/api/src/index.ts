import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { healthRoutes } from "./routes/health.js";
import { feedRoutes } from "./modules/feed/routes.js";
import { chatRoutes } from "./modules/chat/routes.js";

const app = new Hono();

app.use("*", cors());
app.route("/health", healthRoutes);
app.route("/v1/feed", feedRoutes);
app.route("/v1/chat", chatRoutes);

const port = Number(process.env.PORT ?? 4000);

serve(
  {
    fetch: app.fetch,
    port
  },
  function () {
    console.log(`35mm API listening on http://localhost:${port}`);
  }
);
