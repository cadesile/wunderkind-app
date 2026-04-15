import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { LeagueTable } from './LeagueTable';
import type { LeagueSnapshot } from '@/types/api';
import type { Fixture } from '@/stores/fixtureStore';

export interface LeagueBrowserProps {
  league: LeagueSnapshot | null;
  fixtures: Fixture[];
  ampClubId: string;
  ampName: string;
}

export function LeagueBrowser({ league, fixtures, ampClubId, ampName }: LeagueBrowserProps) {
  const [expandedLeagueId, setExpandedLeagueId] = useState<string | null>(null);

  if (league === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <PixelText size={9} color={WK.dim}>NO LEAGUE DATA</PixelText>
        <BodyText size={13} dim style={{ textAlign: 'center', lineHeight: 20 }}>
          Sync to load your national league pyramid.
        </BodyText>
      </View>
    );
  }

  // Future: this will be an array of LeagueSnapshot from the store.
  // For now we render the single known league as a one-entry pyramid.
  const leagues = [league];

  const toggleLeague = (id: string) => {
    setExpandedLeagueId((prev) => (prev === id ? null : id));
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
      {leagues.map((lg) => {
        const isExpanded = expandedLeagueId === lg.id;
        const isAmpLeague = lg.clubs.some((c) => c.id === ampClubId);

        return (
          <View key={lg.id} style={{ marginBottom: 4 }}>
            <Pressable
              onPress={() => toggleLeague(lg.id)}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: WK.tealCard,
                  borderWidth: 2,
                  borderColor: isAmpLeague ? WK.yellow : WK.border,
                  gap: 10,
                },
                isAmpLeague && pixelShadow,
              ]}
            >
              {/* Tier badge */}
              <View style={{
                backgroundColor: WK.tealDark,
                borderWidth: 2,
                borderColor: WK.border,
                paddingHorizontal: 6,
                paddingVertical: 3,
                minWidth: 36,
                alignItems: 'center',
              }}>
                <VT323Text size={16} color={WK.yellow}>T{lg.tier}</VT323Text>
              </View>

              <View style={{ flex: 1 }}>
                <PixelText size={9} color={isAmpLeague ? WK.yellow : WK.text} numberOfLines={1}>
                  {lg.name}
                </PixelText>
                <BodyText size={12} dim style={{ marginTop: 2 }}>
                  {lg.clubs.length} clubs
                </BodyText>
              </View>

              {isAmpLeague && (
                <View style={{
                  backgroundColor: WK.yellow,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}>
                  <PixelText size={7} color={WK.greenDark}>YOUR LEAGUE</PixelText>
                </View>
              )}

              {isExpanded
                ? <ChevronDown size={16} color={WK.dim} />
                : <ChevronRight size={16} color={WK.dim} />
              }
            </Pressable>

            {isExpanded && (
              <View style={{
                borderWidth: 2,
                borderTopWidth: 0,
                borderColor: isAmpLeague ? WK.yellow : WK.border,
                minHeight: 200,
              }}>
                <LeagueTable
                  fixtures={fixtures}
                  clubs={lg.clubs}
                  ampClubId={ampClubId}
                  ampName={ampName}
                  promotionSpots={lg.promotionSpots}
                />
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
