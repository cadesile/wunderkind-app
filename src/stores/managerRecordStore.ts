import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';

export interface ManagerMatchRecord {
  /** Manager display name — stored for convenience when displaying win rates */
  name: string;
  wins: number;
  draws: number;
  losses: number;
}

interface ManagerRecordState {
  /** Keyed by manager/coach id */
  records: Record<string, ManagerMatchRecord>;
  recordResult: (managerId: string, name: string, outcome: 'win' | 'draw' | 'loss') => void;
  clearAll: () => void;
}

export const useManagerRecordStore = create<ManagerRecordState>()(
  persist(
    (set, get) => ({
      records: {},

      recordResult: (managerId, name, outcome) => {
        const prev = get().records[managerId] ?? { name, wins: 0, draws: 0, losses: 0 };
        set({
          records: {
            ...get().records,
            [managerId]: {
              name,
              wins:   prev.wins   + (outcome === 'win'  ? 1 : 0),
              draws:  prev.draws  + (outcome === 'draw' ? 1 : 0),
              losses: prev.losses + (outcome === 'loss' ? 1 : 0),
            },
          },
        });
      },

      clearAll: () => set({ records: {} }),
    }),
    { name: 'manager-record-store', storage: zustandStorage },
  ),
);
