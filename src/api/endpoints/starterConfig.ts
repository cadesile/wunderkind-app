import { apiRequest } from '@/api/client';
import { StarterConfig } from '@/types/api';

/**
 * GET /api/starter-config
 * Public endpoint — no JWT required.
 * Returns the canonical starting academy bundle for new game initialisation.
 */
export async function fetchStarterConfig(): Promise<StarterConfig> {
  return apiRequest<StarterConfig>('/api/starter-config');
}
