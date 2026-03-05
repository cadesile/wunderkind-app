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
  SelectionLogic,
  TargetType,
  StatOperator,
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

    const entityMap = this.resolveTargets(template.impacts.selection_logic);
    // If the template requires specific targets but none were resolved, skip.
    if (template.impacts.selection_logic && Object.keys(entityMap).length === 0) return;

    const message = this.generateMessage(template, entityMap);
    useNarrativeStore.getState().addMessage(message);
  }

  // ── Target resolution ──────────────────────────────────────────────────────

  private resolveTargets(logic?: SelectionLogic): Record<string, string> {
    if (!logic) return {};
    const entityMap: Record<string, string> = {};

    switch (logic.target_type) {
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
        if (player) replacements[key] = player.name;
      } else if (key.startsWith('facility_')) {
        replacements[key] = this.formatFacilityLabel(id);
      }
    });

    let body = template.bodyTemplate;
    Object.entries(replacements).forEach(([key, value]) => {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    return {
      id: uuidv7(),
      title: template.title,
      body,
      isActionable: (template.impacts.choices?.length ?? 0) > 0,
      choices: template.impacts.choices,
      affectedEntities: Object.values(entityMap),
      createdAt: new Date().toISOString(),
    };
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
