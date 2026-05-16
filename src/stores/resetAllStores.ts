import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { useEventChainStore } from './eventChainStore';
import { useClubStore, DEFAULT_CLUB } from './clubStore';
import { useSquadStore } from './squadStore';
import { useCoachStore } from './coachStore';
import { useScoutStore } from './scoutStore';
import { useGuardianStore } from './guardianStore';
import { useFixtureStore } from './fixtureStore';
import { useWorldStore } from './worldStore';
import { useLeagueStore } from './leagueStore';
import { useLeagueHistoryStore } from './leagueHistoryStore';
import { useManagerRecordStore } from './managerRecordStore';
import { useFanStore } from './fanStore';
import { useCalendarStore } from './calendarStore';
import { getFirstSaturdayOfJune } from '@/utils/dateUtils';

/** Prefix used by worldStore for per-league club maps. */
const WORLD_CLUBS_KEY_PREFIX = 'worldStore_clubs_';

/**
 * All Zustand persist store keys registered in AsyncStorage.
 * Update this list whenever a new persisted store is added.
 */
const ALL_STORE_KEYS = [
  'auth-store',
  'club-store',
  'squad-store',
  'coach-store',
  'scout-store',
  'market-store',
  'facility-store',
  'inbox-store',
  'finance-store',
  'loan-store',
  'fixture-store',
  'worldStore_meta',
  'league-store',
  'league-history-store',
  'fan-store',
  'attendance-store',
  'altercation-store',
  'active-effect-store',
  'narrative-store',
  'interaction-store',
  'event-store',
  'prospect-pool-store',
  'game-config-store',
  'archetype-store',
  'loss-condition-store',
  'guardian-store',
  'event-chain-store',
  'manager-record-store',
  'calendar-store',
];

/**
 * Resets critical stores' in-memory state so a fresh onboarding run doesn't
 * accumulate stale data (e.g. `addCoach` on top of leftover coaches).
 *
 * Called before showing the onboarding screen mid-session (game over → new game).
 * Not needed on cold launch because stores hydrate from cleared AsyncStorage.
 */
export function resetInMemoryStores(): void {
  useAuthStore.getState().clearAuth();

  useClubStore.setState({ club: DEFAULT_CLUB, managerPersonality: null, seasonFreeSigningsUsed: 0 });
  useSquadStore.setState({ players: [] });
  useCoachStore.setState({ coaches: [] });
  useScoutStore.setState({ scouts: [] });

  // Clear fixture and world state so stale completed fixtures don't fire the
  // season-end overlay during a fresh initialization.
  useFixtureStore.getState().clearSeason();
  useWorldStore.setState({ isInitialized: false, leagues: [], clubs: {}, ampLeagueId: null, clubsLoadError: null });
  useLeagueStore.getState().clear();

  useGuardianStore.getState().clearAll();
  useEventChainStore.getState().clearAll();
  useLeagueHistoryStore.setState({ history: {} });
  useManagerRecordStore.getState().clearAll();
  useFanStore.getState().resetFans();
  useCalendarStore.getState().setGameDate(getFirstSaturdayOfJune(new Date().getFullYear()));
}

/**
 * Wipes all club data — both persisted (AsyncStorage) and in-memory (Zustand).
 *
 * Call this only when the backend definitively reports that the club no longer
 * exists (HTTP 404 on /api/club/check), or when the player starts a new game
 * after a game over. Never call on transient network errors.
 *
 * After this returns, the caller is responsible for redirecting to onboarding.
 */
export async function clearAllClubData(): Promise<void> {
  // Remove all fixed-key persisted stores
  await AsyncStorage.multiRemove(ALL_STORE_KEYS);

  // Remove dynamic per-league club maps (worldStore_clubs_<leagueId>)
  const allKeys = await AsyncStorage.getAllKeys();
  const worldClubKeys = allKeys.filter((k) => k.startsWith(WORLD_CLUBS_KEY_PREFIX));
  if (worldClubKeys.length > 0) {
    await AsyncStorage.multiRemove(worldClubKeys);
  }

  // Reset in-memory state so the current session also behaves correctly
  resetInMemoryStores();
}
