import { sql } from "drizzle-orm";
import type {
  CatalogAliasPage,
  CatalogAliasRow,
  CatalogAwardPage,
  CatalogAwardRow,
  CatalogCompanyDetail,
  CatalogCompanyPage,
  CatalogCompanyTitlePage,
  CatalogCompanyTitleRow,
  CatalogCreditPage,
  CatalogCreditRow,
  CatalogEditQueueItem,
  CatalogEditQueuePage,
  CatalogExternalIdRow,
  CatalogHistoryItem,
  CatalogHistoryPage,
  CatalogMediaPage,
  CatalogMediaRow,
  CatalogPersonCard,
  CatalogPersonDetail,
  CatalogPersonPage,
  CatalogRelationPage,
  CatalogRelationRow,
  CatalogTitleCard,
  CatalogTitleDetail,
  CatalogTitlePage,
} from "@35mm/types";
import type {
  CatalogCompanySearchQueryInput,
  CatalogCompanyTitlesQueryInput,
  CatalogCreditsQueryInput,
  CatalogEditQueueQueryInput,
  CatalogHistoryQueryInput,
  CatalogMediaQueryInput,
  CatalogPeopleSearchQueryInput,
  CatalogReadPageQueryInput,
  CatalogTitleSearchQueryInput,
} from "@35mm/validators";
import { badRequest, notFound } from "../../lib/errors.js";
import { getDb } from "../../lib/db.js";
import { toCatalogEditDto } from "./serializer.js";

type DbRow = Record<string, any>;

function iso(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date(0).toISOString();
}

function nullableIso(value: string | null | undefined): string | null {
  return value ?? null;
}

function page<T, C>(
  rows: T[],
  limit: number,
  cursorFor: (row: T) => C
): { items: T[]; nextCursor: string | null; hasMore: boolean } {
  var items = rows.slice(0, limit);
  var tail = items[items.length - 1];
  var hasMore = rows.length > limit;
  return {
    items,
    hasMore,
    nextCursor: hasMore && tail ? encodeCatalogReadCursor(cursorFor(tail)) : null,
  };
}

export function encodeCatalogReadCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCatalogReadCursor<T extends Record<string, unknown>>(
  value: string | undefined
): T | null {
  if (!value) return null;
  try {
    var parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as T;
  } catch (_error) {
    return null;
  }
}

function requireCursor<T extends Record<string, unknown>>(value: string | undefined): T | null {
  var cursor = decodeCatalogReadCursor<T>(value);
  if (value && !cursor) throw badRequest("Invalid catalog cursor");
  return cursor;
}

