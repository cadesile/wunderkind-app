import AsyncStorage from '@react-native-async-storage/async-storage'; // kept for one-time upgrade migration only
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import type { WorldClub, WorldLeague, WorldPackResponse, WorldPlayer, SeasonUpdateLeague } from '@/types/world';
import type { TrophyRecord } from '@/types/club';
import { useClubStore } from '@/stores/clubStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useFinanceStore } from '@/stores/financeStore';
import { penceToPounds } from '@/utils/currency';
import { generateAppearance } from '@/engine/appearance';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import type { ClubSnapshot, LeagueSnapshot } from '@/types/api';
import { getDatabase } from '@/db/client';
import { upsertClub, upsertClubs, loadAllClubs } from '@/db/repositories/worldClubRepository';

/** Prefix used by the old AsyncStorage club storage — used for migration only. */
const LEGACY_CLUBS_KEY_PREFIX = 'worldStore_clubs_';

const VALID_REPUTATION_TIERS = ['local', 'regional', 'national', 'elite'] as const;

/**
 * Maximum reputation (0–100) for an NPC club based on their world-tier league.
 * Mirrors the LEAGUE_TIER_REP_CAP thresholds used for the AMP club.
 */
function reputationCapForWorldTier(worldTier: number): number {
  if (worldTier <= 2) return 100;
  if (worldTier <= 4) return 74;
  if (worldTier <= 6) return 39;
  return 14;
}

const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'] as const;

/**
 * Maximum reputation score while in a league of each tier.
 * Prevents the club's reputationTier from advancing beyond the league tier
 * without actual promotion.
 */
const LEAGUE_TIER_REP_CAP: Record<string, number> = {
  local:    14,
  regional: 39,
  national: 74,
  elite:    100,
};

interface WorldState {
  isInitialized: boolean;
  leagues: WorldLeague[];
  /** In-memory club map indexed by clubId. NOT persisted via Zustand — loaded via loadClubs(). */
  clubs: Record<string, WorldClub>;
  /** ID of the WorldLeague the AMP was placed into at world init. null until init runs. */
  ampLeagueId: string | null;
  /** null = ok; non-null = one or more league club keys failed to parse on load */
  clubsLoadError: string | null;
  /** Called once on app start after Zustand rehydrates meta. Loads per-league club data from AsyncStorage. */
  loadClubs: () => Promise<void>;
  /** Called once on successful POST /api/initialize. Persists everything and sets isInitialized. */
  setFromWorldPack: (pack: WorldPackResponse['worldPack']) => Promise<void>;
  getClub: (clubId: string) => WorldClub | undefined;
  getLeagueClubs: (leagueId: string) => WorldClub[];
  /**
   * Update a single club's player roster and re-persist it to AsyncStorage.
   * Called by MarketEngine after NPC-to-NPC transfers.
   */
  mutateClubRoster: (clubId: string, updatedPlayers: WorldPlayer[]) => Promise<void>;
  /**
   * Replace all league + club data from a conclude-season API response.
   * AMP league placement is derived from the isAmp flag on the clubs array.
   * Persists per-league clubs to AsyncStorage.
   */
  applySeasonUpdate: (responseLeagues: SeasonUpdateLeague[]) => Promise<void>;
  addTrophyToClub: (clubId: string, trophy: TrophyRecord) => Promise<void>;
}

