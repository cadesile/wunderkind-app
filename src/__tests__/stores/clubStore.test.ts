import { useClubStore } from '@/stores/clubStore';

describe('clubStore', () => {
  it('initializes with default club state', () => {
    const state = useClubStore.getState();
    expect(state.club).toBeDefined();
    expect(state.club.name).toBe('Wunderkind Factory');
  });
});
