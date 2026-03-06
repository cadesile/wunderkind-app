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
import { PitchBackground } from '@/components/ui/PitchBackground';
import { AttributesRadar } from '@/components/radar/AttributesRadar';
import { WK, pixelShadow } from '@/constants/theme';
import { AttributeName } from '@/types/player';
import { getGameDate, computePlayerAge } from '@/utils/gameDate';
import { moraleEmoji } from '@/utils/morale';
import { ScoutReportCard } from '@/components/ScoutReportCard';

// ─── Attribute bars (football skills) ────────────────────────────────────────

const ATTR_LABELS: Record<AttributeName, string> = {
  pace:      'PACE',
  technical: 'TECHNICAL',
  vision:    'VISION',
  power:     'POWER',
  stamina:   'STAMINA',
  heart:     'HEART',
};

/** Color for 0–100 scale: ≥70 yellow, ≥40 teal, <40 red */
function attrColor(value: number): string {
  if (value >= 70) return WK.yellow;
  if (value >= 40) return WK.tealLight;
  return WK.red;
}

function AttributeBar({ name, value }: { name: AttributeName; value: number }) {
  const pct = value;
  const color = attrColor(value);

  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <PixelText size={9} dim>{ATTR_LABELS[name]}</PixelText>
        <PixelText size={9} color={color}>{Math.round(value)}</PixelText>
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

  const [attrsExpanded, setAttrsExpanded] = useState(false);
  const [matrixExpanded, setMatrixExpanded] = useState(false);

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

  const attrEntries = player.attributes
    ? (Object.entries(player.attributes) as [AttributeName, number][])
    : null;

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <PixelText size={10} upper style={{ flex: 1 }} numberOfLines={2}>{player.name}</PixelText>
              <PixelText size={14}>{moraleEmoji(player.morale ?? 70)}</PixelText>
            </View>
            <PixelText size={7} color={WK.tealLight}>{player.position} · AGE {displayAge}</PixelText>
            <PixelText size={7} dim style={{ marginTop: 2 }}>{player.nationality}</PixelText>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <View>
                <PixelText size={6} dim>OVR</PixelText>
                <PixelText size={14} color={WK.tealLight}>{player.overallRating}</PixelText>
              </View>
            </View>
          </View>
        </View>

        {/* Football Attributes — collapsible */}
        {attrEntries && (
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            ...pixelShadow,
          }}>
            <Pressable
              onPress={() => setAttrsExpanded((v) => !v)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 14,
              }}
            >
              <PixelText size={8} upper>Attributes</PixelText>
              <PixelText size={8} color={WK.tealLight}>{attrsExpanded ? '▼' : '▶'}</PixelText>
            </Pressable>
            {attrsExpanded && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
                {attrEntries.map(([name, value]) => (
                  <AttributeBar key={name} name={name} value={value} />
                ))}
              </View>
            )}
          </View>
        )}

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
          {matrixExpanded && player.attributes && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, alignItems: 'center' }}>
              <AttributesRadar attributes={player.attributes} size={radarSize - 28} />
            </View>
          )}
          {matrixExpanded && !player.attributes && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <PixelText size={7} dim>No attribute data yet.</PixelText>
            </View>
          )}
        </View>

        {/* Scout Report — personality archetype (no raw numbers) */}
        <ScoutReportCard player={player} />

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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <PixelText size={7} dim>MORALE</PixelText>
                  <PixelText size={16}>{moraleEmoji(player.morale)}</PixelText>
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
