import { Player, PlayerAttributes, AttributeName } from '@/types/player';
import { Coach } from '@/types/coach';
import { PlayerDevelopmentUpdate } from '@/stores/squadStore';
import type { FacilityEffects } from './facilityEffects';
import { useInboxStore } from '@/stores/inboxStore';
import { useClubStore } from '@/stores/clubStore';

const ATTRIBUTE_NAMES: AttributeName[] = ['pace', 'technical', 'vision', 'power', 'stamina', 'heart'];

/** Age modifier: younger players develop faster */
function ageMod(age: number): number {
  if (age <= 15) return 1.5;
  if (age <= 16) return 1.2;
  return 1.0;
}

/** Derive attribute growth cap from potential (1–5 stars → 20–100) */
function attrCap(potential: number): number {
  return potential * 20;
}

/**
 * Computes a dynamic performance score for a single coach.
 * Replaces the flat coach.influence value in the XP formula.
 *
 * moraleMultiplier:  morale < 40 → 0.5×  |  40–70 → 0.75×  |  > 70 → 1.0×
 * trustMultiplier:   manager relationship value (−100 to +100) mapped to 0.8×–1.2×
 */
export function computeCoachPerformanceScore(coach: Coach): number {
  const morale = coach.morale ?? 70;
  const moraleMultiplier =
    morale < 40 ? 0.5 :
    morale < 70 ? 0.75 :
    1.0;

  const managerRel = coach.relationships?.find(
    (r) => r.id === 'manager' && r.type === 'manager',
  );
  const trustValue = managerRel?.value ?? 0; // −100 to +100
  // Map −100→+100 to 0.8×→1.2×
  const trustMultiplier = 0.8 + ((trustValue + 100) / 200) * 0.4;

  return coach.influence * moraleMultiplier * trustMultiplier;
}

/**
 * Calculates weekly attribute gains for one player.
 * Uses a single assigned coach rather than summing all coaches indiscriminately.
 * Players with no assigned coach still develop via base growth alone.
 *
 * A global 0.2× scalar is applied to rawGain — this is the single control knob
 * for the overall development rate. All multipliers (facility, age, personality,
 * coach, focus, strength) still compound on top of the reduced base.
 */
function calcGains(
  player: Player,
  assignedCoach: Coach | null,
  techGrowthBonus: number,
  powerGrowthBonus: number,
  weekNumber: number,
  tierOvrCap: number,
): Partial<PlayerAttributes> {
  const cap = Math.min(attrCap(player.potential), tierOvrCap);
  const attrs = player.attributes ?? {
    pace: player.overallRating, technical: player.overallRating, vision: player.overallRating, power: player.overallRating, stamina: player.overallRating, heart: player.overallRating,
  };

  const facilityMod = 1 + techGrowthBonus;
  const am = ageMod(player.age);
  const det = player.personality.determination;
  const personalityMod = 1 + (det / 20) * 0.3; // 1.0–1.3

  // Coach performance score — 0 if no coach assigned
  const coachScore = assignedCoach
    ? computeCoachPerformanceScore(assignedCoach)
    : 0;

  // developmentFocus bonus: +0.1× on the focused attribute if active
  const focus = player.developmentFocus;
  const focusActive =
    focus &&
    assignedCoach &&
    focus.setByCoachId === assignedCoach.id &&
    weekNumber - focus.setWeek < 8;

  const gains: Partial<PlayerAttributes> = {};

  ATTRIBUTE_NAMES.forEach((attr) => {
    const current = attrs[attr];
    if (current >= cap) {
      gains[attr] = 0;
      return;
    }

    const baseGrowth = 0.3 + Math.random() * 0.5; // 0.3–0.8

    // Coach specialism bonus: only if coach is assigned
    const coachBonus = assignedCoach
      ? (assignedCoach.specialisms?.[attr] ?? 0) / 100 * 0.4 * (coachScore / assignedCoach.influence)
      : 0;

    // Focus bonus: +10% on the prioritised attribute
    const focusBonus = focusActive && focus!.attribute === attr ? 0.1 : 0;

    // Strength Suite bonus for power/stamina via powerGrowthMultiplierPerLevel
    const strengthBonus = (attr === 'power' || attr === 'stamina')
      ? 1 + powerGrowthBonus
      : 1;

    const rawGain =
      (baseGrowth * facilityMod * am * personalityMod + coachBonus) *
      (1 + focusBonus) * strengthBonus;

    // Global development rate scalar — single control knob for overall pace
    const scaledGain = rawGain * 0.2;

    gains[attr] = Math.min(scaledGain, cap - current);
  });

  return gains;
}

