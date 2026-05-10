import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getByFixtureId } from '@/db/repositories/matchResultRepository';

export function useMatchResult(fixtureId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['match-result', fixtureId],
    queryFn: () => getByFixtureId(db, fixtureId),
    enabled: !!fixtureId,
  });
}
