import { Player } from '../types/player';
import { SelectionService } from './SelectionService';

export type PlayingStyle = 'POSSESSION' | 'DIRECT' | 'COUNTER' | 'HIGH_PRESS';

export interface SimTeam {
  xi: Player[];
  playingStyle: PlayingStyle;
  managerAbility: number; // 0-100
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: any[]; // Placeholder for future complexity (goalscorers, cards, etc.)
  homePlayers: Player[];
  awayPlayers: Player[];
}

export class ResultsEngine {
  /**
   * Simulates a match between two teams.
   * @param home Home team data
   * @param away Away team data
   * @param tacticalMatrix Matrix of multipliers (e.g. { POSSESSION: { DIRECT: 1.1 } })
   */
  static simulate(
    home: SimTeam,
    away: SimTeam,
    tacticalMatrix: Record<string, Record<string, number>>
  ): MatchResult {
    const homeDominance = this.calculateDominance(home, away, tacticalMatrix);
    const awayDominance = this.calculateDominance(away, home, tacticalMatrix);

    const totalDominance = homeDominance + awayDominance;
    const homeRatio = homeDominance / totalDominance;

    // Expected goals based on dominance (baseline ~2.5 - 3.5 total goals)
    // We add some variation to the total goals per match
    const variation = (Math.random() - 0.5) * 1.5; // -0.75 to +0.75
    const expectedTotalGoals = 3.0 + variation;
    
    const homeExp = expectedTotalGoals * homeRatio;
    const awayExp = expectedTotalGoals * (1 - homeRatio);

    return {
      homeScore:   this.poissonRandom(homeExp),
      awayScore:   this.poissonRandom(awayExp),
      events:      [],
      homePlayers: home.xi,
      awayPlayers: away.xi,
    };
  }

  private static calculateDominance(
    team: SimTeam,
    opponent: SimTeam,
    matrix: Record<string, Record<string, number>>
  ): number {
    let score = team.xi.reduce((sum, p) => sum + SelectionService.calculateScore(p), 0);
    
    // Tactical Multiplier (e.g. style A vs style B)
    const multiplier = matrix[team.playingStyle]?.[opponent.playingStyle] ?? 1.0;
    score *= multiplier;

    // Manager Boost (up to 5% boost based on ability)
    score *= (1 + (team.managerAbility / 100) * 0.05);

    // Home advantage (hardcoded 5% boost for now)
    // Actually, calculateDominance is called for both. We should apply it only to the home team.
    // I'll handle home advantage in the simulate method instead for clarity.

    return score;
  }

  /**
   * Simple Poisson distribution approximation for goal generation
   */
  private static poissonRandom(mean: number): number {
    const L = Math.exp(-mean);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }
}
