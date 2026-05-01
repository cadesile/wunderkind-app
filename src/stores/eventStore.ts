import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { GameEventTemplate, EventCategory } from '@/types/narrative';

const REFETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
/** A fired template is suppressed for this many weeks (skips 2 further advances). */
const TEMPLATE_COOLDOWN_WEEKS = 3;

interface EventState {
  templates: GameEventTemplate[];
  lastFetchedAt: string | null;
  /**
   * Cooldown map: templateSlug → first week it may fire again.
   * A template is on cooldown while currentWeek < recentlyFired[slug].
   */
  recentlyFired: Record<string, number>;

  setTemplates: (templates: GameEventTemplate[]) => void;
  getTemplateBySlug: (slug: string) => GameEventTemplate | undefined;
  getTemplatesByCategory: (category: EventCategory) => GameEventTemplate[];
  /**
   * Weighted random selection — respects weight=0 exclusion and per-template cooldowns.
   * Pass currentWeek to enable cooldown filtering; omit to skip filtering.
   */
  getWeightedRandomTemplate: (category?: EventCategory, currentWeek?: number) => GameEventTemplate | null;
  /**
   * Record that a template fired this week.
   * It will be excluded from selection for the next TEMPLATE_COOLDOWN_WEEKS weeks.
   */
  markFired: (slug: string, currentWeek: number) => void;
  /** Prune entries whose cooldown has already expired. Call once per tick. */
  expireCooldowns: (currentWeek: number) => void;
  shouldRefetch: () => boolean;
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      templates: [],
      lastFetchedAt: null,
      recentlyFired: {},

      setTemplates: (templates) =>
        set({ templates, lastFetchedAt: new Date().toISOString() }),

      getTemplateBySlug: (slug) =>
        get().templates.find((t) => t.slug === slug),

      getTemplatesByCategory: (category) =>
        get().templates.filter((t) => t.category === category),

      getWeightedRandomTemplate: (category, currentWeek) => {
        const { recentlyFired } = get();
        const eligible = get().templates.filter((t) => {
          if (category && t.category !== category) return false;
          if (t.weight <= 0) return false;
          if (currentWeek !== undefined && (recentlyFired[t.slug] ?? 0) > currentWeek) return false;
          return true;
        });
        if (eligible.length === 0) return null;

        const totalWeight = eligible.reduce((sum, t) => sum + t.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const template of eligible) {
          rand -= template.weight;
          if (rand <= 0) return template;
        }
        return eligible[0];
      },

      markFired: (slug, currentWeek) =>
        set((state) => ({
          recentlyFired: {
            ...state.recentlyFired,
            [slug]: currentWeek + TEMPLATE_COOLDOWN_WEEKS,
          },
        })),

      expireCooldowns: (currentWeek) =>
        set((state) => {
          const next: Record<string, number> = {};
          for (const [slug, expiresWeek] of Object.entries(state.recentlyFired)) {
            if (expiresWeek > currentWeek) next[slug] = expiresWeek;
          }
          return { recentlyFired: next };
        }),

      shouldRefetch: () => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        return Date.now() - new Date(lastFetchedAt).getTime() > REFETCH_INTERVAL_MS;
      },
    }),
    { name: 'event-store', storage: zustandStorage },
  ),
);
