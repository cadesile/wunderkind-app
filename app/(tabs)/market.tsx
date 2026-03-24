import { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMarketStore } from '@/stores/marketStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { marketApi } from '@/api/endpoints/market';
import { generatePersonality } from '@/engine/personality';
import { generateAppearance } from '@/engine/appearance';
import { MarketCoach, MarketScout, Scout } from '@/types/market';
import { Coach } from '@/types/coach';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { penceToPounds, formatPounds } from '@/utils/currency';

type MarketTab = 'COACHES' | 'SCOUTS';

// ─── Market entity transforms ─────────────────────────────────────────────────

function marketCoachToCoach(c: MarketCoach, weekNumber: number): Coach {
  const personality = generatePersonality();
  return {
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    role: c.role,
    salary: c.salary,
    influence: c.influence,
    personality,
    appearance: generateAppearance(c.id, 'COACH', 35, personality),
    nationality: c.nationality,
    joinedWeek: weekNumber,
  };
}

function marketScoutToScout(s: MarketScout, weekNumber: number): Scout {
  return {
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    salary: s.salary,
    scoutingRange: s.scoutingRange,
    successRate: s.successRate,
    nationality: s.nationality,
    joinedWeek: weekNumber,
    appearance: generateAppearance(s.id, 'SCOUT', 35),
  };
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function StatBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorVal = Math.round((value / max) * 20);
  return (
    <View style={{
      height: 5,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth: 2,
      borderColor: WK.border,
      marginTop: 8,
    }}>
      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: traitColor(colorVal) }} />
    </View>
  );
}

// ─── Market coach card ────────────────────────────────────────────────────────

function MarketCoachCard({ coach }: { coach: MarketCoach }) {
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const addCoach = useCoachStore((s) => s.addCoach);
  const removeFromMarket = useMarketStore((s) => s.removeFromMarket);
  const [hiring, setHiring] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);

  async function handleHire() {
    setHiring(true);
    setHireError(null);
    try {
      await marketApi.assignEntity('coach', coach.id);
      const newCoach = marketCoachToCoach(coach, weekNumber);
      addCoach(newCoach);
      removeFromMarket('coach', coach.id);
    } catch {
      setHireError('Unable to hire this coach. Please try again.');
    } finally {
      setHiring(false);
    }
  }

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>
            {coach.firstName} {coach.lastName}
          </PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>
            {coach.role.toUpperCase()}
          </PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={coach.nationality} size={10} />
            <PixelText size={6} dim>{coach.nationality}</PixelText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`INF ${coach.influence}`} color="yellow" />
          <PixelText size={6} dim>£{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
        </View>
      </View>

      <StatBar value={coach.influence} max={20} />

      <View style={{ marginTop: 10 }}>
        <Button
          label={hiring ? 'HIRING...' : 'HIRE'}
          variant="teal"
          fullWidth
          onPress={handleHire}
          disabled={hiring}
        />
        {hireError && (
          <PixelText size={6} color={WK.red} style={{ marginTop: 6, textAlign: 'center' }}>
            {hireError}
          </PixelText>
        )}
      </View>
    </View>
  );
}

// ─── Market scout card ────────────────────────────────────────────────────────

const RANGE_COLOR: Record<MarketScout['scoutingRange'], string> = {
  local:         WK.tealLight,
  national:      WK.yellow,
  international: WK.orange,
};

