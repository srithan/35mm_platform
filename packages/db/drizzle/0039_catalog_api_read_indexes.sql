CREATE INDEX IF NOT EXISTS "catalog_companies_sort_name_idx"
  ON "catalog_companies" ("sort_name", "id");

CREATE INDEX IF NOT EXISTS "catalog_title_relations_from_sort_idx"
  ON "catalog_title_relations" ("from_title_id", "sort_order", "id");

CREATE INDEX IF NOT EXISTS "catalog_aliases_entity_sort_idx"
  ON "catalog_aliases" ("entity_type", "entity_id", "sort_value", "id");
