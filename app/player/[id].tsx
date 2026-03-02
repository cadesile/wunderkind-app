import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
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
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const analyticsUnlocked = useFacilityStore((s) => s.analyticsUnlocked());

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

        {/* Ability Matrix radar — full width */}
        <Card style={{ alignItems: 'center' }}>
          <PixelText size={8} upper style={{ marginBottom: 10, alignSelf: 'flex-start' }}>Ability Matrix</PixelText>
          <PersonalityRadar personality={player.personality} size={radarSize} />
        </Card>

        {/* Ability Breakdown */}
        <Card>
          <PixelText size={8} upper style={{ marginBottom: 4 }}>Ability Breakdown</PixelText>
          {traits.map(([name, value]) => (
            <AbilityBar key={name} name={name} value={value} />
          ))}
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}
