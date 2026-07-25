# NSFW Content Classification V1

> Frozen Stage 1 contract. Last updated: 2026-07-25.

## Scope

NSFW classification answers whether a post, comment, or post image depicts
sensitive material. It is not a policy-violation decision. It never changes
`moderation_status`, creates `moderation_actions`, or excludes content from a
read path.

Categories:

`nudity | sexual_content | violence | graphic_content | sensitive`

Status:

`none | pending | flagged`

Source:

`author | system`

## Storage

`posts` and `comments` carry denormalized `nsfw_status`,
`nsfw_categories`, `nsfw_source`, and `nsfw_scanned_at`. Partial indexes cover
only pending rows in `(nsfw_status, created_at, id)` order.

Post media JSON may carry `nsfw` and `nsfwCategories`. It remains in the
bounded existing JSONB array; no media-label table exists.

## Writers

- Author create input accepts only `authorNsfwCategories`.
- An author category is written synchronously with the content row.
- `nsfw.scan` runs after create when text or media exists.
- System scans union categories and never remove an author-set category.
- A `nudity_sexual_content` report against a `none` post/comment only queues a
  higher-priority re-scan. It never writes NSFW state directly.

## Read Contract

Feed and comment DTOs expose `{ status, categories, source }` from the already
selected row. Flagged and pending content remains queryable. No NSFW predicate
may be added to visibility, block, mute, deletion, or moderation enforcement.

## Scale

Creates add no extra write round trip. Scans are asynchronous, direct,
idempotent row updates. Pending poll indexes are partial. Reads use existing
selected columns and add no query, join, count, or cache check.
