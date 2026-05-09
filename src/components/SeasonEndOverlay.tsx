import { useMemo, useState, useEffect, useRef } from 'react';
import { View, Modal, ScrollView, Pressable } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useLeagueStore } from '@/stores/leagueStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useClubStore } from '@/stores/clubStore';
import { useWorldStore } from '@/stores/worldStore';
import {
  performSeasonTransition,
  type SeasonTransitionSnapshot,
  type SeasonStanding,
} from '@/engine/SeasonTransitionService';
import { buildSeasonReviewData, type TierReview } from '@/utils/seasonReviewUtils';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';

interface Props {
  visible: boolean;
  onComplete: () => void;
}

type Phase = 'loading' | 'error' | 'slides';
type SlideData = { type: 'tier'; review: TierReview } | { type: 'amp_summary' };

// ─── Tier slide ───────────────────────────────────────────────────────────────

function StatRow({ name, club, value, color }: { name: string; club: string; value: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
      <BodyText size={12} numberOfLines={1} style={{ flex: 3, minWidth: 0 }}>{name}</BodyText>
      <BodyText size={11} color={WK.dim} numberOfLines={1} style={{ flex: 3, minWidth: 0 }}>{club}</BodyText>
      <VT323Text size={18} color={color} style={{ width: 32, textAlign: 'right', flexShrink: 0 }}>{value}</VT323Text>
    </View>
  );
}

function TierSlide({ review }: { review: TierReview }) {
  const hasPromo    = review.promotedClubs.length > 0;
  const hasReleg    = review.relegatedClubs.length > 0;
  const hasGoals    = review.goldenBoot.length > 0;
  const hasAssists  = review.mostAssists.length > 0;
  const hasWinners  = (review.winners?.length ?? 0) > 0;

  return (
    <View style={{ gap: 16 }}>

      {/* ── League Champion(s) ─────────────────────────────────────────── */}
      {hasWinners && (review.winners ?? []).map((w) => (
        <View
          key={w.clubId}
          style={{
            borderWidth: 3,
            borderColor: WK.yellow,
            backgroundColor: WK.yellow + '18',
            paddingVertical: 14,
            paddingHorizontal: 12,
            alignItems: 'center',
            gap: 6,
            ...pixelShadow,
          }}
        >
          {/* League name above */}
          {review.winners.length > 1 && (
            <BodyText size={10} dim style={{ marginBottom: 2 }}>
              {w.leagueName.toUpperCase()}
            </BodyText>
          )}
          {/* Trophy + label row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Trophy size={20} color={WK.yellow} />
            <PixelText size={7} color={WK.yellow}>CHAMPIONS</PixelText>
            <Trophy size={20} color={WK.yellow} />
          </View>
          {/* Club name — hero text */}
          <PixelText size={11} color={WK.text} style={{ textAlign: 'center', marginTop: 4 }}>
            {w.clubName.toUpperCase()}
          </PixelText>
        </View>
      ))}

      {/* Promoted */}
      {hasPromo && (
        <View style={{ gap: 4 }}>
          <PixelText size={7} color={WK.green} style={{ marginBottom: 4 }}>▲ PROMOTED</PixelText>
          {review.promotedClubs.map(({ clubId, clubName }) => (
            <View key={clubId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: WK.green }} />
              <BodyText size={13} color={WK.text} numberOfLines={1} style={{ flex: 1 }}>
                {clubName.toUpperCase()}
              </BodyText>
            </View>
          ))}
        </View>
      )}

      {/* Relegated */}
      {hasReleg && (
        <View style={{ gap: 4 }}>
          <PixelText size={7} color={WK.red} style={{ marginBottom: 4 }}>▼ RELEGATED</PixelText>
          {review.relegatedClubs.map(({ clubId, clubName }) => (
            <View key={clubId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: WK.red }} />
              <BodyText size={13} color={WK.text} numberOfLines={1} style={{ flex: 1 }}>
                {clubName.toUpperCase()}
              </BodyText>
            </View>
          ))}
        </View>
      )}

      {/* Golden Boot */}
      {hasGoals && (
        <View style={{ gap: 2 }}>
          <PixelText size={7} color={WK.yellow} style={{ marginBottom: 6 }}>GOLDEN BOOT</PixelText>
          {/* Column headers */}
          <View style={{ flexDirection: 'row', paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: WK.border }}>
            <VT323Text size={13} color={WK.dim} style={{ flex: 3 }}>PLAYER</VT323Text>
            <VT323Text size={13} color={WK.dim} style={{ flex: 3 }}>CLUB</VT323Text>
            <VT323Text size={13} color={WK.dim} style={{ width: 32, textAlign: 'right', flexShrink: 0 }}>G</VT323Text>
          </View>
          {review.goldenBoot.map((entry, i) => (
            <StatRow key={i} name={entry.playerName} club={entry.clubName} value={entry.goals} color={WK.yellow} />
          ))}
        </View>
      )}

      {/* Most Assists */}
      {hasAssists && (
        <View style={{ gap: 2 }}>
          <PixelText size={7} color={WK.tealLight} style={{ marginBottom: 6 }}>MOST ASSISTS</PixelText>
          <View style={{ flexDirection: 'row', paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: WK.border }}>
            <VT323Text size={13} color={WK.dim} style={{ flex: 3 }}>PLAYER</VT323Text>
            <VT323Text size={13} color={WK.dim} style={{ flex: 3 }}>CLUB</VT323Text>
            <VT323Text size={13} color={WK.dim} style={{ width: 32, textAlign: 'right', flexShrink: 0 }}>A</VT323Text>
          </View>
          {review.mostAssists.map((entry, i) => (
            <StatRow key={i} name={entry.playerName} club={entry.clubName} value={entry.assists} color={WK.tealLight} />
          ))}
        </View>
      )}

      {!hasPromo && !hasReleg && !hasGoals && !hasAssists && (
        <PixelText size={7} dim style={{ textAlign: 'center' }}>NO DATA RECORDED</PixelText>
      )}

    </View>
  );
}

