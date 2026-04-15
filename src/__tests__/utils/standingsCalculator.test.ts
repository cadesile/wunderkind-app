import { computeStandings } from '@/utils/standingsCalculator';
import type { Fixture } from '@/stores/fixtureStore';
import type { ClubSnapshot } from '@/types/api';

const makeClub = (id: string): ClubSnapshot => ({
  id,
  name: `Club ${id}`,
  reputation: 50,
  tier: 1,
  primaryColor: '#fff',
  secondaryColor: '#000',
  stadiumName: null,
  facilities: {},
});

const makeFixture = (
  id: string,
  homeClubId: string,
  awayClubId: string,
  homeGoals: number | null,
  awayGoals: number | null
): Fixture => ({
  id,
  leagueId: 'league-1',
  season: 1,
  round: 1,
  homeClubId,
  awayClubId,
  result:
    homeGoals !== null && awayGoals !== null
      ? { homeGoals, awayGoals, playedAt: '2026-01-01T00:00:00Z', synced: false }
      : null,
});

describe('computeStandings', () => {
  it('returns a row for every club with zero stats when no results', () => {
    const clubs = [makeClub('npc-1'), makeClub('npc-2')];
    const rows = computeStandings([], clubs, 'amp');
    expect(rows).toHaveLength(3); // amp + 2 NPCs
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it('credits a win to the home team', () => {
    const clubs = [makeClub('npc-1')];
    const fixtures = [makeFixture('f1', 'amp', 'npc-1', 3, 1)];
    const rows = computeStandings(fixtures, clubs, 'amp');
    const amp = rows.find((r) => r.clubId === 'amp')!;
    expect(amp.won).toBe(1);
    expect(amp.points).toBe(3);
    const npc = rows.find((r) => r.clubId === 'npc-1')!;
    expect(npc.lost).toBe(1);
    expect(npc.points).toBe(0);
  });

  it('credits an away win correctly', () => {
    const clubs = [makeClub('npc-1')];
    const fixtures = [makeFixture('f1', 'npc-1', 'amp', 0, 2)];
    const rows = computeStandings(fixtures, clubs, 'amp');
    const amp = rows.find((r) => r.clubId === 'amp')!;
    expect(amp.won).toBe(1);
    expect(amp.points).toBe(3);
  });

  it('credits a draw with 1 point each', () => {
    const clubs = [makeClub('npc-1')];
    const fixtures = [makeFixture('f1', 'amp', 'npc-1', 1, 1)];
    const rows = computeStandings(fixtures, clubs, 'amp');
    const amp = rows.find((r) => r.clubId === 'amp')!;
    expect(amp.drawn).toBe(1);
    expect(amp.points).toBe(1);
  });

  it('skips unplayed fixtures', () => {
    const clubs = [makeClub('npc-1')];
    const fixtures = [makeFixture('f1', 'amp', 'npc-1', null, null)];
    const rows = computeStandings(fixtures, clubs, 'amp');
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it('sorts by points DESC then GD DESC then GF DESC then clubId ASC', () => {
    const clubs = [makeClub('b'), makeClub('c')];
    // amp: 3pts 0GD;  b: 3pts +1GD;  c: 0pts
    const fixtures = [
      makeFixture('f1', 'amp', 'c', 1, 0),  // amp wins
      makeFixture('f2', 'b',   'c', 2, 1),  // b wins with better GD
    ];
    const rows = computeStandings(fixtures, clubs, 'amp');
    expect(rows[0].clubId).toBe('b');   // 3pts, GD+1
    expect(rows[1].clubId).toBe('amp'); // 3pts, GD0
    expect(rows[2].clubId).toBe('c');   // 0pts
  });

  it('computes goalDifference correctly', () => {
    const clubs = [makeClub('npc-1')];
    const fixtures = [makeFixture('f1', 'amp', 'npc-1', 4, 1)];
    const rows = computeStandings(fixtures, clubs, 'amp');
    const amp = rows.find((r) => r.clubId === 'amp')!;
    expect(amp.goalsFor).toBe(4);
    expect(amp.goalsAgainst).toBe(1);
    expect(amp.goalDifference).toBe(3);
  });
});
