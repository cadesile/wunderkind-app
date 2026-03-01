import { useMutation } from '@tanstack/react-query';
import { syncWeek } from '@/api/endpoints/sync';
import { useAcademyStore } from '@/stores/academyStore';
import { SyncRequest, SyncAcceptedResponse } from '@/types/api';

export function useSyncWeek() {
  const applyServerSync = useAcademyStore((s) => s.applyServerSync);

  return useMutation({
    mutationFn: (payload: SyncRequest) => syncWeek(payload),
    onSuccess: (data) => {
      if (data.accepted) {
        // Server is authoritative on aggregates — reconcile local state
        applyServerSync((data as SyncAcceptedResponse).academy);
      } else {
        // Anti-cheat rejection: week rolled back on server
        console.warn('[sync] Week rollback detected. Server week:', data.currentWeek);
      }
    },
    retry: 3,
  });
}
