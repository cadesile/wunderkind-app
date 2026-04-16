import { apiRequest } from '@/api/client';
import { WorldPackResponse } from '@/types/world';

export function initializeWorld(): Promise<WorldPackResponse> {
  return apiRequest<WorldPackResponse>('/api/initialize', {
    method: 'POST',
  });
}
