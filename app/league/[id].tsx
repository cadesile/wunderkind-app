import { useMemo, useState, useEffect } from 'react';
import { View, SectionList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { WK, pixelShadow } from '@/constants/theme';
import { computeStandings } from '@/utils/standingsCalculator';
import { useWorldStore } from '@/stores/worldStore';
import { useClubStore } from '@/stores/clubStore';
import { useFixtureStore, type Fixture } from '@/stores/fixtureStore';
import { useSquadStore } from '@/stores/squadStore';
import { MatchResultOverlay, buildMatchResultData } from '@/components/MatchResultOverlay';
import { useMatchResultStore } from '@/stores/matchResultStore';
import { useLeagueStatsStore } from '@/stores/leagueStatsStore';
import {
  loadArchivedFixtureSeason,
  listArchivedFixtureSeasons,
} from '@/utils/fixtureArchive';
import type { WorldClub } from '@/types/world';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROMOTION_GREEN = '#4CAF50';

const FORM_COLOR: Record<'W' | 'D' | 'L', string> = {
  W: PROMOTION_GREEN,
  D: WK.yellow,
  L: WK.red,
};

const TABS = ['TABLE', 'STATS', 'FORM', 'FIXTURES'] as const;
type Tab = typeof TABS[number];

// ─── Shared types ─────────────────────────────────────────────────────────────

interface StatEntry {
  id: string;
  name: string;
  clubName: string;
  position: string;
  goals: number;
  assists: number;
}

interface FormEntry {
  clubId: string;
  name: string;
  isAmp: boolean;
  pts: number;
  form: Array<'W' | 'D' | 'L'>;
}

interface FixtureSection {
  round: number;
  data: Fixture[];
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      marginHorizontal: 10,
      marginTop: 12,
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      ...pixelShadow,
    }}>
      {children}
    </View>
  );
}

function CardHeader({ left, right }: { left: string; right?: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: WK.tealDark,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <PixelText size={8} color={WK.yellow} style={{ flex: 1 }}>{left}</PixelText>
      {right && <PixelText size={7} color={WK.dim}>{right}</PixelText>}
    </View>
  );
}

// ─── TABLE pane ───────────────────────────────────────────────────────────────

