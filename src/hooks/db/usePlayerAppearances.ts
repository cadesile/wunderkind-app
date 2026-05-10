import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { loadPlayerAppearances } from '@/db/repositories/appearanceRepository';

export function usePlayerAppearances(playerId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['appearances', playerId],
    queryFn: () => loadPlayerAppearances(db, playerId),
    enabled: !!playerId,
  });
}
