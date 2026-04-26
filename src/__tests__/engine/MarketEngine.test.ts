import {
  worldTierToAppTier,
  calculateTransferValue,
  getFormationTargets,
} from '@/engine/MarketEngine';
import type { Player } from '@/types/player';

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: 'p1',
    name: 'Test Player',
    dateOfBirth: '2007-01-01',
    age: 17,
    position: 'MID',
    nationality: 'EN',
    overallRating: 50,
    potential: 3,
    wage: 10000,
    personality: {
      determination: 10, professionalism: 10, ambition: 10, loyalty: 10,
      adaptability: 10, pressure: 10, temperament: 10, consistency: 10,
    },
    agentId: null,
    joinedWeek: 1,
    isActive: true,
    ...overrides,
  } as Player;
}

describe('worldTierToAppTier', () => {
  it('maps tier 1 → 3 (elite)', () => expect(worldTierToAppTier(1)).toBe(3));
  it('maps tier 2 → 3 (elite)', () => expect(worldTierToAppTier(2)).toBe(3));
  it('maps tier 3 → 2 (national)', () => expect(worldTierToAppTier(3)).toBe(2));
  it('maps tier 4 → 2 (national)', () => expect(worldTierToAppTier(4)).toBe(2));
  it('maps tier 5 → 1 (regional)', () => expect(worldTierToAppTier(5)).toBe(1));
  it('maps tier 6 → 1 (regional)', () => expect(worldTierToAppTier(6)).toBe(1));
  it('maps tier 7 → 0 (local)',    () => expect(worldTierToAppTier(7)).toBe(0));
  it('maps tier 99 → 0 (local)',   () => expect(worldTierToAppTier(99)).toBe(0));
});

describe('calculateTransferValue', () => {
  it('a 17-year-old has higher value than the same player at 25', () => {
    const young = makePlayer({ age: 17 });
    const old   = makePlayer({ age: 25 });
    expect(calculateTransferValue(young)).toBeGreaterThan(calculateTransferValue(old));
  });

  it('a 5-star potential player is worth more than a 1-star at same OVR and age', () => {
    const star5 = makePlayer({ potential: 5 });
    const star1 = makePlayer({ potential: 1 });
    expect(calculateTransferValue(star5)).toBeGreaterThan(calculateTransferValue(star1));
  });

  it('returns a positive pence value', () => {
    expect(calculateTransferValue(makePlayer({}))).toBeGreaterThan(0);
  });

  it('scales with overallRating', () => {
    const hi = makePlayer({ overallRating: 80 });
    const lo = makePlayer({ overallRating: 30 });
    expect(calculateTransferValue(hi)).toBeGreaterThan(calculateTransferValue(lo));
  });
});

describe('getFormationTargets', () => {
  it('4-4-2 has MID min 8, max 12', () => {
    const t = getFormationTargets('4-4-2');
    expect(t.MID.min).toBe(8);
    expect(t.MID.max).toBe(12);
  });

  it('4-3-3 has FWD min 6, max 9', () => {
    const t = getFormationTargets('4-3-3');
    expect(t.FWD.min).toBe(6);
    expect(t.FWD.max).toBe(9);
  });

  it('unknown formation falls back to 4-4-2', () => {
    const t = getFormationTargets('invalid');
    expect(t.DEF.min).toBe(8);
  });

  it('all formations have GK min 1, max 2', () => {
    ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'].forEach((f) => {
      const t = getFormationTargets(f);
      expect(t.GK.min).toBe(1);
      expect(t.GK.max).toBe(2);
    });
  });
});
