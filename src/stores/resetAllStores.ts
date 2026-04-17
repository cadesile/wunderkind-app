import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { useEventChainStore } from './eventChainStore';
import { useClubStore } from './clubStore';
import { useSquadStore } from './squadStore';
import { useCoachStore } from './coachStore';
import { useScoutStore } from './scoutStore';
import { useGuardianStore } from './guardianStore';

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

  useClubStore.setState({
    club: {
      id: 'club-1',
      name: '',
      foundedWeek: 1,
      weekNumber: 1,
      reputation: 0,
      reputationTier: 'Local',
      totalCareerEarnings: 0,
      hallOfFamePoints: 0,
      squadSize: 0,
      staffCount: 1,
      balance: 0,
      createdAt: '',
      sponsorIds: [],
      investorId: null,
      country: null,
      lastRepActivityWeek: 1,
    },
    managerPersonality: null,
  });

  useSquadStore.setState({ players: [] });
  useCoachStore.setState({ coaches: [] });
  useScoutStore.setState({ scouts: [] });
  useGuardianStore.getState().clearAll();
  useEventChainStore.getState().clearAll();
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
  // Remove all persisted store data so the next app launch starts clean
  await AsyncStorage.multiRemove(ALL_STORE_KEYS);

  // Reset in-memory state so the current session also behaves correctly
  resetInMemoryStores();
}
