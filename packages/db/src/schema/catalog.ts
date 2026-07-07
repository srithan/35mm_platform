import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { films } from "./films.js";
import { users } from "./users.js";

export var catalogTitleTypeEnum = pgEnum("catalog_title_type", [
  "movie",
  "short_film",
  "documentary",
  "tv_series",
  "web_series",
  "tv_season",
  "tv_episode",
  "tv_special",
  "video",
  "other",
]);

export var catalogTitleLifecycleEnum = pgEnum("catalog_title_lifecycle", [
  "unknown",
  "announced",
  "in_production",
  "released",
  "ended",
  "canceled",
]);

export var catalogEntityStatusEnum = pgEnum("catalog_entity_status", [
  "active",
  "merged",
  "deleted",
  "locked",
]);

export var catalogEntityTypeEnum = pgEnum("catalog_entity_type", [
  "title",
  "person",
  "credit",
  "company",
  "title_company",
  "award",
  "award_event",
  "award_nomination",
  "media_asset",
  "external_id",
  "alias",
  "title_relation",
  "source",
]);

export var catalogAliasTypeEnum = pgEnum("catalog_alias_type", [
  "primary",
  "original",
  "localized",
  "alternative",
  "working",
  "festival",
  "legal",
  "search",
]);

export var catalogRelationTypeEnum = pgEnum("catalog_relation_type", [
  "sequel",
  "prequel",
  "remake",
  "spin_off",
  "adaptation",
  "alternate_version",
  "compilation",
  "related",
]);

export var catalogCreditDepartmentEnum = pgEnum("catalog_credit_department", [
  "cast",
  "directing",
  "writing",
  "production",
  "camera",
  "editing",
  "sound",
  "music",
  "art",
  "costume",
  "makeup",
  "visual_effects",
  "stunts",
  "animation",
  "crew",
  "other",
]);

export var catalogCompanyTypeEnum = pgEnum("catalog_company_type", [
  "studio",
  "production_company",
  "distributor",
  "network",
  "streamer",
  "sales_agent",
  "festival",
  "school",
  "collective",
  "other",
]);

export var catalogCompanyRoleEnum = pgEnum("catalog_company_role", [
  "studio",
  "production",
  "distribution",
  "network",
  "streaming",
  "sales",
  "rights_holder",
  "other",
]);

export var catalogAwardOutcomeEnum = pgEnum("catalog_award_outcome", [
  "nominee",
  "winner",
  "honoree",
  "shortlisted",
  "screened",
  "official_selection",
]);

export var catalogMediaTypeEnum = pgEnum("catalog_media_type", [
  "poster",
  "backdrop",
  "still",
  "headshot",
  "logo",
  "trailer",
  "clip",
  "featurette",
  "external_video",
]);

export var catalogMediaSourceEnum = pgEnum("catalog_media_source", [
  "r2",
  "cloudflare_images",
  "external_url",
  "youtube",
  "vimeo",
  "tmdb",
  "imdb",
  "official",
  "other",
]);

export var catalogExternalProviderEnum = pgEnum("catalog_external_provider", [
  "imdb",
  "tmdb",
  "wikidata",
  "letterboxd",
  "thetvdb",
  "official_site",
  "youtube",
  "vimeo",
  "instagram",
  "wikipedia",
  "other",
]);

export var catalogEditSourceEnum = pgEnum("catalog_edit_source", [
  "studio",
  "contribution",
  "import",
  "system",
]);

export var catalogEditStatusEnum = pgEnum("catalog_edit_status", [
  "applied",
  "pending_review",
  "rejected",
  "reverted",
  "superseded",
]);

export var catalogRevisionActionEnum = pgEnum("catalog_revision_action", [
  "create",
  "update",
  "delete",
  "restore",
  "merge",
  "split",
]);

export var catalogRevisionStorageTierEnum = pgEnum("catalog_revision_storage_tier", [
  "hot",
  "archived",
]);

