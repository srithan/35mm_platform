# Moderation Frontend Implementation

Status as of 2026-07-11. Tracks the client work built on top of the moderation
backend (see `api-reference.md`, `implementation.md`, `spec.md`).

## Scope summary

| Area | App | Status |
|---|---|---|
| Report flow (reason → context → confirmation) | `apps/web` | Done |
| My Reports page | `apps/web` | Done |
| Moderation notification copy + icons | `apps/web` | Done |
| Studio moderation queue list | `apps/studio` | Done |
| Studio content detail + action panel | `apps/studio` | Done |

Explicitly out of scope (unchanged): iOS app, chat-message reporting,
auto-classification UI, building new report entry points.

---

## Part A — `apps/web` (complete)

### 1. Report flow

Replaced the old confirm/cancel report modal with a multi-step flow. Entry
points (post/comment/profile overflow menus) are unchanged; only what fires
after tapping "Report" changed.

Feature folder: `apps/web/features/moderation/`

- `data/reportReasons.ts`
  - `REPORT_REASONS`: 10 reasons with human labels + descriptions + lucide
    icons. `value` maps 1:1 to `moderationReportReasonSchema` in
    `@35mm/validators` (`spam`, `harassment`, `hate_speech`, `violence`,
    `nudity_sexual_content`, `misinformation`, `self_harm`, `impersonation`,
    `intellectual_property`, `other`).
  - `REPORT_DETAILS_MAX = 2000` (matches `createReportSchema.details`).
  - `reasonLabel(reason)` helper.
- `api/reportsApi.ts`
  - `submitReport(input, token)` → `POST /v1/reports`. Uses a direct `fetch`
    (not the shared `apiRequest`) specifically to read the HTTP status, so it
    can return `{ report, alreadyReported }` where `alreadyReported` is
    `res.status === 200` (existing unresolved report) vs `201` (new). Throws the
    shared `ApiRequestError` on failure.
  - `fetchMyReports({ cursor, limit, token })` → `GET /v1/me/reports` via shared
    `apiRequest`.
  - Local `CreateReportInput` type (avoids pulling zod inference from validators
    into the client bundle).
- `hooks/queryKeys.ts` — `moderationKeys.myReports()`.
- `hooks/useReportContent.ts` — mutation wrapping `submitReport`; invalidates
  `moderationKeys.myReports()` on success.
- `components/ReportFlow.tsx` — orchestrator on top of the shared `Modal`
  primitive (`variant="centered"`, animated; focus-trap, Esc, backdrop, scroll
  lock inherited). Owns step state (`reason | context | done`), slide direction,
  reason, details, error message, `alreadyReported`.
  - Reason select auto-advances after `ADVANCE_DELAY_MS` (190ms) so the row's
    selected state registers first.
  - Back from context → reason preserves the selection.
  - Submit maps error codes: `429`, `404`, `401`, `503`, network(0), else
    generic; non-duplicate errors keep the user on the context step to retry.
  - Confirmation auto-dismisses after `AUTO_CLOSE_MS` (2800ms) or on Done/Esc.
  - Step transitions mirror the onboarding pattern (`AnimatePresence
    mode="wait"`, direction-based x-slide, `duration 0.22 easeOut`).
- `components/steps/ReasonStep.tsx` — a single grouped bordered list (not
  per-row cards) with divided, compact, label-only rows; icon + chevron/​check;
  selected row fills `bg-sunken`, icon → `accent`, spring check-in;
  `whileTap` press. (Redesigned from an initial chunky-card version that was too
  tall.)
- `components/steps/ContextStep.tsx` — optional textarea capped at
  `REPORT_DETAILS_MAX`; character counter is hidden until within 200 of the cap,
  turns `warning` at 0; submit button shows a spinner loading state; inline
  themed error banner.
- `components/steps/ConfirmationStep.tsx` — success payoff: spring-scaled circle
  + check, copy differs for `alreadyReported`.

Wiring / removed stubs:

- Post: `apps/web/features/feed/components/PostCard/PostCardOverlays.tsx` — the
  old report `ConfirmDialog` (with `// TODO: wire to actual report API`) was
  replaced by `<ReportFlow contentType="post" contentId={postId} …>`. `open` is
  gated on `Boolean(postId)`.
- Comment: the report menu item in
  `CommentCard/CommentCardMoreMenu.tsx` previously had **no** `onSelect` (dead).
  Added `onReportRequest` prop threaded menu → `CommentCard.tsx`
  (`showReportConfirm` state) → `CommentCardOverlays.tsx` →
  `<ReportFlow contentType="comment" contentId={commentId} …>`.
- Profile: `profile/components/ProfileHeader.tsx` — removed `"report"` from the
  `confirmAction` union / `confirmConfig` / danger-variant expression; the menu
  item now opens `<ReportFlow contentType="profile" contentId={userId}
  targetLabel={`@${username}`} …>`. Block/mute/delete confirms untouched.

