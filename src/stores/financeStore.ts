import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import { useClubStore } from '@/stores/clubStore';
import type { FinancialTransaction, FinancialCategory, TransferRecord, NpcTransferEntry } from '@/types/finance';

/** Rolling window: ~52 weeks × 7 days */
const MAX_TRANSACTIONS = 364;
const ROLLING_WEEKS = 52;

interface FinanceState {
  transactions: FinancialTransaction[];
  transfers: TransferRecord[];
  /** NPC-to-NPC transfer log — capped at 50 most recent, used by the transfer ticker. */
  npcTransfers: NpcTransferEntry[];

  /** Record a new transaction. ID and timestamp are assigned automatically. */
  addTransaction: (tx: Omit<FinancialTransaction, 'id' | 'timestamp'>) => void;

  /** All transactions from the last N weeks (defaults to 52). */
  getRecentHistory: (weeks?: number) => FinancialTransaction[];

  /** Transactions of a given category within the last N weeks. */
  getTransactionsByCategory: (category: FinancialCategory, weeks?: number) => FinancialTransaction[];

  /** Sum of amounts for a category within the last N weeks (pence). */
  getTotalByCategory: (category: FinancialCategory, weeks?: number) => number;

  /** Prune entries older than 52 weeks. Called once per weekly advancement. */
  clearOldTransactions: () => void;

  /** Record a completed player transfer (agent-assisted or direct sale). */
  addTransfer: (record: Omit<TransferRecord, 'id'>) => void;

  /** Prepend a batch of NPC transfer entries (newest-first). Capped at 50. */
  addNpcTransfers: (entries: NpcTransferEntry[]) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      transfers: [],
      npcTransfers: [],

      addTransaction: (tx) => {
        const newTx: FinancialTransaction = {
          ...tx,
          id: uuidv7(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          transactions: [newTx, ...state.transactions].slice(0, MAX_TRANSACTIONS),
        }));
        // Ledger is the source of truth: amount in pence → balance in pence
        useClubStore.getState().addBalance(newTx.amount);
      },

      getRecentHistory: (weeks = ROLLING_WEEKS) => {
        const currentWeek = useClubStore.getState().club.weekNumber ?? 1;
        const cutoff = currentWeek - weeks;
        return get().transactions.filter((tx) => tx.weekNumber >= cutoff);
      },

      getTransactionsByCategory: (category, weeks = ROLLING_WEEKS) =>
        get().getRecentHistory(weeks).filter((tx) => tx.category === category),

      getTotalByCategory: (category, weeks = ROLLING_WEEKS) =>
        get()
          .getTransactionsByCategory(category, weeks)
          .reduce((sum, tx) => sum + tx.amount, 0),

      clearOldTransactions: () => {
        const currentWeek = useClubStore.getState().club.weekNumber ?? 1;
        const cutoff = currentWeek - ROLLING_WEEKS;
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.weekNumber >= cutoff),
        }));
      },

      addTransfer: (record) =>
        set((state) => ({
          transfers: [{ ...record, id: uuidv7() }, ...state.transfers],
        })),

      addNpcTransfers: (entries) =>
        set((state) => ({
          npcTransfers: [...entries, ...state.npcTransfers].slice(0, 50),
        })),
    }),
    {
      name: 'finance-store',
      storage: zustandStorage,
      partialize: (state) => ({
        transactions: state.transactions,
        transfers:    state.transfers.slice(0, 100),
        npcTransfers: state.npcTransfers,
      }),
    },
  ),
);
