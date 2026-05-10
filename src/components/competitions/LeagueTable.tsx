import { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { computeStandings } from '@/utils/standingsCalculator';
import { useLeagueTopScorers } from '@/hooks/db/useLeagueTopScorers';
import { useLeagueTopAssisters } from '@/hooks/db/useLeagueTopAssisters';
import type { Fixture } from '@/stores/fixtureStore';
import type { WorldClub } from '@/types/world';
import type { Player } from '@/types/player';

const PROMOTION_GREEN = '#4CAF50';

export interface LeagueTableProps {
  fixtures: Fixture[];
  clubs: { id: string; name: string }[];
  ampClubId?: string;
  ampName?: string;
  promotionSpots?: number | null;
  /** Number of bottom positions that are in the relegation zone (= promotionSpots of the league one tier below). */
  relegationSpots?: number | null;
  onClubPress?: (clubId: string) => void;
  worldClubs?: Record<string, WorldClub>;
  ampSquad?: Player[];
}

// ─── Stat entry used for scorers/assisters ────────────────────────────────────
interface StatEntry {
  id: string;
  name: string;
  clubName: string;
  position: string;
  goals: number;
  assists: number;
}

// ─── Form result entry ────────────────────────────────────────────────────────
interface FormEntry {
  clubId: string;
  name: string;
  isAmp: boolean;
  pts: number;
  form: Array<'W' | 'D' | 'L'>;
}

const FORM_COLOR: Record<'W' | 'D' | 'L', string> = {
  W: '#4CAF50',
  D: WK.yellow,
  L: WK.red,
};

export function LeagueTable({ fixtures, clubs, ampClubId, ampName, promotionSpots, relegationSpots, onClubPress, worldClubs, ampSquad }: LeagueTableProps) {
  const clubNameMap = useMemo(() => {
    const map = new Map<string, string>(clubs.map((c) => [c.id, c.name]));
    // Supplement from worldClubs — overrides any club where name === id (bad fallback from buildLeagueSnapshot)
    if (worldClubs) {
      for (const [id, wc] of Object.entries(worldClubs)) {
        if (!map.has(id) || map.get(id) === id) map.set(id, wc.name);
      }
    }
    if (ampClubId && ampName) map.set(ampClubId, ampName);
    return map;
  }, [clubs, ampClubId, ampName, worldClubs]);

  // Derive the active season from the fixture data itself — more reliable than weekNumber / 38
  const currentSeasonNumber = useMemo(() => {
    if (fixtures.length === 0) return 1;
    return Math.max(...fixtures.map((f) => f.season));
  }, [fixtures]);

  // Only consider fixtures from the active season (handles multi-season fixture stores)
  const currentFixtures = useMemo(() =>
    fixtures.filter((f) => f.season === currentSeasonNumber),
    [fixtures, currentSeasonNumber],
  );

  const rows = useMemo(() => computeStandings(currentFixtures, clubs, ampClubId), [currentFixtures, clubs, ampClubId]);

  // Derive the league ID from current fixtures for leagueStatsStore queries
  const leagueId = useMemo(() =>
    currentFixtures.length > 0 ? currentFixtures[0].leagueId : null,
    [currentFixtures],
  );

  const { data: rawTopScorers } = useLeagueTopScorers(leagueId ?? '', currentSeasonNumber);
  const { data: rawTopAssisters } = useLeagueTopAssisters(leagueId ?? '', currentSeasonNumber);

  // ── Resolve player names/positions from SQLite hook data ────────────────────
  const ampSquadMap = useMemo(
    () => new Map<string, Player>(ampSquad?.map((p) => [p.id, p]) ?? []),
    [ampSquad],
  );

  const resolveEntry = useMemo(() => (
    (playerId: string, goals: number, assists: number): StatEntry | null => {
      const ampPlayer = ampSquadMap.get(playerId);
      if (ampPlayer) {
        // Find the most recent club for this player from worldClubs or use ampClubId
        const clubId = ampClubId ?? '';
        const clubName = clubNameMap.get(clubId) ?? clubId;
        return { id: playerId, name: ampPlayer.name, clubName, position: ampPlayer.position, goals, assists };
      }
      // Search NPC clubs
      if (worldClubs) {
        for (const [clubId, wc] of Object.entries(worldClubs)) {
          const npcPlayer = wc.players.find((p) => p.id === playerId);
          if (npcPlayer) {
            const clubName = clubNameMap.get(clubId) ?? clubId;
            return {
              id: playerId,
              name: `${npcPlayer.firstName} ${npcPlayer.lastName}`,
              clubName,
              position: npcPlayer.position === 'ATT' ? 'FWD' : npcPlayer.position,
              goals,
              assists,
            };
          }
        }
      }
      return null;
    }
  ), [ampSquadMap, ampClubId, clubNameMap, worldClubs]);

  const topScorers = useMemo((): StatEntry[] => {
    if (!rawTopScorers) return [];
    return rawTopScorers
      .filter((r) => r.goals > 0)
      .slice(0, 4)
      .map((r) => resolveEntry(r.playerId, r.goals, r.assists))
      .filter((e): e is StatEntry => e !== null);
  }, [rawTopScorers, resolveEntry]);

  const topAssisters = useMemo((): StatEntry[] => {
    if (!rawTopAssisters) return [];
    return rawTopAssisters
      .filter((r) => r.assists > 0)
      .slice(0, 4)
      .map((r) => resolveEntry(r.playerId, r.goals, r.assists))
      .filter((e): e is StatEntry => e !== null);
  }, [rawTopAssisters, resolveEntry]);

  // ── Form table (last 5 matches per club) ────────────────────────────────────
  const formTable = useMemo((): FormEntry[] => {
    return clubs
      .map(({ id: clubId }) => {
        const isAmp = clubId === ampClubId;
        const name = clubNameMap.get(clubId) ?? clubId;
        const clubFixtures = currentFixtures
          .filter((f) => f.result !== null && (f.homeClubId === clubId || f.awayClubId === clubId))
          .sort((a, b) => b.round - a.round)
          .slice(0, 5);
        let pts = 0;
        const form: Array<'W' | 'D' | 'L'> = [];
        for (const f of clubFixtures) {
          const isHome = f.homeClubId === clubId;
          const gf = isHome ? (f.result!.homeGoals) : (f.result!.awayGoals);
          const ga = isHome ? (f.result!.awayGoals) : (f.result!.homeGoals);
          const outcome: 'W' | 'D' | 'L' = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
          if (outcome === 'W') pts += 3;
          else if (outcome === 'D') pts += 1;
          form.unshift(outcome);
        }
        return { clubId, name, isAmp, pts, form };
      })
      .filter((r) => r.form.length > 0)
      .sort((a, b) => b.pts - a.pts);
  }, [currentFixtures, clubs, ampClubId, clubNameMap]);

  const mostOnForm = formTable[0] ?? null;

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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {rows.map((row, index) => {
          const pos = index + 1;
          const isAmp = !!ampClubId && row.clubId === ampClubId;
          const isPromotion = promotionSpots != null && pos <= promotionSpots;
          const isRelegation = relegationSpots != null && relegationSpots > 0 && pos > rows.length - relegationSpots;
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
                  borderLeftWidth: (isPromotion || isRelegation) ? 3 : 0,
                  borderLeftColor: isRelegation ? WK.red : PROMOTION_GREEN,
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

        {/* ── On-Form Card ─────────────────────────────────────────────── */}
        {mostOnForm && (
          <View style={{ marginTop: 16, marginHorizontal: 10 }}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
              ...pixelShadow,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
                backgroundColor: WK.tealDark,
              }}>
                <PixelText size={8} color={WK.yellow} style={{ flex: 1 }}>ON FORM</PixelText>
                <PixelText size={7} color={WK.dim}>LAST {mostOnForm.form.length} MATCHES</PixelText>
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 12,
                gap: 10,
              }}>
                <BodyText
                  size={13}
                  style={{ flex: 1, color: mostOnForm.isAmp ? WK.yellow : WK.text }}
                  numberOfLines={1}
                >
                  {mostOnForm.name}{mostOnForm.isAmp ? ' ★' : ''}
                </BodyText>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {mostOnForm.form.map((r, i) => (
                    <View key={i} style={{
                      width: 20, height: 20,
                      backgroundColor: FORM_COLOR[r],
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1, borderColor: WK.border,
                    }}>
                      <PixelText size={7} color={WK.text}>{r}</PixelText>
                    </View>
                  ))}
                </View>
                <VT323Text size={18} color={WK.yellow} style={{ minWidth: 32, textAlign: 'right' }}>
                  {mostOnForm.pts} PTS
                </VT323Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Top Scorers Card ─────────────────────────────────────────── */}
        {topScorers.length > 0 && (
          <View style={{ marginTop: 12, marginHorizontal: 10 }}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
              ...pixelShadow,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
                backgroundColor: WK.tealDark,
              }}>
                <PixelText size={8} color={WK.yellow} style={{ flex: 1 }}>GOLDEN BOOT</PixelText>
                <PixelText size={7} color={WK.dim}>GOALS</PixelText>
              </View>
              {topScorers.map((p, i) => (
                <View key={p.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderBottomWidth: i < topScorers.length - 1 ? 2 : 0,
                  borderBottomColor: WK.border,
                  gap: 8,
                }}>
                  <VT323Text size={18} color={i === 0 ? WK.yellow : WK.dim} style={{ width: 20 }}>
                    {i + 1}
                  </VT323Text>
                  <View style={{
                    paddingHorizontal: 5, paddingVertical: 2,
                    borderWidth: 1, borderColor: WK.border,
                    backgroundColor: WK.tealDark,
                  }}>
                    <PixelText size={7} color={WK.dim}>{p.position}</PixelText>
                  </View>
                  <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
                    {p.name}
                  </BodyText>
                  <BodyText size={11} dim numberOfLines={1} style={{ maxWidth: 80 }}>
                    {p.clubName}
                  </BodyText>
                  <VT323Text size={20} color={FORM_COLOR.W} style={{ minWidth: 28, textAlign: 'right' }}>
                    {p.goals}
                  </VT323Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Top Assisters Card ───────────────────────────────────────── */}
        {topAssisters.length > 0 && (
          <View style={{ marginTop: 12, marginHorizontal: 10 }}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
              ...pixelShadow,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
                backgroundColor: WK.tealDark,
              }}>
                <PixelText size={8} color={WK.yellow} style={{ flex: 1 }}>TOP ASSISTS</PixelText>
                <PixelText size={7} color={WK.dim}>ASSISTS</PixelText>
              </View>
              {topAssisters.map((p, i) => (
                <View key={p.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderBottomWidth: i < topAssisters.length - 1 ? 2 : 0,
                  borderBottomColor: WK.border,
                  gap: 8,
                }}>
                  <VT323Text size={18} color={i === 0 ? WK.yellow : WK.dim} style={{ width: 20 }}>
                    {i + 1}
                  </VT323Text>
                  <View style={{
                    paddingHorizontal: 5, paddingVertical: 2,
                    borderWidth: 1, borderColor: WK.border,
                    backgroundColor: WK.tealDark,
                  }}>
                    <PixelText size={7} color={WK.dim}>{p.position}</PixelText>
                  </View>
                  <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
                    {p.name}
                  </BodyText>
                  <BodyText size={11} dim numberOfLines={1} style={{ maxWidth: 80 }}>
                    {p.clubName}
                  </BodyText>
                  <VT323Text size={20} color={WK.tealLight} style={{ minWidth: 28, textAlign: 'right' }}>
                    {p.assists}
                  </VT323Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
