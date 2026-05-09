export type ManagerOutcome = 'win' | 'draw' | 'loss';

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
  /**
   * Bulk version — updates all manager records in a single set() call.
   * Use in SimulationService to avoid 80 individual AsyncStorage writes per matchday.
   */
  batchRecordResults: (entries: Array<{ managerId: string; name: string; outcome: 'win' | 'draw' | 'loss' }>) => void;
  clearAll: () => void;
}

export const useManagerRecordStore = create<ManagerRecordState>()(
  persist(
    (set, get) => ({
      records: {},

      recordResult: (managerId, name, outcome) => {
        set((state) => {
          const prev = state.records[managerId] ?? { name, wins: 0, draws: 0, losses: 0 };
          return {
            records: {
              ...state.records,
              [managerId]: {
                name,
                wins:   prev.wins   + (outcome === 'win'  ? 1 : 0),
                draws:  prev.draws  + (outcome === 'draw' ? 1 : 0),
                losses: prev.losses + (outcome === 'loss' ? 1 : 0),
              },
            },
          };
        });
      },

      batchRecordResults: (entries) => {
        if (entries.length === 0) return;
        set((state) => {
          const updated = { ...state.records };
          for (const { managerId, name, outcome } of entries) {
            const prev = updated[managerId] ?? { name, wins: 0, draws: 0, losses: 0 };
            updated[managerId] = {
              name,
              wins:   prev.wins   + (outcome === 'win'  ? 1 : 0),
              draws:  prev.draws  + (outcome === 'draw' ? 1 : 0),
              losses: prev.losses + (outcome === 'loss' ? 1 : 0),
            };
          }
          return { records: updated };
        });
      },

      clearAll: () => set({ records: {} }),
    }),
    { name: 'manager-record-store', storage: zustandStorage },
  ),
);
