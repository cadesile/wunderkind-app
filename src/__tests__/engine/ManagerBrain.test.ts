import { ManagerBrain } from '@/engine/ManagerBrain';
import type { Coach } from '@/types/coach';
import type { Player } from '@/types/player';
import type { MarketPlayer, TransferOffer } from '@/types/market';

function makeManager(traits: Partial<Coach['personality']> = {}): Coach {
  return {
    id: 'm1', name: 'Test Manager', role: 'manager',
    salary: 100000, influence: 15, nationality: 'EN',
    joinedWeek: 1,
    personality: {
      determination: 10, professionalism: 10, ambition: 10, loyalty: 10,
      adaptability: 10, pressure: 10, temperament: 10, consistency: 10,
      ...traits,
    },
  } as Coach;
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'Test Player', dateOfBirth: '2007-01-01', age: 17,
    position: 'MID', nationality: 'EN', overallRating: 60, potential: 3,
    wage: 10000, transferValue: 60000,
    personality: {
      determination: 10, professionalism: 10, ambition: 10, loyalty: 10,
      adaptability: 10, pressure: 10, temperament: 10, consistency: 10,
    },
    agentId: null, joinedWeek: 1, isActive: true,
    ...overrides,
  } as Player;
}

function makeOffer(fee: number, biddingClubTier: number): TransferOffer {
  return {
    id: 'o1', playerId: 'p1', biddingClubId: 'c1',
    biddingClubName: 'FC Test', biddingClubTier,
    fee, weekGenerated: 1, expiresWeek: 5,
  };
}

describe('ManagerBrain.assessTransferOffer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('recommends sell when fee is well above transferValue', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // neutral noise
    const manager = makeManager({ professionalism: 10, ambition: 10, consistency: 10 });
    const player  = makePlayer({ transferValue: 50000, position: 'MID' });
    const offer   = makeOffer(150000, 2); // 3× transfer value
    const squad   = [player, makePlayer({ id: 'p2', position: 'MID' }), makePlayer({ id: 'p3', position: 'MID' })];
    const result  = ManagerBrain.assessTransferOffer(manager, player, offer, 50000, squad);
    expect(result.recommendation).toBe('sell');
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('recommends keep when squad is thin at the player position', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // neutral noise
    const manager = makeManager({ professionalism: 10, ambition: 10, consistency: 10 });
    const player  = makePlayer({ position: 'GK', transferValue: 60000 });
    const offer   = makeOffer(72000, 2); // modest premium (1.2× — just at threshold)
    const squad   = [player]; // only one GK — thin
    const result  = ManagerBrain.assessTransferOffer(manager, player, offer, 50000, squad);
    expect(result.recommendation).toBe('keep');
  });

  it('returns a non-empty reasoning string', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = ManagerBrain.assessTransferOffer(
      makeManager(), makePlayer(), makeOffer(60000, 2), 50000, [makePlayer()],
    );
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});

describe('ManagerBrain.assessScoutedPlayer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('recommends sign when squad is thin at the player position', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // neutral noise
    const marketPlayer: MarketPlayer = {
      id: 'mp1', firstName: 'Scout', lastName: 'Gem',
      dateOfBirth: '2007-01-01', nationality: 'EN',
      position: 'GK', potential: 4, currentAbility: 70,
      personality: null, agent: null,
    };
    const squad: Player[] = []; // no GKs
    const result = ManagerBrain.assessScoutedPlayer(makeManager(), marketPlayer, squad, 60000, 50000);
    expect(result.recommendation).toBe('sign');
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('recommends pass when wage cost is too high relative to balance', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // neutral noise
    const marketPlayer: MarketPlayer = {
      id: 'mp1', firstName: 'Expensive', lastName: 'Guy',
      dateOfBirth: '2005-01-01', nationality: 'EN',
      position: 'MID', potential: 5, currentAbility: 90,
      personality: null, agent: null,
      currentOffer: 500000, // 500,000 pence/wk = £5,000/wk — very expensive
    };
    const squad = Array.from({ length: 8 }, (_, i) =>
      makePlayer({ id: `mid${i}`, position: 'MID' }),
    );
    // Balance £10,000 — 10 weeks = £50,000 cost >> 50% of £10k = £5k threshold → score -= 20
    const result = ManagerBrain.assessScoutedPlayer(makeManager(), marketPlayer, squad, 10000, 500000);
    expect(result.recommendation).toBe('pass');
  });
});
