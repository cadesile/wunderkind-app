import { create } from 'zustand';

interface NavState {
  /** Set by detail views on mount; null = no back action available (FAB renders dim). */
  backFabCallback: (() => void) | null;
  setBackFab: (cb: (() => void) | null) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  backFabCallback: null,
  setBackFab: (cb) => set({ backFabCallback: cb }),
}));
