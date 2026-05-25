import { badRequest } from "./errors.js";

export type CompositeCursor = {
  createdAt: Date;
  id: string;
};

export function encodeCompositeCursor(input: CompositeCursor): string {
  var payload = JSON.stringify({
    c: input.createdAt.toISOString(),
    i: input.id,
  });
  return Buffer.from(payload, "utf8").toString("base64");
}

export function decodeCompositeCursor(cursor: string | undefined): CompositeCursor | null {
  if (!cursor) return null;

  try {
    var decoded = Buffer.from(cursor, "base64").toString("utf8");
    var parsed = JSON.parse(decoded) as { c?: unknown; i?: unknown };
    var createdAtRaw = parsed.c;
    var idRaw = parsed.i;

    if (typeof createdAtRaw !== "string" || typeof idRaw !== "string" || idRaw.length === 0) {
      throw new Error("invalid-shape");
    }

    var createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("invalid-date");
    }

    return { createdAt, id: idRaw };
  } catch (_err) {
    throw badRequest("Invalid cursor");
  }
}
