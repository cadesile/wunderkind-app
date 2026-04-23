import {
  computeSponsorOffer,
  getSponsorOfferProbability,
  getInvestorOfferProbability,
} from '@/engine/sponsorEngine';
import { DEFAULT_GAME_CONFIG } from '@/types/gameConfig';

const cfg = DEFAULT_GAME_CONFIG;

describe('computeSponsorOffer', () => {
  it('SMALL sponsor at rep=0 returns value at or near smallSponsorMin', () => {
    // At rep=0, base = min + 0 * (max - min) = min. Jitter is ±10%, so within [min*0.9, min*1.1].
    const result = computeSponsorOffer('SMALL', 0, cfg);
    expect(result.weeklyPaymentPence).toBeGreaterThanOrEqual(cfg.smallSponsorMin * 0.9);
    expect(result.weeklyPaymentPence).toBeLessThanOrEqual(cfg.smallSponsorMin * 1.1);
  });

  it('SMALL sponsor at rep=100 returns value at or near smallSponsorMax', () => {
    const result = computeSponsorOffer('SMALL', 100, cfg);
    expect(result.weeklyPaymentPence).toBeGreaterThanOrEqual(cfg.smallSponsorMax * 0.9);
    expect(result.weeklyPaymentPence).toBeLessThanOrEqual(cfg.smallSponsorMax * 1.1);
  });

  it('MEDIUM sponsor at rep=50 returns value within medium range', () => {
    const result = computeSponsorOffer('MEDIUM', 50, cfg);
    const base = cfg.mediumSponsorMin + 0.5 * (cfg.mediumSponsorMax - cfg.mediumSponsorMin);
    expect(result.weeklyPaymentPence).toBeGreaterThanOrEqual(base * 0.9);
    expect(result.weeklyPaymentPence).toBeLessThanOrEqual(base * 1.1);
  });

  it('LARGE sponsor at rep=75 returns value within large range', () => {
    const result = computeSponsorOffer('LARGE', 75, cfg);
    const base = cfg.largeSponsorMin + 0.75 * (cfg.largeSponsorMax - cfg.largeSponsorMin);
    expect(result.weeklyPaymentPence).toBeGreaterThanOrEqual(base * 0.9);
    expect(result.weeklyPaymentPence).toBeLessThanOrEqual(base * 1.1);
  });

  it('contractWeeks is always 52, 104, or 156', () => {
    for (let i = 0; i < 30; i++) {
      const { contractWeeks } = computeSponsorOffer('SMALL', 50, cfg);
      expect([52, 104, 156]).toContain(contractWeeks);
    }
  });

  it('weeklyPaymentPence is always a whole number', () => {
    const { weeklyPaymentPence } = computeSponsorOffer('MEDIUM', 40, cfg);
    expect(Number.isInteger(weeklyPaymentPence)).toBe(true);
  });
});

describe('getSponsorOfferProbability', () => {
  it('returns Local probability for Local tier', () => {
    expect(getSponsorOfferProbability('Local', cfg)).toBe(cfg.sponsorProbabilityLocal);
  });
  it('returns Regional probability for Regional tier', () => {
    expect(getSponsorOfferProbability('Regional', cfg)).toBe(cfg.sponsorProbabilityRegional);
  });
  it('returns National probability for National tier', () => {
    expect(getSponsorOfferProbability('National', cfg)).toBe(cfg.sponsorProbabilityNational);
  });
  it('returns Elite probability for Elite tier', () => {
    expect(getSponsorOfferProbability('Elite', cfg)).toBe(cfg.sponsorProbabilityElite);
  });
});

describe('getInvestorOfferProbability', () => {
  it('returns correct probability per tier', () => {
    expect(getInvestorOfferProbability('Local',    cfg)).toBe(cfg.investorProbabilityLocal);
    expect(getInvestorOfferProbability('Regional', cfg)).toBe(cfg.investorProbabilityRegional);
    expect(getInvestorOfferProbability('National', cfg)).toBe(cfg.investorProbabilityNational);
    expect(getInvestorOfferProbability('Elite',    cfg)).toBe(cfg.investorProbabilityElite);
  });
});
