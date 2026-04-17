import { useSquadStore } from '@/stores/squadStore';
import { useClubStore } from '@/stores/clubStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { useEventStore } from '@/stores/eventStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useEventChainStore } from '@/stores/eventChainStore';
import { simulationService } from './SimulationService';
import { getRelationshipValue } from './RelationshipService';
import { EventCategory, GameEventTemplate } from '@/types/narrative';
import { Clique, DressingRoomHealth, CliquePaletteColor, NpcTrainingIncidentSubtype } from '@/types/interaction';
import { Player } from '@/types/player';
import { uuidv7 } from '@/utils/uuidv7';

const BASE_INCIDENT_PROBABILITY = 0.08;
const INCIDENT_COOLDOWN_WEEKS = 3;
const MIN_CLIQUE_SIZE = 3;
const CLIQUE_COLORS: CliquePaletteColor[] = ['coral', 'sky', 'lilac', 'amber'];

// ─── Chain helpers ────────────────────────────────────────────────────────────

/**
 * Returns a new array of templates with chain-boosted weights applied for the given pair.
 * Original template objects are not mutated.
 */
export function applyChainBoosts(
  templates: GameEventTemplate[],
  playerAId: string,
  playerBId: string,
): GameEventTemplate[] {
  const boosts = useEventChainStore.getState().getBoostsForPair(playerAId, playerBId);
  if (boosts.length === 0) return templates;

  return templates.map((t) => {
    const boost = boosts.find((b) => b.boostedSlug === t.slug);
    if (!boost) return t;
    return { ...t, weight: t.weight * boost.multiplier };
  });
}

/**
 * Reads the fired template's chainedEvents and writes boost entries to eventChainStore.
 */
export function extractChainedSlugsAndActivate(
  template: GameEventTemplate,
  playerAId: string,
  playerBId: string,
  currentWeek: number,
): void {
  if (!template.chainedEvents?.length) return;

  const { activateChain } = useEventChainStore.getState();
  for (const link of template.chainedEvents) {
    activateChain(template.slug, playerAId, playerBId, link, currentWeek);
  }
}

// ─── Subtype derivation ────────────────────────────────────────────────────────

function deriveSubtype(slug: string): NpcTrainingIncidentSubtype {
  if (slug.includes('altercation') || slug.includes('confrontation') || slug.includes('ego-clash') || slug.includes('withdrawal') || slug.includes('professionalism')) {
    return slug.includes('confrontation') ? 'verbal_confrontation' : 'training_altercation';
  }
  if (slug.includes('mentoring') || slug.includes('quiet-leader') || slug.includes('veteran')) {
    return 'player_mentoring';
  }
  if (slug.includes('breakthrough') || slug.includes('rivalry') || slug.includes('high-five') || slug.includes('kickabout') || slug.includes('celebration')) {
    return 'coach_player_breakthrough';
  }
  if (slug.includes('standing-up')) return 'standing_up';
  if (slug.includes('cultural')) return 'cultural_exchange';
  if (slug.includes('banter') || slug.includes('laughter') || slug.includes('atmosphere')) return 'squad_banter';
  return 'positive_bond';
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function computeSquadMoraleAverage(players: Player[]): number {
  const active = players.filter((p) => p.isActive);
  if (active.length === 0) return 70;
  return active.reduce((sum, p) => sum + (p.morale ?? 70), 0) / active.length;
}

function isOnCooldown(playerId: string, weekNumber: number): boolean {
  return useInteractionStore
    .getState()
    .getRecordsForEntity(playerId)
    .some(
      (r) =>
        r.category === 'NPC_TRAINING_INCIDENT' &&
        weekNumber - r.week < INCIDENT_COOLDOWN_WEEKS,
    );
}

// ─── Clique helpers ───────────────────────────────────────────────────────────

/**
 * Returns true only if every pairwise relationship in the group
 * meets the threshold in both directions.
 */
function allPairsAboveThreshold(
  playerIds: string[],
  players: Player[],
  threshold: number,
): boolean {
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const a = players.find((p) => p.id === playerIds[i]);
      const b = players.find((p) => p.id === playerIds[j]);
      if (!a || !b) return false;
      if (getRelationshipValue(a, b.id) < threshold) return false;
      if (getRelationshipValue(b, a.id) < threshold) return false;
    }
  }
  return true;
}

