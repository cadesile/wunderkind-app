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
      addEvent: (event) => set((state) => ({
        events: [{ ...event, id: uuidv7() }, ...state.events].slice(0, 50)
      })),
      setFanFavoriteId: (id) => set({ fanFavoriteId: id }),
      pruneEvents: (currentWeek) => set((state) => ({
        events: state.events.filter(e => currentWeek - e.weekNumber < 10)
      })),
    }),
    { name: 'fan-store', storage: zustandStorage }
  )
);
