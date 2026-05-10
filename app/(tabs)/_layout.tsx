import { useState, useEffect, useMemo } from 'react';
import { View, Pressable, Modal } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, Users, Building2, PoundSterling, Briefcase, Trophy, Settings, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { processWeeklyTick } from '@/engine/GameLoop';
import { simulationService } from '@/engine/SimulationService';
import { processNPCTransfers } from '@/engine/MarketEngine';
import { useWorldStore } from '@/stores/worldStore';
import { useInboxStore } from '@/stores/inboxStore';
import { uuidv7 } from '@/utils/uuidv7';
import { syncQueue } from '@/api/syncQueue';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { fetchAndCacheGameConfig } from '@/hooks/useGameConfigSync';
import { useClubStore } from '@/stores/clubStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useAltercationStore } from '@/stores/altercationStore';
import { useLossConditionStore } from '@/stores/lossConditionStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { computeStandings } from '@/utils/standingsCalculator';
import { getDatabase } from '@/db/client';
import type { SyncTransfer, SyncLedgerEntry, SyncMatchResult, SyncPlayerStat, SyncSigning } from '@/types/api';
import { GlobalHeader } from '@/components/GlobalHeader';
import { WeeklyTickOverlay } from '@/components/WeeklyTickOverlay';
import { logStorageSizes, emergencyPruneIfOverLimit, collectDebugLog } from '@/utils/storageDiagnostics';
import { SeasonEndOverlay } from '@/components/SeasonEndOverlay';
import { TimeSkipAnimation } from '@/components/ui/TimeSkipAnimation';
import { TransferWindowTicker } from '@/components/TransferWindowTicker';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticTap, hapticPress, hapticConfirm, hapticWarning } from '@/utils/haptics';
import { useTickProgressStore } from '@/stores/tickProgressStore';
import { useNavStore } from '@/stores/navStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { isTransferWindowOpen } from '@/utils/dateUtils';

type NavTabDef = {
  name: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

const NAV_TABS_BASE: NavTabDef[] = [
  { name: 'office',       Icon: Briefcase },
  { name: 'hub',          Icon: Users },
  { name: 'finances',     Icon: PoundSterling },
  { name: 'facilities',   Icon: Building2 },
  { name: 'competitions', Icon: Trophy },
];

function NavTabButton({ name, Icon, state, navigation }: NavTabDef & { state: BottomTabBarProps['state']; navigation: BottomTabBarProps['navigation'] }) {
  const routeIndex = state.routes.findIndex((r) => r.name === name);
  const isActive = routeIndex !== -1 && state.index === routeIndex;
  const route = state.routes[routeIndex];

  return (
    <Pressable
      key={name}
      onPress={() => {
        hapticTap();
        if (!route) return;
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!isActive && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 }}
    >
      <View
        style={[
          { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6 },
          isActive && { backgroundColor: WK.tealCard, borderWidth: 2, borderColor: WK.yellow, ...pixelShadow },
        ]}
      >
        <Icon size={24} color={isActive ? WK.yellow : WK.dim} />
      </View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const debugEnabled = useGameConfigStore((s) => s.config.debugLoggingEnabled);
  const tabs = debugEnabled
    ? [...NAV_TABS_BASE, { name: 'debug', Icon: Settings }]
    : NAV_TABS_BASE;

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: WK.tealDark,
      borderTopWidth: 3,
      borderTopColor: WK.border,
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom,
    }}>
      {tabs.map((tab) => (
        <NavTabButton key={tab.name} {...tab} state={state} navigation={navigation} />
      ))}
    </View>
  );
}

const TAB_BAR_HEIGHT = 60;

/**
 * How much bottom padding ScrollViews need to ensure their last item
 * is never obscured by the floating AdvanceFAB.
 * FAB height (56) + gap above tab bar (8) + breathing room (8) = 72
 */
export const FAB_CLEARANCE = 72;

