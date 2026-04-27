import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import { AttendanceRecord } from '@/types/attendance';

interface AttendanceState {
  records: AttendanceRecord[];
  addRecord: (record: Omit<AttendanceRecord, 'id'>) => void;
  clearAll: () => void;
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set) => ({
      records: [],

      addRecord: (record) =>
        set((state) => ({
          // Keep the most recent 100 home games
          records: [{ ...record, id: uuidv7() }, ...state.records].slice(0, 100),
        })),

      clearAll: () => set({ records: [] }),
    }),
    { name: 'attendance-store', storage: zustandStorage },
  ),
);
