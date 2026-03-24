import { uuidv7 } from '@/utils/uuidv7';
import { useEventStore } from '@/stores/eventStore';
import { useActiveEffectStore } from '@/stores/activeEffectStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useSquadStore } from '@/stores/squadStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useAcademyStore } from '@/stores/academyStore';
import type { FacilityType } from '@/types/facility';
import {
  GameEventTemplate,
  ActiveEffect,
  NarrativeMessage,
  StatChange,
  StatImpact,
  SelectionLogic,
  TargetType,
  StatOperator,
  EventCategory,
} from '@/types/narrative';

// ─── Simulation Service ───────────────────────────────────────────────────────
//
// Processes narrative story ticks entirely on-device — no network calls.
// Called once per weekly advancement to generate story events and advance
// any active multi-tick effects.

class SimulationService {

  /** Call once per week tick to process effects and potentially fire a story event. */
  processDailyTick(): void {
    this.processActiveEffects();
    // ~20% chance per tick to fire a random narrative event (if templates are loaded)
    if (Math.random() < 0.2) {
      this.triggerRandomEvent();
    }
  }

  // ── Active effects ─────────────────────────────────────────────────────────

  private processActiveEffects(): void {
    const completed = useActiveEffectStore.getState().decrementAllTicks();
    completed.forEach((effect) => this.triggerCompletionEvent(effect));
  }

  private triggerCompletionEvent(effect: ActiveEffect): void {
    const template = useEventStore.getState().getTemplateBySlug(effect.completionEventSlug);
    if (!template) return;

    const message = this.generateMessage(template, { player_1: effect.affectedEntityId });
    useNarrativeStore.getState().addMessage(message);
  }

  // ── Random event ───────────────────────────────────────────────────────────