function BottomFABRow({ onAdvance, isSeasonComplete }: { onAdvance: () => void; isSeasonComplete: boolean }) {
  const insets = useSafeAreaInsets();
  const backFabCallback = useNavStore((s) => s.backFabCallback);
  const backActive = backFabCallback !== null;
  const router = useRouter();

  const isSimulating = useTickProgressStore((s) => s.isSimulatingResults);
  const fabBottom = TAB_BAR_HEIGHT + insets.bottom + 8;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', gap: 10,
      }}
    >
      {/* BACK FAB */}
      <Pressable
        onPress={() => { if (backActive) { hapticTap(); backFabCallback(); } }}
        style={[
          {
            marginBottom: fabBottom,
            width: 52,
            height: 52,
            backgroundColor: backActive ? WK.tealCard : WK.tealMid,
            borderWidth: 3,
            borderColor: backActive ? WK.border : WK.tealMid,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: backActive ? 1 : 0.4,
          },
          backActive ? pixelShadow : undefined,
        ]}
      >
        <PixelText size={12} color={backActive ? WK.text : WK.dim}>{'←'}</PixelText>
      </Pressable>

      {/* HOME FAB */}
      <Pressable
        onPress={() => { hapticTap(); router.push('/'); }}
        style={[
          {
            marginBottom: fabBottom,
            width: 52,
            height: 52,
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pixelShadow,
        ]}
      >
        <Home size={20} color={WK.tealLight} />
      </Pressable>

      {/* ADVANCE FAB — shows "END" when season is complete to block further advances */}
      <Pressable
        onPress={() => { if (!isSimulating && !isSeasonComplete) { hapticPress(); onAdvance(); } }}
        disabled={isSimulating || isSeasonComplete}
        style={[
          {
            marginBottom: fabBottom,
            width: 52,
            height: 52,
            backgroundColor: isSimulating ? WK.tealMid : isSeasonComplete ? WK.orange : WK.yellow,
            borderWidth: 3,
            borderColor: isSeasonComplete ? WK.yellow : WK.border,
            alignItems: 'center',
            justifyContent: 'center',
          },
          !isSimulating ? pixelShadow : undefined,
        ]}
      >
        {isSimulating ? (
          <RefreshCw size={24} color={WK.yellow} />
        ) : isSeasonComplete ? (
          <Trophy size={20} color={WK.yellow} />
        ) : (
          <PixelText size={12} color={WK.border}>{'>>'}</PixelText>
        )}
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const pendingBlocks = useAltercationStore((s) => s.pendingBlocks);
  const resolveBlock  = useAltercationStore((s) => s.resolveBlock);
  const players       = useSquadStore((s) => s.players);
  const lossCondition = useLossConditionStore((s) => s.lossCondition);
  const router        = useRouter();

  const startTick = useTickProgressStore((s) => s.startTick);
  const endTick   = useTickProgressStore((s) => s.endTick);
  const setPhase  = useTickProgressStore((s) => s.setPhase);

  const [showAltercationDialog, setShowAltercationDialog] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [showSeasonEnd,  setShowSeasonEnd]  = useState(false);
  const [showTimeSkip,   setShowTimeSkip]   = useState(false);

  // Reactive season-complete detection — subscribes to fixture state directly so
  // the overlay fires the moment the last result is recorded, before any button press.
  // Gated on world being initialized + AMP having an active league to prevent
  // stale completed fixtures from triggering the overlay during a new-game init.
  const fixtures         = useFixtureStore((s) => s.fixtures);
  const isWorldReady     = useWorldStore((s) => s.isInitialized && s.ampLeagueId !== null);
  const isSeasonComplete = useMemo(
    () => isWorldReady && fixtures.length > 0 && fixtures.every((f) => f.result !== null),
    [isWorldReady, fixtures],
  );

  // Run emergency storage prune on mount (no-op unless total > 3 MB)
  useEffect(() => { emergencyPruneIfOverLimit(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isSeasonComplete && !showSeasonEnd) {
      hapticConfirm();
      setShowSeasonEnd(true);
    }
  }, [isSeasonComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to game over screen whenever a loss condition fires
  useEffect(() => {
    if (lossCondition) {
      router.push('/game-over');
    }
  }, [lossCondition]);

  // ── Week advance logic ───────────────────────────────────────────────────────

  async function doAdvanceWeek() {
    const tickStartMs = Date.now();
    startTick();
    try {
      // Yield to the render thread so the overlay paints before the tick runs
      await new Promise<void>((r) => setTimeout(r, 16));

      // ── Pre-tick phases (async, lets bar animate before blocking sync call) ──
      setPhase('LOADING SQUAD DATA', 8);
      await new Promise<void>((r) => setTimeout(r, 130));
      setPhase('PREPARING MATCH ENGINE', 18);
      await new Promise<void>((r) => setTimeout(r, 130));
      setPhase('QUEUING WEEKLY EVENTS', 28);
      await new Promise<void>((r) => setTimeout(r, 80));

      // ── Synchronous tick (blocks JS thread; bar holds at 28 %) ───────────────
      setPhase('PROCESSING WEEKLY TICK', 35);
      await new Promise<void>((r) => setTimeout(r, 16));

      const result = processWeeklyTick();

      // Read post-tick state — stores have already been mutated by processWeeklyTick()
      const { club } = useClubStore.getState();
      const { transactions, transfers } = useFinanceStore.getState();
      const { coaches } = useCoachStore.getState();
      const { scouts } = useScoutStore.getState();
      const { levels } = useFacilityStore.getState();
      const activePlayers = useSquadStore.getState().players.filter((p) => p.isActive);

      // GameLoop tags transactions with weekNumber+1 (the week after the tick runs)
      const ledgerWeek = result.week + 1;

      const weekTransfers: SyncTransfer[] = transfers
        .filter((t) => t.week === result.week)
        .map(({ playerId, playerName, destinationClub, grossFee, agentCommission, netProceeds, type }) => ({
          playerId, playerName, destinationClub, grossFee, agentCommission, netProceeds, type,
        }));

      // Transactions are stored in whole pounds — convert to pence for a consistent payload unit
      const weekLedger: SyncLedgerEntry[] = transactions
        .filter((tx) => tx.weekNumber === ledgerWeek)
        .map(({ category, amount, description }) => ({
          category,
          amount: amount * 100,
          description,
        }));

      // ── Build season performance fields ─────────────────────────────────────
      const { fixtures: allFixtures, getUnsyncedResults } = useFixtureStore.getState();
      const { league: currentLeague, clubs: leagueClubs } = useLeagueStore.getState();
      const ampClubId = club.id;
      const currentSeason = currentLeague?.season ?? 1;

      // AMP completed fixtures this season, newest first
      const ampSeasonFixtures = allFixtures
        .filter((f) =>
          f.leagueId === currentLeague?.id &&
          f.season === currentSeason &&
          (f.homeClubId === ampClubId || f.awayClubId === ampClubId) &&
          f.result !== null,
        )
        .sort((a, b) => b.round - a.round);

      // Form — last ≤5 results, newest first
      const form: ('W' | 'D' | 'L')[] = ampSeasonFixtures.slice(0, 5).map((f) => {
        const isHome = f.homeClubId === ampClubId;
        const scored    = isHome ? f.result!.homeGoals : f.result!.awayGoals;
        const conceded  = isHome ? f.result!.awayGoals : f.result!.homeGoals;
        return scored > conceded ? 'W' : scored === conceded ? 'D' : 'L';
      });

      // Season record totals
      const seasonRecord = ampSeasonFixtures.reduce(
        (acc, f) => {
          const isHome   = f.homeClubId === ampClubId;
          const scored   = isHome ? f.result!.homeGoals : f.result!.awayGoals;
          const conceded = isHome ? f.result!.awayGoals : f.result!.homeGoals;
          if (scored > conceded)      { acc.wins++;  acc.points += 3; }
          else if (scored === conceded) { acc.draws++; acc.points += 1; }
          else                          { acc.losses++; }
          acc.goalsFor      += scored;
          acc.goalsAgainst  += conceded;
          return acc;
        },
        { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
      );

      // League position
      let leaguePosition: number | null = null;
      if (currentLeague) {
        const seasonFixtures = allFixtures.filter(
          (f) => f.leagueId === currentLeague.id && f.season === currentSeason,
        );
        const standings = computeStandings(seasonFixtures, leagueClubs, ampClubId);
        const pos = standings.findIndex((r) => r.clubId === ampClubId);
        leaguePosition = pos >= 0 ? pos + 1 : null;
      }

      // Unsynced fixture results — build opponent name lookup from league + world clubs
      const clubNameMap: Record<string, string> = {};
      for (const c of leagueClubs) clubNameMap[c.id] = c.name;
      for (const [id, c] of Object.entries(useWorldStore.getState().clubs)) {
        if (!clubNameMap[id]) clubNameMap[id] = c.name;
      }

      const matchResults: SyncMatchResult[] = getUnsyncedResults().map((f) => {
        const isHome       = f.homeClubId === ampClubId;
        const opponentId   = isHome ? f.awayClubId : f.homeClubId;
        return {
          fixtureId:        f.id,
          leagueId:         f.leagueId,
          season:           f.season,
          round:            f.round,
          opponentClubId:   opponentId,
          opponentClubName: clubNameMap[opponentId] ?? opponentId,
          homeGoals:        f.result!.homeGoals,
          awayGoals:        f.result!.awayGoals,
          isHome,
          playedAt:         f.result!.playedAt,
        };
      });

      // Player season stats — read from SQLite (aggregate, no player.appearances needed)
      const { players: squadPlayers } = useSquadStore.getState();
      const leagueId = currentLeague?.id ?? '';
      type StatsRow = { player_id: string; appearances: number; goals: number; assists: number; avg_rating: number };
      let statsRows: StatsRow[] = [];
      try {
        const db = getDatabase();
        statsRows = await db.getAllAsync<StatsRow>(
          `SELECT player_id, SUM(appearances) as appearances, SUM(goals) as goals,
                  SUM(assists) as assists, AVG(avg_rating) as avg_rating
           FROM player_season_stats
           WHERE club_id = ? AND league_id = ? AND season = ?
           GROUP BY player_id`,
          [ampClubId, leagueId, currentSeason],
        );
      } catch (_e) {
        // DB not initialized yet — skip stats for this sync
      }
      const statsMap = new Map(statsRows.map((r) => [r.player_id, r]));
      const playerStats: SyncPlayerStat[] = squadPlayers.flatMap((p) => {
        const rec = statsMap.get(p.id);
        if (!rec || rec.appearances === 0) return [];
        return [{
          playerId:      p.id,
          appearances:   rec.appearances,
          goals:         rec.goals,
          assists:       rec.assists,
          averageRating: rec.avg_rating,
        }];
      });

      // Signings — DOF auto-signings fired as inbox messages this week.
      // Manual market signings are not tracked here; they will be reconciled
      // via a future full squad sync endpoint.
      const signings: SyncSigning[] = useInboxStore.getState().messages
        .filter(
          (m) =>
            m.type === 'system' &&
            m.week === result.week &&
            m.metadata?.systemType === 'dof_signing',
        )
        .map((m) => ({
          playerId:      m.entityId ?? '',
          playerName:    String(m.metadata?.playerName   ?? ''),
          position:      String(m.metadata?.playerPosition ?? ''),
          age:           Number(m.metadata?.playerAge      ?? 0),
          overallRating: Number(m.metadata?.perceivedAbility ?? 0),
          fee:           Number(m.metadata?.transferFee     ?? 0),
          fromClub:      m.metadata?.npcClubName ? String(m.metadata.npcClubName) : null,
        }));

      // Squad average OVR
      const squadAvgOvr = activePlayers.length > 0
        ? Math.round(activePlayers.reduce((s, p) => s + (p.overallRating ?? 0), 0) / activePlayers.length)
        : 0;

      setPhase('BUILDING SYNC PAYLOAD', 52);
      await new Promise<void>((r) => setTimeout(r, 16));

      // Attach debug log only when explicitly enabled — never sent in normal play
      const debugEnabled = useGameConfigStore.getState().config.debugLoggingEnabled === true;
      const log = debugEnabled ? await collectDebugLog(tickStartMs) : undefined;

      syncQueue.enqueue({
        weekNumber:          result.week,
        clientTimestamp:     result.processedAt,

        // Financial — all in pence, signed (allows negative deficit weeks)
        earningsDelta:       result.financialSummary.net,
        balance:             club.balance,
        totalCareerEarnings: club.totalCareerEarnings,

        // Reputation — both delta and absolute anchor
        reputationDelta:     Math.round(result.reputationDelta),
        reputation:          club.reputation,

        // Club snapshot
        hallOfFamePoints:    club.hallOfFamePoints,
        squadSize:           activePlayers.length,
        staffCount:          coaches.length + scouts.length,
        facilityLevels:      levels,
        squadAvgOvr,

        transfers:           weekTransfers,
        ledger:              weekLedger,
        signings,

        form,
        leaguePosition,
        seasonRecord,
        matchResults,
        playerStats,

        ...(log !== undefined && { log }),
      });

      setPhase('UPDATING SQUAD STATUS', 65);
      await new Promise<void>((r) => setTimeout(r, 16));

      // Background game-config refresh — every 4 game weeks, fire-and-forget
      if (useGameConfigStore.getState().shouldRefetch(result.week)) {
        void fetchAndCacheGameConfig(result.week);
      }

      // Batch simulate background fixtures.
      // week >= 5: 4-week pre-season buffer on first ever boot.
      // !isTransferWindowOpen: June is transfer window only — fixtures begin in July each season.
      if (result.week >= 5 && !isTransferWindowOpen(useCalendarStore.getState().gameDate)) {
        setPhase('SIMULATING MATCH RESULTS', 75);
        await new Promise<void>((r) => setTimeout(r, 16));
        void simulationService.runBatchSimulation();
      }

      // ── Bi-weekly NPC transfer simulation ───────────────────────────────────
      // Runs every 2 game weeks, but only during the transfer window (June).
      if (result.week % 2 === 0 && isTransferWindowOpen(useCalendarStore.getState().gameDate)) {
        setPhase('PROCESSING TRANSFER WINDOW', 84);
        await new Promise<void>((r) => setTimeout(r, 16));
        const { clubs } = useWorldStore.getState();
        try {
          const { squadSizeMin, squadSizeMax, leaguePlayerAbilityRanges } = useGameConfigStore.getState().config;
          const digest = await processNPCTransfers(result.week, clubs, squadSizeMin, squadSizeMax, leaguePlayerAbilityRanges);
          if (digest.transfers.length > 0) {
            useFinanceStore.getState().addNpcTransfers(
              digest.transfers.map((t) => ({ ...t, week: result.week, season: useLeagueStore.getState().currentSeason })),
            );
            useInboxStore.getState().addMessage({
              id:      uuidv7(),
              type:    'system',
              week:    result.week,
              subject: `Transfer Window — Week ${result.week}`,
              body:    `${digest.transfers.length} transfer(s) completed this fortnight.`,
              isRead:  false,
              metadata: {
                systemType: 'npc_transfers',
                transfers:  digest.transfers,
              },
            });
          }
        } catch (err) {
          console.warn('[doAdvanceWeek] NPC transfer processing failed:', err);
        }
      }

      setPhase('ADVANCING TO NEXT WEEK', 95);
      await new Promise<void>((r) => setTimeout(r, 220));

    } finally {
      endTick();
      // Log storage sizes after every tick to help diagnose SQLITE_FULL issues
      logStorageSizes();
    }
  }

  function handleAdvanceButton() {
    // Prevent double-press while the overlay is active
    if (useTickProgressStore.getState().isProcessing || useTickProgressStore.getState().isSimulatingResults) return;

    // Auto-resolve any blocks where one of the players has already left the squad
    const currentPlayers = useSquadStore.getState().players;
    useAltercationStore.getState().pendingBlocks.forEach((block) => {
      const aGone = !currentPlayers.some((p) => p.id === block.playerAId);
      const bGone = !currentPlayers.some((p) => p.id === block.playerBId);
      if (aGone || bGone) {
        resolveBlock(block.playerAId, block.playerBId);
      }
    });

    // Re-read after potential auto-resolves
    const remaining = useAltercationStore.getState().pendingBlocks;
    if (remaining.length > 0) {
      hapticWarning();
      setShowAltercationDialog(true);
      return;
    }

    // Guard: season is complete — overlay is already shown reactively; don't advance
    if (isSeasonComplete) return;

    doAdvanceWeek();
  }

  // ── Altercation resolution ───────────────────────────────────────────────────

  async function handleReleasePlayer(playerId: string) {
    if (isReleasing) return;
    const block = useAltercationStore.getState().pendingBlocks[0];
    if (!block) return;

    hapticConfirm();
    setIsReleasing(true);

    try {
      const { players: currentPlayers, releasePlayer, updateMorale } = useSquadStore.getState();
      const player = currentPlayers.find((p) => p.id === playerId);

      if (player) {
        // Severance: 4 weeks of the player's weekly wage (pence)
        const severancePence = player.wage * 4;
        const { addBalance, club, setReputation } = useClubStore.getState();
        addBalance(-severancePence);
        // Forced release damages reputation — visible sign of a dysfunctional squad
        setReputation(-0.5);

        const { addTransaction } = useFinanceStore.getState();
        addTransaction({
          amount: -severancePence, // pence
          category: 'wages',
          description: `Severance — ${player.name}`,
          weekNumber: club.weekNumber,
        });

        await releasePlayer(playerId);

        // Morale ripple: squad is unsettled by the forced departure
        useSquadStore.getState().players.forEach((p) => {
          updateMorale(p.id, -10);
        });
      }

      // Resolve this block
      resolveBlock(block.playerAId, block.playerBId);

      // If no blocks remain, close dialog and advance
      if (useAltercationStore.getState().pendingBlocks.length === 0) {
        setShowAltercationDialog(false);
        await doAdvanceWeek();
      }
    } finally {
      setIsReleasing(false);
    }
  }

  // ── Current block display values ─────────────────────────────────────────────

  const currentBlock = pendingBlocks[0];
  const playerA = players.find((p) => p.id === currentBlock?.playerAId);
  const playerB = players.find((p) => p.id === currentBlock?.playerBId);
  const remainingCount = pendingBlocks.length;

  return (
    <View style={{ flex: 1 }}>
      <GlobalHeader />
      <TransferWindowTicker />

      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {/* Primary tabs */}
        <Tabs.Screen name="index"      options={{ title: 'HOME' }} />
        <Tabs.Screen name="hub"        options={{ title: 'HUB' }} />
        <Tabs.Screen name="facilities" options={{ title: 'BUILD' }} />
        <Tabs.Screen name="finances"   options={{ title: 'FINANCE' }} />
        <Tabs.Screen name="office"     options={{ title: 'OFFICE' }} />
        <Tabs.Screen name="competitions" options={{ title: 'COMPETITIONS' }} />

        {/* Hidden routes — no tab button, deep-link suppressed */}
        <Tabs.Screen name="advance" options={{ href: null }} />
        <Tabs.Screen name="squad"   options={{ href: null }} />
        <Tabs.Screen name="coaches" options={{ href: null }} />
        <Tabs.Screen name="inbox"   options={{ href: null }} />
        <Tabs.Screen name="debug"   options={{ href: null, title: 'DEBUG' }} />
      </Tabs>

      <BottomFABRow onAdvance={handleAdvanceButton} isSeasonComplete={isSeasonComplete} />

      {/* Weekly tick processing overlay */}
      <WeeklyTickOverlay />

      {/* Season end overlay — shown when all fixtures have results */}
      <SeasonEndOverlay
        visible={showSeasonEnd}
        onComplete={() => setShowTimeSkip(true)}
      />

      {/* Time skip animation — plays after CONCLUDE SEASON, then dismisses both */}
      <TimeSkipAnimation
        visible={showTimeSkip}
        onComplete={() => {
          setShowTimeSkip(false);
          setShowSeasonEnd(false);
          router.push('/');
        }}
      />

      {/* Hard-block altercation dialog — forces AMP to release one player before advancing */}
      <Modal
        visible={showAltercationDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAltercationDialog(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowAltercationDialog(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 4,
              borderColor: WK.red,
              padding: 20,
              minWidth: 300,
              maxWidth: 340,
              ...pixelShadow,
            }}>
              <PixelText size={9} color={WK.red} upper style={{ marginBottom: 4 }}>
                SQUAD CONFLICT
              </PixelText>

              {remainingCount > 1 && (
                <BodyText size={12} dim style={{ marginBottom: 8 }}>
                  {remainingCount} unresolved conflicts
                </BodyText>
              )}

              {playerA && playerB ? (
                <>
                  <BodyText size={14} style={{ marginBottom: 4 }}>{playerA.name}</BodyText>
                  <BodyText size={12} dim style={{ marginBottom: 4 }}>vs</BodyText>
                  <BodyText size={14} style={{ marginBottom: 12 }}>{playerB.name}</BodyText>
                </>
              ) : (
                <BodyText size={13} dim style={{ marginBottom: 12 }}>
                  One or both players no longer in squad.
                </BodyText>
              )}

              <BodyText size={13} dim style={{ marginBottom: 20, lineHeight: 20 }}>
                Their relationship has broken down completely. Release one player to resolve the conflict and advance the week.
              </BodyText>

              <View style={{ gap: 10, marginBottom: 10 }}>
                <Button
                  label={playerA ? `RELEASE ${playerA.name}` : 'RELEASE PLAYER A'}
                  variant="red"
                  fullWidth
                  disabled={!playerA || isReleasing}
                  onPress={() => playerA && handleReleasePlayer(playerA.id)}
                />
                <Button
                  label={playerB ? `RELEASE ${playerB.name}` : 'RELEASE PLAYER B'}
                  variant="red"
                  fullWidth
                  disabled={!playerB || isReleasing}
                  onPress={() => playerB && handleReleasePlayer(playerB.id)}
                />
              </View>

              <Button
                label="LATER"
                variant="teal"
                fullWidth
                disabled={isReleasing}
                onPress={() => setShowAltercationDialog(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
