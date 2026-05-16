import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { loadClubRecentPlayerAppearances } from '@/db/repositories/appearanceRepository';

export interface InFormGameStat {
  week: number;
  rating: number;
  goals: number;
  assists: number;
  result: 'win' | 'loss' | 'draw';
  scoreline: string;
}

export interface InFormPlayerData {
  playerId: string;
  avgRating: number;
  last5: InFormGameStat[]; // ordered oldest → newest
}

export function useInFormPlayer(clubId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['in-form-player', clubId],
    queryFn: async (): Promise<InFormPlayerData | null> => {
      const rows = await loadClubRecentPlayerAppearances(db, clubId);

      // Group by player_id — rows are already ordered week DESC, take first 5 per player
      const byPlayer: Record<string, InFormGameStat[]> = {};
      for (const row of rows) {
        if (!byPlayer[row.player_id]) byPlayer[row.player_id] = [];
        if (byPlayer[row.player_id].length < 5) {
          byPlayer[row.player_id].push({
            week: row.week,
            rating: row.rating,
            goals: row.goals,
            assists: row.assists,
            result: row.result as InFormGameStat['result'],
            scoreline: row.scoreline,
          });
        }
      }

      let best: InFormPlayerData | null = null;
      for (const [playerId, games] of Object.entries(byPlayer)) {
        if (games.length === 0) continue;
        const avgRating = games.reduce((s, g) => s + g.rating, 0) / games.length;
        if (!best || avgRating > best.avgRating) {
          best = {
            playerId,
            avgRating,
            // reverse so chart renders oldest → newest (left → right)
            last5: [...games].reverse(),
          };
        }
      }

      return best;
    },
    enabled: !!clubId,
  });
}