  private triggerRandomEvent(): void {
    const template = useEventStore.getState().getWeightedRandomTemplate();
    if (!template) return;
    // GUARDIAN templates are handled exclusively by GuardianEngine — they use
    // {guardian_name}/{player_name} placeholders that generateMessage() doesn't resolve.
    if (template.category === EventCategory.GUARDIAN) return;

    let entityMap = this.resolveTargets(template.impacts.selection_logic);
    // If the template requires specific targets but none were resolved, skip.
    if (template.impacts.selection_logic && Object.keys(entityMap).length === 0) return;

    // Ensure every {player_N} placeholder referenced in the body has a resolved entity.
    // This handles: (a) templates with no selection_logic, (b) selection_logic that
    // resolves fewer players than the body references (e.g. count:1 but body uses {player_2}).
    if (/\{player/i.test(template.bodyTemplate)) {
      const active = this.filterPlayers(undefined).filter((p) => p.isActive);
      if (active.length === 0) return;

      // Find all distinct player slot indices referenced in the body: {player_1}, {player_2}, etc.
      const slotMatches = [...template.bodyTemplate.matchAll(/\{player_(\d+)\}/gi)];
      const requiredIndices = [...new Set(slotMatches.map((m) => parseInt(m[1], 10)))];
      // Also handle bare {player} alias (maps to slot 1)
      if (/\{player\}/i.test(template.bodyTemplate) && !requiredIndices.includes(1)) {
        requiredIndices.push(1);
      }

      // For each required slot not yet filled, pick a distinct active player
      const usedIds = new Set(Object.values(entityMap));
      for (const idx of requiredIndices.sort((a, b) => a - b)) {
        const key = `player_${idx}`;
        if (!entityMap[key]) {
          const available = active.filter((p) => !usedIds.has(p.id));
          if (available.length === 0) break; // not enough players — stop
          const picked = this.randomSample(available, 1)[0];
          entityMap = { ...entityMap, [key]: picked.id };
          usedIds.add(picked.id);
        }
      }
    }

    // Same for {facility} — pick a random facility if none resolved.
    if (/\{facility/i.test(template.bodyTemplate) && !entityMap['facility_1']) {
      const facilities = this.filterFacilities(undefined);
      if (facilities.length > 0) {
        const picked = this.randomSample(facilities, 1);
        entityMap = { ...entityMap, facility_1: picked[0].type };
      }
    }

    const autoChanges = template.impacts.stat_changes ?? [];
    const isActionable = (template.impacts.choices?.length ?? 0) > 0;

    // For non-actionable events, compute impacts BEFORE applying (capture from-values),
    // then auto-apply them so the game state actually reflects the event.
    let statImpacts: StatImpact[] = [];
    if (!isActionable && autoChanges.length > 0) {
      statImpacts = this.computeStatImpacts(autoChanges, entityMap);
      this.applyStatChanges(autoChanges, entityMap);
    }

    const message = this.generateMessage(template, entityMap, statImpacts);
    useNarrativeStore.getState().addMessage(message);
  }

  // ── Target resolution ──────────────────────────────────────────────────────

  private resolveTargets(logic?: SelectionLogic): Record<string, string> {
    if (!logic) return {};
    const entityMap: Record<string, string> = {};

    // Normalise target_type to lowercase so backend casing ('PLAYER' vs 'player') never breaks matching
    const targetType = (logic.target_type as string).toLowerCase() as TargetType;

    switch (targetType) {
      case TargetType.PLAYER: {
        const players = this.filterPlayers(logic.filter);
        const selected = this.randomSample(players, logic.count);
        selected.forEach((p, i) => { entityMap[`player_${i + 1}`] = p.id; });
        break;
      }
      case TargetType.FACILITY: {
        const facilities = this.filterFacilities(logic.filter);
        const selected = this.randomSample(facilities, logic.count);
        selected.forEach((f, i) => { entityMap[`facility_${i + 1}`] = f.type; });
        break;
      }
      // STAFF and SQUAD_WIDE don't need individual entity resolution
    }

    return entityMap;
  }

  private filterPlayers(filter?: SelectionLogic['filter']) {
    const { players } = useSquadStore.getState();
    if (!filter) return players;

    return players.filter((p) => {
      if (!p.isActive) return false;
      if (filter.position && p.position !== filter.position) return false;
      if (filter.max_age !== undefined || filter.min_age !== undefined) {
        const age = this.calculateAge(p.dateOfBirth);
        if (filter.max_age !== undefined && age > filter.max_age) return false;
        if (filter.min_age !== undefined && age < filter.min_age) return false;
      }
      return true;
    });
  }

  private filterFacilities(filter?: SelectionLogic['filter']): { type: FacilityType; level: number }[] {
    const { levels } = useFacilityStore.getState();
    const all = (Object.entries(levels) as [FacilityType, number][]).map(([type, level]) => ({ type, level }));
    if (!filter) return all;
    return all.filter((f) => {
      if (filter.max_level !== undefined && f.level > filter.max_level) return false;
      return true;
    });
  }

  private randomSample<T>(array: T[], count: number): T[] {
    return [...array].sort(() => Math.random() - 0.5).slice(0, Math.min(count, array.length));
  }

  private calculateAge(dob: string): number {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    ) age--;
    return age;
  }

  // ── Message generation ─────────────────────────────────────────────────────

  private generateMessage(
    template: GameEventTemplate,
    entityMap: Record<string, string>,
    statImpacts: StatImpact[] = [],
  ): NarrativeMessage {
    const { managerPersonality } = useAcademyStore.getState();
    const { players } = useSquadStore.getState();

    // Build template variable map
    const replacements: Record<string, string> = {
      PA_Name: managerPersonality?.paName ?? 'Your PA',
    };

    Object.entries(entityMap).forEach(([key, id]) => {
      if (key.startsWith('player_')) {
        const player = players.find((p) => p.id === id);
        // Fallback to 'a player' if ID is stale (transferred/released since event was queued)
        replacements[key] = player?.name ?? 'a player';
      } else if (key.startsWith('facility_')) {
        replacements[key] = this.formatFacilityLabel(id);
      }
    });

    // Add bare aliases so templates can use {player}, {player2}, etc.
    // as shorthand for {player_1}, {player_2}, etc. — consistent across all templates.
    if (replacements['player_1']) replacements['player'] = replacements['player_1'];
    if (replacements['player_2']) replacements['player2'] = replacements['player_2'];
    if (replacements['facility_1']) replacements['facility'] = replacements['facility_1'];

    // Interpolate — handles {{key}}, {key} and the bare aliases above uniformly
    let body = template.bodyTemplate;
    Object.entries(replacements).forEach(([key, value]) => {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    return {
      id: uuidv7(),
      title: template.title,
      body,
      isActionable: (template.impacts.choices?.length ?? 0) > 0,
      choices: template.impacts.choices,
      affectedEntities: Object.values(entityMap),
      statImpacts: statImpacts.length > 0 ? statImpacts : undefined,
      createdAt: new Date().toISOString(),
    };
  }

  /** Compute stat impacts (before/after values) WITHOUT mutating the store. */
  private computeStatImpacts(
    changes: StatChange[],
    entityMap: Record<string, string>,
  ): StatImpact[] {
    const { players } = useSquadStore.getState();
    const impacts: StatImpact[] = [];

    for (const change of changes) {
      if (change.target === 'squad_wide') continue;

      const entityId = entityMap[change.target];
      if (!entityId || !change.target.startsWith('player_')) continue;

      const player = players.find((p) => p.id === entityId);
      if (!player) continue;

      const current = player[change.field as keyof typeof player];
      if (typeof current !== 'number') continue;

      const next = this.applyOperator(current, change.operator, change.value);
      impacts.push({
        label: `${player.name} ${change.field.toUpperCase()}`,
        delta: next - current,
        from: current,
        to: next,
      });
    }

    return impacts;
  }

  private formatFacilityLabel(type: string): string {
    return type.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
  }

  // ── Stat changes ───────────────────────────────────────────────────────────

  applyStatChanges(changes: StatChange[], entityMap: Record<string, string>): void {
    changes.forEach((change) => {
      if (change.target === 'squad_wide') {
        this.applySquadWideChange(change);
        return;
      }
      const entityId = entityMap[change.target];
      if (!entityId) return;

      if (change.target.startsWith('player_')) {
        this.applyPlayerChange(entityId, change);
      }
    });
  }

  private applyPlayerChange(playerId: string, change: StatChange): void {
    const { players, updatePlayer } = useSquadStore.getState();
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    const current = player[change.field as keyof typeof player];
    if (typeof current !== 'number') return;

    const newValue = this.applyOperator(current, change.operator, change.value);
    updatePlayer(playerId, { [change.field]: newValue });
  }

  private applySquadWideChange(change: StatChange): void {
    const { players, updatePlayer } = useSquadStore.getState();
    players
      .filter((p) => p.isActive)
      .forEach((p) => {
        const current = p[change.field as keyof typeof p];
        if (typeof current !== 'number') return;
        const newValue = this.applyOperator(current, change.operator, change.value);
        updatePlayer(p.id, { [change.field]: newValue });
      });
  }

  private applyOperator(current: number, operator: StatOperator | string, value: number): number {
    let result: number;
    switch (operator) {
      case StatOperator.ADD:      result = current + value; break;
      case StatOperator.SUBTRACT: result = current - value; break;
      case StatOperator.SET:      result = value;           break;
      default:                    result = current;
    }
    return isNaN(result) ? current : Math.max(0, Math.min(100, result));
  }

  // ── NPC incident ───────────────────────────────────────────────────────────

  /**
   * Fire an NPC training incident template with a pre-resolved entity map.
   * isMajor determines whether the resulting NarrativeMessage is actionable.
   * Called by SocialGraphEngine — not used by the random event pipeline.
   */
  public triggerNpcIncident(
    template: GameEventTemplate,
    entityMap: Record<string, string>,
    isMajor: boolean,
  ): void {
    const autoChanges = template.impacts.stat_changes ?? [];
    let statImpacts: StatImpact[] = [];

    if (!isMajor && autoChanges.length > 0) {
      statImpacts = this.computeStatImpacts(autoChanges, entityMap);
      this.applyStatChanges(autoChanges, entityMap);
    }

    const message = this.generateMessage(template, entityMap, statImpacts);

    const finalMessage = {
      ...message,
      isActionable: isMajor && (template.impacts.choices?.length ?? 0) > 0,
    };

    useNarrativeStore.getState().addMessage(finalMessage);
  }

  // ── Active effect creation ─────────────────────────────────────────────────

  createActiveEffect(slug: string, entityId: string, durationConfig: { ticks: number; tick_effect?: StatChange; completion_event_slug: string }): void {
    const effect: ActiveEffect = {
      id: uuidv7(),
      slug,
      affectedEntityId: entityId,
      ticksRemaining: durationConfig.ticks,
      tickEffect: durationConfig.tick_effect,
      completionEventSlug: durationConfig.completion_event_slug,
      startedAt: new Date().toISOString(),
    };
    useActiveEffectStore.getState().addEffect(effect);
  }
}

export const simulationService = new SimulationService();
