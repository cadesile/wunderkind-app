import type { FanEvent } from '@/types/fans';

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
    expect(types).toHaveLength(3);
  });
});
