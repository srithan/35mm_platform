import { and, eq, sql } from "drizzle-orm";
import {
  catalogEdits,
  catalogIndexJobs,
  catalogRevisions,
  catalogSources,
} from "@35mm/db/schema";
import type {
  CatalogEditDto,
  CatalogEditMutationResult,
  CatalogEditSource,
  CatalogEntityRef,
  CatalogEntityType,
  CatalogRevisionAction,
} from "@35mm/types";
import {
  catalogMergeEntitiesSchema,
  stageCatalogEditSchema,
  type CatalogMergeEntitiesInput,
  type CatalogOperationInput,
  type CatalogSourceInput,
  type StageCatalogEditInput,
} from "@35mm/validators";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { getWriteDb } from "../../lib/db.js";
import { createUlid } from "../../lib/ulid.js";
import { logCatalogMetric, logCatalogMutation, nowMs } from "./observability.js";
import { invalidateCatalogReadCaches } from "./readCache.js";
import { toCatalogEditDto } from "./serializer.js";

type Tx = any;
type JsonRecord = Record<string, unknown>;
type CatalogRevisionRow = typeof catalogRevisions.$inferSelect;

type StageCatalogEditServiceInput = StageCatalogEditInput & {
  actorUserId: string | null;
};

type EntityConfig = {
  entityType: CatalogEntityType;
  tableName: string;
  idColumn: string;
  columns: Record<string, string>;
  requiredCreateFields: string[];
  statusColumn?: string;
  lockedAtColumn?: string;
  mergedIntoColumn?: string;
  createdByColumn?: string;
  updatedByColumn?: string;
  hardDelete?: boolean;
};

type PreparedOperation = CatalogOperationInput & {
  entityId: string;
};

export type BatchCatalogEditDiagnostic = {
  index: number;
  ok: boolean;
  result?: CatalogEditMutationResult;
  error?: {
    code: string;
    message: string;
  };
};

export type BatchCatalogEditResult = {
  chunkSize: number;
  diagnostics: BatchCatalogEditDiagnostic[];
};

