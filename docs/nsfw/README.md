# NSFW Content Classification Documentation

This directory documents 35mm sensitive-content classification for posts,
comments, and individual post media items. This signal is independent from
policy moderation: it labels content for client presentation and never hides,
removes, or filters a row.

## Read Order

1. `spec.md` — frozen backend classification contract.
2. `implementation.md` — built files, runtime behavior, scale, and deviations.
3. `api-reference.md` — write and response contracts.
4. `testing.md` — always-on, DB-gated, and operational verification.

The web composer advisory flow and feed/detail blur-and-reveal presentation are
implemented. Client hints remain advisory; the backend worker remains the
classification authority.
