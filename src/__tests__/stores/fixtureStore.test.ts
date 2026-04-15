import { LeagueSnapshot, ClubSnapshot } from '@/types/api';
import { useFixtureStore } from '@/stores/fixtureStore';

beforeEach(() => {
  useFixtureStore.getState().clearSeason();
});

function makeClub(id: string): ClubSnapshot {
  return { id, name: `Club ${id}`, reputation: 50, tier: 8, primaryColor: '#ff0000', secondaryColor: '#ffffff', stadiumName: null, facilities: {} };
}

function makeLeague(season = 1, clubCount = 3): LeagueSnapshot {
  const clubs = Array.from({ length: clubCount }, (_, i) => makeClub(`npc-${i}`));
  return { id: 'league-1', tier: 8, name: 'League 8', country: 'EN', season, promotionSpots: null, reputationTier: null, tvDeal: null, sponsorPot: 0, prizeMoney: null, leaguePositionPot: null, leaguePositionDecreasePercent: 5, clubs };
}

describe('fixtureStore', () => {
  it('initialises with empty fixtures and currentMatchday 0', () => {
    const state = useFixtureStore.getState();
    expect(state.fixtures).toEqual([]);
    expect(state.currentMatchday).toBe(0);
  });

  it('generateFixtures creates fixtures for a league season', () => {
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    const { fixtures } = useFixtureStore.getState();
    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((f) => f.leagueId === 'league-1')).toBe(true);
    expect(fixtures.every((f) => f.season === 1)).toBe(true);
  });

  it('generateFixtures includes AMP club in fixtures', () => {
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    const { fixtures } = useFixtureStore.getState();
    const ampFixtures = fixtures.filter((f) => f.homeClubId === 'amp-id' || f.awayClubId === 'amp-id');
    expect(ampFixtures.length).toBeGreaterThan(0);
  });

  it('generateFixtures is idempotent for same league and season', () => {
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    const countAfterFirst = useFixtureStore.getState().fixtures.length;
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    expect(useFixtureStore.getState().fixtures.length).toBe(countAfterFirst);
  });

  it('generateFixtures creates deterministic fixture IDs', () => {
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    const { fixtures } = useFixtureStore.getState();
    for (const f of fixtures) {
      expect(f.id).toBe(`league-1-s1-r${f.round}-${f.homeClubId}-${f.awayClubId}`);
    }
  });

  it('recordResult stores result with synced=false', () => {
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    const firstFixture = useFixtureStore.getState().fixtures[0];
    useFixtureStore.getState().recordResult(firstFixture.id, { homeGoals: 2, awayGoals: 1, playedAt: '2026-04-15T12:00:00Z' });
    const updated = useFixtureStore.getState().fixtures.find((f) => f.id === firstFixture.id);
    expect(updated?.result?.homeGoals).toBe(2);
    expect(updated?.result?.synced).toBe(false);
  });

  it('getUnsyncedResults returns only fixtures with result and synced=false', () => {
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    const [first, second] = useFixtureStore.getState().fixtures;
    useFixtureStore.getState().recordResult(first.id, { homeGoals: 1, awayGoals: 0, playedAt: '2026-04-15T12:00:00Z' });
    useFixtureStore.getState().recordResult(second.id, { homeGoals: 0, awayGoals: 0, playedAt: '2026-04-15T12:00:00Z' });
    expect(useFixtureStore.getState().getUnsyncedResults().length).toBe(2);
  });

  it('markSynced sets synced=true on specified fixtures', () => {
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    const firstFixture = useFixtureStore.getState().fixtures[0];
    useFixtureStore.getState().recordResult(firstFixture.id, { homeGoals: 1, awayGoals: 0, playedAt: '2026-04-15T12:00:00Z' });
    useFixtureStore.getState().markSynced([firstFixture.id]);
    const updated = useFixtureStore.getState().fixtures.find((f) => f.id === firstFixture.id);
    expect(updated?.result?.synced).toBe(true);
    expect(useFixtureStore.getState().getUnsyncedResults().length).toBe(0);
  });

  it('advanceMatchday increments currentMatchday', () => {
    useFixtureStore.getState().advanceMatchday();
    expect(useFixtureStore.getState().currentMatchday).toBe(1);
    useFixtureStore.getState().advanceMatchday();
    expect(useFixtureStore.getState().currentMatchday).toBe(2);
  });

  it('clearSeason resets fixtures and currentMatchday to 0', () => {
    useFixtureStore.getState().generateFixtures(makeLeague(1, 3), 'amp-id');
    useFixtureStore.getState().advanceMatchday();
    useFixtureStore.getState().clearSeason();
    const state = useFixtureStore.getState();
    expect(state.fixtures).toEqual([]);
    expect(state.currentMatchday).toBe(0);
  });
});