var COMMON_COLUMNS: Record<string, string> = {
  id: "id",
  status: "status",
  lockedAt: "locked_at",
  mergedIntoTitleId: "merged_into_title_id",
  mergedIntoPersonId: "merged_into_person_id",
  mergedIntoCompanyId: "merged_into_company_id",
  createdByUserId: "created_by_user_id",
  updatedByUserId: "updated_by_user_id",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

var ENTITY_CONFIGS: Record<string, EntityConfig> = {
  title: {
    entityType: "title",
    tableName: "catalog_titles",
    idColumn: "id",
    columns: {
      legacyFilmId: "legacy_film_id",
      type: "type",
      lifecycle: "lifecycle",
      status: "status",
      primaryTitle: "primary_title",
      originalTitle: "original_title",
      sortTitle: "sort_title",
      slug: "slug",
      synopsis: "synopsis",
      startYear: "start_year",
      endYear: "end_year",
      releaseDate: "release_date",
      runtimeMinutes: "runtime_minutes",
      primaryLanguage: "primary_language",
      primaryCountry: "primary_country",
      originCountries: "origin_countries",
      spokenLanguages: "spoken_languages",
      facts: "facts",
      parentTitleId: "parent_title_id",
      seasonNumber: "season_number",
      episodeNumber: "episode_number",
      absoluteEpisodeNumber: "absolute_episode_number",
      isAdult: "is_adult",
      isVerified: "is_verified",
    },
    requiredCreateFields: ["type", "primaryTitle", "sortTitle", "slug"],
    statusColumn: "status",
    lockedAtColumn: "locked_at",
    mergedIntoColumn: "merged_into_title_id",
    createdByColumn: "created_by_user_id",
    updatedByColumn: "updated_by_user_id",
  },
  person: {
    entityType: "person",
    tableName: "catalog_people",
    idColumn: "id",
    columns: {
      status: "status",
      primaryName: "primary_name",
      sortName: "sort_name",
      slug: "slug",
      biography: "biography",
      birthDate: "birth_date",
      deathDate: "death_date",
      birthPlace: "birth_place",
      deathPlace: "death_place",
      primaryProfessions: "primary_professions",
      gender: "gender",
      isVerified: "is_verified",
    },
    requiredCreateFields: ["primaryName", "sortName", "slug"],
    statusColumn: "status",
    lockedAtColumn: "locked_at",
    mergedIntoColumn: "merged_into_person_id",
    createdByColumn: "created_by_user_id",
    updatedByColumn: "updated_by_user_id",
  },
  credit: {
    entityType: "credit",
    tableName: "catalog_credits",
    idColumn: "id",
    columns: {
      titleId: "title_id",
      personId: "person_id",
      department: "department",
      job: "job",
      characterName: "character_name",
      creditedAs: "credited_as",
      billingOrder: "billing_order",
      episodeCount: "episode_count",
      startYear: "start_year",
      endYear: "end_year",
      notes: "notes",
      status: "status",
    },
    requiredCreateFields: ["titleId", "personId", "department", "job"],
    statusColumn: "status",
    createdByColumn: "created_by_user_id",
    updatedByColumn: "updated_by_user_id",
  },
  media_asset: {
    entityType: "media_asset",
    tableName: "catalog_media_assets",
    idColumn: "id",
    columns: {
      entityType: "entity_type",
      entityId: "entity_id",
      type: "type",
      source: "source",
      url: "url",
      storageKey: "storage_key",
      title: "title",
      caption: "caption",
      language: "language",
      region: "region",
      rightsNote: "rights_note",
      attribution: "attribution",
      metadata: "metadata",
      sortOrder: "sort_order",
      isPrimary: "is_primary",
      status: "status",
    },
    requiredCreateFields: ["entityType", "entityId", "type", "source", "url"],
    statusColumn: "status",
    createdByColumn: "created_by_user_id",
    updatedByColumn: "updated_by_user_id",
  },
  external_id: {
    entityType: "external_id",
    tableName: "catalog_external_ids",
    idColumn: "id",
    columns: {
      entityType: "entity_type",
      entityId: "entity_id",
      provider: "provider",
      externalId: "external_id",
      url: "url",
      isPrimary: "is_primary",
      status: "status",
    },
    requiredCreateFields: ["entityType", "entityId", "provider", "externalId"],
    statusColumn: "status",
  },
  company: {
    entityType: "company",
    tableName: "catalog_companies",
    idColumn: "id",
    columns: {
      status: "status",
      type: "type",
      name: "name",
      sortName: "sort_name",
      slug: "slug",
      description: "description",
      country: "country",
      foundedYear: "founded_year",
      dissolvedYear: "dissolved_year",
      officialUrl: "official_url",
      isVerified: "is_verified",
    },
    requiredCreateFields: ["name", "sortName", "slug"],
    statusColumn: "status",
    mergedIntoColumn: "merged_into_company_id",
    createdByColumn: "created_by_user_id",
    updatedByColumn: "updated_by_user_id",
  },
  title_relation: {
    entityType: "title_relation",
    tableName: "catalog_title_relations",
    idColumn: "id",
    columns: {
      fromTitleId: "from_title_id",
      toTitleId: "to_title_id",
      type: "type",
      sortOrder: "sort_order",
      note: "note",
    },
    requiredCreateFields: ["fromTitleId", "toTitleId", "type"],
    hardDelete: true,
  },
  title_company: {
    entityType: "title_company",
    tableName: "catalog_title_companies",
    idColumn: "id",
    columns: {
      titleId: "title_id",
      companyId: "company_id",
      role: "role",
      region: "region",
      startDate: "start_date",
      endDate: "end_date",
      sortOrder: "sort_order",
    },
    requiredCreateFields: ["titleId", "companyId", "role"],
    hardDelete: true,
  },
  title_genre: {
    entityType: "title_genre",
    tableName: "catalog_title_genres",
    idColumn: "id",
    columns: {
      titleId: "title_id",
      genreId: "genre_id",
      sortOrder: "sort_order",
    },
    requiredCreateFields: ["titleId", "genreId"],
    hardDelete: true,
  },
  award: {
    entityType: "award",
    tableName: "catalog_awards",
    idColumn: "id",
    columns: {
      status: "status",
      name: "name",
      originalName: "original_name",
      slug: "slug",
      description: "description",
      officialUrl: "official_url",
      country: "country",
      firstYear: "first_year",
      lastYear: "last_year",
    },
    requiredCreateFields: ["name", "slug"],
    statusColumn: "status",
  },
  award_event: {
    entityType: "award_event",
    tableName: "catalog_award_events",
    idColumn: "id",
    columns: {
      awardId: "award_id",
      name: "name",
      year: "year",
      eventDate: "event_date",
      location: "location",
      officialUrl: "official_url",
    },
    requiredCreateFields: ["awardId", "name", "year"],
    hardDelete: true,
  },
  award_nomination: {
    entityType: "award_nomination",
    tableName: "catalog_award_nominations",
    idColumn: "id",
    columns: {
      eventId: "event_id",
      categoryName: "category_name",
      outcome: "outcome",
      titleId: "title_id",
      personId: "person_id",
      companyId: "company_id",
      creditedName: "credited_name",
      sortOrder: "sort_order",
    },
    requiredCreateFields: ["eventId", "categoryName", "outcome"],
    hardDelete: true,
  },
  alias: {
    entityType: "alias",
    tableName: "catalog_aliases",
    idColumn: "id",
    columns: {
      entityType: "entity_type",
      entityId: "entity_id",
      type: "type",
      value: "value",
      sortValue: "sort_value",
      language: "language",
      region: "region",
      attributes: "attributes",
      isPrimary: "is_primary",
    },
    requiredCreateFields: ["entityType", "entityId", "type", "value", "sortValue"],
    hardDelete: true,
  },
};

function tableSql(config: EntityConfig) {
  return sql.raw('"' + config.tableName + '"');
}

function columnSql(columnName: string) {
  return sql.raw('"' + columnName + '"');
}

var TEXT_ARRAY_COLUMNS = new Set([
  "origin_countries",
  "spoken_languages",
  "primary_professions",
  "attributes",
]);

var JSONB_COLUMNS = new Set([
  "facts",
  "metadata",
]);

function textArrayValueSql(value: unknown) {
  if (value == null) return sql`NULL::text[]`;
  if (!Array.isArray(value)) return sql`${value}`;
  if (value.length === 0) return sql`ARRAY[]::text[]`;
  return sql`ARRAY[${sql.join(value.map(function (item) {
    return sql`${item}`;
  }), sql`, `)}]::text[]`;
}

function writeValueSql(column: string, value: unknown) {
  if (TEXT_ARRAY_COLUMNS.has(column)) return textArrayValueSql(value);
  if (JSONB_COLUMNS.has(column)) {
    if (value == null) return sql`NULL::jsonb`;
    return sql`${JSON.stringify(value)}::jsonb`;
  }
  return sql`${value}`;
}

function normalizeDbRow(row: Record<string, unknown>, config: EntityConfig): JsonRecord {
  var reverse: Record<string, string> = {};
  for (var key of Object.keys(COMMON_COLUMNS)) reverse[COMMON_COLUMNS[key]] = key;
  for (var key of Object.keys(config.columns)) reverse[config.columns[key]] = key;

  var output: JsonRecord = {};
  for (var entry of Object.entries(row)) {
    output[reverse[entry[0]] ?? entry[0]] = entry[1];
  }
  return output;
}

function changedFieldsFor(operation: PreparedOperation): string[] {
  if (operation.action === "delete") return ["status"];
  return Object.keys(operation.data).sort();
}

function entityRefsFor(operations: PreparedOperation[]): CatalogEntityRef[] {
  var seen = new Set<string>();
  var refs: CatalogEntityRef[] = [];
  for (var operation of operations) {
    var key = operation.entityType + ":" + operation.entityId;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ entityType: operation.entityType, entityId: operation.entityId });
  }
  return refs.sort(function (a, b) {
    return (a.entityType + ":" + a.entityId).localeCompare(b.entityType + ":" + b.entityId);
  });
}

function prepareOperations(operations: CatalogOperationInput[]): PreparedOperation[] {
  return operations.map(function (operation) {
    return {
      ...operation,
      entityId: operation.entityId ?? createUlid(),
    };
  });
}

