import { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import { computeStandings } from '@/utils/standingsCalculator';
import type { Fixture } from '@/stores/fixtureStore';
const PROMOTION_GREEN = '#4CAF50';

export interface LeagueTableProps {
  fixtures: Fixture[];
  clubs: { id: string; name: string }[];
  ampClubId?: string;
  ampName?: string;
  promotionSpots?: number | null;
  onClubPress?: (clubId: string) => void;
}

export function LeagueTable({ fixtures, clubs, ampClubId, ampName, promotionSpots, onClubPress }: LeagueTableProps) {
  const rows = useMemo(() => computeStandings(fixtures, clubs, ampClubId), [fixtures, clubs, ampClubId]);

  const clubNameMap = useMemo(() => {
    const map = new Map<string, string>(clubs.map((c) => [c.id, c.name]));
    if (ampClubId && ampName) map.set(ampClubId, ampName);
    return map;
  }, [clubs, ampClubId, ampName]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header row */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        backgroundColor: WK.tealDark,
      }}>
        <PixelText size={7} color={WK.dim} style={{ width: 28 }}>#</PixelText>
        <PixelText size={7} color={WK.dim} style={{ flex: 1 }}>CLUB</PixelText>
        <PixelText size={7} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>P</PixelText>
        <PixelText size={7} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>W</PixelText>
        <PixelText size={7} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>D</PixelText>
        <PixelText size={7} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>L</PixelText>
        <PixelText size={7} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>GD</PixelText>
        <PixelText size={7} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>PTS</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {rows.map((row, index) => {
          const pos = index + 1;
          const isAmp = !!ampClubId && row.clubId === ampClubId;
          const isPromotion = promotionSpots != null && pos <= promotionSpots;
          const name = clubNameMap.get(row.clubId) ?? row.clubId;

          return (
            <Pressable
              key={row.clubId}
              onPress={() => onClubPress?.(row.clubId)}
              disabled={!onClubPress}
              style={({ pressed }) => ({
                opacity: onClubPress && pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  backgroundColor: isAmp ? WK.tealCard : 'transparent',
                  borderLeftWidth: isPromotion ? 3 : 0,
                  borderLeftColor: PROMOTION_GREEN,
                  borderBottomWidth: 1,
                  borderBottomColor: WK.border,
                  borderTopWidth: isAmp ? 2 : 0,
                  borderRightWidth: isAmp ? 2 : 0,
                  borderTopColor: WK.border,
                  borderRightColor: WK.border,
                }}
              >
                <VT323Text size={16} color={WK.dim} style={{ width: 28 }}>{pos}</VT323Text>
                <BodyText
                  size={13}
                  style={{ flex: 1, color: isAmp ? WK.yellow : WK.text }}
                  numberOfLines={1}
                >
                  {name}{isAmp ? ' ★' : ''}
                </BodyText>
                <VT323Text size={16} color={WK.text} style={{ width: 24, textAlign: 'right' }}>{row.played}</VT323Text>
                <VT323Text size={16} color={WK.text} style={{ width: 24, textAlign: 'right' }}>{row.won}</VT323Text>
                <VT323Text size={16} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>{row.drawn}</VT323Text>
                <VT323Text size={16} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>{row.lost}</VT323Text>
                <VT323Text
                  size={16}
                  color={row.goalDifference >= 0 ? PROMOTION_GREEN : WK.red}
                  style={{ width: 32, textAlign: 'right' }}
                >
                  {row.goalDifference >= 0 ? `+${row.goalDifference}` : `${row.goalDifference}`}
                </VT323Text>
                <VT323Text size={18} color={isAmp ? WK.yellow : WK.text} style={{ width: 32, textAlign: 'right' }}>
                  {row.points}
                </VT323Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
