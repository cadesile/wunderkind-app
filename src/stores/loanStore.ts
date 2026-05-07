import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Loan } from '@/types/market';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';

const INTEREST_RATE = 0.046;
const LOAN_WEEKS = 52;

/** Maximum loan amount based on club reputation (0–100) */
export function getLoanLimit(reputation: number): number {
  if (reputation >= 90) return 500_000;
  if (reputation >= 70) return 200_000;
  if (reputation >= 50) return 100_000;
  if (reputation >= 30) return 50_000;
  return 10_000;
}

interface LoanState {
  loans: Loan[];
  takeLoan: (amount: number, currentWeek: number, reputation: number) => Loan | Error;
  totalWeeklyRepayment: () => number;
  processWeeklyRepayments: () => void;
}

export const useLoanStore = create<LoanState>()(
  persist(
    (set, get) => ({
      loans: [],

      takeLoan: (amountInPounds, currentWeek, reputation) => {
        const limit = getLoanLimit(reputation);
        if (amountInPounds > limit) {
          return new Error(`Loan limit at current reputation is £${limit.toLocaleString()}`);
        }
        if (amountInPounds <= 0) {
          return new Error('Loan amount must be positive');
        }

        const amountPence = amountInPounds * 100;
        const weeklyRepayment = Math.ceil((amountPence * (1 + INTEREST_RATE)) / LOAN_WEEKS);
        const loan: Loan = {
          id: uuidv7(),
          amount: amountPence,
          interestRate: INTEREST_RATE,
          weeklyRepayment,
          weeksRemaining: LOAN_WEEKS,
          takenWeek: currentWeek,
        };

        set((state) => ({ loans: [...state.loans, loan] }));
        return loan;
      },

      totalWeeklyRepayment: () =>
        get().loans.reduce((sum, l) => sum + l.weeklyRepayment, 0),

      processWeeklyRepayments: () =>
        set((state) => ({
          loans: state.loans
            .map((l) => ({ ...l, weeksRemaining: l.weeksRemaining - 1 }))
            .filter((l) => l.weeksRemaining > 0),
        })),
    }),
    { name: 'loan-store', storage: zustandStorage }
  )
);
