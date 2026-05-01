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

// ─── Store-mutating steps ─────────────────────────────────────────────────────

/**
 * Apply a conclude-season API response to all stores.
 * Order: worldStore → leagueStore → inbox (if league changed) → fixtureStore.
 * Club-to-league assignment is taken verbatim from the backend response.
 */
export async function applySeasonResponse(
  responseLeagues: SeasonUpdateLeague[],
  currentLeague: LeagueSnapshot,
  nextSeason: number,
): Promise<void> {
  const { weekNumber } = useClubStore.getState().club;

  // 1. Update all NPC league memberships, club tiers, and per-league AsyncStorage buckets.
  await useWorldStore.getState().applySeasonUpdate(responseLeagues);

  // 2. Find AMP's new league using isAmp flag — authoritative signal per spec.
  const ampLeague = responseLeagues.find((l) => l.clubs.some((c) => c.isAmp));
  if (!ampLeague) {
    throw new Error('[SeasonTransitionService] applySeasonResponse: no league with isAmp club found in response');
  }

  useLeagueStore.getState().setFromSync(buildLeagueSnapshot(ampLeague, nextSeason));

  // 3. Inbox notification if the AMP has moved to a different league.
  if (ampLeague.id !== currentLeague.id) {
    const direction = ampLeague.tier < currentLeague.tier ? 'PROMOTED' : 'RELEGATED';
    useInboxStore.getState().addMessage({
      id:      uuidv7(),
      type:    'system',
      week:    weekNumber ?? 1,
      subject: `${direction} — Season ${nextSeason - 1} Complete`,
      body:    `You have been ${direction.toLowerCase()} to ${ampLeague.name}.`,
      isRead:  false,
    });
  }

  // 4. Replace all fixtures with server-generated schedule for the new season.
  useFixtureStore.getState().clearSeason();
  for (const l of responseLeagues) {
    useFixtureStore.getState().loadFromServerSchedule(l.id, nextSeason, l.fixtures);
  }
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

/**
 * Credit leagueStore-derived financial distributions to financeStore.
 * Uses ampSeasonLeague financials when available; falls back to currentLeague.
 * All API values are in pence — converted to pounds via penceToPounds.
 */
export function distributeSeasonFinances(
  ampSeasonLeague: SeasonUpdateLeague | undefined,
  currentLeague: LeagueSnapshot,
  nextSeason: number,
  finalPosition: number,
  weekNumber: number,
): void {
  const { addTransaction }   = useFinanceStore.getState();
  const currentSeason        = nextSeason - 1;
  const tvDeal               = ampSeasonLeague?.tvDeal                        ?? currentLeague.tvDeal                        ?? 0;
  const sponsorPot           = ampSeasonLeague?.sponsorPot                    ?? currentLeague.sponsorPot                    ?? 0;
  const prizeMoney           = ampSeasonLeague?.prizeMoney                    ?? currentLeague.prizeMoney                    ?? 0;
  const leaguePositionPot    = ampSeasonLeague?.leaguePositionPot             ?? currentLeague.leaguePositionPot             ?? 0;
  const leaguePositionDecPct = ampSeasonLeague?.leaguePositionDecreasePercent ?? currentLeague.leaguePositionDecreasePercent ?? 0;

  if (tvDeal > 0) {
    addTransaction({ amount: penceToPounds(tvDeal), category: 'tv_deal', description: `Season ${nextSeason} TV deal`, weekNumber });
  }
  if (sponsorPot > 0) {
    addTransaction({ amount: penceToPounds(sponsorPot), category: 'league_sponsor', description: `Season ${nextSeason} league sponsor`, weekNumber });
  }
  if (prizeMoney > 0) {
    addTransaction({ amount: penceToPounds(prizeMoney), category: 'earnings', description: `Season ${currentSeason} prize money (Pos ${finalPosition})`, weekNumber });
  }
  const posMultiplier = Math.max(0, 1 - (leaguePositionDecPct / 100) * (finalPosition - 1));
  const posPrize      = Math.round(leaguePositionPot * posMultiplier);
  if (posPrize > 0) {
    addTransaction({ amount: penceToPounds(posPrize), category: 'earnings', description: `Season ${currentSeason} position prize (Pos ${finalPosition})`, weekNumber });
  }
}

/**
 * Write the completed season's final standings to leagueHistoryStore.
 * Uses the displayStandings captured before store mutations — the authoritative
 * record of how the season actually ended.
 */
export function recordSeasonHistory(
  snapshot: SeasonTransitionSnapshot,
  displayStandings: SeasonStanding[],
  ampClubId: string,
): void {
  const { currentLeague, currentSeason, weekNumber } = snapshot;
  const totalClubs = displayStandings.length;
  useLeagueHistoryStore.getState().addSeasonRecord({
    tier:          currentLeague.tier,
    leagueName:    currentLeague.name,
    season:        currentSeason,
    weekCompleted: weekNumber,
    standings:     displayStandings.map((s, i) => {
      const pos = i + 1;
      return {
        clubId:         s.id,
        clubName:       s.name,
        isAmp:          s.id === ampClubId,
        position:       pos,
        played:         s.played,
        wins:           s.wins,
        draws:          s.draws,
        losses:         s.losses,
        goalsFor:       s.gf,
        goalsAgainst:   s.ga,
        goalDifference: s.gd,
        points:         s.pts,
        promoted:       currentLeague.promotionSpots != null && pos <= currentLeague.promotionSpots,
        relegated:      pos === totalClubs,
      };
    }),
  });
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * The single entry point called by SeasonEndOverlay.
 * Builds the pyramid payload, calls the conclude-season API, then applies
 * the response to all stores in the correct order.
 * Throws on API failure — there is no offline fallback.
 */
export async function performSeasonTransition(snapshot: SeasonTransitionSnapshot): Promise<void> {
  const { currentLeague, currentSeason } = snapshot;
  const nextSeason   = currentSeason + 1;
  const ampClubId    = useClubStore.getState().club.id;
  const worldLeagues = useWorldStore.getState().leagues;

  const pyramidLeagues = buildPyramidPayload(currentLeague.id, worldLeagues, currentSeason);

  const response = await concludeSeason({
    finalPosition: snapshot.finalPosition,
    gamesPlayed:   snapshot.gamesPlayed,
    wins:          snapshot.wins,
    draws:         snapshot.draws,
    losses:        snapshot.losses,
    goalsFor:      snapshot.goalsFor,
    goalsAgainst:  snapshot.goalsAgainst,
    points:        snapshot.points,
    promoted:      snapshot.promoted,
    relegated:     snapshot.relegated,
    pyramidSnapshot: { leagues: pyramidLeagues },
  });

  const responseLeagues: SeasonUpdateLeague[] = response.leagues ?? [];

  if (responseLeagues.length > 0) {
    await applySeasonResponse(responseLeagues, currentLeague, nextSeason);
    const ampSeasonLeague = responseLeagues.find((l) => l.clubs.some((c) => c.isAmp));
    distributeSeasonFinances(ampSeasonLeague, currentLeague, nextSeason, snapshot.finalPosition, snapshot.weekNumber);
  }

  recordSeasonHistory(snapshot, snapshot.displayStandings, ampClubId);
}
