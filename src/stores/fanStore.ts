import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import { FanEvent } from '@/types/fans';

interface FanState {
  events: FanEvent[];
  fanFavoriteId: string | null;
  addEvent: (event: Omit<FanEvent, 'id'>) => void;
  setFanFavoriteId: (id: string | null) => void;
  pruneEvents: (currentWeek: number) => void;
}

export const useFanStore = create<FanState>()(
  persist(
    (set) => ({
      events: [],
      fanFavoriteId: null,
      addEvent: (event) =>
        set((state) => {
          const newEvent = { ...event, id: uuidv7() };
          const all = [newEvent, ...state.events];
          const permanent    = all.filter((e) => e.isPermanent);
          const nonPermanent = all
            .filter((e) => !e.isPermanent)
            .slice(0, Math.max(0, 50 - permanent.length));
          return { events: [...permanent, ...nonPermanent] };
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
