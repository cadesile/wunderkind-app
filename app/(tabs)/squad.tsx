import { View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useRouter } from 'expo-router';
import { useSquadStore } from '@/stores/squadStore';
import { PixelText } from '@/components/ui/PixelText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Player } from '@/types/player';
import { WK, traitColor, pixelShadow } from '@/constants/theme';

function PlayerCard({ player }: { player: Player }) {
  const router = useRouter();
  const traits = Object.values(player.personality);
  const avgTrait = Math.round(traits.reduce((a, b) => a + b, 0) / traits.length);

  return (
    <Pressable onPress={() => router.push(`/player/${player.id}`)}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...pixelShadow,
      }}>
        <Avatar appearance={player.appearance} role="PLAYER" size={44} />

        <View style={{ flex: 1 }}>
          <PixelText size={9} upper style={{ marginBottom: 2 }}>{player.name}</PixelText>
          <PixelText size={7} color={WK.tealLight}>{player.position} · AGE {player.age}</PixelText>
          <PixelText size={7} dim>{player.nationality}</PixelText>

          {/* Mini trait bar */}
          <View style={{ marginTop: 6, flexDirection: 'row', gap: 2 }}>
            {traits.map((v, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: traitColor(v),
                  borderRadius: 0,
                }}
              />
            ))}
          </View>
          <PixelText size={7} dim style={{ marginTop: 3 }}>AVG TRAIT: {avgTrait}/20</PixelText>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label={`${player.overallRating}`} color="yellow" />
          <PixelText size={8} color={WK.yellow}>{'★'.repeat(player.potential)}</PixelText>
        </View>
      </View>
    </Pressable>
  );
}

export default function SquadScreen() {
  const players = useSquadStore((s) => s.players);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />
      {/* Header */}
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
        <PixelText size={10} upper>Squad</PixelText>
        <PixelText size={8} color={WK.yellow}>{players.length} PLAYERS</PixelText>
      </View>

      {players.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO PLAYERS YET</PixelText>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PlayerCard player={item} />}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </SafeAreaView>
  );
}
