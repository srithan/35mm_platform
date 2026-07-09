import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { sql, type SQL } from "drizzle-orm";
import { initDb, getDb, getWriteDb } from "../../lib/db.js";
import { createUlid } from "../../lib/ulid.js";
import { catalogRoutes } from "./routes.js";

function loadApiEnvForDbTests(): void {
  if (process.env.DATABASE_URL) return;
  var envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  var content = readFileSync(envPath, "utf8");
  for (var line of content.split(/\r?\n/)) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    var index = trimmed.indexOf("=");
    if (index <= 0) continue;
    var key = trimmed.slice(0, index).trim();
    var value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

if (process.env.RUN_CATALOG_DB_TESTS === "1") {
  loadApiEnvForDbTests();
}

var runDbTests = process.env.RUN_CATALOG_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);
var describeDb = runDbTests ? describe : describe.skip;

if (runDbTests && process.env.DATABASE_URL) {
  initDb(process.env.DATABASE_URL);
}

type JsonRecord = Record<string, any>;

type FixtureIds = {
  titleMain: string;
  titleSecond: string;
  titleThird: string;
  titleDeleted: string;
  titleRelation: string;
  titleCanonical: string;
  titleMerged: string;
  titleDeletedCredit: string;
  personMain: string;
  personCanonical: string;
  personMerged: string;
  personDeleted: string;
  companyMain: string;
  companyCanonical: string;
  companyMerged: string;
  companyDeleted: string;
  mediaMain: string;
  mediaDeleted: string;
  externalMain: string;
  externalDeleted: string;
  externalPersonMain: string;
  externalCompanyMain: string;
  aliasMain: string;
  creditMain: string;
  creditDeleted: string;
  creditDeletedPerson: string;
  creditDeletedTitle: string;
  relationMain: string;
  relationDeletedTarget: string;
  titleCompanyMain: string;
  titleCompanyDeletedTitle: string;
  awardActive: string;
  awardDeleted: string;
  awardEventActive: string;
  awardEventDeleted: string;
  awardNominationActive: string;
  awardNominationDeletedAward: string;
  editPublic: string;
  editPrivate: string;
  editPrivateRevision: string;
  revisionPublic: string;
  revisionPrivateEdit: string;
  revisionPrivate: string;
};

var ids: FixtureIds = {
  titleMain: createUlid(),
  titleSecond: createUlid(),
  titleThird: createUlid(),
  titleDeleted: createUlid(),
  titleRelation: createUlid(),
  titleCanonical: createUlid(),
  titleMerged: createUlid(),
  titleDeletedCredit: createUlid(),
  personMain: createUlid(),
  personCanonical: createUlid(),
  personMerged: createUlid(),
  personDeleted: createUlid(),
  companyMain: createUlid(),
  companyCanonical: createUlid(),
  companyMerged: createUlid(),
  companyDeleted: createUlid(),
  mediaMain: createUlid(),
  mediaDeleted: createUlid(),
  externalMain: createUlid(),
  externalDeleted: createUlid(),
  externalPersonMain: createUlid(),
  externalCompanyMain: createUlid(),
  aliasMain: createUlid(),
  creditMain: createUlid(),
  creditDeleted: createUlid(),
  creditDeletedPerson: createUlid(),
  creditDeletedTitle: createUlid(),
  relationMain: createUlid(),
  relationDeletedTarget: createUlid(),
  titleCompanyMain: createUlid(),
  titleCompanyDeletedTitle: createUlid(),
  awardActive: createUlid(),
  awardDeleted: createUlid(),
  awardEventActive: createUlid(),
  awardEventDeleted: createUlid(),
  awardNominationActive: createUlid(),
  awardNominationDeletedAward: createUlid(),
  editPublic: createUlid(),
  editPrivate: createUlid(),
  editPrivateRevision: createUlid(),
  revisionPublic: createUlid(),
  revisionPrivateEdit: createUlid(),
  revisionPrivate: createUlid(),
};

var runSlug = "catalog-read-db-" + ids.titleMain.toLowerCase();
var externalMainId = "tt" + ids.externalMain.toLowerCase();
var externalDeletedId = "tt" + ids.externalDeleted.toLowerCase();
var externalPersonMainId = "nm" + ids.externalPersonMain.toLowerCase();
var externalCompanyMainId = "co" + ids.externalCompanyMain.toLowerCase();

function app(): Hono {
  var hono = new Hono();
  hono.onError(function (err: any, c) {
    return c.json({ code: err.code ?? "INTERNAL_ERROR", message: err.message }, err.status ?? 500);
  });
  hono.route("/v1/catalog", catalogRoutes);
  return hono;
}

async function json<T = JsonRecord>(path: string): Promise<{ status: number; body: T }> {
  var response = await app().request(path);
  return {
    status: response.status,
    body: await response.json() as T,
  };
}

