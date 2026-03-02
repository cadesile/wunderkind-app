import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSquadStore } from '@/stores/squadStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Player } from '@/types/player';

function PlayerRow({ player }: { player: Player }) {
  const router = useRouter();
  const traits = Object.values(player.personality);
  const avgTrait = Math.round(traits.reduce((a, b) => a + b, 0) / traits.length);

  return (
    <Pressable onPress={() => router.push(`/player/${player.id}`)}>
      <Card className="mb-3">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="font-semibold text-gray-900">{player.name}</Text>
            <Text className="text-sm text-gray-500">{player.position} · Age {player.age}</Text>
          </View>
          <View className="items-end gap-1">
            <Badge label={`${player.overallRating}`} color="green" />
            <Text className="text-xs text-gray-400">Avg trait: {avgTrait}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function SquadScreen() {
  const players = useSquadStore((s) => s.players);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">Squad ({players.length})</Text>
      </View>

      {players.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">No players yet. Recruit from the dashboard.</Text>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PlayerRow player={item} />}
          contentContainerClassName="px-4 py-4"
        />
      )}
    </SafeAreaView>
  );
}
