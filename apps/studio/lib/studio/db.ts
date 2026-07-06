import { neon } from '@neondatabase/serverless';
import { getStudioEnv } from '@/lib/studio/env';

export type StudioSql = <T>(strings: TemplateStringsArray, ...params: unknown[]) => Promise<T>;

var cachedDb: StudioSql | null = null;
var cachedDatabaseUrl: string | null = null;

export function getStudioSql(): StudioSql {
  var databaseUrl =
    getStudioEnv('STUDIO_DATABASE_URL') ||
    getStudioEnv('DATABASE_READ_REPLICA_URL') ||
    getStudioEnv('DATABASE_REPLICA_URL') ||
    getStudioEnv('DATABASE_URL');

  if (!databaseUrl) {
    throw new Error('Missing STUDIO_DATABASE_URL or DATABASE_URL');
  }

  if (!cachedDb || cachedDatabaseUrl !== databaseUrl) {
    cachedDb = neon(databaseUrl) as unknown as StudioSql;
    cachedDatabaseUrl = databaseUrl;
  }

  return cachedDb;
}