function TablePane({
  standings,
  clubNameMap,
  ampClubId,
  promotionSpots,
  relegationSpots,
  onClubPress,
}: {
  standings: ReturnType<typeof computeStandings>;
  clubNameMap: Map<string, string>;
  ampClubId: string | undefined;
  promotionSpots: number | null;
  relegationSpots: number | null;
  onClubPress: (clubId: string) => void;
}) {
  if (standings.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={9} color={WK.dim}>NO MATCHES PLAYED</PixelText>
      </View>
    );
  }

  return (
    <SectionList
      sections={[{ title: 'TABLE', data: standings }]}
      keyExtractor={(row) => row.clubId}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: WK.tealDark,
          borderBottomWidth: 2,
          borderBottomColor: WK.border,
        }}>
          <PixelText size={7} color={WK.dim} style={{ width: 28, flexShrink: 0 }}>#</PixelText>
          <PixelText size={7} color={WK.dim} style={{ flex: 1, minWidth: 0 }}>CLUB</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 24, flexShrink: 0, textAlign: 'right' }}>P</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 24, flexShrink: 0, textAlign: 'right' }}>W</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 24, flexShrink: 0, textAlign: 'right' }}>D</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 24, flexShrink: 0, textAlign: 'right' }}>L</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 32, flexShrink: 0, textAlign: 'right' }}>GD</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 32, flexShrink: 0, textAlign: 'right' }}>PTS</PixelText>
        </View>
      }
      renderItem={({ item: row, index }) => {
        const pos        = index + 1;
        const isAmp      = !!ampClubId && row.clubId === ampClubId;
        const isPromo    = promotionSpots != null && pos <= promotionSpots;
        const isRelegate = relegationSpots != null && relegationSpots > 0 && pos > standings.length - relegationSpots;
        const name       = clubNameMap.get(row.clubId) ?? row.clubId;

        return (
          <Pressable onPress={() => onClubPress(row.clubId)}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 10,
              backgroundColor: isAmp ? WK.tealCard : 'transparent',
              borderLeftWidth: (isPromo || isRelegate) ? 3 : 0,
              borderLeftColor: isRelegate ? WK.red : PROMOTION_GREEN,
              borderBottomWidth: 1,
              borderBottomColor: WK.border,
              borderTopWidth:    isAmp ? 2 : 0,
              borderRightWidth:  isAmp ? 2 : 0,
              borderTopColor:    WK.border,
              borderRightColor:  WK.border,
            }}>
              <VT323Text size={16} color={WK.dim} style={{ width: 28, flexShrink: 0 }}>{pos}</VT323Text>
              <BodyText
                size={13}
                numberOfLines={1}
                style={{ flex: 1, minWidth: 0, color: isAmp ? WK.yellow : WK.text }}
              >
                {name}{isAmp ? ' ★' : ''}
              </BodyText>
              <VT323Text size={16} color={WK.text}    style={{ width: 24, flexShrink: 0, textAlign: 'right' }}>{row.played}</VT323Text>
              <VT323Text size={16} color={WK.text}    style={{ width: 24, flexShrink: 0, textAlign: 'right' }}>{row.won}</VT323Text>
              <VT323Text size={16} color={WK.dim}     style={{ width: 24, flexShrink: 0, textAlign: 'right' }}>{row.drawn}</VT323Text>
              <VT323Text size={16} color={WK.dim}     style={{ width: 24, flexShrink: 0, textAlign: 'right' }}>{row.lost}</VT323Text>
              <VT323Text
                size={16}
                color={row.goalDifference >= 0 ? PROMOTION_GREEN : WK.red}
                style={{ width: 32, flexShrink: 0, textAlign: 'right' }}
              >
                {row.goalDifference >= 0 ? `+${row.goalDifference}` : `${row.goalDifference}`}
              </VT323Text>
              <VT323Text
                size={18}
                color={isAmp ? WK.yellow : WK.text}
                style={{ width: 32, flexShrink: 0, textAlign: 'right' }}
              >
                {row.points}
              </VT323Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

// ─── STATS pane ───────────────────────────────────────────────────────────────

function StatsPane({
  topScorers,
  topAssisters,
}: {
  topScorers: StatEntry[];
  topAssisters: StatEntry[];
}) {
  const empty = topScorers.length === 0 && topAssisters.length === 0;

  if (empty) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <PixelText size={9} color={WK.dim}>NO STATS YET</PixelText>
        <BodyText size={12} dim>Play some matches to see scorers and assists.</BodyText>
      </View>
    );
  }

  return (
    <SectionList
      sections={[{ title: 'STATS', data: [{ scorers: topScorers, assisters: topAssisters }] }]}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item }) => (
        <View>
          {/* Golden Boot */}
          {item.scorers.length > 0 && (
            <SectionCard>
              <CardHeader left="GOLDEN BOOT" right="GOALS" />
              {item.scorers.map((p, i) => (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderBottomWidth: i < item.scorers.length - 1 ? 2 : 0,
                    borderBottomColor: WK.border,
                    gap: 8,
                  }}
                >
                  <VT323Text size={18} color={i === 0 ? WK.yellow : WK.dim} style={{ width: 20, flexShrink: 0 }}>
                    {i + 1}
                  </VT323Text>
                  <View style={{
                    paddingHorizontal: 5, paddingVertical: 2,
                    borderWidth: 1, borderColor: WK.border,
                    backgroundColor: WK.tealDark, flexShrink: 0,
                  }}>
                    <PixelText size={7} color={WK.dim}>{p.position}</PixelText>
                  </View>
                  <BodyText size={13} style={{ flex: 1, minWidth: 0, color: WK.text }} numberOfLines={1}>{p.name}</BodyText>
                  <BodyText size={11} dim numberOfLines={1} style={{ maxWidth: 80, flexShrink: 1 }}>{p.clubName}</BodyText>
                  <VT323Text size={20} color={PROMOTION_GREEN} style={{ minWidth: 28, flexShrink: 0, textAlign: 'right' }}>
                    {p.goals}
                  </VT323Text>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Top Assists */}
          {item.assisters.length > 0 && (
            <SectionCard>
              <CardHeader left="TOP ASSISTS" right="ASSISTS" />
              {item.assisters.map((p, i) => (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderBottomWidth: i < item.assisters.length - 1 ? 2 : 0,
                    borderBottomColor: WK.border,
                    gap: 8,
                  }}
                >
                  <VT323Text size={18} color={i === 0 ? WK.yellow : WK.dim} style={{ width: 20, flexShrink: 0 }}>
                    {i + 1}
                  </VT323Text>
                  <View style={{
                    paddingHorizontal: 5, paddingVertical: 2,
                    borderWidth: 1, borderColor: WK.border,
                    backgroundColor: WK.tealDark, flexShrink: 0,
                  }}>
                    <PixelText size={7} color={WK.dim}>{p.position}</PixelText>
                  </View>
                  <BodyText size={13} style={{ flex: 1, minWidth: 0, color: WK.text }} numberOfLines={1}>{p.name}</BodyText>
                  <BodyText size={11} dim numberOfLines={1} style={{ maxWidth: 80, flexShrink: 1 }}>{p.clubName}</BodyText>
                  <VT323Text size={20} color={WK.tealLight} style={{ minWidth: 28, flexShrink: 0, textAlign: 'right' }}>
                    {p.assists}
                  </VT323Text>
                </View>
              ))}
            </SectionCard>
          )}
        </View>
      )}
    />
  );
}

