import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  postInitializeStarter,
  getInitializeLeagues,
  postInitializeLeagueTier,
  type InitLeague,
  type InitStarterResponse,
} from '@/api/endpoints/initialize';
import { useWorldStore } from '@/stores/worldStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { useFanStore } from '@/stores/fanStore';
import { useClubStore } from '@/stores/clubStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { syncQueue } from '@/api/syncQueue';
import { fetchStarterConfig } from '@/api/endpoints/starterConfig';
import { ApiError } from '@/types/api';
import type { WorldPlayer, WorldStaff, WorldScout, WorldClub } from '@/types/world';
import type { Player, Position } from '@/types/player';
import type { Coach, StaffRole } from '@/types/coach';
import type { Scout } from '@/types/market';
import type { ApiGuardian } from '@/types/api';
import type { Guardian } from '@/types/guardian';
import { generatePersonality } from '@/engine/personality';
import { generateAppearance } from '@/engine/appearance';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import { randomBaseMorale } from '@/utils/morale';
import { getFirstSaturdayOfJune } from '@/utils/dateUtils';

// ─── AsyncStorage checkpoint keys ────────────────────────────────────────────

const INIT_KEY = {
  STARTER_AT:      'wk:init:starter_at',
  AMP_STARTER:     'wk:init:amp_starter',
  LEAGUES:         'wk:init:leagues',
  COMPLETED_TIERS: 'wk:init:completed_tiers',
  TIER_DATA:       (tier: number) => `wk:init:tier:${tier}`,
} as const;

async function clearInitCheckpoint(): Promise<void> {
  const completedRaw = await AsyncStorage.getItem(INIT_KEY.COMPLETED_TIERS);
  const tiers: number[] = completedRaw ? (JSON.parse(completedRaw) as number[]) : [];
  const keys = [
    INIT_KEY.STARTER_AT,
    INIT_KEY.AMP_STARTER,
    INIT_KEY.LEAGUES,
    INIT_KEY.COMPLETED_TIERS,
    ...tiers.map(INIT_KEY.TIER_DATA),
  ];
  await AsyncStorage.multiRemove(keys);
}

// ─── AMP entity mappers (moved from useAuthFlow) ─────────────────────────────

