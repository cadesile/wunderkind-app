import { Player } from '../types/player';
import { SelectionService } from './SelectionService';
import { useEventStore } from '@/stores/eventStore';
import { EventCategory, StatOperator } from '@/types/narrative';

export type PlayingStyle = 'POSSESSION' | 'DIRECT' | 'COUNTER' | 'HIGH_PRESS';

export interface SimTeam {
  xi: Player[];
  playingStyle: PlayingStyle;
  managerAbility: number; // 0-100
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: string[];                        // resolved narrative strings
  moraleDeltas: Record<string, number>;    // playerId → signed morale delta, caller applies
  homePlayers: Player[];
  awayPlayers: Player[];
  homePerformance: Performance;
  awayPerformance: Performance;
}

const FALLBACK_MATCH_TEMPLATES: Record<string, { texts: string[]; moraleDelta: number }> = {
  match_goal:             { texts: ['{player} gets on the scoresheet!', '{player} finds the net!'], moraleDelta: 5 },
  match_assist:           { texts: ['{player} with a brilliant assist!', '{player} sets it up perfectly.'], moraleDelta: 3 },
  match_performance_high: { texts: ['{player} is having a superb game.', '{player} is unplayable today.'], moraleDelta: 4 },
  match_performance_low:  { texts: ['{player} struggling to make an impact.', '{player} having a difficult afternoon.'], moraleDelta: -4 },
};

export interface Performance {
  team: SimTeam;
  players: PlayerPerformance[];
  averageRating: number;
}

export interface PlayerPerformance {
  player: Player;
  rating: number;
  goal: number;
  assist: number;
}

export class ResultsEngine {
  /**
   * Simulates a match between two teams.
   * @param home Home team data
   * @param away Away team data
   * @param tacticalMatrix Matrix of multipliers (e.g. { POSSESSION: { DIRECT: 1.1 } })
   * @param styleInfluence Maps playing style to boosted player attributes
   */
  static simulate(
    home: SimTeam,
    away: SimTeam,
    tacticalMatrix: Record<string, Record<string, number>>,
    styleInfluence: Record<string, string[]> = {},
    ampSide: 'home' | 'away' | false = false,
  ): MatchResult {
    const homeDominance = this.calculateDominance(home, away, tacticalMatrix, styleInfluence);
    const awayDominance = this.calculateDominance(away, home, tacticalMatrix, styleInfluence);

    const totalDominance = homeDominance + awayDominance;
    const homeRatio = homeDominance / totalDominance;

    // Expected goals based on dominance (baseline ~2.5–3.5 total goals per match)
    const variation = (Math.random() - 0.5) * 1.5; // -0.75 to +0.75
    const expectedTotalGoals = 3.0 + variation;

    const homeScore = this.poissonRandom(expectedTotalGoals * homeRatio);
    const awayScore = this.poissonRandom(expectedTotalGoals * (1 - homeRatio));

    const homePerformance = this.calculatePerformance(home, homeScore, awayScore, styleInfluence);
    const awayPerformance = this.calculatePerformance(away, awayScore, homeScore, styleInfluence);

    let events: string[] = [];
    let moraleDeltas: Record<string, number> = {};

    if (ampSide) {
      // Generate events for both teams so NPC goals/assists are also narrated
      const generatedHome = this.generateMatchEvents(homePerformance.players);
      const generatedAway = this.generateMatchEvents(awayPerformance.players);
      events = [...generatedHome.events, ...generatedAway.events];
      // Morale deltas only apply to AMP's own players
      const ampGenerated = ampSide === 'home' ? generatedHome : generatedAway;
      moraleDeltas = ampGenerated.moraleDeltas;
    }

    return {
      homeScore,
      awayScore,
      events,
      moraleDeltas,
      homePlayers: home.xi,
      awayPlayers: away.xi,
      homePerformance,
      awayPerformance,
    };
  }

  /**
   * Builds a Performance for one team: distributes goals/assists then rates every player.
   */
  private static calculatePerformance(
    team: SimTeam,
    teamScore: number,
    opponentScore: number,
    styleInfluence: Record<string, string[]> = {},
  ): Performance {
    const goalsAssists = this.distributeGoalsAndAssists(team.xi, teamScore);

    // Rank players by OVR descending — determines performance hierarchy
    const ranked = [...team.xi].sort((a, b) => (b.overallRating ?? 0) - (a.overallRating ?? 0));
    const teamSize = ranked.length || 1;
    const boostedAttrs = styleInfluence[team.playingStyle] ?? [];

    const players: PlayerPerformance[] = ranked.map((player, rank) => {
      const { goals, assists } = goalsAssists.get(player.id) ?? { goals: 0, assists: 0 };
      return this.calculatePlayerPerformance(
        player, rank, teamSize, teamScore, opponentScore, goals, assists, boostedAttrs,
      );
    });

    const averageRating =
      Math.round((players.reduce((s, p) => s + p.rating, 0) / players.length) * 10) / 10;

    return { team, players, averageRating };
  }

