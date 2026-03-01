import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAcademyStore } from '@/stores/academyStore';
import { Card } from '@/components/ui/Card';

export default function FinancesScreen() {
  const academy = useAcademyStore((s) => s.academy);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">Finances</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ gap: 16 }}>
        <Card>
          <Text className="text-sm text-gray-500 mb-1">Total Career Earnings</Text>
          <Text className="text-3xl font-bold text-green-700">
            £{academy.totalCareerEarnings.toLocaleString()}
          </Text>
        </Card>

        <Card>
          <Text className="text-sm font-semibold text-gray-700 mb-3">Staff & Overheads</Text>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-600">Staff count</Text>
            <Text className="text-sm font-medium">{academy.staffCount}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-sm text-gray-600">Weekly staff cost</Text>
            <Text className="text-sm font-medium">£{(academy.staffCount * 500).toLocaleString()}</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
