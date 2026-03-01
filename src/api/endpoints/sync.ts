import { apiRequest } from '@/api/client';
import { SyncRequest, SyncResponse } from '@/types/api';

export function syncWeek(payload: SyncRequest): Promise<SyncResponse> {
  return apiRequest<SyncResponse>('/api/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
