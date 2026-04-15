import type { Fixture } from '@/stores/fixtureStore';
import type { ClubSnapshot } from '@/types/api';

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export function computeStandings(
  fixtures: Fixture[],
  clubs: ClubSnapshot[],
  ampClubId: string
): StandingRow[] {
  const allIds = new Set<string>([ampClubId, ...clubs.map((c) => c.id)]);

  const rows = new Map<string, StandingRow>();
  for (const id of allIds) {
    rows.set(id, {
      clubId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const fixture of fixtures) {
    if (fixture.result === null) continue;
    const { homeGoals, awayGoals } = fixture.result;

    const home = rows.get(fixture.homeClubId);
    if (home) {
      home.played++;
      home.goalsFor += homeGoals;
      home.goalsAgainst += awayGoals;
      if (homeGoals > awayGoals) { home.won++; home.points += 3; }
      else if (homeGoals === awayGoals) { home.drawn++; home.points += 1; }
      else { home.lost++; }
    }

    const away = rows.get(fixture.awayClubId);
    if (away) {
      away.played++;
      away.goalsFor += awayGoals;
      away.goalsAgainst += homeGoals;
      if (awayGoals > homeGoals) { away.won++; away.points += 3; }
      else if (awayGoals === homeGoals) { away.drawn++; away.points += 1; }
      else { away.lost++; }
    }
  }

  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.clubId.localeCompare(b.clubId);
  });
}
