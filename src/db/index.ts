import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'node:path';
import type { RunResult } from 'better-sqlite3';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as schema from './schema.js';

const client = new Database(process.env.DB_PATH ?? ':memory:');
client.pragma('foreign_keys = ON');
export const db = drizzle(client, { schema });
migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });

export type DbConnection = BaseSQLiteDatabase<'sync', RunResult, typeof schema>;