  /**
   * Rates a single player based on squad rank, match result, goals/assists, and playing-style fit.
   *
   * Base rating 4.5–7.5 from OVR hierarchy, then:
   *   +1.0 win / 0 draw / -1.0 loss
   *   +0.5 per goal, +0.3 per assist
   *   up to +0.5 style-attribute fit bonus
   *   ±0.75 noise
   * Final value clamped to 1–10.
   */
  private static calculatePlayerPerformance(
    player: Player,
    rank: number,           // 0 = best in team
    teamSize: number,
    teamScore: number,
    opponentScore: number,
    goals: number,
    assists: number,
    boostedAttrs: string[],
  ): PlayerPerformance {
    // Hierarchy: rank 0 scores 7.5, last player scores 4.5
    const rankRatio = (teamSize - rank) / teamSize; // 1.0 → top, ~0 → bottom
    const baseRating = 4.5 + rankRatio * 3.0;

    const resultBonus = teamScore > opponentScore ? 1.0 : teamScore < opponentScore ? -1.0 : 0;
    const performanceBonus = goals * 0.5 + assists * 0.3;

    // Playing-style attribute fit — up to +0.5 for a player who maxes the style's attributes
    let styleBonus = 0;
    if (boostedAttrs.length > 0 && player.attributes) {
      const sum = boostedAttrs.reduce(
        (s, a) => s + ((player.attributes as Record<string, number>)[a] ?? 0), 0,
      );
      styleBonus = (sum / boostedAttrs.length / 100) * 0.5;
    }

    const personality = player.personality;
    const consistency  = personality?.consistency  ?? 10;
    const temperament  = personality?.temperament  ?? 10;
    const pressure     = personality?.pressure     ?? 10;

    const varianceScore = (consistency + temperament + pressure) / 3;
    // Maps 1 → ±1.5, 20 → ±0.3
    const noiseRange = 1.5 - ((varianceScore - 1) / 19) * 1.2;
    const noise = (Math.random() - 0.5) * 2 * noiseRange;

    const raw = baseRating + resultBonus + performanceBonus + styleBonus + noise;
    const rating = Math.max(1, Math.min(10, Math.round(raw * 10) / 10));

    return { player, rating, goal: goals, assist: assists };
  }

  /**
   * Distributes goals and assists across the XI weighted by position and OVR.
   * Guarantees: sum(goals) === teamScore, sum(assists) === teamScore.
   * A player is heavily downweighted from assisting their own goal.
   */
  private static distributeGoalsAndAssists(
    xi: Player[],
    teamScore: number,
  ): Map<string, { goals: number; assists: number }> {
    const stats = new Map(xi.map((p) => [p.id, { goals: 0, assists: 0 }]));
    if (teamScore === 0 || xi.length === 0) return stats;

    // Goals lean FWD; assists lean MID
    const goalWeights = xi.map((p) => ({
      id: p.id,
      weight:
        (p.position === 'FWD' ? 4 : p.position === 'MID' ? 2 : p.position === 'DEF' ? 0.8 : 0.1)
        * ((p.overallRating ?? 50) / 100),
    }));
    const assistWeights = xi.map((p) => ({
      id: p.id,
      weight:
        (p.position === 'MID' ? 3 : p.position === 'FWD' ? 2 : p.position === 'DEF' ? 0.8 : 0.1)
        * ((p.overallRating ?? 50) / 100),
    }));

    for (let g = 0; g < teamScore; g++) {
      const scorerId = this.weightedPick(goalWeights);
      if (scorerId) stats.get(scorerId)!.goals++;

      // Heavily downweight the scorer to avoid self-assists
      const filteredAssist = assistWeights.map((w) =>
        w.id === scorerId ? { ...w, weight: w.weight * 0.1 } : w,
      );
      const assisterId = this.weightedPick(filteredAssist);
      if (assisterId) stats.get(assisterId)!.assists++;
    }

    return stats;
  }

  /** Picks one item by cumulative weight. */
  private static weightedPick(weights: { id: string; weight: number }[]): string | null {
    const total = weights.reduce((s, w) => s + w.weight, 0);
    if (total <= 0) return null;
    let rand = Math.random() * total;
    for (const w of weights) {
      rand -= w.weight;
      if (rand <= 0) return w.id;
    }
    return weights[weights.length - 1].id;
  }

