import { useMutation } from '@tanstack/react-query';
import { syncWeek } from '@/api/endpoints/sync';
import { useAcademyStore } from '@/stores/academyStore';
import { SyncRequest, SyncAcceptedResponse } from '@/types/api';

export function useSyncWeek() {
  const updateFromSyncResponse = useAcademyStore((s) => s.updateFromSyncResponse);

  return useMutation({
    mutationFn: (payload: SyncRequest) => syncWeek(payload),
    onSuccess: (data) => {
      if (data.accepted) {
        // Server is authoritative — reconcile local state (includes balance if returned)
        updateFromSyncResponse((data as SyncAcceptedResponse).academy);
      } else {
        // Anti-cheat rejection: week rolled back on server
        console.warn('[sync] Week rollback detected. Server week:', data.currentWeek);
      }
    },
    retry: 3,
  });
}
