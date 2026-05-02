/**
 * Background Sync Queue
 *
 * Decouples game-state updates from network I/O.
 * - Payloads are enqueued immediately after a Weekly Tick and persisted to
 *   AsyncStorage so they survive app restarts.
 * - The queue fires POST /api/sync sequentially, after UI interactions have
 *   settled (InteractionManager.runAfterInteractions).
 * - 409 week_rollback: alerts the user and resets local weekNumber.
 * - Network failures are silent — the item stays queued for retry on next launch.
 * - 401 token expiry is already handled inside apiRequest() in client.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { syncWeek } from '@/api/endpoints/sync';
import { useClubStore } from '@/stores/clubStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useWorldStore } from '@/stores/worldStore';
import { SyncRequest } from '@/types/api';

const QUEUE_STORAGE_KEY = 'wk-sync-queue';

export type SyncQueueStatus = 'idle' | 'syncing' | 'pending';
type StatusListener = (s: SyncQueueStatus) => void;

class SyncQueue {
  private queue: SyncRequest[] = [];
  private processing = false;
  private _status: SyncQueueStatus = 'idle';
  private listeners = new Set<StatusListener>();

  // ── Public API ──────────────────────────────────────────────────────────────

  get status(): SyncQueueStatus {
    return this._status;
  }

  /** Subscribe to status changes. Returns an unsubscribe function. */
  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current status so subscriber is in sync
    listener(this._status);
    return () => this.listeners.delete(listener);
  }

  /**
   * Called once on app startup (app/_layout.tsx).
   * Loads any persisted queue and schedules a retry if items exist.
   */
  async init(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SyncRequest[];
        if (saved.length > 0) {
          this.queue = saved;
          this.notify('pending');
          this.schedule();
        }
      }
    } catch {
      // Storage read failure is non-fatal
    }
  }

  /**
   * Add a payload to the queue and trigger background processing.
   * Deduplicates by weekNumber — won't enqueue the same week twice.
   */
  enqueue(payload: SyncRequest): void {
    if (this.queue.some((q) => q.weekNumber === payload.weekNumber)) return;
    this.queue.push(payload);
    void this.persist();
    this.notify(this.processing ? 'pending' : 'syncing');
    if (!this.processing) this.schedule();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private notify(s: SyncQueueStatus) {
    this._status = s;
    this.listeners.forEach((l) => l(s));
  }

  /** Fire processNext after all pending UI interactions settle */
  private schedule(): void {
    InteractionManager.runAfterInteractions(() => {
      void this.processNext();
    });
  }

  /** Persist the current queue to AsyncStorage */
  private async persist(): Promise<void> {
    try {
      if (this.queue.length === 0) {
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      }
    } catch {
      // Persist failure is non-fatal
    }
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    this.notify('syncing');

    const payload = this.queue[0];

    try {
      const res = await syncWeek(payload);

      if (res.accepted) {
        // Server accepted — reconcile authoritative aggregates locally
        useClubStore.getState().applyServerSync(res.club);
        // Piggyback: update engine config if the server sent a newer version
        if (res.gameConfig) {
          useGameConfigStore.getState().setConfig(res.gameConfig);
        }
        // Piggyback: hydrate facility templates from the server catalogue
        if (res.facilityTemplates && res.facilityTemplates.length > 0) {
          useFacilityStore.getState().setTemplates(res.facilityTemplates);
        }
        // League + fixture handling: mirror useSyncWeek.onSuccess logic
        if (res.league === null) {
          useLeagueStore.getState().clear();
          useFixtureStore.getState().clearSeason();
        } else {
          const currentLeague = useLeagueStore.getState().league;
          // Skip entirely if the sync response is from a previous season —
          // performSeasonTransition may have already advanced leagueStore.
          if (!currentLeague || res.league.season >= currentLeague.season) {
            // Use worldStore as the authoritative source for NPC club membership.
            // The sync endpoint can return pre-transition club lists when it resolves
            // after applySeasonUpdate has already rewritten league memberships. Rebuilding
            // from worldStore.leagues ensures promoted/relegated clubs are reflected correctly.
            const worldState = useWorldStore.getState();
            const worldLeague = worldState.leagues.find((l) => l.id === res.league!.id);
            const hasWorldClubs = Object.keys(worldState.clubs).length > 0;
            const clubs = (worldLeague && hasWorldClubs)
              ? worldLeague.clubIds.flatMap((id) => {
                  const c = worldState.clubs[id];
                  if (!c) return [];
                  return [{ id: c.id, name: c.name, reputation: c.reputation, tier: c.tier,
                            primaryColor: c.primaryColor, secondaryColor: c.secondaryColor,
                            stadiumName: c.stadiumName ?? null, facilities: c.facilities }];
                })
              : res.league.clubs;
            useLeagueStore.getState().setFromSync({ ...res.league, clubs });
            const { fixtures } = useFixtureStore.getState();
            const hasFixtures = fixtures.some(
              (f) => f.leagueId === res.league!.id && f.season === res.league!.season,
            );
            if (!hasFixtures) {
              useFixtureStore.getState().generateFixtures(res.league, res.club.id);
            }
          }
        }
        this.queue.shift();
        await this.persist();
      } else {
        // 409 week_rollback: server's week is behind client
        // Discard entire queue (stale data), reset local week, alert user
        this.queue = [];
        await this.persist();
        useClubStore.getState().rollbackWeek(res.currentWeek);
        this.processing = false;
        this.notify('idle');
        useInboxStore.getState().addMessage({
          id: `sync-conflict-${res.currentWeek}-${Date.now()}`,
          type: 'system',
          week: res.currentWeek,
          subject: 'Sync Conflict',
          body: `Week mismatch detected. Local progress has been rolled back to Week ${res.currentWeek} to match the server.`,
          isRead: false,
        });
        return;
      }
    } catch {
      // Network failure / timeout — leave item in queue, retry on next launch
      // Do not spam retry within the same session
    }

    this.processing = false;

    if (this.queue.length > 0) {
      // More items waiting — show pending indicator, retry after short delay
      this.notify('pending');
      setTimeout(() => void this.processNext(), 3000);
    } else {
      this.notify('idle');
    }
  }
}

export const syncQueue = new SyncQueue();
