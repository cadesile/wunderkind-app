import { Player, Position } from '../types/player';
import { Formation } from '../types/game';

export interface FormationRequirement {
  GK: number;
  DEF: number;
  MID: number;
  FWD: number;
}

export const FORMATION_CONFIG: Record<Formation, FormationRequirement> = {
  '4-4-2':   { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-3-3':   { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '3-5-2':   { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '5-4-1':   { GK: 1, DEF: 5, MID: 4, FWD: 1 },
  '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '5-3-2':   { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  '4-5-1':   { GK: 1, DEF: 4, MID: 5, FWD: 1 },
};

export class SelectionService {
  /**
   * Ranking formula: Ability × conditionFactor × moraleFactor
   *
   * conditionFactor = 0.7 + (condition / 100) × 0.3
   *   100 → 1.00 (full ability)
   *    70 → 0.91
   *    40 → 0.82
   *     0 → 0.70 (still eligible, but deprioritised)
   *
   * moraleFactor = 1 + (morale − 50) / 100
   *   Defaults: condition → 80, morale → 50.
   */
  static calculateScore(player: Player): number {
    const ability   = player.overallRating;
    const morale    = player.morale    ?? 50;
    const condition = player.condition ?? 80;
    const conditionFactor = 0.7 + (condition / 100) * 0.3;
    const moraleFactor    = 1 + (morale - 50) / 100;
    return ability * conditionFactor * moraleFactor;
  }

  /**
   * Selects a Starting XI from a list of players based on a formation.
   * If not enough players in a specific position, takes the next best overall player.
   */
  static selectStartingXI(players: Player[], formation: Formation): Player[] {
    const requirements = FORMATION_CONFIG[formation] ?? FORMATION_CONFIG['4-4-2'];
    const selectedIds = new Set<string>();
    const xi: Player[] = [];

    // 1. Sort all players by their selection score once
    const scoredPlayers = [...players]
      .filter(p => {
        const isActive = p.isActive ?? true;
        const isStatusActive = !p.status || p.status === 'active';
        const isNotInjured = !p.injury;
        return isActive && isStatusActive && isNotInjured;
      })
      .map(p => ({ player: p, score: this.calculateScore(p) }))
      .sort((a, b) => b.score - a.score);

    // 2. Fill each positional bucket
    const positions: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
    
    for (const pos of positions) {
      const countNeeded = requirements[pos];
      let countFilled = 0;

      for (const scored of scoredPlayers) {
        if (countFilled >= countNeeded) break;
        if (selectedIds.has(scored.player.id)) continue;

        if (scored.player.position === pos) {
          xi.push(scored.player);
          selectedIds.add(scored.player.id);
          countFilled++;
        }
      }
    }

    // 3. Fill remaining slots with next best overall (out of position)
    const totalNeeded = 11;
    if (xi.length < totalNeeded) {
      for (const scored of scoredPlayers) {
        if (xi.length >= totalNeeded) break;
        if (selectedIds.has(scored.player.id)) continue;

        xi.push(scored.player);
        selectedIds.add(scored.player.id);
      }
    }

    return xi;
  }
}
