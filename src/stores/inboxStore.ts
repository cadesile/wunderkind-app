import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BehavioralIncident } from '@/types/game';
import { zustandStorage } from '@/utils/storage';

export type InboxMessageType = 'guardian' | 'agent' | 'sponsor' | 'investor' | 'system';

export interface InboxMessage {
  id: string;
  type: InboxMessageType;
  week: number;
  subject: string;
  body: string;
  isRead: boolean;
  /** Present only when the message requires a binary response */
  requiresResponse?: boolean;
  /** Set once the user responds */
  response?: 'accepted' | 'rejected';
  /** Source entity id (playerId, sponsorId, etc.) — optional */
  entityId?: string;
  /**
   * Arbitrary offer/action metadata, keyed by message type.
   * Investor: { investmentAmount: number (£ whole), equityPct: number, investorName: string, investorSize: string }
   */
  metadata?: Record<string, unknown>;
}

/** @deprecated Use InboxMessage instead */
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
  messages: InboxMessage[];
  incidents: BehavioralIncident[];
  addMessage: (msg: InboxMessage) => void;
  markRead: (id: string) => void;
  respond: (id: string, response: 'accepted' | 'rejected') => void;
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
      respond: (id, response) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, response, isRead: true } : m
          ),
        })),
      addIncident: (incident) =>
        set((state) => ({ incidents: [incident, ...state.incidents] })),
      unreadCount: () => get().messages.filter((m) => !m.isRead).length,
    }),
    {
      name: 'inbox-store',
      storage: zustandStorage,
      // Migrate old GuardianMessage objects to InboxMessage on rehydration
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.messages = state.messages.map((m: any) => {
          if (m.type) return m as InboxMessage;
          // Legacy GuardianMessage — coerce to InboxMessage
          return {
            id: m.id,
            type: 'guardian' as InboxMessageType,
            week: m.week,
            subject: m.subject,
            body: m.body,
            isRead: m.isRead,
            requiresResponse: m.requiresResponse,
            entityId: m.playerId,
          } satisfies InboxMessage;
        });
      },
    }
  )
);
