import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { SyncDebugLog, SyncFsDirectoryEntry } from '@/types/api';

interface KeySizeEntry {
  key: string;
  bytes: number;
  kb: string;
}

/**
 * Emergency pruning: clears the biggest ephemeral stores from AsyncStorage
 * when total usage exceeds the threshold (default 3 MB).
 *
 * Safe to call on every app start — it checks total size first and is a
 * no-op unless the threshold is breached.
 *
 * Cleared keys:
 *   - league-stats-store  (stats rebuild on next simulation)
 *   - match-result-store  (historical match scores — non-critical)
 *   - player_app:*        (appearance keys accumulate for world players)
 */
export async function emergencyPruneIfOverLimit(limitKb = 3000): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys() as string[];
    const pairs = await AsyncStorage.multiGet(allKeys);
    const totalBytes = pairs.reduce(
      (sum, [, v]) => sum + (v ? new TextEncoder().encode(v).length : 0),
      0,
    );

    if (totalBytes / 1024 < limitKb) return;

    console.warn(
      `[storageDiagnostics] Storage ${(totalBytes / 1024).toFixed(0)} KB > ${limitKb} KB limit — running emergency prune`,
    );

    // Clear oversized ephemeral Zustand stores
    const purgeKeys = allKeys.filter(
      (k) =>
        k === 'league-stats-store' ||           // legacy monolithic key
        k.startsWith('league-stats-store:s') || // old per-season keys (pre-tier scheme)
        k.startsWith('league-stats-store:t') || // new per-tier-season keys
        k === 'match-result-store' ||
        k.startsWith('player_app:'),
    );
    if (purgeKeys.length > 0) {
      await AsyncStorage.multiRemove(purgeKeys);
    }

    console.warn(
      `[storageDiagnostics] Purged ${purgeKeys.length} keys (league-stats, match-results, ${purgeKeys.filter((k) => k.startsWith('player_app:')).length} appearance keys)`,
    );
  } catch (e) {
    console.error('[storageDiagnostics] emergencyPruneIfOverLimit failed:', e);
  }
}

/**
 * Reads every AsyncStorage key and logs its size in descending order.
 * Call from anywhere: `import { logStorageSizes } from '@/utils/storageDiagnostics'; logStorageSizes();`
 */
export async function logStorageSizes(): Promise<KeySizeEntry[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(allKeys as string[]);

    const entries: KeySizeEntry[] = pairs
      .map(([key, value]) => ({
        key: key ?? '',
        bytes: value ? new TextEncoder().encode(value).length : 0,
        kb: value ? (new TextEncoder().encode(value).length / 1024).toFixed(1) + ' KB' : '0 KB',
      }))
      .sort((a, b) => b.bytes - a.bytes);

    const totalBytes = entries.reduce((sum, e) => sum + e.bytes, 0);

    console.log('═══════════ AsyncStorage Size Report ═══════════');
    console.log(`Total: ${(totalBytes / 1024).toFixed(1)} KB across ${entries.length} keys`);
    console.log('─────────────────────────────────────────────────');
    for (const entry of entries.slice(0, 20)) {
      console.log(`${entry.kb.padStart(9)}  ${entry.key}`);
    }
    if (entries.length > 20) {
      console.log(`  ... and ${entries.length - 20} more keys`);
    }
    console.log('═════════════════════════════════════════════════');

    return entries;
  } catch (e) {
    console.error('[storageDiagnostics] Failed to read storage sizes:', e);
    return [];
  }
}

/**
 * Scans the top-level entries of documentDirectory.
 * For each subdirectory found, sums file sizes and counts files.
 * Returns a per-directory breakdown sorted by total size descending.
 */
async function scanFileSystemDirs(): Promise<{ directories: SyncFsDirectoryEntry[]; totalKb: number }> {
  const base = FileSystem.documentDirectory;
  if (!base) return { directories: [], totalKb: 0 };

  try {
    const topLevel = await FileSystem.readDirectoryAsync(base);
    const entries: SyncFsDirectoryEntry[] = [];

    await Promise.all(
      topLevel.map(async (name) => {
        const fullPath = `${base}${name}`;
        const info = await FileSystem.getInfoAsync(fullPath);
        if (!info.exists || !info.isDirectory) return;

        let fileCount = 0;
        let totalBytes = 0;
        try {
          const files = await FileSystem.readDirectoryAsync(fullPath);
          fileCount = files.length;
          await Promise.all(
            files.map(async (file) => {
              const fileInfo = await FileSystem.getInfoAsync(`${fullPath}/${file}`);
              if (fileInfo.exists && !fileInfo.isDirectory) {
                totalBytes += fileInfo.size ?? 0;
              }
            }),
          );
        } catch (_e) {
          // Unreadable directory — include with what we have
        }

        entries.push({
          dir:       name,
          fileCount,
          totalKb:   Math.round((totalBytes / 1024) * 10) / 10,
        });
      }),
    );

    entries.sort((a, b) => b.totalKb - a.totalKb);
    const totalKb = Math.round(entries.reduce((sum, e) => sum + e.totalKb, 0) * 10) / 10;
    return { directories: entries, totalKb };
  } catch (_e) {
    return { directories: [], totalKb: -1 };
  }
}

/**
 * Collects a structured debug snapshot for inclusion in the /sync payload.
 *
 * @param tickStartMs  Value of `Date.now()` captured at the start of `doAdvanceWeek`.
 * @returns            A `SyncDebugLog` object ready to attach as `payload.log`.
 */
export async function collectDebugLog(tickStartMs: number): Promise<SyncDebugLog> {
  const tickDurationMs = Date.now() - tickStartMs;

  const [sqliteResult, fsResult] = await Promise.allSettled([
    (async () => {
      const allKeys = (await AsyncStorage.getAllKeys()) as string[];
      const pairs   = await AsyncStorage.multiGet(allKeys);
      const sized   = pairs
        .map(([key, value]) => ({
          key:   key ?? '',
          bytes: value ? new TextEncoder().encode(value).length : 0,
        }))
        .sort((a, b) => b.bytes - a.bytes);
      const totalBytes = sized.reduce((sum, e) => sum + e.bytes, 0);
      return {
        totalKb:             Math.round((totalBytes / 1024) * 10) / 10,
        keyCount:            sized.length,
        topKeys:             sized.slice(0, 20).map((e) => ({
          key: e.key,
          kb:  Math.round((e.bytes / 1024) * 10) / 10,
        })),
        leagueStatsKeyCount: allKeys.filter((k) => k.startsWith('league-stats-store:t')).length,
        playerAppKeyCount:   allKeys.filter((k) => k.startsWith('player_app:')).length,
      };
    })(),
    scanFileSystemDirs(),
  ]);

  const sqlite = sqliteResult.status === 'fulfilled'
    ? sqliteResult.value
    : { totalKb: -1, keyCount: -1, topKeys: [], leagueStatsKeyCount: -1, playerAppKeyCount: -1 };

  const fileSystem = fsResult.status === 'fulfilled'
    ? fsResult.value
    : { totalKb: -1, directories: [] };

  return {
    capturedAt:    new Date().toISOString(),
    platform:      Platform.OS,
    tickDurationMs,
    storage:       { sqlite, fileSystem },
  };
}
