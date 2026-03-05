import { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMarketStore } from '@/stores/marketStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { marketApi } from '@/api/endpoints/market';
import { generatePersonality } from '@/engine/personality';
import { generateAppearance } from '@/engine/appearance';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import { MarketPlayer, MarketCoach, MarketScout, Scout } from '@/types/market';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { WK, traitColor, pixelShadow } from '@/constants/theme';

type MarketTab = 'PLAYERS' | 'COACHES' | 'SCOUTS';

// ─── Market entity transforms ─────────────────────────────────────────────────

function marketPlayerToPlayer(p: MarketPlayer, weekNumber: number): Player {
  const personality = generatePersonality();
  const gameDate = getGameDate(weekNumber);
  const ageRaw = p.dateOfBirth ? computePlayerAge(p.dateOfBirth, gameDate) : 17;
  const age = typeof ageRaw === 'number' ? ageRaw : 17;

  return {
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    dateOfBirth: p.dateOfBirth,
    age,
    position: p.position,
    nationality: p.nationality,
    overallRating: p.currentAbility,
    potential: p.potential,
    wage: p.currentAbility * 100,
    personality,
    appearance: generateAppearance(p.id, 'PLAYER', age, personality),
    guardianId: null,
    agentId: p.agent?.id ?? null,
    joinedWeek: weekNumber,
    isActive: true,
  };
}

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

// ─── Market player card ───────────────────────────────────────────────────────

function MarketPlayerCard({ player }: { player: MarketPlayer }) {
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const addPlayer = useSquadStore((s) => s.addPlayer);
  const removeFromMarket = useMarketStore((s) => s.removeFromMarket);
  const [signing, setSigning] = useState(false);

  const gameDate = getGameDate(weekNumber);
  const age = player.dateOfBirth ? computePlayerAge(player.dateOfBirth, gameDate) : '?';
  // wage = currentAbility × 100 pence ÷ 100 = currentAbility pounds
  const weeklyWage = player.currentAbility;

  async function handleRecruit() {
    setSigning(true);
    try {
      await marketApi.assignEntity('player', player.id);
      const newPlayer = marketPlayerToPlayer(player, weekNumber);
      addPlayer(newPlayer);
      removeFromMarket('player', player.id);
      Alert.alert('Recruited!', `${player.firstName} ${player.lastName} has joined the academy.`);
    } catch {
      Alert.alert('Recruitment Failed', 'Unable to sign this player. Please try again.');
    } finally {
      setSigning(false);
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
      <PixelText size={8} upper numberOfLines={1}>
        {player.firstName} {player.lastName}
      </PixelText>
      <PixelText size={6} dim style={{ marginTop: 4 }}>
        AGE {age} · {player.nationality}
      </PixelText>

      {/* Position · wage · OVR row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            backgroundColor: WK.tealMid,
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderWidth: 2,
            borderColor: WK.border,
          }}>
            <PixelText size={7} color={WK.tealLight}>{player.position}</PixelText>
          </View>
          <PixelText size={7} color={WK.yellow}>£{weeklyWage}/wk</PixelText>
        </View>
        <Badge label={`OVR ${player.currentAbility}`} color="yellow" />
      </View>

      <StatBar value={player.currentAbility} max={100} />

      <View style={{ marginTop: 10 }}>
        <Button
          label={signing ? 'SIGNING...' : 'RECRUIT'}
          variant="green"
          fullWidth
          onPress={handleRecruit}
          disabled={signing}
        />
      </View>
    </View>
  );
}

// ─── Market coach card ────────────────────────────────────────────────────────

function MarketCoachCard({ coach }: { coach: MarketCoach }) {
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const addCoach = useCoachStore((s) => s.addCoach);
  const removeFromMarket = useMarketStore((s) => s.removeFromMarket);
  const [hiring, setHiring] = useState(false);

  async function handleHire() {
    setHiring(true);
    try {
      await marketApi.assignEntity('coach', coach.id);
      const newCoach = marketCoachToCoach(coach, weekNumber);
      addCoach(newCoach);
      removeFromMarket('coach', coach.id);
      Alert.alert(
        'Hired!',
        `${coach.firstName} ${coach.lastName} has joined the coaching staff.`,
      );
    } catch {
      Alert.alert('Hire Failed', 'Unable to hire this coach. Please try again.');
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
          <PixelText size={6} dim style={{ marginTop: 2 }}>{coach.nationality}</PixelText>
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
          variant="yellow"
          fullWidth
          onPress={handleHire}
          disabled={hiring}
        />
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

  async function handleHire() {
    setHiring(true);
    try {
      await marketApi.assignEntity('scout', scout.id);
      const newScout = marketScoutToScout(scout, weekNumber);
      addScout(newScout);
      removeFromMarket('scout', scout.id);
      Alert.alert(
        'Hired!',
        `${scout.firstName} ${scout.lastName} is now scouting for the academy.`,
      );
    } catch {
      Alert.alert('Hire Failed', 'Unable to hire this scout. Please try again.');
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
          <PixelText size={6} dim style={{ marginTop: 2 }}>{scout.nationality}</PixelText>
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

function PlayersPane({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const { players, isLoading } = useMarketStore();

  if (players.length === 0) {
    return <EmptyPane label="NO PLAYERS AVAILABLE" isLoading={isLoading} />;
  }

  return (
    <FlatList
      data={players}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <MarketPlayerCard player={item} />}
      contentContainerStyle={{ padding: 10 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WK.yellow} />
      }
    />
  );
}

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
  const [activeTab, setActiveTab] = useState<MarketTab>('PLAYERS');
  const [refreshing, setRefreshing] = useState(false);
  const { players, coaches, marketScouts, setMarketData } = useMarketStore();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      {/* Entity count strip */}
      <View style={{ flexDirection: 'row', marginHorizontal: 10, marginTop: 10, gap: 10 }}>
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
      </View>

      {/* Sub-nav */}
      <PixelTopTabBar
        tabs={['PLAYERS', 'COACHES', 'SCOUTS']}
        active={activeTab}
        onChange={(t) => setActiveTab(t as MarketTab)}
      />

      {/* Pane content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'PLAYERS' && (
          <PlayersPane onRefresh={handleRefresh} refreshing={refreshing} />
        )}
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
