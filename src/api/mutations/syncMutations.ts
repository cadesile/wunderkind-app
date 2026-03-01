import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/api/client';
import { Academy } from '@/types/academy';

interface SyncPayload {
  academyId: string;
  reputation: number;
  totalCareerEarnings: number;
  week: number;
}

/** Syncs high-level academy metrics to the Symfony backend */
export function useSyncAcademy() {
  return useMutation({
    mutationFn: (payload: SyncPayload) =>
      apiRequest<Academy>(`/academies/${payload.academyId}/sync`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    // TanStack Query will retry offline mutations automatically when connectivity returns
    retry: 3,
  });
}