export var catalogIndexJobStatusEnum = pgEnum("catalog_index_job_status", [
  "pending",
  "processing",
  "processed",
  "failed",
]);

export type CatalogTitleFacts = {
  genres?: string[];
  moods?: string[];
  plots?: string[];
  keywords?: string[];
  contentWarnings?: string[];
};

export type CatalogMediaMetadata = {
  width?: number;
  height?: number;
  durationSeconds?: number;
  blurhash?: string;
  variants?: Record<string, string>;
};

export type CatalogRevisionData = Record<string, unknown> | null;
export type CatalogIndexJobPayload = {
  entities: Array<{
    entityType: string;
    entityId: string;
  }>;
  reason: "apply" | "revert" | "merge" | "backfill" | "import";
};

export var catalogTitles = pgTable(
  "catalog_titles",
  {
    id: text("id").primaryKey(),
    legacyFilmId: text("legacy_film_id").references(function () {
      return films.id;
    }, { onDelete: "set null" }),
    type: catalogTitleTypeEnum("type").notNull(),
    lifecycle: catalogTitleLifecycleEnum("lifecycle").default("unknown").notNull(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    primaryTitle: text("primary_title").notNull(),
    originalTitle: text("original_title"),
    sortTitle: text("sort_title").notNull(),
    slug: text("slug").notNull(),
    synopsis: text("synopsis"),
    startYear: integer("start_year"),
    endYear: integer("end_year"),
    releaseDate: text("release_date"),
    runtimeMinutes: integer("runtime_minutes"),
    primaryLanguage: text("primary_language"),
    primaryCountry: text("primary_country"),
    originCountries: text("origin_countries").array().default(sql`'{}'::text[]`).notNull(),
    spokenLanguages: text("spoken_languages").array().default(sql`'{}'::text[]`).notNull(),
    facts: jsonb("facts").$type<CatalogTitleFacts>().default(sql`'{}'::jsonb`).notNull(),
    parentTitleId: text("parent_title_id").references(function (): AnyPgColumn {
      return catalogTitles.id;
    }, { onDelete: "set null" }),
    seasonNumber: integer("season_number"),
    episodeNumber: integer("episode_number"),
    absoluteEpisodeNumber: integer("absolute_episode_number"),
    isAdult: boolean("is_adult").default(false).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedByUserId: uuid("locked_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    mergedIntoTitleId: text("merged_into_title_id").references(function (): AnyPgColumn {
      return catalogTitles.id;
    }, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    updatedByUserId: uuid("updated_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      legacyFilmIdx: uniqueIndex("catalog_titles_legacy_film_idx").on(table.legacyFilmId),
      slugIdx: uniqueIndex("catalog_titles_slug_idx").on(table.slug),
      typeYearIdx: index("catalog_titles_type_year_idx").on(table.type, table.startYear, table.id),
      parentEpisodeIdx: index("catalog_titles_parent_episode_idx").on(
        table.parentTitleId,
        table.seasonNumber,
        table.episodeNumber,
        table.id
      ),
      sortTitleIdx: index("catalog_titles_sort_title_idx").on(table.sortTitle, table.startYear, table.id),
      updatedAtIdx: index("catalog_titles_updated_at_idx").on(table.updatedAt, table.id),
    };
  }
);

export var catalogPeople = pgTable(
  "catalog_people",
  {
    id: text("id").primaryKey(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    primaryName: text("primary_name").notNull(),
    sortName: text("sort_name").notNull(),
    slug: text("slug").notNull(),
    biography: text("biography"),
    birthDate: text("birth_date"),
    deathDate: text("death_date"),
    birthPlace: text("birth_place"),
    deathPlace: text("death_place"),
    primaryProfessions: text("primary_professions").array().default(sql`'{}'::text[]`).notNull(),
    gender: text("gender"),
    isVerified: boolean("is_verified").default(false).notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedByUserId: uuid("locked_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    mergedIntoPersonId: text("merged_into_person_id").references(function (): AnyPgColumn {
      return catalogPeople.id;
    }, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    updatedByUserId: uuid("updated_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      slugIdx: uniqueIndex("catalog_people_slug_idx").on(table.slug),
      sortNameIdx: index("catalog_people_sort_name_idx").on(table.sortName, table.id),
      updatedAtIdx: index("catalog_people_updated_at_idx").on(table.updatedAt, table.id),
    };
  }
);

export var catalogCompanies = pgTable(
  "catalog_companies",
  {
    id: text("id").primaryKey(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    type: catalogCompanyTypeEnum("type").default("other").notNull(),
    name: text("name").notNull(),
    sortName: text("sort_name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    country: text("country"),
    foundedYear: integer("founded_year"),
    dissolvedYear: integer("dissolved_year"),
    officialUrl: text("official_url"),
    isVerified: boolean("is_verified").default(false).notNull(),
    mergedIntoCompanyId: text("merged_into_company_id").references(function (): AnyPgColumn {
      return catalogCompanies.id;
    }, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    updatedByUserId: uuid("updated_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      slugIdx: uniqueIndex("catalog_companies_slug_idx").on(table.slug),
      typeSortIdx: index("catalog_companies_type_sort_idx").on(table.type, table.sortName, table.id),
      updatedAtIdx: index("catalog_companies_updated_at_idx").on(table.updatedAt, table.id),
    };
  }
);

export var catalogTitleRelations = pgTable(
  "catalog_title_relations",
  {
    id: text("id").primaryKey(),
    fromTitleId: text("from_title_id")
      .notNull()
      .references(function () {
        return catalogTitles.id;
      }, { onDelete: "cascade" }),
    toTitleId: text("to_title_id")
      .notNull()
      .references(function () {
        return catalogTitles.id;
      }, { onDelete: "cascade" }),
    type: catalogRelationTypeEnum("type").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      uniqueRelationIdx: uniqueIndex("catalog_title_relations_unique_idx").on(
        table.fromTitleId,
        table.toTitleId,
        table.type
      ),
      fromTypeIdx: index("catalog_title_relations_from_type_idx").on(table.fromTitleId, table.type, table.sortOrder),
      toTypeIdx: index("catalog_title_relations_to_type_idx").on(table.toTitleId, table.type, table.sortOrder),
    };
  }
);

export var catalogCredits = pgTable(
  "catalog_credits",
  {
    id: text("id").primaryKey(),
    titleId: text("title_id")
      .notNull()
      .references(function () {
        return catalogTitles.id;
      }, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(function () {
        return catalogPeople.id;
      }, { onDelete: "cascade" }),
    department: catalogCreditDepartmentEnum("department").notNull(),
    job: text("job").notNull(),
    characterName: text("character_name"),
    creditedAs: text("credited_as"),
    billingOrder: integer("billing_order").default(0).notNull(),
    episodeCount: integer("episode_count"),
    startYear: integer("start_year"),
    endYear: integer("end_year"),
    notes: text("notes"),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    createdByUserId: uuid("created_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    updatedByUserId: uuid("updated_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      titleDepartmentIdx: index("catalog_credits_title_department_idx").on(
        table.titleId,
        table.department,
        table.billingOrder,
        table.id
      ),
      personTitleIdx: index("catalog_credits_person_title_idx").on(table.personId, table.titleId, table.id),
      dedupeIdx: uniqueIndex("catalog_credits_dedupe_idx").on(
        table.titleId,
        table.personId,
        table.department,
        table.job,
        sql`coalesce(${table.characterName}, '')`
      ),
      updatedAtIdx: index("catalog_credits_updated_at_idx").on(table.updatedAt, table.id),
    };
  }
);

export var catalogTitleCompanies = pgTable(
  "catalog_title_companies",
  {
    id: text("id").primaryKey(),
    titleId: text("title_id")
      .notNull()
      .references(function () {
        return catalogTitles.id;
      }, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(function () {
        return catalogCompanies.id;
      }, { onDelete: "cascade" }),
    role: catalogCompanyRoleEnum("role").notNull(),
    region: text("region"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      titleRoleIdx: index("catalog_title_companies_title_role_idx").on(table.titleId, table.role, table.sortOrder),
      companyRoleIdx: index("catalog_title_companies_company_role_idx").on(table.companyId, table.role, table.titleId),
      dedupeIdx: uniqueIndex("catalog_title_companies_dedupe_idx").on(
        table.titleId,
        table.companyId,
        table.role,
        table.region
      ),
    };
  }
);

export var catalogAwards = pgTable(
  "catalog_awards",
  {
    id: text("id").primaryKey(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    name: text("name").notNull(),
    originalName: text("original_name"),
    slug: text("slug").notNull(),
    description: text("description"),
    officialUrl: text("official_url"),
    country: text("country"),
    firstYear: integer("first_year"),
    lastYear: integer("last_year"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      slugIdx: uniqueIndex("catalog_awards_slug_idx").on(table.slug),
      nameIdx: index("catalog_awards_name_idx").on(table.name, table.id),
    };
  }
);

export var catalogGenres = pgTable(
  "catalog_genres",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    parentGenreId: text("parent_genre_id").references(function (): AnyPgColumn {
      return catalogGenres.id;
    }, { onDelete: "set null" }),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      slugIdx: uniqueIndex("catalog_genres_slug_idx").on(table.slug),
      activeSortIdx: index("catalog_genres_active_sort_idx").on(table.isActive, table.sortOrder, table.name, table.id),
      parentIdx: index("catalog_genres_parent_idx").on(table.parentGenreId, table.sortOrder, table.id),
    };
  }
);

export var catalogTitleGenres = pgTable(
  "catalog_title_genres",
  {
    titleId: text("title_id")
      .notNull()
      .references(function () {
        return catalogTitles.id;
      }, { onDelete: "cascade" }),
    genreId: text("genre_id")
      .notNull()
      .references(function () {
        return catalogGenres.id;
      }, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      titleGenreIdx: uniqueIndex("catalog_title_genres_title_genre_idx").on(table.titleId, table.genreId),
      genreTitleIdx: index("catalog_title_genres_genre_title_idx").on(table.genreId, table.titleId),
      titleSortIdx: index("catalog_title_genres_title_sort_idx").on(table.titleId, table.sortOrder, table.genreId),
    };
  }
);

export var catalogAwardEvents = pgTable(
  "catalog_award_events",
  {
    id: text("id").primaryKey(),
    awardId: text("award_id")
      .notNull()
      .references(function () {
        return catalogAwards.id;
      }, { onDelete: "cascade" }),
    name: text("name").notNull(),
    year: integer("year").notNull(),
    eventDate: text("event_date"),
    location: text("location"),
    officialUrl: text("official_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      awardYearIdx: uniqueIndex("catalog_award_events_award_year_idx").on(table.awardId, table.year),
      yearIdx: index("catalog_award_events_year_idx").on(table.year, table.id),
    };
  }
);

export var catalogAwardNominations = pgTable(
  "catalog_award_nominations",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(function () {
        return catalogAwardEvents.id;
      }, { onDelete: "cascade" }),
    categoryName: text("category_name").notNull(),
    outcome: catalogAwardOutcomeEnum("outcome").notNull(),
    titleId: text("title_id").references(function () {
      return catalogTitles.id;
    }, { onDelete: "cascade" }),
    personId: text("person_id").references(function () {
      return catalogPeople.id;
    }, { onDelete: "cascade" }),
    companyId: text("company_id").references(function () {
      return catalogCompanies.id;
    }, { onDelete: "cascade" }),
    creditedName: text("credited_name"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      eventCategoryIdx: index("catalog_award_nominations_event_category_idx").on(
        table.eventId,
        table.categoryName,
        table.sortOrder
      ),
      titleIdx: index("catalog_award_nominations_title_idx").on(table.titleId, table.eventId),
      personIdx: index("catalog_award_nominations_person_idx").on(table.personId, table.eventId),
      companyIdx: index("catalog_award_nominations_company_idx").on(table.companyId, table.eventId),
      subjectRequired: check(
        "catalog_award_nominations_subject_required",
        sql`${table.titleId} is not null or ${table.personId} is not null or ${table.companyId} is not null`
      ),
    };
  }
);

export var catalogMediaAssets = pgTable(
  "catalog_media_assets",
  {
    id: text("id").primaryKey(),
    entityType: catalogEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    type: catalogMediaTypeEnum("type").notNull(),
    source: catalogMediaSourceEnum("source").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    title: text("title"),
    caption: text("caption"),
    language: text("language"),
    region: text("region"),
    rightsNote: text("rights_note"),
    attribution: text("attribution"),
    metadata: jsonb("metadata").$type<CatalogMediaMetadata>().default(sql`'{}'::jsonb`).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    createdByUserId: uuid("created_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    updatedByUserId: uuid("updated_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      entityTypeIdx: index("catalog_media_assets_entity_type_idx").on(
        table.entityType,
        table.entityId,
        table.type,
        table.sortOrder
      ),
      primaryAssetIdx: index("catalog_media_assets_primary_idx").on(table.entityType, table.entityId, table.isPrimary),
      onePrimaryIdx: uniqueIndex("catalog_media_assets_one_primary_idx")
        .on(table.entityType, table.entityId, table.type)
        .where(sql`${table.isPrimary} = true`),
      updatedAtIdx: index("catalog_media_assets_updated_at_idx").on(table.updatedAt, table.id),
    };
  }
);

export var catalogExternalIds = pgTable(
  "catalog_external_ids",
  {
    id: text("id").primaryKey(),
    entityType: catalogEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    provider: catalogExternalProviderEnum("provider").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      entityProviderIdx: uniqueIndex("catalog_external_ids_entity_provider_idx").on(
        table.entityType,
        table.entityId,
        table.provider,
        table.externalId
      ),
      providerExternalIdx: index("catalog_external_ids_provider_external_idx").on(table.provider, table.externalId),
      entityIdx: index("catalog_external_ids_entity_idx").on(table.entityType, table.entityId),
      onePrimaryIdx: uniqueIndex("catalog_external_ids_one_primary_idx")
        .on(table.entityType, table.entityId, table.provider)
        .where(sql`${table.isPrimary} = true`),
    };
  }
);

export var catalogAliases = pgTable(
  "catalog_aliases",
  {
    id: text("id").primaryKey(),
    entityType: catalogEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    type: catalogAliasTypeEnum("type").notNull(),
    value: text("value").notNull(),
    sortValue: text("sort_value").notNull(),
    language: text("language"),
    region: text("region"),
    attributes: text("attributes").array().default(sql`'{}'::text[]`).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      entityTypeIdx: index("catalog_aliases_entity_type_idx").on(table.entityType, table.entityId, table.type),
      sortValueIdx: index("catalog_aliases_sort_value_idx").on(table.sortValue, table.id),
      dedupeIdx: uniqueIndex("catalog_aliases_dedupe_idx").on(
        table.entityType,
        table.entityId,
        table.type,
        table.value,
        table.language,
        table.region
      ),
    };
  }
);

export var catalogEdits = pgTable(
  "catalog_edits",
  {
    id: text("id").primaryKey(),
    source: catalogEditSourceEnum("source").notNull(),
    status: catalogEditStatusEnum("status").default("applied").notNull(),
    actorUserId: uuid("actor_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    summary: text("summary").notNull(),
    rationale: text("rationale"),
    idempotencyKey: text("idempotency_key"),
    publicVisible: boolean("public_visible").default(true).notNull(),
    revertedByEditId: text("reverted_by_edit_id").references(function (): AnyPgColumn {
      return catalogEdits.id;
    }, { onDelete: "set null" }),
    revertsEditId: text("reverts_edit_id").references(function (): AnyPgColumn {
      return catalogEdits.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      actorCreatedIdx: index("catalog_edits_actor_created_idx").on(table.actorUserId, table.createdAt, table.id),
      statusCreatedIdx: index("catalog_edits_status_created_idx").on(table.status, table.createdAt, table.id),
      pendingReviewIdx: index("catalog_edits_pending_review_idx")
        .on(table.status, table.createdAt, table.id)
        .where(sql`${table.status} = 'pending_review'`),
      sourceCreatedIdx: index("catalog_edits_source_created_idx").on(table.source, table.createdAt, table.id),
      actorIdempotencyIdx: uniqueIndex("catalog_edits_actor_idempotency_idx").on(table.actorUserId, table.idempotencyKey),
    };
  }
);

export var catalogSources = pgTable(
  "catalog_sources",
  {
    id: text("id").primaryKey(),
    editId: text("edit_id").references(function () {
      return catalogEdits.id;
    }, { onDelete: "cascade" }),
    entityType: catalogEntityTypeEnum("entity_type"),
    entityId: text("entity_id"),
    url: text("url").notNull(),
    title: text("title"),
    publisher: text("publisher"),
    accessedAt: timestamp("accessed_at", { withTimezone: true }),
    archiveUrl: text("archive_url"),
    note: text("note"),
    createdByUserId: uuid("created_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      editIdx: index("catalog_sources_edit_idx").on(table.editId, table.id),
      entityIdx: index("catalog_sources_entity_idx").on(table.entityType, table.entityId, table.id),
      urlIdx: index("catalog_sources_url_idx").on(table.url),
    };
  }
);

export var catalogRevisions = pgTable(
  "catalog_revisions",
  {
    id: text("id").primaryKey(),
    editId: text("edit_id")
      .notNull()
      .references(function () {
        return catalogEdits.id;
      }, { onDelete: "cascade" }),
    entityType: catalogEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: catalogRevisionActionEnum("action").notNull(),
    beforeData: jsonb("before_data").$type<CatalogRevisionData>(),
    afterData: jsonb("after_data").$type<CatalogRevisionData>(),
    changedFields: text("changed_fields").array().default(sql`'{}'::text[]`).notNull(),
    storageTier: catalogRevisionStorageTierEnum("storage_tier").default("hot").notNull(),
    archiveObjectKey: text("archive_object_key"),
    archiveSha256: text("archive_sha256"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    publicVisible: boolean("public_visible").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      editIdx: index("catalog_revisions_edit_idx").on(table.editId, table.id),
      entityCreatedIdx: index("catalog_revisions_entity_created_idx").on(
        table.entityType,
        table.entityId,
        table.createdAt,
        table.id
      ),
      actionCreatedIdx: index("catalog_revisions_action_created_idx").on(table.action, table.createdAt, table.id),
    };
  }
);

export var catalogIndexJobs = pgTable(
  "catalog_index_jobs",
  {
    id: text("id").primaryKey(),
    editId: text("edit_id").references(function () {
      return catalogEdits.id;
    }, { onDelete: "set null" }),
    status: catalogIndexJobStatusEnum("status").default("pending").notNull(),
    payload: jsonb("payload").$type<CatalogIndexJobPayload>().notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    lastError: text("last_error"),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      unprocessedIdx: index("catalog_index_jobs_unprocessed_idx")
        .on(table.createdAt, table.id)
        .where(sql`${table.processedAt} is null`),
      statusAvailableIdx: index("catalog_index_jobs_status_available_idx").on(
        table.status,
        table.availableAt,
        table.id
      ),
      editIdx: index("catalog_index_jobs_edit_idx").on(table.editId, table.id),
    };
  }
);
