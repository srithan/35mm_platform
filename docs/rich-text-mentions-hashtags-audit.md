# Rich Text, Mentions, Hashtags Audit

Date: 2026-06-20

## Hashtags

- Detection: updated render-time parser uses unicode hashtag characters via `[\u00C0-\u1FFF\u2C00-\uD7FF\w]`, so Hindi/Tamil/Telugu-range scripts are supported better than ASCII-only `#\w+`.
- Display vs identity: display preserves original case; route identity normalizes to lowercase before calling `ROUTES.DISCOVER_TAG`.
- Links: hashtags render as links to `ROUTES.DISCOVER_TAG(tag)`, which currently maps to discover hashtag search.
- False positives: URL tokens are parsed first, and hashtags require a whitespace/open-bracket/start boundary, so URL fragments and mid-token hashes are avoided.
- Extraction/storage gap: hashtags are still render-time only. There are no `hashtags`, `post_hashtags`, or `comment_hashtags` tables yet, so search/trending/counts cannot be efficient or authoritative.
- Counts gap: no hashtag count pipeline exists. When added, counts should follow the existing async denormalized counter pattern, not live `COUNT()`.
- Length/dictionary restriction: no dictionary restriction exists. Length is only bounded indirectly by post/comment visible text limits.

## Mentions

- Composer: Tiptap mention atoms store stable user IDs plus username fallback labels.
- Autocomplete: `/v1/profiles/search` supports case-insensitive partial username/display-name lookup, caps results at 8, and prioritizes followed users.
- Accessibility: editor uses combobox semantics; suggestion popup uses listbox/option roles with keyboard support for Up/Down, Enter/Tab, Escape, and mouse selection.
- Storage: mentions are not stored as plain `@username`; rich documents store the mentioned user ID in the mention atom.
- Rendering: mentions render as profile links. Server hydrates mention labels from current usernames before returning posts/comments, so username changes remain correct.
- Deleted/deactivated users: hydration marks inactive/missing users as deleted; renderer falls back to plain muted text.
- Notifications: notification type `mention` already exists. Post/comment creation now creates mention notifications and skips self-mentions.
- Join-table gap: no `post_mentions` / `comment_mentions` table exists yet. Inline rich JSON is enough for display + notification, but not ideal for analytics or reverse lookup.

## Rich Formatting

- Root cause fixed: toolbar no longer inserts markdown markers. Bold/italic/underline/spoiler toggle editor marks through Tiptap.
- Composer: author sees real formatting live. Spoiler text is visible to author with shaded/dashed styling.
- Renderer: read-only post/comment bodies render Tiptap JSON without `dangerouslySetInnerHTML`.
- Spoilers: read mode obscures spoiler spans by default; click/tap reveals.
- Storage: rich post/comment bodies use `__35MM_RICH_TEXT_V1__` + Tiptap JSON in existing `body` text fields. Legacy plain text remains supported.
- Compatibility: old raw markdown-style bold/italic/underline/spoiler markers get a read-only renderer fallback so markers are not shown as literal syntax. No automatic data migration was added; existing affected-content volume was not measured in this code change.
- DB/API: comment DB check was raised to 20,000 raw chars; API still enforces 1,000 visible chars for comments.

## Handoff — Mention Autocomplete & Notifications

### Claim History

- Round 1 reported mention autocomplete UI and mention notifications as implemented. That was wrong: neither actually worked when checked.
- Round 2 reported both as fixed based on unit tests (extraction logic, dedup, self-skip) and interaction tests. The user confirmed neither actually works in the running app. The interaction tests passing did not mean the real UI or notification path worked.
- Plainly: a passing test suite has not been reliable evidence for mention autocomplete or mention notifications across two rounds.

### Current Ground Truth

- Running app behavior has not been personally reverified in a browser after Round 2. Do not assume the code works because tests pass.
- Post composer: current real behavior when typing `@` is unknown from direct browser verification in this session. User says it does not work in the running app.
- Comment editor: current real behavior when typing `@` is unknown from direct browser verification in this session. User says it does not work in the running app.
- Mention notifications: no real DB query or notifications API call has verified that a post/comment mention creates a retrievable `mention` notification row. Only unit-level extraction/self-skip tests were added.
- Verification was blocked because `DATABASE_URL` was missing from this environment. Last checked with `node -e 'console.log(process.env.DATABASE_URL ? "DATABASE_URL_PRESENT" : "DATABASE_URL_MISSING")'`, result was `DATABASE_URL_MISSING`.
- Treat notification creation as unverified until tested against a real DB/API path.

### File Map

- Tiptap mention extension / suggestion config: `apps/web/features/feed/components/PostComposer/RichTextEditor.tsx`
  - `UserMention = Mention.extend(...)` defines stored attrs.
  - `createMentionSuggestion(...)` configures `char: "@"`, query, popup DOM, keyboard handling, and insert command.
- Autocomplete popup component: no React popup component exists. Popup is built imperatively inside `createMentionSuggestion(...).render()` in `RichTextEditor.tsx`, appended to `document.body`.
- PostComposer mount path: `apps/web/features/feed/components/PostComposer/index.tsx` renders `RichTextEditor` for write/discussion/log text fields.
- Comment editor mount paths:
  - Root comment editor: `apps/web/features/feed/components/CommentSection.tsx`
  - Nested reply editor: `apps/web/features/feed/components/CommentCard/CommentCardReplyComposer.tsx`
  - Comment edit editor: `apps/web/features/feed/components/CommentCard/CommentCardBody.tsx`
- Profile search endpoint: `apps/api/src/modules/profiles/routes.ts`, route `profileRoutes.get("/search", requireAuth, ...)`, mounted under `/v1/profiles/search`.
- Client mention search API: `apps/web/features/feed/api/mentionsApi.ts`, `searchMentionSuggestions(...)`.
- Server mention extraction on create: `apps/api/src/modules/feed/routes.ts`
  - `createMentionNotifications(...)`
  - `mentionNotificationRecipientIds(...)`
  - post create path calls it after post insert.
  - comment create path calls it after comment insert.
- Notification creation/dispatch path:
  - `apps/api/src/lib/notifications.ts`, `createNotification(...)`
  - `shouldBundle(...)` excludes `mention`, so mentions should not bundle.
  - Publish enqueue path is `enqueueNotificationPublishJob(...)` from `apps/api/src/lib/jobs.ts`.
  - Retrieval API is `apps/api/src/modules/notifications/routes.ts`, `notificationsRoutes.get("/me/notifications", ...)`.
  - Any 10/50/100/500 threshold behavior is not visible in the inspected `createNotification(...)` path; search this separately before assuming it applies to mentions.
- Autocomplete interaction tests:
  - `apps/web/features/feed/components/PostComposer/PostComposer.test.tsx`
  - `apps/web/features/feed/components/CommentSection.test.tsx`
  - These use `userEvent.type(editor, "@av")` / `userEvent.type(editor, "@ma")` against the contenteditable `role="combobox"` surface. They do not call a Tiptap command directly.
  - These tests mock `searchMentionSuggestions`, so they do not prove the real `/v1/profiles/search` call or popup works in the running app.

### Open Items Carried Forward

- Posts have no DB-level `body` cap. Comments do: comment body DB/API raw cap was raised to `100000` chars after measuring a worst-case rich JSON expansion of `55264` chars for a 1,000-visible-character comment with alternating marks and mention atoms, leaving `44736` chars margin.
- Legacy markdown-content volume was never counted. Blocked by missing `DATABASE_URL`, same as notification DB/API verification.
