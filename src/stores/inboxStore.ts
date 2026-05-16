import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BehavioralIncident } from '@/types/game';
import { zustandStorage } from '@/utils/storage';

export type InboxMessageType = 'guardian' | 'agent' | 'sponsor' | 'investor' | 'system' | 'scout' | 'development' | 'match_result' | 'transfer_offer';

export interface InboxMessage {
  id: string;
  type: InboxMessageType;
  week: number;
  createdAt?: string;
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
  /** Index of the choice selected by the auto-manager, if applicable. */
  autoManagedChoiceIndex?: number;
  /** Per-player choices for management panels (playerId -> index). 0=Support, 1=Punish. */
  autoManagedPlayerChoices?: Record<string, number>;
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
  respond: (id: string, response: 'accepted' | 'rejected', autoMarkRead?: boolean, autoManagedChoiceIndex?: number) => void;
  addIncident: (incident: BehavioralIncident) => void;
  /** Delete a single message. Blocked if requiresResponse and no response yet. */
  deleteMessage: (id: string) => void;
  /** Mark all messages as read. */
  markAllRead: () => void;
  /** Remove all messages that don't require a pending decision. */
  clearDeletable: () => void;
  /** Remove all inbox messages associated with a departed player. */
  purgeForPlayer: (playerId: string) => void;
  unreadCount: () => number;
}

export const useInboxStore = create<InboxState>()(
  persist(
    (set, get) => ({
      messages: [],
      incidents: [],

      addMessage: (msg) => {
        const gameDate = require('@/stores/calendarStore').useCalendarStore.getState().gameDate;
        set((state) => ({
          messages: [{ createdAt: gameDate ?? new Date().toISOString(), ...msg }, ...state.messages],
        }));
      },

      markRead: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, isRead: true } : m
          ),
        })),

      respond: (id, response, autoMarkRead = true, autoManagedChoiceIndex) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id
              ? {
                  ...m,
                  response,
                  isRead: autoMarkRead ? true : m.isRead,
                  autoManagedChoiceIndex: autoManagedChoiceIndex ?? m.autoManagedChoiceIndex,
                }
              : m
          ),
        })),

      addIncident: (incident) =>
        set((state) => ({ incidents: [incident, ...state.incidents] })),

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

      purgeForPlayer: (playerId) =>
        set((state) => {
          const keepMessage = (m: InboxMessage): boolean => {
            // Direct entity link (guardian complaints, injury notices)
            if (m.entityId === playerId) return false;
            // Digest messages listing multiple players
            const ids = m.metadata?.playerIds;
            if (Array.isArray(ids) && ids.includes(playerId)) return false;
            return true;
          };
          return {
            messages: state.messages.filter(keepMessage),
          };
        }),

      unreadCount: () => {
        const state = get();
        return state.messages.filter((m) => !m.isRead).length;
      },
    }),
    {
      name: 'inbox-store',
      storage: zustandStorage,
      // Cap messages at 200; strip homePlayers/awayPlayers from match_result metadata —
      // that player data is already in matchResultStore keyed by fixtureId (~1.1KB saved per message).
      // Cap incidents at 100.
      partialize: (state) => ({
        messages: state.messages.slice(0, 200).map((m) => {
          if (m.type !== 'match_result' || !m.metadata) return m;
          const { homePlayers: _h, awayPlayers: _a, ...rest } = m.metadata as Record<string, unknown>;
          return { ...m, metadata: rest };
        }),
        incidents: state.incidents.slice(0, 100),
      }),
      // Migrate old GuardianMessage objects to InboxMessage on rehydration
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.messages = state.messages.map((m: any) => {
          if (m.type) {
            // Backfill createdAt for existing messages that predate this field
            return { createdAt: new Date().toISOString(), ...m } as InboxMessage;
          }
          // Legacy GuardianMessage — coerce to InboxMessage
          return {
            id: m.id,
            type: 'guardian' as InboxMessageType,
            week: m.week,
            createdAt: new Date().toISOString(),
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
