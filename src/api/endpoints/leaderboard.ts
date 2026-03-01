import { apiRequest } from '@/api/client';
import { LeaderboardCategory, LeaderboardEntry } from '@/types/api';

export function getLeaderboard(
  category: LeaderboardCategory,
  period: string = 'all-time',
): Promise<LeaderboardEntry[]> {
  return apiRequest<LeaderboardEntry[]>(
    `/api/leaderboard/${category}?period=${encodeURIComponent(period)}`,
  );
}
