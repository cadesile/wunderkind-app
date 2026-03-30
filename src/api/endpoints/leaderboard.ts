import { apiRequest } from '@/api/client';
import {
  LeaderboardCategory,
  LeaderboardParams,
  LeaderboardResponse,
} from '@/types/api';

export function getLeaderboard(
  category: LeaderboardCategory,
  params: LeaderboardParams = {},
): Promise<LeaderboardResponse> {
  const { page = 1, pageSize = 20, scope = 'global' } = params;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    scope,
  });

  return apiRequest<LeaderboardResponse>(
    `/api/leaderboard/${category}?${query.toString()}`,
  );
}
