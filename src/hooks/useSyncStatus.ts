import { useEffect, useState } from 'react';
import { syncQueue, SyncQueueStatus } from '@/api/syncQueue';

/** Maps internal queue status to the SyncStatusIndicator's prop type */
export type IndicatorStatus = 'synced' | 'syncing' | 'pending' | 'offline';

const STATUS_MAP: Record<SyncQueueStatus, IndicatorStatus> = {
  idle:    'synced',
  syncing: 'syncing',
  pending: 'pending',
};

/**
 * Subscribes to the background sync queue and returns a live status
 * compatible with <SyncStatusIndicator status={...} />.
 */
export function useSyncStatus(): IndicatorStatus {
  const [status, setStatus] = useState<IndicatorStatus>(
    STATUS_MAP[syncQueue.status],
  );

  useEffect(() => {
    // subscribe() immediately emits current status, so state is in sync on mount
    return syncQueue.subscribe((s) => setStatus(STATUS_MAP[s]));
  }, []);

  return status;
}
