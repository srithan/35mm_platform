# @35mm/api-client

Platform-neutral JSON REST transport for 35mm clients. Callers inject API origin,
Clerk token provider, fetch implementation, request-ID generator, and platform
metadata. Package owns bounded timeouts/retries, standard API error decoding,
idempotency headers, cancellation, and optional runtime response parsing.

Package contains no React, React Native, browser storage, Clerk SDK, or product
query keys. Feature clients remain responsible for canonical contracts and cache
invalidation.
