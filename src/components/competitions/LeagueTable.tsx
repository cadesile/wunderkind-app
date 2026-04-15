import { View, ScrollView } from 'react-native';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import { computeStandings } from '@/utils/standingsCalculator';
import type { Fixture } from '@/stores/fixtureStore';
import type { ClubSnapshot } from '@/types/api';

interface Props {
  fixtures: Fixture[];
  clubs: ClubSnapshot[];
  ampClubId: string;
  ampName: string;
  promotionSpots?: number | null;
}

export function LeagueTable({ fixtures, clubs, ampClubId, ampName, promotionSpots }: Props) {
  const rows = computeStandings(fixtures, clubs, ampClubId);

  const clubNameMap = new Map<string, string>(clubs.map((c) => [c.id, c.name]));
  clubNameMap.set(ampClubId, ampName);

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
          const isAmp = row.clubId === ampClubId;
          const isPromotion = promotionSpots != null && pos <= promotionSpots;
          const name = clubNameMap.get(row.clubId) ?? row.clubId;

          return (
            <View
              key={row.clubId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 10,
                backgroundColor: isAmp ? WK.tealCard : 'transparent',
                borderLeftWidth: isPromotion ? 3 : 0,
                borderLeftColor: '#4CAF50',
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
                color={row.goalDifference >= 0 ? '#4CAF50' : WK.red}
                style={{ width: 32, textAlign: 'right' }}
              >
                {row.goalDifference >= 0 ? `+${row.goalDifference}` : `${row.goalDifference}`}
              </VT323Text>
              <VT323Text size={18} color={isAmp ? WK.yellow : WK.text} style={{ width: 32, textAlign: 'right' }}>
                {row.points}
              </VT323Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
