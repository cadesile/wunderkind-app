import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { PixelText } from '@/components/ui/PixelText';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PersonalityRadar } from '@/components/radar/PersonalityRadar';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
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

function TraitBar({ name, value }: { name: TraitName; value: number }) {
  const pct = (value / 20) * 100;
  const color = traitColor(value);

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <PixelText size={6} dim>{TRAIT_LABELS[name]}</PixelText>
        <PixelText size={6} color={color}>{value}/20</PixelText>
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
  const player = useSquadStore((s) => s.players.find((p) => p.id === id));
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const analyticsUnlocked = useFacilityStore((s) => s.analyticsUnlocked());

  // Live age: floor((gameDate − DOB) / 365.25), fallback to static age
  const gameDate = getGameDate(weekNumber);
  const displayAge = player?.dateOfBirth
    ? computePlayerAge(player.dateOfBirth, gameDate)
    : (player?.age ?? '?');

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
          <PixelAvatar size={64} />
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

        {/* Personality radar */}
        <Card>
          <PixelText size={8} upper style={{ marginBottom: 10 }}>Personality Matrix</PixelText>
          <PersonalityRadar personality={player.personality} />
        </Card>

        {/* Individual trait bars */}
        <Card>
          <PixelText size={8} upper style={{ marginBottom: 12 }}>Trait Breakdown</PixelText>
          {traits.map(([name, value]) => (
            <TraitBar key={name} name={name} value={value} />
          ))}
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}
