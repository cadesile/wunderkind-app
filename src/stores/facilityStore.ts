import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FacilityTemplate,
  FacilityLevels,
  FacilityConditions,
  FALLBACK_FACILITY_TEMPLATES,
  weeklyDecayRate,
  repairFacilityCost,
} from '@/types/facility';
import { zustandStorage } from '@/utils/storage';
import { computeFacilityTier } from '@/utils/tierGate';
import type { ClubTier } from '@/types/club';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Upgrade cost in whole pounds from currentLevel → next level */
export function facilityUpgradeCost(template: FacilityTemplate, currentLevel: number): number {
  if (currentLevel >= template.maxLevel) return Infinity;
  return Math.round(((currentLevel + 1) * template.baseCost) / 100);
}

/** Weekly upkeep cost in pence for a facility at a given level */
export function calculateFacilityUpkeep(template: FacilityTemplate, level: number): number {
  if (level === 0) return 0;
  return Math.floor(template.weeklyUpkeepBase * Math.pow(1.5, level));
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface FacilityState {
  /** Live templates from backend (or fallback until first sync) */
  templates: FacilityTemplate[];
  levels: FacilityLevels;
  conditions: FacilityConditions;

  /** Called from sync handler when backend delivers updated templates */
  setTemplates: (templates: FacilityTemplate[]) => void;

  upgradeLevel: (slug: string) => boolean;
  /**
   * Initialises facility levels from the starter-config `defaultFacilities` map.
   * Slugs not present in the map default to 0. Falls back to `technical_zone: 1`
   * if no map is provided (legacy / offline path).
   */
  initAllLevels: (defaultFacilities?: Record<string, number>) => void;
  /** Decays all built facilities by their weekly rate. Called at end of each game tick. */
  decayCondition: () => void;
  /** Restores facility condition to 100%. Deducts cost from club balance. */
  repairFacility: (slug: string) => void;
  /** Squad capacity: base 15, or 10 + physio_clinic.level × 3 if built */
  maxSquadSize: () => number;
  /** Scouting/trait visibility unlocked once scouting_center ≥ 1 */
  analyticsUnlocked: () => boolean;
  /** Total weekly maintenance cost across all facilities (pence) */
  totalWeeklyMaintenance: () => number;
  /** Highest tier unlocked by current facility levels (all must meet minimum) */
  facilityTier: () => ClubTier;
}

// ─── Default state builders ───────────────────────────────────────────────────

function defaultLevels(templates: FacilityTemplate[]): FacilityLevels {
  return Object.fromEntries(templates.map((t) => [t.slug, 0]));
}

function defaultConditions(templates: FacilityTemplate[]): FacilityConditions {
  return Object.fromEntries(templates.map((t) => [t.slug, 100]));
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFacilityStore = create<FacilityState>()(
  persist(
    (set, get) => ({
      templates:  FALLBACK_FACILITY_TEMPLATES,
      levels:     defaultLevels(FALLBACK_FACILITY_TEMPLATES),
      conditions: defaultConditions(FALLBACK_FACILITY_TEMPLATES),

      setTemplates: (templates) => {
        if (templates.length === 0) return;
        set((state) => {
          // Merge: keep existing levels/conditions for known slugs, init new ones
          const levels     = { ...state.levels };
          const conditions = { ...state.conditions };
          for (const t of templates) {
            if (!(t.slug in levels))     levels[t.slug]     = 0;
            if (!(t.slug in conditions)) conditions[t.slug] = 100;
          }
          return { templates, levels, conditions };
        });
      },

      upgradeLevel: (slug) => {
        const { templates, levels } = get();
        const template = templates.find((t) => t.slug === slug);
        if (!template) return false;
        if (levels[slug] >= template.maxLevel) return false;

        set((state) => ({
          levels: { ...state.levels, [slug]: (state.levels[slug] ?? 0) + 1 },
        }));

        // Award reputation for the upgrade
        const { useClubStore } = require('@/stores/clubStore');
        const { setReputation, markRepActivity, club } = useClubStore.getState();
        setReputation(template.reputationBonus);
        markRepActivity();

        // Emit Fan Event
        const { useFanStore } = require('@/stores/fanStore');
        useFanStore.getState().addEvent({
          type: 'facility_upgrade',
          description: `Upgraded ${template.label} to Level ${levels[slug] + 1}`,
          impact: 10,
          weekNumber: club.weekNumber ?? 1,
          targets: ['owner'],
        });

        return true;
      },

      initAllLevels: (defaultFacilities?) => {
        const templates = get().templates;
        const base = defaultLevels(templates);
        if (defaultFacilities && Object.keys(defaultFacilities).length > 0) {
          // Apply each slug from the backend config; clamp to the template's maxLevel
          for (const [slug, level] of Object.entries(defaultFacilities)) {
            const template = templates.find((t) => t.slug === slug);
            const max = template?.maxLevel ?? 10;
            base[slug] = Math.min(level, max);
          }
        } else {
          // Legacy fallback: training pitch at level 1
          base['technical_zone'] = 1;
        }
        set({ levels: base, conditions: defaultConditions(templates) });
      },

      decayCondition: () =>
        set((state) => {
          const { templates, levels } = state;
          const next = { ...state.conditions };
          for (const t of templates) {
            const lvl = levels[t.slug] ?? 0;
            if (lvl === 0) continue;
            next[t.slug] = Math.max(0, (next[t.slug] ?? 100) - weeklyDecayRate(lvl, t.decayBase));
          }
          return { conditions: next };
        }),

      repairFacility: (slug) => {
        const { templates, levels, conditions } = get();
        const template = templates.find((t) => t.slug === slug);
        if (!template) return;

        const cost = repairFacilityCost(levels[slug] ?? 0, conditions[slug] ?? 100, template.baseCost);
        if (cost === 0) return;

        const { addBalance, club } = require('@/stores/clubStore').useClubStore.getState();
        const { addTransaction }      = require('@/stores/financeStore').useFinanceStore.getState();
        addBalance(-(cost * 100)); // pounds → pence
        addTransaction({
          amount:      -cost,
          category:    'upkeep',
          description: `Repaired ${template.label}`,
          weekNumber:  club.weekNumber ?? 1,
        });
        set((state) => ({
          conditions: { ...state.conditions, [slug]: 100 },
        }));
      },

      maxSquadSize: () => {
        const lvl = get().levels['physio_clinic'] ?? 0;
        return lvl === 0 ? 15 : 10 + lvl * 3;
      },

      analyticsUnlocked: () => (get().levels['scouting_center'] ?? 0) > 0,

      facilityTier: () => computeFacilityTier(get().levels),

      totalWeeklyMaintenance: () => {
        const { templates, levels } = get();
        return templates.reduce(
          (total, t) => total + calculateFacilityUpkeep(t, levels[t.slug] ?? 0),
          0,
        );
      },
    }),
    {
      name:    'facility-store',
      storage: zustandStorage,
      version: 4,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;

        if (version < 2) {
          const old = (state?.levels ?? {}) as Record<string, number>;
          state = {
            ...state,
            levels: {
              technicalZone:  old.trainingPitch  ?? 0,
              strengthSuite:  0,
              tacticalRoom:   0,
              physioClinic:   old.medicalLab     ?? 0,
              hydroPool:      0,
              scoutingCenter: old.analyticsSuite ?? 0,
            },
            conditions: {},
          };
        }

        if (version < 3) {
          const lvl = (state?.levels ?? {}) as Record<string, number>;
          state = {
            ...state,
            levels: Object.fromEntries(
              Object.entries(lvl).map(([k, v]) => [k, Math.min(v as number, 5)]),
            ),
          };
        }

        if (version < 4) {
          // Rename camelCase keys to snake_case to match backend slugs
          const lvl  = (state?.levels ?? {}) as Record<string, number>;
          const cond = (state?.conditions ?? {}) as Record<string, number>;
          const rename: Record<string, string> = {
            technicalZone:  'technical_zone',
            strengthSuite:  'strength_suite',
            tacticalRoom:   'tactical_room',
            physioClinic:   'physio_clinic',
            hydroPool:      'hydro_pool',
            scoutingCenter: 'scouting_center',
          };
          const newLevels: Record<string, number>     = {};
          const newConditions: Record<string, number> = {};
          for (const [old, slug] of Object.entries(rename)) {
            newLevels[slug]     = lvl[old]  ?? 0;
            newConditions[slug] = cond[old] ?? 100;
          }
          state = { ...state, levels: newLevels, conditions: newConditions, templates: FALLBACK_FACILITY_TEMPLATES };
        }

        return state as FacilityState;
      },
    },
  ),
);
