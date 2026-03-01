import { View, Text } from 'react-native';

interface Props {
  label: string;
  color?: 'green' | 'gold' | 'gray' | 'red';
}

const COLOR_STYLES = {
  green: { bg: 'bg-green-100', text: 'text-green-800' },
  gold: { bg: 'bg-amber-100', text: 'text-amber-800' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600' },
  red: { bg: 'bg-red-100', text: 'text-red-700' },
};

export function Badge({ label, color = 'gray' }: Props) {
  const { bg, text } = COLOR_STYLES[color];
  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </View>
  );
}