function validateRequiredCreateFields(operation: PreparedOperation): void {
  if (operation.action !== "create") return;
  var config = ENTITY_CONFIGS[operation.entityType];
  for (var field of config.requiredCreateFields) {
    if (!(field in operation.data) || operation.data[field as keyof typeof operation.data] == null) {
      throw badRequest("Missing required catalog create field: " + field);
    }
  }
}

function isLockTimeout(error: unknown): boolean {
  var candidate = error as { code?: unknown; cause?: unknown };
  if (candidate?.code === "55P03") return true;
  var cause = candidate?.cause as { code?: unknown } | undefined;
  return cause?.code === "55P03";
}

function apiErrorPayload(error: unknown): { code: string; message: string } {
  var maybe = error as { code?: unknown; message?: unknown };
  return {
    code: typeof maybe.code === "string" ? maybe.code : "INTERNAL_ERROR",
    message: typeof maybe.message === "string" ? maybe.message : "Catalog mutation failed",
  };
}

function parseStageServiceInput(rawInput: StageCatalogEditServiceInput): StageCatalogEditServiceInput {
  var { actorUserId: _actorUserId, ...payload } = rawInput;
  try {
    var parsed = stageCatalogEditSchema.parse(payload) as StageCatalogEditInput;
    return { ...parsed, actorUserId: rawInput.actorUserId };
  } catch (error) {
    throw badRequest(zodMessage(error));
  }
}

function zodMessage(error: unknown): string {
  var issues = (error as { issues?: Array<{ message?: unknown }> }).issues;
  if (Array.isArray(issues) && typeof issues[0]?.message === "string") {
    return issues[0].message;
  }
  return "Invalid catalog mutation payload";
}

async function setTransactionLockTimeout(tx: Tx): Promise<void> {
  await tx.execute(sql`SET LOCAL lock_timeout = '2s'`);
}

async function selectCurrentRow(
  tx: Tx,
  config: EntityConfig,
  entityId: string,
  forUpdate: boolean
): Promise<JsonRecord | null> {
  var result = await tx.execute(sql`
    select *
    from ${tableSql(config)}
    where ${columnSql(config.idColumn)} = ${entityId}
    limit 1
    ${forUpdate ? sql.raw("for update") : sql.raw("")}
  `);
  var row = result.rows?.[0] as Record<string, unknown> | undefined;
  return row ? normalizeDbRow(row, config) : null;
}

async function lockCurrentRows(tx: Tx, refs: CatalogEntityRef[]): Promise<void> {
  var grouped = new Map<string, string[]>();
  for (var ref of refs) {
    var config = ENTITY_CONFIGS[ref.entityType];
    if (!config) continue;
    var list = grouped.get(ref.entityType) ?? [];
    list.push(ref.entityId);
    grouped.set(ref.entityType, list);
  }

  var sortedTypes = Array.from(grouped.keys()).sort();
  for (var entityType of sortedTypes) {
    var config = ENTITY_CONFIGS[entityType];
    var ids = Array.from(new Set(grouped.get(entityType) ?? [])).sort();
    if (ids.length === 0) continue;
    await tx.execute(sql`
      select ${columnSql(config.idColumn)}
      from ${tableSql(config)}
      where ${columnSql(config.idColumn)} in (${sql.join(ids.map(function (id) {
        return sql`${id}`;
      }), sql`, `)})
      order by ${columnSql(config.idColumn)} asc
      for update
    `);
  }
}

function dataForWrite(operation: PreparedOperation, actorUserId: string | null): JsonRecord {
  var config = ENTITY_CONFIGS[operation.entityType];
  var data = operation.data as JsonRecord;
  var write: JsonRecord = {};
  for (var key of Object.keys(data)) {
    if (key in config.columns) write[key] = data[key];
  }
  if (operation.action === "delete" && config.statusColumn) {
    write.status = "deleted";
  }
  if (actorUserId && config.updatedByColumn) write.updatedByUserId = actorUserId;
  return write;
}

function buildColumnValues(config: EntityConfig, data: JsonRecord): Array<{ column: string; value: unknown }> {
  var values: Array<{ column: string; value: unknown }> = [];
  for (var key of Object.keys(data)) {
    if (key === "id") {
      values.push({ column: config.idColumn, value: data[key] });
    } else if (key in config.columns) {
      values.push({ column: config.columns[key], value: data[key] });
    } else if (COMMON_COLUMNS[key]) {
      values.push({ column: COMMON_COLUMNS[key], value: data[key] });
    }
  }
  return values;
}

async function insertCurrentRow(
  tx: Tx,
  operation: PreparedOperation,
  actorUserId: string | null
): Promise<void> {
  var config = ENTITY_CONFIGS[operation.entityType];
  var data: JsonRecord = { id: operation.entityId, ...(operation.data as JsonRecord) };
  if (actorUserId && config.createdByColumn) data.createdByUserId = actorUserId;
  if (actorUserId && config.updatedByColumn) data.updatedByUserId = actorUserId;
  var values = buildColumnValues(config, data);
  await tx.execute(sql`
    insert into ${tableSql(config)}
      (${sql.join(values.map(function (item) {
        return columnSql(item.column);
      }), sql`, `)})
    values
      (${sql.join(values.map(function (item) {
        return writeValueSql(item.column, item.value);
      }), sql`, `)})
  `);
}

async function updateCurrentRow(
  tx: Tx,
  operation: PreparedOperation,
  actorUserId: string | null
): Promise<void> {
  var config = ENTITY_CONFIGS[operation.entityType];
  if (operation.action === "delete" && config.hardDelete) {
    await tx.execute(sql`
      delete from ${tableSql(config)}
      where ${columnSql(config.idColumn)} = ${operation.entityId}
    `);
    return;
  }
  var data = dataForWrite(operation, actorUserId);
  data.updatedAt = new Date();
  var values = buildColumnValues(config, data);
  if (values.length === 0) return;
  await tx.execute(sql`
    update ${tableSql(config)}
    set ${sql.join(values.map(function (item) {
      return sql`${columnSql(item.column)} = ${writeValueSql(item.column, item.value)}`;
    }), sql`, `)}
    where ${columnSql(config.idColumn)} = ${operation.entityId}
  `);
}

