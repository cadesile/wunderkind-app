import { useFixtureStore } from '@/stores/fixtureStore';
import { useMatchResultStore } from '@/stores/matchResultStore';
import { useClubStore } from '@/stores/clubStore';
import { useSquadStore } from '@/stores/squadStore';
import { useWorldStore } from '@/stores/worldStore';
import { useLeagueStore, selectCurrentSeason } from '@/stores/leagueStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useLeagueHistoryStore } from '@/stores/leagueHistoryStore';
import { concludeSeason } from '@/api/endpoints/season';
import type { PyramidStanding, PyramidLeague } from '@/api/endpoints/season';
import type { ClubSnapshot, LeagueSnapshot } from '@/types/api';
import type { SeasonUpdateLeague, WorldLeague } from '@/types/world';
import type { TrophyRecord, TrophyStandingEntry } from '@/types/club';
import type { GameConfig } from '@/types/gameConfig';
import { uuidv7 } from '@/utils/uuidv7';
import { penceToPounds } from '@/utils/currency';
import { useFanStore } from '@/stores/fanStore';
import type { FanImpactTarget } from '@/types/fans';
import { shouldRetire } from './retirementEngine';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';

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
  // Retirement config — passed from SeasonEndOverlay's gameConfigStore snapshot
  retirementMinAge: number;
  retirementMaxAge: number;
  retirementChance: number;
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
 * relegated: true is set for the bottom `relegationSpots` clubs.
 * promoted: true is set for clubs finishing in the top `promotionSpots` positions.
 * relegationSpots should equal the promotionSpots of the league one tier below so
 * the number of clubs going down always matches the number going up.
 */
export function buildLeagueStandings(
  leagueId: string,
  clubIds: string[],
  promotionSpots: number | null,
  relegationSpots: number,
  season: number,
): PyramidStanding[] {
  const ampClubId   = useClubStore.getState().club.id;
  const allFixtures = useFixtureStore.getState().fixtures;
  const worldClubs  = useWorldStore.getState().clubs;

  const pts:    Record<string, number> = {};
  const gd:     Record<string, number> = {};
  const gf:     Record<string, number> = {};
  const wins:   Record<string, number> = {};
  const draws:  Record<string, number> = {};
  const losses: Record<string, number> = {};
  for (const id of clubIds) {
    pts[id] = 0; gd[id] = 0; gf[id] = 0;
    wins[id] = 0; draws[id] = 0; losses[id] = 0;
  }

  for (const f of allFixtures) {
    if (f.leagueId !== leagueId || f.season !== season || !f.result) continue;
    const { homeGoals, awayGoals } = f.result;
    if (!(f.homeClubId in pts) || !(f.awayClubId in pts)) continue;
    if (homeGoals > awayGoals) {
      pts[f.homeClubId] += 3; wins[f.homeClubId]++;  losses[f.awayClubId]++;
    } else if (homeGoals === awayGoals) {
      pts[f.homeClubId] += 1; pts[f.awayClubId] += 1;
      draws[f.homeClubId]++; draws[f.awayClubId]++;
    } else {
      pts[f.awayClubId] += 3; wins[f.awayClubId]++;  losses[f.homeClubId]++;
    }
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
    // Relegate the bottom `relegationSpots` clubs. Guard total > relegationSpots to
    // avoid relegating all clubs in a very small league.
    relegated: relegationSpots > 0 && total > relegationSpots && (i + 1) > (total - relegationSpots),
    clubName:       worldClubs[clubId]?.name ?? '',
    wins:           wins[clubId] ?? 0,
    draws:          draws[clubId] ?? 0,
    losses:         losses[clubId] ?? 0,
    points:         pts[clubId] ?? 0,
    goalDifference: gd[clubId] ?? 0,
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
    // Relegation spots = promotionSpots of the league one tier below (same country).
    // This ensures the number of clubs going down matches the number going up.
    const leagueBelow = worldLeagues.find(
      (l) => l.tier === wLeague.tier + 1 && l.country === wLeague.country,
    );
    const relegationSpots = leagueBelow?.promotionSpots ?? 0;
    return {
      leagueId:  wLeague.id,
      standings: buildLeagueStandings(wLeague.id, clubIds, wLeague.promotionSpots, relegationSpots, season),
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
    addTransaction({ amount: Math.round(tvDeal), category: 'tv_deal', description: `Season ${nextSeason} TV deal`, weekNumber });
  }
  if (sponsorPot > 0) {
    addTransaction({ amount: Math.round(sponsorPot), category: 'league_sponsor', description: `Season ${nextSeason} league sponsor`, weekNumber });
  }
  if (prizeMoney > 0) {
    addTransaction({ amount: Math.round(prizeMoney), category: 'earnings', description: `Season ${currentSeason} prize money (Pos ${finalPosition})`, weekNumber });
  }
  const posMultiplier = Math.max(0, 1 - (leaguePositionDecPct / 100) * (finalPosition - 1));
  const posPrize      = Math.round(leaguePositionPot * posMultiplier);
  if (posPrize > 0) {
    addTransaction({ amount: Math.round(posPrize), category: 'earnings', description: `Season ${currentSeason} position prize (Pos ${finalPosition})`, weekNumber });
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
        relegated:      totalClubs > 1 && pos === totalClubs,
      };
    }),
  });
}

