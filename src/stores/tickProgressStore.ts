import { create } from 'zustand';

interface TickProgressState {
  isProcessing: boolean;
  startTick: () => void;
  endTick: () => void;
}

export const useTickProgressStore = create<TickProgressState>((set) => ({
  isProcessing: false,
  startTick: () => set({ isProcessing: true }),
  endTick:   () => set({ isProcessing: false }),
}));
