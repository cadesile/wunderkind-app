import { View, Text } from 'react-native';
import { PersonalityMatrix, TraitName } from '@/types/player';

interface Props {
  personality: PersonalityMatrix;
}

const TRAIT_LABELS: Record<TraitName, string> = {
  determination:   'Det',
  professionalism: 'Pro',
  ambition:        'Amb',
  loyalty:         'Loy',
  adaptability:    'Ada',
  pressure:        'Pre',
  temperament:     'Tem',
  consistency:     'Con',
};

/** Renders trait bars on a 1–20 scale */
export function PersonalityRadar({ personality }: Props) {
  return (
    <View className="gap-2">
      {(Object.entries(personality) as [TraitName, number][]).map(([trait, value]) => (
        <View key={trait} className="flex-row items-center gap-2">
          <Text className="text-xs text-gray-500 w-8">{TRAIT_LABELS[trait]}</Text>
          <View className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <View
              className="h-2 bg-blue-500 rounded-full"
              style={{ width: `${(value / 20) * 100}%` }}
            />
          </View>
          <Text className="text-xs text-gray-400 w-6 text-right">{value}</Text>
        </View>
      ))}
    </View>
  );
}