async function applyPreparedOperation(
  tx: Tx,
  operation: PreparedOperation,
  actorUserId: string | null
): Promise<void> {
  if (operation.action === "create") {
    await insertCurrentRow(tx, operation, actorUserId);
    return;
  }
  await updateCurrentRow(tx, operation, actorUserId);
}

async function restoreRevision(tx: Tx, revision: {
  entityType: CatalogEntityType;
  entityId: string;
  beforeData: JsonRecord | null;
}, actorUserId: string | null): Promise<void> {
  var config = ENTITY_CONFIGS[revision.entityType];
  if (!config) return;
  if (!revision.beforeData) {
    if (config.hardDelete) {
      await updateCurrentRow(tx, {
        entityType: revision.entityType,
        entityId: revision.entityId,
        action: "delete",
        data: {},
        publicVisible: true,
      } as PreparedOperation, actorUserId);
      return;
    }
    if (!config.statusColumn) return;
    await updateCurrentRow(tx, {
      entityType: revision.entityType,
      entityId: revision.entityId,
      action: "delete",
      data: {},
      publicVisible: true,
    } as PreparedOperation, actorUserId);
    return;
  }

  var current = await selectCurrentRow(tx, config, revision.entityId, false);
  if (!current) {
    await insertCurrentRow(tx, {
      entityType: revision.entityType,
      entityId: revision.entityId,
      action: "create",
      data: revision.beforeData,
      publicVisible: true,
    } as PreparedOperation, actorUserId);
    return;
  }

  var data = { ...revision.beforeData };
  delete data.id;
  await updateCurrentRow(tx, {
    entityType: revision.entityType,
    entityId: revision.entityId,
    action: "update",
    data,
    publicVisible: true,
  } as PreparedOperation, actorUserId);
}

function mergedAfterData(before: JsonRecord | null, operation: PreparedOperation): JsonRecord | null {
  if (operation.action === "create") {
    return { id: operation.entityId, ...(operation.data as JsonRecord) };
  }
  if (operation.action === "delete") {
    var config = ENTITY_CONFIGS[operation.entityType];
    if (config.hardDelete) return null;
    return { ...(before ?? { id: operation.entityId }), status: "deleted" };
  }
  return { ...(before ?? { id: operation.entityId }), ...(operation.data as JsonRecord) };
}

async function writeRevisionsForOperations(
  tx: Tx,
  editId: string,
  operations: PreparedOperation[],
  actorUserId: string | null,
  publicVisible: boolean
): Promise<void> {
  for (var operation of operations) {
    validateRequiredCreateFields(operation);
    var config = ENTITY_CONFIGS[operation.entityType];
    var before = operation.action === "create"
      ? null
      : await selectCurrentRow(tx, config, operation.entityId, false);
    if (operation.action !== "create" && !before) {
      throw notFound("Catalog " + operation.entityType + " not found");
    }
    var action = operation.action as CatalogRevisionAction;
    await tx.insert(catalogRevisions).values({
      id: createUlid(),
      editId,
      entityType: operation.entityType,
      entityId: operation.entityId,
      action,
      beforeData: before,
      afterData: mergedAfterData(before, operation),
      changedFields: changedFieldsFor(operation),
      publicVisible: operation.publicVisible ?? publicVisible,
    });
  }

  await writeSources(tx, editId, operations, actorUserId, publicVisible);
}

async function writeSources(
  tx: Tx,
  editId: string,
  operations: PreparedOperation[],
  actorUserId: string | null,
  publicVisible: boolean
): Promise<void> {
  var input = currentStageInputByEditId.get(editId);
  var sources = input?.sources ?? [];
  if (sources.length === 0) return;
  var fallbackRef = operations[0]
    ? { entityType: operations[0].entityType, entityId: operations[0].entityId }
    : null;

  await tx.insert(catalogSources).values(sources.map(function (source: CatalogSourceInput) {
    return {
      id: createUlid(),
      editId,
      entityType: source.entityType ?? fallbackRef?.entityType ?? null,
      entityId: source.entityId ?? fallbackRef?.entityId ?? null,
      url: source.url,
      title: source.title ?? null,
      publisher: source.publisher ?? null,
      accessedAt: source.accessedAt ? new Date(source.accessedAt) : null,
      archiveUrl: source.archiveUrl ?? null,
      note: source.note ?? null,
      createdByUserId: actorUserId,
    };
  }));

  if (!publicVisible) return;
}

var currentStageInputByEditId = new Map<string, StageCatalogEditServiceInput>();

async function decideTargetStatus(
  tx: Tx,
  input: StageCatalogEditServiceInput,
  operations: PreparedOperation[]
): Promise<"pending_review" | "applied"> {
  if (input.source === "contribution") return "pending_review";

  var snapshotAt = input.sourceSnapshotAt ? new Date(input.sourceSnapshotAt) : null;
  for (var operation of operations) {
    if (operation.action === "create") continue;
    var config = ENTITY_CONFIGS[operation.entityType];
    var row = await selectCurrentRow(tx, config, operation.entityId, false);
    if (!row) throw notFound("Catalog " + operation.entityType + " not found");
    if (row.status === "locked" || row.lockedAt) return "pending_review";
    if (
      snapshotAt &&
      (input.source === "system" || input.source === "import") &&
      row.updatedAt instanceof Date &&
      row.updatedAt.getTime() > snapshotAt.getTime()
    ) {
      return "pending_review";
    }
  }

  return "applied";
}

