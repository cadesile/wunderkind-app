import { uuidv7 } from '@/utils/uuidv7';
import { useEventStore } from '@/stores/eventStore';
import { useActiveEffectStore } from '@/stores/activeEffectStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useSquadStore } from '@/stores/squadStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useClubStore } from '@/stores/clubStore';
import { useWorldStore } from '@/stores/worldStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useTickProgressStore } from '@/stores/tickProgressStore';
import { useInboxStore } from '@/stores/inboxStore';
import { SelectionService } from './SelectionService';
import { ResultsEngine, SimTeam } from './ResultsEngine';
import { Player, Position } from '../types/player';
import { WorldPlayer, WorldClub } from '../types/world';
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
// Processes narrative story ticks and match simulations entirely on-device.

class SimulationService {

  /** Call once per week tick to process effects and potentially fire a story event. */
  processDailyTick(): void {
    this.processActiveEffects();
    // ~20% chance per tick to fire a random narrative event (if templates are loaded)
    if (Math.random() < 0.2) {
      this.triggerRandomEvent();
    }
  }

  /**
   * Runs batch simulation for all fixtures of the current matchday.
   * Processes leagues in small batches to avoid blocking the main thread.
   */
  async runBatchSimulation(): Promise<void> {
    const { startSimulation, endSimulation } = useTickProgressStore.getState();
    const { fixtures, currentMatchday, recordResult } = useFixtureStore.getState();
    const { clubs: worldClubs } = useWorldStore.getState();
    const { club: userClub, gameConfig } = useClubStore.getState();
    const { players: userSquad } = useSquadStore.getState();

    startSimulation();

    // 1. Filter fixtures for current week that haven't been played
    const currentFixtures = fixtures.filter(
      (f) => f.round === currentMatchday && f.result === null
    );

    const tacticalMatrix = gameConfig?.tacticalMatrix ?? {};

    console.log('tacticalMatrix', tacticalMatrix);

    // 2. Process in chunks
    const batchSize = 10;
          console.log('batchSize',batchSize);
          console.log('currentFixtures',currentFixtures);
    for (let i = 0; i < currentFixtures.length; i += batchSize) {
      const chunk = currentFixtures.slice(i, i + batchSize);
      
      for (const fixture of chunk) {
          console.log('fixture',fixture);
        const homeTeam = this.getSimTeam(fixture.homeClubId, worldClubs, userClub, userSquad);
        const awayTeam = this.getSimTeam(fixture.awayClubId, worldClubs, userClub, userSquad);

        if (homeTeam && awayTeam) {
          const result = ResultsEngine.simulate(homeTeam, awayTeam, tacticalMatrix);
          console.log('home',homeTeam);
          recordResult(fixture.id, {
            homeGoals: result.homeScore,
            awayGoals: result.awayScore,
            playedAt: new Date().toISOString(),
          });

          const ampIsHome = fixture.homeClubId === userClub.id;
          const ampIsAway = fixture.awayClubId === userClub.id;
          if (ampIsHome || ampIsAway) {
            const homeName = ampIsHome ? userClub.name : (worldClubs[fixture.homeClubId]?.name ?? 'Opponent');
            const awayName = ampIsAway ? userClub.name : (worldClubs[fixture.awayClubId]?.name ?? 'Opponent');
            const ampGoals = ampIsHome ? result.homeScore : result.awayScore;
            const oppGoals = ampIsHome ? result.awayScore : result.homeScore;
            const outcome = ampGoals > oppGoals ? 'Win' : ampGoals < oppGoals ? 'Loss' : 'Draw';
            const venue = ampIsHome ? 'Home' : 'Away';
            useInboxStore.getState().addMessage({
              id: uuidv7(),
              type: 'match_result',
              week: userClub.weekNumber,
              subject: `Result — ${venue} ${outcome}`,
              body: `${homeName} ${result.homeScore} – ${result.awayScore} ${awayName}\nMatchday ${fixture.round}`,
              isRead: false,
            });
          }
        }
      }

      // Yield to UI thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    endSimulation();
    useFixtureStore.getState().advanceMatchday();
  }

  private getSimTeam(
    clubId: string,
    worldClubs: Record<string, WorldClub>,
    userClub: any,
    userSquad: Player[]
  ): SimTeam | null {
    // Check if it's the user's club
    if (userClub && clubId === userClub.id) {
      const xi = SelectionService.selectStartingXI(userSquad, (userClub.formation as any) ?? '4-4-2');
      return {
        xi,
        playingStyle: 'POSSESSION', // TODO: Get from club config
        managerAbility: 70, // TODO: Get from manager profile
      };
    }

    // Otherwise it's an NPC club from worldStore
    const club = worldClubs[clubId];
    if (!club) return null;

    const players = club.players.map((p) => this.mapWorldPlayerToPlayer(p));
    const formation = (club as any).formation ?? '4-4-2';
    const xi = SelectionService.selectStartingXI(players, formation);

    return {
      xi,
      playingStyle: club.personality.playingStyle,
      managerAbility: 50 + (club.personality.managerTemperament / 10), // Approximate
    };
  }

  private mapWorldPlayerToPlayer(wp: WorldPlayer): Player {
    return {
      id: wp.id,
      name: `${wp.firstName} ${wp.lastName}`,
      dateOfBirth: wp.dateOfBirth,
      age: 20, // Approximate
      position: (wp.position === 'ATT' ? 'FWD' : wp.position) as Position,
      nationality: wp.nationality,
      overallRating: this.calculateOverall(wp),
      morale: 50,
      potential: 3,
      wage: 0,
      personality: wp.personality,
      agentId: null,
      joinedWeek: 1,
      isActive: true,
      status: 'active',
    };
  }

  private calculateOverall(wp: WorldPlayer): number {
    return Math.round((wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6);
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
    if (template.category === EventCategory.GUARDIAN) return;

    let entityMap = this.resolveTargets(template.impacts.selection_logic);
    if (template.impacts.selection_logic && Object.keys(entityMap).length === 0) return;

    if (/\{player/i.test(template.bodyTemplate)) {
      const active = this.filterPlayers(undefined).filter((p) => p.isActive);
      if (active.length === 0) return;

      const slotMatches = [...template.bodyTemplate.matchAll(/\{player_(\d+)\}/gi)];
      const requiredIndices = [...new Set(slotMatches.map((m) => parseInt(m[1], 10)))];
      if (/\{player\}/i.test(template.bodyTemplate) && !requiredIndices.includes(1)) {
        requiredIndices.push(1);
      }

      const usedIds = new Set(Object.values(entityMap));
      for (const idx of requiredIndices.sort((a, b) => a - b)) {
        const key = `player_${idx}`;
        if (!entityMap[key]) {
          const available = active.filter((p) => !usedIds.has(p.id));
          if (available.length === 0) break;
          const picked = this.randomSample(available, 1)[0];
          entityMap = { ...entityMap, [key]: picked.id };
          usedIds.add(picked.id);
        }
      }
    }

    if (/\{facility/i.test(template.bodyTemplate) && !entityMap['facility_1']) {
      const facilities = this.filterFacilities(undefined);
      if (facilities.length > 0) {
        const picked = this.randomSample(facilities, 1);
        entityMap = { ...entityMap, facility_1: picked[0].type };
      }
    }

    const autoChanges = template.impacts.stat_changes ?? [];
    const isActionable = (template.impacts.choices?.length ?? 0) > 0;

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
    const { club } = useClubStore.getState();
    const { players } = useSquadStore.getState();

    const replacements: Record<string, string> = {
      PA_Name: (club as any).managerPersonality?.paName ?? 'Your PA',
    };

    Object.entries(entityMap).forEach(([key, id]) => {
      if (key.startsWith('player_')) {
        const player = players.find((p) => p.id === id);
        replacements[key] = player?.name ?? 'a player';
      } else if (key.startsWith('facility_')) {
        replacements[key] = this.formatFacilityLabel(id);
      }
    });

    if (replacements['player_1']) replacements['player'] = replacements['player_1'];
    if (replacements['player_2']) replacements['player2'] = replacements['player_2'];
    if (replacements['facility_1']) replacements['facility'] = replacements['facility_1'];

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

      const current = (player as any)[change.field];
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

    const current = (player as any)[change.field];
    if (typeof current !== 'number') return;

    const newValue = this.applyOperator(current, change.operator, change.value);
    updatePlayer(playerId, { [change.field]: newValue });
  }

  private applySquadWideChange(change: StatChange): void {
    const { players, updatePlayer } = useSquadStore.getState();
    players
      .filter((p) => p.isActive)
      .forEach((p) => {
        const current = (p as any)[change.field];
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
