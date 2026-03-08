import { Player, PlayerAttributes, AttributeName } from '@/types/player';
import { Coach } from '@/types/coach';
import { FacilityLevels } from '@/types/facility';
import { PlayerDevelopmentUpdate } from '@/stores/squadStore';
import { useInboxStore } from '@/stores/inboxStore';

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
 * Calculates weekly attribute gains for one player.
 * Formula per attribute:
 *   gain = baseGrowth × facilityMod × ageMod × personalityMod + coachBonus
 * Capped at potential × 20.
 */
function calcGains(
  player: Player,
  coaches: Coach[],
  facilityLevel: number, // trainingPitch level 1–10
): Partial<PlayerAttributes> {
  const cap = attrCap(player.potential);
  const attrs = player.attributes ?? {
    pace: 30, technical: 30, vision: 30, power: 30, stamina: 30, heart: 30,
  };

  const facilityMod = 1 + (facilityLevel - 1) * 0.1; // 1.0 – 1.9
  const am = ageMod(player.age);
  const det = player.personality.determination; // 1–20
  const personalityMod = 1 + (det / 20) * 0.3;  // 1.0 – 1.3

  const gains: Partial<PlayerAttributes> = {};

  ATTRIBUTE_NAMES.forEach((attr) => {
    const current = attrs[attr];
    if (current >= cap) {
      gains[attr] = 0;
      return;
    }

    const baseGrowth = 0.3 + Math.random() * 0.5; // 0.3–0.8

    // Coach bonus: sum all coaches with this specialism
    const coachBonus = coaches.reduce((sum, coach) => {
      const strength = coach.specialisms?.[attr] ?? 0;
      return sum + (strength / 100) * 0.4;
    }, 0);

    const rawGain = baseGrowth * facilityMod * am * personalityMod + coachBonus;
    gains[attr] = Math.min(rawGain, cap - current);
  });

  return gains;
}

/**
 * Computes weekly attribute development for all active players.
 * Returns a map of playerId → development updates (to be applied by the caller
 * alongside trait shifts in a single Zustand set() call via applyWeeklyPlayerUpdates).
 * Also fires a fortnightly digest inbox message.
 */
export function computePlayerDevelopment(
  players: Player[],
  coaches: Coach[],
  facilityLevels: FacilityLevels,
  weekNumber: number,
): Record<string, PlayerDevelopmentUpdate> {
  const trainingLevel = facilityLevels.trainingPitch ?? 1;
  const devUpdates: Record<string, PlayerDevelopmentUpdate> = {};
  const highlights: { name: string; attr: string; newVal: number }[] = [];

  players.forEach((player) => {
    if (!player.isActive) return;

    const currentAttrs = player.attributes ?? {
      pace: 30, technical: 30, vision: 30, power: 30, stamina: 30, heart: 30,
    };

    const gains = calcGains(player, coaches, trainingLevel);

    const updated: PlayerAttributes = { ...currentAttrs };
    ATTRIBUTE_NAMES.forEach((attr) => {
      const gain = gains[attr] ?? 0;
      updated[attr] = Math.round((currentAttrs[attr] + gain) * 10) / 10;
    });

    // Increment OVR by average gain this tick — avoids resetting from attribute average
    // which would cause a first-tick drop for players whose OVR was trait-seeded.
    const totalGain = ATTRIBUTE_NAMES.reduce((s, a) => s + (gains[a] ?? 0), 0);
    const avgGain = totalGain / ATTRIBUTE_NAMES.length;
    const overallRating = Math.min(100, Math.round(player.overallRating + avgGain));

    devUpdates[player.id] = { attributes: updated, overallRating };

    if (weekNumber % 4 === 0) {
      let topAttr: AttributeName = 'pace';
      let topGain = 0;
      ATTRIBUTE_NAMES.forEach((attr) => {
        const g = gains[attr] ?? 0;
        if (g > topGain) { topGain = g; topAttr = attr; }
      });
      if (topGain >= 0.5) {
        highlights.push({ name: player.name, attr: topAttr, newVal: Math.round(updated[topAttr]) });
      }
    }
  });

  // Fortnightly development digest (fires outside the set() call — inbox-only)
  if (weekNumber % 4 === 0 && highlights.length > 0) {
    const { addMessage } = useInboxStore.getState();
    const lines = highlights.slice(0, 3)
      .map((h) => `${h.name}: ${h.attr.toUpperCase()} now ${h.newVal}`)
      .join('\n');
    addMessage({
      id: `dev-report-wk${weekNumber}`,
      type: 'system',
      week: weekNumber,
      subject: 'Development Report',
      body: `Squad development update:\n${lines}`,
      isRead: false,
    });
  }

  return devUpdates;
}