// ─── Breakthrough spike ───────────────────────────────────────────────────────

const SPIKE_FLAVOUR: Record<AttributeName, string> = {
  pace:      'Something clicked in conditioning this week.',
  technical: 'Hours on the ball are finally showing.',
  vision:    'The game is starting to slow down for them.',
  power:     'A physical transformation no one saw coming.',
  stamina:   'They outlasted everyone in every session.',
  heart:     'Pure will. They simply refused to stop improving.',
};

/**
 * Rolls for a weekly breakthrough spike on a single player.
 *
 * Eligibility: coach assigned, morale ≥ 65, at least one attribute below cap.
 * Probability: base 1.5%, scaled by age and determination.
 * Magnitude: +3.0–6.0 on the attribute furthest from cap, never exceeding it.
 *
 * Returns null if no spike fires.
 */
export function checkBreakthroughSpike(
  player: Player,
  assignedCoach: Coach | null,
  weekNumber: number,
  tierOvrCap: number = 100,
): { attribute: AttributeName; gain: number } | null {
  // Eligibility gates
  if (!assignedCoach) return null;
  if ((player.morale ?? 50) < 65) return null;

  const cap = Math.min(attrCap(player.potential), tierOvrCap);
  const attrs = player.attributes ?? {
    pace: player.overallRating, technical: player.overallRating, vision: player.overallRating, power: player.overallRating, stamina: player.overallRating, heart: player.overallRating,
  };

  // Probability modifiers
  const age = player.age;
  const ageFactor =
    age <= 14 ? 1.6 :
    age <= 15 ? 1.4 :
    age <= 16 ? 1.2 : 1.0;

  const det = player.personality.determination;
  const detFactor = 0.7 + ((det - 1) / 19) * 0.6; // 0.7×–1.3×

  const spikeProbability = 0.015 * ageFactor * detFactor;

  if (Math.random() >= spikeProbability) return null;

  // Select attribute furthest from cap
  let maxRoom = -1;
  let candidates: AttributeName[] = [];

  ATTRIBUTE_NAMES.forEach((attr) => {
    const room = cap - attrs[attr];
    if (room <= 0) return;
    if (room > maxRoom) {
      maxRoom = room;
      candidates = [attr];
    } else if (room === maxRoom) {
      candidates.push(attr);
    }
  });

  if (candidates.length === 0) return null;

  const attribute = candidates[Math.floor(Math.random() * candidates.length)];
  const rawGain = 3 + Math.random() * 3; // 3.0–6.0
  const gain = Math.round(Math.min(rawGain, cap - attrs[attribute]) * 10) / 10;

  if (gain <= 0) return null;

  return { attribute, gain };
}

// ─── Main development computation ─────────────────────────────────────────────

/**
 * Computes weekly attribute development for all active players.
 * Returns a map of playerId → development updates (to be applied by the caller
 * alongside trait shifts in a single Zustand set() call via applyWeeklyPlayerUpdates).
 * Also fires a fortnightly digest inbox message and per-player spike notifications.
 */
