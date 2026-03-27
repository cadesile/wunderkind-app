import { useMemo } from 'react';
import { View } from 'react-native';
import { Player } from '@/types/player';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { Guardian } from '@/types/guardian';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';

const TRAIT_LABELS: Record<string, string> = {
  determination: 'DETERMINED',
  professionalism: 'PROFESSIONAL',
  ambition: 'AMBITIOUS',
  loyalty: 'LOYAL',
  adaptability: 'ADAPTABLE',
  pressure: 'COMPOSED',
  temperament: 'LEVEL-HEADED',
  consistency: 'CONSISTENT',
};

function getTopTraits(player: Player, count = 3): string[] {
  const p = player.personality;
  if (!p) return [];
  return (Object.entries(p) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => TRAIT_LABELS[key] ?? key.toUpperCase());
}

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
      </View>

      <View style={{ padding: 14 }}>
        {archetype ? (
          <>
            {/* Archetype name + trait pills */}
            <View style={{ marginBottom: 10 }}>
              <PixelText size={6} dim style={{ marginBottom: 6 }}>PERSONALITY TYPE</PixelText>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 5,
                backgroundColor: WK.yellow,
                alignSelf: 'flex-start',
                borderWidth: 2,
                borderColor: WK.border,
                marginBottom: 8,
              }}>
                <PixelText size={8} color={WK.border}>{archetype.name.toUpperCase()}</PixelText>
              </View>

              {getTopTraits(player).length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {getTopTraits(player).map((label) => (
                    <View key={label} style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      backgroundColor: WK.tealCard,
                      borderWidth: 1,
                      borderColor: WK.dim,
                    }}>
                      <BodyText size={10} color={WK.dim}>{label}</BodyText>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Description with left accent border */}
            <View style={{
              borderLeftWidth: 3,
              borderLeftColor: WK.yellow,
              paddingLeft: 12,
              marginBottom: 10,
            }}>
              <BodyText size={13} style={{ lineHeight: 20 }}>{archetype.description}</BodyText>
            </View>

            {/* Footer attribution */}
            <PixelText size={6} dim style={{ textAlign: 'right' }}>— Scouting Dept.</PixelText>
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
              borderLeftWidth: 3,
              borderLeftColor: WK.border,
              paddingLeft: 12,
              marginBottom: 10,
            }}>
              <BodyText size={13} color={WK.dim} style={{ lineHeight: 20 }}>
                No personality profile available. Continue training to develop a clearer picture of this player's character.
              </BodyText>
            </View>
            <PixelText size={6} dim style={{ textAlign: 'right' }}>— Scouting Dept.</PixelText>
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
              <BodyText size={11} color={WK.dim}>{getGuardianLabel(g, guardians, i)}</BodyText>
              <BodyText size={11}>· {g.firstName} {g.lastName}</BodyText>
            </View>
          ))}

          {/* Scout note */}
          <View style={{
            marginTop: 8,
            borderLeftWidth: 3,
            borderLeftColor: WK.dim,
            paddingLeft: 12,
          }}>
            <BodyText size={12} color={WK.dim} style={{ lineHeight: 20 }}>
              {player.scoutingReport.guardianNote}
            </BodyText>
          </View>
        </View>
      )}
    </View>
  );
}