async function cleanupFixtureRows(): Promise<void> {
  if (!runDbTests) return;
  var db = getWriteDb();
  await db.execute(sql`delete from "catalog_award_nominations" where "id" in (${ids.awardNominationActive}, ${ids.awardNominationDeletedAward})`);
  await db.execute(sql`delete from "catalog_award_events" where "id" in (${ids.awardEventActive}, ${ids.awardEventDeleted})`);
  await db.execute(sql`delete from "catalog_awards" where "id" in (${ids.awardActive}, ${ids.awardDeleted})`);
  await db.execute(sql`delete from "catalog_revisions" where "id" in (${ids.revisionPublic}, ${ids.revisionPrivateEdit}, ${ids.revisionPrivate})`);
  await db.execute(sql`delete from "catalog_edits" where "id" in (${ids.editPublic}, ${ids.editPrivate}, ${ids.editPrivateRevision})`);
  await db.execute(sql`delete from "catalog_title_companies" where "id" in (${ids.titleCompanyMain}, ${ids.titleCompanyDeletedTitle})`);
  await db.execute(sql`delete from "catalog_title_relations" where "id" in (${ids.relationMain}, ${ids.relationDeletedTarget})`);
  await db.execute(sql`delete from "catalog_credits" where "id" in (${ids.creditMain}, ${ids.creditDeleted}, ${ids.creditDeletedPerson}, ${ids.creditDeletedTitle})`);
  await db.execute(sql`delete from "catalog_aliases" where "id" = ${ids.aliasMain}`);
  await db.execute(sql`delete from "catalog_external_ids" where "id" in (${ids.externalMain}, ${ids.externalDeleted}, ${ids.externalPersonMain}, ${ids.externalCompanyMain})`);
  await db.execute(sql`delete from "catalog_media_assets" where "id" in (${ids.mediaMain}, ${ids.mediaDeleted})`);
  await db.execute(sql`delete from "catalog_titles" where "id" in (${ids.titleMain}, ${ids.titleSecond}, ${ids.titleThird}, ${ids.titleDeleted}, ${ids.titleRelation}, ${ids.titleCanonical}, ${ids.titleMerged}, ${ids.titleDeletedCredit})`);
  await db.execute(sql`delete from "catalog_people" where "id" in (${ids.personMain}, ${ids.personCanonical}, ${ids.personMerged}, ${ids.personDeleted})`);
  await db.execute(sql`delete from "catalog_companies" where "id" in (${ids.companyMain}, ${ids.companyCanonical}, ${ids.companyMerged}, ${ids.companyDeleted})`);
}

