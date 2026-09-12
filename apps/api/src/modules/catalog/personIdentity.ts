import { sql } from "drizzle-orm";
import type { CatalogPersonIdentity } from "@35mm/types";
import { catalogPersonSourceSchema } from "@35mm/validators";
import { getDb, getWriteDb } from "../../lib/db.js";
import { serviceUnavailable } from "../../lib/errors.js";
import { createUlid } from "../../lib/ulid.js";
import { invalidateCatalogReadCaches, getCatalogReadCache, setCatalogReadCache } from "./readCache.js";

type Person = { id: number; name: string };
type Source = ReturnType<typeof catalogPersonSourceSchema.parse>;

export function personSlugBase(name: string): string {
  // Reserve numeric endings for collision suffixes across all role URLs.
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 160).replace(/-+$/g, "").replace(/(?:-\d+)+$/, "") || "person";
}

export function sourcePeople(source: Source, data: unknown): Person[] {
  if (!data || typeof data !== "object") throw new Error("Invalid TMDB person source");
  const body = data as Record<string, any>;
  const rows: unknown[] = source.kind === "person" ? [body]
    : source.kind === "search" ? body.results
    : [...(body.credits?.cast ?? []), ...(body.credits?.crew ?? []), ...(body.created_by ?? [])];
  if (!Array.isArray(rows) || rows.length > 2000) throw new Error("Invalid TMDB credit collection");
  const people = new Map<number, Person>();
  for (const value of rows) {
    if (!value || typeof value !== "object") throw new Error("Invalid TMDB person");
    const person = value as Record<string, unknown>;
    if (source.kind === "search" && source.mode === "multi" && person.media_type !== "person") continue;
    if (!Number.isSafeInteger(person.id) || Number(person.id) <= 0 ||
        typeof person.name !== "string" || !person.name.trim()) throw new Error("Invalid TMDB person identity");
    people.set(Number(person.id), { id: Number(person.id), name: person.name });
  }
  return [...people.values()];
}

async function existingPeople(ids: number[]): Promise<CatalogPersonIdentity[]> {
  if (!ids.length) return [];
  const result = await getDb().execute(sql`
    select e.external_id::integer as "tmdbId", coalesce(c.slug, p.slug) as slug,
      coalesce(c.primary_name, p.primary_name) as name
    from catalog_external_ids e
    join catalog_people p on p.id = e.entity_id
    left join catalog_people c on c.id = p.merged_into_person_id and c.status = 'active'
    where e.provider = 'tmdb' and e.entity_type = 'person' and e.status = 'active'
      and e.external_id in (${sql.join(ids.map(id => sql`${String(id)}`), sql`, `)})
      and (p.status = 'active' or c.id is not null)
  `);
  const rows = result.rows as unknown as CatalogPersonIdentity[];
  if (new Set(rows.map(row => row.tmdbId)).size !== rows.length) {
    throw serviceUnavailable("PERSON_IDENTITY_CONFLICT", "Catalog person identity needs reconciliation");
  }
  return rows;
}

export async function registerPeople(people: Person[]): Promise<CatalogPersonIdentity[]> {
  const ids = people.map(person => person.id);
  const existing = await existingPeople(ids);
  if (existing.length === people.length) return existing;

  await getWriteDb().transaction(async tx => {
    // Cold imports serialize allocation; hot reads never acquire this lock.
    await tx.execute(sql`select pg_advisory_xact_lock(35350060208)`);
    const found = await tx.execute(sql`
      select external_id from catalog_external_ids where provider = 'tmdb' and entity_type = 'person'
      and external_id in (${sql.join(ids.map(id => sql`${String(id)}`), sql`, `)})
    `);
    const registered = new Set(found.rows.map(row => Number(row.external_id)));
    const missing = people.filter(person => !registered.has(person.id)).sort((a, b) => a.id - b.id);
    if (!missing.length) return;
    const bases = [...new Set(missing.map(person => personSlugBase(person.name)))];
    const allocated = await tx.execute(sql`
      select b.base, coalesce((select max(case when p.slug = b.base then 1
        else substring(p.slug from length(b.base) + 2)::integer end)
        from catalog_people p where p.slug >= b.base and p.slug < b.base || '~'
        and (p.slug = b.base or p.slug ~ ('^' || b.base || '-[0-9]+$'))), 0) as last
      from jsonb_to_recordset(${JSON.stringify(bases.map(base => ({ base })))}::jsonb) as b(base text)
    `);
    const last = new Map(allocated.rows.map(row => [String(row.base), Number(row.last)]));
    const rows = missing.map(person => {
      const base = personSlugBase(person.name);
      const next = (last.get(base) ?? 0) + 1;
      last.set(base, next);
      return { id: createUlid(), externalId: createUlid(), tmdbId: person.id,
        name: person.name, slug: next === 1 ? base : `${base}-${next}` };
    });
    await tx.execute(sql`
      with input as (select * from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
        as r(id text, "externalId" text, "tmdbId" integer, name text, slug text)),
      inserted as (insert into catalog_people (id, primary_name, sort_name, slug)
        select id, name, lower(name), slug from input returning id)
      insert into catalog_external_ids (id, entity_type, entity_id, provider, external_id, is_primary)
        select r."externalId", 'person', r.id, 'tmdb', r."tmdbId"::text, true
        from input r join inserted p on p.id = r.id
    `);
  });
  await invalidateCatalogReadCaches();
  const result = await existingPeople(ids);
  if (result.length !== people.length) throw serviceUnavailable("PERSON_IDENTITY_UNAVAILABLE", "Person identity could not be resolved");
  return result;
}

export async function resolvePersonSource(source: Source): Promise<CatalogPersonIdentity[]> {
  const cacheKey = "catalog:person-source:v1:" + JSON.stringify(source);
  const cached = await getCatalogReadCache(cacheKey);
  if (Array.isArray(cached)) return cached as CatalogPersonIdentity[];
  if (source.kind === "person") {
    const existing = await existingPeople([source.id]);
    if (existing.length) return existing;
  }
  const key = process.env.TMDB_API_KEY;
  if (!key) throw serviceUnavailable("TMDB_UNAVAILABLE", "Person catalog source is not configured");
  const path = source.kind === "search" ? `search/${source.mode}` : `${source.kind}/${source.id}`;
  const url = new URL("https://api.themoviedb.org/3/" + path);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  if (source.kind === "search") {
    url.searchParams.set("query", source.query);
    url.searchParams.set("page", String(source.page));
    url.searchParams.set("language", source.language);
    url.searchParams.set("include_adult", String(source.includeAdult));
  }
  if (source.kind === "movie" || source.kind === "tv") url.searchParams.set("append_to_response", "credits");
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw serviceUnavailable("TMDB_UNAVAILABLE", "Person catalog source is unavailable");
  const identities = await registerPeople(sourcePeople(source, await response.json()));
  await setCatalogReadCache(cacheKey, identities);
  return identities;
}
