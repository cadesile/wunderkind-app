import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { GameEventTemplate, EventCategory } from '@/types/narrative';

const REFETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface EventState {
  templates: GameEventTemplate[];
  lastFetchedAt: string | null;

  setTemplates: (templates: GameEventTemplate[]) => void;
  getTemplateBySlug: (slug: string) => GameEventTemplate | undefined;
  getTemplatesByCategory: (category: EventCategory) => GameEventTemplate[];
  /** Weighted random selection — respects weight=0 exclusion. */
  getWeightedRandomTemplate: (category?: EventCategory) => GameEventTemplate | null;
  shouldRefetch: () => boolean;
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      templates: [],
      lastFetchedAt: null,

      setTemplates: (templates) =>
        set({ templates, lastFetchedAt: new Date().toISOString() }),

      getTemplateBySlug: (slug) =>
        get().templates.find((t) => t.slug === slug),

      getTemplatesByCategory: (category) =>
        get().templates.filter((t) => t.category === category),

      getWeightedRandomTemplate: (category) => {
        const eligible = get().templates.filter(
          (t) => (!category || t.category === category) && t.weight > 0,
        );
        if (eligible.length === 0) return null;

        const totalWeight = eligible.reduce((sum, t) => sum + t.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const template of eligible) {
          rand -= template.weight;
          if (rand <= 0) return template;
        }
        return eligible[0];
      },

      shouldRefetch: () => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        return Date.now() - new Date(lastFetchedAt).getTime() > REFETCH_INTERVAL_MS;
      },
    }),
    { name: 'event-store', storage: zustandStorage },
  ),
);
