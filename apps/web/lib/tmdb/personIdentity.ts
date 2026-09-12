import type { CatalogPersonIdentity } from "@35mm/types";
import { headers } from "next/headers";

type Source = { kind: "movie" | "tv" | "person"; id: number } |
  { kind: "search"; query: string; mode?: "person" | "multi"; page?: number; language?: string; includeAdult?: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPersonIdentity(value: unknown): value is CatalogPersonIdentity {
  return isRecord(value) && typeof value.tmdbId === "number" &&
    Number.isSafeInteger(value.tmdbId) && value.tmdbId > 0 &&
    typeof value.slug === "string" && value.slug.length > 0 && typeof value.name === "string";
}

export async function resolvePersonIdentities(source: Source): Promise<CatalogPersonIdentity[]> {
  const incoming = await headers();
  const clientIp = incoming.get("x-forwarded-for")?.split(",")[0]?.trim() || incoming.get("x-real-ip");
  const response = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/v1/catalog/people/resolve", {
    method: "POST", headers: { "Content-Type": "application/json", ...(clientIp ? { "x-forwarded-for": clientIp } : {}) },
    body: JSON.stringify(source), cache: "no-store",
  });
  if (!response.ok) throw new Error("Person catalog resolution failed: " + response.status);
  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.items) || !body.items.every(isPersonIdentity)) {
    throw new Error("Invalid person catalog identity response");
  }
  return body.items;
}

export async function attachPersonSlugs(path: string[], query: URLSearchParams, data: unknown): Promise<unknown> {
  if (!isRecord(data)) return data;
  const body = data;
  const results: unknown[] = Array.isArray(body.results) ? body.results : [];
  let source: Source | null = null;
  if ((path[0] === "movie" || path[0] === "tv") && /^\d+$/.test(path[1] ?? "") &&
      (body.credits || body.created_by)) source = { kind: path[0], id: Number(path[1]) };
  if (path[0] === "search" && (path[1] === "person" || path[1] === "multi") &&
      results.some(row => isRecord(row) && (row.media_type === "person" || path[1] === "person"))) {
    source = { kind: "search", query: query.get("query") || "", mode: path[1] as "person" | "multi",
      page: Number(query.get("page") || 1), language: query.get("language") || "en-US",
      includeAdult: query.get("include_adult") === "true" };
  }
  if (!source) return data;
  const identities = await resolvePersonIdentities(source);
  const slugs = new Map(identities.map(person => [person.tmdbId, person.slug]));
  const attach = (person: unknown) => {
    if (!isRecord(person) || typeof person.id !== "number") {
      throw new Error("Invalid credited person identity");
    }
    const slug = slugs.get(person.id);
    if (!slug) throw new Error("Credited person has no catalog identity: " + person.id);
    return { ...person, slug };
  };
  const attachList = (value: unknown) => {
    if (value == null) return value;
    if (!Array.isArray(value)) throw new Error("Invalid person credit collection");
    return value.map(attach);
  };
  if (body.credits != null && !isRecord(body.credits)) throw new Error("Invalid credits response");
  const credits = isRecord(body.credits) ? body.credits : null;
  return {
    ...body,
    ...(credits ? { credits: { ...credits,
      cast: attachList(credits.cast), crew: attachList(credits.crew) } } : {}),
    ...(body.created_by ? { created_by: attachList(body.created_by) } : {}),
    ...(source.kind === "search" ? { results: results.map(row =>
      path[1] === "person" || (isRecord(row) && row.media_type === "person") ? attach(row) : row) } : {}),
  };
}
