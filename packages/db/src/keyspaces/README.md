# AWS Keyspaces Chat Schema

Connect with service-specific AWS Keyspaces credentials:

```bash
cqlsh cassandra.us-east-1.amazonaws.com 9142 --ssl
```

API and worker code use `cassandra-driver` with SigV4 auth via `aws-sigv4-auth-cassandra-plugin`.

Apply `schema.cql` manually on first deploy with AWS console or `cqlsh`. Drizzle does not run this schema.

Migration from Postgres messages: replace Drizzle message queries in `apps/api/src/modules/chat/routes.ts` and worker jobs with `cassandra-driver` equivalents. API contracts, types, and pagination cursors do not change.
