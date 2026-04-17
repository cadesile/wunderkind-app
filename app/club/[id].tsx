import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { useWorldStore } from '@/stores/worldStore';
import type { WorldPlayer } from '@/types/world';

function calcOvr(p: WorldPlayer): number {
  return Math.round((p.pace + p.technical + p.vision + p.power + p.stamina + p.heart) / 6);
}

const POS_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const club    = useWorldStore((s) => s.clubs[id]);
  const isInitialized = useWorldStore((s) => s.isInitialized);

  if (!club) {
    // isInitialized true but clubs still empty = loadClubs() still running
    const loading = isInitialized && Object.keys(useWorldStore.getState().clubs).length === 0;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} color={WK.dim}>{loading ? 'LOADING...' : 'CLUB NOT FOUND'}</PixelText>
      </SafeAreaView>
    );
  }

  const players = [...club.players].sort((a, b) => {
    const posDiff = (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9);
    if (posDiff !== 0) return posDiff;
    return calcOvr(b) - calcOvr(a);
  });

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
        <View style={{
          backgroundColor: WK.tealDark,
          borderWidth: 2,
          borderColor: WK.border,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}>
          <VT323Text size={14} color={WK.yellow}>T{club.tier}</VT323Text>
        </View>
        <PixelText size={9} style={{ flex: 1 }} numberOfLines={1}>{club.name}</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: 40 }}>

        {/* Club info card */}
        <View style={[{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }, pixelShadow]}>
          {/* Colour swatches */}
          <View style={{ width: 20, height: 20, backgroundColor: club.primaryColor, borderWidth: 2, borderColor: WK.border }} />
          <View style={{ width: 20, height: 20, backgroundColor: club.secondaryColor, borderWidth: 2, borderColor: WK.border }} />
          <View style={{ flex: 1 }}>
            {club.stadiumName ? (
              <BodyText size={12} dim numberOfLines={1}>{club.stadiumName}</BodyText>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <PixelText size={6} dim>REP</PixelText>
            <VT323Text size={22} color={WK.yellow}>{club.reputation}</VT323Text>
          </View>
        </View>

        {/* Players roster card */}
        <View style={[{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
        }, pixelShadow]}>
          {/* Column headers */}
          <View style={{
            flexDirection: 'row',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderBottomWidth: 2,
            borderBottomColor: WK.border,
            backgroundColor: WK.tealDark,
          }}>
            <PixelText size={7} color={WK.dim} style={{ flex: 1 }}>
              PLAYERS ({players.length})
            </PixelText>
            <PixelText size={7} color={WK.dim} style={{ width: 40, textAlign: 'center' }}>POS</PixelText>
            <PixelText size={7} color={WK.dim} style={{ width: 36, textAlign: 'right' }}>OVR</PixelText>
          </View>

          {players.map((p, i) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderBottomWidth: i < players.length - 1 ? 1 : 0,
                borderBottomColor: WK.border,
              }}
            >
              <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
                {p.firstName[0]}. {p.lastName}
              </BodyText>
              <View style={{
                backgroundColor: WK.tealDark,
                borderWidth: 1,
                borderColor: WK.border,
                paddingHorizontal: 4,
                paddingVertical: 1,
                width: 40,
                alignItems: 'center',
              }}>
                <PixelText size={6} color={WK.tealLight}>{p.position}</PixelText>
              </View>
              <VT323Text size={18} color={WK.yellow} style={{ width: 36, textAlign: 'right' }}>
                {calcOvr(p)}
              </VT323Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