async function seedFixtureRows(): Promise<void> {
  var db = getWriteDb();
  await cleanupFixtureRows();
  await db.execute(sql`
    insert into "catalog_titles"
      ("id", "type", "lifecycle", "status", "primary_title", "original_title", "sort_title", "slug",
       "synopsis", "start_year", "release_date", "runtime_minutes", "primary_language", "primary_country",
       "origin_countries", "spoken_languages", "facts", "is_verified", "merged_into_title_id")
    values
      (${ids.titleMain}, 'movie', 'released', 'active', 'Catalog Read Alpha', 'Original Alpha', 'zz35read 001 alpha', ${runSlug + "-title-alpha"},
       'Public read fixture', 1979, '1979-05-25', 117, 'en', 'US', array['US'], array['en'], '{"genres":["sci-fi"]}'::jsonb, true, null),
      (${ids.titleSecond}, 'movie', 'released', 'active', 'Catalog Read Beta', null, 'zz35read 002 beta', ${runSlug + "-title-beta"},
       null, 1980, null, null, 'en', 'US', array['US'], array['en'], '{}'::jsonb, false, null),
      (${ids.titleThird}, 'movie', 'released', 'active', 'Catalog Read Gamma', null, 'zz35read 003 gamma', ${runSlug + "-title-gamma"},
       null, 1981, null, null, 'en', 'US', array['US'], array['en'], '{}'::jsonb, false, null),
      (${ids.titleDeleted}, 'movie', 'released', 'deleted', 'Catalog Read Deleted', null, 'zz35read 004 deleted', ${runSlug + "-title-deleted"},
       null, 1982, null, null, 'en', 'US', array['US'], array['en'], '{}'::jsonb, false, null),
      (${ids.titleRelation}, 'movie', 'released', 'active', 'Catalog Read Relation', null, 'zz35read 005 relation', ${runSlug + "-title-relation"},
       null, 1983, null, null, 'en', 'US', array['US'], array['en'], '{}'::jsonb, false, null),
      (${ids.titleCanonical}, 'movie', 'released', 'active', 'Catalog Read Canonical', null, 'zz35read 006 canonical', ${runSlug + "-title-canonical"},
       null, 1984, null, null, 'en', 'US', array['US'], array['en'], '{}'::jsonb, false, null),
      (${ids.titleMerged}, 'movie', 'released', 'merged', 'Catalog Read Merged', null, 'zz35read 007 merged', ${runSlug + "-title-merged"},
       null, 1985, null, null, 'en', 'US', array['US'], array['en'], '{}'::jsonb, false, ${ids.titleCanonical}),
      (${ids.titleDeletedCredit}, 'movie', 'released', 'deleted', 'Catalog Read Credit Deleted', null, 'zz35read 008 credit deleted', ${runSlug + "-title-credit-deleted"},
       null, 1986, null, null, 'en', 'US', array['US'], array['en'], '{}'::jsonb, false, null)
  `);
  await db.execute(sql`
    insert into "catalog_people"
      ("id", "status", "primary_name", "sort_name", "slug", "biography", "birth_date", "birth_place", "primary_professions", "gender", "is_verified", "merged_into_person_id")
    values
      (${ids.personMain}, 'active', 'Catalog Read Person', 'zz35person 001 active', ${runSlug + "-person-active"}, 'Performer fixture', '1950-01-01', 'Los Angeles', array['actor','director'], 'nonbinary', true, null),
      (${ids.personCanonical}, 'active', 'Catalog Read Canonical Person', 'zz35canonical person 001 active', ${runSlug + "-person-canonical"}, null, null, null, array['director'], null, false, null),
      (${ids.personMerged}, 'merged', 'Catalog Read Merged Person', 'zz35merged person 001 merged', ${runSlug + "-person-merged"}, null, null, null, array['actor'], null, false, ${ids.personCanonical}),
      (${ids.personDeleted}, 'deleted', 'Catalog Read Deleted Person', 'zz35person 002 deleted', ${runSlug + "-person-deleted"}, null, null, null, array['actor'], null, false, null)
  `);
  await db.execute(sql`
    insert into "catalog_companies"
      ("id", "status", "type", "name", "sort_name", "slug", "description", "country", "founded_year", "official_url", "is_verified", "merged_into_company_id")
    values
      (${ids.companyMain}, 'active', 'production_company', 'Catalog Read Company', 'zz35company 001 active', ${runSlug + "-company-active"}, 'Company fixture', 'US', 1968, 'https://example.com/company', true, null),
      (${ids.companyCanonical}, 'active', 'studio', 'Catalog Read Canonical Company', 'zz35company 002 canonical', ${runSlug + "-company-canonical"}, null, 'US', 1969, null, false, null),
      (${ids.companyMerged}, 'merged', 'studio', 'Catalog Read Merged Company', 'zz35company 003 merged', ${runSlug + "-company-merged"}, null, 'US', 1970, null, false, ${ids.companyCanonical}),
      (${ids.companyDeleted}, 'deleted', 'studio', 'Catalog Read Deleted Company', 'zz35company 004 deleted', ${runSlug + "-company-deleted"}, null, 'US', 1971, null, false, null)
  `);
  await db.execute(sql`
    insert into "catalog_media_assets"
      ("id", "entity_type", "entity_id", "type", "source", "url", "title", "metadata", "sort_order", "is_primary", "status")
    values
      (${ids.mediaMain}, 'title', ${ids.titleMain}, 'poster', 'external_url', 'https://example.com/poster.jpg', 'Poster', '{"width":1000,"height":1500}'::jsonb, 1, true, 'active'),
      (${ids.mediaDeleted}, 'title', ${ids.titleSecond}, 'poster', 'external_url', 'https://example.com/deleted-poster.jpg', 'Deleted poster', '{}'::jsonb, 1, true, 'deleted')
  `);
  await db.execute(sql`
    insert into "catalog_external_ids"
      ("id", "entity_type", "entity_id", "provider", "external_id", "url", "is_primary", "status")
    values
      (${ids.externalMain}, 'title', ${ids.titleMain}, 'imdb', ${externalMainId}, 'https://www.imdb.com/title/' || ${externalMainId}, true, 'active'),
      (${ids.externalDeleted}, 'title', ${ids.titleSecond}, 'imdb', ${externalDeletedId}, null, true, 'deleted'),
      (${ids.externalPersonMain}, 'person', ${ids.personMain}, 'imdb', ${externalPersonMainId}, 'https://www.imdb.com/name/' || ${externalPersonMainId}, true, 'active'),
      (${ids.externalCompanyMain}, 'company', ${ids.companyMain}, 'wikidata', ${externalCompanyMainId}, 'https://www.wikidata.org/wiki/' || ${externalCompanyMainId}, true, 'active')
  `);
  await db.execute(sql`
    insert into "catalog_aliases"
      ("id", "entity_type", "entity_id", "type", "value", "sort_value", "language", "region", "attributes", "is_primary")
    values
      (${ids.aliasMain}, 'title', ${ids.titleMain}, 'localized', 'Catalog Read Alias', 'catalog read alias', 'en', 'US', array['festival'], false)
  `);
  await db.execute(sql`
    insert into "catalog_credits"
      ("id", "title_id", "person_id", "department", "job", "character_name", "credited_as", "billing_order", "status")
    values
      (${ids.creditMain}, ${ids.titleMain}, ${ids.personMain}, 'cast', 'Actor', 'Lead', 'Fixture Star', 1, 'active'),
      (${ids.creditDeleted}, ${ids.titleMain}, ${ids.personMain}, 'cast', 'Deleted Actor', 'Deleted', null, 2, 'deleted'),
      (${ids.creditDeletedPerson}, ${ids.titleMain}, ${ids.personDeleted}, 'cast', 'Hidden Actor', 'Hidden', null, 3, 'active'),
      (${ids.creditDeletedTitle}, ${ids.titleDeletedCredit}, ${ids.personMain}, 'cast', 'Hidden Film', 'Hidden', null, 4, 'active')
  `);
  await db.execute(sql`
    insert into "catalog_title_relations"
      ("id", "from_title_id", "to_title_id", "type", "sort_order", "note")
    values
      (${ids.relationMain}, ${ids.titleMain}, ${ids.titleRelation}, 'sequel', 1, 'Public relation'),
      (${ids.relationDeletedTarget}, ${ids.titleMain}, ${ids.titleDeleted}, 'related', 2, 'Hidden relation')
  `);
  await db.execute(sql`
    insert into "catalog_title_companies"
      ("id", "title_id", "company_id", "role", "region", "sort_order")
    values
      (${ids.titleCompanyMain}, ${ids.titleMain}, ${ids.companyMain}, 'production', 'US', 1),
      (${ids.titleCompanyDeletedTitle}, ${ids.titleDeletedCredit}, ${ids.companyMain}, 'distribution', 'US', 2)
  `);
  await db.execute(sql`
    insert into "catalog_awards" ("id", "status", "name", "slug", "country")
    values
      (${ids.awardActive}, 'active', 'Catalog Read Award', ${runSlug + "-award-active"}, 'US'),
      (${ids.awardDeleted}, 'deleted', 'Catalog Read Deleted Award', ${runSlug + "-award-deleted"}, 'US')
  `);
  await db.execute(sql`
    insert into "catalog_award_events" ("id", "award_id", "name", "year")
    values
      (${ids.awardEventActive}, ${ids.awardActive}, 'Catalog Read Awards 1980', 1980),
      (${ids.awardEventDeleted}, ${ids.awardDeleted}, 'Catalog Read Deleted Awards 1980', 1980)
  `);
  await db.execute(sql`
    insert into "catalog_award_nominations"
      ("id", "event_id", "category_name", "outcome", "title_id", "credited_name", "sort_order")
    values
      (${ids.awardNominationActive}, ${ids.awardEventActive}, 'Best Fixture', 'winner', ${ids.titleMain}, 'Fixture Team', 1),
      (${ids.awardNominationDeletedAward}, ${ids.awardEventDeleted}, 'Hidden Fixture', 'winner', ${ids.titleMain}, 'Hidden Team', 2)
  `);
  await db.execute(sql`
    insert into "catalog_edits"
      ("id", "source", "status", "summary", "public_visible", "created_at", "updated_at")
    values
      (${ids.editPublic}, 'system', 'applied', 'catalog read public history', true, now() - interval '3 minutes', now() - interval '3 minutes'),
      (${ids.editPrivate}, 'studio', 'applied', 'catalog read private edit history', false, now() - interval '2 minutes', now() - interval '2 minutes'),
      (${ids.editPrivateRevision}, 'system', 'applied', 'catalog read private revision history', true, now() - interval '1 minute', now() - interval '1 minute')
  `);
  await db.execute(sql`
    insert into "catalog_revisions"
      ("id", "edit_id", "entity_type", "entity_id", "action", "changed_fields", "public_visible", "created_at")
    values
      (${ids.revisionPublic}, ${ids.editPublic}, 'title', ${ids.titleMain}, 'update', array['synopsis'], true, now() - interval '3 minutes'),
      (${ids.revisionPrivateEdit}, ${ids.editPrivate}, 'title', ${ids.titleMain}, 'update', array['facts'], true, now() - interval '2 minutes'),
      (${ids.revisionPrivate}, ${ids.editPrivateRevision}, 'title', ${ids.titleMain}, 'update', array['runtimeMinutes'], false, now() - interval '1 minute')
  `);
}

