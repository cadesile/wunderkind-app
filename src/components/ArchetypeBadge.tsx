import { View } from 'react-native';
import { Player } from '@/types/player';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';

interface ArchetypeBadgeProps {
  player: Player;
}

/**
 * Small inline badge showing the player's personality archetype.
 * Returns null when archetypes haven't loaded or no archetype matches.
 */
export function ArchetypeBadge({ player }: ArchetypeBadgeProps) {
  const archetypes = useArchetypeStore((s) => s.archetypes);
  const isLoading = useArchetypeStore((s) => s.isLoading);

  if (isLoading && archetypes.length === 0) {
    return (
      <View style={{
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderWidth: 2,
        borderColor: WK.border,
        backgroundColor: WK.tealDark,
      }}>
        <PixelText size={6} dim>...</PixelText>
      </View>
    );
  }

  const archetype = getArchetypeForPlayer(player, archetypes);
  if (!archetype) return null;

  return (
    <View style={{
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderWidth: 2,
      borderColor: WK.border,
      backgroundColor: WK.yellow,
    }}>
      <PixelText size={6} color={WK.border}>{archetype.name.toUpperCase()}</PixelText>
    </View>
  );
}
