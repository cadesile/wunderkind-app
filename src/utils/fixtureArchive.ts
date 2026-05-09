import * as FileSystem from 'expo-file-system/legacy';
import type { Fixture } from '@/stores/fixtureStore';

// ─── Directory ────────────────────────────────────────────────────────────────

const ARCHIVE_DIR = `${FileSystem.documentDirectory}fixture-archive/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(ARCHIVE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ARCHIVE_DIR, { intermediates: true });
  }
}

function seasonPath(season: number): string {
  return `${ARCHIVE_DIR}s${season}.json`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Write all fixtures for a completed season to the file system.
 * Safe to call even if the file already exists — it will be overwritten.
 */
export async function archiveFixtureSeason(
  season: number,
  fixtures: Fixture[],
): Promise<void> {
  try {
    await ensureDir();
    await FileSystem.writeAsStringAsync(
      seasonPath(season),
      JSON.stringify(fixtures),
      { encoding: FileSystem.EncodingType.UTF8 },
    );
  } catch (e) {
    console.error('[fixtureArchive] archiveFixtureSeason failed:', e);
  }
}

/**
 * Load archived fixtures for a past season.
 * Returns null if the archive file doesn't exist yet.
 */
export async function loadArchivedFixtureSeason(
  season: number,
): Promise<Fixture[] | null> {
  try {
    const path = seasonPath(season);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(raw) as Fixture[];
  } catch (e) {
    console.error('[fixtureArchive] loadArchivedFixtureSeason failed:', e);
    return null;
  }
}

/**
 * Returns the list of season numbers that have been archived, ascending.
 */
export async function listArchivedFixtureSeasons(): Promise<number[]> {
  try {
    await ensureDir();
    const files = await FileSystem.readDirectoryAsync(ARCHIVE_DIR);
    return files
      .filter((f) => /^s\d+\.json$/.test(f))
      .map((f) => parseInt(f.slice(1, -5), 10))
      .sort((a, b) => a - b);
  } catch (e) {
    console.error('[fixtureArchive] listArchivedFixtureSeasons failed:', e);
    return [];
  }
}

/**
 * Delete archives older than `keepLast` seasons.
 * Call at season transition after archiving the just-completed season.
 */
export async function pruneFixtureArchives(keepLast = 5): Promise<void> {
  try {
    const seasons = await listArchivedFixtureSeasons();
    const toDelete = seasons.slice(0, Math.max(0, seasons.length - keepLast));
    await Promise.all(
      toDelete.map((s) => FileSystem.deleteAsync(seasonPath(s), { idempotent: true })),
    );
  } catch (e) {
    console.error('[fixtureArchive] pruneFixtureArchives failed:', e);
  }
}
