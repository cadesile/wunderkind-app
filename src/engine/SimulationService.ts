import { uuidv7 } from '@/utils/uuidv7';
import { useEventStore } from '@/stores/eventStore';
import { useActiveEffectStore } from '@/stores/activeEffectStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useSquadStore } from '@/stores/squadStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useClubStore } from '@/stores/clubStore';
import { updatePlayerRelationship } from './RelationshipService';
import { useWorldStore } from '@/stores/worldStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useTickProgressStore } from '@/stores/tickProgressStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { useManagerRecordStore } from '@/stores/managerRecordStore';
import type { ManagerOutcome } from '@/stores/managerRecordStore';
import { useClubStatsStore } from '@/stores/clubStatsStore';
import type { ClubResultEntry } from '@/stores/clubStatsStore';
import type { MatchResultRecord } from '@/stores/matchResultStore';
import { calculateStadiumCapacity } from '@/utils/stadiumCapacity';
import { SelectionService } from './SelectionService';
import { ResultsEngine, SimTeam } from './ResultsEngine';
import { Player, Position } from '../types/player';
import { Formation } from '../types/game';
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
  RelationshipType,
} from '@/types/narrative';

// ─── Simulation Service ───────────────────────────────────────────────────────
//
// Processes narrative story ticks and match simulations entirely on-device.

import { useGameConfigStore } from '@/stores/gameConfigStore';
import { getDatabase } from '@/db/client';
import { batchUpdateResults } from '@/db/repositories/fixtureRepository';
import { batchInsertResults } from '@/db/repositories/matchResultRepository';
import { batchUpsertStats } from '@/db/repositories/statsRepository';
import { batchInsertAppearances } from '@/db/repositories/appearanceRepository';
import type { FixtureResultEntry, AppearanceInsertEntry, StatsInsertEntry } from '@/db/types';
import { queryClient } from '@/api/queryClient';

class SimulationService {

  /** Call once per week tick to process effects and potentially fire a story event. */
  processDailyTick(): void {
    const currentWeek = useClubStore.getState().club.weekNumber ?? 1;
    useEventStore.getState().expireCooldowns(currentWeek);
    this.processActiveEffects();
    // ~20% chance per tick to fire a random narrative event (if templates are loaded)
    if (Math.random() < 0.2) {
      this.triggerRandomEvent(currentWeek);
    }
  }