### 2. My Reports page

- Route constant: `SETTINGS_PRIVACY_REPORTS = "/settings/privacy/reports"` in
  `apps/web/lib/constants/routes.ts`.
- Page: `apps/web/app/(shell)/settings/privacy/reports/page.tsx` →
  `<SettingsContent initialTab="Privacy" privacyList="reports" />` (same thin
  wrapper pattern as blocked/muted).
- Entry link: added a "Your reports" `SettingsRow` in
  `settings/components/SettingsPrivacyPanel.tsx` under Account controls.
- `settings/components/SettingsContent.tsx`: widened `privacyList` to
  `PrivacyListKind = "blocked" | "muted" | "reports"`, added the "Your reports"
  label, and branches to `<MyReportsPanel />`.
- `features/moderation/components/MyReportsPanel.tsx`: `useInfiniteQuery` over
  `fetchMyReports` (cursor-paginated, limit 20), mirroring
  `SettingsModerationListPanel` (loading / error-retry / empty / load-more).
  Rows show content-type icon, reason label, "· Reported {relative time}",
  optional quoted details, and a status pill. Status enum → copy:
  - `open` → "Submitted for review"
  - `reviewing` → "Under review"
  - `actioned` → "Action taken" (success tint)
  - `dismissed` → "No violation found" (faint)
- Each history row links to `/settings/privacy/reports/:reportId`.
- `MyReportDetailPanel.tsx` calls `GET /v1/me/reports/:reportId` and presents the
  outcome as a plain-language safety-team update, then shows the captured social
  object and the reporter's reason/note. Stored rich post/comment documents reuse
  `RichTextRenderer`, so users see formatted content rather than persistence JSON.
  Post snapshots reuse `PostCardHeader`; comment snapshots reuse
  `CommentCardHeader`. Both show captured author identity/avatar and original
  posting time while remaining read-only (no interaction/action bars on an
  immutable moderation snapshot).
  Profile snapshots render a read-only profile card with avatar, display name,
  username, bio, posts/followers/following counts, and joined month/year.
  The surface avoids audit-log vocabulary, duplicate status badges, and nested
  metadata cards; snapshot copy simply says this is how the content appeared when
  reported.

### 3. Moderation notifications

Reused the existing Ably/notifications pipeline; no new surface.

- Copy for `report_status_update | content_moderated | content_under_review`
  already existed (`NotificationsContent.activityText` and
  `SiteHeader/notificationUtils.formatNotificationText`) from the backend PR —
  left as-is.
- `report_status_update` destinations use `metadata.reportId` to open the exact
  report detail. Legacy rows without this metadata are enriched by the API from
  their durable moderation source key; if neither exists, navigation safely falls
  back to the caller's report history.
- Icons (were missing / placeholder):
  - Full-page list: `NotificationItem.tsx` gained an optional `icon` slot;
    `NotificationsContent.moderationIconBadge()` renders a themed 38px badge for
    the three system (actorless) types — `content_moderated` → `ShieldAlert`
    (warning tint), `content_under_review` → `Eye` (neutral),
    `report_status_update` actioned → `ShieldCheck` (success) / else `Shield`
    (neutral). Threaded via a local `icon?: ReactNode` on the record.
  - Header dropdown: `NotificationDropdown.NOTIF_KIND_ICON` had all three mapped
    to placeholder `MessageCircle`; now `Shield` / `ShieldAlert` / `Eye`.
  - Known minor: the dropdown still renders an actor `Avatar` beside the glyph
    for these system types; the glyph carries meaning. Left intentionally.

### Theming rules followed

No hardcoded colors anywhere in the new UI. Only theme tokens (`bg`, `elevated`,
`sunken`, `hover`, `fg`/`fg-muted`/`fg-faint`, `border`/`border-strong`,
`accent`, `success`, `warning`) plus `color-mix(in srgb, var(--color-success | --color-warning | --elevated | --border) …)`
for tints. Verified every one of the six themes (light, dark, matinee, matrix,
oppenheimer-bw, barbie) defines `--color-success` and `--color-warning`, so all
tints resolve.

Token gap flagged: there is no semantic `--color-danger` / destructive token
(`ConfirmDialog` hardcodes `#ba181b` as pre-existing debt). Not needed here — the
report flow uses subtle selection feedback and `--color-warning` for the error
state. If destructive-tinted reason rows are ever wanted, add a `--color-danger`
token per theme rather than hardcoding.

### Verification

`tsc --noEmit` on `@35mm/web` is clean for all new/edited files (only stale
`.next/types/*.d 3.ts` iCloud-conflict duplicates report errors, unrelated).
No lint errors.

---

