import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { NarrativeMessage } from '@/types/narrative';

interface NarrativeState {
  messages: NarrativeMessage[];

  addMessage: (message: NarrativeMessage) => void;
  markAsRead: (id: string) => void;
  markAsResponded: (id: string) => void;
  /** Delete a single message. Blocked if actionable and not yet responded. */
  deleteMessage: (id: string) => void;
  /** Mark all narrative messages as read. */
  markAllRead: () => void;
  /** Remove all messages that don't require a pending decision. */
  clearDeletable: () => void;
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

      deleteMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => {
            if (m.id !== id) return true;
            // Block deletion if awaiting a decision
            return m.isActionable && !m.respondedAt;
          }),
        })),

      markAllRead: () =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.readAt ? m : { ...m, readAt: new Date().toISOString() },
          ),
        })),

      clearDeletable: () =>
        set((state) => ({
          messages: state.messages.filter((m) => m.isActionable && !m.respondedAt),
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
