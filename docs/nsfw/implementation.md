# NSFW Content Classification Implementation

> Stage 1 backend and Stage 2 web presentation completed 2026-07-25.

## Files

- Migration/schema: `packages/db/drizzle/0054_nsfw_content_classification.sql`,
  `packages/db/src/schema/posts.ts`, `packages/db/src/schema/social.ts`.
- Contracts: `packages/types/src/index.ts`,
  `packages/validators/src/index.ts`.
- API: `apps/api/src/modules/feed/routes.ts`,
  `apps/api/src/modules/media/variants.ts`,
  `apps/api/src/modules/moderation/reports.ts`,
  `apps/api/src/lib/jobs.ts`.
- Worker: `apps/worker/src/jobs/nsfwScan.ts`,
  `apps/worker/src/lib/nsfwClassifier.ts`,
  `apps/worker/src/lib/r2.ts`, `apps/worker/src/index.ts`.
- Web contracts/adapters: `apps/web/features/feed/types/feed.ts`,
  `apps/web/features/feed/api/adapters.ts`,
  `apps/web/features/feed/api/postsApi.ts`.
- Web composer: `apps/web/features/feed/lib/nsfwTextHint.ts`,
  `apps/web/features/feed/lib/nsfwImageHint.ts`,
  `apps/web/features/feed/components/PostComposer/ContentWarningControls.tsx`,
  `RichTextEditor.tsx`, and `PostComposer/index.tsx`.
- Web presentation: `apps/web/components/media/NsfwMediaOverlay.tsx`,
  `apps/web/features/feed/components/PostImageGallery.tsx`,
  `apps/web/components/ImageViewer/ImageViewer.tsx`, post-card/detail wiring,
  quoted-post media, and text-only post/comment reveal rows.

## Runtime

Post/comment create writes initial classification columns inside the existing
content transaction. Client-supplied `nsfwStatus` and per-media flags are
stripped; only enum-validated `authorNsfwCategories` is writable.

`nsfw.scan` validates payload, loads one row, skips missing/soft-deleted
content, classifies text and bounded post images, unions categories, updates
matched media items, and performs one optimistic direct update. Concurrent
content/media change rejects that update so BullMQ retries instead of writing
against a stale row. Logs use `[nsfw.scan]` and `[nsfw.report-rescan]`.

Classifier provider:

- `NSFW_CLASSIFIER_URL` — required internal HTTP classifier endpoint.
- `NSFW_CLASSIFIER_TOKEN` — optional bearer token.
- `NSFW_CLASSIFIER_TIMEOUT_MS` — 1–60 seconds, default 15 seconds.
- Text request: JSON `{ "type": "text", "text": "..." }`.
- Image request: multipart fields `type`, `objectKey`, and `image`.
- Response: JSON `{ "categories": [...] }`.

R2 bytes use the same shared S3 client as media processing. Missing provider
configuration fails the job and preserves `pending`; it never silently clears
unscanned content.

## Web Presentation

Rich-text hints run after a 450 ms debounce and staged images run through a
lazy-loaded, bundled NSFWJS MobileNetV2 model. One model promise and one
classification promise per `File` are reused for the page session. Hints never
block publishing and never upload local media. The composer sends
`authorNsfwCategories` only when at least one enum-backed checkbox is selected.
At rest, the category controls are absent from the composer body: one compact
`CW` toolbar action opens the panel and carries the selected-category count.
A new text or image advisory also opens the same panel; dismissing it prevents
the unchanged advisory from repeatedly reopening it.

Feed galleries derive presentation independently per image. Pending posts
screen every image; completed scans screen only JSONB media items carrying
`nsfw: true`. Reveal state is local to the mounted post card and the same index
set is passed into `ImageViewer`, so zooming a revealed image does not screen it
again. Text-only flagged/pending posts and comments use a collapsed disclosure
row. All screening surfaces use existing theme tokens and `color-mix`.

## Scale Assumptions

At 1M+ DAU, write volume tracks content creation. Each job performs one
primary-key row read, at most nine bounded image calls, and one primary-key
update. Read payloads add only columns already present on feed/comment rows.
No counter, fanout, outbox, live aggregate, N+1 query, or full-table NSFW index
is added.

The web hint cost is borne only by users who stage images. TensorFlow/NSFWJS is
code-split away from the initial composer path, the model is loaded once per
page session, and files are classified sequentially to bound peak browser
memory. Feed reads and renders add no request, cache, query, or aggregate.

## Deviations

- Comments schema lives in `packages/db/src/schema/social.ts`; repository has
  no `schema/comments.ts`.
- Studio override was optional and is not included in Stage 1. No admin route
  or Studio frontend file was added.
- Classifier is a production HTTP adapter, not a silent empty-result stub.
  This preserves truthful `pending` state when no provider is configured.
- Existing API job code has no common job-payload union; the implementation
  adds the exported payload type, queue name, producer, and worker dispatch
  without inventing a parallel union.
- Comments have no media field in the current schema/API/DTO. Stage 2 therefore
  implements comment text disclosure, but there is no comment-media overlay to
  wire. Adding comment attachments would require an explicitly approved
  schema/API scope expansion.
- Video classification/presentation is not part of the Stage 1 per-media image
  contract; post video rendering is unchanged.
