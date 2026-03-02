import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { processWeeklyTick } from '@/engine/GameLoop';

export default function DashboardScreen() {
  const academy = useAcademyStore((s) => s.academy);
  const players = useSquadStore((s) => s.players);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">{academy.name}</Text>
        <SyncStatusIndicator status="synced" />
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerClassName="gap-4">
        <Card>
          <Text className="text-sm text-gray-500 mb-1">Academy Reputation</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-3xl font-bold text-gray-900">{academy.reputation}</Text>
            <Badge label={academy.reputationTier} color="green" />
          </View>
          <View className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <View
              className="h-2 bg-green-500 rounded-full"
              style={{ width: `${(academy.reputation / 1000) * 100}%` }}
            />
          </View>
        </Card>

        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Text className="text-xs text-gray-500">Squad</Text>
            <Text className="text-2xl font-bold text-gray-900">{players.length}</Text>
            <Text className="text-xs text-gray-400">players</Text>
          </Card>
          <Card className="flex-1">
            <Text className="text-xs text-gray-500">Earnings</Text>
            <Text className="text-2xl font-bold text-gray-900">
              £{academy.totalCareerEarnings.toLocaleString()}
            </Text>
          </Card>
        </View>

        <Button label="Process Weekly Tick" onPress={() => processWeeklyTick()} />
      </ScrollView>
    </SafeAreaView>
  );
}
