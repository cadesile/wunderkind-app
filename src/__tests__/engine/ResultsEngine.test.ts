import { ResultsEngine, SimTeam } from '../../engine/ResultsEngine';
import { Player } from '../../types/player';

const mockPlayer = (ovr: number): Player => ({
  id: Math.random().toString(),
  overallRating: ovr,
  morale: 50,
  isActive: true,
  status: 'active',
} as Player);

const tacticalMatrix = {
  POSSESSION: { DIRECT: 1.2, COUNTER: 1.0, HIGH_PRESS: 0.9, POSSESSION: 1.0 },
  DIRECT: { POSSESSION: 0.8, COUNTER: 1.1, HIGH_PRESS: 1.0, DIRECT: 1.0 },
};

describe('ResultsEngine', () => {
  it('stronger team generally wins', () => {
    const strongTeam: SimTeam = {
      xi: Array(11).fill(null).map(() => mockPlayer(80)),
      playingStyle: 'POSSESSION',
      managerAbility: 80,
    };
    const weakTeam: SimTeam = {
      xi: Array(11).fill(null).map(() => mockPlayer(20)),
      playingStyle: 'POSSESSION',
      managerAbility: 20,
    };

    let strongWins = 0;
    let weakWins = 0;
    const iterations = 200;

    for (let i = 0; i < iterations; i++) {
      const result = ResultsEngine.simulate(strongTeam, weakTeam, tacticalMatrix as any);
      if (result.homeScore > result.awayScore) strongWins++;
      else if (result.awayScore > result.homeScore) weakWins++;
    }

    // Strong team should win significantly more
    expect(strongWins).toBeGreaterThan(iterations * 0.7);
    expect(weakWins).toBeLessThan(iterations * 0.15);
  });

  it('applies tactical advantage', () => {
    const teamA: SimTeam = {
      xi: Array(11).fill(null).map(() => mockPlayer(50)),
      playingStyle: 'POSSESSION', // Has 1.2 multiplier vs DIRECT
      managerAbility: 50,
    };
    const teamB: SimTeam = {
      xi: Array(11).fill(null).map(() => mockPlayer(50)),
      playingStyle: 'DIRECT',
      managerAbility: 50,
    };

    let winsA = 0;
    let winsB = 0;

    for (let i = 0; i < 500; i++) {
      const result = ResultsEngine.simulate(teamA, teamB, tacticalMatrix as any);
      if (result.homeScore > result.awayScore) winsA++;
      else if (result.awayScore > result.homeScore) winsB++;
    }

    // Team A has 20% dominance boost, should win significantly more
    expect(winsA).toBeGreaterThan(winsB);
  });
});
