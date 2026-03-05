import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { NarrativeMessage } from '@/types/narrative';

interface NarrativeState {
  messages: NarrativeMessage[];

  addMessage: (message: NarrativeMessage) => void;
  markAsRead: (id: string) => void;
  markAsResponded: (id: string) => void;
  unreadCount: () => number;
  getActionableMessages: () => NarrativeMessage[];
  clearAll: () => void;
}

export const useNarrativeStore = create<NarrativeState>()(
  persist(
    (set, get) => ({
      messages: [],

      addMessage: (message) =>
        set((state) => ({ messages: [message, ...state.messages] })),

      markAsRead: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, readAt: new Date().toISOString() } : m,
          ),
        })),

      markAsResponded: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, respondedAt: new Date().toISOString() } : m,
          ),
        })),

      unreadCount: () =>
        get().messages.filter((m) => !m.readAt).length,

      getActionableMessages: () =>
        get().messages.filter((m) => m.isActionable && !m.respondedAt),

      clearAll: () => set({ messages: [] }),
    }),
    { name: 'narrative-store', storage: zustandStorage },
  ),
);
