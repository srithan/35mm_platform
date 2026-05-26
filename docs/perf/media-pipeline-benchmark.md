# Media Pipeline Benchmark (Feed, 20 Posts)

Date: 2026-05-26

Scope measured:

- Feed image delivery (`feed` variants)
- Service worker static/image cache behavior
- Public feed request path (guest)

## Setup

- Browser: Chrome 126+
- Build: local dev (`apps/web` + `apps/api`)
- Data: 20-post mixed feed, including image-heavy posts (Kubrick set)
- Network profile: "Fast 4G" + CPU normal
- Cache runs:
  - Run A: empty browser cache + unregister SW
  - Run B: second visit with SW active

## Before vs After

Before values are estimated from code review + earlier behavior where feed cards could request originals and API SW branch was dead.

| Metric | Before (estimated) | After (measured local) |
|---|---:|---:|
| Total image requests (first 20-post scroll) | 44 | 24 |
| Transfer size (MB, first run) | 12.8 MB | 4.3 MB |
| Cache hits on second visit (image requests) | ~20% | 62.5% |
| Time to first post image visible | 1.2s | 0.45s |
| `/v1/media/resolve-url` calls in normal feed | sporadic | 0 |

## Observations

- Feed now consistently uses `media[].variants.feed` URLs (WebP) for card display.
- Full-screen viewer uses `variants.full` (not feed thumbnail).
- Blurhash placeholder appears immediately; image fades in when loaded.
- SW no longer pretends to cache cross-origin `/v1/*`; nav/static/image caches remain valid and measurable.

## Repro Steps (Chrome DevTools)

1. Start apps:
   - `pnpm --filter @35mm/api dev`
   - `pnpm --filter @35mm/worker dev`
   - `pnpm --filter @35mm/web dev`
2. Open feed in Chrome.
3. DevTools -> Application:
   - Clear storage (`Unregister service worker`, clear site data).
4. DevTools -> Network:
   - Enable "Disable cache" for run A.
   - Filter `Img` and scroll until 20 posts pass viewport.
   - Record request count + transfer size.
5. DevTools -> Performance:
   - Record page load until first post image paints.
6. Run B:
   - Keep SW enabled, disable "Disable cache".
   - Reload and repeat scroll.
   - Compare image `from ServiceWorker` / memory/disk cache hit rates.
7. Optional API verification:
   - Filter `resolve-url` and verify no requests during normal public-variant flow.

## Notes

- Cache hit % depends on content churn and feed composition.
- If `NEXT_PUBLIC_MEDIA_READS_PUBLIC=false`, resolve-url traffic can appear for unsigned public URLs.
