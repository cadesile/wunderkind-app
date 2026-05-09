/**
 * Appearance Storage — per-player / per-club / per-season AsyncStorage keys.
 *
 * Key format:  player_app:{playerId}:{clubId}:{season}
 *              where `season` is the integer season number (1, 2, 3 …)
 *
 * This replaces embedding MatchAppearance arrays inside Zustand store objects
 * (squad-store player.appearances, worldStore_clubs_* NPC appearances), which
 * caused a single AsyncStorage key to grow unboundedly as matches were played.
 *
 * With per-key storage:
 *  - Each key holds one player's appearances for one club in one season.
 *  - Seasons can be pruned atomically: delete all keys where season < N.
 *  - No single key ever grows beyond ~38 match entries (one per matchday).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MatchAppearance, PlayerAppearances } from '@/types/player';

const PREFIX = 'player_app';

// ─── Key helpers ──────────────────────────────────────────────────────────────

function makeKey(playerId: string, clubId: string, season: number): string {
  return `${PREFIX}:${playerId}:${clubId}:${season}`;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * Batch-append appearance entries.  Uses multiGet + multiSet so the full batch
 * costs only two AsyncStorage round-trips regardless of how many entries there are.
 *
 * Pass `season` as the integer season number (e.g. 1, 2, 3).
 */
export async function batchAppendAppearances(
  entries: ReadonlyArray<{
    playerId: string;
    clubId:   string;
    season:   number;
    appearance: MatchAppearance;
  }>,
): Promise<void> {
  if (entries.length === 0) return;

  // Group new appearances by storage key
  const byKey = new Map<string, MatchAppearance[]>();
  for (const e of entries) {
    const key = makeKey(e.playerId, e.clubId, e.season);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(e.appearance);
    else byKey.set(key, [e.appearance]);
  }

  // Read existing data for all affected keys in one round-trip
  const keys = Array.from(byKey.keys());
  const existing = await AsyncStorage.multiGet(keys);

  // Merge with existing and build write pairs
  const pairs: [string, string][] = existing.map(([key, raw]) => {
    const prev: MatchAppearance[] = raw ? JSON.parse(raw) : [];
    return [key, JSON.stringify([...prev, ...(byKey.get(key) ?? [])])];
  });

  await AsyncStorage.multiSet(pairs);
}

// ─── Reads ────────────────────────────────────────────────────────────────────

/**
 * Load all appearance records for a player as a `PlayerAppearances` map:
 *   Record<"Season N", Record<clubId, MatchAppearance[]>>
 *
 * Scans AsyncStorage by key prefix so all seasons are returned without prior
 * knowledge of which seasons the player has data for.
 */
export async function loadPlayerAppearances(playerId: string): Promise<PlayerAppearances> {
  const allKeys = await AsyncStorage.getAllKeys();
  const playerPrefix = `${PREFIX}:${playerId}:`;
  const relevant = allKeys.filter((k) => k.startsWith(playerPrefix));
  if (relevant.length === 0) return {};

  const pairs = await AsyncStorage.multiGet(relevant);
  const result: PlayerAppearances = {};

  for (const [key, raw] of pairs) {
    if (!raw) continue;
    // key = player_app:{playerId}:{clubId}:{season}
    // After removing the prefix, the remainder is "{clubId}:{season}"
    const rest = key.slice(playerPrefix.length);
    const lastColon = rest.lastIndexOf(':');
    if (lastColon === -1) continue;
    const clubId = rest.slice(0, lastColon);
    const seasonNum = parseInt(rest.slice(lastColon + 1), 10);
    if (isNaN(seasonNum)) continue;

    const seasonKey = `Season ${seasonNum}`;
    const apps: MatchAppearance[] = JSON.parse(raw);

    if (!result[seasonKey]) result[seasonKey] = {};
    result[seasonKey][clubId] = apps;
  }

  return result;
}

// ─── Pruning ─────────────────────────────────────────────────────────────────

/**
 * Remove appearance keys for all seasons strictly before `minSeason`.
 * Call at season transition — e.g. after Season 3 begins, call
 * `pruneAppearancesBefore(2)` to delete all Season 1 data.
 */
export async function pruneAppearancesBefore(minSeason: number): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const toRemove: string[] = [];

  for (const key of allKeys) {
    if (!key.startsWith(`${PREFIX}:`)) continue;
    const seasonNum = parseInt(key.slice(key.lastIndexOf(':') + 1), 10);
    if (!isNaN(seasonNum) && seasonNum < minSeason) toRemove.push(key);
  }

  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}