  /**
   * Runs batch simulation for all fixtures of the current matchday.
   * Processes leagues in small batches to avoid blocking the main thread.
   */
  async runBatchSimulation(): Promise<void> {
    const { startSimulation, endSimulation } = useTickProgressStore.getState();
    const { fixtures, currentMatchday } = useFixtureStore.getState();
    const { clubs: worldClubs, leagues: worldLeagues } = useWorldStore.getState();
    // Build a leagueId → tier lookup once; used when recording per-player stats
    const leagueTierMap = new Map<string, number>(worldLeagues.map((l) => [l.id, l.tier]));
    const { club: userClub } = useClubStore.getState();
    const { config: gameConfig } = useGameConfigStore.getState();
    const { players: userSquad } = useSquadStore.getState();

    startSimulation();

    // 1. Filter fixtures for current week that haven't been played
    const currentFixtures = fixtures.filter(
      (f) => f.round === currentMatchday && f.result === null
    );

    const tacticalMatrix = (gameConfig as any)?.tacticalMatrix ?? {};
    const styleInfluence = (useGameConfigStore.getState().config?.playingStyleInfluence) ?? {};

    // 2. Process in chunks — collect all batch entries, flush ONCE at the end
    const batchSize = 10;

    const appearanceEntries: AppearanceInsertEntry[] = [];
    const statsEntries: StatsInsertEntry[] = [];
    const fixtureResultEntries: FixtureResultEntry[] = [];
    const matchResultEntries: MatchResultRecord[] = [];
    const clubResultEntries: ClubResultEntry[] = [];
    const managerResultEntries: Array<{ managerId: string; name: string; outcome: ManagerOutcome }> = [];

    for (let i = 0; i < currentFixtures.length; i += batchSize) {
      const chunk = currentFixtures.slice(i, i + batchSize);

      for (const fixture of chunk) {
        const homeTeam = this.getSimTeam(fixture.homeClubId, worldClubs, userClub, userSquad);
        const awayTeam = this.getSimTeam(fixture.awayClubId, worldClubs, userClub, userSquad);

        if (homeTeam && awayTeam) {
          const result = ResultsEngine.simulate(homeTeam, awayTeam, tacticalMatrix, styleInfluence);
          const playedAt = new Date().toISOString();

          // ── Collect fixture result (flushed in batch below) ────────────────
          fixtureResultEntries.push({
            fixtureId: fixture.id,
            homeGoals: result.homeScore,
            awayGoals: result.awayScore,
            playedAt,
          });

          // ── Collect club all-time record update ────────────────────────────
          clubResultEntries.push({
            homeClubId: fixture.homeClubId,
            awayClubId: fixture.awayClubId,
            homeGoals:  result.homeScore,
            awayGoals:  result.awayScore,
          });

          // ── Persist full match result for all fixtures (AMP and NPC) ──────
          const POS_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
          const serializePerf = (perf: typeof result.homePerformance) =>
            [...perf.players]
              .sort((a, b) => (POS_ORDER[a.player.position] ?? 9) - (POS_ORDER[b.player.position] ?? 9))
              .map((pp) => ({
                id:       pp.player.id,
                name:     pp.player.name,
                position: pp.player.position,
                rating:   pp.rating,
                goals:    pp.goal,
                assists:  pp.assist,
              }));

          const homePlayers = serializePerf(result.homePerformance);
          const awayPlayers = serializePerf(result.awayPerformance);

          // Hoist AMP detection so it's available for stats + appearance gating below
          const ampIsHome = fixture.homeClubId === userClub.id;
          const ampIsAway = fixture.awayClubId === userClub.id;

          // ── Collect match result record (flushed in batch below) ───────────
          matchResultEntries.push({
            fixtureId:      fixture.id,
            season:         fixture.season,
            homeClubId:     fixture.homeClubId,
            awayClubId:     fixture.awayClubId,
            homeGoals:      result.homeScore,
            awayGoals:      result.awayScore,
            homeAvgRating:  result.homePerformance.averageRating,
            awayAvgRating:  result.awayPerformance.averageRating,
            homePlayers,
            awayPlayers,
            playedAt,
          });

          // ── Collect per-player season stats (all fixtures, all leagues) ────────
          // Keyed by t{tier}_s{season} in AsyncStorage so each bucket stays small
          // and old seasons can be dropped per-tier without touching other tiers.
          {
            const { leagueId, season } = fixture;
            const tier = leagueTierMap.get(leagueId) ?? 1;
            for (const pp of homePlayers) {
              statsEntries.push({ playerId: pp.id, clubId: fixture.homeClubId, leagueId, season, tier, goals: pp.goals, assists: pp.assists, rating: pp.rating });
            }
            for (const pp of awayPlayers) {
              statsEntries.push({ playerId: pp.id, clubId: fixture.awayClubId, leagueId, season, tier, goals: pp.goals, assists: pp.assists, rating: pp.rating });
            }
          }

          // ── Collect manager result (flushed in batch below) ───────────────
          {
            const { coaches: ampCoaches } = require('@/stores/coachStore').useCoachStore.getState();
            const homeOutcome: ManagerOutcome = result.homeScore > result.awayScore ? 'win' : result.homeScore < result.awayScore ? 'loss' : 'draw';
            const awayOutcome: ManagerOutcome = result.awayScore > result.homeScore ? 'win' : result.awayScore < result.homeScore ? 'loss' : 'draw';

            const getManagerIdAndName = (clubId: string): { id: string; name: string } | null => {
              if (clubId === userClub.id) {
                const mgr = (ampCoaches as import('@/types/coach').Coach[]).find((c) => c.role === 'manager');
                return mgr ? { id: mgr.id, name: mgr.name } : null;
              }
              const npcMgr = worldClubs[clubId]?.staff.find((s) => s.role === 'manager');
              if (!npcMgr) return null;
              return { id: npcMgr.id, name: `${npcMgr.firstName} ${npcMgr.lastName}` };
            };

            const homeMgr = getManagerIdAndName(fixture.homeClubId);
            const awayMgr = getManagerIdAndName(fixture.awayClubId);
            if (homeMgr) managerResultEntries.push({ managerId: homeMgr.id, name: homeMgr.name, outcome: homeOutcome });
            if (awayMgr) managerResultEntries.push({ managerId: awayMgr.id, name: awayMgr.name, outcome: awayOutcome });
          }

          if (ampIsHome || ampIsAway) {
            const homeName = ampIsHome ? userClub.name : (worldClubs[fixture.homeClubId]?.name ?? 'Opponent');
            const awayName = ampIsAway ? userClub.name : (worldClubs[fixture.awayClubId]?.name ?? 'Opponent');
            const ampGoals = ampIsHome ? result.homeScore : result.awayScore;
            const oppGoals = ampIsHome ? result.awayScore : result.homeScore;

            // ── Record appearances for AMP XI players ─────────────────────────
            const matchResult: 'win' | 'loss' | 'draw' =
              ampGoals > oppGoals ? 'win' : ampGoals < oppGoals ? 'loss' : 'draw';
            const scoreline = `${ampGoals}-${oppGoals}`;
            const opponentId = ampIsHome ? fixture.awayClubId : fixture.homeClubId;
            const ampPerformance = ampIsHome ? result.homePerformance : result.awayPerformance;
            const ampSquadIds = new Set(userSquad.map((p) => p.id));
            const tier = leagueTierMap.get(fixture.leagueId) ?? 1;
            ampPerformance.players.forEach((pp) => {
              if (!ampSquadIds.has(pp.player.id)) return;
              appearanceEntries.push({
                playerId:   pp.player.id,
                clubId:     userClub.id,
                leagueId:   fixture.leagueId,
                season:     fixture.season,
                tier,
                fixtureId:  fixture.id,
                week:       fixture.round,
                opponentId,
                result:     matchResult,
                scoreline,
                goals:      pp.goal,
                assists:    pp.assist,
                minutes:    90,
                rating:     pp.rating,
                position:   pp.player.position,
              });
            });
            const outcome = ampGoals > oppGoals ? 'Win' : ampGoals < oppGoals ? 'Loss' : 'Draw';
            const venue = ampIsHome ? 'Home' : 'Away';

            // Emit Fan Event
            const { useFanStore } = require('@/stores/fanStore');
            const fanImpact = outcome === 'Win' ? 5 : outcome === 'Loss' ? -5 : 0;
            const fanEventType = outcome === 'Win' ? 'match_win' : outcome === 'Loss' ? 'match_loss' : 'match_draw';
            const fanDescription = outcome === 'Win' ? `Won ${ampGoals}-${oppGoals} vs ${ampIsHome ? awayName : homeName}` :
                                   outcome === 'Loss' ? `Lost ${ampGoals}-${oppGoals} vs ${ampIsHome ? awayName : homeName}` :
                                   `Drew ${ampGoals}-${oppGoals} vs ${ampIsHome ? awayName : homeName}`;

            useFanStore.getState().addEvent({
              type: fanEventType,
              description: fanDescription,
              impact: fanImpact,
              weekNumber: userClub.weekNumber,
              targets: ['manager', 'players'],
            });

            // Serialize performance data for the inbox detail card

            useInboxStore.getState().addMessage({
              id: uuidv7(),
              type: 'match_result',
              week: userClub.weekNumber,
              subject: `Result — ${venue} ${outcome}`,
              body: `${homeName} ${result.homeScore} – ${result.awayScore} ${awayName}\nMatchday ${fixture.round}`,
              isRead: false,
              metadata: {
                fixtureId: fixture.id,
                homeTeamName: homeName,
                awayTeamName: awayName,
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                round: fixture.round,
                homeAvgRating: result.homePerformance.averageRating,
                awayAvgRating: result.awayPerformance.averageRating,
                homePlayers: serializePerf(result.homePerformance),
                awayPlayers: serializePerf(result.awayPerformance),
              },
            });

            // ── Attendance log (home games only) ──────────────────────────────
            if (ampIsHome) {
              const { templates, levels } = useFacilityStore.getState();
              const capacity = calculateStadiumCapacity(templates, levels);

              const TIER_RANGES: Record<string, [number, number]> = {
                Local:    [20, 50],
                Regional: [40, 60],
                National: [60, 80],
                Elite:    [80, 90],
              };
              const [min, max] = TIER_RANGES[userClub.reputationTier] ?? [20, 50];
              const basePct = min + Math.random() * (max - min);

              // Collect active narrative effects tagged as attendance bonuses
              // Convention: tickEffect.target === 'club', tickEffect.field === 'attendance_bonus'
              const activeEffects = useActiveEffectStore.getState().effects;
              const fanEffects: { label: string; bonus: number }[] = activeEffects
                .filter(
                  (e) =>
                    e.tickEffect?.target === 'club' &&
                    e.tickEffect?.field === 'attendance_bonus',
                )
                .map((e) => ({ label: e.slug, bonus: e.tickEffect!.value }));
              const totalBonus = fanEffects.reduce((sum, e) => sum + e.bonus, 0);

              const finalPct = Math.min(100, Math.max(0, basePct + totalBonus));
              const attendance = capacity > 0 ? Math.round(capacity * finalPct / 100) : 0;

              useAttendanceStore.getState().addRecord({
                fixtureId: fixture.id,
                week: userClub.weekNumber,
                homeClubName: homeName,
                awayClubName: awayName,
                homeGoals: result.homeScore,
                awayGoals: result.awayScore,
                stadiumCapacity: capacity,
                attendancePct: Math.round(finalPct),
                attendance,
                reputationTier: userClub.reputationTier,
                fanEffects,
              });
            }
          }
        }
      }

      // Yield to UI thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // ── Flush all collected data — SQLite writes (historical) ──────────────
    const db = getDatabase();
    await batchUpdateResults(db, fixtureResultEntries);
    await batchInsertResults(db, matchResultEntries);
    await batchUpsertStats(db, statsEntries);
    await batchInsertAppearances(db, appearanceEntries);

    // ── Invalidate TanStack Query caches ───────────────────────────────────
    queryClient.invalidateQueries({ queryKey: ['league-scorers'] });
    queryClient.invalidateQueries({ queryKey: ['league-assisters'] });
    queryClient.invalidateQueries({ queryKey: ['appearances'] });

    // ── Zustand in-memory updates (unchanged) ──────────────────────────────
    useFixtureStore.getState().batchRecordResults(
      fixtureResultEntries.map((e) => ({
        fixtureId: e.fixtureId,
        result: { homeGoals: e.homeGoals, awayGoals: e.awayGoals, playedAt: e.playedAt },
      })),
    );
    useClubStatsStore.getState().batchUpdateFromResults(clubResultEntries);
    useManagerRecordStore.getState().batchRecordResults(managerResultEntries);

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
    const formation = (club.formation ?? '4-4-2') as Formation;
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

  private triggerRandomEvent(currentWeek: number): void {
    const template = useEventStore.getState().getWeightedRandomTemplate(undefined, currentWeek);
    if (!template) return;
    useEventStore.getState().markFired(template.slug, currentWeek);
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
    if (!isActionable) {
      if (autoChanges.length > 0) {
        statImpacts = this.computeStatImpacts(autoChanges, entityMap);
        this.applyStatChanges(autoChanges, entityMap);
      }
      this.applyLegacyImpacts(template.impacts, entityMap);
    }

    const message = this.generateMessage(template, entityMap, statImpacts);

    // Auto-Manager logic
    const { useCoachStore } = require('@/stores/coachStore');
    const { ManagerBrain } = require('./ManagerBrain');
    const { reactionHandler } = require('./ReactionHandler');
    const activeManager = useCoachStore.getState().coaches.find((c: any) => c.role === 'manager');
    const isAutoManaging = activeManager?.autoManageEvents === true;

    if (isAutoManaging && message.isActionable && message.choices && message.choices.length > 0) {
      // Pick choice automatically
      const primaryPlayerId = message.affectedEntities[0];
      const { useSquadStore } = require('@/stores/squadStore');
      const player = useSquadStore.getState().players.find((p: any) => p.id === primaryPlayerId);
      
      let choiceIndex = 0;
      if (player && activeManager) {
        const action = ManagerBrain.decideSupportOrPunish(activeManager, player);
        // Map support/punish to choice labels if possible, otherwise first is support, second is punish
        const supportIndex = message.choices.findIndex(c => c.label.toLowerCase().includes('support') || c.label.toLowerCase().includes('accept'));
        const punishIndex = message.choices.findIndex(c => c.label.toLowerCase().includes('punish') || c.label.toLowerCase().includes('discipline'));
        
        if (action === 'support' && supportIndex !== -1) choiceIndex = supportIndex;
        else if (action === 'punish' && punishIndex !== -1) choiceIndex = punishIndex;
        else if (action === 'punish' && message.choices.length > 1) choiceIndex = 1; // Fallback for 2-choice events
      }

      const choice = message.choices[choiceIndex];
      message.autoManagedChoiceIndex = choiceIndex;
      
      // Execute choice immediately
      reactionHandler.handleChoice(message, choice);
    }

    // Auto-Manage Direct Actions (Support/Punish) for all listed players
    if (isAutoManaging && !template.noInteract && message.affectedEntities.length > 0) {
      const { useSquadStore } = require('@/stores/squadStore');
      const squadStore = useSquadStore.getState();
      const playerChoices: Record<string, number> = {};
      const currentWeek = useClubStore.getState().club.weekNumber ?? 1;

      message.affectedEntities.forEach((playerId: string) => {
        const player = squadStore.players.find((p: any) => p.id === playerId);
        if (player && activeManager) {
           const action = ManagerBrain.handleBehavioralIncident(activeManager, player, message.title, currentWeek, false);
           playerChoices[playerId] = action === 'support' ? 0 : 1;
        }
      });
      message.autoManagedPlayerChoices = playerChoices;
    }

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

    const hasChoices = !template.noInteract && (template.impacts.choices?.length ?? 0) > 0;
    return {
      id: uuidv7(),
      title: template.title,
      body,
      isActionable: hasChoices,
      noInteract: template.noInteract ?? false,
      choices: hasChoices ? template.impacts.choices : undefined,
      affectedEntities: Object.values(entityMap),
      statImpacts: statImpacts.length > 0 ? statImpacts : undefined,
      week: club.weekNumber ?? 1,
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

  // ── Legacy impact format ───────────────────────────────────────────────────
  //
  // The backend sends some impacts as numbered object keys rather than the
  // stat_changes array format. This method parses those and applies them,
  // including the separate relationships[] array for direct bond changes.
  //
  // Supported targets:
  //   player_X.morale                 → clamp 0–100
  //   player_X.personality.<trait>    → clamp 1–20 (unknown traits silently skipped)
  //   pair.relationship               → bidirectional updatePlayerRelationship
  //
  // relationships[] entries:
  //   { type: 'friendship'|'rivalry', player_1_ref, player_2_ref, intensity }
  //   → bidirectional delta: +intensity (friendship) or -intensity (rivalry)

  private applyLegacyImpacts(
    impacts: any,
    entityMap: Record<string, string>,
  ): void {
    if (!impacts || typeof impacts !== 'object') return;

    // 1. Numbered-key entries
    for (const key of Object.keys(impacts)) {
      if (!/^\d+$/.test(key)) continue;
      const entry = impacts[key];
      if (!entry || typeof entry !== 'object') continue;
      const { target, delta } = entry;
      if (typeof target !== 'string' || typeof delta !== 'number' || delta === 0) continue;

      if (target === 'pair.relationship') {
        const p1Id = entityMap['player_1'];
        const p2Id = entityMap['player_2'];
        if (p1Id && p2Id) {
          updatePlayerRelationship(p1Id, p2Id, 'player', delta);
          updatePlayerRelationship(p2Id, p1Id, 'player', delta);
        }
        continue;
      }

      // "player_1.morale" or "player_1.personality.confidence"
      const parts = target.split('.');
      if (parts.length < 2) continue;
      const entityRef = parts[0];
      const entityId = entityMap[entityRef];
      if (!entityId) continue;

      const { players, updatePlayer } = useSquadStore.getState();
      const player = players.find((p) => p.id === entityId);
      if (!player) continue;

      if (parts[1] === 'morale') {
        const current = player.morale ?? 70;
        updatePlayer(entityId, { morale: Math.max(0, Math.min(100, current + delta)) });
      } else if (parts[1] === 'personality' && parts[2]) {
        const trait = parts[2];
        const current = (player.personality as Record<string, number>)[trait];
        if (typeof current === 'number') {
          updatePlayer(entityId, {
            personality: {
              ...player.personality,
              [trait]: Math.max(1, Math.min(20, current + delta)),
            },
          });
        }
        // Unknown traits (e.g. 'confidence', 'ego') not in PersonalityMatrix are silently skipped
      }
    }

    // 2. Relationships array
    const relationships: any[] = Array.isArray(impacts.relationships) ? impacts.relationships : [];
    for (const rel of relationships) {
      if (!rel || typeof rel !== 'object') continue;
      const p1Id = entityMap[rel.player_1_ref];
      const p2Id = entityMap[rel.player_2_ref];
      if (!p1Id || !p2Id) continue;
      const intensity = typeof rel.intensity === 'number' ? rel.intensity : 0;
      if (intensity === 0) continue;
      const relDelta = rel.type === RelationshipType.RIVALRY ? -intensity : intensity;
      updatePlayerRelationship(p1Id, p2Id, 'player', relDelta);
      updatePlayerRelationship(p2Id, p1Id, 'player', relDelta);
    }
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

    if (!isMajor) {
      if (autoChanges.length > 0) {
        statImpacts = this.computeStatImpacts(autoChanges, entityMap);
        this.applyStatChanges(autoChanges, entityMap);
      }
      this.applyLegacyImpacts(template.impacts, entityMap);
    }

    const message = this.generateMessage(template, entityMap, statImpacts);

    const finalMessage = {
      ...message,
      isActionable: !template.noInteract && isMajor && (template.impacts.choices?.length ?? 0) > 0,
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
