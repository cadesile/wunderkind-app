/**
 * Web stub for expo-sqlite.
 * This app is native-only; SQLite is not used on web.
 * Metro resolves this file instead of expo-sqlite when platform === 'web'.
 */

const React = require('react');

const noop = () => Promise.resolve();

const fakeDb = {
  closeAsync: noop,
  runAsync: noop,
  getAllAsync: () => Promise.resolve([]),
  getFirstAsync: () => Promise.resolve(null),
  execAsync: noop,
  withTransactionAsync: async (fn) => fn(),
};

function SQLiteProvider({ children }) {
  return children;
}

function useSQLiteContext() {
  return fakeDb;
}

async function deleteDatabaseAsync() {}
async function openDatabaseAsync() { return fakeDb; }

module.exports = {
  SQLiteProvider,
  useSQLiteContext,
  deleteDatabaseAsync,
  openDatabaseAsync,
};
