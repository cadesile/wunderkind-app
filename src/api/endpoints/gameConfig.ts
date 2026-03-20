import { apiRequest } from '@/api/client';
import { GameConfig } from '@/types/gameConfig';

export async function fetchGameConfig(): Promise<GameConfig> {
  return apiRequest<GameConfig>('/api/game-config');
}
