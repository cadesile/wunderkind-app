import { create } from 'zustand';

interface TickProgressState {
  isProcessing: boolean;
  isSimulatingResults: boolean;
  phase: string;
  phasePct: number;
  startTick: () => void;
  endTick: () => void;
  setPhase: (label: string, pct: number) => void;
  startSimulation: () => void;
  endSimulation: () => void;
}

export const useTickProgressStore = create<TickProgressState>((set) => ({
  isProcessing: false,
  isSimulatingResults: false,
  phase: '',
  phasePct: 0,
  startTick: () => set({ isProcessing: true, phase: '', phasePct: 0 }),
  endTick:   () => set({ isProcessing: false }),
  setPhase:  (label, pct) => set({ phase: label, phasePct: pct }),
  startSimulation: () => set({ isSimulatingResults: true }),
  endSimulation:   () => set({ isSimulatingResults: false }),
}));
