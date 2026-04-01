import { create } from 'zustand';

export type LogLevel = 'request' | 'response_ok' | 'response_error' | 'app_error';

export interface DebugLogEntry {
  id: string;
  timestamp: string;       // ISO string
  level: LogLevel;
  method?: string;         // GET / POST / etc
  path: string;            // /api/...
  statusCode?: number;
  durationMs?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string;
}

interface DebugLogState {
  entries: DebugLogEntry[];
  addEntry: (entry: DebugLogEntry) => void;
  clear: () => void;
}

const MAX_ENTRIES = 200;

export const useDebugLogStore = create<DebugLogState>()((set) => ({
  entries: [],
  addEntry: (entry) =>
    set((s) => ({
      entries: [entry, ...s.entries].slice(0, MAX_ENTRIES),
    })),
  clear: () => set({ entries: [] }),
}));
