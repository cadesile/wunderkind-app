import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getPlayerSeasonStats } from '@/db/repositories/statsRepository';

export function usePlayerSeasonStats(playerId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: () => getPlayerSeasonStats(db, playerId),
    enabled: !!playerId,
  });
}