export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      leagues: [],
      clubs: {},
      ampLeagueId: null,
      clubsLoadError: null,

      setFromWorldPack: async (pack) => {
        const leagues: WorldLeague[] = [];
        const clubs: Record<string, WorldClub> = {};
        const gameDate = getGameDate(1); // Default to Week 1 for world init age calculation

        // Build leagues + clubs, writing each league's club map to AsyncStorage with verification.
        // Throws on any write failure so the caller (useAuthFlow) is notified loudly.
        for (const leagueData of pack.leagues) {
          const clubIds = leagueData.clubs.map((c) => c.id);
          leagues.push({
            id:             leagueData.id,
            tier:           leagueData.tier,
            name:           leagueData.name,
            country:        leagueData.country,
            promotionSpots: leagueData.promotionSpots,
            reputationTier: leagueData.reputationTier,
            clubIds,
          });

          const builtClubs: WorldClub[] = [];
          for (const club of leagueData.clubs) {
            const builtClub: WorldClub = {
              ...club,
              formation: FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)],
              players: club.players.map((p) => ({
                ...p,
                npcClubId: club.id,
                appearance: generateAppearance(p.id, 'PLAYER', computePlayerAge(p.dateOfBirth, gameDate), p.personality),
              })),
              staff: club.staff.map((s) => ({
                ...s,
                appearance: generateAppearance(s.id, s.role === 'scout' ? 'SCOUT' : 'COACH', 35),
              })),
            };
            clubs[builtClub.id] = builtClub;
            builtClubs.push(builtClub);
          }

          await upsertClubs(getDatabase(), leagueData.id, builtClubs);
        }

        // Find the bottom league for the AMP's country (highest tier number = lowest prestige).
        const ampClub = useClubStore.getState().club;
        const ampCountry = ampClub?.country ?? null;
        const ampClubId  = ampClub?.id ?? null;

        const bottomLeague = ampCountry
          ? leagues
              .filter((l) => l.country === ampCountry)
              .sort((a, b) => b.tier - a.tier)[0] ?? null
          : null;

        const ampLeagueId = bottomLeague?.id ?? null;

        // Wire leagueStore and fixtureStore if we found a bottom league and have an AMP club id.
        // These must succeed before set() so worldStore is never persisted as isInitialized: true
        // with incomplete league/fixture state.
        if (bottomLeague && ampClubId) {
          const clubSnapshots: ClubSnapshot[] = bottomLeague.clubIds
            .map((id) => clubs[id])
            .filter((c): c is WorldClub => c !== undefined)
            .map((c) => ({
              id:             c.id,
              name:           c.name,
              reputation:     c.reputation,
              tier:           c.tier,
              primaryColor:   c.primaryColor,
              secondaryColor: c.secondaryColor,
              stadiumName:    c.stadiumName,
              facilities:     c.facilities,
            }));

          // Read financial fields from the matching world pack league entry
          const ampLeagueData = pack.leagues.find((l) => l.id === bottomLeague.id);
          const tvDeal                        = ampLeagueData?.tvDeal                        ?? 0;
          const sponsorPot                    = ampLeagueData?.sponsorPot                    ?? 0;
          const prizeMoney                    = ampLeagueData?.prizeMoney                    ?? 0;
          const leaguePositionPot             = ampLeagueData?.leaguePositionPot             ?? 0;
          const leaguePositionDecreasePercent = ampLeagueData?.leaguePositionDecreasePercent ?? 0;

          const syntheticLeague: LeagueSnapshot = {
            id:                            bottomLeague.id,
            tier:                          bottomLeague.tier,
            name:                          bottomLeague.name,
            country:                       bottomLeague.country,
            season:                        1,
            promotionSpots:                bottomLeague.promotionSpots,
            reputationTier:                (VALID_REPUTATION_TIERS as readonly string[]).includes(bottomLeague.reputationTier ?? '')
                                             ? (bottomLeague.reputationTier as LeagueSnapshot['reputationTier'])
                                             : null,
            reputationCap:                 bottomLeague.reputationTier
                                             ? (LEAGUE_TIER_REP_CAP[bottomLeague.reputationTier] ?? null)
                                             : null,
            tvDeal:                        tvDeal   || null,
            sponsorPot,
            prizeMoney:                    prizeMoney           || null,
            leaguePositionPot:             leaguePositionPot    || null,
            leaguePositionDecreasePercent,
            clubs:                         clubSnapshots,
          };

          useLeagueStore.getState().setFromSync(syntheticLeague);

          // Credit Season 1 TV deal and league sponsor pot immediately — covers the whole season upfront
          {
            const weekNumber = useClubStore.getState().club.weekNumber ?? 1;
            if (tvDeal > 0) {
              useFinanceStore.getState().addTransaction({
                amount:      tvDeal,
                category:    'tv_deal',
                description: 'Season 1 TV deal',
                weekNumber,
              });
            }
            if (sponsorPot > 0) {
              useFinanceStore.getState().addTransaction({
                amount:      sponsorPot,
                category:    'league_sponsor',
                description: 'Season 1 league sponsor',
                weekNumber,
              });
            }
          }

          useFixtureStore.getState().generateFixturesFromWorldLeague(bottomLeague, 1, ampClubId);
        } else if (!bottomLeague) {
          if (ampCountry) {
            console.warn(`[WorldStore] setFromWorldPack: no league found for AMP country "${ampCountry}" — league/fixture wiring skipped`);
          } else {
            console.warn('[WorldStore] setFromWorldPack: AMP club has no country set — league/fixture wiring skipped');
          }
        }

        // Generate fixtures for every non-AMP league so Browse tables stay live
        for (const league of leagues) {
          if (league.id !== ampLeagueId) {
            useFixtureStore.getState().generateFixturesFromWorldLeague(league, 1);
          }
        }

        // set() is LAST — only called after all wiring succeeds so worldStore is never persisted
        // as isInitialized: true with incomplete cross-store state.
        set({ isInitialized: true, leagues, clubs, ampLeagueId });
      },

      loadClubs: async () => {
        const db = getDatabase();
        let clubs = await loadAllClubs(db);

        // One-time migration: if SQLite is empty but old AsyncStorage data exists,
        // migrate each league's clubs into SQLite then remove the legacy keys.
        if (Object.keys(clubs).length === 0 && get().isInitialized) {
          const { leagues } = get();
          for (const league of leagues) {
            const raw = await AsyncStorage.getItem(`${LEGACY_CLUBS_KEY_PREFIX}${league.id}`);
            if (!raw) continue;
            try {
              const leagueClubs = JSON.parse(raw) as Record<string, WorldClub>;
              await upsertClubs(db, league.id, Object.values(leagueClubs));
              await AsyncStorage.removeItem(`${LEGACY_CLUBS_KEY_PREFIX}${league.id}`);
            } catch (e) {
              console.warn(`[WorldStore] Migration failed for league ${league.id}:`, e);
            }
          }
          clubs = await loadAllClubs(db);
        }

        set({ clubs, clubsLoadError: null });
      },

      getClub: (clubId) => get().clubs[clubId],

      getLeagueClubs: (leagueId) => {
        const league = get().leagues.find((l) => l.id === leagueId);
        if (!league) return [];
        const { clubs } = get();
        return league.clubIds
          .map((id) => clubs[id])
          .filter((c): c is WorldClub => c !== undefined);
      },

      applySeasonUpdate: async (responseLeagues) => {
        // Derive the AMP's new league from the isAmp flag — authoritative from server
        const ampLeagueEntry = responseLeagues.find((l) => l.clubs.some((c) => c.isAmp));
        const updatedAmpLeagueId = ampLeagueEntry?.id ?? get().ampLeagueId;

        // Rebuild WorldLeague metadata.
        // NPC club rosters are NOT replaced — only clubIds, league metadata, and club.tier update.
        // AMP is excluded from clubIds (it is the player's own club, not an NPC).
        // Each club appears in exactly one league in the backend response — its correct new assignment.
        // relegated/promoted flags describe the club's status; they do not affect league membership.
        const leagues: WorldLeague[] = responseLeagues.map((l) => ({
          id:             l.id,
          tier:           l.tier,
          name:           l.name,
          country:        l.country,
          promotionSpots: l.promotionSpots,
          reputationTier: l.reputationTier,
          clubIds:        l.clubs.filter((c) => !c.isAmp).map((c) => c.clubId),
        }));

        // Update every NPC club's tier to match their new league assignment.
        // Tier is now derived from the parent league (l.tier), not the club entry.
        const currentClubs = get().clubs;
        const updatedClubs: Record<string, WorldClub> = { ...currentClubs };

        for (const l of responseLeagues) {
          for (const slim of l.clubs) {
            if (slim.isAmp) continue; // AMP not in worldClubs
            const existing = updatedClubs[slim.clubId];
            if (existing) {
              // Update tier to match new league. Also clamp reputation so a relegated
              // club's reputation cannot exceed the new (lower) league's cap.
              const repCap = reputationCapForWorldTier(l.tier);
              updatedClubs[slim.clubId] = {
                ...existing,
                tier:       l.tier,
                reputation: Math.min(existing.reputation, repCap),
              };
            }
          }
        }

        // Persist ALL leagues to SQLite — directly follow the backend's assignment.
        // No dirty-tracking: every league gets its authoritative club map written.
        const db = getDatabase();
        for (const l of responseLeagues) {
          const npcClubIds = l.clubs.filter((c) => !c.isAmp).map((c) => c.clubId);
          const leagueClubs = npcClubIds.flatMap((id) => (updatedClubs[id] ? [updatedClubs[id]] : []));
          await upsertClubs(db, l.id, leagueClubs);
        }

        set({
          leagues,
          clubs: updatedClubs,
          ampLeagueId: updatedAmpLeagueId,
        });
      },

      mutateClubRoster: async (clubId, updatedPlayers) => {
        const { clubs, leagues } = get();
        const club = clubs[clubId];
        if (!club) return;

        const updatedClub = { ...club, players: updatedPlayers };
        set((s) => ({ clubs: { ...s.clubs, [clubId]: updatedClub } }));

        const leagueId = leagues.find((l) => l.clubIds.includes(clubId))?.id;
        if (!leagueId) return;
        await upsertClub(getDatabase(), updatedClub, leagueId);
      },

      addTrophyToClub: async (clubId, trophy) => {
        const { clubs, leagues } = get();
        const club = clubs[clubId];
        if (!club) return;

        const updatedClub = { ...club, trophies: [...(club.trophies ?? []), trophy] };
        set((s) => ({ clubs: { ...s.clubs, [clubId]: updatedClub } }));

        const leagueId = leagues.find((l) => l.clubIds.includes(clubId))?.id;
        if (!leagueId) return;
        await upsertClub(getDatabase(), updatedClub, leagueId);
      },

    }),
    {
      name: 'worldStore_meta',
      storage: zustandStorage,
      partialize: (state) => ({
        isInitialized: state.isInitialized,
        leagues:       state.leagues,
        ampLeagueId:   state.ampLeagueId,
        // clubs excluded — stored per-league in AsyncStorage
        // clubsLoadError excluded — transient, reset on each loadClubs call
      }),
    },
  ),
);
