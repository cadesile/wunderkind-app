import { MarketPlayer } from '@/types/market';
import { Coach } from '@/types/coach';
import { formatCurrencyWhole } from '@/utils/currency';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export interface CoachOpinion {
  perceivedValue: number;
  verdict: 'great_deal' | 'fair' | 'poor_deal';
  note: string;
}

/**
 * Returns a coach's opinion on a market player's current offer.
 * Coach.influence (1-20) drives accuracy — higher influence = smaller error.
 * Only meaningful after scouting (revealed status).
 * playerFeeMultiplier: from GameConfig — scales the market value baseline.
 */
export function getCoachOpinion(player: MarketPlayer, coach: Coach, playerFeeMultiplier: number): CoachOpinion {
  const baseValue = player.marketValue ?? player.currentAbility * playerFeeMultiplier;

  // influence 1-20: error decreases as influence increases
  const influenceError = clamp((20 - coach.influence) / 20, 0, 1);
  const variance = randomFloat(-0.20, 0.20) * influenceError;
  const perceivedValue = Math.max(0, baseValue * (1 + variance));

  if (!player.currentOffer || player.currentOffer <= 0) {
    return { perceivedValue, verdict: 'fair', note: `${coach.name} has no valuation yet` };
  }

  const offerRatio = player.currentOffer / perceivedValue;

  if (offerRatio < 0.85) {
    return {
      perceivedValue,
      verdict: 'great_deal',
      note: `${coach.name}: steal at ${formatCurrencyWhole(player.currentOffer)}`,
    };
  } else if (offerRatio > 1.15) {
    return {
      perceivedValue,
      verdict: 'poor_deal',
      note: `${coach.name}: overpriced`,
    };
  }
  return {
    perceivedValue,
    verdict: 'fair',
    note: `${coach.name}: fair value`,
  };
}
