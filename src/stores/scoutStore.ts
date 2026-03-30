import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Scout, ScoutingMission } from '@/types/market';
import { zustandStorage } from '@/utils/storage';

interface ScoutState {
  scouts: Scout[];
  addScout: (scout: Scout) => void;
  removeScout: (id: string) => void;
  updateScout: (id: string, changes: Partial<Scout>) => void;
  assignPlayer: (scoutId: string, playerId: string) => void;
  removeAssignment: (scoutId: string, playerId: string) => void;
  getWorkload: (scoutId: string) => number;
  updateMorale: (scoutId: string, delta: number) => void;
  assignMission: (scoutId: string, mission: ScoutingMission) => void;
  tickMission: (scoutId: string) => void;
  incrementGemsFound: (scoutId: string, count: number) => void;
  completeMission: (scoutId: string) => void;
  cancelMission: (scoutId: string) => void;
}

export const useScoutStore = create<ScoutState>()(
  persist(
    (set, get) => ({
      scouts: [],
      addScout: (scout) =>
        set((state) => {
          if (state.scouts.some((s) => s.id === scout.id)) return state;
          return { scouts: [...state.scouts, scout] };
        }),
      removeScout: (id) =>
        set((state) => ({ scouts: state.scouts.filter((s) => s.id !== id) })),
      updateScout: (id, changes) =>
        set((state) => ({
          scouts: state.scouts.map((s) => s.id === id ? { ...s, ...changes } : s),
        })),

      assignPlayer: (scoutId, playerId) =>
        set((state) => ({
          scouts: state.scouts.map((s) => {
            if (s.id !== scoutId) return s;
            const assigned = s.assignedPlayerIds ?? [];
            if (assigned.includes(playerId) || assigned.length >= 5) return s;
            return { ...s, assignedPlayerIds: [...assigned, playerId] };
          }),
        })),

      removeAssignment: (scoutId, playerId) =>
        set((state) => ({
          scouts: state.scouts.map((s) =>
            s.id === scoutId
              ? { ...s, assignedPlayerIds: (s.assignedPlayerIds ?? []).filter((id) => id !== playerId) }
              : s,
          ),
        })),

      getWorkload: (scoutId) => {
        const scout = get().scouts.find((s) => s.id === scoutId);
        return scout?.assignedPlayerIds?.length ?? 0;
      },

      updateMorale: (scoutId, delta) =>
        set((state) => ({
          scouts: state.scouts.map((s) =>
            s.id === scoutId
              ? { ...s, morale: Math.max(0, Math.min(100, (s.morale ?? 70) + delta)) }
              : s,
          ),
        })),

      assignMission: (scoutId, mission) =>
        set((state) => ({
          scouts: state.scouts.map((s) =>
            s.id === scoutId ? { ...s, activeMission: mission } : s,
          ),
        })),

      tickMission: (scoutId) =>
        set((state) => ({
          scouts: state.scouts.map((s) => {
            if (s.id !== scoutId || !s.activeMission) return s;
            return {
              ...s,
              activeMission: {
                ...s.activeMission,
                weeksElapsed: s.activeMission.weeksElapsed + 1,
              },
            };
          }),
        })),

      incrementGemsFound: (scoutId, count) =>
        set((state) => ({
          scouts: state.scouts.map((s) => {
            if (s.id !== scoutId || !s.activeMission) return s;
            return {
              ...s,
              activeMission: {
                ...s.activeMission,
                gemsFound: s.activeMission.gemsFound + count,
              },
            };
          }),
        })),

      completeMission: (scoutId) =>
        set((state) => ({
          scouts: state.scouts.map((s) => {
            if (s.id !== scoutId || !s.activeMission) return s;
            return {
              ...s,
              activeMission: { ...s.activeMission, status: 'completed' as const },
            };
          }),
        })),

      cancelMission: (scoutId) =>
        set((state) => ({
          scouts: state.scouts.map((s) => {
            if (s.id !== scoutId || !s.activeMission) return s;
            return {
              ...s,
              activeMission: { ...s.activeMission, status: 'cancelled' as const },
            };
          }),
        })),
    }),
    { name: 'scout-store', storage: zustandStorage }
  )
);
