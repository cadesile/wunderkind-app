import { useState, useEffect } from 'react';
import { View, Pressable, Modal } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, LayoutGrid, Building2, DollarSign, Store } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { processWeeklyTick } from '@/engine/GameLoop';
import { syncQueue } from '@/api/syncQueue';
import { useAcademyStore } from '@/stores/academyStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useSquadStore } from '@/stores/squadStore';
import { useAltercationStore } from '@/stores/altercationStore';
import { useLossConditionStore } from '@/stores/lossConditionStore';
import type { SyncTransfer, SyncLedgerEntry } from '@/types/api';
import { GlobalHeader } from '@/components/GlobalHeader';
import { WeeklyTickOverlay } from '@/components/WeeklyTickOverlay';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticTap, hapticPress, hapticConfirm, hapticWarning } from '@/utils/haptics';
import { useTickProgressStore } from '@/stores/tickProgressStore';

type NavTabDef = {
  name: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

const NAV_TABS: NavTabDef[] = [
  { name: 'home',       Icon: Home },
  { name: 'index',      Icon: LayoutGrid },
  { name: 'facilities', Icon: Building2 },
  { name: 'finances',   Icon: DollarSign },
  { name: 'market',     Icon: Store },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: WK.tealDark,
        borderTopWidth: 3,
        borderTopColor: WK.border,
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom + 8,
      }}
    >
      {NAV_TABS.map(({ name, Icon }) => {
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
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
            }}
          >
            {/* Active pill */}
            <View
              style={[
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                },
                isActive && {
                  backgroundColor: WK.tealCard,
                  borderWidth: 2,
                  borderColor: WK.yellow,
                  ...pixelShadow,
                },
              ]}
            >
              <Icon size={24} color={isActive ? WK.yellow : WK.dim} />
            </View>
          </Pressable>
        );
      })}
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

  const [showAltercationDialog, setShowAltercationDialog] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  // Navigate to game over screen whenever a loss condition fires
  useEffect(() => {
    if (lossCondition) {
      router.push('/game-over');
    }
  }, [lossCondition]);

  // ── Week advance logic ───────────────────────────────────────────────────────

  async function doAdvanceWeek() {
    startTick();
    // Yield to the render thread so the overlay paints before the tick runs
    await new Promise<void>((r) => setTimeout(r, 16));

    const result = processWeeklyTick();
    const { academy } = useAcademyStore.getState();
    const { transactions, transfers } = useFinanceStore.getState();
    const ledgerWeek = result.week + 1;

    const weekTransfers: SyncTransfer[] = transfers
      .filter((t) => t.week === result.week)
      .map(({ playerId, playerName, destinationClub, grossFee, agentCommission, netProceeds, type }) => ({
        playerId, playerName, destinationClub, grossFee, agentCommission, netProceeds, type,
      }));

    const weekLedger: SyncLedgerEntry[] = transactions
      .filter((tx) => tx.weekNumber === ledgerWeek)
      .map(({ category, amount, description }) => ({ category, amount, description }));

    syncQueue.enqueue({
      weekNumber:       result.week,
      clientTimestamp:  result.processedAt,
      earningsDelta:    Math.max(0, result.financialSummary.net),
      reputationDelta:  Math.round(result.reputationDelta),
      hallOfFamePoints: academy.hallOfFamePoints,
      transfers:        weekTransfers,
      ledger:           weekLedger,
    });

    endTick();
  }

  function handleAdvanceButton() {
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
        const { addBalance, academy, setReputation } = useAcademyStore.getState();
        addBalance(-severancePence);
        // Forced release damages reputation — visible sign of a dysfunctional squad
        setReputation(-0.5);

        const { addTransaction } = useFinanceStore.getState();
        addTransaction({
          amount: -Math.round(severancePence / 100), // ledger in whole pounds
          category: 'wages',
          description: `Severance — ${player.name}`,
          weekNumber: academy.weekNumber,
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

      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {/* Primary tabs */}
        <Tabs.Screen name="home"       options={{ title: 'HOME' }} />
        <Tabs.Screen name="index"      options={{ title: 'HUB' }} />
        <Tabs.Screen name="facilities" options={{ title: 'BUILD' }} />
        <Tabs.Screen name="finances"   options={{ title: 'FINANCE' }} />
        <Tabs.Screen name="market"     options={{ title: 'MARKET' }} />

        {/* Hidden routes — no tab button, deep-link suppressed */}
        <Tabs.Screen name="advance" options={{ href: null }} />
        <Tabs.Screen name="squad"   options={{ href: null }} />
        <Tabs.Screen name="coaches" options={{ href: null }} />
        <Tabs.Screen name="inbox"   options={{ href: null }} />
      </Tabs>

      {/* Floating NEXT WK button — sits above tab bar, bottom-right */}
      <View
        style={{ position: 'absolute', bottom: 80, right: 16, zIndex: 100 }}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => { hapticPress(); handleAdvanceButton(); }}
          style={{
            backgroundColor: WK.yellow,
            borderWidth: 3,
            borderColor: WK.border,
            paddingVertical: 10,
            paddingHorizontal: 14,
            ...pixelShadow,
          }}
        >
          <PixelText size={10} color={WK.border}>{`>> NEXT WK`}</PixelText>
        </Pressable>
      </View>

      {/* Weekly tick processing overlay */}
      <WeeklyTickOverlay />

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
                <PixelText size={6} dim style={{ marginBottom: 8 }}>
                  {remainingCount} unresolved conflicts
                </PixelText>
              )}

              {playerA && playerB ? (
                <>
                  <PixelText size={7} style={{ marginBottom: 6 }}>{playerA.name}</PixelText>
                  <PixelText size={6} dim style={{ marginBottom: 6 }}>vs</PixelText>
                  <PixelText size={7} style={{ marginBottom: 12 }}>{playerB.name}</PixelText>
                </>
              ) : (
                <PixelText size={7} dim style={{ marginBottom: 12 }}>
                  One or both players no longer in squad.
                </PixelText>
              )}

              <PixelText size={6} dim style={{ marginBottom: 20, lineHeight: 12 }}>
                Their relationship has broken down completely. Release one player to resolve the conflict and advance the week.
              </PixelText>

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