// ─── Retirement helpers ───────────────────────────────────────────────────────

/**
 * Retire eligible NPC players from all world clubs.
 * Mutates worldStore club rosters in-place (persists to AsyncStorage via mutateClubRoster).
 * NPC players aged >= retirementMaxAge are always removed; those in the voluntary window
 * are rolled against shouldRetire.
 */
export async function retireNPCPlayers(
  config: Pick<GameConfig, 'retirementMinAge' | 'retirementMaxAge' | 'retirementChance'>,
  weekNumber: number,
): Promise<void> {
  const { clubs } = useWorldStore.getState();
  const gameDate = getGameDate(weekNumber);

  for (const club of Object.values(clubs)) {
    const survivors = club.players.filter((p) => {
      const age = computePlayerAge(p.dateOfBirth, gameDate);
      return !shouldRetire(age, config.retirementMinAge, config.retirementMaxAge, config.retirementChance);
    });

    if (survivors.length !== club.players.length) {
      await useWorldStore.getState().mutateClubRoster(club.id, survivors);
    }
  }
}

/**
 * Retire eligible AMP players from squadStore.
 * Runs independent of the pre-game notification roll — players who reach retirementMaxAge
 * are always retired; voluntary retirees are re-rolled here.
 */
export function retireAMPPlayers(
  config: Pick<GameConfig, 'retirementMinAge' | 'retirementMaxAge' | 'retirementChance'>,
  weekNumber: number,
): void {
  const { players, removePlayer } = useSquadStore.getState();
  const gameDate = getGameDate(weekNumber);

  for (const player of players) {
    if (!player.dateOfBirth) continue;
    const age = computePlayerAge(player.dateOfBirth, gameDate);
    if (shouldRetire(age, config.retirementMinAge, config.retirementMaxAge, config.retirementChance)) {
      removePlayer(player.id);
    }
  }
}

// ─── Trophy awarding ──────────────────────────────────────────────────────────

/**
 * Award league title trophies at season end.
 * - Awards a TrophyRecord to the AMP club via clubStore when finalPosition === 1.
 * - Awards a TrophyRecord to each non-AMP NPC league winner via worldStore.
 */
