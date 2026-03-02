import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player, PersonalityMatrix, Position, TraitName } from '@/types/player';
import { generatePlayer } from '@/engine/personality';
import { zustandStorage } from '@/utils/storage';

const STARTER_POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'MID', 'FWD'];

interface SquadState {
  players: Player[];
  addPlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  updateTrait: (playerId: string, trait: TraitName, delta: number) => void;
  applyTraitShifts: (shifts: Record<string, Partial<PersonalityMatrix>>) => void;
  generateStarterSquad: () => void;
}

export const useSquadStore = create<SquadState>()(
  persist(
    (set) => ({
      players: [],
      addPlayer: (player) =>
        set((state) => ({ players: [...state.players, player] })),
      removePlayer: (id) =>
        set((state) => ({ players: state.players.filter((p) => p.id !== id) })),
      updateTrait: (playerId, trait, delta) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  personality: {
                    ...p.personality,
                    [trait]: Math.max(1, Math.min(20, p.personality[trait] + delta)),
                  },
                }
              : p
          ),
        })),
      applyTraitShifts: (shifts) =>
        set((state) => ({
          players: state.players.map((p) => {
            const playerShifts = shifts[p.id];
            if (!playerShifts) return p;
            const updated = { ...p.personality };
            (Object.entries(playerShifts) as [TraitName, number][]).forEach(
              ([trait, delta]) => {
                updated[trait] = Math.max(1, Math.min(20, updated[trait] + delta));
              },
            );
            return { ...p, personality: updated };
          }),
        })),
      generateStarterSquad: () => {
        const starters = STARTER_POSITIONS.map((pos) => generatePlayer(pos));
        set({ players: starters });
      },
    }),
    { name: 'squad-store', storage: zustandStorage },
  ),
);
