import type { GameConfig } from '@/types/gameConfig';
import type { ReputationTier } from '@/types/club';

type CompanySize = 'SMALL' | 'MEDIUM' | 'LARGE';

const CONTRACT_DURATIONS = [52, 104, 156] as const;

/**
 * Compute a sponsor's negotiated weekly payment (pence) and contract duration.
 *
 * Formula:
 *   base = min + (rep / 100) × (max − min)
 *   jitter = random in [0.90, 1.10]
 *   weeklyPaymentPence = round(base × jitter)
 */
export function computeSponsorOffer(
  size: CompanySize,
  reputation: number,
  config: Pick<
    GameConfig,
    | 'smallSponsorMin' | 'smallSponsorMax'
    | 'mediumSponsorMin' | 'mediumSponsorMax'
    | 'largeSponsorMin' | 'largeSponsorMax'
  >,
): { weeklyPaymentPence: number; contractWeeks: 52 | 104 | 156 } {
  const rep = Math.max(0, Math.min(100, reputation));

  let min: number;
  let max: number;
  if (size === 'LARGE') {
    min = config.largeSponsorMin;
    max = config.largeSponsorMax;
  } else if (size === 'MEDIUM') {
    min = config.mediumSponsorMin;
    max = config.mediumSponsorMax;
  } else {
    min = config.smallSponsorMin;
    max = config.smallSponsorMax;
  }

  const base = min + (rep / 100) * (max - min);
  const jitter = 0.9 + Math.random() * 0.2; // ±10%
  const weeklyPaymentPence = Math.round(base * jitter);

  const contractWeeks = CONTRACT_DURATIONS[Math.floor(Math.random() * CONTRACT_DURATIONS.length)];

  return { weeklyPaymentPence, contractWeeks };
}

/** Weekly probability of a sponsor offer for the club's current reputation tier. */
export function getSponsorOfferProbability(
  tier: ReputationTier,
  config: Pick<
    GameConfig,
    | 'sponsorProbabilityLocal' | 'sponsorProbabilityRegional'
    | 'sponsorProbabilityNational' | 'sponsorProbabilityElite'
  >,
): number {
  if (tier === 'Elite')    return config.sponsorProbabilityElite;
  if (tier === 'National') return config.sponsorProbabilityNational;
  if (tier === 'Regional') return config.sponsorProbabilityRegional;
  return config.sponsorProbabilityLocal;
}

/** Weekly probability of an investor offer for the club's current reputation tier. */
export function getInvestorOfferProbability(
  tier: ReputationTier,
  config: Pick<
    GameConfig,
    | 'investorProbabilityLocal' | 'investorProbabilityRegional'
    | 'investorProbabilityNational' | 'investorProbabilityElite'
  >,
): number {
  if (tier === 'Elite')    return config.investorProbabilityElite;
  if (tier === 'National') return config.investorProbabilityNational;
  if (tier === 'Regional') return config.investorProbabilityRegional;
  return config.investorProbabilityLocal;
}
