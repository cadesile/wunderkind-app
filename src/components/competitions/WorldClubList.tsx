import { View, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { BodyText, VT323Text } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import type { WorldClub } from '@/types/world';

export interface WorldClubListProps {
  clubs: WorldClub[];
  onClubPress: (clubId: string) => void;
}

export function WorldClubList({ clubs, onClubPress }: WorldClubListProps) {
  const sorted = [...clubs].sort((a, b) => b.reputation - a.reputation);

  if (sorted.length === 0) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <BodyText size={13} dim>No clubs loaded.</BodyText>
      </View>
    );
  }

  return (
    <View>
      {sorted.map((club) => (
        <Pressable
          key={club.id}
          onPress={() => onClubPress(club.id)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 11,
            backgroundColor: pressed ? WK.tealDark : 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: WK.border,
            gap: 10,
          })}
        >
          {/* Primary colour swatch */}
          <View style={{
            width: 12,
            height: 12,
            backgroundColor: club.primaryColor,
            borderWidth: 1,
            borderColor: WK.border,
          }} />

          <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
            {club.name}
          </BodyText>

          <VT323Text size={16} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>
            {club.reputation}
          </VT323Text>

          <ChevronRight size={14} color={WK.dim} />
        </Pressable>
      ))}
    </View>
  );
}