  private static calculateDominance(
    team: SimTeam,
    opponent: SimTeam,
    matrix: Record<string, Record<string, number>>,
    styleInfluence: Record<string, string[]> = {},
  ): number {
    const boostedAttrs = styleInfluence[team.playingStyle] ?? [];

    let score = team.xi.reduce((sum, p) => {
      let playerScore = SelectionService.calculateScore(p);

      // Style attribute boost — up to +10% for a player who maxes the boosted attributes
      if (boostedAttrs.length > 0 && p.attributes) {
        const boostedSum = boostedAttrs.reduce(
          (s, attr) => s + ((p.attributes as Record<string, number>)[attr] ?? 0), 0,
        );
        const boostedAvg = boostedSum / boostedAttrs.length;
        playerScore *= (1 + 0.10 * (boostedAvg / 100));
      }

      return sum + playerScore;
    }, 0);

    // Tactical Multiplier (e.g. style A vs style B)
    const multiplier = matrix[team.playingStyle]?.[opponent.playingStyle] ?? 1.0;
    score *= multiplier;

    // Manager Boost (up to 5% boost based on ability)
    score *= (1 + (team.managerAbility / 100) * 0.05);

    // Personality multiplier — ±5% based on squad avg professionalism + consistency
    const avgPersonality = team.xi.reduce((sum, p) => {
      const prof = p.personality?.professionalism ?? 10;
      const cons = p.personality?.consistency     ?? 10;
      return sum + (prof + cons) / 2;
    }, 0) / (team.xi.length || 1);

    // Centred on midpoint of 1–20 scale (10.5); max ±5%
    const personalityMultiplier = 1 + ((avgPersonality - 10.5) / 10.5) * 0.05;
    score *= personalityMultiplier;

    return score;
  }

  /**
   * Generates resolved narrative event strings and morale deltas for home XI only.
   * Falls back to FALLBACK_MATCH_TEMPLATES if backend templates are not loaded.
   */
  private static generateMatchEvents(
    players: PlayerPerformance[],
  ): { events: string[]; moraleDeltas: Record<string, number> } {
    const events: string[] = [];
    const moraleDeltas: Record<string, number> = {};

    const allTemplates = useEventStore.getState().getTemplatesByCategory(EventCategory.MATCH);

    const resolveEvent = (slugPrefix: string, playerName: string): { text: string; delta: number } => {
      const matches = allTemplates.filter((t) => t.slug.startsWith(slugPrefix));
      if (matches.length > 0) {
        const template = matches[Math.floor(Math.random() * matches.length)];
        const text = template.bodyTemplate
          .replace('{player}', playerName)
          .replace('{player_1}', playerName);
        const statChange = template.impacts.stat_changes?.find((s) => s.field === 'morale');
        const delta = statChange
          ? (statChange.operator === StatOperator.SUBTRACT ? -statChange.value : statChange.value)
          : 0;
        return { text, delta };
      }
      // Fallback
      const fallback = FALLBACK_MATCH_TEMPLATES[slugPrefix];
      const text = fallback.texts[Math.floor(Math.random() * fallback.texts.length)]
        .replace('{player}', playerName)
        .replace('{player_1}', playerName);
      return { text, delta: fallback.moraleDelta };
    };

    for (const p of players) {
      const name = p.player.name;
      const id   = p.player.id;

      // Goals — one event per goal
      for (let g = 0; g < p.goal; g++) {
        const { text, delta } = resolveEvent('match_goal', name);
        events.push(text);
        moraleDeltas[id] = (moraleDeltas[id] ?? 0) + delta;
      }

      // Assists — one event per assist
      for (let a = 0; a < p.assist; a++) {
        const { text, delta } = resolveEvent('match_assist', name);
        events.push(text);
        moraleDeltas[id] = (moraleDeltas[id] ?? 0) + delta;
      }

      // Standout positive — one event max
      if (p.rating >= 8.0) {
        const { text, delta } = resolveEvent('match_performance_high', name);
        events.push(text);
        moraleDeltas[id] = (moraleDeltas[id] ?? 0) + delta;
      }

      // Standout negative — one event max
      if (p.rating <= 4.5) {
        const { text, delta } = resolveEvent('match_performance_low', name);
        events.push(text);
        moraleDeltas[id] = (moraleDeltas[id] ?? 0) + delta;
      }
    }

    return { events, moraleDeltas };
  }

  /**
   * Simple Poisson distribution approximation for goal generation.
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
