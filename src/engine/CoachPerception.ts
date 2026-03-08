import { MarketPlayer } from '@/types/market';
import { Coach } from '@/types/coach';
import { formatCurrencyWhole } from '@/utils/currency';

export interface CoachOpinion {
  perceivedValue: number;
  currentOffer: number;
  delta: number;
  deltaPercent: number;
  verdict: 'steal' | 'fair' | 'insulting';
  verdictColor: 'green' | 'white' | 'red';
  coachNote: string;
}

/**
 * Returns the head coach's perception of a market player's asking price.
 * Influence (1-20): higher = lower variance. Error = (20 - influence) / 20.
 */
export function getCoachPerception(player: MarketPlayer, coach: Coach): CoachOpinion {
  const baseValue = player.marketValue ?? player.currentAbility * 1000;
  const currentOffer = player.currentOffer ?? baseValue;

  // effectiveInfluence may be halved by low morale (set by setLowMoraleFlags)
  const influence = (coach as any).effectiveInfluence ?? coach.influence;
  const influenceError = (20 - influence) / 20; // 0.0 (perfect) → 0.95 (terrible)
  const variance = (Math.random() * 0.30 - 0.15) * influenceError;
  const perceivedValue = Math.max(0, Math.round(baseValue * (1 + variance)));

  const delta = currentOffer - perceivedValue;
  const deltaPercent = perceivedValue > 0 ? (delta / perceivedValue) * 100 : 0;

  let verdict: 'steal' | 'fair' | 'insulting';
  let verdictColor: 'green' | 'white' | 'red';
  let coachNote: string;

  if (deltaPercent < -10) {
    verdict = 'steal';
    verdictColor = 'green';
    coachNote = `${coach.name}: steal at ${formatCurrencyWhole(currentOffer)}`;
  } else if (deltaPercent > 10) {
    verdict = 'insulting';
    verdictColor = 'red';
    coachNote = `${coach.name}: overpriced at ${formatCurrencyWhole(currentOffer)}`;
  } else {
    verdict = 'fair';
    verdictColor = 'white';
    coachNote = `${coach.name}: fair value`;
  }

  return { perceivedValue, currentOffer, delta, deltaPercent, verdict, verdictColor, coachNote };
}

/** Returns the highest-influence coach, or first coach, or null */
export function getHeadCoach(coaches: Coach[]): Coach | null {
  if (!coaches.length) return null;
  return coaches.reduce((best, c) => c.influence > best.influence ? c : best, coaches[0]);
}
