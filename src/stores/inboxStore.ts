import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BehavioralIncident } from '@/types/game';
import { AgentOffer } from '@/types/narrative';
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
  agentOffers: AgentOffer[];
  addMessage: (msg: InboxMessage) => void;
  markRead: (id: string) => void;
  respond: (id: string, response: 'accepted' | 'rejected') => void;
  addIncident: (incident: BehavioralIncident) => void;
  addAgentOffer: (offer: AgentOffer) => void;
  /** Mark offer as accepted (status update only — balance/player changes handled by handler). */
  acceptAgentOffer: (offerId: string) => void;
  /** Mark offer as rejected (status update only — morale change handled by handler). */
  rejectAgentOffer: (offerId: string) => void;
  /** Mark as expired any offers whose expiresWeek <= currentWeek. */
  expireOldOffers: (currentWeek: number) => void;
  /** Delete a single message. Blocked if requiresResponse and no response yet. */
  deleteMessage: (id: string) => void;
  /** Mark all messages as read. */
  markAllRead: () => void;
  /** Remove all messages that don't require a pending decision. */
  clearDeletable: () => void;
  unreadCount: () => number;
}

export const useInboxStore = create<InboxState>()(
  persist(
    (set, get) => ({
      messages: [],
      incidents: [],
      agentOffers: [],

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

      addAgentOffer: (offer) =>
        set((state) => ({ agentOffers: [offer, ...state.agentOffers] })),

      acceptAgentOffer: (offerId) =>
        set((state) => ({
          agentOffers: state.agentOffers.map((o) =>
            o.id === offerId ? { ...o, status: 'accepted' as const } : o
          ),
        })),

      rejectAgentOffer: (offerId) =>
        set((state) => ({
          agentOffers: state.agentOffers.map((o) =>
            o.id === offerId ? { ...o, status: 'rejected' as const } : o
          ),
        })),

      expireOldOffers: (currentWeek) =>
        set((state) => ({
          agentOffers: state.agentOffers.map((o) =>
            o.status === 'pending' && o.expiresWeek <= currentWeek
              ? { ...o, status: 'expired' as const }
              : o
          ),
        })),

      deleteMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => {
            if (m.id !== id) return true;
            // Block deletion if awaiting a decision
            return m.requiresResponse && !m.response;
          }),
        })),

      markAllRead: () =>
        set((state) => ({
          messages: state.messages.map((m) => ({ ...m, isRead: true })),
        })),

      clearDeletable: () =>
        set((state) => ({
          messages: state.messages.filter((m) => m.requiresResponse && !m.response),
        })),

      unreadCount: () => {
        const state = get();
        const unreadMessages = state.messages.filter((m) => !m.isRead).length;
        const pendingOffers = state.agentOffers.filter((o) => o.status === 'pending').length;
        return unreadMessages + pendingOffers;
      },
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
