import { useState } from 'react';
import { View, ScrollView, Pressable, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { PixelText } from '@/components/ui/PixelText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PersonalityRadar } from '@/components/radar/PersonalityRadar';
import { WK, pixelShadow } from '@/constants/theme';
import { TraitName } from '@/types/player';
import { getGameDate, computePlayerAge } from '@/utils/gameDate';

const TRAIT_LABELS: Record<TraitName, string> = {
  determination:   'DETERMINATION',
  professionalism: 'PROFESSIONALISM',
  ambition:        'AMBITION',
  loyalty:         'LOYALTY',
  adaptability:    'ADAPTABILITY',
  pressure:        'PRESSURE',
  temperament:     'TEMPERAMENT',
  consistency:     'CONSISTENCY',
};

/** Colour for ability values: yellow ≥70% of 20 (14+), teal 40–70% (8–13), red <40% (<8) */
function abilityColor(value: number): string {
  if (value >= 14) return WK.yellow;
  if (value >= 8)  return WK.tealLight;
  return WK.red;
}

function AbilityBar({ name, value }: { name: TraitName; value: number }) {
  const pct = (value / 20) * 100;
  const color = abilityColor(value);

  return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: WK.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <PixelText size={9} dim>{TRAIT_LABELS[name]}</PixelText>
        <PixelText size={9} color={color}>{value}/20</PixelText>
      </View>
      <View style={{
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderWidth: 2,
        borderColor: WK.border,
      }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const player = useSquadStore((s) => s.players.find((p) => p.id === id));
  const releasePlayer = useSquadStore((s) => s.releasePlayer);
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const analyticsUnlocked = useFacilityStore((s) => s.analyticsUnlocked());

  // Contract metrics
  const weeksRemaining = player
    ? Math.max(0, (player.enrollmentEndWeek ?? 0) - weekNumber)
    : 0;
  const contractStatus =
    weeksRemaining >= 52 ? 'ACTIVE' :
    weeksRemaining >= 12 ? 'EXPIRING' :
    weeksRemaining > 0   ? 'CRITICAL' : 'NONE';
  const weeklyFee = Math.round((player?.wage ?? 0) / 100); // pence → pounds

  const [matrixExpanded, setMatrixExpanded] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);

  const gameDate = getGameDate(weekNumber);
  const displayAge = player?.dateOfBirth
    ? computePlayerAge(player.dateOfBirth, gameDate)
    : (player?.age ?? '?');

  // Radar fills available width minus card padding (16px card padding each side)
  const radarSize = screenWidth - 32;

  if (!player) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} dim>PLAYER NOT FOUND</PixelText>
      </SafeAreaView>
    );
  }

  const traits = Object.entries(player.personality) as [TraitName, number][];

  function handleRelease() {
    Alert.alert(
      'Release Player?',
      `Release ${player.name} back to the market pool? No transfer fee is received.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            const result = await releasePlayer(player.id);
            if (result.success) {
              Alert.alert(
                'Player Released',
                `${result.playerName} has been returned to the market pool.`,
                [{ text: 'OK', onPress: () => router.back() }],
              );
            } else {
              Alert.alert('Error', result.error ?? 'Failed to release player.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      {/* Header */}
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
        <PixelText size={9} upper style={{ flex: 1 }} numberOfLines={1}>{player.name}</PixelText>
        <Badge label={`OVR ${player.overallRating}`} color="yellow" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>

        {/* Player bio card */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          ...pixelShadow,
        }}>
          <Avatar appearance={player.appearance} role="PLAYER" size={64} />
          <View style={{ flex: 1 }}>
            <PixelText size={10} upper style={{ marginBottom: 4 }} numberOfLines={2}>{player.name}</PixelText>
            <PixelText size={7} color={WK.tealLight}>{player.position} · AGE {displayAge}</PixelText>
            <PixelText size={7} dim style={{ marginTop: 2 }}>{player.nationality}</PixelText>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <View>
                <PixelText size={6} dim>OVR</PixelText>
                <PixelText size={14} color={WK.tealLight}>{player.overallRating}</PixelText>
              </View>
              <View>
                <PixelText size={6} dim>POT</PixelText>
                {analyticsUnlocked
                  ? <PixelText size={10} color={WK.yellow}>{'★'.repeat(player.potential)}</PixelText>
                  : <PixelText size={8} color={WK.dim}>?????</PixelText>
                }
              </View>
            </View>
          </View>
        </View>

        {/* Ability Matrix radar — collapsible */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          ...pixelShadow,
        }}>
          <Pressable
            onPress={() => setMatrixExpanded((v) => !v)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 14,
            }}
          >
            <PixelText size={8} upper>Ability Matrix</PixelText>
            <PixelText size={8} color={WK.tealLight}>{matrixExpanded ? '▼' : '▶'}</PixelText>
          </Pressable>
          {matrixExpanded && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, alignItems: 'center' }}>
              <PersonalityRadar personality={player.personality} size={radarSize - 28} />
            </View>
          )}
        </View>

        {/* Ability Breakdown — collapsible */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          ...pixelShadow,
        }}>
          <Pressable
            onPress={() => setBreakdownExpanded((v) => !v)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 14,
            }}
          >
            <PixelText size={8} upper>Ability Breakdown</PixelText>
            <PixelText size={8} color={WK.tealLight}>{breakdownExpanded ? '▼' : '▶'}</PixelText>
          </Pressable>
          {breakdownExpanded && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
              {traits.map(([name, value]) => (
                <AbilityBar key={name} name={name} value={value} />
              ))}
            </View>
          )}
        </View>

        {/* Contract Info */}
        {player.enrollmentEndWeek !== undefined && (
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: contractStatus === 'CRITICAL' ? WK.red : contractStatus === 'EXPIRING' ? WK.orange : WK.yellow,
            padding: 14,
            ...pixelShadow,
          }}>
            <PixelText size={8} upper style={{ marginBottom: 10 }}>Enrollment Contract</PixelText>

            {/* Status badge row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor:
                  contractStatus === 'ACTIVE'   ? WK.green :
                  contractStatus === 'EXPIRING' ? WK.orange : WK.red,
              }}>
                <PixelText size={7} color={WK.text}>
                  {contractStatus === 'ACTIVE'   ? 'ACTIVE' :
                   contractStatus === 'EXPIRING' ? 'EXPIRING' : 'CRITICAL'}
                </PixelText>
              </View>
              <PixelText size={7} dim>{weeksRemaining}w remaining</PixelText>
            </View>

            <View style={{ borderTopWidth: 2, borderTopColor: WK.border, paddingTop: 10, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <PixelText size={7} dim>WEEKLY FEE</PixelText>
                <PixelText size={7} color={WK.tealLight}>£{weeklyFee}/wk</PixelText>
              </View>
              {player.morale !== undefined && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <PixelText size={7} dim>MORALE</PixelText>
                  <PixelText size={7} color={player.morale >= 70 ? WK.green : player.morale >= 40 ? WK.orange : WK.red}>
                    {player.morale}/100
                  </PixelText>
                </View>
              )}
              {(player.extensionCount ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <PixelText size={7} dim>EXTENSIONS</PixelText>
                  <PixelText size={7} color={WK.dim}>{player.extensionCount}</PixelText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Release player */}
        <View style={{
          borderWidth: 3,
          borderColor: WK.red,
          padding: 14,
          marginTop: 6,
        }}>
          <PixelText size={7} color={WK.red} style={{ marginBottom: 8 }}>RELEASE PLAYER</PixelText>
          <PixelText size={6} dim style={{ marginBottom: 12 }}>
            Return {player.name} to the market pool. No transfer fee received.
          </PixelText>
          <Pressable
            onPress={handleRelease}
            style={{
              backgroundColor: WK.red,
              borderWidth: 2,
              borderColor: '#8b0000',
              padding: 10,
              alignItems: 'center',
            }}
          >
            <PixelText size={7} color={WK.text}>RELEASE TO POOL</PixelText>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
