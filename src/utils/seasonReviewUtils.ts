import { useWorldStore } from '@/stores/worldStore';
import { useLeagueStatsStore } from '@/stores/leagueStatsStore';
import { useSquadStore } from '@/stores/squadStore';
import { useClubStore } from '@/stores/clubStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { buildLeagueStandings } from '@/engine/SeasonTransitionService';

export interface TierReview {
  tier: number;
  /** One entry per league in this tier — the club that finished 1st. */
  winners: { clubId: string; clubName: string; leagueName: string }[];
  promotedClubs: { clubId: string; clubName: string }[];
  relegatedClubs: { clubId: string; clubName: string }[];
  goldenBoot: { playerName: string; clubName: string; goals: number }[];
  mostAssists: { playerName: string; clubName: string; assists: number }[];
}

/**
 * Snapshot all promotion/relegation outcomes and top scorers/assisters for every
 * tier that has league data.
 *
 * MUST be called BEFORE performSeasonTransition — the fixture store is cleared
 * during that call, which would make buildLeagueStandings return empty results.
 *
 * @param season  The just-completed season number.
 */
export function buildSeasonReviewData(season: number): TierReview[] {
  const { leagues, clubs } = useWorldStore.getState();
  const statsRecords        = useLeagueStatsStore.getState().records;
  const ampClub             = useClubStore.getState().club;
  const ampSquad            = useSquadStore.getState().players;
  // AMP's current league id (used to inject ampClubId into its league clubIds).
  const currentLeagueId     = useLeagueStore.getState().league?.id ?? null;

  // ── Name maps ──────────────────────────────────────────────────────────────

  const clubNames = new Map<string, string>();
  for (const club of Object.values(clubs)) {
    clubNames.set(club.id, club.name);
  }
  clubNames.set(ampClub.id, ampClub.name ?? '');

  const playerNames = new Map<string, string>();
  for (const club of Object.values(clubs)) {
    for (const p of club.players) {
      playerNames.set(p.id, `${p.firstName} ${p.lastName}`.trim());
    }
  }
  for (const p of ampSquad) {
    playerNames.set(p.id, p.name);
  }

  // ── Stats bucketed by tier ─────────────────────────────────────────────────

  // Build leagueId → tier so we can group stats records by tier.
  const leagueTierMap = new Map<string, number>();
  for (const l of leagues) {
    leagueTierMap.set(l.id, l.tier);
  }

  // Filter to the requested season and group by tier.
  const statsByTier = new Map<number, Array<{ playerId: string; clubId: string; goals: number; assists: number }>>();
  for (const r of Object.values(statsRecords)) {
    if (r.season !== season) continue;
    // Prefer the tier derived from worldStore leagues; fall back to the tier recorded on the stat.
    const tier = leagueTierMap.get(r.leagueId) ?? r.tier;
    if (!statsByTier.has(tier)) statsByTier.set(tier, []);
    statsByTier.get(tier)!.push({ playerId: r.playerId, clubId: r.clubId, goals: r.goals, assists: r.assists });
  }

  // ── Per-tier review ────────────────────────────────────────────────────────

  const tierNumbers = Array.from(new Set(leagues.map((l) => l.tier))).sort((a, b) => a - b);

  const results: TierReview[] = [];

  for (const tier of tierNumbers) {
    const tierLeagues = leagues.filter((l) => l.tier === tier);

    const winners: { clubId: string; clubName: string; leagueName: string }[] = [];
    const promotedClubs: { clubId: string; clubName: string }[] = [];
    const relegatedClubs: { clubId: string; clubName: string }[] = [];

    for (const league of tierLeagues) {
      const leagueBelow = leagues.find(
        (l) => l.tier === league.tier + 1 && l.country === league.country,
      );
      const relegationSpots = leagueBelow?.promotionSpots ?? 0;

      // Inject AMP club into its own league's club list (mirrors buildPyramidPayload).
      const clubIds = [...league.clubIds];
      if (league.id === currentLeagueId && ampClub.id) {
        clubIds.push(ampClub.id);
      }

      if (clubIds.length === 0) continue;

      const standings = buildLeagueStandings(
        league.id,
        clubIds,
        league.promotionSpots,
        relegationSpots,
        season,
      );

      // First place = league champion
      if (standings.length > 0) {
        const top = standings[0];
        const name = top.clubName || clubNames.get(top.clubId) || top.clubId;
        winners.push({ clubId: top.clubId, clubName: name, leagueName: league.name });
      }

      for (const s of standings) {
        const name = s.clubName || clubNames.get(s.clubId) || s.clubId;
        if (s.promoted)  promotedClubs.push({ clubId: s.clubId, clubName: name });
        if (s.relegated) relegatedClubs.push({ clubId: s.clubId, clubName: name });
      }
    }

    // ── Top 3 scorers for this tier ──────────────────────────────────────────

    const tierRecords = statsByTier.get(tier) ?? [];

    const goalMap = new Map<string, { goals: number; clubId: string }>();
    for (const r of tierRecords) {
      if (r.goals <= 0) continue;
      const prev = goalMap.get(r.playerId);
      if (prev) {
        prev.goals += r.goals;
      } else {
        goalMap.set(r.playerId, { goals: r.goals, clubId: r.clubId });
      }
    }
    const goldenBoot = Array.from(goalMap.entries())
      .sort((a, b) => b[1].goals - a[1].goals)
      .slice(0, 3)
      .map(([playerId, { goals, clubId }]) => ({
        playerName: playerNames.get(playerId) ?? playerId,
        clubName:   clubNames.get(clubId)     ?? clubId,
        goals,
      }));

    // ── Top 3 assisters for this tier ────────────────────────────────────────

    const assistMap = new Map<string, { assists: number; clubId: string }>();
    for (const r of tierRecords) {
      if (r.assists <= 0) continue;
      const prev = assistMap.get(r.playerId);
      if (prev) {
        prev.assists += r.assists;
      } else {
        assistMap.set(r.playerId, { assists: r.assists, clubId: r.clubId });
      }
    }
    const mostAssists = Array.from(assistMap.entries())
      .sort((a, b) => b[1].assists - a[1].assists)
      .slice(0, 3)
      .map(([playerId, { assists, clubId }]) => ({
        playerName: playerNames.get(playerId) ?? playerId,
        clubName:   clubNames.get(clubId)     ?? clubId,
        assists,
      }));

    // Skip tiers that have no meaningful data at all.
    if (
      promotedClubs.length === 0 &&
      relegatedClubs.length === 0 &&
      goldenBoot.length === 0 &&
      mostAssists.length === 0
    ) {
      continue;
    }

    results.push({ tier, winners, promotedClubs, relegatedClubs, goldenBoot, mostAssists });
  }

  return results;
}
