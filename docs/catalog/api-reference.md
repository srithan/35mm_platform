# Catalog API Reference

Base path: `/v1/catalog`

All mutation endpoints require Clerk bearer auth. Public contribution writes are rate-limited by authenticated user. The REST route derives trust server-side:

- Clerk Studio role `owner`, `admin`, `catalog`, `catalog_admin`, or `catalog_editor` stages as `source = "studio"`.
- Other authenticated users stage as `source = "contribution"`.
- Client-supplied `source` is ignored by public REST mutation endpoints. `system` and `import` are helper/backfill paths, not public-client claims.

## Shared Response

`stageCatalogEdit` endpoints return:

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
- `200`: idempotency retry returning `outcome: "existing"`.
- `400`: malformed payload rejected before transaction.
- `401`: missing/invalid bearer token.
- `403`: trusted source or workflow action without Studio catalog write access.
- `409`: lock timeout, invalid status transition, or write conflict.
- `429`: rate limited.

Workflow endpoints return:

```json
{ "edit": { "id": "01J...", "status": "applied", "source": "studio", "summary": "Fix title", "publicVisible": true, "createdAt": "2026-07-07T00:00:00.000Z", "updatedAt": "2026-07-07T00:00:00.000Z" } }
```

## Stage Title

`POST /v1/catalog/titles`

Body can be a full staged edit:

```json
{
  "source": "contribution",
  "summary": "Update title synopsis",
  "publicVisible": true,
  "operations": [
    {
      "entityType": "title",
      "action": "update",
      "entityId": "01J...",
      "data": { "synopsis": "New synopsis" }
    }
  ],
  "sources": [
    { "url": "https://example.com/interview", "title": "Interview" }
  ]
}
```

or a single-entity convenience body:

```json
{
  "source": "contribution",
  "summary": "Add title",
  "action": "create",
  "data": {
    "type": "movie",
    "primaryTitle": "Example",
    "sortTitle": "example",
    "slug": "example"
  }
}
```

`Idempotency-Key` header is preferred and overrides body `idempotencyKey`.

## Stage Person

`POST /v1/catalog/people`

Single-entity `data` validates person fields: `primaryName`, `sortName`, `slug`, biography, birth/death facts, professions, gender, verification/status.

## Stage Credit

`POST /v1/catalog/credits`

Single-entity `data` validates credit fields: `titleId`, `personId`, department, job, character/credited-as names, billing order, episode scope, notes, status.

## Stage Media

`POST /v1/catalog/media`

Single-entity `data` validates media asset fields: entity ref, media type/source, URL/storage key, title/caption, rights/attribution, metadata, sort order, primary flag, status.

## Approve

`POST /v1/catalog/edits/:id/approve`

Requires Studio catalog write access. Calls `applyCatalogEdit`.

## Reject

`POST /v1/catalog/edits/:id/reject`

Requires Studio catalog write access. Pure status transition from `pending_review` to `rejected`.

## Revert

`POST /v1/catalog/edits/:id/revert`

Requires Studio catalog write access. Valid only for `applied` edits.

## Title History

`GET /v1/catalog/titles/:id/history?limit=20&cursor=...`

Returns cursor-paged public edit history for one title:

```json
{
  "items": [],
  "nextCursor": null,
  "hasMore": false
}
```

Cursor shape is opaque base64 JSON over revision `(createdAt, id)`, matching the existing `catalog_revisions_entity_created_idx` access path. Pagination is cursor-based; no OFFSET is used.
