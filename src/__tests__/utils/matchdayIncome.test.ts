import { calculateMatchdayIncome } from '@/utils/matchdayIncome';
import type { FacilityTemplate } from '@/types/facility';

// Minimal template factory — only fields calculateMatchdayIncome uses
function makeTemplate(overrides: Partial<FacilityTemplate> = {}): FacilityTemplate {
  return {
    slug: 'test_facility',
    label: 'Test',
    description: '',
    category: 'TRAINING',
    baseCost: 0,
    weeklyUpkeepBase: 0,
    matchdayIncome: null,
    matchdayIncomeMultiplier: null,
    reputationBonus: 0,
    maxLevel: 5,
    decayBase: 2.0,
    sortOrder: 0,
    ...overrides,
  };
}

describe('calculateMatchdayIncome', () => {
  it('returns 0 when no facilities have matchdayIncome set', () => {
    const templates = [makeTemplate({ slug: 'a' }), makeTemplate({ slug: 'b' })];
    const levels = { a: 3, b: 2 };
    const conditions = { a: 100, b: 100 };
    expect(calculateMatchdayIncome(templates, levels, conditions, 50)).toBe(0);
  });

  it('returns 0 when the facility level is 0', () => {
    const templates = [makeTemplate({ slug: 'a', matchdayIncome: 100000, matchdayIncomeMultiplier: 1.0 })];
    const levels = { a: 0 };
    const conditions = { a: 100 };
    expect(calculateMatchdayIncome(templates, levels, conditions, 0)).toBe(0);
  });

  it('calculates income for a single facility at full condition, zero reputation', () => {
    // income=100000, level=2, condition=100, multiplier=1.5, rep=0
    // effectiveLevel = 2 × (100/100) = 2
    // facilityIncome = 100000 × 2 × 1.5 = 300000
    // total = 300000 × (1 + 0/100) = 300000
    const templates = [makeTemplate({ slug: 'a', matchdayIncome: 100000, matchdayIncomeMultiplier: 1.5 })];
    const levels = { a: 2 };
    const conditions = { a: 100 };
    expect(calculateMatchdayIncome(templates, levels, conditions, 0)).toBe(300000);
  });

  it('scales by reputation', () => {
    // income=100000, level=1, condition=100, multiplier=1.0, rep=100
    // effectiveLevel = 1
    // facilityIncome = 100000 × 1 × 1.0 = 100000
    // total = 100000 × (1 + 100/100) = 200000
    const templates = [makeTemplate({ slug: 'a', matchdayIncome: 100000, matchdayIncomeMultiplier: 1.0 })];
    const levels = { a: 1 };
    const conditions = { a: 100 };
    expect(calculateMatchdayIncome(templates, levels, conditions, 100)).toBe(200000);
  });

  it('reduces income when facility condition is degraded', () => {
    // income=100000, level=2, condition=50, multiplier=1.0, rep=0
    // effectiveLevel = 2 × (50/100) = 1
    // facilityIncome = 100000 × 1 × 1.0 = 100000
    // total = 100000 × 1.0 = 100000
    const templates = [makeTemplate({ slug: 'a', matchdayIncome: 100000, matchdayIncomeMultiplier: 1.0 })];
    const levels = { a: 2 };
    const conditions = { a: 50 };
    expect(calculateMatchdayIncome(templates, levels, conditions, 0)).toBe(100000);
  });

  it('sums income across multiple income-generating facilities', () => {
    // facility a: income=100000, level=1, condition=100, multiplier=1.0 → 100000
    // facility b: income=50000,  level=2, condition=100, multiplier=1.0 → 100000
    // total before rep = 200000; rep=0 → 200000
    const templates = [
      makeTemplate({ slug: 'a', matchdayIncome: 100000, matchdayIncomeMultiplier: 1.0 }),
      makeTemplate({ slug: 'b', matchdayIncome: 50000,  matchdayIncomeMultiplier: 1.0 }),
    ];
    const levels = { a: 1, b: 2 };
    const conditions = { a: 100, b: 100 };
    expect(calculateMatchdayIncome(templates, levels, conditions, 0)).toBe(200000);
  });

  it('skips facilities where the slug has no level entry (treats as level 0)', () => {
    const templates = [makeTemplate({ slug: 'a', matchdayIncome: 100000, matchdayIncomeMultiplier: 1.0 })];
    const levels: Record<string, number> = {}; // no 'a' key
    const conditions: Record<string, number> = {};
    expect(calculateMatchdayIncome(templates, levels, conditions, 0)).toBe(0);
  });

  it('returns a floored integer (no fractional pence)', () => {
    // income=100001, level=1, condition=100, multiplier=1.0, rep=0 → 100001 exactly
    const templates = [makeTemplate({ slug: 'a', matchdayIncome: 100001, matchdayIncomeMultiplier: 1.0 })];
    const levels = { a: 1 };
    const conditions = { a: 100 };
    const result = calculateMatchdayIncome(templates, levels, conditions, 0);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(100001);
  });
});
