import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSquadStore } from '@/stores/squadStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PersonalityRadar } from '@/components/radar/PersonalityRadar';

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const player = useSquadStore((s) => s.players.find((p) => p.id === id));

  if (!player) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Player not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">{player.name}</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerClassName="gap-4">
        <Card>
          <View className="flex-row justify-between items-center mb-2">
            <View>
              <Text className="text-sm text-gray-500">{player.position}</Text>
              <Text className="text-sm text-gray-500">Age {player.age} · {player.nationality}</Text>
            </View>
            <Badge label={`OVR ${player.overallRating}`} color="green" />
          </View>
        </Card>

        <Card>
          <Text className="text-sm font-semibold text-gray-700 mb-3">Personality Matrix</Text>
          <PersonalityRadar personality={player.personality} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
