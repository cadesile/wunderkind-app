import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { loadSeasonFixtures } from '@/db/repositories/fixtureRepository';

export function useFixtures(leagueId: string, season: number) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['fixtures', leagueId, season],
    queryFn: () => loadSeasonFixtures(db, leagueId, season),
    enabled: !!leagueId && season > 0,
  });
}
