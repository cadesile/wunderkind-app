import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player, PersonalityMatrix, PlayerAttributes, AttributeName, Position, TraitName, DevelopmentSnapshot } from '@/types/player';
import { zustandStorage } from '@/utils/storage';
import { releasePlayer as releasePlayerApi } from '@/api/endpoints/squad';

/** Per-player development update (attributes + recalculated overallRating). */
export interface PlayerDevelopmentUpdate {
  attributes: PlayerAttributes;
  overallRating: number;
  /** Present when a breakthrough spike fired this tick for this player. */
  spike?: { attribute: AttributeName; gain: number };
}

interface SquadState {
  players: Player[];
  addPlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  /** Bulk-replace the entire roster (used during bootstrap) */
  setPlayers: (players: Player[]) => void;
  /** Apply arbitrary top-level field changes to a single player (used by SimulationService). */
  updatePlayer: (id: string, changes: Partial<Player>) => void;
  updateTrait: (playerId: string, trait: TraitName, delta: number) => void;
  assignCoach: (playerId: string, coachId: string) => void;
  updateMorale: (playerId: string, delta: number) => void;
  /**
   * Applies trait shifts AND attribute development in a single set() call.
   * This is the ONLY squads store mutation that should happen per weekly tick,
   * preventing multiple rapid updates that break useSyncExternalStore consistency.
   */
  applyWeeklyPlayerUpdates: (
    traitShifts: Record<string, Partial<PersonalityMatrix>>,
    devUpdates: Record<string, PlayerDevelopmentUpdate>,
  ) => void;
  /** @deprecated Use applyWeeklyPlayerUpdates instead */
  applyTraitShifts: (shifts: Record<string, Partial<PersonalityMatrix>>) => void;
  /** Set or clear a development focus on a player. Pass null to clear. */
  setDevelopmentFocus: (
    playerId: string,
    focus: Player['developmentFocus'] | null,
  ) => void;
  /** Set or update the injury status on a player. */
  setPlayerInjury: (playerId: string, injury: NonNullable<Player['injury']>) => void;
  /** Clear injury from a player (fully recovered). */
  clearPlayerInjury: (playerId: string) => void;
  /**
   * Decrement weeksRemaining on all injured players by 1.
   * Players reaching 0 have their injury cleared automatically.
   */
  tickInjuries: () => void;
  /**
   * Records a DevelopmentSnapshot for every active player that has attributes.
   * Called by GameLoop every 4 weeks.
   */
  recordDevelopmentSnapshots: (weekNumber: number) => void;
  /**
   * Release a player back to the market pool. Removes from local squad immediately
   * (fat-client model) and fires a best-effort backend call to set academy = null.
   */
  releasePlayer: (playerId: string) => Promise<{ success: boolean; playerName?: string; error?: string }>;
}

export const useSquadStore = create<SquadState>()(
  persist(
    (set, get) => ({
      players: [],
      addPlayer: (player) =>
        set((state) => {
          if (state.players.some((p) => p.id === player.id)) return state;
          return { players: [...state.players, player] };
        }),
      removePlayer: (id) =>
        set((state) => ({ players: state.players.filter((p) => p.id !== id) })),
      setPlayers: (players) => set({ players }),
      updatePlayer: (id, changes) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, ...changes } : p,
          ),
        })),
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
      applyWeeklyPlayerUpdates: (traitShifts, devUpdates) =>
        set((state) => ({
          players: state.players.map((p) => {
            const playerShifts = traitShifts[p.id];
            const dev = devUpdates[p.id];
            if (!playerShifts && !dev) return p;

            let next = p;

            if (playerShifts) {
              const updatedPersonality = { ...next.personality };
              (Object.entries(playerShifts) as [TraitName, number][]).forEach(
                ([trait, delta]) => {
                  updatedPersonality[trait] = Math.max(1, Math.min(20, updatedPersonality[trait] + delta));
                },
              );
              next = { ...next, personality: updatedPersonality };
            }

            if (dev) {
              next = { ...next, attributes: dev.attributes, overallRating: dev.overallRating };
            }

            return next;
          }),
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
      assignCoach: (playerId, coachId) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, assignedCoachId: coachId } : p,
          ),
        })),

      setPlayerInjury: (playerId, injury) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, injury } : p,
          ),
        })),

      clearPlayerInjury: (playerId) =>
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id !== playerId) return p;
            const { injury: _, ...rest } = p;
            return rest as Player;
          }),
        })),

      tickInjuries: () =>
        set((state) => ({
          players: state.players.map((p) => {
            if (!p.injury) return p;
            if (p.injury.weeksRemaining <= 1) {
              const { injury: _, ...rest } = p;
              return rest as Player;
            }
            return { ...p, injury: { ...p.injury, weeksRemaining: p.injury.weeksRemaining - 1 } };
          }),
        })),

      setDevelopmentFocus: (playerId, focus) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, developmentFocus: focus ?? undefined }
              : p,
          ),
        })),

      updateMorale: (playerId, delta) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, morale: Math.max(0, Math.min(100, (p.morale ?? 70) + delta)) }
              : p,
          ),
        })),

      recordDevelopmentSnapshots: (weekNumber) =>
        set((state) => ({
          players: state.players.map((p) => {
            if (!p.isActive || !p.attributes) return p;
            const snapshot: DevelopmentSnapshot = {
              weekNumber,
              overallRating: p.overallRating,
              attributes: { ...p.attributes },
            };
            return { ...p, developmentLog: [...(p.developmentLog ?? []), snapshot] };
          }),
        })),

      releasePlayer: async (playerId) => {
        const player = get().players.find((p) => p.id === playerId);
        if (!player) return { success: false, error: 'Player not found' };
        const playerName = player.name;

        // Remove locally — local state is authoritative
        set((state) => ({ players: state.players.filter((p) => p.id !== playerId) }));

        // Best-effort backend sync
        try {
          await releasePlayerApi(playerId);
        } catch {
          // Backend call failed; local removal already committed. Log silently.
          console.warn(`[squadStore] releasePlayer backend sync failed for ${playerId}`);
        }

        return { success: true, playerName };
      },
    }),
    { name: 'squad-store', storage: zustandStorage },
  ),
);
