import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getLeagueTopScorers } from '@/db/repositories/statsRepository';

export function useLeagueTopScorers(leagueId: string, season: number) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['league-scorers', leagueId, season],
    queryFn: () => getLeagueTopScorers(db, leagueId, season),
    enabled: !!leagueId && season > 0,
  });
}
