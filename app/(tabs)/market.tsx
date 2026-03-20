import { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
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
import { getPlayerAskingPrice } from '@/utils/currency';

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
  const scouts = useScoutStore((s) => s.scouts);
  const coaches = useCoachStore((s) => s.coaches);
  const [signing, setSigning] = useState(false);
  const [recruitError, setRecruitError] = useState<string | null>(null);
  const [showScoutPicker, setShowScoutPicker] = useState(false);

  const status = player.scoutingStatus ?? 'hidden';
  const isRevealed = status === 'revealed';
  const isScouting = status === 'scouting';
  const displayAbility = isRevealed ? (player.perceivedAbility ?? player.currentAbility) : null;
  const weeklyWage = isRevealed ? (player.perceivedAbility ?? player.currentAbility) : null;
  const offer = getPlayerAskingPrice(player);

  // Get head coach opinion (highest influence coach)
  const headCoach = coaches.length > 0
    ? coaches.reduce((best, c) => c.influence > best.influence ? c : best, coaches[0])
    : null;

  const gameDate = getGameDate(weekNumber);
  const age = player.dateOfBirth ? computePlayerAge(player.dateOfBirth, gameDate) : '?';

  async function handleRecruit() {
    setSigning(true);
    setRecruitError(null);
    try {
      await marketApi.assignEntity('player', player.id);
      const newPlayer = marketPlayerToPlayer(player, weekNumber);
      newPlayer.relationships = [];
      newPlayer.morale = 70;
      addPlayer(newPlayer);
      removeFromMarket('player', player.id);
    } catch {
      setRecruitError('Unable to sign this player. Please try again.');
    } finally {
      setSigning(false);
    }
  }

  // Status badge info
  const statusBadge =
    status === 'hidden' ? { label: 'UNSCOUTED', color: WK.dim } :
    status === 'scouting' ? { label: `SCOUTING ${player.scoutingProgress ?? 0}/2`, color: WK.yellow } :
    { label: 'SCOUTED', color: WK.green };

  // Available scouts for assignment (morale >= 40, not at full capacity)
  const availableScouts = scouts.filter(
    (s) => (s.morale ?? 70) >= 40 && (s.assignedPlayerIds ?? []).length < 5
  );

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: isRevealed ? WK.tealLight : WK.border,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>
            {player.firstName} {player.lastName}
          </PixelText>
          <PixelText size={6} dim style={{ marginTop: 4 }}>
            AGE {age} · {player.nationality}
          </PixelText>
        </View>
        {/* Status badge */}
        <View style={{
          backgroundColor: statusBadge.color + '33',
          borderWidth: 2,
          borderColor: statusBadge.color,
          paddingHorizontal: 6,
          paddingVertical: 3,
          marginLeft: 8,
        }}>
          <PixelText size={6} color={statusBadge.color}>{statusBadge.label}</PixelText>
        </View>
      </View>

      {/* Position · ability row */}
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
          {isRevealed && weeklyWage !== null && (
            <PixelText size={7} color={WK.yellow}>£{weeklyWage}/wk</PixelText>
          )}
        </View>
        {isRevealed && displayAbility !== null ? (
          <Badge label={`OVR ${displayAbility}`} color="yellow" />
        ) : (
          <Badge label="OVR ??" color="dim" />
        )}
      </View>

      {/* Ability bar */}
      {isRevealed && displayAbility !== null ? (
        <StatBar value={displayAbility} max={100} />
      ) : (
        <View style={{
          height: 5,
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderWidth: 2,
          borderColor: WK.border,
          marginTop: 8,
        }}>
          <View style={{ height: '100%', width: '33%', backgroundColor: WK.dim }} />
        </View>
      )}

      {/* Offer price */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <PixelText size={6} dim>ASKING PRICE</PixelText>
        <PixelText size={7} color={WK.orange}>
          {isRevealed ? `£${offer.toLocaleString()}` : '??'}
        </PixelText>
      </View>

      {/* Coach opinion (only when revealed and coach available) */}
      {isRevealed && headCoach && (() => {
        const { getCoachOpinion } = require('@/engine/CoachValuation');
        const opinion = getCoachOpinion(player, headCoach);
        const opinionColor =
          opinion.verdict === 'great_deal' ? WK.yellow :
          opinion.verdict === 'poor_deal' ? WK.red : WK.tealLight;
        return (
          <PixelText size={6} color={opinionColor} style={{ marginTop: 6 }}>
            {'\u25C6'} {opinion.note}
          </PixelText>
        );
      })()}

      {/* Scout picker (hidden/scouting only) */}
      {!isRevealed && (
        <View style={{ marginTop: 10 }}>
          <Button
            label={showScoutPicker ? 'CANCEL' : (isScouting ? 'REASSIGN SCOUT' : 'ASSIGN SCOUT')}
            variant="teal"
            fullWidth
            onPress={() => setShowScoutPicker((v) => !v)}
            disabled={availableScouts.length === 0}
          />
          {availableScouts.length === 0 && !showScoutPicker && (
            <PixelText size={6} dim style={{ marginTop: 4, textAlign: 'center' }}>
              NO SCOUTS AVAILABLE
            </PixelText>
          )}
          {showScoutPicker && (
            <View style={{ marginTop: 8, gap: 6 }}>
              {availableScouts.map((scout) => (
                <View key={scout.id} style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: WK.tealMid,
                  padding: 8,
                  borderWidth: 2,
                  borderColor: WK.border,
                }}>
                  <View>
                    <PixelText size={6}>{scout.name}</PixelText>
                    <PixelText size={6} dim>
                      {scout.successRate}% · {(scout.assignedPlayerIds ?? []).length}/5
                    </PixelText>
                  </View>
                  <Button
                    label="ASSIGN"
                    variant="yellow"
                    onPress={() => {
                      const { assignScoutToPlayer } = require('@/engine/ScoutingService');
                      assignScoutToPlayer(scout.id, player.id);
                      setShowScoutPicker(false);
                    }}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recruit button (revealed only) */}
      {isRevealed && (
        <View style={{ marginTop: 10 }}>
          <Button
            label={signing ? 'SIGNING...' : 'RECRUIT'}
            variant="green"
            fullWidth
            onPress={handleRecruit}
            disabled={signing}
          />
          {recruitError && (
            <PixelText size={6} color={WK.red} style={{ marginTop: 6, textAlign: 'center' }}>
              {recruitError}
            </PixelText>
          )}
        </View>
      )}
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
  const academy = useAcademyStore((s) => s.academy);

  const balance = (typeof academy.balance === 'number' && !isNaN(academy.balance))
    ? academy.balance
    : academy.totalCareerEarnings;

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
        tabs={['PLAYERS', 'COACHES', 'SCOUTS']}
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
        <PixelText size={7} color={WK.yellow}>£{balance.toLocaleString()}</PixelText>
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