function averagePairwiseRelationship(
  playerIds: string[],
  players: Player[],
): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const a = players.find((p) => p.id === playerIds[i]);
      const b = players.find((p) => p.id === playerIds[j]);
      if (!a || !b) continue;
      total += getRelationshipValue(a, b.id);
      total += getRelationshipValue(b, a.id);
      count += 2;
    }
  }
  return count === 0 ? 0 : total / count;
}

// ─── Clique detection ─────────────────────────────────────────────────────────

/**
 * Detects and updates cliques each tick.
 *
 * Cap rule: maxCliquedPlayers = floor(squadSize × capPercent / 100)
 * If maxCliquedPlayers < MIN_CLIQUE_SIZE (3), no clique can exist.
 *
 * Disband behaviour: isDetected → false, relationship values untouched.
 * Re-detection restores the original name if the same member set reforms.
 */
function detectCliques(
  players: Player[],
  weekNumber: number,
  existingCliques: Clique[],
  config: {
    threshold: number;
    capPercent: number;
    minTenureWeeks: number;
  },
): Clique[] {
  const active = players.filter((p) => p.isActive);
  const squadSize = active.length;

  // Hard floor: need at least MIN_CLIQUE_SIZE eligible players
  if (squadSize < MIN_CLIQUE_SIZE) {
    return existingCliques.map((c) => ({ ...c, isDetected: false }));
  }

  const maxCliquedPlayers = Math.floor(squadSize * (config.capPercent / 100));

  // If the cap doesn't allow a minimum-size clique, disband everything
  if (maxCliquedPlayers < MIN_CLIQUE_SIZE) {
    return existingCliques.map((c) => ({ ...c, isDetected: false }));
  }

  // Players eligible for clique membership (tenure gate)
  const eligible = active.filter(
    (p) => weekNumber - (p.joinedWeek ?? 0) >= config.minTenureWeeks,
  );

  if (eligible.length < MIN_CLIQUE_SIZE) {
    return existingCliques.map((c) => ({ ...c, isDetected: false }));
  }

  // ── Step 1: Re-validate existing detected cliques ───────────────────────────
  let result: Clique[] = existingCliques.map((clique) => {
    if (!clique.isDetected) return clique; // already disbanded — leave as-is

    // Trim to still-eligible members
    const members = clique.memberIds.filter((id) =>
      eligible.some((p) => p.id === id),
    );

    // Disband if below minimum size
    if (members.length < MIN_CLIQUE_SIZE) {
      return { ...clique, isDetected: false };
    }

    // Disband if relationships have degraded below threshold
    if (!allPairsAboveThreshold(members, players, config.threshold)) {
      return { ...clique, isDetected: false };
    }

    const strength = averagePairwiseRelationship(members, players);
    return { ...clique, memberIds: members, strength, isDetected: true };
  });

  // ── Step 2: Check total cliqued count against cap ───────────────────────────
  // If existing cliques already exceed cap (squad shrank), disband weakest first
  let totalCliqued = result
    .filter((c) => c.isDetected)
    .reduce((sum, c) => sum + c.memberIds.length, 0);

  while (totalCliqued > maxCliquedPlayers) {
    const detected = result.filter((c) => c.isDetected);
    if (detected.length === 0) break;
    const weakest = detected.reduce((w, c) => (c.strength < w.strength ? c : w));
    result = result.map((c) =>
      c.id === weakest.id ? { ...c, isDetected: false } : c,
    );
    totalCliqued -= weakest.memberIds.length;
  }

  // ── Step 3: Attempt to form a new clique from uncliqued eligible players ────
  const alreadyCliqued = new Set(
    result.filter((c) => c.isDetected).flatMap((c) => c.memberIds),
  );
  const uncliqued = eligible.filter((p) => !alreadyCliqued.has(p.id));

  // Only attempt if cap allows room for MIN_CLIQUE_SIZE more
  const roomForNew = maxCliquedPlayers - totalCliqued >= MIN_CLIQUE_SIZE;

  if (roomForNew && uncliqued.length >= MIN_CLIQUE_SIZE) {
    // Find the strongest eligible triplet among uncliqued players
    let bestTriplet: string[] | null = null;
    let bestStrength = -Infinity;

    for (let i = 0; i < uncliqued.length; i++) {
      for (let j = i + 1; j < uncliqued.length; j++) {
        for (let k = j + 1; k < uncliqued.length; k++) {
          const triplet = [uncliqued[i].id, uncliqued[j].id, uncliqued[k].id];
          if (!allPairsAboveThreshold(triplet, players, config.threshold)) continue;
          const strength = averagePairwiseRelationship(triplet, players);
          if (strength > bestStrength) {
            bestStrength = strength;
            bestTriplet = triplet;
          }
        }
      }
    }

    if (bestTriplet) {
      // Check if this is a previously disbanded clique reforming
      const reformed = result.find(
        (c) =>
          !c.isDetected &&
          c.memberIds.length === bestTriplet!.length &&
          bestTriplet!.every((id) => c.memberIds.includes(id)),
      );

      if (reformed) {
        // Restore with original name
        result = result.map((c) =>
          c.id === reformed.id
            ? { ...c, isDetected: true, strength: bestStrength, memberIds: bestTriplet! }
            : c,
        );
      } else {
        // New clique — assign next available palette colour
        const usedColors = new Set(
          result.filter((c) => c.isDetected).map((c) => c.color),
        );
        const color =
          CLIQUE_COLORS.find((c) => !usedColors.has(c)) ?? CLIQUE_COLORS[0];

        const label = String.fromCharCode(
          65 + result.filter((c) => c.isDetected).length,
        ); // A, B, C...

        result.push({
          id: uuidv7(),
          name: `Group ${label}`,
          memberIds: bestTriplet,
          color,
          strength: bestStrength,
          formedWeek: weekNumber,
          isDetected: true,
        });
      }
    }
  }

  return result;
}

