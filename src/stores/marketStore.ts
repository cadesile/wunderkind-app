import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, Scout, Investor, Sponsor, MarketDataResponse } from '@/types/market';
import { zustandStorage } from '@/utils/storage';

interface MarketState {
  agents: Agent[];
  scouts: Scout[];
  investors: Investor[];
  sponsors: Sponsor[];
  lastFetchedAt: string | null;
  setMarketData: (data: MarketDataResponse) => void;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set) => ({
      agents: [],
      scouts: [],
      investors: [],
      sponsors: [],
      lastFetchedAt: null,
      setMarketData: (data) =>
        set({
          agents: data.agents,
          scouts: data.scouts,
          investors: data.investors,
          sponsors: data.sponsors,
          lastFetchedAt: new Date().toISOString(),
        }),
    }),
    { name: 'market-store', storage: zustandStorage }
  )
);