function MarketScoutCard({ scout }: { scout: MarketScout }) {
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const addScout = useScoutStore((s) => s.addScout);
  const removeFromMarket = useMarketStore((s) => s.removeFromMarket);
  const [hiring, setHiring] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);

  async function handleHire() {
    setHiring(true);
    setHireError(null);
    try {
      await marketApi.assignEntity('scout', scout.id);
      const newScout = marketScoutToScout(scout, weekNumber);
      addScout(newScout);
      removeFromMarket('scout', scout.id);
    } catch {
      setHireError('Unable to hire this scout. Please try again.');
    } finally {
      setHiring(false);
    }
  }

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>
            {scout.firstName} {scout.lastName}
          </PixelText>
          <PixelText
            size={7}
            color={RANGE_COLOR[scout.scoutingRange]}
            style={{ marginTop: 2 }}
          >
            {scout.scoutingRange.toUpperCase()} SCOUT
          </PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={scout.nationality} size={10} />
            <PixelText size={6} dim>{scout.nationality}</PixelText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`${scout.successRate}%`} color="green" />
          <PixelText size={6} dim>£{Math.round(scout.salary / 100).toLocaleString()}/wk</PixelText>
        </View>
      </View>

      <StatBar value={scout.successRate} max={100} />

      <View style={{ marginTop: 10 }}>
        <Button
          label={hiring ? 'HIRING...' : 'HIRE'}
          variant="teal"
          fullWidth
          onPress={handleHire}
          disabled={hiring}
        />
        {hireError && (
          <PixelText size={6} color={WK.red} style={{ marginTop: 6, textAlign: 'center' }}>
            {hireError}
          </PixelText>
        )}
      </View>
    </View>
  );
}

// ─── Empty / loading state ────────────────────────────────────────────────────

function EmptyPane({ label, isLoading }: { label: string; isLoading: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <PixelText size={8} dim>{label}</PixelText>
      <PixelText size={6} dim>
        {isLoading ? 'FETCHING MARKET DATA...' : 'PULL DOWN TO REFRESH'}
      </PixelText>
    </View>
  );
}

// ─── Panes ────────────────────────────────────────────────────────────────────

function CoachesPane({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const { coaches, isLoading } = useMarketStore();

  if (coaches.length === 0) {
    return <EmptyPane label="NO COACHES AVAILABLE" isLoading={isLoading} />;
  }

  return (
    <FlatList
      data={coaches}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <MarketCoachCard coach={item} />}
      contentContainerStyle={{ padding: 10 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WK.yellow} />
      }
    />
  );
}

function ScoutsPane({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const { marketScouts, isLoading } = useMarketStore();

  if (marketScouts.length === 0) {
    return <EmptyPane label="NO SCOUTS AVAILABLE" isLoading={isLoading} />;
  }

  return (
    <FlatList
      data={marketScouts}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <MarketScoutCard scout={item} />}
      contentContainerStyle={{ padding: 10 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WK.yellow} />
      }
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MarketScreen() {
  const [activeTab, setActiveTab] = useState<MarketTab>('COACHES');
  const [refreshing, setRefreshing] = useState(false);
  const { setMarketData } = useMarketStore();
  const academy = useAcademyStore((s) => s.academy);

  // balance is stored in pence — convert to whole pounds for display
  const balance = penceToPounds(
    typeof academy.balance === 'number' && !isNaN(academy.balance)
      ? academy.balance
      : academy.totalCareerEarnings * 100,
  );

  // Pull-to-refresh always fetches fresh data, bypassing the store's 5-min cache
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await marketApi.getMarketData();
      setMarketData(data);
    } catch {
      // Silent — stale data remains displayed
    } finally {
      setRefreshing(false);
    }
  }, [setMarketData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />

      {/* Tab navigation */}
      <PixelTopTabBar
        tabs={['COACHES', 'SCOUTS']}
        active={activeTab}
        onChange={(t) => setActiveTab(t as MarketTab)}
      />

      {/* Title section */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <PixelText size={10} upper>Market</PixelText>
        <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
      </View>

      {/* Entity count strip */}
      {/* <View style={{ flexDirection: 'row', marginHorizontal: 10, marginTop: 10, gap: 10 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>PLAYERS</PixelText>
          <PixelText size={14} color={WK.tealLight} style={{ marginTop: 4 }}>{players.length}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>COACHES</PixelText>
          <PixelText size={14} color={WK.yellow} style={{ marginTop: 4 }}>{coaches.length}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>SCOUTS</PixelText>
          <PixelText size={14} color={WK.orange} style={{ marginTop: 4 }}>{marketScouts.length}</PixelText>
        </Card>
      </View> */}

      {/* Pane content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'COACHES' && (
          <CoachesPane onRefresh={handleRefresh} refreshing={refreshing} />
        )}
        {activeTab === 'SCOUTS' && (
          <ScoutsPane onRefresh={handleRefresh} refreshing={refreshing} />
        )}
      </View>
    </SafeAreaView>
  );
}
