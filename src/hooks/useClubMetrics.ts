import { useClubStore } from '@/stores/clubStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { calculateWeeklyFinances } from '@/engine/finance';
import { calculateMatchdayIncome } from '@/utils/matchdayIncome';
import { Player } from '@/types/player';
import { ReputationTier } from '@/types/club';
import { FacilityLevels } from '@/types/facility';
import { Coach } from '@/types/coach';

// ─── Return type ───────────────────────────────────────────────────────────────

export interface ClubMetrics {
  // Valuation
  totalValuation: number;       // pence
  baseAssetSum: number;         // pence
  reputationBonusPct: number;   // e.g. 3.2

  // Breakdown
  totalPlayerValue: number;     // pence
  totalInfraValue: number;      // pence
  totalStaffValue: number;      // pence
  cashBalance: number;          // pence

  // Squad
  crownJewel: Player | null;
  squadTotalPotential: number;

  // Finance
  weeklyNetCashflow: number;    // pence, negative = deficit

  // Reputation
  reputation: number;
  currentTier: ReputationTier;
  nextTier: ReputationTier | null;
  tierProgressPct: number;      // 0–100
}

// ─── Tier configuration ────────────────────────────────────────────────────────

interface TierBand {
  tier: ReputationTier;
  next: ReputationTier | null;
  min: number;
  max: number; // exclusive upper bound (= next tier's min), or 101 for Elite
}

const TIER_BANDS: TierBand[] = [
  { tier: 'Local',    next: 'Regional', min: 0,  max: 15  },
  { tier: 'Regional', next: 'National', min: 15, max: 40  },
  { tier: 'National', next: 'Elite',    min: 40, max: 75  },
  { tier: 'Elite',    next: null,       min: 75, max: 101 },
];

function resolveTierBand(reputation: number): TierBand {
  for (let i = TIER_BANDS.length - 1; i >= 0; i--) {
    if (reputation >= TIER_BANDS[i].min) return TIER_BANDS[i];
  }
  return TIER_BANDS[0];
}

// ─── Pure valuation utility (no React deps) ───────────────────────────────────

/**
 * Computes the club's Enterprise Value in pence.
 * Identical arithmetic to the hook's internal calculation — usable in engine/GameLoop
 * contexts via Zustand getState() without violating React hook rules.
 */
export function calculateClubValuation(
  players: Player[],
  facilityLevels: FacilityLevels,
  coaches: Coach[],
  balance: number,     // pence
  reputation: number,  // 0–100
): number {            // pence, integer
  const totalPlayerValue = players.reduce(
    (sum, p) => sum + p.overallRating * p.potential * 1_000,
    0,
  );
  const totalInfraValue = Object.values(facilityLevels).reduce(
    (sum, level) => sum + level * 500_000,
    0,
  );
  // coach.salary is weekly pence — annualise by multiplying by 52
  const totalStaffValue = coaches.reduce(
    (sum, c) => sum + c.salary * 52,
    0,
  );
  const baseSum = totalPlayerValue + totalInfraValue + totalStaffValue + balance;
  return Math.round(baseSum * (1 + reputation / 1_000));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export default function useClubMetrics(): ClubMetrics {
  // Stable Zustand selectors — each re-renders this hook only when its slice changes
  const club = useClubStore((s) => s.club);
  const players = useSquadStore((s) => s.players);
  const coaches = useCoachStore((s) => s.coaches);
  const levels            = useFacilityStore((s) => s.levels);
  const facilityTemplates = useFacilityStore((s) => s.templates);
  const conditions        = useFacilityStore((s) => s.conditions);

  const { reputation } = club;

  // ── Player Asset Value ─────────────────────────────────────────────────────
  // playerValue = overallRating × potential × 1_000 pence
  const totalPlayerValue = players.reduce(
    (sum, p) => sum + p.overallRating * p.potential * 1_000,
    0,
  );

  // ── Infrastructure Value ───────────────────────────────────────────────────
  // facilityValue = level × 500_000 pence per facility
  const totalInfraValue = Object.values(levels).reduce(
    (sum: number, level: number) => sum + level * 500_000,
    0,
  );

  // ── Staff Capital Value ────────────────────────────────────────────────────
  // coach.salary is weekly pence — annualise by multiplying by 52
  const totalStaffValue = coaches.reduce(
    (sum, c) => sum + c.salary * 52,
    0,
  );

  // ── Cash ──────────────────────────────────────────────────────────────────
  // club.balance is stored in pence
  const cashBalance = club.balance ?? 0;

  // ── Base Asset Sum & Valuation ─────────────────────────────────────────────
  const baseAssetSum = totalPlayerValue + totalInfraValue + totalStaffValue + cashBalance;
  const totalValuation = Math.round(baseAssetSum * (1 + reputation / 1_000));
  const reputationBonusPct = facilityTemplates.reduce((sum, t) => {
    const level = levels[t.slug] ?? 0;
    if (level === 0) return sum;
    const cond = conditions[t.slug] ?? 100;
    return sum + t.reputationBonus * level * (cond / 100);
  }, 0);

  // ── Crown Jewel ────────────────────────────────────────────────────────────
  // Highest current OVR; potential is the tiebreaker.
  const crownJewel = players.length > 0
    ? [...players].sort((a, b) =>
        b.overallRating - a.overallRating || b.potential - a.potential,
      )[0]
    : null;

  // ── Squad Total Potential ──────────────────────────────────────────────────
  const squadTotalPotential = players.reduce((sum, p) => sum + p.potential, 0);

  // ── Weekly Net Cashflow ────────────────────────────────────────────────────
  // calculateWeeklyFinances covers wages, upkeep, reputation income, and sponsors.
  // Sponsor income is derived from contracts stored on the club (same weeklyPayment field).
  const sponsorIncomePence = (club.sponsorContracts ?? []).reduce((s, c) => s + c.weeklyPayment, 0);
  const baseNet = calculateWeeklyFinances(
    club.weekNumber ?? 1,
    club,
    players,
    coaches,
    levels,
    [],           // sponsors handled separately below
    0,
    facilityTemplates,
  ).net + sponsorIncomePence;
  // Facility (matchday) income is calculated outside calculateWeeklyFinances —
  // it must be added here to produce an accurate next-tick prediction.
  const facilityIncomePence = calculateMatchdayIncome(facilityTemplates, levels, conditions, club.reputation);
  const weeklyNetCashflow = baseNet + facilityIncomePence;

  // ── Reputation Tier Progress ───────────────────────────────────────────────
  const band = resolveTierBand(reputation);
  const currentTier = band.tier;
  const nextTier = band.next;

  let tierProgressPct: number;
  if (currentTier === 'Elite') {
    tierProgressPct = 100;
  } else {
    const bandWidth = band.max - band.min;
    tierProgressPct = Math.min(100, Math.max(0,
      ((reputation - band.min) / bandWidth) * 100,
    ));
  }

  return {
    totalValuation,
    baseAssetSum,
    reputationBonusPct,
    totalPlayerValue,
    totalInfraValue,
    totalStaffValue,
    cashBalance,
    crownJewel,
    squadTotalPotential,
    weeklyNetCashflow,
    reputation,
    currentTier,
    nextTier,
    tierProgressPct,
  };
}