// ─── FORM pane ────────────────────────────────────────────────────────────────

function FormPane({ formTable }: { formTable: FormEntry[] }) {
  if (formTable.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={9} color={WK.dim}>NO RESULTS YET</PixelText>
      </View>
    );
  }

  return (
    <SectionList
      sections={[{ title: 'FORM', data: formTable }]}
      keyExtractor={(item) => item.clubId}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: WK.tealDark,
          borderBottomWidth: 2,
          borderBottomColor: WK.border,
        }}>
          <PixelText size={7} color={WK.dim} style={{ flex: 1, minWidth: 0 }}>CLUB</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 116, flexShrink: 0, textAlign: 'center' }}>LAST 5</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 40, flexShrink: 0, textAlign: 'right' }}>PTS</PixelText>
        </View>
      }
      renderItem={({ item: row }) => (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: WK.border,
          backgroundColor: row.isAmp ? WK.tealCard : 'transparent',
          gap: 8,
        }}>
          <BodyText
            size={13}
            numberOfLines={1}
            style={{ flex: 1, minWidth: 0, color: row.isAmp ? WK.yellow : WK.text }}
          >
            {row.name}{row.isAmp ? ' ★' : ''}
          </BodyText>
          <View style={{ flexDirection: 'row', gap: 4, flexShrink: 0 }}>
            {row.form.map((r, i) => (
              <View
                key={i}
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: FORM_COLOR[r],
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: WK.border,
                }}
              >
                <PixelText size={7} color={WK.text}>{r}</PixelText>
              </View>
            ))}
            {/* Pad to 5 if fewer results played */}
            {Array.from({ length: Math.max(0, 5 - row.form.length) }).map((_, i) => (
              <View
                key={`pad-${i}`}
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: WK.tealDark,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: WK.border,
                }}
              >
                <PixelText size={7} color={WK.border}>–</PixelText>
              </View>
            ))}
          </View>
          <VT323Text size={18} color={row.isAmp ? WK.yellow : WK.text} style={{ width: 40, flexShrink: 0, textAlign: 'right' }}>
            {row.pts}
          </VT323Text>
        </View>
      )}
    />
  );
}

// ─── FIXTURES pane ────────────────────────────────────────────────────────────

