import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BehavioralIncident } from '@/types/game';
import { zustandStorage } from '@/utils/storage';

export interface GuardianMessage {
  id: string;
  guardianId: string;
  playerId: string;
  week: number;
  subject: string;
  body: string;
  isRead: boolean;
  requiresResponse: boolean;
}

interface InboxState {
  messages: GuardianMessage[];
  incidents: BehavioralIncident[];
  addMessage: (msg: GuardianMessage) => void;
  markRead: (id: string) => void;
  addIncident: (incident: BehavioralIncident) => void;
  unreadCount: () => number;
}

export const useInboxStore = create<InboxState>()(
  persist(
    (set, get) => ({
      messages: [],
      incidents: [],
      addMessage: (msg) =>
        set((state) => ({ messages: [msg, ...state.messages] })),
      markRead: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, isRead: true } : m
          ),
        })),
      addIncident: (incident) =>
        set((state) => ({ incidents: [incident, ...state.incidents] })),
      unreadCount: () => get().messages.filter((m) => !m.isRead).length,
    }),
    { name: 'inbox-store', storage: zustandStorage }
  )
);
