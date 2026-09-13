import { describe, expect, it } from "vitest";
import { createPostSchema, watchedOnSchema } from "@35mm/validators";
import { PgDialect } from "drizzle-orm/pg-core";
import { decodeDiaryCursor, diaryCursorSql, diaryWatchDateSql, encodeDiaryCursor } from "./filmDiary.js";
import { parseCreatePostInput, parsePatchPostInput } from "./routes.js";

const filmId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const postId = "11111111-1111-4111-8111-111111111112";

describe("film diary input", function () {
  it("keeps valid dates as calendar strings, including Gregorian leap days", function () {
    expect(watchedOnSchema.parse("2024-02-29")).toBe("2024-02-29");
    expect(watchedOnSchema.parse("2000-02-29")).toBe("2000-02-29");
    for (var value of ["1900-02-29", "2025-02-29", "2026-04-31", "2026-00-10", "0000-01-01", "2026-09-13T00:00:00Z", "2026-9-1"]) {
      expect(watchedOnSchema.safeParse(value).success).toBe(false);
    }
  });

  it("accepts unrated, note-free logs without inventing text or a watch date", function () {
    expect(parseCreatePostInput({ type: "log", body: "", filmId })).toMatchObject({
      type: "log", body: "", filmId, watchedOn: null, watchVenue: null, isRewatch: false, filmRating: null,
    });
  });

  it("classifies even one-character notes as reviews and persists watch details", function () {
    expect(parseCreatePostInput({ type: "log", body: "!", filmId, watchedOn: "2026-01-01", watchVenue: "theater", isRewatch: true, filmRating: 7, idempotencyKey: postId })).toMatchObject({
      type: "review", body: "!", watchedOn: "2026-01-01", watchVenue: "theater", isRewatch: true, filmRating: 7, idempotencyKey: postId,
    });
    expect(parseCreatePostInput({ type: "review", body: " ", filmId }).type).toBe("log");
  });

  it("classifies rich notes using visible text instead of encoded document length", function () {
    var body = '__35MM_RICH_TEXT_V1__' + JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Great.", marks: [{ type: "bold" }] }] }] });
    expect(parseCreatePostInput({ type: "log", body, filmId }).type).toBe("review");
  });

  it("requires a canonical film and rejects watch details on unrelated posts", function () {
    expect(createPostSchema.safeParse({ type: "log", body: "" }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "log", body: "", filmId: "550" }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "text", body: "Hello", watchedOn: "2026-01-01" }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "text", body: "Hello", watchVenue: "streaming" }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "discussion", body: "Hello", isRewatch: false }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "text", body: "" }).success).toBe(false);
  });

  it("permits clearing a review note, rating, and unknown watch date on edit", function () {
    expect(parsePatchPostInput({ body: "", watchedOn: null, watchVenue: null, filmRating: null, isRewatch: false })).toEqual({ body: "", watchedOn: null, watchVenue: null, filmRating: null, isRewatch: false });
    expect(parsePatchPostInput({ watchedOn: "2024-02-29", watchVenue: "streaming", filmRating: 1, isRewatch: true })).toEqual({ watchedOn: "2024-02-29", watchVenue: "streaming", filmRating: 1, isRewatch: true });
  });

  it("rejects invalid edit watch details and fractional database ratings", function () {
    for (var input of [{ watchedOn: "2025-02-29" }, { watchVenue: "mars" }, { isRewatch: "yes" }, { filmRating: 0 }, { filmRating: 11 }, { filmRating: 3.5 }]) {
      expect(() => parsePatchPostInput(input)).toThrow();
    }
  });
});

describe("diary pagination", function () {
  it("round-trips date, creation-time and UUID tie-breakers", function () {
    var cursor = { watchedOn: "2024-02-29", createdAt: "2026-09-13T01:00:00.123456Z", id: postId };
    expect(decodeDiaryCursor(encodeDiaryCursor(cursor))).toEqual(cursor);
    expect(decodeDiaryCursor(undefined)).toBeNull();
  });

  it("rejects cross-feed cursors and impossible dates", function () {
    for (var payload of [{ c: "2026-01-01", i: postId }, { k: "diary", d: "2025-02-29", c: "2026-01-01", i: postId }, { k: "diary", d: "2024-02-29", c: "invalid", i: postId }]) {
      expect(() => decodeDiaryCursor(Buffer.from(JSON.stringify(payload)).toString("base64"))).toThrow("Invalid diary cursor");
    }
  });

  it("uses the indexed legacy fallback and all ordering fields in the cursor predicate", function () {
    var dialect = new PgDialect();
    var expression = dialect.sqlToQuery(diaryWatchDateSql());
    expect(expression.sql).toContain('coalesce("posts"."watched_on", ("posts"."created_at" at time zone \'UTC\')::date)');
    var cursor = diaryCursorSql({ watchedOn: "2024-02-29", createdAt: "2026-09-13T01:00:00.123456Z", id: postId });
    expect(cursor).toBeDefined();
    var query = dialect.sqlToQuery(cursor!);
    expect(query.sql).toContain('"posts"."created_at" <');
    expect(query.sql).toContain('"posts"."id" <');
    expect(query.params).toContain("2024-02-29");
    expect(query.params).toContain(postId);
  });
});