function FixturesPane({
  sections,
  clubNameMap,
  stadiumMap,
  ampClubId,
  onFixturePress,
}: {
  sections: FixtureSection[];
  clubNameMap: Map<string, string>;
  stadiumMap: Map<string, string | null>;
  ampClubId: string | undefined;
  onFixturePress?: (fixture: Fixture) => void;
}) {
  if (sections.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <PixelText size={9} color={WK.dim}>NO FIXTURES</PixelText>
        <BodyText size={13} dim style={{ textAlign: 'center' }}>Sync to generate the season schedule.</BodyText>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 40 }}
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
          <PixelText size={9} color={WK.yellow}>MATCHDAY {section.round}</PixelText>
        </View>
      )}
      renderItem={({ item }) => {
        const homeName = clubNameMap.get(item.homeClubId) ?? item.homeClubId;
        const awayName = clubNameMap.get(item.awayClubId) ?? item.awayClubId;
        const isPlayed = item.result !== null;
        const ampIsHome = item.homeClubId === ampClubId;
        const ampIsAway = item.awayClubId === ampClubId;
        const ampIsPlaying = ampIsHome || ampIsAway;
        const venue = stadiumMap.get(item.homeClubId) ?? null;

        let resultColor = WK.dim;
        if (isPlayed && ampIsPlaying) {
          const ampGoals = ampIsHome ? item.result!.homeGoals : item.result!.awayGoals;
          const oppGoals = ampIsHome ? item.result!.awayGoals : item.result!.homeGoals;
          resultColor = ampGoals > oppGoals ? PROMOTION_GREEN : ampGoals < oppGoals ? WK.red : WK.yellow;
        } else if (isPlayed) {
          resultColor = WK.tealLight;
        }

        const rowContent = (
          <View style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: WK.border,
            backgroundColor: ampIsPlaying ? WK.tealCard + '40' : 'transparent',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BodyText
                size={13}
                numberOfLines={1}
                style={{ flex: 1, minWidth: 0, textAlign: 'right', color: ampIsHome ? WK.yellow : WK.text }}
              >
                {homeName}
              </BodyText>

              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: WK.tealCard,
                borderWidth: 2,
                borderColor: isPlayed ? resultColor : WK.border,
                minWidth: 60,
                flexShrink: 0,
                alignItems: 'center',
              }}>
                {isPlayed ? (
                  <VT323Text size={18} color={resultColor}>
                    {item.result!.homeGoals} – {item.result!.awayGoals}
                  </VT323Text>
                ) : (
                  <PixelText size={8} color={WK.dim}>VS</PixelText>
                )}
              </View>

              <BodyText
                size={13}
                numberOfLines={1}
                style={{ flex: 1, minWidth: 0, color: ampIsAway ? WK.yellow : WK.text }}
              >
                {awayName}
              </BodyText>
            </View>

            {/* Venue row */}
            {venue && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                <BodyText size={11} style={{ color: WK.dim }} numberOfLines={1}>{venue}</BodyText>
              </View>
            )}
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
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LeagueDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('TABLE');

  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  // Season browsing — null means "current season" (from store)
  const [archivedSeasons, setArchivedSeasons] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [archivedFixtures, setArchivedFixtures] = useState<Fixture[] | null>(null);

  const worldLeagues    = useWorldStore((s) => s.leagues);
  const worldClubs      = useWorldStore((s) => s.clubs);
  const ampLeagueId     = useWorldStore((s) => s.ampLeagueId);
  const storeFixtures   = useFixtureStore((s) => s.fixtures);
  const ampClub         = useClubStore((s) => s.club);
  const ampSquad        = useSquadStore((s) => s.players);
  const matchResults    = useMatchResultStore((s) => s.results);

  // Load available archived seasons for this league on mount
  useEffect(() => {
    listArchivedFixtureSeasons().then((seasons) => setArchivedSeasons(seasons));
  }, []);

  // When user picks a past season, load its fixtures from the archive file
  useEffect(() => {
    if (selectedSeason === null) {
      setArchivedFixtures(null);
      return;
    }
    loadArchivedFixtureSeason(selectedSeason).then((fixtures) => {
      setArchivedFixtures(fixtures);
    });
  }, [selectedSeason]);

  // Use archived fixtures for past seasons, store fixtures for current
  const allFixtures = selectedSeason !== null && archivedFixtures !== null
    ? archivedFixtures
    : storeFixtures;

  const league       = worldLeagues.find((l) => l.id === id);
  const isAmpLeague  = ampLeagueId === id;

  const leagueWorldClubs = useMemo<WorldClub[]>(() => {
    return (league?.clubIds ?? [])
      .map((cid) => worldClubs[cid])
      .filter((c): c is WorldClub => c !== undefined);
  }, [league?.clubIds, worldClubs]);

  // Data-driven AMP detection: AMP is in this league if they appear in any fixture,
  // regardless of whether ampLeagueId has been set (handles race conditions on init).
  const ampInLeague = useMemo(() =>
    isAmpLeague || allFixtures.some(
      (f) => f.leagueId === id && (f.homeClubId === ampClub.id || f.awayClubId === ampClub.id),
    ),
    [isAmpLeague, allFixtures, id, ampClub.id],
  );

  const allClubs = useMemo(() => {
    const npc = leagueWorldClubs.map((c) => ({ id: c.id, name: c.name }));
    if (ampInLeague) return [...npc, { id: ampClub.id, name: ampClub.name }];
    return npc;
  }, [leagueWorldClubs, ampInLeague, ampClub.id, ampClub.name]);

  const clubNameMap = useMemo(
    () => new Map<string, string>(allClubs.map((c) => [c.id, c.name])),
    [allClubs],
  );

  const stadiumMap = useMemo(() => {
    const map = new Map<string, string | null>();
    leagueWorldClubs.forEach((c) => map.set(c.id, c.stadiumName ?? null));
    map.set(ampClub.id, ampClub.stadiumName ?? null);
    return map;
  }, [leagueWorldClubs, ampClub.id, ampClub.stadiumName]);

  const overlayData = useMemo(() => {
    if (!selectedFixture) return null;
    return buildMatchResultData(selectedFixture, ampClub.id, ampClub.name, clubNameMap, matchResults);
  }, [selectedFixture, ampClub.id, ampClub.name, clubNameMap, matchResults]);

  const leagueFixtures = useMemo(() => {
    const all = allFixtures.filter((f) => f.leagueId === id);
    if (all.length === 0) return [];
    const maxSeason = Math.max(...all.map((f) => f.season));
    return all.filter((f) => f.season === maxSeason);
  }, [allFixtures, id]);

  const currentSeasonNumber = useMemo(() => {
    if (selectedSeason !== null) return selectedSeason;
    if (leagueFixtures.length === 0) return 1;
    return Math.max(...leagueFixtures.map((f) => f.season));
  }, [selectedSeason, leagueFixtures]);

  const lsRecords = useLeagueStatsStore((s) => s.records);

  const relegationSpots = useMemo(() => {
    if (!league) return null;
    const leagueBelow = worldLeagues.find(
      (l) => l.country === league.country && l.tier === league.tier + 1,
    );
    return leagueBelow?.promotionSpots ?? null;
  }, [worldLeagues, league]);

  const standings = useMemo(() =>
    computeStandings(leagueFixtures, allClubs, ampInLeague ? ampClub.id : undefined),
    [leagueFixtures, allClubs, ampInLeague, ampClub.id],
  );

  const playerStats = useMemo<StatEntry[]>(() => {
    // Aggregate goals/assists per player from leagueStatsStore for this league + season
    const byPlayer = new Map<string, { goals: number; assists: number }>();
    for (const r of Object.values(lsRecords)) {
      if (r.leagueId !== id || r.season !== currentSeasonNumber) continue;
      const cur = byPlayer.get(r.playerId) ?? { goals: 0, assists: 0 };
      byPlayer.set(r.playerId, { goals: cur.goals + r.goals, assists: cur.assists + r.assists });
    }

    // Build a name/position/club lookup from NPC world clubs + AMP squad
    const playerMeta = new Map<string, { name: string; position: string; clubName: string }>();
    leagueWorldClubs.forEach((wc) => {
      const clubName = clubNameMap.get(wc.id) ?? wc.id;
      wc.players.forEach((p) => {
        playerMeta.set(p.id, {
          name:     `${p.firstName} ${p.lastName}`,
          position: p.position === 'ATT' ? 'FWD' : p.position,
          clubName,
        });
      });
    });
    if (ampInLeague) {
      ampSquad.filter((p) => p.isActive).forEach((p) => {
        playerMeta.set(p.id, { name: p.name, position: p.position, clubName: ampClub.name });
      });
    }

    const entries: StatEntry[] = [];
    for (const [playerId, stats] of byPlayer) {
      if (stats.goals === 0 && stats.assists === 0) continue;
      const meta = playerMeta.get(playerId);
      if (!meta) continue;
      entries.push({ id: playerId, ...meta, ...stats });
    }
    return entries;
  }, [lsRecords, id, currentSeasonNumber, leagueWorldClubs, ampSquad, ampInLeague, ampClub.name, clubNameMap]);

  const topScorers   = useMemo(() =>
    [...playerStats].sort((a, b) => b.goals   - a.goals  ).filter((p) => p.goals   > 0).slice(0, 10),
    [playerStats],
  );
  const topAssisters = useMemo(() =>
    [...playerStats].sort((a, b) => b.assists - a.assists).filter((p) => p.assists > 0).slice(0, 10),
    [playerStats],
  );

  const formTable = useMemo<FormEntry[]>(() => {
    return allClubs.map(({ id: clubId }) => {
      const isAmp = clubId === ampClub.id;
      const name  = clubNameMap.get(clubId) ?? clubId;
      const played = leagueFixtures
        .filter((f) => f.result !== null && (f.homeClubId === clubId || f.awayClubId === clubId))
        .sort((a, b) => b.round - a.round)
        .slice(0, 5);
      let pts = 0;
      const form: Array<'W' | 'D' | 'L'> = [];
      for (const f of played) {
        const isHome = f.homeClubId === clubId;
        const gf = isHome ? f.result!.homeGoals : f.result!.awayGoals;
        const ga = isHome ? f.result!.awayGoals : f.result!.homeGoals;
        const outcome: 'W' | 'D' | 'L' = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
        if (outcome === 'W') pts += 3;
        else if (outcome === 'D') pts += 1;
        form.unshift(outcome);
      }
      return { clubId, name, isAmp, pts, form };
    })
    .filter((r) => r.form.length > 0)
    .sort((a, b) => b.pts - a.pts);
  }, [leagueFixtures, allClubs, ampInLeague, ampClub.id, clubNameMap]);

  const fixtureSections = useMemo<FixtureSection[]>(() => {
    const roundMap = new Map<number, Fixture[]>();
    for (const f of leagueFixtures) {
      if (!roundMap.has(f.round)) roundMap.set(f.round, []);
      roundMap.get(f.round)!.push(f);
    }
    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, data]) => ({ round, data }));
  }, [leagueFixtures]);

  if (!league) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, justifyContent: 'center', alignItems: 'center' }}>
        <PixelText size={9} color={WK.dim}>LEAGUE NOT FOUND</PixelText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: WK.tealDark,
        borderBottomWidth: 3,
        borderBottomColor: WK.border,
        gap: 10,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <ChevronLeft size={20} color={WK.yellow} />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <PixelText size={9} color={WK.yellow} numberOfLines={1}>
            {league.name.toUpperCase()}
          </PixelText>
          <BodyText size={11} dim style={{ marginTop: 2 }}>
            TIER {league.tier}
            {allClubs.length > 0 ? ` · ${allClubs.length} CLUBS` : ''}
            {league.reputationTier ? ` · ${league.reputationTier.toUpperCase()}` : ''}
          </BodyText>
        </View>

        <View style={{ flexShrink: 0, alignItems: 'center', gap: 2 }}>
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 2,
            borderColor: WK.border,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
            <VT323Text size={20} color={WK.yellow}>T{league.tier}</VT323Text>
          </View>

          {/* Season navigator — only shown when past seasons are archived */}
          {archivedSeasons.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => {
                  const prev = archivedSeasons.filter((s) => s < currentSeasonNumber);
                  if (prev.length > 0) setSelectedSeason(prev[prev.length - 1]);
                }}
                hitSlop={8}
                disabled={archivedSeasons[0] >= currentSeasonNumber}
              >
                <BodyText size={10} color={archivedSeasons[0] < currentSeasonNumber ? WK.yellow : WK.dim}>
                  {'<'}
                </BodyText>
              </Pressable>
              <BodyText size={10} color={WK.text}>S{currentSeasonNumber}</BodyText>
              <Pressable
                onPress={() => {
                  if (selectedSeason === null) return;
                  const next = archivedSeasons.find((s) => s > selectedSeason);
                  if (next !== undefined) setSelectedSeason(next);
                  else setSelectedSeason(null); // back to live
                }}
                hitSlop={8}
                disabled={selectedSeason === null}
              >
                <BodyText size={10} color={selectedSeason !== null ? WK.yellow : WK.dim}>
                  {'>'}
                </BodyText>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* ── Sub-tabs ────────────────────────────────────────────────────── */}
      <PixelTopTabBar
        tabs={[...TABS]}
        active={activeTab}
        onChange={(t) => setActiveTab(t as Tab)}
      />

      {/* ── Panes ───────────────────────────────────────────────────────── */}
      {activeTab === 'TABLE' && (
        <TablePane
          standings={standings}
          clubNameMap={clubNameMap}
          ampClubId={ampInLeague ? ampClub.id : undefined}
          promotionSpots={league.promotionSpots}
          relegationSpots={relegationSpots}
          onClubPress={(clubId) => {
            if (clubId === ampClub.id) router.push('/(tabs)/hub');
            else router.push(`/club/${clubId}`);
          }}
        />
      )}

      {activeTab === 'STATS' && (
        <StatsPane topScorers={topScorers} topAssisters={topAssisters} />
      )}

      {activeTab === 'FORM' && (
        <FormPane formTable={formTable} />
      )}

      {activeTab === 'FIXTURES' && (
        <FixturesPane
          sections={fixtureSections}
          clubNameMap={clubNameMap}
          stadiumMap={stadiumMap}
          ampClubId={isAmpLeague ? ampClub.id : undefined}
          onFixturePress={setSelectedFixture}
        />
      )}

      <MatchResultOverlay
        visible={selectedFixture !== null}
        data={overlayData}
        onClose={() => setSelectedFixture(null)}
      />
    </SafeAreaView>
  );
}
