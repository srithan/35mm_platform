# Content Moderation API Reference

Base path: `/v1`

Errors use:

```json
{ "code": "ERROR_CODE", "message": "Human readable message" }
```

All lists use opaque keyset cursors and `{ "items": [], "nextCursor": null, "hasMore": false }`. No endpoint uses `OFFSET`.

## File Report

`POST /v1/reports`

Requires Clerk bearer auth. Rate limit: 20/hour/user.

```json
{
  "contentType": "post",
  "contentId": "00000000-0000-4000-8000-000000000001",
  "reason": "harassment",
  "details": "Optional context, maximum 2000 characters"
}
```

Response, new or unresolved duplicate:

```json
{
  "report": {
    "id": "01J...",
    "contentType": "post",
    "contentId": "00000000-0000-4000-8000-000000000001",
    "reason": "harassment",
    "details": "Optional context, maximum 2000 characters",
    "status": "open",
    "createdAt": "2026-07-11T00:00:00.000Z",
    "updatedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

Status codes:

- `201`: new report.
- `200`: existing unresolved report returned.
- `400`: invalid body/content ID/details.
- `401`: unauthenticated.
- `404`: target missing or soft-deleted.
- `429`: report rate limit exceeded.
- `503`: rate-limit or queue dependency unavailable; report enqueue retry is deduped.

Server ignores any client snapshot field.

## My Reports

`GET /v1/me/reports?cursor=&limit=`

Requires auth. Returns only caller's reports. Snapshots and reporter identity are absent.

## Moderation Queue

`GET /v1/admin/moderation/queue?status=&contentType=&reason=&cursor=&limit=`

Requires moderation role. Queue item includes target, most recent snapshot, report count, reason breakdown, moderation state, author summary, and strike count.

Supported `contentType`: `post | comment | profile`.

## Content Detail

`GET /v1/admin/moderation/content/:contentType/:contentId`

Requires moderation role.

Optional independent cursors:

- `reportsCursor`, `reportsLimit`
- `actionsCursor`, `actionsLimit`
- `strikeCursor`, `strikeLimit`

Reporter identity and internal staff notes appear only on this staff endpoint.

## Apply Action

`POST /v1/admin/moderation/content/:contentType/:contentId/action`

Requires moderation role and `Idempotency-Key` header, 8–120 characters. Rate limit: 60 moderation mutations/minute/user.

```json
{
  "action": "content_removed",
  "reason": "Targeted harassment",
  "notes": "Internal evidence summary",
  "metadata": {}
}
```

Response:

```json
{
  "action": {
    "id": "01J...",
    "reportId": "01J...",
    "contentType": "post",
    "contentId": "00000000-0000-4000-8000-000000000001",
    "actorType": "staff",
    "actorUserId": "00000000-0000-4000-8000-000000000010",
    "action": "content_removed",
    "reason": "Targeted harassment",
    "notes": "Internal evidence summary",
    "metadata": {},
    "createdAt": "2026-07-11T00:00:00.000Z"
  }
}
```

Status codes:

- `200`: action committed or matching idempotency retry.
- `400`: invalid target/action/body/key.
- `401`: unauthenticated.
- `403`: missing moderation role or unauthorized cross-staff reversal.
- `404`: target missing.
- `409`: key reused with different payload, invalid reversal, or lock contention.
- `429`: rate limited.
- `503`: committed enforcement cache synchronization needs idempotent retry.

## Dismiss

`POST /v1/admin/moderation/content/:contentType/:contentId/dismiss`

Requires moderation role and `Idempotency-Key`.

```json
{ "notes": "No violation under policy" }
```

Writes append-only `no_action`, resolves open/reviewing reports as `dismissed`, and queues reporter updates. If target was hidden solely by automatic threshold action, dismissal restores visible state.

## User Strike History

`GET /v1/admin/moderation/users/:userId/strikes?cursor=&limit=`

Requires moderation role. Returns cursor-paginated subject action history across posts, comments, and profile.

## Roles

- `moderation`: review, enforce, dismiss, reverse own/system content enforcement.
- `moderation_admin`: same, plus reverse another staff actor's content enforcement.
- `owner | admin`: moderation-admin authority.

## Notification Contract

Notification API remains `GET /v1/me/notifications`.

Moderation item metadata:

```json
{
  "type": "report_status_update",
  "metadata": { "outcome": "actioned" }
}
```

```json
{
  "type": "content_moderated",
  "metadata": {
    "contentType": "post",
    "action": "content_removed",
    "reason": "Targeted harassment"
  }
}
```

```json
{
  "type": "content_under_review",
  "metadata": { "contentType": "post", "status": "hidden" }
}
```

No moderation notification exposes reporter identity.
