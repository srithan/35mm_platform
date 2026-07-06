import { Pool } from "@neondatabase/serverless";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import * as schema from "./schema/index.js";

export { followSuggestions } from "./schema/follow_suggestions.js";

export function createDb(databaseUrl: string) {
  var sql = neon(databaseUrl);
  return drizzleHttp({ client: sql, schema });
}

export function createPooledDb(databaseUrl: string) {
  var pool = new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.DATABASE_POOL_MAX ?? "10"),
  });
  return drizzleNeon({ client: pool, schema });
}

export type Db = ReturnType<typeof createDb>;
export type PooledDb = ReturnType<typeof createPooledDb>;

export * from "./schema/index.js";