// ─── Dressing room health ─────────────────────────────────────────────────────

function computeDressingRoomHealth(
  players: Player[],
  cliques: Clique[],
  weekNumber: number,
): DressingRoomHealth {
  const active = players.filter((p) => p.isActive);
  const moraleAvg = Math.round(computeSquadMoraleAverage(active));

  if (active.length < 2) {
    return {
      cohesion: 50,
      tension: 0,
      squadMoraleAverage: moraleAvg,
      cliques,
      lastComputedWeek: weekNumber,
    };
  }

  let positiveCount = 0;
  let negativeCount = 0;
  let totalPairs = 0;

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const val = getRelationshipValue(active[i], active[j].id);
      totalPairs++;
      if (val > 10) positiveCount++;
      if (val < -10) negativeCount++;
    }
  }

  return {
    cohesion: Math.round((positiveCount / totalPairs) * 100),
    tension: Math.round((negativeCount / totalPairs) * 100),
    squadMoraleAverage: moraleAvg,
    cliques,
    lastComputedWeek: weekNumber,
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Processes clique detection, dressing room health, and NPC training incidents.
 * Called from GameLoop.ts as step 12, after processMoraleAndRelationships().
 */
export function processSocialGraph(): void {
  const { players } = useSquadStore.getState();
  const { club } = useClubStore.getState();
  const {
    cliques: existingCliques,
    updateCliques,
    updateDressingRoomHealth,
  } = useInteractionStore.getState();
  const config = useGameConfigStore.getState().config;

  const weekNumber = club.weekNumber ?? 1;
  const activePlayers = players.filter((p) => p.isActive);

  // ── 1. Clique detection ───────────────────────────────────────────────────
  const updatedCliques = detectCliques(activePlayers, weekNumber, existingCliques, {
    threshold: config.cliqueRelationshipThreshold,
    capPercent: config.cliqueSquadCapPercent,
    minTenureWeeks: config.cliqueMinTenureWeeks,
  });
  updateCliques(updatedCliques);

  // ── 2. Dressing room health ───────────────────────────────────────────────
  const health = computeDressingRoomHealth(activePlayers, updatedCliques, weekNumber);
  updateDressingRoomHealth(health);

  // ── 3. NPC training incidents ─────────────────────────────────────────────
  if (activePlayers.length < 2) return;

  const squadMoraleAverage = health.squadMoraleAverage;
  const templates = useEventStore
    .getState()
    .getTemplatesByCategory(EventCategory.NPC_INTERACTION);

  if (templates.length === 0) return;

  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const actor = activePlayers[i];
      const subject = activePlayers[j];

      if (isOnCooldown(actor.id, weekNumber)) continue;
      if (isOnCooldown(subject.id, weekNumber)) continue;

      const eligible = templates.filter((t) => {
        if (!t.firingConditions) return false;
        const c = t.firingConditions;

        if (c.maxSquadMorale !== undefined && squadMoraleAverage > c.maxSquadMorale) return false;
        if (c.minSquadMorale !== undefined && squadMoraleAverage < c.minSquadMorale) return false;

        const pairRel = getRelationshipValue(actor, subject.id);
        if (c.maxPairRelationship !== undefined && pairRel > c.maxPairRelationship) return false;
        if (c.minPairRelationship !== undefined && pairRel < c.minPairRelationship) return false;

        if (c.requiresCoLocation) {
          if (!actor.assignedCoachId || actor.assignedCoachId !== subject.assignedCoachId) return false;
        }

        if (c.actorTraitRequirements?.length) {
          const met = c.actorTraitRequirements.every((req) => {
            const v = actor.personality[req.trait];
            return (req.min === undefined || v >= req.min) &&
                   (req.max === undefined || v <= req.max);
          });
          if (!met) return false;
        }

        if (c.subjectTraitRequirements?.length) {
          const met = c.subjectTraitRequirements.every((req) => {
            const v = subject.personality[req.trait];
            return (req.min === undefined || v >= req.min) &&
                   (req.max === undefined || v <= req.max);
          });
          if (!met) return false;
        }

        return true;
      });

      if (eligible.length === 0) continue;
      if (Math.random() > BASE_INCIDENT_PROBABILITY) continue;

      const boosted = applyChainBoosts(eligible, actor.id, subject.id);
      const template = boosted.reduce((best, t) =>
        t.weight > best.weight ? t : best,
      );

      const isMajor = template.severity === 'major';

      simulationService.triggerNpcIncident(
        template,
        { player_1: actor.id, player_2: subject.id },
        isMajor,
      );

      extractChainedSlugsAndActivate(template, actor.id, subject.id, weekNumber);

      const subtype = deriveSubtype(template.slug);

      useInteractionStore.getState().logInteraction({
        week: weekNumber,
        actorType: 'player',
        actorId: actor.id,
        targetType: 'player',
        targetId: subject.id,
        secondaryTargetId: subject.id,
        category: 'NPC_TRAINING_INCIDENT',
        subtype,
        relationshipDelta: 0,
        traitDeltas: {},
        moraleDelta: 0,
        isVisibleToAmp: isMajor,
        visibilityReason: isMajor ? 'incident_report' : undefined,
        narrativeSummary: `Training incident between ${actor.name} and ${subject.name}.`,
      });

      return; // One incident per tick maximum
    }
  }
}
