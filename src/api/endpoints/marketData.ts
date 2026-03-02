import { apiRequest } from '@/api/client';
import { MarketDataResponse } from '@/types/market';

export function fetchMarketData(): Promise<MarketDataResponse> {
  return apiRequest<MarketDataResponse>('/api/market-data');
}
