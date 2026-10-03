# 35mm Internal API & Data Model Reference

Run from repository root:

```bash
pnpm dev:docs
```

Open `http://localhost:3002`. Local API defaults to `http://localhost:4000`; set actual API URL in reference toolbar. URL is saved only in browser localStorage. Scalar bearer input stays in browser memory (`persistAuth: false`). Browsers call API directly, so API `CORS_ORIGINS` must include docs origin for Try it.

`pnpm --filter @35mm/docs generate` reads mounted Hono route files, shared Zod 4 validators, shared DTOs, Drizzle tables, latest migration snapshot, and SQL migrations. It writes `openapi/spec.yaml` as canonical OpenAPI 3.1 artifact, `openapi/spec.json` for embedded Scalar, `generated/routes.json`, `generated/tables.json`, and Mermaid ERD files. Do not hand-edit generated files. `DIVERGENCES.md` lists incomplete response/body/status contracts and draft drift. `pnpm --filter @35mm/docs typecheck` and `pnpm --filter @35mm/docs build` verify app. OpenAPI validity can be checked with `pnpm --filter @35mm/docs validate:spec`.

Site has no auth by default. Set `DOCS_SHARED_PASSWORD` in runtime environment to enable shared Basic password gate on all docs paths; use HTTPS when enabled. Site sends noindex/nofollow metadata. No API or database runtime behavior changes.

At 1M+ DAU, this app adds no product traffic except explicit internal Try it requests. Generation runs at build/startup; published pages read checked-in JSON and Mermaid files. No new DB index needed.
