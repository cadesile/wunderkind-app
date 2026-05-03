import type { TrophyRecord, TrophyStandingEntry } from '@/types/club';

describe('TrophyRecord type', () => {
  it('can construct a valid TrophyRecord', () => {
    const entry: TrophyStandingEntry = {
      clubId: 'club-1',
      clubName: 'FC Test',
      position: 1,
      wins: 20,
      draws: 10,
      losses: 8,
      points: 70,
      goalDifference: 25,
    };
    const trophy: TrophyRecord = {
      type: 'league_title',
      tier: 3,
      leagueName: 'Northern League',
      season: 1,
      weekCompleted: 38,
      wins: 20,
      draws: 10,
      losses: 8,
      points: 70,
      goalsFor: 65,
      goalsAgainst: 40,
      standings: [entry],
    };
    expect(trophy.type).toBe('league_title');
    expect(trophy.standings).toHaveLength(1);
    expect(trophy.standings[0].clubName).toBe('FC Test');
  });
});
