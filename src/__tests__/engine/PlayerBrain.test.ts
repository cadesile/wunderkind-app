import { PlayerBrain } from '@/engine/PlayerBrain';
import type { Player } from '@/types/player';

function makePlayer(
  traits: Partial<Player['personality']> = {},
  overrides: Partial<Player> = {},
): Player {
  return {
    id: 'p1',
    name: 'Test',
    dateOfBirth: '2007-01-01',
    age: 17,
    position: 'MID',
    nationality: 'EN',
    overallRating: 60,
    potential: 3,
    wage: 10000,
    agentId: null,
    joinedWeek: 1,
    isActive: true,
    personality: {
      determination: 10,
      professionalism: 10,
      ambition: 10,
      loyalty: 10,
      adaptability: 10,
      pressure: 10,
      temperament: 10,
      consistency: 10,
      ...traits,
    },
    ...overrides,
  };
}

describe('PlayerBrain.assessTransferOffer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('high loyalty with same-tier bid results in staying when random is neutral', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // neutral noise
    const player = makePlayer({ loyalty: 18, ambition: 5, consistency: 10 });
    // score = 50 - (18-10)*2.5 + 0 + 0 + (neutral noise = 0) = 30 < 50
    const result = PlayerBrain.assessTransferOffer(player, 60, 2, 60, 2);
    expect(result.wantsTransfer).toBe(false);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('high ambition with higher-tier bid results in wanting transfer when random is neutral', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // neutral noise
    const player = makePlayer({ ambition: 18, loyalty: 5, consistency: 10 });
    // score = 50 - (5-10)*2.5 + (18-10)*2.5*2 + (70-40)*0.3 + 0 = 50 + 12.5 + 40 + 9 = 111.5 > 50
    const result = PlayerBrain.assessTransferOffer(player, 40, 1, 70, 3);
    expect(result.wantsTransfer).toBe(true);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('noise from low consistency can swing a borderline decision', () => {
    const player = makePlayer({ ambition: 10, loyalty: 10, consistency: 1 });
    // Base score = 50 (no trait offsets, no rep delta for same tier/rep)
    // Noise = (20-1)*1.5 = 28.5, so range is [-14.25, +14.25]

    // With random=1.0 (max noise): score = 50 + 14.25 = 64.25 → wantsTransfer = true
    jest.spyOn(Math, 'random').mockReturnValue(1.0);
    const high = PlayerBrain.assessTransferOffer(player, 50, 1, 50, 1);
    expect(high.wantsTransfer).toBe(true);

    // With random=0.0 (min noise): score = 50 - 14.25 = 35.75 → wantsTransfer = false
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    const low = PlayerBrain.assessTransferOffer(player, 50, 1, 50, 1);
    expect(low.wantsTransfer).toBe(false);
  });
});

describe('PlayerBrain.computeRejectionFallout', () => {
  it('returns empty shifts when biddingTier <= ampTier', () => {
    const player = makePlayer({ ambition: 15 });
    const shifts = PlayerBrain.computeRejectionFallout(player, 1, 2); // bidding=1 < amp=2
    expect(Object.keys(shifts)).toHaveLength(0);
  });

  it('returns negative professionalism and temperament shifts when bidding tier > amp tier', () => {
    const player = makePlayer({ ambition: 15, loyalty: 5 });
    const shifts = PlayerBrain.computeRejectionFallout(player, 3, 1); // bidding=3 > amp=1
    expect(shifts.professionalism).toBeLessThan(0);
    expect(shifts.temperament).toBeLessThan(0);
  });

  it('high loyalty reduces the magnitude of the fallout', () => {
    const lowLoyalty  = makePlayer({ ambition: 15, loyalty: 2  });
    const highLoyalty = makePlayer({ ambition: 15, loyalty: 18 });
    const lo = PlayerBrain.computeRejectionFallout(lowLoyalty,  3, 1);
    const hi = PlayerBrain.computeRejectionFallout(highLoyalty, 3, 1);
    expect(Math.abs(hi.professionalism ?? 0)).toBeLessThan(Math.abs(lo.professionalism ?? 0));
  });
});
