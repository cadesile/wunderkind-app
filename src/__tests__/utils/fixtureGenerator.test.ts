import { generateRoundRobin, GeneratedFixture } from '@/utils/fixtureGenerator';

describe('generateRoundRobin', () => {
  it('produces correct number of rounds for even participant count', () => {
    const teams = ['a', 'b', 'c', 'd']; // N=4, rounds=3
    const fixtures = generateRoundRobin(teams);
    const rounds = new Set(fixtures.map((f) => f.round));
    expect(rounds.size).toBe(3);
  });

  it('produces correct number of rounds for odd participant count', () => {
    // N=3 → adds bye → N=4, rounds=3
    const teams = ['a', 'b', 'c'];
    const fixtures = generateRoundRobin(teams);
    const rounds = new Set(fixtures.map((f) => f.round));
    expect(rounds.size).toBe(3);
  });

  it('each pair appears exactly once', () => {
    const teams = ['a', 'b', 'c', 'd'];
    const fixtures = generateRoundRobin(teams);
    const pairs = fixtures.map((f) => [f.homeClubId, f.awayClubId].sort().join('|'));
    const uniquePairs = new Set(pairs);
    expect(uniquePairs.size).toBe(6);
    expect(fixtures.length).toBe(6);
  });

  it('each team appears in exactly N-1 fixtures (no byes for even teams)', () => {
    const teams = ['a', 'b', 'c', 'd'];
    const fixtures = generateRoundRobin(teams);
    for (const team of teams) {
      const count = fixtures.filter(
        (f) => f.homeClubId === team || f.awayClubId === team
      ).length;
      expect(count).toBe(3);
    }
  });

  it('excludes bye fixtures from output', () => {
    const teams = ['a', 'b', 'c'];
    const fixtures = generateRoundRobin(teams);
    const hasBye = fixtures.some(
      (f) => f.homeClubId === 'bye' || f.awayClubId === 'bye'
    );
    expect(hasBye).toBe(false);
  });

  it('each real team in odd set plays 2 fixtures (sits out 1 round)', () => {
    const teams = ['a', 'b', 'c'];
    const fixtures = generateRoundRobin(teams);
    for (const team of teams) {
      const count = fixtures.filter(
        (f) => f.homeClubId === team || f.awayClubId === team
      ).length;
      expect(count).toBe(2);
    }
  });

  it('round numbers are 1-based and sequential', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f']; // N=6, rounds=5
    const fixtures = generateRoundRobin(teams);
    const rounds = [...new Set(fixtures.map((f) => f.round))].sort((a, b) => a - b);
    expect(rounds).toEqual([1, 2, 3, 4, 5]);
  });

  it('each round has N/2 fixtures for even participant count', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f']; // N=6, N/2=3 per round
    const fixtures = generateRoundRobin(teams);
    const byRound: Record<number, GeneratedFixture[]> = {};
    for (const f of fixtures) {
      byRound[f.round] = [...(byRound[f.round] ?? []), f];
    }
    for (const round of Object.values(byRound)) {
      expect(round.length).toBe(3);
    }
  });

  it('is deterministic — same input produces same output', () => {
    const teams = ['a', 'b', 'c', 'd'];
    const first  = generateRoundRobin(teams);
    const second = generateRoundRobin(teams);
    expect(first).toEqual(second);
  });

  it('home and away are never the same club', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f'];
    const fixtures = generateRoundRobin(teams);
    for (const f of fixtures) {
      expect(f.homeClubId).not.toBe(f.awayClubId);
    }
  });
});
