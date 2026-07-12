# Content Moderation Documentation

This directory is the documentation home for 35mm reporting, moderation review, enforcement, read filtering, strikes, automatic hiding, and moderation notifications.

V1 reportable targets are posts, comments, and profiles. Chat messages and lists are not reportable through this system.

## Read Order

1. Read `spec.md` first. It is the frozen product and engineering contract.
2. Read `implementation.md` for actual files, transaction behavior, scale decisions, and documented divergences.
3. Read `api-reference.md` when building clients or Studio moderation surfaces.
4. Read `frontend-implementation.md` for the public web reporting flows and Studio review console.
5. Read `testing.md` before changing dedupe, enforcement, automatic hiding, notification outbox, or pagination behavior.

## Files

- [`spec.md`](./spec.md): Frozen V1 scope, trust semantics, schema, API, worker, notification, and read-enforcement contract.
- [`implementation.md`](./implementation.md): Built architecture, file map, indexes, transaction boundaries, cache behavior, and gaps.
- [`api-reference.md`](./api-reference.md): Endpoint inputs, outputs, cursors, auth, idempotency, and status codes.
- [`frontend-implementation.md`](./frontend-implementation.md): Public web reporting/history UI and Studio queue/detail/enforcement implementation.
- [`testing.md`](./testing.md): Always-on and DB-gated coverage, commands, fixture safety, and remaining operational verification.

## Documentation Rule

`spec.md` remains stable after V1 implementation. Meaningful differences between plan and implementation belong in `implementation.md`, with reasoning. Future moderation features get their own document and README link.