// ─── AMP summary slide ────────────────────────────────────────────────────────

function AmpSummarySlide({
  leagueName,
  ampEntry,
  posLabel,
  posColor,
  standings,
  ampClubId,
}: {
  leagueName: string;
  ampEntry: SeasonStanding | null;
  posLabel: string;
  posColor: string;
  standings: SeasonStanding[];
  ampClubId: string;
}) {
  return (
    <View style={{ gap: 12 }}>

      {leagueName ? (
        <BodyText size={12} dim style={{ textAlign: 'center' }}>{leagueName.toUpperCase()}</BodyText>
      ) : null}

      {/* Position status — sits under the league name, above the stats grid */}
      {posLabel ? (
        <PixelText size={14} color={posColor} style={{ textAlign: 'center' }}>
          {posLabel}
        </PixelText>
      ) : null}

      {/* AMP headline stats */}
      {ampEntry && (
        <View style={{ borderWidth: 2, borderColor: WK.yellow, backgroundColor: WK.yellow + '12' }}>

          {/* Row 1 — Points · Goals */}
          <View style={{
            flexDirection: 'row',
            borderBottomWidth: 2,
            borderBottomColor: WK.border,
          }}>
            {[
              { label: 'POINTS', value: String(ampEntry.pts),            color: WK.tealLight },
              { label: 'GOALS',  value: `${ampEntry.gf}-${ampEntry.ga}`, color: WK.text      },
            ].map(({ label, value, color }, i, arr) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRightWidth: i < arr.length - 1 ? 1 : 0,
                  borderRightColor: WK.border,
                }}
              >
                <PixelText size={16} color={color}>{value}</PixelText>
                <BodyText size={10} dim style={{ marginTop: 3 }}>{label}</BodyText>
              </View>
            ))}
          </View>

          {/* Row 2 — W · D · L stacked */}
          <View style={{ flexDirection: 'row' }}>
            {[
              { label: 'W', value: ampEntry.wins,   color: WK.green },
              { label: 'D', value: ampEntry.draws,  color: WK.dim   },
              { label: 'L', value: ampEntry.losses, color: WK.red   },
            ].map(({ label, value, color }, i, arr) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRightWidth: i < arr.length - 1 ? 1 : 0,
                  borderRightColor: WK.border,
                }}
              >
                <PixelText size={18} color={color}>{value}</PixelText>
                <BodyText size={10} dim style={{ marginTop: 3 }}>{label}</BodyText>
              </View>
            ))}
          </View>

        </View>
      )}

      {/* League table */}
      <View>
        {/* Column headers */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 4,
          paddingBottom: 6,
          borderBottomWidth: 2,
          borderBottomColor: WK.border,
        }}>
          <BodyText size={10} dim style={{ width: 26 }}>#</BodyText>
          <BodyText size={10} dim style={{ flex: 1 }}>CLUB</BodyText>
          <BodyText size={10} dim style={{ width: 30, textAlign: 'right' }}>PL</BodyText>
          <BodyText size={10} dim style={{ width: 30, textAlign: 'right' }}>GD</BodyText>
          <BodyText size={10} dim style={{ width: 34, textAlign: 'right' }}>PTS</BodyText>
        </View>

        {standings.map((entry, i) => {
          const isAmp = entry.id === ampClubId;
          return (
            <View
              key={entry.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
                paddingHorizontal: 4,
                borderBottomWidth: i < standings.length - 1 ? 1 : 0,
                borderBottomColor: WK.border,
                backgroundColor: isAmp ? WK.yellow + '1A' : 'transparent',
              }}
            >
              <BodyText size={12} color={isAmp ? WK.yellow : WK.dim} style={{ width: 26 }}>{i + 1}</BodyText>
              <View style={{ width: 10, height: 10, backgroundColor: entry.primaryColor, borderWidth: 1, borderColor: WK.border, marginRight: 6 }} />
              <BodyText size={13} color={isAmp ? WK.yellow : WK.text} style={{ flex: 1 }} numberOfLines={1}>
                {entry.name.toUpperCase()}
              </BodyText>
              <BodyText size={12} dim style={{ width: 30, textAlign: 'right' }}>{entry.played}</BodyText>
              <BodyText size={12} dim style={{ width: 30, textAlign: 'right' }}>
                {entry.gd > 0 ? `+${entry.gd}` : entry.gd}
              </BodyText>
              <BodyText size={12} color={isAmp ? WK.yellow : WK.text} style={{ width: 34, textAlign: 'right' }}>
                {entry.pts}
              </BodyText>
            </View>
          );
        })}
      </View>

    </View>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function SeasonEndOverlay({ visible, onComplete }: Props) {
  const [phase, setPhase]                         = useState<Phase>('loading');
  const processedRef                              = useRef(false);

  const [displayStandings,      setDisplayStandings]      = useState<SeasonStanding[]>([]);
  const [displayPromotionSpots, setDisplayPromotionSpots] = useState<number | null>(null);
  const [displayLeagueName,     setDisplayLeagueName]     = useState('');
  const [reviewData,            setReviewData]            = useState<TierReview[]>([]);
  const [slideIndex,            setSlideIndex]            = useState(0);

  const league       = useLeagueStore((s) => s.league);
  const fixtures     = useFixtureStore((s) => s.fixtures);
  const club         = useClubStore((s) => s.club);
  const worldLeagues = useWorldStore((s) => s.leagues);
  const ampClubId    = club.id;

  const relegationSpots = useMemo(() => {
    if (!league) return 0;
    const leagueBelow = worldLeagues.find(
      (l) => l.tier === league.tier + 1 && (league.country == null || l.country === league.country),
    );
    return leagueBelow?.promotionSpots ?? 0;
  }, [league, worldLeagues]);

  // Compute live standings from fixtures (same logic as before — used to capture snapshot).
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

  useEffect(() => {
    if (visible && !processedRef.current) {
      processedRef.current = true;

      // Capture season review data BEFORE performSeasonTransition clears the fixture store.
      const currentLeague  = useLeagueStore.getState().league;
      const capturedSeason = currentLeague?.season ?? 1;
      setReviewData(buildSeasonReviewData(capturedSeason));

      void handleTransition();
    }
    if (!visible) {
      processedRef.current = false;
      setDisplayStandings([]);
      setDisplayPromotionSpots(null);
      setDisplayLeagueName('');
      setReviewData([]);
      setSlideIndex(0);
      setPhase('loading');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTransition() {
    setPhase('loading');

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

      const retirementCfg = useGameConfigStore.getState().config;
      const snapshot: SeasonTransitionSnapshot = {
        currentLeague,
        currentSeason,
        finalPosition:    capturedAmpPos,
        promoted:         currentLeague.promotionSpots != null
                            && capturedAmpPos > 0
                            && capturedAmpPos <= currentLeague.promotionSpots,
        relegated:        relegationSpots > 0 && capturedAmpPos > 0
                            && capturedAmpPos > (capturedStandings.length - relegationSpots),
        weekNumber:       useClubStore.getState().club.weekNumber ?? 1,
        gamesPlayed:      capturedAmpEntry.played,
        wins:             capturedAmpEntry.wins,
        draws:            capturedAmpEntry.draws,
        losses:           capturedAmpEntry.losses,
        goalsFor:         capturedAmpEntry.gf,
        goalsAgainst:     capturedAmpEntry.ga,
        points:           capturedAmpEntry.pts,
        displayStandings: capturedStandings,
        retirementMinAge: retirementCfg.retirementMinAge,
        retirementMaxAge: retirementCfg.retirementMaxAge,
        retirementChance: retirementCfg.retirementChance,
      };

      await performSeasonTransition(snapshot);
      setPhase('slides');
    } catch (err) {
      console.warn('[SeasonEndOverlay] conclude-season failed:', err);
      setPhase('error');
    }
  }

  // Build slides: tier 8 → tier 1 (highest tier number first), then AMP summary.
  const slides = useMemo<SlideData[]>(() => {
    const tierSlides: SlideData[] = [...reviewData]
      .sort((a, b) => b.tier - a.tier)
      .map((review) => ({ type: 'tier', review }));
    return [...tierSlides, { type: 'amp_summary' }];
  }, [reviewData]);

  const totalSlides   = slides.length;
  const currentSlide  = slides[slideIndex];
  const isFirstSlide  = slideIndex === 0;
  const isFinalSlide  = slideIndex === totalSlides - 1;

  // AMP position data for the summary slide.
  const dispAmpIndex  = displayStandings.findIndex((s) => s.id === ampClubId);
  const dispAmpPos    = dispAmpIndex + 1;
  const dispAmpEntry  = displayStandings[dispAmpIndex] ?? null;
  const dispPromoted  = displayPromotionSpots != null && dispAmpPos > 0 && dispAmpPos <= displayPromotionSpots;
  const dispRelegated = relegationSpots > 0 && dispAmpPos > 0 && dispAmpPos > (displayStandings.length - relegationSpots);
  const posColor      = dispPromoted ? WK.green : dispRelegated ? WK.red : WK.yellow;
  const posLabel      = dispPromoted ? 'PROMOTED!' : dispRelegated ? 'RELEGATED' : `#${dispAmpPos}`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.93)', justifyContent: 'center', padding: 14 }}>
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 4,
          borderColor: WK.yellow,
          maxHeight: '93%',
          ...pixelShadow,
        }}>

          {/* ── Loading ── */}
          {phase === 'loading' && (
            <View style={{ padding: 40, alignItems: 'center', gap: 16 }}>
              <Trophy size={32} color={WK.yellow} />
              <PixelText size={11} color={WK.yellow}>SEASON OVER</PixelText>
              <PixelText size={7} color={WK.dim} style={{ textAlign: 'center' }}>
                PREPARING REVIEW...
              </PixelText>
            </View>
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <View style={{ padding: 24, gap: 14, alignItems: 'center' }}>
              <Trophy size={24} color={WK.yellow} />
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
                  void handleTransition();
                }}
              />
            </View>
          )}

          {/* ── Slides ── */}
          {phase === 'slides' && currentSlide && (
            <>
              {/* Slide header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 3,
                borderBottomColor: WK.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Trophy size={16} color={WK.yellow} />
                  <PixelText size={8} color={WK.yellow}>
                    {currentSlide.type === 'tier'
                      ? `TIER ${currentSlide.review.tier} REVIEW`
                      : 'YOUR SEASON'}
                  </PixelText>
                </View>
                <PixelText size={7} dim>{slideIndex + 1} / {totalSlides}</PixelText>
              </View>

              {/* Slide body */}
              <ScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 6 }}
                showsVerticalScrollIndicator={false}
              >
                {currentSlide.type === 'tier' && (
                  <TierSlide review={currentSlide.review} />
                )}
                {currentSlide.type === 'amp_summary' && (
                  <AmpSummarySlide
                    leagueName={displayLeagueName}
                    ampEntry={dispAmpEntry}
                    posLabel={posLabel}
                    posColor={posColor}
                    standings={displayStandings}
                    ampClubId={ampClubId}
                  />
                )}
              </ScrollView>

              {/* Navigation footer */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                borderTopWidth: 3,
                borderTopColor: WK.border,
              }}>
                {/* BACK */}
                {!isFirstSlide ? (
                  <Pressable
                    onPress={() => setSlideIndex((i) => i - 1)}
                    style={{
                      flex: 1,
                      borderWidth: 3,
                      borderColor: WK.border,
                      paddingVertical: 13,
                      alignItems: 'center',
                    }}
                  >
                    <PixelText size={8} dim>{'< BACK'}</PixelText>
                  </Pressable>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

                {/* NEXT or CONCLUDE */}
                {!isFinalSlide ? (
                  <Pressable
                    onPress={() => setSlideIndex((i) => i + 1)}
                    style={{
                      flex: 1,
                      backgroundColor: WK.yellow,
                      borderWidth: 3,
                      borderColor: WK.border,
                      paddingVertical: 13,
                      alignItems: 'center',
                    }}
                  >
                    <PixelText size={8} color={WK.border}>{'NEXT >'}</PixelText>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={onComplete}
                    style={{
                      flex: 1,
                      backgroundColor: WK.green,
                      borderWidth: 3,
                      borderColor: WK.border,
                      paddingVertical: 13,
                      alignItems: 'center',
                    }}
                  >
                    <PixelText size={7} color={WK.text}>CONCLUDE SEASON</PixelText>
                  </Pressable>
                )}
              </View>
            </>
          )}

        </View>
      </View>
    </Modal>
  );
}