async function insertEditOrReturnExisting(
  tx: Tx,
  input: StageCatalogEditServiceInput,
  editId: string
): Promise<{ edit: CatalogEditDto; existing: boolean }> {
  if (input.idempotencyKey) {
    var advisoryKey = (input.actorUserId ?? "system") + ":" + input.idempotencyKey;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${advisoryKey}))`);
    var existingBeforeInsert = await selectExistingIdempotentEdit(tx, input);
    if (existingBeforeInsert) {
      return { edit: existingBeforeInsert, existing: true };
    }
  }

  var inserted = await tx
    .insert(catalogEdits)
    .values({
      id: editId,
      source: input.source,
      status: "pending_review",
      actorUserId: input.actorUserId,
      summary: input.summary,
      rationale: input.rationale ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      publicVisible: input.publicVisible,
    })
    .onConflictDoNothing()
    .returning();

  var row = inserted[0] ?? null;
  if (row) return { edit: toCatalogEditDto(row), existing: false };

  if (!input.actorUserId || !input.idempotencyKey) {
    throw conflict("Catalog edit could not be staged");
  }

  var existing = await selectExistingIdempotentEdit(tx, input);
  if (!existing) throw conflict("Catalog edit idempotency lookup failed");
  return { edit: existing, existing: true };
}

async function selectExistingIdempotentEdit(
  tx: Tx,
  input: StageCatalogEditServiceInput
): Promise<CatalogEditDto | null> {
  if (!input.idempotencyKey) return null;
  var rows = input.actorUserId
    ? await tx
        .select()
        .from(catalogEdits)
        .where(and(
          eq(catalogEdits.actorUserId, input.actorUserId),
          eq(catalogEdits.idempotencyKey, input.idempotencyKey)
        ))
        .limit(1)
    : await tx.execute(sql`
        select
          "id",
          "status",
          "source",
          "summary",
          "public_visible" as "publicVisible",
          "created_at" as "createdAt",
          "updated_at" as "updatedAt"
        from "catalog_edits"
        where "actor_user_id" is null
          and "idempotency_key" = ${input.idempotencyKey}
        limit 1
      `).then(function (result: { rows?: unknown[] }) {
        return result.rows ?? [];
      });
  var row = rows[0] as Parameters<typeof toCatalogEditDto>[0] | undefined;
  return row ? toCatalogEditDto(row) : null;
}

async function writeIndexJob(
  tx: Tx,
  editId: string,
  refs: CatalogEntityRef[],
  reason: "apply" | "revert" | "merge" | "backfill" | "import"
): Promise<void> {
  await tx.insert(catalogIndexJobs).values({
    id: createUlid(),
    editId,
    status: "pending",
    payload: {
      entities: refs,
      reason,
    },
  });
}

async function applyEditInTransaction(
  tx: Tx,
  editId: string,
  actorUserId: string | null,
  reason: "apply" | "backfill" | "import" = "apply"
): Promise<CatalogEditDto> {
  await setTransactionLockTimeout(tx);

  var editRows = await tx.execute(sql`
    select *
    from "catalog_edits"
    where "id" = ${editId}
  `);
  var edit = editRows.rows?.[0] as {
    id: string;
    status: string;
    source: CatalogEditSource;
  } | undefined;
  if (!edit) throw notFound("Catalog edit not found");
  if (edit.status !== "pending_review") {
    throw conflict("Catalog edit is not pending review");
  }

  var revisionRows = await tx
    .select()
    .from(catalogRevisions)
    .where(eq(catalogRevisions.editId, editId)) as CatalogRevisionRow[];
  var refs = entityRefsFor(revisionRows.map(function (revision) {
    return {
      entityType: revision.entityType,
      entityId: revision.entityId,
      action: revision.action === "create" ? "create" : revision.action === "delete" ? "delete" : "update",
      data: revision.afterData ?? {},
      publicVisible: revision.publicVisible,
    } as PreparedOperation;
  }));

  await lockCurrentRows(tx, refs);

  var lockedEditRows = await tx.execute(sql`
    select *
    from "catalog_edits"
    where "id" = ${editId}
    for update
  `);
  edit = lockedEditRows.rows?.[0] as {
    id: string;
    status: string;
    source: CatalogEditSource;
  } | undefined;
  if (!edit) throw notFound("Catalog edit not found");
  if (edit.status !== "pending_review") {
    throw conflict("Catalog edit is not pending review");
  }

  for (var revision of revisionRows) {
    var data = (revision.afterData ?? {}) as JsonRecord;
    var operation: PreparedOperation = {
      entityType: revision.entityType,
      entityId: revision.entityId,
      action: revision.action === "create" ? "create" : revision.action === "delete" ? "delete" : "update",
      data: revision.action === "update"
        ? pickChangedFields(data, revision.changedFields)
        : data,
      publicVisible: revision.publicVisible,
    } as PreparedOperation;
    await applyPreparedOperation(tx, operation, actorUserId);
  }

  await tx.execute(sql`
    update "catalog_edits" as e
    set "status" = 'superseded',
        "updated_at" = now()
    where e."status" = 'pending_review'
      and e."id" <> ${editId}
      and exists (
        select 1
        from "catalog_revisions" pending_revision
        inner join "catalog_revisions" applied_revision
          on applied_revision."edit_id" = ${editId}
         and applied_revision."entity_type" = pending_revision."entity_type"
         and applied_revision."entity_id" = pending_revision."entity_id"
         and pending_revision."changed_fields" && applied_revision."changed_fields"
        where pending_revision."edit_id" = e."id"
      )
  `);

  await tx
    .update(catalogEdits)
    .set({ status: "applied", updatedAt: new Date() })
    .where(eq(catalogEdits.id, editId));
  await catalogMutationTestHooks.beforeIndexJob?.();
  await writeIndexJob(tx, editId, refs, reason);

  var updated = await tx.select().from(catalogEdits).where(eq(catalogEdits.id, editId)).limit(1);
  return toCatalogEditDto(updated[0]);
}

function pickChangedFields(data: JsonRecord, changedFields: string[]): JsonRecord {
  var output: JsonRecord = {};
  for (var field of changedFields) {
    if (field in data) output[field] = data[field];
  }
  return output;
}

async function stageCatalogEditInTransaction(
  tx: Tx,
  rawInput: StageCatalogEditServiceInput
): Promise<CatalogEditMutationResult> {
  var serviceInput = parseStageServiceInput(rawInput);
  var input = serviceInput;
  var operations = prepareOperations(input.operations);
  var editId = createUlid();
  currentStageInputByEditId.set(editId, serviceInput);
  try {
    var inserted = await insertEditOrReturnExisting(tx, serviceInput, editId);
    if (inserted.existing) {
      return { edit: inserted.edit, outcome: "existing" };
    }

    await writeRevisionsForOperations(tx, editId, operations, serviceInput.actorUserId, input.publicVisible);
    var targetStatus = await decideTargetStatus(tx, serviceInput, operations);
    if (targetStatus === "pending_review") {
      return { edit: inserted.edit, outcome: "created" };
    }

    var reason: "apply" | "backfill" | "import" =
      input.source === "system" ? "backfill" : input.source === "import" ? "import" : "apply";
    var appliedEdit = await applyEditInTransaction(tx, editId, serviceInput.actorUserId, reason);
    return { edit: appliedEdit, outcome: "applied" };
  } finally {
    currentStageInputByEditId.delete(editId);
  }
}

export async function stageCatalogEdit(
  rawInput: StageCatalogEditServiceInput
): Promise<CatalogEditMutationResult> {
  var startedAt = nowMs();
  var source = rawInput.source;
  var { actorUserId: _actorUserId, ...payloadForLog } = rawInput;
  var parsedForLog = stageCatalogEditSchema.safeParse(payloadForLog);
  var refs = parsedForLog.success ? entityRefsFor(prepareOperations(parsedForLog.data.operations)) : [];
  try {
    var result = await getWriteDb().transaction(async function (tx) {
      return stageCatalogEditInTransaction(tx, rawInput);
    });
    logCatalogMutation({
      operation: "stage",
      editId: result.edit.id,
      actorUserId: rawInput.actorUserId,
      source,
      entityRefs: refs,
      outcome: result.outcome,
      durationMs: nowMs() - startedAt,
    });
    await emitPostMutationMetrics("stage", result.edit.status);
    if (result.edit.status === "applied") {
      await invalidateCatalogReadCaches();
    }
    return result;
  } catch (error) {
    if (isLockTimeout(error)) {
      logCatalogMetric("catalog.lock_timeout", 1, { operation: "stage" });
      throw conflict("Catalog row is locked by another mutation; retry this request");
    }
    logCatalogMutation({
      operation: "stage",
      actorUserId: rawInput.actorUserId,
      source,
      entityRefs: refs,
      outcome: "error",
      durationMs: nowMs() - startedAt,
      error,
    });
    throw error;
  }
}

export async function applyCatalogEdit(editId: string, actorUserId: string | null): Promise<CatalogEditDto> {
  var startedAt = nowMs();
  try {
    var result = await getWriteDb().transaction(async function (tx) {
      return applyEditInTransaction(tx, editId, actorUserId);
    });
    logCatalogMutation({
      operation: "apply",
      editId,
      actorUserId,
      source: result.source,
      outcome: result.status,
      durationMs: nowMs() - startedAt,
    });
    await emitPostMutationMetrics("apply", result.status);
    await invalidateCatalogReadCaches();
    return result;
  } catch (error) {
    if (isLockTimeout(error)) {
      logCatalogMetric("catalog.lock_timeout", 1, { operation: "apply" });
      throw conflict("Catalog row is locked by another mutation; retry this request");
    }
    logCatalogMutation({
      operation: "apply",
      editId,
      actorUserId,
      outcome: "error",
      durationMs: nowMs() - startedAt,
      error,
    });
    throw error;
  }
}

export async function rejectCatalogEdit(editId: string, actorUserId: string | null): Promise<CatalogEditDto> {
  var startedAt = nowMs();
  try {
    var result = await getWriteDb().transaction(async function (tx) {
      await setTransactionLockTimeout(tx);
      var rows = await tx.execute(sql`
        select *
        from "catalog_edits"
        where "id" = ${editId}
        for update
      `);
      var edit = rows.rows?.[0] as { status?: string } | undefined;
      if (!edit) throw notFound("Catalog edit not found");
      if (edit.status !== "pending_review") throw conflict("Catalog edit is not pending review");
      var updated = await tx
        .update(catalogEdits)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(catalogEdits.id, editId))
        .returning();
      return toCatalogEditDto(updated[0]);
    });
    logCatalogMutation({
      operation: "reject",
      editId,
      actorUserId,
      source: result.source,
      outcome: result.status,
      durationMs: nowMs() - startedAt,
    });
    await emitPostMutationMetrics("reject", result.status);
    return result;
  } catch (error) {
    if (isLockTimeout(error)) {
      logCatalogMetric("catalog.lock_timeout", 1, { operation: "reject" });
      throw conflict("Catalog edit is locked by another mutation; retry this request");
    }
    logCatalogMutation({
      operation: "reject",
      editId,
      actorUserId,
      outcome: "error",
      durationMs: nowMs() - startedAt,
      error,
    });
    throw error;
  }
}

export async function revertCatalogEdit(editId: string, actorUserId: string | null): Promise<CatalogEditDto> {
  var startedAt = nowMs();
  try {
    var result = await getWriteDb().transaction(async function (tx) {
      await setTransactionLockTimeout(tx);
      var rows = await tx.execute(sql`
        select *
        from "catalog_edits"
        where "id" = ${editId}
        for update
      `);
      var edit = rows.rows?.[0] as {
        id: string;
        status?: string;
        source: CatalogEditSource;
        summary: string;
        public_visible: boolean;
      } | undefined;
      if (!edit) throw notFound("Catalog edit not found");
      if (edit.status !== "applied") throw conflict("Catalog edit is not applied");

      var revisions = await tx
        .select()
        .from(catalogRevisions)
        .where(eq(catalogRevisions.editId, editId));
      var refs = entityRefsFor(revisions.map(function (revision) {
        return {
          entityType: revision.entityType,
          entityId: revision.entityId,
          action: "update",
          data: {},
          publicVisible: revision.publicVisible,
        } as PreparedOperation;
      }));
      await lockCurrentRows(tx, refs);

      var revertEditId = createUlid();
      await tx.insert(catalogEdits).values({
        id: revertEditId,
        source: edit.source === "system" ? "system" : "studio",
        status: "applied",
        actorUserId,
        summary: "Revert: " + edit.summary,
        publicVisible: edit.public_visible,
        revertsEditId: editId,
      });

      for (var revision of revisions) {
        var current = await selectCurrentRow(tx, ENTITY_CONFIGS[revision.entityType], revision.entityId, false);
        await restoreRevision(tx, {
          entityType: revision.entityType,
          entityId: revision.entityId,
          beforeData: revision.beforeData as JsonRecord | null,
        }, actorUserId);
        await tx.insert(catalogRevisions).values({
          id: createUlid(),
          editId: revertEditId,
          entityType: revision.entityType,
          entityId: revision.entityId,
          action: "restore",
          beforeData: current,
          afterData: revision.beforeData,
          changedFields: revision.changedFields,
          publicVisible: revision.publicVisible,
        });
      }

      await tx
        .update(catalogEdits)
        .set({ status: "reverted", revertedByEditId: revertEditId, updatedAt: new Date() })
        .where(eq(catalogEdits.id, editId));
      await writeIndexJob(tx, revertEditId, refs, "revert");
      var updated = await tx.select().from(catalogEdits).where(eq(catalogEdits.id, editId)).limit(1);
      return toCatalogEditDto(updated[0]);
    });
    logCatalogMutation({
      operation: "revert",
      editId,
      actorUserId,
      source: result.source,
      outcome: result.status,
      durationMs: nowMs() - startedAt,
    });
    await emitPostMutationMetrics("revert", result.status);
    await invalidateCatalogReadCaches();
    return result;
  } catch (error) {
    if (isLockTimeout(error)) {
      logCatalogMetric("catalog.lock_timeout", 1, { operation: "revert" });
      throw conflict("Catalog row is locked by another mutation; retry this request");
    }
    logCatalogMutation({
      operation: "revert",
      editId,
      actorUserId,
      outcome: "error",
      durationMs: nowMs() - startedAt,
      error,
    });
    throw error;
  }
}

export async function batchStageCatalogEdits(
  inputs: StageCatalogEditServiceInput[],
  options: { chunkSize?: number } = {}
): Promise<BatchCatalogEditResult> {
  var chunkSize = Math.max(1, Math.min(options.chunkSize ?? 100, 500));
  var diagnostics: BatchCatalogEditDiagnostic[] = [];

  for (var start = 0; start < inputs.length; start += chunkSize) {
    var chunk = inputs.slice(start, start + chunkSize);
    try {
      var results = await getWriteDb().transaction(async function (tx) {
        var chunkResults: CatalogEditMutationResult[] = [];
        for (var input of chunk) {
          chunkResults.push(await stageCatalogEditInTransaction(tx, input));
        }
        return chunkResults;
      });
      results.forEach(function (result, offset) {
        diagnostics.push({ index: start + offset, ok: true, result });
      });
      if (results.some(function (result) { return result.edit.status === "applied"; })) {
        await invalidateCatalogReadCaches();
      }
    } catch (error) {
      var payload = apiErrorPayload(error);
      chunk.forEach(function (_input, offset) {
        diagnostics.push({
          index: start + offset,
          ok: false,
          error: payload,
        });
      });
      logCatalogMutation({
        operation: "batchStage",
        actorUserId: null,
        outcome: "chunk_rollback",
        durationMs: 0,
        error,
      });
    }
  }

  return { chunkSize, diagnostics };
}

export async function mergeCatalogEntities(rawInput: CatalogMergeEntitiesInput): Promise<CatalogEditDto> {
  var input: CatalogMergeEntitiesInput;
  try {
    input = catalogMergeEntitiesSchema.parse(rawInput);
  } catch (error) {
    throw badRequest(zodMessage(error));
  }
  var startedAt = nowMs();
  try {
    var result = await getWriteDb().transaction(async function (tx) {
      await setTransactionLockTimeout(tx);
      var config = ENTITY_CONFIGS[input.entityType];
      var canonicalId = await finalCanonicalEntityId(tx, config, input.canonicalEntityId);
      if (canonicalId === input.duplicateEntityId) {
        throw badRequest("Cannot merge an entity into itself");
      }
      var refs = [
        { entityType: input.entityType, entityId: input.duplicateEntityId },
        { entityType: input.entityType, entityId: canonicalId },
      ] as CatalogEntityRef[];
      await lockCurrentRows(tx, refs);
      var before = await selectCurrentRow(tx, config, input.duplicateEntityId, false);
      if (!before) throw notFound("Duplicate catalog entity not found");
      var canonical = await selectCurrentRow(tx, config, canonicalId, false);
      if (!canonical) throw notFound("Canonical catalog entity not found");

      var editId = createUlid();
      if (input.idempotencyKey) {
        var advisoryKey = (input.actorUserId ?? "system") + ":" + input.idempotencyKey;
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${advisoryKey}))`);
        var existing = await selectExistingIdempotentEdit(tx, {
          actorUserId: input.actorUserId ?? null,
          source: input.source,
          summary: input.summary,
          rationale: input.rationale ?? null,
          idempotencyKey: input.idempotencyKey,
          publicVisible: input.publicVisible,
          operations: [],
          sources: [],
        } as unknown as StageCatalogEditServiceInput);
        if (existing) return existing;
      }

      var inserted = await tx.insert(catalogEdits).values({
        id: editId,
        source: input.source,
        status: "applied",
        actorUserId: input.actorUserId ?? null,
        summary: input.summary,
        rationale: input.rationale ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        publicVisible: input.publicVisible,
      }).onConflictDoNothing().returning();
      if (inserted.length === 0) {
        var existing = await selectExistingIdempotentEdit(tx, {
          actorUserId: input.actorUserId ?? null,
          source: input.source,
          summary: input.summary,
          rationale: input.rationale ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
          publicVisible: input.publicVisible,
          operations: [],
          sources: [],
        } as unknown as StageCatalogEditServiceInput);
        if (existing) return existing;
        throw conflict("Catalog merge could not be staged");
      }

      await flattenMergePointers(tx, input.entityType, input.duplicateEntityId, canonicalId);
      await rewriteDirectPointers(tx, input.entityType, input.duplicateEntityId, canonicalId);
      await tx.execute(sql`
        update ${tableSql(config)}
        set ${columnSql(config.statusColumn ?? "status")} = 'merged',
            ${columnSql(config.mergedIntoColumn ?? "")} = ${canonicalId},
            "updated_at" = now()
        where ${columnSql(config.idColumn)} = ${input.duplicateEntityId}
      `);

      await tx.insert(catalogRevisions).values({
        id: createUlid(),
        editId,
        entityType: input.entityType,
        entityId: input.duplicateEntityId,
        action: "merge",
        beforeData: before,
        afterData: { ...before, status: "merged", [mergedIntoField(input.entityType)]: canonicalId },
        changedFields: ["status", mergedIntoField(input.entityType)],
        publicVisible: input.publicVisible,
      });
      await writeIndexJob(tx, editId, refs, "merge");
      var editRows = await tx.select().from(catalogEdits).where(eq(catalogEdits.id, editId)).limit(1);
      return toCatalogEditDto(editRows[0]);
    });
    logCatalogMutation({
      operation: "merge",
      editId: result.id,
      actorUserId: input.actorUserId ?? null,
      source: input.source,
      entityRefs: [
        { entityType: input.entityType, entityId: input.duplicateEntityId },
        { entityType: input.entityType, entityId: input.canonicalEntityId },
      ],
      outcome: result.status,
      durationMs: nowMs() - startedAt,
    });
    await invalidateCatalogReadCaches();
    return result;
  } catch (error) {
    if (isLockTimeout(error)) {
      logCatalogMetric("catalog.lock_timeout", 1, { operation: "merge" });
      throw conflict("Catalog row is locked by another mutation; retry this request");
    }
    logCatalogMutation({
      operation: "merge",
      actorUserId: input.actorUserId ?? null,
      source: input.source,
      outcome: "error",
      durationMs: nowMs() - startedAt,
      error,
    });
    throw error;
  }
}

