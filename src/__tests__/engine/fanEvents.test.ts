import type { FanEvent } from '@/types/fans';
import { useFanStore } from '@/stores/fanStore';

describe('FanEvent type', () => {
  it('accepts isPermanent: true', () => {
    const e: FanEvent = {
      id: 'test-1',
      type: 'trophy_won',
      description: 'League title',
      impact: 30,
      weekNumber: 38,
      targets: ['manager', 'owner', 'players'],
      isPermanent: true,
    };
    expect(e.isPermanent).toBe(true);
  });

  it('accepts isPermanent omitted (undefined)', () => {
    const e: FanEvent = {
      id: 'test-2',
      type: 'match_win',
      description: 'Win',
      impact: 5,
      weekNumber: 10,
      targets: ['players'],
    };
    expect(e.isPermanent).toBeUndefined();
  });

  it('accepts trophy_won, promoted, relegated event types', () => {
    const types: FanEvent['type'][] = ['trophy_won', 'promoted', 'relegated'];
    expect(types[0]).toBe('trophy_won');
    expect(types[1]).toBe('promoted');
    expect(types[2]).toBe('relegated');
  });
});

describe('fanStore.pruneEvents', () => {
  beforeEach(() => {
    useFanStore.setState({ events: [], fanFavoriteId: null });
  });

  it('keeps non-permanent events within 52 weeks', () => {
    useFanStore.setState({
      events: [
        { id: '1', type: 'match_win', description: 'w', impact: 5, weekNumber: 1, targets: [] },
      ],
    });
    useFanStore.getState().pruneEvents(52); // 51 weeks ago — keep
    expect(useFanStore.getState().events).toHaveLength(1);
  });

  it('removes non-permanent events older than 52 weeks', () => {
    useFanStore.setState({
      events: [
        { id: '1', type: 'match_win', description: 'w', impact: 5, weekNumber: 1, targets: [] },
      ],
    });
    useFanStore.getState().pruneEvents(54); // 53 weeks ago — remove
    expect(useFanStore.getState().events).toHaveLength(0);
  });

  it('never removes permanent events regardless of age', () => {
    useFanStore.setState({
      events: [
        { id: '1', type: 'trophy_won', description: 't', impact: 30, weekNumber: 1, targets: [], isPermanent: true },
      ],
    });
    useFanStore.getState().pruneEvents(1000);
    expect(useFanStore.getState().events).toHaveLength(1);
  });
});

describe('fanStore.addEvent — cap protects permanent events', () => {
  beforeEach(() => {
    useFanStore.setState({ events: [], fanFavoriteId: null });
  });

  it('keeps all permanent events when non-permanent fills the cap', () => {
    // Pre-fill with 50 non-permanent events
    const nonPermanent = Array.from({ length: 50 }, (_, i) => ({
      id: `np-${i}`,
      type: 'match_win' as const,
      description: 'w',
      impact: 1,
      weekNumber: i + 1,
      targets: [] as [],
    }));
    useFanStore.setState({ events: nonPermanent });

    // Add a permanent event
    useFanStore.getState().addEvent({
      type: 'trophy_won',
      description: 'title',
      impact: 30,
      weekNumber: 100,
      targets: [],
      isPermanent: true,
    });

    const { events } = useFanStore.getState();
    expect(events.length).toBeLessThanOrEqual(50);
    const permanent = events.filter((e) => e.isPermanent);
    expect(permanent).toHaveLength(1);
    expect(permanent[0].type).toBe('trophy_won');
  });
});
