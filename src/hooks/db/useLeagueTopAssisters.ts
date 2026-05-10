import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getLeagueTopAssisters } from '@/db/repositories/statsRepository';

export function useLeagueTopAssisters(leagueId: string, season: number) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['league-assisters', leagueId, season],
    queryFn: () => getLeagueTopAssisters(db, leagueId, season),
    enabled: !!leagueId && season > 0,
  });
}
