import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getClubTopScorer } from '@/db/repositories/statsRepository';

export function useClubTopScorer(clubId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['club-top-scorer', clubId],
    queryFn: () => getClubTopScorer(db, clubId),
    enabled: !!clubId,
  });
}
