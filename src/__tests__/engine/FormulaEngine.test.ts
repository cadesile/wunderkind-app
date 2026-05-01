import { calculateReputationDelta } from '@/engine/FormulaEngine';
import { FALLBACK_FACILITY_TEMPLATES } from '@/types/facility';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a levels map with every template slug set to the given level. */
function allAtLevel(level: number): Record<string, number> {
  return Object.fromEntries(FALLBACK_FACILITY_TEMPLATES.map((t) => [t.slug, level]));
}

/** Build a conditions map with every template slug set to the given condition %. */
function allAtCondition(pct: number): Record<string, number> {
  return Object.fromEntries(FALLBACK_FACILITY_TEMPLATES.map((t) => [t.slug, pct]));
}

const ALL_SLUGS = FALLBACK_FACILITY_TEMPLATES.map((t) => t.slug);
const TOTAL_REP_BONUS = FALLBACK_FACILITY_TEMPLATES.reduce((s, t) => s + t.reputationBonus, 0);

// ─── calculateReputationDelta ─────────────────────────────────────────────────

describe('calculateReputationDelta', () => {
  it('returns 0 when no facilities are built (all level 0)', () => {
    const levels = allAtLevel(0);
    const conditions = allAtCondition(100);
    expect(calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, levels, conditions)).toBe(0);
  });

  it('returns 0 when templates list is empty', () => {
    expect(calculateReputationDelta([], {}, {})).toBe(0);
  });

  it('sums reputationBonus for all facilities at level 1, condition 100%', () => {
    const levels = allAtLevel(1);
    const conditions = allAtCondition(100);
    const result = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, levels, conditions);
    // effectiveLevel = 1 × 1.0 = 1 for each → plain sum of all reputationBonus values
    expect(result).toBeCloseTo(TOTAL_REP_BONUS, 5);
  });

  it('scales linearly with facility level', () => {
    const at1 = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, allAtLevel(1), allAtCondition(100));
    const at3 = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, allAtLevel(3), allAtCondition(100));
    expect(at3).toBeCloseTo(at1 * 3, 5);
  });

  it('scales linearly with condition — 50% condition halves the contribution', () => {
    const full = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, allAtLevel(1), allAtCondition(100));
    const half = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, allAtLevel(1), allAtCondition(50));
    expect(half).toBeCloseTo(full * 0.5, 5);
  });

  it('omits facilities at level 0 — only owned facilities count', () => {
    // Only scouting_center at level 1; all others at 0
    const levels: Record<string, number> = Object.fromEntries(ALL_SLUGS.map((s) => [s, 0]));
    levels['scouting_center'] = 1;
    const conditions = allAtCondition(100);
    const scoutingCenter = FALLBACK_FACILITY_TEMPLATES.find((t) => t.slug === 'scouting_center')!;
    expect(calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, levels, conditions))
      .toBeCloseTo(scoutingCenter.reputationBonus, 5);
  });

  it('missing condition entry defaults to 100% — no penalty for undefined condition', () => {
    const levels = allAtLevel(1);
    // Pass empty conditions — each slug missing → defaults to 100
    const result = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, levels, {});
    expect(result).toBeCloseTo(TOTAL_REP_BONUS, 5);
  });

  it('missing level entry defaults to 0 — unknown slug treated as unbuilt', () => {
    // Pass empty levels → all default to 0 → no owned facilities
    const result = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, {}, allAtCondition(100));
    expect(result).toBe(0);
  });

  it('higher-level facilities contribute proportionally more than lower-level ones', () => {
    // technical_zone at level 5, all others at level 1
    const levels = allAtLevel(1);
    levels['technical_zone'] = 5;
    const conditions = allAtCondition(100);
    const techZone = FALLBACK_FACILITY_TEMPLATES.find((t) => t.slug === 'technical_zone')!;
    const othersSum = FALLBACK_FACILITY_TEMPLATES
      .filter((t) => t.slug !== 'technical_zone')
      .reduce((s, t) => s + t.reputationBonus, 0);
    const expected = techZone.reputationBonus * 5 + othersSum;
    expect(calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, levels, conditions))
      .toBeCloseTo(expected, 5);
  });

  // ── Progression pace sanity checks ────────────────────────────────────────
  // These document the expected weekly gain at key facility states so that
  // reputationBonus tuning decisions are visible in the test output.

  it('[pace] all facilities at level 1, full condition → documents weekly gain', () => {
    const rate = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, allAtLevel(1), allAtCondition(100));
    // At this rate, Local→Regional (need 15 rep) takes Math.ceil(15 / rate) weeks.
    const weeksToRegional = Math.ceil(15 / rate);
    // Log so the developer can see the pace during test runs.
    console.log(`[rep pace] all L1 100%: +${rate.toFixed(3)}/wk → Local→Regional in ${weeksToRegional} wks`);
    expect(rate).toBeGreaterThan(0);
  });

  it('[pace] all facilities at level 3, full condition → documents weekly gain', () => {
    const rate = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, allAtLevel(3), allAtCondition(100));
    const weeksToRegional = Math.ceil(15 / rate);
    console.log(`[rep pace] all L3 100%: +${rate.toFixed(3)}/wk → Local→Regional in ${weeksToRegional} wks`);
    expect(rate).toBeGreaterThan(0);
  });

  it('[pace] all facilities at level 1, 70% condition → documents weekly gain', () => {
    const rate = calculateReputationDelta(FALLBACK_FACILITY_TEMPLATES, allAtLevel(1), allAtCondition(70));
    const weeksToRegional = Math.ceil(15 / rate);
    console.log(`[rep pace] all L1 70%: +${rate.toFixed(3)}/wk → Local→Regional in ${weeksToRegional} wks`);
    expect(rate).toBeGreaterThan(0);
  });
});