async function cleanupPlanRows(): Promise<void> {
  if (!runDbTests) return;
  var db = getWriteDb();
  await db.execute(sql`delete from "catalog_revisions" where "id" like '01K7AR%'`);
  await db.execute(sql`delete from "catalog_edits" where "id" like '01K7AE%'`);
  await db.execute(sql`delete from "catalog_title_companies" where "id" like '01K7AL%'`);
  await db.execute(sql`delete from "catalog_title_relations" where "id" like '01K7AN%'`);
  await db.execute(sql`delete from "catalog_credits" where "id" like '01K7AG%'`);
  await db.execute(sql`delete from "catalog_aliases" where "id" like '01K7AA%'`);
  await db.execute(sql`delete from "catalog_external_ids" where "id" like '01K7AX%'`);
  await db.execute(sql`delete from "catalog_media_assets" where "id" like '01K7AM%'`);
  await db.execute(sql`delete from "catalog_titles" where "id" like '01K7AT%' or "id" = '01K7AH00000000000000000000'`);
  await db.execute(sql`delete from "catalog_people" where "id" like '01K7AP%'`);
  await db.execute(sql`delete from "catalog_companies" where "id" like '01K7AC%'`);
}

async function seedPlanRows(): Promise<void> {
  var db = getWriteDb();
  await cleanupPlanRows();
  await db.execute(sql`
    insert into "catalog_titles" ("id", "type", "status", "primary_title", "sort_title", "slug", "start_year")
    select
      '01K7AT' || lpad(gs::text, 20, '0'),
      'movie',
      case when gs % 20 = 0 then 'deleted'::catalog_entity_status else 'active'::catalog_entity_status end,
      'Catalog Read Plan Title ' || gs,
      'zz35plan title ' || lpad(gs::text, 5, '0'),
      'catalog-read-plan-title-' || gs,
      1900 + (gs % 120)
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_titles" ("id", "type", "status", "primary_title", "sort_title", "slug", "start_year")
    values ('01K7AH00000000000000000000', 'movie', 'active', 'Catalog Read Plan History', 'zz35plan history', 'catalog-read-plan-history', 2001)
  `);
  await db.execute(sql`
    insert into "catalog_people" ("id", "status", "primary_name", "sort_name", "slug", "primary_professions")
    select
      '01K7AP' || lpad(gs::text, 20, '0'),
      case when gs % 20 = 0 then 'deleted'::catalog_entity_status else 'active'::catalog_entity_status end,
      'Catalog Read Plan Person ' || gs,
      'zz35plan person ' || lpad(gs::text, 5, '0'),
      'catalog-read-plan-person-' || gs,
      array['actor']
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_companies" ("id", "status", "type", "name", "sort_name", "slug")
    select
      '01K7AC' || lpad(gs::text, 20, '0'),
      case when gs % 20 = 0 then 'deleted'::catalog_entity_status else 'active'::catalog_entity_status end,
      'production_company',
      'Catalog Read Plan Company ' || gs,
      'zz35plan company ' || lpad(gs::text, 5, '0'),
      'catalog-read-plan-company-' || gs
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_external_ids" ("id", "entity_type", "entity_id", "provider", "external_id", "is_primary", "status")
    select
      '01K7AX' || lpad(gs::text, 20, '0'),
      'title',
      '01K7AT' || lpad(gs::text, 20, '0'),
      'imdb',
      'ttplan' || lpad(gs::text, 7, '0'),
      true,
      'active'
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_media_assets" ("id", "entity_type", "entity_id", "type", "source", "url", "sort_order", "is_primary", "status")
    select
      '01K7AM' || lpad(gs::text, 20, '0'),
      'title',
      '01K7AH00000000000000000000',
      case when gs % 2 = 0 then 'poster'::catalog_media_type else 'still'::catalog_media_type end,
      'external_url',
      'https://example.com/plan-media-' || gs || '.jpg',
      gs,
      false,
      'active'
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_aliases" ("id", "entity_type", "entity_id", "type", "value", "sort_value")
    select
      '01K7AA' || lpad(gs::text, 20, '0'),
      'title',
      '01K7AT' || lpad(gs::text, 20, '0'),
      'search',
      'Catalog Read Plan Alias ' || gs,
      'zz35plan alias ' || lpad(gs::text, 5, '0')
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_credits" ("id", "title_id", "person_id", "department", "job", "character_name", "billing_order", "status")
    select
      '01K7AG' || lpad(gs::text, 20, '0'),
      '01K7AH00000000000000000000',
      '01K7AP' || lpad(((gs % 4999) + 1)::text, 20, '0'),
      'cast',
      'Actor ' || gs,
      'Character ' || gs,
      gs,
      'active'
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_title_relations" ("id", "from_title_id", "to_title_id", "type", "sort_order")
    select
      '01K7AN' || lpad(gs::text, 20, '0'),
      '01K7AH00000000000000000000',
      '01K7AT' || lpad(gs::text, 20, '0'),
      'related',
      gs
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_title_companies" ("id", "title_id", "company_id", "role", "region", "sort_order")
    select
      '01K7AL' || lpad(gs::text, 20, '0'),
      '01K7AT' || lpad(gs::text, 20, '0'),
      '01K7AC00000000000000000001',
      'production',
      'R' || gs,
      gs
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_edits" ("id", "source", "status", "summary", "public_visible", "created_at", "updated_at")
    select
      '01K7AE' || lpad(gs::text, 20, '0'),
      'system',
      'applied',
      'catalog read plan edit ' || gs,
      gs % 10 <> 0,
      now() - (gs || ' seconds')::interval,
      now() - (gs || ' seconds')::interval
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`
    insert into "catalog_revisions" ("id", "edit_id", "entity_type", "entity_id", "action", "changed_fields", "public_visible", "created_at")
    select
      '01K7AR' || lpad(gs::text, 20, '0'),
      '01K7AE' || lpad(gs::text, 20, '0'),
      'title',
      '01K7AH00000000000000000000',
      'update',
      array['synopsis'],
      gs % 10 <> 1,
      now() - (gs || ' seconds')::interval
    from generate_series(1, 5000) gs
  `);
  await db.execute(sql`analyze "catalog_titles"`);
  await db.execute(sql`analyze "catalog_people"`);
  await db.execute(sql`analyze "catalog_companies"`);
  await db.execute(sql`analyze "catalog_external_ids"`);
  await db.execute(sql`analyze "catalog_media_assets"`);
  await db.execute(sql`analyze "catalog_aliases"`);
  await db.execute(sql`analyze "catalog_credits"`);
  await db.execute(sql`analyze "catalog_title_relations"`);
  await db.execute(sql`analyze "catalog_title_companies"`);
  await db.execute(sql`analyze "catalog_edits"`);
  await db.execute(sql`analyze "catalog_revisions"`);
}

type PlanNode = {
  "Node Type"?: string;
  "Relation Name"?: string;
  "Index Name"?: string;
  Plans?: PlanNode[];
};

async function explain(query: SQL): Promise<PlanNode> {
  var rows = await getDb().execute(query);
  var first = (rows.rows ?? [])[0] as JsonRecord | undefined;
  var value = first?.["QUERY PLAN"] ?? first?.["QUERY_PLAN"] ?? first?.["query_plan"];
  if (typeof value === "string") value = JSON.parse(value);
  if (Array.isArray(value)) return value[0].Plan as PlanNode;
  return value.Plan as PlanNode;
}

function collectPlanNodes(plan: PlanNode, nodes: PlanNode[] = []): PlanNode[] {
  nodes.push(plan);
  for (var child of plan.Plans ?? []) collectPlanNodes(child, nodes);
  return nodes;
}

function assertNoSeqScan(plan: PlanNode, relationNames: string[]): void {
  var offenders = collectPlanNodes(plan)
    .filter(function (node) {
      return (node["Node Type"] === "Seq Scan" || node["Node Type"] === "Parallel Seq Scan") &&
        node["Relation Name"] &&
        relationNames.includes(node["Relation Name"]);
    })
    .map(function (node) {
      return node["Relation Name"] + ":" + node["Node Type"];
    });
  expect(offenders).toEqual([]);
}

function assertUsesIndex(plan: PlanNode, indexNames: string[]): void {
  var used = collectPlanNodes(plan)
    .map(function (node) {
      return node["Index Name"];
    })
    .filter(Boolean);
  for (var indexName of indexNames) {
    expect(used).toContain(indexName);
  }
}

describeDb("catalog public read routes with real Postgres", function () {
  beforeAll(async function () {
    await seedFixtureRows();
  }, 30000);

  afterAll(async function () {
    await cleanupFixtureRows();
  }, 30000);

  it("returns active title cards, primary media, and stable cursor pages", async function () {
    var page1 = await json<JsonRecord>("/v1/catalog/titles?query=zz35read&limit=2");
    expect(page1.status).toBe(200);
    expect(page1.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.titleMain, ids.titleSecond]);
    expect(page1.body.items[0].primaryMedia.id).toBe(ids.mediaMain);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.nextCursor).toEqual(expect.any(String));

    var page2 = await json<JsonRecord>("/v1/catalog/titles?query=zz35read&limit=2&cursor=" + encodeURIComponent(page1.body.nextCursor));
    expect(page2.status).toBe(200);
    expect(page2.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.titleThird, ids.titleRelation]);
    expect(page2.body.items.map((item: JsonRecord) => item.id)).not.toContain(ids.titleDeleted);
  });

  it("returns 400 for malformed public read cursors", async function () {
    var response = await json<JsonRecord>("/v1/catalog/titles?cursor=not-base64-json");
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: "BAD_REQUEST", message: "Invalid catalog cursor" });
  });

  it("resolves title detail, merged canonical title, external IDs, aliases, relations, awards, and external lookup", async function () {
    var detail = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleMain);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: ids.titleMain,
      primaryTitle: "Catalog Read Alpha",
      lifecycle: "released",
      synopsis: "Public read fixture",
      externalIds: [expect.objectContaining({ id: ids.externalMain, provider: "imdb", externalId: externalMainId })],
    });
    expect(detail.body.primaryMedia.id).toBe(ids.mediaMain);

    var merged = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleMerged);
    expect(merged.status).toBe(200);
    expect(merged.body.status).toBe("merged");
    expect(merged.body.canonicalTitle.id).toBe(ids.titleCanonical);

    var external = await json<JsonRecord>("/v1/catalog/titles?externalProvider=imdb&externalId=" + encodeURIComponent(externalMainId));
    expect(external.status).toBe(200);
    expect(external.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.titleMain]);

    var deletedExternal = await json<JsonRecord>("/v1/catalog/titles?externalProvider=imdb&externalId=" + encodeURIComponent(externalDeletedId));
    expect(deletedExternal.status).toBe(200);
    expect(deletedExternal.body.items).toEqual([]);

    var aliases = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleMain + "/aliases");
    expect(aliases.status).toBe(200);
    expect(aliases.body.items).toEqual([expect.objectContaining({ id: ids.aliasMain, value: "Catalog Read Alias" })]);

    var relations = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleMain + "/relations");
    expect(relations.status).toBe(200);
    expect(relations.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.relationMain]);
    expect(relations.body.items[0].title.id).toBe(ids.titleRelation);

    var awards = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleMain + "/awards");
    expect(awards.status).toBe(200);
    expect(awards.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.awardNominationActive]);
    expect(awards.body.items[0].awardName).toBe("Catalog Read Award");
  });

  it("filters inactive joined rows from credits, media, people, companies, and company title reads", async function () {
    var credits = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleMain + "/credits");
    expect(credits.status).toBe(200);
    expect(credits.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.creditMain]);
    expect(credits.body.items[0].person.id).toBe(ids.personMain);

    var personCredits = await json<JsonRecord>("/v1/catalog/people/" + ids.personMain + "/credits");
    expect(personCredits.status).toBe(200);
    expect(personCredits.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.creditMain]);
    expect(personCredits.body.items[0].title.id).toBe(ids.titleMain);

    var activeMedia = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleMain + "/media");
    expect(activeMedia.status).toBe(200);
    expect(activeMedia.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.mediaMain]);

    var deletedMedia = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleSecond + "/media");
    expect(deletedMedia.status).toBe(200);
    expect(deletedMedia.body.items).toEqual([]);

    var people = await json<JsonRecord>("/v1/catalog/people?query=zz35person");
    expect(people.status).toBe(200);
    expect(people.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.personMain]);

    var person = await json<JsonRecord>("/v1/catalog/people/" + ids.personMain);
    expect(person.status).toBe(200);
    expect(person.body).toMatchObject({
      id: ids.personMain,
      primaryName: "Catalog Read Person",
      biography: "Performer fixture",
      externalIds: [expect.objectContaining({ id: ids.externalPersonMain, provider: "imdb", externalId: externalPersonMainId })],
    });

    var mergedPerson = await json<JsonRecord>("/v1/catalog/people/" + ids.personMerged);
    expect(mergedPerson.status).toBe(200);
    expect(mergedPerson.body.status).toBe("merged");
    expect(mergedPerson.body.canonicalPerson.id).toBe(ids.personCanonical);

    var companies = await json<JsonRecord>("/v1/catalog/companies?query=zz35company");
    expect(companies.status).toBe(200);
    expect(companies.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.companyMain, ids.companyCanonical]);

    var company = await json<JsonRecord>("/v1/catalog/companies/" + ids.companyMain);
    expect(company.status).toBe(200);
    expect(company.body).toMatchObject({
      id: ids.companyMain,
      name: "Catalog Read Company",
      description: "Company fixture",
      externalIds: [expect.objectContaining({ id: ids.externalCompanyMain, provider: "wikidata", externalId: externalCompanyMainId })],
    });

    var mergedCompany = await json<JsonRecord>("/v1/catalog/companies/" + ids.companyMerged);
    expect(mergedCompany.status).toBe(200);
    expect(mergedCompany.body.status).toBe("merged");
    expect(mergedCompany.body.canonicalCompany.id).toBe(ids.companyCanonical);

    var companyTitles = await json<JsonRecord>("/v1/catalog/companies/" + ids.companyMain + "/titles");
    expect(companyTitles.status).toBe(200);
    expect(companyTitles.body.items.map((item: JsonRecord) => item.id)).toEqual([ids.titleCompanyMain]);
    expect(companyTitles.body.items[0].title.id).toBe(ids.titleMain);
  }, 15000);

  it("hides non-public revisions from public history", async function () {
    var history = await json<JsonRecord>("/v1/catalog/titles/" + ids.titleMain + "/history");
    expect(history.status).toBe(200);
    expect(history.body.items.map((item: JsonRecord) => item.revisionId)).toEqual([ids.revisionPublic]);
    expect(history.body.items[0]).toMatchObject({
      id: ids.editPublic,
      publicVisible: true,
      changedFields: ["synopsis"],
    });
  });
});

describeDb("catalog public read query plans", function () {
  beforeAll(async function () {
    await seedPlanRows();
  }, 60000);

  afterAll(async function () {
    await cleanupPlanRows();
  }, 60000);

  it("uses indexed plans for hot search, lookup, child-list, and history paths", async function () {
    var titlePlan = await explain(sql`
      explain (format json)
      select "id"
      from "catalog_titles"
      where "status" = 'active'
        and "sort_title" >= 'zz35plan title 01000'
        and "sort_title" < 'zz35plan title 01000' || E'\\uffff'
      order by "sort_title" asc, coalesce("start_year", 0) asc, "id" asc
      limit 51
    `);
    assertNoSeqScan(titlePlan, ["catalog_titles"]);
    assertUsesIndex(titlePlan, ["catalog_titles_sort_title_idx"]);

    var peoplePlan = await explain(sql`
      explain (format json)
      select "id"
      from "catalog_people"
      where "status" = 'active'
        and "sort_name" >= 'zz35plan person 01000'
        and "sort_name" < 'zz35plan person 01000' || E'\\uffff'
      order by "sort_name" asc, "id" asc
      limit 51
    `);
    assertNoSeqScan(peoplePlan, ["catalog_people"]);
    assertUsesIndex(peoplePlan, ["catalog_people_sort_name_idx"]);

    var companyPlan = await explain(sql`
      explain (format json)
      select "id"
      from "catalog_companies"
      where "status" = 'active'
        and "sort_name" >= 'zz35plan company 01000'
        and "sort_name" < 'zz35plan company 01000' || E'\\uffff'
      order by "sort_name" asc, "id" asc
      limit 51
    `);
    assertNoSeqScan(companyPlan, ["catalog_companies"]);
    assertUsesIndex(companyPlan, ["catalog_companies_sort_name_idx"]);

    var externalPlan = await explain(sql`
      explain (format json)
      select t."id"
      from "catalog_titles" t
      inner join "catalog_external_ids" x
        on x."entity_type" = 'title'
       and x."entity_id" = t."id"
       and x."provider" = 'imdb'
       and x."external_id" = 'ttplan0001000'
       and x."status" = 'active'
      where t."status" = 'active'
      order by t."sort_title" asc, coalesce(t."start_year", 0) asc, t."id" asc
      limit 51
    `);
    assertNoSeqScan(externalPlan, ["catalog_external_ids", "catalog_titles"]);
    assertUsesIndex(externalPlan, ["catalog_external_ids_provider_external_idx", "catalog_titles_pkey"]);

    var mediaPlan = await explain(sql`
      explain (format json)
      select "id"
      from "catalog_media_assets"
      where "entity_type" = 'title'
        and "entity_id" = '01K7AH00000000000000000000'
        and "status" = 'active'
      order by "type" asc, "sort_order" asc, "id" asc
      limit 51
    `);
    assertNoSeqScan(mediaPlan, ["catalog_media_assets"]);
    assertUsesIndex(mediaPlan, ["catalog_media_assets_entity_type_idx"]);

    var creditsPlan = await explain(sql`
      explain (format json)
      select "id"
      from "catalog_credits"
      where "title_id" = '01K7AH00000000000000000000'
        and "status" = 'active'
      order by "department" asc, "billing_order" asc, "id" asc
      limit 51
    `);
    assertNoSeqScan(creditsPlan, ["catalog_credits"]);
    assertUsesIndex(creditsPlan, ["catalog_credits_title_department_idx"]);

    var aliasPlan = await explain(sql`
      explain (format json)
      select "id"
      from "catalog_aliases"
      where "entity_type" = 'title'
        and "entity_id" = '01K7AT00000000000000001000'
      order by "sort_value" asc, "id" asc
      limit 51
    `);
    assertNoSeqScan(aliasPlan, ["catalog_aliases"]);
    assertUsesIndex(aliasPlan, ["catalog_aliases_entity_sort_idx"]);

    var relationPlan = await explain(sql`
      explain (format json)
      select "id"
      from "catalog_title_relations"
      where "from_title_id" = '01K7AH00000000000000000000'
      order by "sort_order" asc, "id" asc
      limit 51
    `);
    assertNoSeqScan(relationPlan, ["catalog_title_relations"]);
    assertUsesIndex(relationPlan, ["catalog_title_relations_from_sort_idx"]);

    var companyTitlePlan = await explain(sql`
      explain (format json)
      select "id"
      from "catalog_title_companies"
      where "company_id" = '01K7AC00000000000000000001'
      order by "role" asc, "title_id" asc, "id" asc
      limit 51
    `);
    assertNoSeqScan(companyTitlePlan, ["catalog_title_companies"]);
    assertUsesIndex(companyTitlePlan, ["catalog_title_companies_company_role_idx"]);

    var historyPlan = await explain(sql`
      explain (format json)
      select r."id"
      from "catalog_revisions" r
      inner join "catalog_edits" e on e."id" = r."edit_id"
      where r."entity_type" = 'title'
        and r."entity_id" = '01K7AH00000000000000000000'
        and r."public_visible" = true
        and e."public_visible" = true
      order by r."created_at" desc, r."id" desc
      limit 51
    `);
    assertNoSeqScan(historyPlan, ["catalog_revisions", "catalog_edits"]);
    assertUsesIndex(historyPlan, ["catalog_revisions_entity_created_idx", "catalog_edits_pkey"]);
  }, 30000);
});
