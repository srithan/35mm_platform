import { Hono } from "hono";
import type { HealthResponse } from "@35mm/types";

export const healthRoutes = new Hono();

healthRoutes.get("/", function (c) {
  const body: HealthResponse = {
    ok: true,
    service: "35mm-api",
    version: "0.1.0"
  };

  return c.json(body);
});
