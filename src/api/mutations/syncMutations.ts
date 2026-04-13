import { useMutation } from '@tanstack/react-query';
import { syncWeek } from '@/api/endpoints/sync';
import { useAcademyStore } from '@/stores/academyStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { SyncRequest, SyncAcceptedResponse } from '@/types/api';

export function useSyncWeek() {
  const updateFromSyncResponse = useAcademyStore((s) => s.updateFromSyncResponse);
  const setTemplates           = useFacilityStore((s) => s.setTemplates);

  return useMutation({
    mutationFn: (payload: SyncRequest) => syncWeek(payload),
    onSuccess: (data) => {
      if (data.accepted) {
        const accepted = data as SyncAcceptedResponse;

        // Server is authoritative — reconcile local academy state
        updateFromSyncResponse(accepted.academy);

        // Hydrate facility templates when backend delivers updated catalogue
        if (accepted.facilityTemplates && accepted.facilityTemplates.length > 0) {
          setTemplates(accepted.facilityTemplates);
        }
      } else {
        // Anti-cheat rejection: week rolled back on server
        console.warn('[sync] Week rollback detected. Server week:', data.currentWeek);
      }
    },
    retry: 3,
  });
}
