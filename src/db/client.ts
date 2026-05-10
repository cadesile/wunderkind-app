import type { SQLiteDatabase } from 'expo-sqlite';

let _db: SQLiteDatabase | null = null;

export function setDatabase(db: SQLiteDatabase): void {
  _db = db;
}

export function getDatabase(): SQLiteDatabase {
  if (!_db) throw new Error('[db] Database not initialized. SQLiteProvider onInit has not run yet.');
  return _db;
}
