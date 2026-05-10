import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getPlayerCareerTotals } from '@/db/repositories/statsRepository';

export function usePlayerCareerTotals(playerId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['player-career', playerId],
    queryFn: () => getPlayerCareerTotals(db, playerId),
    enabled: !!playerId,
  });
}
