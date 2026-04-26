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
  it('a player with high loyalty and same-tier bid prefers to stay', () => {
    const player = makePlayer({ loyalty: 19, ambition: 5 });
    let wantedCount = 0;
    for (let i = 0; i < 10; i++) {
      if (PlayerBrain.assessTransferOffer(player, 60, 2, 60, 2).wantsTransfer) wantedCount++;
    }
    expect(wantedCount).toBeLessThan(5); // majority should prefer staying
  });

  it('a player with high ambition and a higher-tier bid prefers to go', () => {
    const player = makePlayer({ ambition: 19, loyalty: 3 });
    let wantedCount = 0;
    for (let i = 0; i < 10; i++) {
      if (PlayerBrain.assessTransferOffer(player, 20, 0, 80, 3).wantsTransfer) wantedCount++;
    }
    expect(wantedCount).toBeGreaterThan(5);
  });

  it('returns a non-empty reasoning string', () => {
    const result = PlayerBrain.assessTransferOffer(makePlayer(), 50, 1, 60, 2);
    expect(result.reasoning.length).toBeGreaterThan(0);
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
