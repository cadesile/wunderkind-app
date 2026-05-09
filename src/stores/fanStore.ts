import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import type { FanEvent, FanState as ClubFanState } from '@/types/fans';
import type { StarterConfig } from '@/types/api';
import type { WorldClub } from '@/types/world';

// Default fan base ranges if the backend doesn't supply them
const DEFAULT_FAN_BASE_RANGES: Record<string, { min: number; max: number }> = {
  '1': { min: 50000, max: 200000 },
  '2': { min: 20000, max:  80000 },
  '3': { min:  8000, max:  30000 },
  '4': { min:  3000, max:  12000 },
  '5': { min:  1000, max:   5000 },
  '6': { min:   500, max:   2500 },
  '7': { min:   200, max:   1000 },
  '8': { min:   100, max:    500 },
};

interface FanStoreState {
  /** Per-club fan engagement state. One entry per club (AMP and NPC). */
  fans: ClubFanState[];
  events: FanEvent[];
  fanFavoriteId: string | null;
  /** True while fans are actively demanding the manager be sacked. */
  managerSackingDemandActive: boolean;
  /**
   * Accumulated income penalty (pence) while sacking demand is active.
   * Deducted from matchday income on home-match weeks.
   * Reset to 0 when demand resolves.
   */
  managerSackingAttendancePenalty: number;

  // ── Fan base actions ────────────────────────────────────────────────────────
  /**
   * Called once at world init. Creates a FanState for each club using
   * tier-based fanBaseRanges from starterConfig to pick a random fan count.
   * Sentiment and morale both start at 60.
   */
  initialiseFans: (clubs: WorldClub[], starterConfig: StarterConfig) => void;
  getFanState: (clubId: string) => ClubFanState | undefined;
  updateFanCount: (clubId: string, newCount: number) => void;
  updateSentiment: (clubId: string, delta: number) => void;
  updateMorale: (clubId: string, delta: number) => void;
  resetFans: () => void;

  // ── Sacking demand actions ───────────────────────────────────────────────────
  setManagerSackingDemand: (active: boolean) => void;
  addAttendancePenalty: (amount: number) => void;
  resetAttendancePenalty: () => void;

  // ── Event actions ───────────────────────────────────────────────────────────
  addEvent: (event: Omit<FanEvent, 'id'>) => void;
  setFanFavoriteId: (id: string | null) => void;
  pruneEvents: (currentWeek: number) => void;
}

export const useFanStore = create<FanStoreState>()(
  persist(
    (set, get) => ({
      fans: [],
      events: [],
      fanFavoriteId: null,
      managerSackingDemandActive: false,
      managerSackingAttendancePenalty: 0,

      initialiseFans: (clubs, starterConfig) => {
        const ranges = starterConfig.fanBaseRanges ?? DEFAULT_FAN_BASE_RANGES;
        const fans: ClubFanState[] = clubs.map((club) => {
          const tierKey = String(club.tier);
          const range = ranges[tierKey] ?? { min: 500, max: 2000 };
          const fanCount = Math.floor(range.min + Math.random() * (range.max - range.min + 1));
          return { clubId: club.id, fanCount, sentiment: 60, morale: 60 };
        });
        set({ fans });
      },

      getFanState: (clubId) => get().fans.find((f) => f.clubId === clubId),

      updateFanCount: (clubId, newCount) =>
        set((state) => ({
          fans: state.fans.map((f) =>
            f.clubId === clubId ? { ...f, fanCount: Math.max(0, newCount) } : f,
          ),
        })),

      updateSentiment: (clubId, delta) =>
        set((state) => ({
          fans: state.fans.map((f) =>
            f.clubId === clubId
              ? { ...f, sentiment: Math.min(100, Math.max(0, f.sentiment + delta)) }
              : f,
          ),
        })),

      updateMorale: (clubId, delta) =>
        set((state) => ({
          fans: state.fans.map((f) =>
            f.clubId === clubId
              ? { ...f, morale: Math.min(100, Math.max(0, f.morale + delta)) }
              : f,
          ),
        })),

      resetFans: () => set({ fans: [], managerSackingDemandActive: false, managerSackingAttendancePenalty: 0 }),

      setManagerSackingDemand: (active) => set({ managerSackingDemandActive: active }),
      addAttendancePenalty: (amount) =>
        set((state) => ({ managerSackingAttendancePenalty: state.managerSackingAttendancePenalty + amount })),
      resetAttendancePenalty: () => set({ managerSackingAttendancePenalty: 0 }),

      addEvent: (event) =>
        set((state) => {
          const newEvent = { ...event, id: uuidv7() };
          const all = [newEvent, ...state.events];
          const permanent    = all.filter((e) => e.isPermanent);
          const nonPermanent = all.filter((e) => !e.isPermanent).slice(0, Math.max(0, 50 - permanent.length));
          return { events: all.filter((e) => e.isPermanent || nonPermanent.includes(e)) };
        }),

      setFanFavoriteId: (id) => set({ fanFavoriteId: id }),

      pruneEvents: (currentWeek) =>
        set((state) => ({
          events: state.events.filter(
            (e) => e.isPermanent || (currentWeek - e.weekNumber) < 52,
          ),
        })),
    }),
    { name: 'fan-store', storage: zustandStorage }
  )
);
