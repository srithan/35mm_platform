import { createDb, type Db } from "@35mm/db";

var _db: Db | null = null;

export function initDb(databaseUrl: string): Db {
  if (!_db) {
    _db = createDb(databaseUrl);
  }
  return _db;
}

export function getDb(): Db {
  if (!_db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return _db;
}
