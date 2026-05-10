import path from 'path';
import sqlite3 = require('sqlite3');

sqlite3.verbose();

export type SqlValue = string | number | null;

let db: sqlite3.Database | undefined;

const resolveDatabasePath = (databasePath: string) => {
  if (databasePath === ':memory:') {
    return databasePath;
  }

  return path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(databasePath);
};

const getDb = () => {
  if (!db) {
    throw new Error('SQLite database is not initialized yet.');
  }

  return db;
};

export const run = (
  sql: string,
  params: SqlValue[] = [],
): Promise<{ lastID: number; changes: number }> =>
  new Promise((resolve, reject) => {
    getDb().run(sql, params, function (this: sqlite3.RunResult, error: Error | null) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

export const get = <T>(
  sql: string,
  params: SqlValue[] = [],
): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    getDb().get(sql, params, (error: Error | null, row: T | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row as T | undefined);
    });
  });

export const all = <T>(sql: string, params: SqlValue[] = []): Promise<T[]> =>
  new Promise((resolve, reject) => {
    getDb().all(sql, params, (error: Error | null, rows: T[] | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      resolve((rows as T[]) || []);
    });
  });

export const initSqlite = async (databasePath: string) => {
  if (db) {
    return;
  }

  const resolvedPath = resolveDatabasePath(databasePath);

  db = await new Promise<sqlite3.Database>((resolve, reject) => {
    const database = new sqlite3.Database(resolvedPath, (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(database);
    });
  });

  await run('PRAGMA foreign_keys = ON;');

  await run(`
    CREATE TABLE IF NOT EXISTS server_configs (
      server_id TEXT PRIMARY KEY,
      alex_allow TEXT NOT NULL DEFAULT '[]',
      profanity_sureness INTEGER NOT NULL DEFAULT 1,
      no_binary INTEGER NOT NULL DEFAULT 0,
      banned_words TEXT NOT NULL DEFAULT '[]'
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS warnings (
      warning_id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS statistics (
      server_id TEXT PRIMARY KEY,
      total_triggers INTEGER NOT NULL DEFAULT 0,
      total_triggers_fixed INTEGER NOT NULL DEFAULT 0
    );
  `);
};
