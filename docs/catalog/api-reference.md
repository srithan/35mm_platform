# Catalog API Reference

Base path: `/v1/catalog`

Public reads return active current-state catalog entities by default. Detail reads also allow `status = "merged"` and return canonical target metadata from flattened merge pointers. All list endpoints use opaque base64url cursors, `limit + 1`, and no `OFFSET`. Public GET payloads are Redis-cached for 45 seconds under normalized path/query keys and invalidated after applied catalog mutations, reverts, and merges.

Mutation endpoints require Clerk bearer auth, `Idempotency-Key` header or body `idempotencyKey`, and shared Zod validation. Public/studio writes are rate-limited by authenticated user. REST routes derive source server-side:

- Clerk Studio role `owner`, `admin`, `catalog`, `catalog_admin`, or `catalog_editor` stages as `source = "studio"`.
- Other authenticated users stage as `source = "contribution"`.
- Client-supplied `source` is ignored. `system` and `import` remain helper/backfill paths.

## Read Endpoints

Titles:

- `GET /v1/catalog/titles/:id`
- `GET /v1/catalog/titles?query=&cursor=&limit=&type=&year=&externalProvider=&externalId=`
- `GET /v1/catalog/titles/:id/credits?cursor=&limit=&department=`
- `GET /v1/catalog/titles/:id/media?cursor=&limit=&type=`
- `GET /v1/catalog/titles/:id/external-ids`
- `GET /v1/catalog/titles/:id/aliases?cursor=&limit=`
- `GET /v1/catalog/titles/:id/relations?cursor=&limit=`
- `GET /v1/catalog/titles/:id/awards?cursor=&limit=`
- `GET /v1/catalog/titles/:id/history?cursor=&limit=`

People:

- `GET /v1/catalog/people/:id`
- `GET /v1/catalog/people?query=&cursor=&limit=`
- `GET /v1/catalog/people/:id/credits?cursor=&limit=&department=`
- `GET /v1/catalog/people/:id/media?cursor=&limit=&type=`
- `GET /v1/catalog/people/:id/external-ids`
- `GET /v1/catalog/people/:id/aliases?cursor=&limit=`
- `GET /v1/catalog/people/:id/history?cursor=&limit=`

Companies:

- `GET /v1/catalog/companies/:id`
- `GET /v1/catalog/companies?query=&cursor=&limit=`
- `GET /v1/catalog/companies/:id/titles?cursor=&limit=&role=`
- `GET /v1/catalog/companies/:id/external-ids`
- `GET /v1/catalog/companies/:id/history?cursor=&limit=`

Search is DB-backed against indexed `sort_title` / `sort_name` prefix ranges. Meilisearch document writes and relevance ranking are still not wired.

## Mutation Response

Stage endpoints return:

```json
{
  "edit": {
    "id": "01J...",
    "status": "pending_review",
    "source": "contribution",
    "summary": "Update synopsis",
    "publicVisible": true,
    "createdAt": "2026-07-07T00:00:00.000Z",
    "updatedAt": "2026-07-07T00:00:00.000Z"
  },
  "outcome": "created"
}
```

Status codes:

- `201`: new pending or inline-applied edit.
- `200`: idempotency retry returning `outcome = "existing"`.
- `400`: malformed payload rejected before transaction.
- `401`: missing/invalid bearer token.
- `403`: workflow action without Studio catalog write access.
- `409`: lock timeout, invalid status transition, or write conflict.
- `429`: rate limited.

Workflow endpoints return `{ "edit": CatalogEditDto }` with no `outcome` wrapper.

## Stage Entities

Each entity supports `POST`, `PATCH /:id`, and `DELETE /:id` through the shared stage/apply helper:

- `/v1/catalog/titles`
- `/v1/catalog/people`
- `/v1/catalog/credits`
- `/v1/catalog/media`
- `/v1/catalog/external-ids`
- `/v1/catalog/aliases`
- `/v1/catalog/title-relations`
- `/v1/catalog/title-companies`
- `/v1/catalog/title-genres`
- `/v1/catalog/companies`
- `/v1/catalog/awards`
- `/v1/catalog/award-events`
- `/v1/catalog/award-nominations`

Bodies may use full `operations[]` or single-entity `{ action, data, summary, sources }`. `PATCH /:id` forces `action = "update"` and route `:id`; `DELETE /:id` forces `action = "delete"` and route `:id`.

`/v1/catalog/title-genres` is first-class in the mutation/revision model through `catalog_entity_type = "title_genre"` and `catalog_title_genres.id`.

## Merge

`POST /v1/catalog/merge`

Requires Studio catalog write access. Body: `entityType`, `duplicateEntityId`, `canonicalEntityId`, `summary`, optional `rationale`, `publicVisible`, and `sources`. Server forces `source = "studio"` and actor from auth.

## Moderation

- `GET /v1/catalog/edits?status=&entityType=&entityId=&source=&cursor=&limit=`
- `GET /v1/catalog/edits/:id`
- `POST /v1/catalog/edits/:id/approve`
- `POST /v1/catalog/edits/:id/reject`
- `POST /v1/catalog/edits/:id/revert`

All require Studio catalog write access. Queue pagination is `(created_at, id)` descending. Entity filters use `catalog_revisions`.

## History

History endpoints return public revisions/edits only:

```json
{
  "items": [],
  "nextCursor": null,
  "hasMore": false
}
```

Cursor shape is opaque base64url JSON over revision `(createdAt, id)`, matching `catalog_revisions_entity_created_idx`.
