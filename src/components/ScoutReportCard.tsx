import { useMemo } from 'react';
import { View } from 'react-native';
import { Player } from '@/types/player';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { Guardian } from '@/types/guardian';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import { PixelText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';

interface ScoutReportCardProps {
  player: Player;
}

/**
 * Scout's Report card for the player profile.
 * Shows archetype name and description instead of raw personality numbers.
 */
function getGuardianLabel(guardian: Guardian, allGuardians: Guardian[], index: number): string {
  // Same-sex pair: avoid duplicate MUM/DAD labels
  const sameGenderCount = allGuardians.filter((g) => g.gender === guardian.gender).length;
  if (sameGenderCount > 1) return `GUARDIAN ${index + 1}`;
  return guardian.gender === 'female' ? 'MUM' : 'DAD';
}

export function ScoutReportCard({ player }: ScoutReportCardProps) {
  const archetypes = useArchetypeStore((s) => s.archetypes);
  const isLoading = useArchetypeStore((s) => s.isLoading);
  const allGuardians = useGuardianStore((s) => s.guardians);
  const guardians = useMemo(
    () => allGuardians.filter((g) => g.playerId === player.id),
    [allGuardians, player.id],
  );

  const archetype = getArchetypeForPlayer(player, archetypes);

  if (isLoading && archetypes.length === 0) {
    return (
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 14,
        ...pixelShadow,
      }}>
        <PixelText size={7} dim>Loading profile...</PixelText>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: WK.tealDark,
      borderWidth: 3,
      borderColor: WK.yellow,
      ...pixelShadow,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}>
        <PixelText size={7} color={WK.yellow}>SCOUT'S REPORT</PixelText>
        <PixelText size={6} dim>— Scouting Dept.</PixelText>
      </View>

      <View style={{ padding: 14 }}>
        {archetype ? (
          <>
            {/* Archetype name */}
            <View style={{ marginBottom: 10 }}>
              <PixelText size={6} dim style={{ marginBottom: 6 }}>PERSONALITY TYPE</PixelText>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 5,
                backgroundColor: WK.yellow,
                alignSelf: 'flex-start',
                borderWidth: 2,
                borderColor: WK.border,
              }}>
                <PixelText size={8} color={WK.border}>{archetype.name.toUpperCase()}</PixelText>
              </View>
            </View>

            {/* Description */}
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.25)',
              borderWidth: 2,
              borderColor: WK.border,
              padding: 10,
            }}>
              <PixelText size={7} style={{ lineHeight: 16 }}>{archetype.description}</PixelText>
            </View>
          </>
        ) : (
          <>
            <View style={{ marginBottom: 10 }}>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 5,
                backgroundColor: WK.tealCard,
                alignSelf: 'flex-start',
                borderWidth: 2,
                borderColor: WK.border,
              }}>
                <PixelText size={8} dim>UNKNOWN PROFILE</PixelText>
              </View>
            </View>
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.25)',
              borderWidth: 2,
              borderColor: WK.border,
              padding: 10,
            }}>
              <PixelText size={7} dim style={{ lineHeight: 16 }}>
                No personality profile available. Continue training to develop a clearer picture of this player's character.
              </PixelText>
            </View>
          </>
        )}
      </View>

      {/* Guardian intel section */}
      {guardians.length > 0 && player.scoutingReport?.guardianNote && (
        <View style={{
          borderTopWidth: 2,
          borderTopColor: WK.border,
          padding: 14,
        }}>
          <PixelText size={7} color={WK.yellow} style={{ marginBottom: 10 }}>GUARDIAN INTEL</PixelText>

          {/* Guardian names */}
          {guardians.map((g, i) => (
            <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <PixelText size={6} color={WK.dim}>👤</PixelText>
              <PixelText size={6} dim>{getGuardianLabel(g, guardians, i)}</PixelText>
              <PixelText size={6}>· {g.firstName} {g.lastName}</PixelText>
            </View>
          ))}

          {/* Scout note */}
          <View style={{
            marginTop: 8,
            backgroundColor: 'rgba(0,0,0,0.25)',
            borderWidth: 2,
            borderColor: WK.border,
            padding: 10,
          }}>
            <PixelText size={6} dim style={{ lineHeight: 16 }}>
              {player.scoutingReport.guardianNote}
            </PixelText>
          </View>
        </View>
      )}
    </View>
  );
}
