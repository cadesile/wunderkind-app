import { create } from 'zustand';

interface TickProgressState {
  isProcessing: boolean;
  isSimulatingResults: boolean;
  startTick: () => void;
  endTick: () => void;
  startSimulation: () => void;
  endSimulation: () => void;
}

export const useTickProgressStore = create<TickProgressState>((set) => ({
  isProcessing: false,
  isSimulatingResults: false,
  startTick: () => set({ isProcessing: true }),
  endTick:   () => set({ isProcessing: false }),
  startSimulation: () => set({ isSimulatingResults: true }),
  endSimulation:   () => set({ isSimulatingResults: false }),
}));
