import { generateRoundRobin, GeneratedFixture } from '@/utils/fixtureGenerator';

describe('generateRoundRobin', () => {
  it('produces correct number of rounds for even participant count (Double Round Robin)', () => {
    const teams = ['a', 'b', 'c', 'd']; // N=4, rounds = (4-1)*2 = 6
    const fixtures = generateRoundRobin(teams);
    const rounds = new Set(fixtures.map((f) => f.round));
    expect(rounds.size).toBe(6);
  });

  it('produces correct number of rounds for odd participant count (Double Round Robin)', () => {
    // N=3 → adds bye → N=4, rounds = (4-1)*2 = 6
    const teams = ['a', 'b', 'c'];
    const fixtures = generateRoundRobin(teams);
    const rounds = new Set(fixtures.map((f) => f.round));
    expect(rounds.size).toBe(6);
  });

  it('each pair appears exactly twice (once home, once away)', () => {
    const teams = ['a', 'b', 'c', 'd'];
    const fixtures = generateRoundRobin(teams);
    
    // Check total matches
    // N=4, matches = N*(N-1) = 4*3 = 12
    expect(fixtures.length).toBe(12);

    // Check unique pairs (ignoring order)
    const pairs = fixtures.map((f) => [f.homeClubId, f.awayClubId].sort().join('|'));
    const pairCounts: Record<string, number> = {};
    pairs.forEach(p => pairCounts[p] = (pairCounts[p] ?? 0) + 1);
    
    // 4 teams, 6 unique combinations (4C2), each should appear twice
    expect(Object.keys(pairCounts).length).toBe(6);
    Object.values(pairCounts).forEach(count => expect(count).toBe(2));

    // Check specific direction (home/away)
    const directionalPairs = fixtures.map((f) => `${f.homeClubId}|${f.awayClubId}`);
    const uniqueDirectionalPairs = new Set(directionalPairs);
    expect(uniqueDirectionalPairs.size).toBe(12); // Every team plays every other team home AND away
  });

  it('each team appears in exactly 2*(N-1) fixtures (no byes for even teams)', () => {
    const teams = ['a', 'b', 'c', 'd'];
    const fixtures = generateRoundRobin(teams);
    for (const team of teams) {
      const count = fixtures.filter(
        (f) => f.homeClubId === team || f.awayClubId === team
      ).length;
      expect(count).toBe(6); // 2 * (4-1)
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

  it('round numbers are 1-based and sequential', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f']; // N=6, rounds = (6-1)*2 = 10
    const fixtures = generateRoundRobin(teams);
    const rounds = [...new Set(fixtures.map((f) => f.round))].sort((a, b) => a - b);
    const expectedRounds = Array.from({ length: 10 }, (_, i) => i + 1);
    expect(rounds).toEqual(expectedRounds);
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

  it('alternates venues for the fixed team to avoid bias', () => {
    const teams = ['fixed', 'b', 'c', 'd']; // N=4
    const fixtures = generateRoundRobin(teams);
    
    // First leg rounds 1, 2, 3
    const leg1 = fixtures.filter(f => f.round <= 3);
    const fixedHome = leg1.filter(f => f.homeClubId === 'fixed').length;
    const fixedAway = leg1.filter(f => f.awayClubId === 'fixed').length;
    
    // In N=4 (3 rounds), one leg should be 2H/1A or 1H/2A
    expect(fixedHome + fixedAway).toBe(3);
    expect(fixedHome).toBeGreaterThan(0);
    expect(fixedAway).toBeGreaterThan(0);
  });
});
