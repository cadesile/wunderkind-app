import { useFixtureStore } from '@/stores/fixtureStore';
import { useClubStore } from '@/stores/clubStore';
import { useWorldStore } from '@/stores/worldStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useLeagueHistoryStore } from '@/stores/leagueHistoryStore';
import { concludeSeason } from '@/api/endpoints/season';
import type { PyramidStanding, PyramidLeague } from '@/api/endpoints/season';
import type { ClubSnapshot, LeagueSnapshot } from '@/types/api';
import type { SeasonUpdateLeague, WorldLeague } from '@/types/world';
import { uuidv7 } from '@/utils/uuidv7';
import { penceToPounds } from '@/utils/currency';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Pre-transition snapshot built by SeasonEndOverlay before any store mutations.
 * Passed as the single argument to performSeasonTransition.
 */
export interface SeasonTransitionSnapshot {
  currentLeague:    LeagueSnapshot;
  currentSeason:    number;
  finalPosition:    number;
  promoted:         boolean;
  relegated:        boolean;
  weekNumber:       number;
  // AMP's season stats for the conclude-season API payload
  gamesPlayed:      number;
  wins:             number;
  draws:            number;
  losses:           number;
  goalsFor:         number;
  goalsAgainst:     number;
  points:           number;
  // Full captured standings table for history recording
  displayStandings: SeasonStanding[];
}

/**
 * Per-club display entry captured from the live standings useMemo in SeasonEndOverlay.
 * Replaces the local Standing interface in that component.
 */
export interface SeasonStanding {
  id:           string;
  name:         string;
  primaryColor: string;
  pts:          number;
  gd:           number;
  gf:           number;
  ga:           number;
  played:       number;
  wins:         number;
  draws:        number;
  losses:       number;
}

// ─── Internal constants ───────────────────────────────────────────────────────

type RepTier = Exclude<LeagueSnapshot['reputationTier'], null>;
const VALID_REP_TIERS: readonly RepTier[] = ['local', 'regional', 'national', 'elite'];

const LEAGUE_TIER_REP_CAP: Record<string, number> = {
  local: 14, regional: 39, national: 74, elite: 100,
};

// ─── Read-only helpers ────────────────────────────────────────────────────────

/**
 * Derive PyramidStanding[] for a league from recorded fixture results.
 * Reads fixtureStore (read-only). Works for both the AMP's league and NPC leagues.
 * relegated: true is set only for the last-place club.
 * promoted: true is set for clubs finishing in the top `promotionSpots` positions.
 */
export function buildLeagueStandings(
  leagueId: string,
  clubIds: string[],
  promotionSpots: number | null,
  season: number,
): PyramidStanding[] {
  const ampClubId   = useClubStore.getState().club.id;
  const allFixtures = useFixtureStore.getState().fixtures;

  const pts: Record<string, number> = {};
  const gd:  Record<string, number> = {};
  const gf:  Record<string, number> = {};
  for (const id of clubIds) { pts[id] = 0; gd[id] = 0; gf[id] = 0; }

  for (const f of allFixtures) {
    if (f.leagueId !== leagueId || f.season !== season || !f.result) continue;
    const { homeGoals, awayGoals } = f.result;
    if (!(f.homeClubId in pts) || !(f.awayClubId in pts)) continue;
    pts[f.homeClubId] += homeGoals > awayGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
    pts[f.awayClubId] += awayGoals > homeGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
    gd[f.homeClubId]  += homeGoals - awayGoals;
    gd[f.awayClubId]  += awayGoals - homeGoals;
    gf[f.homeClubId]  += homeGoals;
    gf[f.awayClubId]  += awayGoals;
  }

  const sorted = clubIds.slice().sort(
    (a, b) => (pts[b] - pts[a]) || (gd[b] - gd[a]) || (gf[b] - gf[a]),
  );
  const total = sorted.length;
  return sorted.map((clubId, i) => ({
    clubId,
    isAmp:     clubId === ampClubId,
    promoted:  promotionSpots != null && (i + 1) <= promotionSpots,
    relegated: total > 1 && (i + 1) === total,
  }));
}

/**
 * Build the full pyramid payload for the conclude-season API call.
 * Includes the AMP club in its own league's clubIds.
 * Reads clubStore and fixtureStore (read-only).
 */
export function buildPyramidPayload(
  currentLeagueId: string,
  worldLeagues: WorldLeague[],
  season: number,
): PyramidLeague[] {
  const ampClubId = useClubStore.getState().club.id;
  return worldLeagues.map((wLeague) => {
    // worldLeague.clubIds contains only NPC clubs — AMP is never stored there.
    // We inject ampClubId here so the API receives the full league membership.
    const clubIds = wLeague.id === currentLeagueId
      ? [...wLeague.clubIds, ampClubId]
      : wLeague.clubIds;
    return {
      leagueId:  wLeague.id,
      standings: buildLeagueStandings(wLeague.id, clubIds, wLeague.promotionSpots, season),
    };
  });
}

/**
 * Build a LeagueSnapshot for leagueStore from a SeasonUpdateLeague API entry.
 * Each club appears in exactly one league in the backend response — no deduplication needed.
 * AMP club (isAmp: true) is excluded from the clubs array.
 * promoted/relegated flags have zero effect on league membership.
 */
export function buildLeagueSnapshot(
  seasonLeague: SeasonUpdateLeague,
  season: number,
): LeagueSnapshot {
  const raw = seasonLeague.reputationTier;
  const repTier: LeagueSnapshot['reputationTier'] =
    raw !== null && (VALID_REP_TIERS as readonly string[]).includes(raw)
      ? (raw as RepTier)
      : null;

  const worldClubs = useWorldStore.getState().clubs;
  const clubs: ClubSnapshot[] = seasonLeague.clubs
    .filter((slim) => !slim.isAmp)
    .map((slim) => {
      const full = worldClubs[slim.clubId];
      return full
        ? {
            id:             full.id,
            name:           full.name,
            reputation:     full.reputation,
            tier:           seasonLeague.tier,
            primaryColor:   full.primaryColor,
            secondaryColor: full.secondaryColor,
            stadiumName:    full.stadiumName,
            facilities:     full.facilities,
          }
        : {
            id:             slim.clubId,
            name:           slim.clubId,
            reputation:     0,
            tier:           seasonLeague.tier,
            primaryColor:   '#888888',
            secondaryColor: '#444444',
            stadiumName:    null,
            facilities:     {},
          };
    });

  return {
    id:                            seasonLeague.id,
    tier:                          seasonLeague.tier,
    name:                          seasonLeague.name,
    country:                       seasonLeague.country,
    season,
    promotionSpots:                seasonLeague.promotionSpots,
    reputationTier:                repTier,
    reputationCap:                 repTier ? (LEAGUE_TIER_REP_CAP[repTier] ?? null) : null,
    tvDeal:                        seasonLeague.tvDeal,
    sponsorPot:                    seasonLeague.sponsorPot,
    prizeMoney:                    seasonLeague.prizeMoney,
    leaguePositionPot:             seasonLeague.leaguePositionPot,
    leaguePositionDecreasePercent: seasonLeague.leaguePositionDecreasePercent,
    clubs,
  };
}
