import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { LeagueTable } from './LeagueTable';
import { WorldClubList } from './WorldClubList';
import type { LeagueSnapshot } from '@/types/api';
import type { Fixture } from '@/stores/fixtureStore';
import type { WorldLeague, WorldClub } from '@/types/world';

export interface LeagueBrowserProps {
  league: LeagueSnapshot | null;
  fixtures: Fixture[];
  ampClubId: string;
  ampName: string;
  worldLeagues: WorldLeague[];
  worldClubs: Record<string, WorldClub>;
}

export function LeagueBrowser({
  league,
  fixtures,
  ampClubId,
  ampName,
  worldLeagues,
  worldClubs,
}: LeagueBrowserProps) {
  const [expandedLeagueId, setExpandedLeagueId] = useState<string | null>(null);
  const router = useRouter();

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

  // Full pyramid sorted by tier (T1 first).
  // Falls back to the single AMP league if worldStore hasn't loaded yet.
  const displayLeagues: WorldLeague[] = worldLeagues.length > 0
    ? [...worldLeagues].sort((a, b) => a.tier - b.tier)
    : [{
        id:             league.id,
        tier:           league.tier,
        name:           league.name,
        country:        league.country ?? '',
        promotionSpots: league.promotionSpots,
        reputationTier: null,
        clubIds:        [],
      }];

  const toggleLeague = (id: string) => {
    setExpandedLeagueId((prev) => (prev === id ? null : id));
  };

  const handleClubPress = (clubId: string) => {
    if (clubId === ampClubId) {
      router.push('/(tabs)/squad');
    } else {
      // NPC club IDs come from worldStore, which is populated from POST /api/initialize.
      // The sync league snapshot clubs are a subset of that same world pack, so every
      // club ID reachable here should exist in worldStore.clubs.
      router.push(`/club/${clubId}`);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
      {displayLeagues.map((lg) => {
        const isExpanded  = expandedLeagueId === lg.id;
        const isAmpLeague = lg.id === league.id;

        const npcClubs: WorldClub[] = lg.clubIds
          .map((id) => worldClubs[id])
          .filter((c): c is WorldClub => c !== undefined);

        const clubCount = isAmpLeague ? league.clubs.length : npcClubs.length;

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
                  {clubCount} clubs
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
                {isAmpLeague ? (
                  <LeagueTable
                    fixtures={fixtures}
                    clubs={league.clubs}
                    ampClubId={ampClubId}
                    ampName={ampName}
                    promotionSpots={league.promotionSpots}
                    onClubPress={handleClubPress}
                  />
                ) : (
                  <WorldClubList
                    clubs={npcClubs}
                    onClubPress={handleClubPress}
                  />
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