async function finalCanonicalEntityId(tx: Tx, config: EntityConfig, entityId: string): Promise<string> {
  if (!config.mergedIntoColumn) return entityId;
  var current = entityId;
  var seen = new Set<string>();
  while (true) {
    if (seen.has(current)) throw conflict("Catalog merge cycle detected");
    seen.add(current);
    var rows = await tx.execute(sql`
      select ${columnSql(config.mergedIntoColumn)} as "mergedIntoId"
      from ${tableSql(config)}
      where ${columnSql(config.idColumn)} = ${current}
      for update
    `);
    var next = (rows.rows?.[0] as { mergedIntoId?: string | null } | undefined)?.mergedIntoId ?? null;
    if (!next) return current;
    current = next;
  }
}

function mergedIntoField(entityType: "title" | "person" | "company"): string {
  if (entityType === "title") return "mergedIntoTitleId";
  if (entityType === "person") return "mergedIntoPersonId";
  return "mergedIntoCompanyId";
}

async function flattenMergePointers(
  tx: Tx,
  entityType: "title" | "person" | "company",
  duplicateId: string,
  canonicalId: string
): Promise<void> {
  var config = ENTITY_CONFIGS[entityType];
  if (!config.mergedIntoColumn) return;
  await tx.execute(sql`
    update ${tableSql(config)}
    set ${columnSql(config.mergedIntoColumn)} = ${canonicalId},
        "updated_at" = now()
    where ${columnSql(config.mergedIntoColumn)} = ${duplicateId}
  `);
}

