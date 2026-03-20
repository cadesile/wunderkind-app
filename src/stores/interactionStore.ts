import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import {
  InteractionRecord,
  Clique,
  DressingRoomHealth,
  GroupSessionEntry,
} from '@/types/interaction';

interface InteractionState {
  records: InteractionRecord[];
  cliques: Clique[];
  dressingRoomHealth: DressingRoomHealth | null;
  groupSessionLog: GroupSessionEntry[];

  // ── Core logging ────────────────────────────────────────────────────────────
  /** Single entry point for all interaction logging. Assigns id and timestamp. */
  logInteraction: (record: Omit<InteractionRecord, 'id' | 'timestamp'>) => void;

  // ── Queries ─────────────────────────────────────────────────────────────────
  /** All records where this entity is actor OR target */
  getRecordsForEntity: (entityId: string) => InteractionRecord[];
  /** All records between two specific entities (both directions) */
  getRecordsBetween: (idA: string, idB: string) => InteractionRecord[];
  /** AMP-visible records for an entity, newest first. Optional limit. */
  getVisibleRecords: (entityId: string, limit?: number) => InteractionRecord[];
  /** Group sessions of a given type within the last N weeks */
  getRecentGroupSessions: (
    targetType: 'squad' | 'staff',
    withinWeeks: number,
  ) => GroupSessionEntry[];

  // ── Group session tracking ───────────────────────────────────────────────────
  logGroupSession: (entry: GroupSessionEntry) => void;

  // ── Social graph (written by SocialGraphEngine in Phase 4) ──────────────────
  updateCliques: (cliques: Clique[]) => void;
  updateDressingRoomHealth: (health: DressingRoomHealth) => void;
  /** AMP renames a clique */
  renameClique: (cliqueId: string, name: string) => void;
}

export const useInteractionStore = create<InteractionState>()(
  persist(
    (set, get) => ({
      records: [],
      cliques: [],
      dressingRoomHealth: null,
      groupSessionLog: [],

      logInteraction: (record) => {
        const full: InteractionRecord = {
          ...record,
          id: uuidv7(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({ records: [full, ...state.records] }));
      },

      getRecordsForEntity: (entityId) =>
        get().records.filter(
          (r) => r.actorId === entityId || r.targetId === entityId || r.secondaryTargetId === entityId,
        ),

      getRecordsBetween: (idA, idB) =>
        get().records.filter(
          (r) =>
            (r.actorId === idA && (r.targetId === idB || r.secondaryTargetId === idB)) ||
            (r.actorId === idB && (r.targetId === idA || r.secondaryTargetId === idA)),
        ),

      getVisibleRecords: (entityId, limit) => {
        const visible = get()
          .records.filter(
            (r) =>
              r.isVisibleToAmp &&
              (r.actorId === entityId || r.targetId === entityId || r.secondaryTargetId === entityId),
          );
        return limit ? visible.slice(0, limit) : visible;
      },

      getRecentGroupSessions: (targetType, _withinWeeks) =>
        get().groupSessionLog.filter((e) => e.targetType === targetType),

      logGroupSession: (entry) =>
        set((state) => ({
          groupSessionLog: [entry, ...state.groupSessionLog],
        })),

      updateCliques: (cliques) => set({ cliques }),

      updateDressingRoomHealth: (health) => set({ dressingRoomHealth: health }),

      renameClique: (cliqueId, name) =>
        set((state) => ({
          cliques: state.cliques.map((c) =>
            c.id === cliqueId ? { ...c, name } : c,
          ),
        })),
    }),
    { name: 'interaction-store', storage: zustandStorage },
  ),
);