export function awardSeasonTrophies(
  snapshot: SeasonTransitionSnapshot,
  pyramidLeagues: PyramidLeague[],
  responseLeagues: SeasonUpdateLeague[],
): void {
  if (snapshot.finalPosition === 1) {
    const ampTrophy: TrophyRecord = {
      type:          'league_title',
      tier:          snapshot.currentLeague.tier,
      leagueName:    snapshot.currentLeague.name,
      season:        snapshot.currentSeason,
      weekCompleted: snapshot.weekNumber,
      wins:          snapshot.wins,
      draws:         snapshot.draws,
      losses:        snapshot.losses,
      points:        snapshot.points,
      goalsFor:      snapshot.goalsFor,
      goalsAgainst:  snapshot.goalsAgainst,
      standings:     snapshot.displayStandings.map((s, idx): TrophyStandingEntry => ({
        clubId:         s.id,
        clubName:       s.name,
        position:       idx + 1,
        wins:           s.wins ?? 0,
        draws:          s.draws ?? 0,
        losses:         s.losses ?? 0,
        points:         s.pts,
        goalDifference: s.gd ?? 0,
      })),
    };
    useClubStore.getState().addTrophy(ampTrophy);
  }

  for (const league of pyramidLeagues) {
    const winnerStanding = league.standings[0];
    if (!winnerStanding) continue;
    if (winnerStanding.isAmp) continue;

    const responseLeague = responseLeagues.find((l) => l.id === league.leagueId);
    const leagueName = responseLeague?.name ?? league.leagueId;
    const leagueTier = responseLeague?.tier ?? 0;

    const npcTrophy: TrophyRecord = {
      type:          'league_title',
      tier:          leagueTier,
      leagueName,
      season:        snapshot.currentSeason,
      weekCompleted: snapshot.weekNumber,
      wins:          winnerStanding.wins,
      draws:         winnerStanding.draws,
      losses:        winnerStanding.losses,
      points:        winnerStanding.points,
      goalsFor:      0,
      goalsAgainst:  0,
      standings:     league.standings.map((s, idx): TrophyStandingEntry => ({
        clubId:         s.clubId,
        clubName:       s.clubName,
        position:       idx + 1,
        wins:           s.wins,
        draws:          s.draws,
        losses:         s.losses,
        points:         s.points,
        goalDifference: s.goalDifference,
      })),
    };
    useWorldStore.getState().addTrophyToClub(winnerStanding.clubId, npcTrophy);
  }
}

// ─── Fan event awarding ───────────────────────────────────────────────────────

/**
 * Fire permanent fan events for season-end outcomes (title, promotion, relegation).
 * Title win subsumes promotion — only one event is fired when finalPosition === 1.
 */
export function awardSeasonFanEvents(snapshot: SeasonTransitionSnapshot): void {
  const { addEvent } = useFanStore.getState();
  const ALL_TARGETS: FanImpactTarget[] = ['manager', 'owner', 'players'];

  if (snapshot.finalPosition === 1) {
    addEvent({
      type:        'trophy_won',
      description: `League title — ${snapshot.currentLeague.name} Season ${snapshot.currentSeason}`,
      impact:      30,
      weekNumber:  snapshot.weekNumber,
      targets:     ALL_TARGETS,
      isPermanent: true,
    });
    return; // title win subsumes promotion
  }

  if (snapshot.promoted) {
    addEvent({
      type:        'promoted',
      description: `Promoted from ${snapshot.currentLeague.name} Season ${snapshot.currentSeason}`,
      impact:      20,
      weekNumber:  snapshot.weekNumber,
      targets:     ALL_TARGETS,
      isPermanent: true,
    });
  }

  if (snapshot.relegated) {
    addEvent({
      type:        'relegated',
      description: `Relegated from ${snapshot.currentLeague.name} Season ${snapshot.currentSeason}`,
      impact:      -20,
      weekNumber:  snapshot.weekNumber,
      targets:     ALL_TARGETS,
      isPermanent: true,
    });
  }
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
  if (responseLeagues.length === 0) {
    throw new Error('[SeasonTransitionService] performSeasonTransition: server returned empty leagues array');
  }

  const ampSeasonLeague = responseLeagues.find((l) => l.clubs.some((c) => c.isAmp));
  await applySeasonResponse(responseLeagues, currentLeague, nextSeason);
  distributeSeasonFinances(ampSeasonLeague, currentLeague, nextSeason, snapshot.finalPosition, snapshot.weekNumber);
  recordSeasonHistory(snapshot, snapshot.displayStandings, ampClubId);

  // Retire players at season end — NPC clubs and AMP squad.
  // Runs after all store updates so league membership and rosters are final.
  const retirementConfig = {
    retirementMinAge:  snapshot.retirementMinAge,
    retirementMaxAge:  snapshot.retirementMaxAge,
    retirementChance:  snapshot.retirementChance,
  };
  await retireNPCPlayers(retirementConfig, snapshot.weekNumber);
  retireAMPPlayers(retirementConfig, snapshot.weekNumber);

  awardSeasonTrophies(snapshot, pyramidLeagues, responseLeagues);
  awardSeasonFanEvents(snapshot);

  // Prune match result records older than the previous season
  useMatchResultStore.getState().pruneOldSeasons(nextSeason);

  // Advance the persistent season counter
  useLeagueStore.getState().incrementSeason();
}