async function rewriteDirectPointers(
  tx: Tx,
  entityType: "title" | "person" | "company",
  duplicateId: string,
  canonicalId: string
): Promise<void> {
  if (entityType === "title") {
    await tx.execute(sql`update "catalog_credits" set "title_id" = ${canonicalId}, "updated_at" = now() where "title_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_title_companies" set "title_id" = ${canonicalId}, "updated_at" = now() where "title_id" = ${duplicateId}`);
    await tx.execute(sql`
      delete from "catalog_title_genres" duplicate_genre
      where duplicate_genre."title_id" = ${duplicateId}
        and exists (
          select 1
          from "catalog_title_genres" canonical_genre
          where canonical_genre."title_id" = ${canonicalId}
            and canonical_genre."genre_id" = duplicate_genre."genre_id"
        )
    `);
    await tx.execute(sql`update "catalog_title_genres" set "title_id" = ${canonicalId} where "title_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_title_relations" set "from_title_id" = ${canonicalId}, "updated_at" = now() where "from_title_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_title_relations" set "to_title_id" = ${canonicalId}, "updated_at" = now() where "to_title_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_award_nominations" set "title_id" = ${canonicalId}, "updated_at" = now() where "title_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_media_assets" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'title' and "entity_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_external_ids" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'title' and "entity_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_aliases" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'title' and "entity_id" = ${duplicateId}`);
    return;
  }
  if (entityType === "person") {
    await tx.execute(sql`update "catalog_credits" set "person_id" = ${canonicalId}, "updated_at" = now() where "person_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_award_nominations" set "person_id" = ${canonicalId}, "updated_at" = now() where "person_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_media_assets" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'person' and "entity_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_external_ids" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'person' and "entity_id" = ${duplicateId}`);
    await tx.execute(sql`update "catalog_aliases" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'person' and "entity_id" = ${duplicateId}`);
    return;
  }
  await tx.execute(sql`update "catalog_title_companies" set "company_id" = ${canonicalId}, "updated_at" = now() where "company_id" = ${duplicateId}`);
  await tx.execute(sql`update "catalog_award_nominations" set "company_id" = ${canonicalId}, "updated_at" = now() where "company_id" = ${duplicateId}`);
  await tx.execute(sql`update "catalog_media_assets" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'company' and "entity_id" = ${duplicateId}`);
  await tx.execute(sql`update "catalog_external_ids" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'company' and "entity_id" = ${duplicateId}`);
  await tx.execute(sql`update "catalog_aliases" set "entity_id" = ${canonicalId}, "updated_at" = now() where "entity_type" = 'company' and "entity_id" = ${duplicateId}`);
}

async function emitPostMutationMetrics(operation: string, status: string): Promise<void> {
  logCatalogMetric("catalog.mutation.count", 1, { operation, status });
}

type CatalogMutationTestHooks = {
  beforeIndexJob?: () => void | Promise<void>;
};

var catalogMutationTestHooks: CatalogMutationTestHooks = {};

export function setCatalogMutationTestHooksForTest(hooks: CatalogMutationTestHooks): void {
  catalogMutationTestHooks = hooks;
}

export var catalogMutationInternalsForTest = {
  changedFieldsFor,
  entityRefsFor,
  prepareOperations,
  isLockTimeout,
};