## Part B — `apps/studio` (complete)

Built on Studio's existing shadcn/base-ui component set + Clerk role gating.
All UI uses Studio design tokens (no hardcoded colors), cursor pagination only,
and idempotent mutations. The role gate is UX-only; the Hono API enforces the
`moderation` / `moderation_admin` role on every endpoint, and `proxy.ts`
middleware redirects unauthorized roles server-side.

### Role + nav

- `lib/auth/accessControl.ts`: added `moderation_admin` Studio role and a
  `moderation:admin` permission. `normalizeStudioRole` maps
  `moderation_admin` / `moderator_admin` / `trust_safety_admin`. Both
  `moderation` and `moderation_admin` (plus `owner`/`admin`) hold
  `moderation:view`.
- `lib/data/admin.ts`: moved Moderation into its own top-level nav group
  (`Review queue` → `/moderation`, `ShieldAlert` icon) and removed the old mock
  `moderationQueue` / `ModerationItem`. Nav entries hide when the role lacks the
  permission (`filterAdminNavGroups`).

### Platform client

- `lib/studio/platformClient.ts`: shared `resolvePlatformApiUrl()` (absolute
  `NEXT_PUBLIC_API_URL` → local Hono on :3001 → same-origin `/api/platform`
  proxy that reads `PLATFORM_API_URL` server-side), plus `platformRequest` and
  `PlatformApiError`. `lib/catalog/api.ts` now reuses the resolver, so catalog
  and moderation share one proxy contract.
- `lib/moderation/api.ts`: typed client — `listModerationQueue`,
  `getModerationContentDetail` (independent `reportCursor`/`actionCursor`/
  `strikeCursor` + shared `limit`), `applyModerationAction`,
  `dismissModerationContent`, and `newModerationIdempotencyKey` (fresh 8–120 char
  key per attempt, reused on `503` retry).

### Queue (`/moderation`)

- `hooks/useModerationQueue.ts` + `hooks/useModerationQueueFilters.ts`
  (URL-backed status/contentType/reason via `nuqs` `useQueryStates`; nuqs is the
  monorepo's sanctioned URL-state tool — the catalog title list actually uses a
  Zustand store, so this is a deliberate divergence to satisfy the URL-backed
  requirement). Filters wrapped in a `Suspense` boundary (nuqs `useSearchParams`
  requires it for prerender).
- `components/moderation/ModerationQueueFilters.tsx`,
  `ModerationQueueTable.tsx`: grouped rows (type + snapshot preview, top reasons,
  author + strike badge, report count, status, last reported), row → detail,
  loading skeleton / empty / error states, cursor pagination.

### Detail (`/moderation/:contentType/:contentId`)

- `hooks/useModerationContent.ts`: base detail query + independent load-more for
  reports/actions/strike history + apply/dismiss mutations (idempotency key per
  attempt, `503` auto-retry with the SAME key).
- `components/moderation/ModerationSnapshotCard.tsx`: renders from the most
  recent report snapshot per type (post `body`/`headline`/`media`, comment
  `body` + parent-post link, profile `bio`/`avatar_url`/`username`) — renders
  even when live content is gone. R2/user-media use plain `<img>` (not in
  `next/image` remotePatterns).
- `ModerationReporters.tsx` (staff-only reporter identity + reason + details),
  `ModerationAuthor.tsx` (avatar + strike badge), `ModerationAuditTrail.tsx`
  (read-only chronological actions; reused for content audit trail and author
  strike history), `ModerationBadges.tsx` (report/content status → token-based
  Badge variants).
- `ModerationActionPanel.tsx`: action select (Hide / Remove / Add warning label /
  Warn user / Suspend / Ban / Escalate), required reason + optional notes,
  duration for Suspend (stored in `metadata.durationMinutes`), confirm
  `AlertDialog` for destructive actions (matches `FilmDetail`), and a **distinct
  Dismiss** path.

### Backend-driven divergences from the handoff prompt

- **Detail cursors** are `reportCursor` / `actionCursor` / `strikeCursor` with a
  single `limit` (not `reportsCursor`/`reportsLimit`) — matches the real route.
- **Action payload** is `.strict()` `{action,reason,notes?,metadata}` with no
  top-level `duration`; Suspend duration goes into `metadata.durationMinutes`.
- **"No action" is not an apply action** — `applyModerationAction` returns `409`
  for `no_action` ("use the dismiss endpoint"). The panel therefore exposes the
  seven enforcement actions via Apply and the no-violation path only via the
  distinct Dismiss button.

### Verification

`pnpm --filter @35mm/studio typecheck` and `build` both pass. No lint errors.

---

## Documentation synchronization

The Studio implementation is reflected in `docs/architecture.md`,
`codebase-analysis-docs/CODEBASE_KNOWLEDGE.md`, and this document.
