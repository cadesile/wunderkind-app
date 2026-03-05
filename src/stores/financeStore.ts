import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import { useAcademyStore } from '@/stores/academyStore';
import type { FinancialTransaction, FinancialCategory } from '@/types/finance';

/** Rolling window: ~52 weeks × 7 days */
const MAX_TRANSACTIONS = 364;
const ROLLING_WEEKS = 52;

interface FinanceState {
  transactions: FinancialTransaction[];

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
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (tx) => {
        const newTx: FinancialTransaction = {
          ...tx,
          id: uuidv7(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          transactions: [newTx, ...state.transactions].slice(0, MAX_TRANSACTIONS),
        }));
      },

      getRecentHistory: (weeks = ROLLING_WEEKS) => {
        const currentWeek = useAcademyStore.getState().academy.weekNumber ?? 1;
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
        const currentWeek = useAcademyStore.getState().academy.weekNumber ?? 1;
        const cutoff = currentWeek - ROLLING_WEEKS;
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.weekNumber >= cutoff),
        }));
      },
    }),
    { name: 'finance-store', storage: zustandStorage },
  ),
);
