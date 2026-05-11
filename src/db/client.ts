import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

let _db: SQLiteDatabase | null = null;

// Silent no-op used on web where SQLite is unavailable.
const noopDb = {
  runAsync:            async () => {},
  getAllAsync:          async () => [],
  getFirstAsync:       async () => null,
  execAsync:           async () => {},
  withTransactionAsync: async (fn: () => Promise<void>) => fn(),
  closeAsync:          async () => {},
} as unknown as SQLiteDatabase;

export function setDatabase(db: SQLiteDatabase): void {
  _db = db;
}

export function getDatabase(): SQLiteDatabase {
  if (!_db) {
    if (Platform.OS === 'web') return noopDb;
    throw new Error('[db] Database not initialized. SQLiteProvider onInit has not run yet.');
  }
  return _db;
}