function normalizeQuery(value: string | undefined): string | null {
  var trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function titleCard(row: DbRow, prefix = ""): CatalogTitleCard {
  return {
    id: row[prefix + "id"],
    type: row[prefix + "type"],
    status: row[prefix + "status"],
    primaryTitle: row[prefix + "primaryTitle"],
    originalTitle: row[prefix + "originalTitle"] ?? null,
    sortTitle: row[prefix + "sortTitle"],
    slug: row[prefix + "slug"],
    startYear: row[prefix + "startYear"] ?? null,
    endYear: row[prefix + "endYear"] ?? null,
    releaseDate: nullableIso(row[prefix + "releaseDate"]),
    runtimeMinutes: row[prefix + "runtimeMinutes"] ?? null,
    primaryLanguage: row[prefix + "primaryLanguage"] ?? null,
    primaryCountry: row[prefix + "primaryCountry"] ?? null,
    isAdult: Boolean(row[prefix + "isAdult"]),
    isVerified: Boolean(row[prefix + "isVerified"]),
    primaryMedia: row[prefix + "mediaId"]
      ? mediaRow(row, prefix + "media")
      : row.mId
        ? mediaRow(row, "m")
        : null,
  };
}

function personCard(row: DbRow, prefix = ""): CatalogPersonCard {
  return {
    id: row[prefix + "id"],
    status: row[prefix + "status"],
    primaryName: row[prefix + "primaryName"],
    sortName: row[prefix + "sortName"],
    slug: row[prefix + "slug"],
    birthDate: nullableIso(row[prefix + "birthDate"]),
    deathDate: nullableIso(row[prefix + "deathDate"]),
    primaryProfessions: row[prefix + "primaryProfessions"] ?? [],
    isVerified: Boolean(row[prefix + "isVerified"]),
    primaryMedia: row[prefix + "mediaId"]
      ? mediaRow(row, prefix + "media")
      : row.mId
        ? mediaRow(row, "m")
        : null,
  };
}

function companyCard(row: DbRow, prefix = "") {
  return {
    id: row[prefix + "id"],
    status: row[prefix + "status"],
    type: row[prefix + "type"],
    name: row[prefix + "name"],
    sortName: row[prefix + "sortName"],
    slug: row[prefix + "slug"],
    country: row[prefix + "country"] ?? null,
    foundedYear: row[prefix + "foundedYear"] ?? null,
    dissolvedYear: row[prefix + "dissolvedYear"] ?? null,
    isVerified: Boolean(row[prefix + "isVerified"]),
  };
}

function mediaRow(row: DbRow, prefix = ""): CatalogMediaRow {
  return {
    id: row[prefix + "Id"] ?? row[prefix + "id"],
    entityType: row[prefix + "EntityType"] ?? row[prefix + "entityType"],
    entityId: row[prefix + "EntityId"] ?? row[prefix + "entityId"],
    type: row[prefix + "Type"] ?? row[prefix + "type"],
    source: row[prefix + "Source"] ?? row[prefix + "source"],
    url: row[prefix + "Url"] ?? row[prefix + "url"],
    storageKey: row[prefix + "StorageKey"] ?? row[prefix + "storageKey"] ?? null,
    title: row[prefix + "Title"] ?? row[prefix + "title"] ?? null,
    caption: row[prefix + "Caption"] ?? row[prefix + "caption"] ?? null,
    language: row[prefix + "Language"] ?? row[prefix + "language"] ?? null,
    region: row[prefix + "Region"] ?? row[prefix + "region"] ?? null,
    rightsNote: row[prefix + "RightsNote"] ?? row[prefix + "rightsNote"] ?? null,
    attribution: row[prefix + "Attribution"] ?? row[prefix + "attribution"] ?? null,
    metadata: row[prefix + "Metadata"] ?? row[prefix + "metadata"] ?? {},
    sortOrder: row[prefix + "SortOrder"] ?? row[prefix + "sortOrder"] ?? 0,
    isPrimary: Boolean(row[prefix + "IsPrimary"] ?? row[prefix + "isPrimary"]),
    createdAt: iso(row[prefix + "CreatedAt"] ?? row[prefix + "createdAt"]),
    updatedAt: iso(row[prefix + "UpdatedAt"] ?? row[prefix + "updatedAt"]),
  };
}

function externalIdRow(row: DbRow): CatalogExternalIdRow {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    provider: row.provider,
    externalId: row.externalId,
    url: row.url ?? null,
    isPrimary: Boolean(row.isPrimary),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function mediaSelect(prefix: string) {
  return sql.raw(`
    ${prefix}."id" as "${prefix}Id",
    ${prefix}."entity_type" as "${prefix}EntityType",
    ${prefix}."entity_id" as "${prefix}EntityId",
    ${prefix}."type" as "${prefix}Type",
    ${prefix}."source" as "${prefix}Source",
    ${prefix}."url" as "${prefix}Url",
    ${prefix}."storage_key" as "${prefix}StorageKey",
    ${prefix}."title" as "${prefix}Title",
    ${prefix}."caption" as "${prefix}Caption",
    ${prefix}."language" as "${prefix}Language",
    ${prefix}."region" as "${prefix}Region",
    ${prefix}."rights_note" as "${prefix}RightsNote",
    ${prefix}."attribution" as "${prefix}Attribution",
    ${prefix}."metadata" as "${prefix}Metadata",
    ${prefix}."sort_order" as "${prefix}SortOrder",
    ${prefix}."is_primary" as "${prefix}IsPrimary",
    ${prefix}."created_at" as "${prefix}CreatedAt",
    ${prefix}."updated_at" as "${prefix}UpdatedAt"
  `);
}

function titleSelect(alias: string, prefix = "") {
  return sql.raw(`
    ${alias}."id" as "${prefix}id",
    ${alias}."type" as "${prefix}type",
    ${alias}."status" as "${prefix}status",
    ${alias}."primary_title" as "${prefix}primaryTitle",
    ${alias}."original_title" as "${prefix}originalTitle",
    ${alias}."sort_title" as "${prefix}sortTitle",
    ${alias}."slug" as "${prefix}slug",
    ${alias}."start_year" as "${prefix}startYear",
    ${alias}."end_year" as "${prefix}endYear",
    ${alias}."release_date" as "${prefix}releaseDate",
    ${alias}."runtime_minutes" as "${prefix}runtimeMinutes",
    ${alias}."primary_language" as "${prefix}primaryLanguage",
    ${alias}."primary_country" as "${prefix}primaryCountry",
    ${alias}."is_adult" as "${prefix}isAdult",
    ${alias}."is_verified" as "${prefix}isVerified"
  `);
}

function titleMediaJoin(entityAlias: string, mediaAlias: string) {
  return sql.raw(`
    left join "catalog_media_assets" ${mediaAlias}
      on ${mediaAlias}."entity_type" = 'title'
     and ${mediaAlias}."entity_id" = ${entityAlias}."id"
     and ${mediaAlias}."is_primary" = true
     and ${mediaAlias}."status" = 'active'
  `);
}

function personMediaJoin(entityAlias: string, mediaAlias: string) {
  return sql.raw(`
    left join "catalog_media_assets" ${mediaAlias}
      on ${mediaAlias}."entity_type" = 'person'
     and ${mediaAlias}."entity_id" = ${entityAlias}."id"
     and ${mediaAlias}."is_primary" = true
     and ${mediaAlias}."status" = 'active'
  `);
}

export async function listCatalogTitles(query: CatalogTitleSearchQueryInput): Promise<CatalogTitlePage> {
  var cursor = requireCursor<{ sortTitle: string; startYear: number | null; id: string }>(query.cursor);
  var search = normalizeQuery(query.query);
  var rows = await getDb().execute(sql`
    select ${titleSelect("t")}, ${mediaSelect("m")}
    from "catalog_titles" t
    ${titleMediaJoin("t", "m")}
    ${query.externalProvider && query.externalId ? sql`
      inner join "catalog_external_ids" x
        on x."entity_type" = 'title'
       and x."entity_id" = t."id"
       and x."provider" = ${query.externalProvider}
       and x."external_id" = ${query.externalId}
       and x."status" = 'active'
    ` : sql.raw("")}
    where t."status" = 'active'
      ${search ? sql`and t."sort_title" >= ${search} and t."sort_title" < ${search + "\uffff"}` : sql.raw("")}
      ${query.type ? sql`and t."type" = ${query.type}` : sql.raw("")}
      ${query.year ? sql`and t."start_year" = ${query.year}` : sql.raw("")}
      ${cursor ? sql`
        and (
          t."sort_title" > ${cursor.sortTitle}
          or (t."sort_title" = ${cursor.sortTitle} and coalesce(t."start_year", 0) > ${cursor.startYear ?? 0})
          or (t."sort_title" = ${cursor.sortTitle} and coalesce(t."start_year", 0) = ${cursor.startYear ?? 0} and t."id" > ${cursor.id})
        )
      ` : sql.raw("")}
    order by t."sort_title" asc, coalesce(t."start_year", 0) asc, t."id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row) {
    return titleCard(row as DbRow);
  });
  return page(items, query.limit, function (item) {
    return { sortTitle: item.sortTitle, startYear: item.startYear, id: item.id };
  });
}

export async function getCatalogTitle(id: string): Promise<CatalogTitleDetail> {
  var rows = await getDb().execute(sql`
    select t.*, ${mediaSelect("m")}
    from "catalog_titles" t
    ${titleMediaJoin("t", "m")}
    where t."id" = ${id}
      and t."status" in ('active', 'merged')
    limit 1
  `);
  var row = (rows.rows ?? [])[0] as DbRow | undefined;
  if (!row) throw notFound("Catalog title not found");
  var externalIds = await getExternalIds("title", id);
  var canonicalTitle = null;
  if (row.merged_into_title_id) {
    canonicalTitle = await getCatalogTitleCard(row.merged_into_title_id);
  }
  var base = titleCard({
    id: row.id,
    type: row.type,
    status: row.status,
    primaryTitle: row.primary_title,
    originalTitle: row.original_title,
    sortTitle: row.sort_title,
    slug: row.slug,
    startYear: row.start_year,
    endYear: row.end_year,
    releaseDate: row.release_date,
    runtimeMinutes: row.runtime_minutes,
    primaryLanguage: row.primary_language,
    primaryCountry: row.primary_country,
    isAdult: row.is_adult,
    isVerified: row.is_verified,
    mediaId: row.mId,
    mediaEntityType: row.mEntityType,
    mediaEntityId: row.mEntityId,
    mediaType: row.mType,
    mediaSource: row.mSource,
    mediaUrl: row.mUrl,
    mediaStorageKey: row.mStorageKey,
    mediaTitle: row.mTitle,
    mediaCaption: row.mCaption,
    mediaLanguage: row.mLanguage,
    mediaRegion: row.mRegion,
    mediaRightsNote: row.mRightsNote,
    mediaAttribution: row.mAttribution,
    mediaMetadata: row.mMetadata,
    mediaSortOrder: row.mSortOrder,
    mediaIsPrimary: row.mIsPrimary,
    mediaCreatedAt: row.mCreatedAt,
    mediaUpdatedAt: row.mUpdatedAt,
  });
  return {
    ...base,
    lifecycle: row.lifecycle,
    legacyFilmId: row.legacy_film_id ?? null,
    synopsis: row.synopsis ?? null,
    originCountries: row.origin_countries ?? [],
    spokenLanguages: row.spoken_languages ?? [],
    facts: row.facts ?? {},
    parentTitleId: row.parent_title_id ?? null,
    seasonNumber: row.season_number ?? null,
    episodeNumber: row.episode_number ?? null,
    absoluteEpisodeNumber: row.absolute_episode_number ?? null,
    mergedIntoTitleId: row.merged_into_title_id ?? null,
    canonicalTitle,
    externalIds,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function getCatalogTitleCard(id: string): Promise<CatalogTitleCard | null> {
  var rows = await getDb().execute(sql`
    select ${titleSelect("t")}, ${mediaSelect("m")}
    from "catalog_titles" t
    ${titleMediaJoin("t", "m")}
    where t."id" = ${id}
      and t."status" = 'active'
    limit 1
  `);
  var row = (rows.rows ?? [])[0] as DbRow | undefined;
  return row ? titleCard(row) : null;
}

async function getCatalogPersonCard(id: string): Promise<CatalogPersonCard | null> {
  var rows = await getDb().execute(sql`
    select
      p."id", p."status", p."primary_name" as "primaryName", p."sort_name" as "sortName",
      p."slug", p."birth_date" as "birthDate", p."death_date" as "deathDate",
      p."primary_professions" as "primaryProfessions", p."is_verified" as "isVerified",
      ${mediaSelect("m")}
    from "catalog_people" p
    ${personMediaJoin("p", "m")}
    where p."id" = ${id}
      and p."status" = 'active'
    limit 1
  `);
  var row = (rows.rows ?? [])[0] as DbRow | undefined;
  return row ? personCard(row) : null;
}

export async function getTitleCredits(id: string, query: CatalogCreditsQueryInput): Promise<CatalogCreditPage> {
  var cursor = requireCursor<{ department: string; billingOrder: number; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select c.*, p."primary_name" as "personName", p."sort_name" as "personSortName", p."slug" as "personSlug",
      p."status" as "personStatus", p."birth_date" as "personBirthDate", p."death_date" as "personDeathDate",
      p."primary_professions" as "personPrimaryProfessions", p."is_verified" as "personIsVerified",
      ${mediaSelect("m")}
    from "catalog_credits" c
    inner join "catalog_people" p on p."id" = c."person_id" and p."status" = 'active'
    ${personMediaJoin("p", "m")}
    where c."title_id" = ${id}
      and c."status" = 'active'
      ${query.department ? sql`and c."department" = ${query.department}` : sql.raw("")}
      ${cursor ? sql`
        and (
          c."department" > ${cursor.department}
          or (c."department" = ${cursor.department} and c."billing_order" > ${cursor.billingOrder})
          or (c."department" = ${cursor.department} and c."billing_order" = ${cursor.billingOrder} and c."id" > ${cursor.id})
        )
      ` : sql.raw("")}
    order by c."department" asc, c."billing_order" asc, c."id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row: any): CatalogCreditRow {
    return {
      id: row.id,
      titleId: row.title_id,
      personId: row.person_id,
      department: row.department,
      job: row.job,
      characterName: row.character_name ?? null,
      creditedAs: row.credited_as ?? null,
      billingOrder: row.billing_order,
      episodeCount: row.episode_count ?? null,
      startYear: row.start_year ?? null,
      endYear: row.end_year ?? null,
      notes: row.notes ?? null,
      title: null,
      person: personCard({
        id: row.person_id,
        status: row.personStatus,
        primaryName: row.personName,
        sortName: row.personSortName,
        slug: row.personSlug,
        birthDate: row.personBirthDate,
        deathDate: row.personDeathDate,
        primaryProfessions: row.personPrimaryProfessions,
        isVerified: row.personIsVerified,
        mediaId: row.mId,
        mediaEntityType: row.mEntityType,
        mediaEntityId: row.mEntityId,
        mediaType: row.mType,
        mediaSource: row.mSource,
        mediaUrl: row.mUrl,
        mediaStorageKey: row.mStorageKey,
        mediaTitle: row.mTitle,
        mediaCaption: row.mCaption,
        mediaLanguage: row.mLanguage,
        mediaRegion: row.mRegion,
        mediaRightsNote: row.mRightsNote,
        mediaAttribution: row.mAttribution,
        mediaMetadata: row.mMetadata,
        mediaSortOrder: row.mSortOrder,
        mediaIsPrimary: row.mIsPrimary,
        mediaCreatedAt: row.mCreatedAt,
        mediaUpdatedAt: row.mUpdatedAt,
      }),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  });
  return page(items, query.limit, function (item) {
    return { department: item.department, billingOrder: item.billingOrder, id: item.id };
  });
}

export async function getEntityMedia(
  entityType: "title" | "person" | "company",
  entityId: string,
  query: CatalogMediaQueryInput
): Promise<CatalogMediaPage> {
  var cursor = requireCursor<{ type: string; sortOrder: number; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select
      "id", "entity_type" as "entityType", "entity_id" as "entityId", "type", "source", "url",
      "storage_key" as "storageKey", "title", "caption", "language", "region",
      "rights_note" as "rightsNote", "attribution", "metadata", "sort_order" as "sortOrder",
      "is_primary" as "isPrimary", "created_at" as "createdAt", "updated_at" as "updatedAt"
    from "catalog_media_assets"
    where "entity_type" = ${entityType}
      and "entity_id" = ${entityId}
      and "status" = 'active'
      ${query.type ? sql`and "type" = ${query.type}` : sql.raw("")}
      ${cursor ? sql`
        and (
          "type" > ${cursor.type}
          or ("type" = ${cursor.type} and "sort_order" > ${cursor.sortOrder})
          or ("type" = ${cursor.type} and "sort_order" = ${cursor.sortOrder} and "id" > ${cursor.id})
        )
      ` : sql.raw("")}
    order by "type" asc, "sort_order" asc, "id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row) {
    return mediaRow(row as DbRow);
  });
  return page(items, query.limit, function (item) {
    return { type: item.type, sortOrder: item.sortOrder, id: item.id };
  });
}

export async function getExternalIds(entityType: "title" | "person" | "company", entityId: string): Promise<CatalogExternalIdRow[]> {
  var rows = await getDb().execute(sql`
    select
      "id", "entity_type" as "entityType", "entity_id" as "entityId", "provider", "external_id" as "externalId",
      "url", "is_primary" as "isPrimary", "created_at" as "createdAt", "updated_at" as "updatedAt"
    from "catalog_external_ids"
    where "entity_type" = ${entityType}
      and "entity_id" = ${entityId}
      and "status" = 'active'
    order by "provider" asc, "is_primary" desc, "id" asc
    limit 100
  `);
  return (rows.rows ?? []).map(function (row) {
    return externalIdRow(row as DbRow);
  });
}

export async function getEntityAliases(entityType: "title" | "person", entityId: string, query: CatalogReadPageQueryInput): Promise<CatalogAliasPage> {
  var cursor = requireCursor<{ sortValue: string; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select "id", "entity_type" as "entityType", "entity_id" as "entityId", "type", "value", "sort_value" as "sortValue",
      "language", "region", "attributes", "is_primary" as "isPrimary", "created_at" as "createdAt", "updated_at" as "updatedAt"
    from "catalog_aliases"
    where "entity_type" = ${entityType}
      and "entity_id" = ${entityId}
      ${cursor ? sql`
        and ("sort_value" > ${cursor.sortValue} or ("sort_value" = ${cursor.sortValue} and "id" > ${cursor.id}))
      ` : sql.raw("")}
    order by "sort_value" asc, "id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row: any): CatalogAliasRow {
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      type: row.type,
      value: row.value,
      sortValue: row.sortValue,
      language: row.language ?? null,
      region: row.region ?? null,
      attributes: row.attributes ?? [],
      isPrimary: Boolean(row.isPrimary),
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  });
  return page(items, query.limit, function (item) {
    return { sortValue: item.sortValue, id: item.id };
  });
}

export async function getTitleRelations(id: string, query: CatalogReadPageQueryInput): Promise<CatalogRelationPage> {
  var cursor = requireCursor<{ sortOrder: number; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select r."id", r."from_title_id" as "fromTitleId", r."to_title_id" as "toTitleId", r."type", r."sort_order" as "sortOrder",
      r."note", r."created_at" as "createdAt", r."updated_at" as "updatedAt", ${titleSelect("t", "title")}, ${mediaSelect("m")}
    from "catalog_title_relations" r
    inner join "catalog_titles" t on t."id" = r."to_title_id" and t."status" = 'active'
    ${titleMediaJoin("t", "m")}
    where r."from_title_id" = ${id}
      ${cursor ? sql`and (r."sort_order" > ${cursor.sortOrder} or (r."sort_order" = ${cursor.sortOrder} and r."id" > ${cursor.id}))` : sql.raw("")}
    order by r."sort_order" asc, r."id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row: any): CatalogRelationRow {
    return {
      id: row.id,
      fromTitleId: row.fromTitleId,
      toTitleId: row.toTitleId,
      type: row.type,
      sortOrder: row.sortOrder,
      note: row.note ?? null,
      title: titleCard({
        id: row.titleid,
        type: row.titletype,
        status: row.titlestatus,
        primaryTitle: row.titleprimaryTitle,
        originalTitle: row.titleoriginalTitle,
        sortTitle: row.titlesortTitle,
        slug: row.titleslug,
        startYear: row.titlestartYear,
        endYear: row.titleendYear,
        releaseDate: row.titlereleaseDate,
        runtimeMinutes: row.titleruntimeMinutes,
        primaryLanguage: row.titleprimaryLanguage,
        primaryCountry: row.titleprimaryCountry,
        isAdult: row.titleisAdult,
        isVerified: row.titleisVerified,
        mediaId: row.mId,
        mediaEntityType: row.mEntityType,
        mediaEntityId: row.mEntityId,
        mediaType: row.mType,
        mediaSource: row.mSource,
        mediaUrl: row.mUrl,
        mediaStorageKey: row.mStorageKey,
        mediaTitle: row.mTitle,
        mediaCaption: row.mCaption,
        mediaLanguage: row.mLanguage,
        mediaRegion: row.mRegion,
        mediaRightsNote: row.mRightsNote,
        mediaAttribution: row.mAttribution,
        mediaMetadata: row.mMetadata,
        mediaSortOrder: row.mSortOrder,
        mediaIsPrimary: row.mIsPrimary,
        mediaCreatedAt: row.mCreatedAt,
        mediaUpdatedAt: row.mUpdatedAt,
      }),
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  });
  return page(items, query.limit, function (item) {
    return { sortOrder: item.sortOrder, id: item.id };
  });
}

export async function getTitleAwards(id: string, query: CatalogReadPageQueryInput): Promise<CatalogAwardPage> {
  var cursor = requireCursor<{ year: number; sortOrder: number; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select n."id", n."event_id" as "eventId", e."award_id" as "awardId", a."name" as "awardName",
      e."name" as "eventName", e."year", n."category_name" as "categoryName", n."outcome",
      n."credited_name" as "creditedName", n."sort_order" as "sortOrder"
    from "catalog_award_nominations" n
    inner join "catalog_award_events" e on e."id" = n."event_id"
    inner join "catalog_awards" a on a."id" = e."award_id" and a."status" = 'active'
    where n."title_id" = ${id}
      ${cursor ? sql`
        and (
          e."year" < ${cursor.year}
          or (e."year" = ${cursor.year} and n."sort_order" > ${cursor.sortOrder})
          or (e."year" = ${cursor.year} and n."sort_order" = ${cursor.sortOrder} and n."id" > ${cursor.id})
        )
      ` : sql.raw("")}
    order by e."year" desc, n."sort_order" asc, n."id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row: any): CatalogAwardRow {
    return {
      id: row.id,
      eventId: row.eventId,
      awardId: row.awardId,
      awardName: row.awardName,
      eventName: row.eventName,
      year: row.year,
      categoryName: row.categoryName,
      outcome: row.outcome,
      creditedName: row.creditedName ?? null,
      sortOrder: row.sortOrder,
    };
  });
  return page(items, query.limit, function (item) {
    return { year: item.year, sortOrder: item.sortOrder, id: item.id };
  });
}

export async function listCatalogPeople(query: CatalogPeopleSearchQueryInput): Promise<CatalogPersonPage> {
  var cursor = requireCursor<{ sortName: string; id: string }>(query.cursor);
  var search = normalizeQuery(query.query);
  var rows = await getDb().execute(sql`
    select p."id", p."status", p."primary_name" as "primaryName", p."sort_name" as "sortName", p."slug",
      p."birth_date" as "birthDate", p."death_date" as "deathDate", p."primary_professions" as "primaryProfessions",
      p."is_verified" as "isVerified", ${mediaSelect("m")}
    from "catalog_people" p
    ${personMediaJoin("p", "m")}
    where p."status" = 'active'
      ${search ? sql`and p."sort_name" >= ${search} and p."sort_name" < ${search + "\uffff"}` : sql.raw("")}
      ${cursor ? sql`and (p."sort_name" > ${cursor.sortName} or (p."sort_name" = ${cursor.sortName} and p."id" > ${cursor.id}))` : sql.raw("")}
    order by p."sort_name" asc, p."id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row) {
    return personCard(row as DbRow);
  });
  return page(items, query.limit, function (item) {
    return { sortName: item.sortName, id: item.id };
  });
}

export async function getCatalogPerson(id: string): Promise<CatalogPersonDetail> {
  var rows = await getDb().execute(sql`
    select p.*, ${mediaSelect("m")}
    from "catalog_people" p
    ${personMediaJoin("p", "m")}
    where p."id" = ${id}
      and p."status" in ('active', 'merged')
    limit 1
  `);
  var row = (rows.rows ?? [])[0] as DbRow | undefined;
  if (!row) throw notFound("Catalog person not found");
  var externalIds = await getExternalIds("person", id);
  var canonicalPerson = row.merged_into_person_id ? await getCatalogPersonCard(row.merged_into_person_id) : null;
  var base = personCard({
    id: row.id,
    status: row.status,
    primaryName: row.primary_name,
    sortName: row.sort_name,
    slug: row.slug,
    birthDate: row.birth_date,
    deathDate: row.death_date,
    primaryProfessions: row.primary_professions,
    isVerified: row.is_verified,
    mediaId: row.mId,
    mediaEntityType: row.mEntityType,
    mediaEntityId: row.mEntityId,
    mediaType: row.mType,
    mediaSource: row.mSource,
    mediaUrl: row.mUrl,
    mediaStorageKey: row.mStorageKey,
    mediaTitle: row.mTitle,
    mediaCaption: row.mCaption,
    mediaLanguage: row.mLanguage,
    mediaRegion: row.mRegion,
    mediaRightsNote: row.mRightsNote,
    mediaAttribution: row.mAttribution,
    mediaMetadata: row.mMetadata,
    mediaSortOrder: row.mSortOrder,
    mediaIsPrimary: row.mIsPrimary,
    mediaCreatedAt: row.mCreatedAt,
    mediaUpdatedAt: row.mUpdatedAt,
  });
  return {
    ...base,
    biography: row.biography ?? null,
    birthPlace: row.birth_place ?? null,
    deathPlace: row.death_place ?? null,
    gender: row.gender ?? null,
    mergedIntoPersonId: row.merged_into_person_id ?? null,
    canonicalPerson,
    externalIds,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function getPersonCredits(id: string, query: CatalogCreditsQueryInput): Promise<CatalogCreditPage> {
  var cursor = requireCursor<{ titleId: string; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select c.*, ${titleSelect("t", "title")}, ${mediaSelect("m")}
    from "catalog_credits" c
    inner join "catalog_titles" t on t."id" = c."title_id" and t."status" = 'active'
    ${titleMediaJoin("t", "m")}
    where c."person_id" = ${id}
      and c."status" = 'active'
      ${query.department ? sql`and c."department" = ${query.department}` : sql.raw("")}
      ${cursor ? sql`and (c."title_id" > ${cursor.titleId} or (c."title_id" = ${cursor.titleId} and c."id" > ${cursor.id}))` : sql.raw("")}
    order by c."title_id" asc, c."id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row: any): CatalogCreditRow {
    return {
      id: row.id,
      titleId: row.title_id,
      personId: row.person_id,
      department: row.department,
      job: row.job,
      characterName: row.character_name ?? null,
      creditedAs: row.credited_as ?? null,
      billingOrder: row.billing_order,
      episodeCount: row.episode_count ?? null,
      startYear: row.start_year ?? null,
      endYear: row.end_year ?? null,
      notes: row.notes ?? null,
      title: titleCard({
        id: row.titleid,
        type: row.titletype,
        status: row.titlestatus,
        primaryTitle: row.titleprimaryTitle,
        originalTitle: row.titleoriginalTitle,
        sortTitle: row.titlesortTitle,
        slug: row.titleslug,
        startYear: row.titlestartYear,
        endYear: row.titleendYear,
        releaseDate: row.titlereleaseDate,
        runtimeMinutes: row.titleruntimeMinutes,
        primaryLanguage: row.titleprimaryLanguage,
        primaryCountry: row.titleprimaryCountry,
        isAdult: row.titleisAdult,
        isVerified: row.titleisVerified,
        mediaId: row.mId,
        mediaEntityType: row.mEntityType,
        mediaEntityId: row.mEntityId,
        mediaType: row.mType,
        mediaSource: row.mSource,
        mediaUrl: row.mUrl,
        mediaStorageKey: row.mStorageKey,
        mediaTitle: row.mTitle,
        mediaCaption: row.mCaption,
        mediaLanguage: row.mLanguage,
        mediaRegion: row.mRegion,
        mediaRightsNote: row.mRightsNote,
        mediaAttribution: row.mAttribution,
        mediaMetadata: row.mMetadata,
        mediaSortOrder: row.mSortOrder,
        mediaIsPrimary: row.mIsPrimary,
        mediaCreatedAt: row.mCreatedAt,
        mediaUpdatedAt: row.mUpdatedAt,
      }),
      person: null,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  });
  return page(items, query.limit, function (item) {
    return { titleId: item.titleId, id: item.id };
  });
}

export async function listCatalogCompanies(query: CatalogCompanySearchQueryInput): Promise<CatalogCompanyPage> {
  var cursor = requireCursor<{ sortName: string; id: string }>(query.cursor);
  var search = normalizeQuery(query.query);
  var rows = await getDb().execute(sql`
    select "id", "status", "type", "name", "sort_name" as "sortName", "slug", "country",
      "founded_year" as "foundedYear", "dissolved_year" as "dissolvedYear", "is_verified" as "isVerified"
    from "catalog_companies"
    where "status" = 'active'
      ${search ? sql`and "sort_name" >= ${search} and "sort_name" < ${search + "\uffff"}` : sql.raw("")}
      ${cursor ? sql`and ("sort_name" > ${cursor.sortName} or ("sort_name" = ${cursor.sortName} and "id" > ${cursor.id}))` : sql.raw("")}
    order by "sort_name" asc, "id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row) {
    return companyCard(row as DbRow);
  });
  return page(items, query.limit, function (item) {
    return { sortName: item.sortName, id: item.id };
  });
}

export async function getCatalogCompany(id: string): Promise<CatalogCompanyDetail> {
  var rows = await getDb().execute(sql`
    select *
    from "catalog_companies"
    where "id" = ${id}
      and "status" in ('active', 'merged')
    limit 1
  `);
  var row = (rows.rows ?? [])[0] as DbRow | undefined;
  if (!row) throw notFound("Catalog company not found");
  var externalIds = await getExternalIds("company", id);
  var canonicalCompany = row.merged_into_company_id ? await getCatalogCompanyCard(row.merged_into_company_id) : null;
  return {
    ...companyCard({
      id: row.id,
      status: row.status,
      type: row.type,
      name: row.name,
      sortName: row.sort_name,
      slug: row.slug,
      country: row.country,
      foundedYear: row.founded_year,
      dissolvedYear: row.dissolved_year,
      isVerified: row.is_verified,
    }),
    description: row.description ?? null,
    officialUrl: row.official_url ?? null,
    mergedIntoCompanyId: row.merged_into_company_id ?? null,
    canonicalCompany,
    externalIds,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function getCatalogCompanyCard(id: string) {
  var rows = await getDb().execute(sql`
    select "id", "status", "type", "name", "sort_name" as "sortName", "slug", "country",
      "founded_year" as "foundedYear", "dissolved_year" as "dissolvedYear", "is_verified" as "isVerified"
    from "catalog_companies"
    where "id" = ${id}
      and "status" = 'active'
    limit 1
  `);
  var row = (rows.rows ?? [])[0] as DbRow | undefined;
  return row ? companyCard(row) : null;
}

export async function getCompanyTitles(id: string, query: CatalogCompanyTitlesQueryInput): Promise<CatalogCompanyTitlePage> {
  var cursor = requireCursor<{ role: string; titleId: string; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select tc."id", tc."company_id" as "companyId", tc."title_id" as "titleId", tc."role",
      tc."region", tc."start_date" as "startDate", tc."end_date" as "endDate", tc."sort_order" as "sortOrder",
      ${titleSelect("t", "title")}, ${mediaSelect("m")}
    from "catalog_title_companies" tc
    inner join "catalog_titles" t on t."id" = tc."title_id" and t."status" = 'active'
    ${titleMediaJoin("t", "m")}
    where tc."company_id" = ${id}
      ${query.role ? sql`and tc."role" = ${query.role}` : sql.raw("")}
      ${cursor ? sql`
        and (
          tc."role" > ${cursor.role}
          or (tc."role" = ${cursor.role} and tc."title_id" > ${cursor.titleId})
          or (tc."role" = ${cursor.role} and tc."title_id" = ${cursor.titleId} and tc."id" > ${cursor.id})
        )
      ` : sql.raw("")}
    order by tc."role" asc, tc."title_id" asc, tc."id" asc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row: any): CatalogCompanyTitleRow {
    return {
      id: row.id,
      companyId: row.companyId,
      titleId: row.titleId,
      role: row.role,
      region: row.region ?? null,
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
      sortOrder: row.sortOrder,
      title: titleCard({
        id: row.titleid,
        type: row.titletype,
        status: row.titlestatus,
        primaryTitle: row.titleprimaryTitle,
        originalTitle: row.titleoriginalTitle,
        sortTitle: row.titlesortTitle,
        slug: row.titleslug,
        startYear: row.titlestartYear,
        endYear: row.titleendYear,
        releaseDate: row.titlereleaseDate,
        runtimeMinutes: row.titleruntimeMinutes,
        primaryLanguage: row.titleprimaryLanguage,
        primaryCountry: row.titleprimaryCountry,
        isAdult: row.titleisAdult,
        isVerified: row.titleisVerified,
        mediaId: row.mId,
        mediaEntityType: row.mEntityType,
        mediaEntityId: row.mEntityId,
        mediaType: row.mType,
        mediaSource: row.mSource,
        mediaUrl: row.mUrl,
        mediaStorageKey: row.mStorageKey,
        mediaTitle: row.mTitle,
        mediaCaption: row.mCaption,
        mediaLanguage: row.mLanguage,
        mediaRegion: row.mRegion,
        mediaRightsNote: row.mRightsNote,
        mediaAttribution: row.mAttribution,
        mediaMetadata: row.mMetadata,
        mediaSortOrder: row.mSortOrder,
        mediaIsPrimary: row.mIsPrimary,
        mediaCreatedAt: row.mCreatedAt,
        mediaUpdatedAt: row.mUpdatedAt,
      }),
    };
  });
  return page(items, query.limit, function (item) {
    return { role: item.role, titleId: item.titleId, id: item.id };
  });
}

export async function getCatalogEditQueue(query: CatalogEditQueueQueryInput): Promise<CatalogEditQueuePage> {
  var cursor = requireCursor<{ createdAt: string; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select
      e."id", e."status", e."source", e."summary", e."rationale", e."actor_user_id" as "actorUserId",
      e."idempotency_key" as "idempotencyKey", e."public_visible" as "publicVisible",
      e."reverts_edit_id" as "revertsEditId", e."reverted_by_edit_id" as "revertedByEditId",
      e."created_at" as "createdAt", e."updated_at" as "updatedAt",
      coalesce(json_agg(distinct jsonb_build_object('entityType', r."entity_type", 'entityId', r."entity_id"))
        filter (where r."id" is not null), '[]') as "entities"
    from "catalog_edits" e
    left join "catalog_revisions" r on r."edit_id" = e."id"
    where 1 = 1
      ${query.status ? sql`and e."status" = ${query.status}` : sql.raw("")}
      ${query.source ? sql`and e."source" = ${query.source}` : sql.raw("")}
      ${query.entityType ? sql`and exists (
        select 1 from "catalog_revisions" er
        where er."edit_id" = e."id"
          and er."entity_type" = ${query.entityType}
          ${query.entityId ? sql`and er."entity_id" = ${query.entityId}` : sql.raw("")}
      )` : sql.raw("")}
      ${cursor ? sql`
        and (
          e."created_at" < ${cursor.createdAt}
          or (e."created_at" = ${cursor.createdAt} and e."id" < ${cursor.id})
        )
      ` : sql.raw("")}
    group by e."id"
    order by e."created_at" desc, e."id" desc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row: any): CatalogEditQueueItem {
    return {
      ...toCatalogEditDto({
        id: row.id,
        status: row.status,
        source: row.source,
        summary: row.summary,
        publicVisible: row.publicVisible,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
      rationale: row.rationale ?? null,
      actorUserId: row.actorUserId ?? null,
      idempotencyKey: row.idempotencyKey ?? null,
      revertsEditId: row.revertsEditId ?? null,
      revertedByEditId: row.revertedByEditId ?? null,
      entities: row.entities ?? [],
    };
  });
  return page(items, query.limit, function (item) {
    return { createdAt: item.createdAt, id: item.id };
  });
}

export async function getCatalogEdit(id: string): Promise<CatalogEditQueueItem> {
  var rows = await getDb().execute(sql`
    select
      e."id", e."status", e."source", e."summary", e."rationale", e."actor_user_id" as "actorUserId",
      e."idempotency_key" as "idempotencyKey", e."public_visible" as "publicVisible",
      e."reverts_edit_id" as "revertsEditId", e."reverted_by_edit_id" as "revertedByEditId",
      e."created_at" as "createdAt", e."updated_at" as "updatedAt",
      coalesce(json_agg(jsonb_build_object('entityType', r."entity_type", 'entityId', r."entity_id"))
        filter (where r."id" is not null), '[]') as "entities"
    from "catalog_edits" e
    left join "catalog_revisions" r on r."edit_id" = e."id"
    where e."id" = ${id}
    group by e."id"
    limit 1
  `);
  var row = (rows.rows ?? [])[0] as any | undefined;
  if (!row) throw notFound("Catalog edit not found");
  return {
    ...toCatalogEditDto({
      id: row.id,
      status: row.status,
      source: row.source,
      summary: row.summary,
      publicVisible: row.publicVisible,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
    rationale: row.rationale ?? null,
    actorUserId: row.actorUserId ?? null,
    idempotencyKey: row.idempotencyKey ?? null,
    revertsEditId: row.revertsEditId ?? null,
    revertedByEditId: row.revertedByEditId ?? null,
    entities: row.entities ?? [],
  };
}

export async function getEntityHistory(
  entityType: "title" | "person" | "company",
  entityId: string,
  query: CatalogHistoryQueryInput,
  includePrivate: boolean
): Promise<CatalogHistoryPage> {
  var cursor = requireCursor<{ createdAt: string; id: string }>(query.cursor);
  var rows = await getDb().execute(sql`
    select
      e."id", e."status", e."source", e."summary", e."public_visible" as "publicVisible",
      e."created_at" as "editCreatedAt", e."updated_at" as "updatedAt",
      r."id" as "revisionId", r."entity_type" as "entityType", r."entity_id" as "entityId",
      r."action", r."changed_fields" as "changedFields", r."created_at" as "createdAt"
    from "catalog_revisions" r
    inner join "catalog_edits" e on e."id" = r."edit_id"
    where r."entity_type" = ${entityType}
      and r."entity_id" = ${entityId}
      ${includePrivate ? sql.raw("") : sql`and r."public_visible" = true and e."public_visible" = true`}
      ${cursor ? sql`
        and (
          r."created_at" < ${cursor.createdAt}
          or (r."created_at" = ${cursor.createdAt} and r."id" < ${cursor.id})
        )
      ` : sql.raw("")}
    order by r."created_at" desc, r."id" desc
    limit ${query.limit + 1}
  `);
  var items = (rows.rows ?? []).map(function (row: any): CatalogHistoryItem {
    return {
      id: row.id,
      status: row.status,
      source: row.source,
      summary: row.summary,
      publicVisible: row.publicVisible,
      updatedAt: iso(row.updatedAt),
      revisionId: row.revisionId,
      entityType: row.entityType,
      entityId: row.entityId,
      action: row.action,
      changedFields: row.changedFields ?? [],
      createdAt: iso(row.createdAt),
    };
  });
  return page(items, query.limit, function (item) {
    return { createdAt: item.createdAt, id: item.revisionId };
  });
}