export function computePlayerDevelopment(
  players: Player[],
  coaches: Coach[],
  facilityEffects: FacilityEffects,
  weekNumber: number,
  tierOvrCap: number = 100,
): Record<string, PlayerDevelopmentUpdate> {
  const techGrowthBonus  = facilityEffects.technicalGrowthMultiplierTotal;
  const powerGrowthBonus = facilityEffects.powerGrowthMultiplierTotal;
  const devUpdates: Record<string, PlayerDevelopmentUpdate> = {};
  const highlights: { id: string; name: string; attr: string; newVal: number }[] = [];

  players.forEach((player) => {
    if (!player.isActive) return;
    // No development while injured
    if (player.injury) return;

    // Resolve assigned coach — null if unassigned or coach not found
    const assignedCoach = player.assignedCoachId
      ? coaches.find((c) => c.id === player.assignedCoachId) ?? null
      : null;

    const currentAttrs = player.attributes ?? {
      pace: player.overallRating, technical: player.overallRating, vision: player.overallRating, power: player.overallRating, stamina: player.overallRating, heart: player.overallRating,
    };

    const gains = calcGains(player, assignedCoach, techGrowthBonus, powerGrowthBonus, weekNumber, tierOvrCap);

    const updated: PlayerAttributes = { ...currentAttrs };
    ATTRIBUTE_NAMES.forEach((attr) => {
      const gain = gains[attr] ?? 0;
      updated[attr] = Math.round((currentAttrs[attr] + gain) * 10) / 10;
    });

    // ── Breakthrough spike ───────────────────────────────────────────────────
    const spike = checkBreakthroughSpike(player, assignedCoach, weekNumber, tierOvrCap);
    if (spike) {
      const cap = Math.min(attrCap(player.potential), tierOvrCap);
      updated[spike.attribute] = Math.round(
        Math.min(updated[spike.attribute] + spike.gain, cap) * 10,
      ) / 10;
    }

    // OVR = mean of updated attributes, capped at the current tier ceiling
    const overallRating = Math.min(
      Math.round(ATTRIBUTE_NAMES.reduce((s, a) => s + updated[a], 0) / ATTRIBUTE_NAMES.length),
      tierOvrCap,
    );

    devUpdates[player.id] = {
      attributes: updated,
      overallRating,
      ...(spike ? { spike } : {}),
    };

    if (weekNumber % 4 === 0) {
      let topAttr: AttributeName = 'pace';
      let topGain = 0;
      ATTRIBUTE_NAMES.forEach((attr) => {
        const g = gains[attr] ?? 0;
        if (g > topGain) { topGain = g; topAttr = attr; }
      });
      if (topGain >= 0.1) {
        highlights.push({ id: player.id, name: player.name, attr: topAttr, newVal: Math.round(updated[topAttr]) });
      }
    }
  });

  const { addMessage } = useInboxStore.getState();

  // Fortnightly development digest
  if (weekNumber % 4 === 0 && highlights.length > 0) {
    const top = highlights.slice(0, 3);
    const lines = top.map((h) => `${h.name}: ${h.attr.toUpperCase()} now ${h.newVal}`).join('\n');
    addMessage({
      id: `dev-report-wk${weekNumber}`,
      type: 'development',
      week: weekNumber,
      subject: 'Development Report',
      body: `Squad development update:\n${lines}`,
      isRead: false,
      metadata: { playerIds: top.map((h) => h.id) },
    });
  }

  // Breakthrough spike inbox notifications — one message per spiking player
  const { setReputation, markRepActivity } = useClubStore.getState();
  Object.entries(devUpdates).forEach(([playerId, update]) => {
    if (!update.spike) return;
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const { attribute, gain } = update.spike;
    addMessage({
      id: `spike-${playerId}-wk${weekNumber}`,
      type: 'development',
      week: weekNumber,
      subject: 'Breakthrough Development',
      body: `${SPIKE_FLAVOUR[attribute]}\n${player.name} — ${attribute.toUpperCase()} +${gain}`,
      isRead: false,
      metadata: { playerIds: [playerId] },
    });
    // A visible development breakthrough signals a thriving club
    setReputation(0.5);
    markRepActivity();
  });

  return devUpdates;
}