function worldPlayerToPlayer(wp: WorldPlayer, weekNumber: number): Player {
  const personality = generatePersonality();
  const pos: Position = wp.position === 'ATT' ? 'FWD' : (wp.position as Position);
  const gameDate = getGameDate(weekNumber);
  const ageRaw = wp.dateOfBirth ? computePlayerAge(wp.dateOfBirth, gameDate) : 14;
  const age = typeof ageRaw === 'number' ? ageRaw : 14;
  const overallRating = Math.round(
    (wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6,
  );
  const { defaultMoraleMin, defaultMoraleMax } = useGameConfigStore.getState().config;
  return {
    id:               wp.id,
    name:             `${wp.firstName} ${wp.lastName}`,
    dateOfBirth:      wp.dateOfBirth,
    age,
    position:         pos,
    nationality:      wp.nationality,
    overallRating,
    potential:        overallRating,
    wage:             wp.contractValue ?? overallRating * 100,
    personality,
    appearance:       generateAppearance(wp.id, 'PLAYER', age, personality),
    agentId:          null,
    joinedWeek:       weekNumber,
    isActive:         true,
    morale:           randomBaseMorale(defaultMoraleMin, defaultMoraleMax),
    relationships:    [],
    enrollmentEndWeek: weekNumber + 52,
    extensionCount:   0,
    attributes: {
      pace:      wp.pace,
      technical: wp.technical,
      vision:    wp.vision,
      power:     wp.power,
      stamina:   wp.stamina,
      heart:     wp.heart,
    },
    height: wp.physical?.height ?? wp.height,
    weight: wp.physical?.weight ?? wp.weight,
  } as Player;
}

function worldStaffToCoach(ws: WorldStaff, weekNumber: number): Coach {
  const personality = generatePersonality();
  const { defaultMoraleMin, defaultMoraleMax } = useGameConfigStore.getState().config;
  return {
    id:           ws.id,
    name:         `${ws.firstName} ${ws.lastName}`,
    role:         ws.role as StaffRole,
    salary:       ws.coachingAbility * 100,
    influence:    Math.max(1, Math.min(20, Math.round(ws.coachingAbility / 5))),
    personality,
    appearance:   generateAppearance(ws.id, 'COACH', 35, personality),
    nationality:  ws.nationality ?? '',
    joinedWeek:   weekNumber,
    morale:       randomBaseMorale(defaultMoraleMin, defaultMoraleMax),
    specialisms:  Array.isArray(ws.specialisms) ? undefined : (ws.specialisms as import('@/types/coach').CoachSpecialisms | undefined),
    relationships: [],
  };
}

function worldStaffToScout(ws: WorldStaff, weekNumber: number): Scout {
  const ability = ws.coachingAbility;
  const scoutingRange: Scout['scoutingRange'] =
    ability >= 60 ? 'international' : ability >= 30 ? 'national' : 'local';
  const { defaultMoraleMin, defaultMoraleMax } = useGameConfigStore.getState().config;
  return {
    id:                ws.id,
    name:              `${ws.firstName} ${ws.lastName}`,
    role:              'scout',
    salary:            ability * 100,
    scoutingRange,
    successRate:       Math.max(10, Math.min(90, ability)),
    nationality:       ws.nationality ?? '',
    joinedWeek:        weekNumber,
    appearance:        generateAppearance(ws.id, 'SCOUT', 35),
    morale:            randomBaseMorale(defaultMoraleMin, defaultMoraleMax),
    relationships:     [],
    assignedPlayerIds: [],
  };
}

function worldScoutEntryToScout(ws: WorldScout, weekNumber: number): Scout {
  const exp = ws.experience;
  const scoutingRange: Scout['scoutingRange'] =
    exp >= 60 ? 'international' : exp >= 30 ? 'national' : 'local';
  const { defaultMoraleMin, defaultMoraleMax } = useGameConfigStore.getState().config;
  return {
    id:                ws.id,
    name:              ws.name,
    role:              'scout',
    salary:            exp * 100,
    scoutingRange,
    successRate:       Math.max(10, Math.min(90, exp)),
    nationality:       ws.nationality,
    joinedWeek:        weekNumber,
    appearance:        generateAppearance(ws.id, 'SCOUT', 35),
    morale:            randomBaseMorale(defaultMoraleMin, defaultMoraleMax),
    relationships:     [],
    assignedPlayerIds: [],
  };
}

function storeBackendGuardians(playerId: string, apiGuardians: ApiGuardian[]): void {
  if (!apiGuardians || apiGuardians.length === 0) return;
  const guardians: Guardian[] = apiGuardians.map((g) => ({
    id:                  g.id,
    playerId,
    firstName:           g.firstName,
    lastName:            g.lastName,
    gender:              g.gender,
    demandLevel:         g.demandLevel,
    loyaltyToClub:       g.loyaltyToClub,
    ignoredRequestCount: 0,
  }));
  useGuardianStore.getState().addGuardians(guardians);
}

function backfillGuardians(players: Player[]): void {
  const guardianStore = useGuardianStore.getState();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const marketPlayers = require('@/stores/marketStore').useMarketStore.getState().players as import('@/types/market').MarketPlayer[];
  for (const player of players) {
    if (guardianStore.getGuardiansForPlayer(player.id).length > 0) continue;
    const mp = marketPlayers.find((m) => m.id === player.id);
    if (mp?.guardians && mp.guardians.length > 0) {
      storeBackendGuardians(player.id, mp.guardians);
    }
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type InitErrorKind =
  | 'network'         // timeout / no connection — tap to retry
  | 'pool_too_small'  // 412 on starter — contact support
  | 'generic';        // 500 or unexpected — tap to retry

export interface InitFlowState {
  /** Label shown below the progress bar */
  stepLabel: string;
  /** 0-based completed ticks */
  progressTick: number;
  /** Total ticks: 2 + N leagues */
  totalTicks: number;
  /** Non-null when a retryable or terminal error has occurred */
  error: { kind: InitErrorKind; message: string } | null;
  /** True when a 422 was received and the user must pick a country */
  needsCountryPicker: boolean;
  /** Kick off the flow (called on mount or after registerClub) */
  start: () => void;
  /** Re-run the last failed step */
  retry: () => void;
  /** Called by the country picker; provides the country code then retries step 1 */
  selectCountry: (countryCode: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInitFlow(onComplete: () => void): InitFlowState {
  const [stepLabel,          setStepLabel]          = useState('');
  const [progressTick,       setProgressTick]       = useState(0);
  const [totalTicks,         setTotalTicks]          = useState(2);
  const [error,              setError]              = useState<InitFlowState['error']>(null);
  const [needsCountryPicker, setNeedsCountryPicker] = useState(false);

  // Holds the country override when step 1 returns 422
  const pendingCountryRef = useRef<string | null>(null);
  // Prevents concurrent runs
  const runningRef = useRef(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function showError(kind: InitErrorKind, message: string) {
    setError({ kind, message });
  }

  function clearError() {
    setError(null);
    setNeedsCountryPicker(false);
  }

  // ─── Finalize: assemble WorldPack and hydrate stores ──────────────────────

  async function finalize(
    ampStarter: InitStarterResponse['ampStarter'],
    leagues: InitLeague[],
    tierClubs: Record<number, WorldClub[]>,
  ): Promise<void> {
    const setFromWorldPack = useWorldStore.getState().setFromWorldPack;

    // Assemble the WorldPackResponse['worldPack'] shape that setFromWorldPack expects.
    // Fields absent from the new API shape default to 0.
    const worldPack = {
      leagues: leagues.map((l) => ({
        // WorldLeague fields
        id:             l.id,
        tier:           l.tier,
        name:           l.name,
        country:        l.country,
        promotionSpots: l.promotionSpots,
        reputationTier: l.reputationTier,
        clubIds:        [] as string[], // derived by setFromWorldPack from clubs array
        // WorldLeagueFinancials
        tvDeal:                        l.tvDeal        ?? 0,
        sponsorPot:                    0,               // not in new API shape
        prizeMoney:                    l.prizeMoney     ?? 0,
        leaguePositionPot:             l.leaguePositionPot ?? 0,
        leaguePositionDecreasePercent: 0,               // not in new API shape
        // Embedded clubs for this tier
        clubs: tierClubs[l.tier] ?? [],
      })),
      ampStarter,
    };

    await setFromWorldPack(worldPack);

    const weekNumber = 1;

    // Seed calendar
    useCalendarStore.getState().setGameDate(getFirstSaturdayOfJune(new Date().getFullYear()));

    // Initialise fan engagement for every NPC club
    const starterConfig = await fetchStarterConfig().catch(() => null);
    if (starterConfig) {
      const allWorldClubs = worldPack.leagues.flatMap((l) => l.clubs);
      useFanStore.getState().initialiseFans(allWorldClubs, starterConfig);
    }

    // Map AMP squad, coaches, scouts
    const players = ampStarter.players.map((wp) => worldPlayerToPlayer(wp, weekNumber));

    const assignedCoaches = ampStarter.staff
      .filter((ws) => ws.role !== 'scout')
      .map((ws) => worldStaffToCoach(ws, weekNumber));

    const assignedScouts: Scout[] = [
      ...ampStarter.staff
        .filter((ws) => ws.role === 'scout')
        .map((ws) => worldStaffToScout(ws, weekNumber)),
      ...(ampStarter.scouts ?? [])
        .map((ws) => worldScoutEntryToScout(ws, weekNumber)),
    ];

    useSquadStore.getState().setPlayers(players);
    backfillGuardians(players);

    let hasDof = false;
    let hasFacilityManager = false;
    const { addCoach } = useCoachStore.getState();
    const { addScout } = useScoutStore.getState();

    for (const coach of assignedCoaches) {
      const contractFields = { contractEndWeek: weekNumber + 104, initialContractWeeks: 104 };
      if (coach.role === 'director_of_football') {
        hasDof = true;
        addCoach({ ...coach, ...contractFields, dofAutoRenewContracts: true, dofAutoAssignScouts: true, dofAutoSignPlayers: true });
      } else if (coach.role === 'facility_manager') {
        hasFacilityManager = true;
        addCoach({ ...coach, ...contractFields, facilityManagerAutoRepair: true });
      } else {
        addCoach({ ...coach, ...contractFields });
      }
    }

    for (const scout of assignedScouts) {
      addScout({ ...scout, contractEndWeek: weekNumber + 104, initialContractWeeks: 104 });
    }

    // Default pricing if DOF is present
    if (hasDof) {
      useClubStore.getState().updatePricing({ ticketPrice: 1500, shirtPrice: 2500, foodDrinksPrice: 500 });
    }

    // Suppress unused-variable warnings on flags that may be used for future automation
    void hasFacilityManager;

    // Initial sync
    {
      const { club } = useClubStore.getState();
      const { players: syncPlayers } = useSquadStore.getState();
      const { coaches: syncCoaches } = useCoachStore.getState();
      const { scouts: syncScouts } = useScoutStore.getState();
      const { levels: syncLevels } = require('@/stores/facilityStore').useFacilityStore.getState();
      syncQueue.enqueue({
        weekNumber,
        clientTimestamp:     new Date().toISOString(),
        earningsDelta:       0,
        balance:             club.balance,
        totalCareerEarnings: club.totalCareerEarnings ?? 0,
        reputationDelta:     0,
        reputation:          club.reputation,
        hallOfFamePoints:    club.hallOfFamePoints ?? 0,
        squadSize:           syncPlayers.filter((p) => p.isActive).length,
        staffCount:          syncCoaches.length + syncScouts.length,
        facilityLevels:      syncLevels,
        transfers:           [],
        ledger:              [],
      });
    }

    // Clear checkpoint data — init is now complete
    await clearInitCheckpoint();

    console.log(`[useInitFlow] Init complete: ${players.length}p / ${assignedCoaches.length}c / ${assignedScouts.length}s`);
  }

  // ─── Step 3: per-tier NPC data ────────────────────────────────────────────

  async function runStep3(
    leagues: InitLeague[],
    ampStarter: InitStarterResponse['ampStarter'],
    alreadyCompletedTiers: number[],
    currentTick: number,
  ): Promise<void> {
    const tierClubs: Record<number, WorldClub[]> = {};

    // Load already-cached tiers from AsyncStorage
    for (const tier of alreadyCompletedTiers) {
      const raw = await AsyncStorage.getItem(INIT_KEY.TIER_DATA(tier));
      if (raw) {
        tierClubs[tier] = JSON.parse(raw) as WorldClub[];
      }
    }

    let tick = currentTick;
    const completedTiers = [...alreadyCompletedTiers];

    for (const league of leagues) {
      if (alreadyCompletedTiers.includes(league.tier)) {
        // Already done in a prior run — advance tick silently
        tick++;
        setProgressTick(tick);
        setStepLabel(`Building Division ${league.tier}…`);
        continue;
      }

      setStepLabel(`Building Division ${league.tier}…`);

      try {
        const resp = await postInitializeLeagueTier(league.tier);
        tierClubs[league.tier] = resp.data.clubs;

        // Persist tier data
        await AsyncStorage.setItem(INIT_KEY.TIER_DATA(league.tier), JSON.stringify(resp.data.clubs));
        completedTiers.push(league.tier);
        await AsyncStorage.setItem(INIT_KEY.COMPLETED_TIERS, JSON.stringify(completedTiers));

        tick++;
        setProgressTick(tick);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // Tier doesn't exist for country — skip
          tick++;
          setProgressTick(tick);
          continue;
        }
        if (err instanceof ApiError && err.status === 412) {
          // Starter not initialized — restart from step 1
          await AsyncStorage.removeItem(INIT_KEY.STARTER_AT);
          await AsyncStorage.removeItem(INIT_KEY.AMP_STARTER);
          await AsyncStorage.removeItem(INIT_KEY.LEAGUES);
          await AsyncStorage.removeItem(INIT_KEY.COMPLETED_TIERS);
          setProgressTick(0);
          void runStep1();
          return;
        }
        const isNetwork = (err instanceof Error && err.name === 'AbortError') || !(err instanceof ApiError);
        showError(isNetwork ? 'network' : 'generic', `Failed to load Division ${league.tier}. Tap to retry.`);
        return;
      }
    }

    // All tiers done — finalize
    setStepLabel('Finalising world…');
    try {
      await finalize(ampStarter, leagues, tierClubs);
      onComplete();
    } catch (err) {
      console.error('[useInitFlow] finalize failed:', err);
      showError('generic', 'Something went wrong finalising the world. Tap to retry.');
    }
  }

  // ─── Step 2: league metadata ──────────────────────────────────────────────

  async function runStep2(
    ampStarter: InitStarterResponse['ampStarter'],
    alreadyCompletedTiers: number[],
  ): Promise<void> {
    setStepLabel('Loading league structure…');

    let leagues: InitLeague[];
    try {
      const resp = await getInitializeLeagues();
      leagues = resp.leagues;
      // Sort ascending by tier so step 3 iterates from highest prestige downward
      leagues.sort((a, b) => a.tier - b.tier);
      await AsyncStorage.setItem(INIT_KEY.LEAGUES, JSON.stringify(leagues));
    } catch (err) {
      if (err instanceof ApiError && err.status === 412) {
        // Starter not done — go back to step 1
        await AsyncStorage.removeItem(INIT_KEY.STARTER_AT);
        await AsyncStorage.removeItem(INIT_KEY.AMP_STARTER);
        setProgressTick(0);
        void runStep1();
        return;
      }
      const isNetwork = (err instanceof Error && err.name === 'AbortError') || !(err instanceof ApiError);
      showError(isNetwork ? 'network' : 'generic', 'Failed to load league structure. Tap to retry.');
      return;
    }

    const total = 2 + leagues.length;
    setTotalTicks(total);
    setProgressTick(2); // step 1 + step 2 complete

    await runStep3(leagues, ampStarter, alreadyCompletedTiers, 2);
  }

  // ─── Step 1: starter pack ─────────────────────────────────────────────────

  async function runStep1(countryOverride?: string | null): Promise<void> {
    setStepLabel('Assembling your squad…');
    setProgressTick(0);

    const country =
      countryOverride ??
      pendingCountryRef.current ??
      useClubStore.getState().club.country;

    try {
      const resp = await postInitializeStarter(country);

      await AsyncStorage.setItem(INIT_KEY.AMP_STARTER, JSON.stringify(resp.ampStarter));
      await AsyncStorage.setItem(INIT_KEY.STARTER_AT, new Date().toISOString());
      setProgressTick(1);

      await runStep2(resp.ampStarter, []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already initialized on server — treat as success; load cached starter if available
        const raw = await AsyncStorage.getItem(INIT_KEY.AMP_STARTER);
        if (raw) {
          const cached = JSON.parse(raw) as InitStarterResponse['ampStarter'];
          await AsyncStorage.setItem(INIT_KEY.STARTER_AT, new Date().toISOString());
          setProgressTick(1);
          await runStep2(cached, []);
        } else {
          // No cached starter despite 409 — unrecoverable without data; show generic error
          showError('generic', 'Initialization conflict. Please contact support.');
        }
        return;
      }

      if (err instanceof ApiError && err.status === 412) {
        showError('pool_too_small', 'Player pool too small. Please contact support.');
        return;
      }

      if (err instanceof ApiError && err.status === 422) {
        // Country not set — show picker
        setNeedsCountryPicker(true);
        return;
      }

      const isNetwork = (err instanceof Error && err.name === 'AbortError') || !(err instanceof ApiError);
      showError(isNetwork ? 'network' : 'generic', 'Failed to assemble starter squad. Tap to retry.');
    }
  }

  // ─── Main entry point ─────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    clearError();

    try {
      // Fast path: already fully initialized
      if (useWorldStore.getState().isInitialized) {
        onComplete();
        return;
      }

      // Check resume checkpoints
      const starterAt = await AsyncStorage.getItem(INIT_KEY.STARTER_AT);

      if (!starterAt) {
        // Start from step 1
        await runStep1();
        return;
      }

      // Step 1 already done — load cached starter
      const ampStarterRaw = await AsyncStorage.getItem(INIT_KEY.AMP_STARTER);
      if (!ampStarterRaw) {
        // Checkpoint inconsistency — restart from step 1
        await AsyncStorage.removeItem(INIT_KEY.STARTER_AT);
        await runStep1();
        return;
      }

      const ampStarter = JSON.parse(ampStarterRaw) as InitStarterResponse['ampStarter'];
      setProgressTick(1);

      // Load completed tiers
      const completedTiersRaw = await AsyncStorage.getItem(INIT_KEY.COMPLETED_TIERS);
      const completedTiers: number[] = completedTiersRaw ? (JSON.parse(completedTiersRaw) as number[]) : [];

      // Resume from step 2 (always re-fetch leagues — cheap GET, ensures fresh tier list)
      await runStep2(ampStarter, completedTiers);
    } finally {
      runningRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete]);

  const retry = useCallback(() => {
    clearError();
    void start();
  }, [start]);

  const selectCountry = useCallback((countryCode: string) => {
    pendingCountryRef.current = countryCode;
    useClubStore.getState().setCountry(countryCode as import('@/utils/nationality').ClubCountryCode);
    setNeedsCountryPicker(false);
    clearError();
    void runStep1(countryCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    stepLabel,
    progressTick,
    totalTicks,
    error,
    needsCountryPicker,
    start,
    retry,
    selectCountry,
  };
}
