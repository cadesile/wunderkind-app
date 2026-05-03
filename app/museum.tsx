import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { useClubStore } from '@/stores/clubStore';
import type { TrophyRecord, TrophyStandingEntry } from '@/types/club';

export default function MuseumScreen() {
  const router = useRouter();
  const trophies = useClubStore((s) => s.club.trophies);
  const ampClubId = useClubStore((s) => s.club.id);

  const orderedTrophies = [...trophies].reverse();

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Trophy size={14} color={WK.yellow} />
          <PixelText size={9}>MUSEUM</PixelText>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: 40 }}>
        {trophies.length === 0 ? (
          /* Empty state */
          <View style={[{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 20,
            alignItems: 'center',
            margin: 16,
          }, pixelShadow]}>
            <Trophy size={24} color={WK.dim} />
            <PixelText size={7} color={WK.dim} style={{ marginTop: 12 }}>
              NO TROPHIES YET
            </PixelText>
          </View>
        ) : (
          orderedTrophies.map((trophy: TrophyRecord, index: number) => (
            <TrophyCard
              key={`${trophy.leagueName}-${trophy.season}-${index}`}
              trophy={trophy}
              ampClubId={ampClubId}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrophyCard({ trophy, ampClubId }: { trophy: TrophyRecord; ampClubId: string }) {
  return (
    <View style={[{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      marginHorizontal: 10,
      marginBottom: 10,
    }, pixelShadow]}>

      {/* Card header */}
      <View style={{
        backgroundColor: WK.tealDark,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <PixelText size={7} color={WK.yellow}>{trophy.leagueName}</PixelText>
        <View style={{
          backgroundColor: WK.tealDark,
          borderWidth: 1,
          borderColor: WK.border,
          paddingHorizontal: 5,
          paddingVertical: 2,
        }}>
          <VT323Text size={14} color={WK.tealLight}>T{trophy.tier}</VT323Text>
        </View>
      </View>

      {/* Stat row */}
      <View style={{
        padding: 10,
        flexDirection: 'row',
        gap: 16,
      }}>
        <PixelText size={6} color={WK.text}>SEASON {trophy.season}</PixelText>
        <PixelText size={6} color={WK.dim}>{trophy.wins}W {trophy.draws}D {trophy.losses}L</PixelText>
        <PixelText size={6} color={WK.yellow}>{trophy.points} PTS</PixelText>
      </View>

      {/* Standings table */}
      <View>
        {/* Table header */}
        <View style={{
          backgroundColor: WK.tealDark,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: WK.border,
          flexDirection: 'row',
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}>
          <PixelText size={5} color={WK.dim} style={{ width: 20 }}>#</PixelText>
          <PixelText size={5} color={WK.dim} style={{ flex: 1 }}>CLUB</PixelText>
          <PixelText size={5} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>P</PixelText>
          <PixelText size={5} color={WK.dim} style={{ width: 28, textAlign: 'right' }}>GD</PixelText>
          <PixelText size={5} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>PTS</PixelText>
        </View>

        {/* Standing rows */}
        {trophy.standings.map((entry: TrophyStandingEntry, i: number) => {
          const isAmp = entry.clubId === ampClubId;
          const played = entry.wins + entry.draws + entry.losses;
          const isLast = i === trophy.standings.length - 1;

          return (
            <View
              key={`${entry.clubId}-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 7,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: WK.border,
                backgroundColor: isAmp ? WK.tealDark : 'transparent',
              }}
            >
              <VT323Text size={14} color={isAmp ? WK.yellow : WK.dim} style={{ width: 20 }}>
                {entry.position}
              </VT323Text>
              <BodyText
                size={12}
                color={isAmp ? WK.yellow : WK.text}
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {entry.clubName}
              </BodyText>
              <VT323Text size={14} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>
                {played}
              </VT323Text>
              <VT323Text size={14} color={WK.dim} style={{ width: 28, textAlign: 'right' }}>
                {entry.goalDifference}
              </VT323Text>
              <VT323Text size={14} color={isAmp ? WK.yellow : WK.text} style={{ width: 32, textAlign: 'right' }}>
                {entry.points}
              </VT323Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
