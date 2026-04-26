import {
  worldTierToAppTier,
  calculateTransferValue,
  getFormationTargets,
  generateNPCBids,
  processNPCTransfers,
} from '@/engine/MarketEngine';
import type { Player } from '@/types/player';
import type { WorldClub, WorldPlayer } from '@/types/world';

jest.mock('@/stores/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      mutateClubRoster: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

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
  };
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

  it('a player aged 30 has a lower value than age 25 (age factor floor)', () => {
    const p30 = makePlayer({ age: 30 });
    const p25 = makePlayer({ age: 25 });
    expect(calculateTransferValue(p30)).toBeLessThanOrEqual(calculateTransferValue(p25));
  });

  it('returns expected pence for age 17, OVR 50, potential 3 (canonical case)', () => {
    // Formula: 50 × 1000 × 1.4 × 1.1 = 77,000
    expect(calculateTransferValue(makePlayer({ age: 17, overallRating: 50, potential: 3 }))).toBe(77000);
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
    expect(getFormationTargets('invalid')).toEqual(getFormationTargets('4-4-2'));
  });

  it('all formations have GK min 1, max 2', () => {
    ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'].forEach((f) => {
      const t = getFormationTargets(f);
      expect(t.GK.min).toBe(1);
      expect(t.GK.max).toBe(2);
    });
  });
});

function makeWorldClub(id: string, tier: number): WorldClub {
  return {
    id,
    name: `Club ${id}`,
    tier,
    reputation: 50,
    primaryColor: '#fff',
    secondaryColor: '#000',
    stadiumName: null,
    facilities: {},
    personality: { playingStyle: 'POSSESSION', financialApproach: 'BALANCED', managerTemperament: 10 },
    players: [],
    staff: [],
    formation: '4-4-2',
  };
}

describe('generateNPCBids', () => {
  it('returns no offers when there are no active players', () => {
    const clubs = { c1: makeWorldClub('c1', 5) };
    const offers = generateNPCBids(1, 1, [], clubs, new Set());
    expect(offers).toHaveLength(0);
  });

  it('returns no offer for a player already with a pending bid', () => {
    const player = makePlayer({ id: 'p-pending', overallRating: 80, isActive: true });
    const clubs = { c1: makeWorldClub('c1', 5) };
    const pendingIds = new Set(['p-pending']);
    const offers = generateNPCBids(1, 1, [player], clubs, pendingIds);
    expect(offers.every((o) => o.playerId !== 'p-pending')).toBe(true);
  });

  it('returns no offer for an injured player', () => {
    const player = makePlayer({ id: 'p-injured', overallRating: 99, isActive: true });
    player.injury = { severity: 'minor', weeksRemaining: 2, injuredWeek: 1 };
    const clubs = { c1: makeWorldClub('c1', 5) };
    const offers = generateNPCBids(1, 1, [player], clubs, new Set());
    expect(offers.every((o) => o.playerId !== 'p-injured')).toBe(true);
  });

  it('returns no offers when no clubs are within ±1 tier of ampTier', () => {
    // ampTier=0 (local), but only elite clubs (worldTier=1 → appTier=3) — gap is 3
    const clubs = { c1: makeWorldClub('c1', 1), c2: makeWorldClub('c2', 2) };
    const player = makePlayer({ id: 'p1', overallRating: 99, isActive: true });
    const offers = generateNPCBids(1, 0, [player], clubs, new Set());
    expect(offers).toHaveLength(0);
  });

  it('returns at most one offer per player per call', () => {
    const player = makePlayer({ id: 'p1', overallRating: 80, isActive: true });
    const clubs = { c1: makeWorldClub('c1', 5), c2: makeWorldClub('c2', 6) };
    for (let i = 0; i < 20; i++) {
      const offers = generateNPCBids(1, 1, [player], clubs, new Set());
      const forPlayer = offers.filter((o) => o.playerId === 'p1');
      expect(forPlayer.length).toBeLessThanOrEqual(1);
    }
  });

  it('offer fee is within 0.9–1.3× the player transferValue', () => {
    const player = makePlayer({ id: 'p-hi', overallRating: 99, isActive: true, potential: 5, age: 17 });
    const clubs = { c1: makeWorldClub('c1', 5) };
    let got = false;
    for (let i = 0; i < 200; i++) {
      const offers = generateNPCBids(1, 1, [player], clubs, new Set());
      if (offers.length > 0) {
        const tv = calculateTransferValue(player);
        expect(offers[0].fee).toBeGreaterThanOrEqual(tv * 0.89);
        expect(offers[0].fee).toBeLessThanOrEqual(tv * 1.31);
        got = true;
        break;
      }
    }
    expect(got).toBe(true);
  });
});

function makeWorldPlayer(id: string, clubId: string, position: WorldPlayer['position']): WorldPlayer {
  return {
    id,
    firstName: 'A',
    lastName: 'B',
    position,
    nationality: 'EN',
    dateOfBirth: '2005-01-01',
    pace: 60, technical: 60, vision: 60, power: 60, stamina: 60, heart: 60,
    personality: {
      determination:10, professionalism:10, ambition:10, loyalty:10,
      adaptability:10, pressure:10, temperament:10, consistency:10,
    },
    npcClubId: clubId,
  };
}

describe('processNPCTransfers', () => {
  it('returns a digest with no transfers when all clubs meet their minimums', async () => {
    const gk = makeWorldPlayer('gk1', 'c1', 'GK');
    const defenders = Array.from({ length: 8 }, (_, i) => makeWorldPlayer(`d${i}`, 'c1', 'DEF'));
    const mids = Array.from({ length: 8 }, (_, i) => makeWorldPlayer(`m${i}`, 'c1', 'MID'));
    const fwds = Array.from({ length: 4 }, (_, i) => makeWorldPlayer(`f${i}`, 'c1', 'FWD'));

    const clubs: Record<string, import('@/types/world').WorldClub> = {
      c1: { ...makeWorldClub('c1', 5), players: [gk, ...defenders, ...mids, ...fwds] },
    };

    const digest = await processNPCTransfers(1, clubs);
    expect(digest.transfers).toHaveLength(0);
  });

  it('executes a transfer when buyer is below minimum and seller has surplus', async () => {
    const sellerFwds = Array.from({ length: 7 }, (_, i) => makeWorldPlayer(`sf${i}`, 'seller', 'FWD'));
    const clubs: Record<string, import('@/types/world').WorldClub> = {
      buyer:  { ...makeWorldClub('buyer',  5), players: [] },
      seller: { ...makeWorldClub('seller', 5), players: sellerFwds },
    };

    const digest = await processNPCTransfers(1, clubs);
    expect(digest.transfers.length).toBeGreaterThan(0);
    expect(digest.transfers[0].fromClub).toBe('Club seller');
    expect(digest.transfers[0].toClub).toBe('Club buyer');
  });
});
