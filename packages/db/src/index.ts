import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/index.js";

export { followSuggestions } from "./schema/follow_suggestions.js";

export function createDb(databaseUrl: string) {
  var sql = neon(databaseUrl);
  return drizzle({ client: sql, schema });
}

export type Db = ReturnType<typeof createDb>;

export * from "./schema/index.js";
