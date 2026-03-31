import { useEffect } from 'react';
import { useProspectPoolStore } from '@/stores/prospectPoolStore';

/**
 * Syncs the prospect pool from GET /api/market/data on app launch.
 * Respects the 1-hour TTL — no-ops when cache is warm.
 * Safe to mount at root layout. Silently no-ops offline.
 */
export function useProspectSync(): void {
  const { fetchProspects, shouldRefetch } = useProspectPoolStore();

  useEffect(() => {
    if (!shouldRefetch()) return;
    fetchProspects().catch((err) => {
      console.warn('[useProspectSync] Prospect pool sync failed:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
