import { create } from 'zustand';

interface NavState {
  /** Set by detail views on mount; null = no back action available (FAB renders dim). */
  backFabCallback: (() => void) | null;
  setBackFab: (cb: (() => void) | null) => void;
  /** Incremented each time the inbox icon is tapped. Inbox screen watches this to reset to list view. */
  inboxResetKey: number;
  requestInboxReset: () => void;
}

export const useNavStore = create<NavState>()((set) => ({
  backFabCallback: null,
  setBackFab: (cb) => set({ backFabCallback: cb }),
  inboxResetKey: 0,
  requestInboxReset: () => set((s) => ({ inboxResetKey: s.inboxResetKey + 1 })),
}));
