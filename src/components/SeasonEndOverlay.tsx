import { useMemo, useState, useEffect, useRef } from 'react';
import { View, Modal, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useClubStore } from '@/stores/clubStore';
import {
  performSeasonTransition,
  type SeasonTransitionSnapshot,
  type SeasonStanding,
} from '@/engine/SeasonTransitionService';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';

interface Props {
  visible: boolean;
  onComplete: () => void;
}

export function SeasonEndOverlay({ visible, onComplete }: Props) {
  const [isLoading, setIsLoading]                   = useState(false);
  const [hasError, setHasError]                     = useState(false);
  const processedRef                                = useRef(false);

  const [displayStandings,      setDisplayStandings]      = useState<SeasonStanding[]>([]);
  const [displayPromotionSpots, setDisplayPromotionSpots] = useState<number | null>(null);
  const [displayLeagueName,     setDisplayLeagueName]     = useState('');

  useEffect(() => {
    if (visible && !processedRef.current) {
      processedRef.current = true;
      void handleTransition();
    }
    if (!visible) {
      processedRef.current = false;
      setDisplayStandings([]);
      setDisplayPromotionSpots(null);
      setDisplayLeagueName('');
      setHasError(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const league   = useLeagueStore((s) => s.league);
  const fixtures = useFixtureStore((s) => s.fixtures);
  const club     = useClubStore((s) => s.club);
  const ampClubId = club.id;

  const standings = useMemo<SeasonStanding[]>(() => {
    if (!league) return [];
    const npcClubs = league.clubs;
    const allIds   = [ampClubId, ...npcClubs.map((c) => c.id)];

    const map: Record<string, SeasonStanding> = {};
    for (const id of allIds) {
      const isAmp = id === ampClubId;
      const snap  = npcClubs.find((c) => c.id === id);
      map[id] = {
        id,
        name:         isAmp ? club.name         : (snap?.name         ?? id),
        primaryColor: isAmp ? (club.primaryColor ?? WK.tealLight) : (snap?.primaryColor ?? '#888888'),
        pts: 0, gd: 0, gf: 0, ga: 0, played: 0, wins: 0, draws: 0, losses: 0,
      };
    }

    for (const f of fixtures.filter((fx) => fx.leagueId === league.id && fx.result)) {
      const { homeGoals, awayGoals } = f.result!;
      const home = map[f.homeClubId];
      const away = map[f.awayClubId];
      if (!home || !away) continue;
      home.played++; away.played++;
      home.gf += homeGoals; home.ga += awayGoals; home.gd += homeGoals - awayGoals;
      away.gf += awayGoals; away.ga += homeGoals; away.gd += awayGoals - homeGoals;
      if (homeGoals > awayGoals)      { home.pts += 3; home.wins++;  away.losses++; }
      else if (homeGoals < awayGoals) { away.pts += 3; away.wins++;  home.losses++; }
      else                            { home.pts += 1; away.pts += 1; home.draws++; away.draws++; }
    }

    return Object.values(map).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }, [league, fixtures, ampClubId, club.name, club.primaryColor]);

  const dispAmpIndex  = displayStandings.findIndex((s) => s.id === ampClubId);
  const dispAmpPos    = dispAmpIndex + 1;
  const dispAmpEntry  = displayStandings[dispAmpIndex] ?? null;
  const dispPromoted  = displayPromotionSpots != null && dispAmpPos > 0 && dispAmpPos <= displayPromotionSpots;
  const dispRelegated = displayStandings.length > 0 && dispAmpPos === displayStandings.length;
  const posColor      = dispPromoted ? WK.green : dispRelegated ? WK.red : WK.yellow;
  const posLabel      = dispPromoted ? 'PROMOTED!' : dispRelegated ? 'RELEGATED' : `#${dispAmpPos}`;

  async function handleTransition() {
    // processedRef (in useEffect) is the double-invocation guard.
    setIsLoading(true);
    setHasError(false);

    const capturedStandings = standings;
    const currentLeague     = useLeagueStore.getState().league;
    const currentSeason     = currentLeague?.season ?? 1;
    const capturedAmpIndex  = capturedStandings.findIndex((s) => s.id === ampClubId);
    const capturedAmpPos    = capturedAmpIndex + 1;
    const capturedAmpEntry  = capturedStandings[capturedAmpIndex] ?? null;

    setDisplayStandings(capturedStandings);
    setDisplayPromotionSpots(currentLeague?.promotionSpots ?? null);
    setDisplayLeagueName(currentLeague?.name ?? '');

    try {
      if (!currentLeague || !capturedAmpEntry) return;

      const snapshot: SeasonTransitionSnapshot = {
        currentLeague,
        currentSeason,
        finalPosition:    capturedAmpPos,
        promoted:         currentLeague.promotionSpots != null
                            && capturedAmpPos > 0
                            && capturedAmpPos <= currentLeague.promotionSpots,
        relegated:        capturedStandings.length > 0 && capturedAmpPos === capturedStandings.length,
        weekNumber:       useClubStore.getState().club.weekNumber ?? 1,
        gamesPlayed:      capturedAmpEntry.played,
        wins:             capturedAmpEntry.wins,
        draws:            capturedAmpEntry.draws,
        losses:           capturedAmpEntry.losses,
        goalsFor:         capturedAmpEntry.gf,
        goalsAgainst:     capturedAmpEntry.ga,
        points:           capturedAmpEntry.pts,
        displayStandings: capturedStandings,
      };

      // Season transition requires a server response — no offline fallback by design.
      // On failure, the user can retry via the error footer's TRY AGAIN button.
      await performSeasonTransition(snapshot);
    } catch (err) {
      console.warn('[SeasonEndOverlay] conclude-season failed:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 16 }}>
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 4,
          borderColor: WK.yellow,
          maxHeight: '90%',
          ...pixelShadow,
        }}>

          {/* ── Header ── */}
          <View style={{ padding: 16, borderBottomWidth: 3, borderBottomColor: WK.border, alignItems: 'center', gap: 8 }}>
            <Trophy size={28} color={WK.yellow} />
            <PixelText size={14} color={WK.yellow} upper>Season Over</PixelText>
            {displayLeagueName ? (
              <BodyText size={12} dim numberOfLines={1}>{displayLeagueName.toUpperCase()}</BodyText>
            ) : null}
          </View>

          {/* ── AMP summary ── */}
          {dispAmpEntry && (
            <View style={{
              flexDirection: 'row', justifyContent: 'space-around',
              paddingVertical: 12, paddingHorizontal: 16,
              borderBottomWidth: 3, borderBottomColor: WK.border,
              backgroundColor: WK.yellow + '12',
            }}>
              <View style={{ alignItems: 'center' }}>
                <PixelText size={18} color={posColor}>{posLabel}</PixelText>
                <BodyText size={10} dim style={{ marginTop: 2 }}>POSITION</BodyText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <PixelText size={18} color={WK.tealLight}>{dispAmpEntry.pts}</PixelText>
                <BodyText size={10} dim style={{ marginTop: 2 }}>POINTS</BodyText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <PixelText size={14} color={WK.text}>
                  {dispAmpEntry.wins}W {dispAmpEntry.draws}D {dispAmpEntry.losses}L
                </PixelText>
                <BodyText size={10} dim style={{ marginTop: 2 }}>RECORD</BodyText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <PixelText size={14} color={WK.text}>{dispAmpEntry.gf}-{dispAmpEntry.ga}</PixelText>
                <BodyText size={10} dim style={{ marginTop: 2 }}>GOALS</BodyText>
              </View>
            </View>
          )}

          {/* ── League Table ── */}
          <View style={{ paddingHorizontal: 12, paddingTop: 8, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4 }}>
              <BodyText size={10} dim style={{ width: 28 }}>#</BodyText>
              <BodyText size={10} dim style={{ flex: 1 }}>CLUB</BodyText>
              <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>PL</BodyText>
              <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>GD</BodyText>
              <BodyText size={10} dim style={{ width: 36, textAlign: 'right' }}>PTS</BodyText>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {displayStandings.map((entry, i) => {
              const isAmp = entry.id === ampClubId;
              return (
                <View key={entry.id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 6, paddingHorizontal: 4,
                  borderBottomWidth: i < displayStandings.length - 1 ? 1 : 0,
                  borderBottomColor: WK.border,
                  backgroundColor: isAmp ? WK.yellow + '1A' : 'transparent',
                }}>
                  <BodyText size={12} color={isAmp ? WK.yellow : WK.dim} style={{ width: 28 }}>{i + 1}</BodyText>
                  <View style={{ width: 10, height: 10, backgroundColor: entry.primaryColor, borderWidth: 1, borderColor: WK.border, marginRight: 6 }} />
                  <BodyText size={13} color={isAmp ? WK.yellow : WK.text} style={{ flex: 1 }} numberOfLines={1}>
                    {entry.name.toUpperCase()}
                  </BodyText>
                  <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>{entry.played}</BodyText>
                  <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>
                    {entry.gd > 0 ? `+${entry.gd}` : entry.gd}
                  </BodyText>
                  <BodyText size={12} color={isAmp ? WK.yellow : WK.text} style={{ width: 36, textAlign: 'right' }}>{entry.pts}</BodyText>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Footer ── */}
          <View style={{ padding: 16, borderTopWidth: 3, borderTopColor: WK.border }}>
            {isLoading ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <PixelText size={8} color={WK.yellow}>PREPARING NEXT SEASON...</PixelText>
              </View>
            ) : hasError ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <PixelText size={7} color={WK.red} style={{ textAlign: 'center' }}>
                  SEASON TRANSITION FAILED
                </PixelText>
                <BodyText size={12} dim style={{ textAlign: 'center' }}>
                  Check your connection and try again.
                </BodyText>
                <Button
                  label="TRY AGAIN"
                  variant="yellow"
                  fullWidth
                  onPress={() => {
                    processedRef.current = false;
                    setHasError(false);
                    void handleTransition();
                  }}
                />
              </View>
            ) : (
              <Button label="CONTINUE TO NEXT SEASON" variant="yellow" fullWidth onPress={onComplete} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
