import { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { WK, pixelShadow, traitColor } from '@/constants/theme';
import { useMarketStore } from '@/stores/marketStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useCoachStore } from '@/stores/coachStore';
import { useAcademyStore } from '@/stores/academyStore';
import { assignScoutToPlayer, removeScoutAssignment } from '@/engine/ScoutingService';
import { getCoachPerception, getHeadCoach } from '@/engine/CoachPerception';
import { formatCurrencyWhole } from '@/utils/currency';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import { MarketPlayer } from '@/types/market';
import { moraleEmoji } from '@/utils/morale';

function StatBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border, marginTop: 6 }}>
      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: traitColor(Math.round((value / 100) * 20)) }} />
    </View>
  );
}

function PlayerCard({ player }: { player: MarketPlayer }) {
  const scouts = useScoutStore((s) => s.scouts);
  const coaches = useCoachStore((s) => s.coaches);
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const signPlayer = useMarketStore((s) => s.signPlayer);
  const rejectPlayer = useMarketStore((s) => s.rejectPlayer);
  const [showScoutPicker, setShowScoutPicker] = useState(false);
  const [signing, setSigning] = useState(false);

  const status = player.scoutingStatus ?? 'hidden';
  const isRevealed = status === 'revealed';
  const isScouting = status === 'scouting';

  const displayAbility = isRevealed ? (player.perceivedAbility ?? player.currentAbility) : null;
  const offer = player.currentOffer ?? (player.marketValue ?? player.currentAbility * 1000);

  const headCoach = getHeadCoach(coaches);
  const opinion = isRevealed && headCoach && player.marketValue
    ? (() => { try { return getCoachPerception(player, headCoach); } catch { return null; } })()
    : null;

  const gameDate = getGameDate(weekNumber);
  const age = player.dateOfBirth ? computePlayerAge(player.dateOfBirth, gameDate) : '?';

  const availableScouts = scouts.filter(
    (s) => (s.morale ?? 70) >= 40 && (s.assignedPlayerIds ?? []).length < 5 && s.id !== player.assignedScoutId,
  );

  const statusBadge =
    status === 'hidden' ? { label: 'UNSCOUTED', color: 'dim' as const } :
    status === 'scouting' ? { label: `SCOUTING ${player.scoutingProgress ?? 0}/2`, color: 'yellow' as const } :
    { label: 'SCOUTED', color: 'green' as const };

  async function handleSign() {
    setSigning(true);
    try {
      await require('@/api/endpoints/market').marketApi.assignEntity('player', player.id);
      signPlayer(player.id);
      Alert.alert('Signed!', `${player.firstName} ${player.lastName} has joined the academy.`);
    } catch {
      Alert.alert('Error', 'Failed to sign player. Try again.');
    } finally {
      setSigning(false);
    }
  }

  function handleReject() {
    rejectPlayer(player.id);
  }

  const verdictColorMap = { green: WK.green, white: WK.text, red: WK.red };

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: isRevealed ? WK.tealLight : WK.border,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{player.firstName} {player.lastName}</PixelText>
          <PixelText size={6} dim style={{ marginTop: 3 }}>AGE {age} · {player.nationality} · {player.position}</PixelText>
        </View>
        <Badge label={statusBadge.label} color={statusBadge.color} />
      </View>

      {/* Ability */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <PixelText size={6} dim>ABILITY</PixelText>
        {isRevealed && displayAbility !== null ? (
          <Badge label={`OVR ${displayAbility}`} color="yellow" />
        ) : (
          <Badge label="OVR ??" color="dim" />
        )}
      </View>
      {isRevealed && displayAbility !== null ? (
        <StatBar value={displayAbility} />
      ) : (
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border, marginTop: 6 }}>
          <View style={{ height: '100%', width: '25%', backgroundColor: WK.dim }} />
        </View>
      )}

      {/* Offer */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <PixelText size={6} dim>ASKING PRICE</PixelText>
        <PixelText size={7} color={WK.orange}>
          {isRevealed ? formatCurrencyWhole(offer) : '??'}
        </PixelText>
      </View>

      {/* Coach opinion */}
      {opinion && (
        <View style={{
          marginTop: 8,
          padding: 8,
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderWidth: 2,
          borderColor: WK.border,
        }}>
          <PixelText size={6} color={verdictColorMap[opinion.verdictColor]}>◆ {opinion.coachNote}</PixelText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <PixelText size={6} dim>ESTIMATE</PixelText>
            <PixelText size={6} color={WK.tealLight}>{formatCurrencyWhole(opinion.perceivedValue)}</PixelText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <PixelText size={6} dim>DIFF</PixelText>
            <PixelText size={6} color={opinion.verdictColor === 'green' ? WK.green : opinion.verdictColor === 'red' ? WK.red : WK.text}>
              {opinion.deltaPercent >= 0 ? '+' : ''}{opinion.deltaPercent.toFixed(1)}%
            </PixelText>
          </View>
        </View>
      )}

      {/* Scout assignment (if not yet revealed) */}
      {!isRevealed && (
        <View style={{ marginTop: 10 }}>
          {isScouting && player.assignedScoutId ? (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 8,
              backgroundColor: WK.tealMid,
              borderWidth: 2,
              borderColor: WK.border,
            }}>
              <PixelText size={6} color={WK.yellow}>SCOUT ASSIGNED {player.scoutingProgress ?? 0}/2</PixelText>
              <Pressable onPress={() => removeScoutAssignment(player.assignedScoutId!, player.id)} hitSlop={8}>
                <PixelText size={6} color={WK.red}>REMOVE</PixelText>
              </Pressable>
            </View>
          ) : (
            <Button
              label={showScoutPicker ? 'CANCEL' : 'ASSIGN SCOUT'}
              variant="teal"
              fullWidth
              onPress={() => setShowScoutPicker((v) => !v)}
              disabled={availableScouts.length === 0}
            />
          )}
          {availableScouts.length === 0 && !isScouting && (
            <PixelText size={6} dim style={{ marginTop: 4, textAlign: 'center' }}>NO SCOUTS AVAILABLE</PixelText>
          )}
          {showScoutPicker && (
            <View style={{ marginTop: 8, gap: 6 }}>
              {availableScouts.map((scout) => (
                <Pressable
                  key={scout.id}
                  onPress={() => {
                    assignScoutToPlayer(scout.id, player.id);
                    setShowScoutPicker(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 8,
                    backgroundColor: WK.tealMid,
                    borderWidth: 2,
                    borderColor: WK.border,
                  }}
                >
                  <PixelText size={6}>{scout.name}</PixelText>
                  <PixelText size={6} dim>{scout.successRate}% · {(scout.assignedPlayerIds ?? []).length}/5</PixelText>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Sign / Pass buttons (revealed only) */}
      {isRevealed && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 2 }}>
            <Button
              label={signing ? 'SIGNING...' : 'SIGN PLAYER'}
              variant="green"
              fullWidth
              onPress={handleSign}
              disabled={signing}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="PASS" variant="teal" fullWidth onPress={handleReject} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function MarketPlayersScreen() {
  const router = useRouter();
  const players = useMarketStore((s) => s.players);
  const isLoading = useMarketStore((s) => s.isLoading);
  const fetchMarketData = useMarketStore((s) => s.fetchMarketData);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMarketData().catch(() => {});
    setRefreshing(false);
  }, [fetchMarketData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={18} color={WK.text} />
        </Pressable>
        <PixelText size={9} upper style={{ flex: 1 }}>Player Market</PixelText>
        <PixelText size={7} color={WK.yellow}>{players.length} AVAILABLE</PixelText>
      </View>

      {players.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <PixelText size={8} color={WK.yellow}>{isLoading ? 'LOADING...' : 'NO PLAYERS'}</PixelText>
          <PixelText size={6} dim>PULL DOWN TO REFRESH</PixelText>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PlayerCard player={item} />}
          contentContainerStyle={{ padding: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={WK.yellow} />
          }
        />
      )}
    </SafeAreaView>
  );
}
