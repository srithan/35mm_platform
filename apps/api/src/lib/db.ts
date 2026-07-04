import { createDb, createPooledDb, type Db, type PooledDb } from "@35mm/db";

var _db: Db | null = null;
var _writeDb: PooledDb | null = null;
var _databaseUrl: string | null = null;

export function initDb(databaseUrl: string): Db {
  if (!_db) {
    _db = createDb(databaseUrl);
  }
  _databaseUrl = databaseUrl;
  return _db;
}

export function getDb(): Db {
  if (!_db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return _db;
}

export function getWriteDb(): PooledDb {
  if (!_databaseUrl) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  if (!_writeDb) {
    _writeDb = createPooledDb(_databaseUrl);
  }
  return _writeDb;
}
