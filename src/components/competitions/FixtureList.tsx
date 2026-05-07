import { useRef, useEffect, useMemo } from 'react';
import { View, SectionList, Pressable } from 'react-native';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import type { Fixture } from '@/stores/fixtureStore';
import type { ClubSnapshot } from '@/types/api';

export interface FixtureListProps {
  fixtures: Fixture[];
  clubs: ClubSnapshot[];
  ampClubId: string;
  ampName: string;
  ampStadiumName: string | null;
  currentMatchday: number;
  onClubPress?: (clubId: string) => void;
  onFixturePress?: (fixture: Fixture) => void;
}

interface FixtureSection {
  round: number;
  data: Fixture[];
}

export function FixtureList({ fixtures, clubs, ampClubId, ampName, ampStadiumName, currentMatchday, onClubPress, onFixturePress }: FixtureListProps) {
  const listRef = useRef<SectionList<Fixture, FixtureSection>>(null);

  const clubNameMap = useMemo(() => {
    const map = new Map<string, string>(clubs.map((c) => [c.id, c.name]));
    map.set(ampClubId, ampName);
    return map;
  }, [clubs, ampClubId, ampName]);

  // Stadium map: clubId → stadiumName (null if not set)
  const stadiumMap = useMemo(() => {
    const map = new Map<string, string | null>(clubs.map((c) => [c.id, c.stadiumName]));
    map.set(ampClubId, ampStadiumName);
    return map;
  }, [clubs, ampClubId, ampStadiumName]);

  const sections = useMemo<FixtureSection[]>(() => {
    const ampFixtures = fixtures.filter(
      (f) => f.homeClubId === ampClubId || f.awayClubId === ampClubId
    );
    const roundMap = new Map<number, Fixture[]>();
    for (const f of ampFixtures) {
      if (!roundMap.has(f.round)) roundMap.set(f.round, []);
      roundMap.get(f.round)!.push(f);
    }
    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, data]) => ({ round, data }));
  }, [fixtures, ampClubId]);

  // Auto-scroll to current matchday section
  useEffect(() => {
    if (currentMatchday < 1 || sections.length === 0) return;
    const sectionIndex = sections.findIndex((s) => s.round === currentMatchday);
    if (sectionIndex < 0) return;
    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex: 0,
          animated: true,
          viewOffset: 8,
        });
      } catch {
        // SectionList may not be fully laid out yet; scroll will be attempted on next matchday change
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentMatchday, sections.length]);

  if (sections.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <PixelText size={9} color={WK.dim}>NO FIXTURES</PixelText>
        <BodyText size={13} dim style={{ textAlign: 'center', lineHeight: 20 }}>
          Sync to generate your season schedule.
        </BodyText>
      </View>
    );
  }

  return (
    <SectionList
      ref={listRef}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: WK.tealDark,
          borderBottomWidth: 2,
          borderBottomColor: WK.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <PixelText size={9} color={WK.yellow}>
            MATCHDAY {section.round}
          </PixelText>
          {section.round === currentMatchday && (
            <PixelText size={7} color={WK.yellow}>▶ CURRENT</PixelText>
          )}
        </View>
      )}
      renderItem={({ item }) => {
        const homeName = clubNameMap.get(item.homeClubId) ?? item.homeClubId;
        const awayName = clubNameMap.get(item.awayClubId) ?? item.awayClubId;
        const isPlayed = item.result !== null;
        const isHome = item.homeClubId === ampClubId;

        // Venue is always the home club's stadium
        const venue = stadiumMap.get(item.homeClubId) ?? null;

        // Win/loss/draw colour for the score box
        let resultColor: string = WK.dim;
        if (isPlayed) {
          const ampGoals = isHome ? item.result!.homeGoals : item.result!.awayGoals;
          const oppGoals = isHome ? item.result!.awayGoals : item.result!.homeGoals;
          if (ampGoals > oppGoals) resultColor = WK.green;
          else if (ampGoals < oppGoals) resultColor = WK.red;
          else resultColor = WK.yellow;
        }

        const rowContent = (
          <View style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: WK.border,
          }}>
            {/* Main fixture row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {onClubPress && item.homeClubId !== ampClubId ? (
                <Pressable style={{ flex: 1 }} onPress={() => onClubPress(item.homeClubId)} hitSlop={4}>
                  <BodyText size={13} style={{ textAlign: 'right', color: WK.yellow, textDecorationLine: 'underline' }} numberOfLines={1}>
                    {homeName}
                  </BodyText>
                </Pressable>
              ) : (
                <BodyText size={13} style={{ flex: 1, textAlign: 'right', color: WK.text }} numberOfLines={1}>
                  {homeName}
                </BodyText>
              )}

              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: WK.tealCard,
                borderWidth: 2,
                borderColor: isPlayed ? resultColor : WK.dim,
                minWidth: 60,
                alignItems: 'center',
              }}>
                {isPlayed ? (
                  <VT323Text size={18} color={resultColor}>
                    {item.result!.homeGoals} - {item.result!.awayGoals}
                  </VT323Text>
                ) : (
                  <PixelText size={8} color={WK.dim}>VS</PixelText>
                )}
              </View>

              {onClubPress && item.awayClubId !== ampClubId ? (
                <Pressable style={{ flex: 1 }} onPress={() => onClubPress(item.awayClubId)} hitSlop={4}>
                  <BodyText size={13} style={{ color: WK.yellow, textDecorationLine: 'underline' }} numberOfLines={1}>
                    {awayName}
                  </BodyText>
                </Pressable>
              ) : (
                <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
                  {awayName}
                </BodyText>
              )}
            </View>

            {/* Venue row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 5 }}>
              <PixelText size={7} color={isHome ? WK.green : WK.orange}>
                {isHome ? 'HOME' : 'AWAY'}
              </PixelText>
              {venue && (
                <>
                  <PixelText size={7} color={WK.border}>·</PixelText>
                  <BodyText size={12} style={{ color: WK.dim }} numberOfLines={1}>
                    {venue}
                  </BodyText>
                </>
              )}
            </View>
          </View>
        );

        if (isPlayed && onFixturePress) {
          return (
            <Pressable onPress={() => onFixturePress(item)} hitSlop={4}>
              {rowContent}
            </Pressable>
          );
        }
        return rowContent;
      }}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}
