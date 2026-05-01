import { useMemo, useState, useEffect, useRef } from 'react';
import { View, Modal, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useClubStore } from '@/stores/clubStore';
import { useWorldStore } from '@/stores/worldStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useLeagueHistoryStore } from '@/stores/leagueHistoryStore';
import { concludeSeason } from '@/api/endpoints/season';
import type { PyramidStanding, PyramidLeague } from '@/api/endpoints/season';
import { uuidv7 } from '@/utils/uuidv7';
import { penceToPounds } from '@/utils/currency';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import type { ClubSnapshot, LeagueSnapshot } from '@/types/api';
import type { SeasonUpdateLeague } from '@/types/world';

interface Standing {
  id: string;
  name: string;
  primaryColor: string;
  pts: number;
  gd: number;
  gf: number;
  ga: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
}

interface Props {
  visible: boolean;
  onComplete: () => void;
}

const VALID_REP_TIERS = ['local', 'regional', 'national', 'elite'] as const;
const LEAGUE_TIER_REP_CAP: Record<string, number> = {
  local: 14, regional: 39, national: 74, elite: 100,
};

/**
 * Build a LeagueSnapshot for leagueStore from a SeasonUpdateLeague entry.
 * Merges slim server club entries with locally stored WorldClub data for full ClubSnapshot fields.
 */
function buildLeagueSnapshot(
  seasonLeague: SeasonUpdateLeague,
  season: number,
): LeagueSnapshot {
  const repTier = (VALID_REP_TIERS as readonly string[]).includes(seasonLeague.reputationTier ?? '')
    ? (seasonLeague.reputationTier as LeagueSnapshot['reputationTier'])
    : null;

  const worldClubs = useWorldStore.getState().clubs;
  const clubs: ClubSnapshot[] = seasonLeague.clubs.map((slim) => {
    const full = worldClubs[slim.id];
    return full
      ? {
          id:             full.id,
          name:           slim.name,
          reputation:     full.reputation,
          tier:           slim.tier,
          primaryColor:   full.primaryColor,
          secondaryColor: full.secondaryColor,
          stadiumName:    full.stadiumName,
          facilities:     full.facilities,
        }
      : {
          id:             slim.id,
          name:           slim.name,
          reputation:     0,
          tier:           slim.tier,
          primaryColor:   '#888888',
          secondaryColor: '#444444',
          stadiumName:    null,
          facilities:     {},
        };
  });

  return {
    id:                            seasonLeague.id,
    tier:                          seasonLeague.tier,
    name:                          seasonLeague.name,
    country:                       seasonLeague.country,
    season,
    promotionSpots:                seasonLeague.promotionSpots,
    reputationTier:                repTier,
    reputationCap:                 repTier ? (LEAGUE_TIER_REP_CAP[repTier] ?? null) : null,
    tvDeal:                        seasonLeague.tvDeal,
    sponsorPot:                    seasonLeague.sponsorPot,
    prizeMoney:                    seasonLeague.prizeMoney,
    leaguePositionPot:             seasonLeague.leaguePositionPot,
    leaguePositionDecreasePercent: seasonLeague.leaguePositionDecreasePercent,
    clubs,
  };
}

/**
 * Compute standings for an NPC league from recorded fixture results.
 * Returns clubs sorted by pts → gd → gf with promoted/relegated flags set.
 */
function buildNpcLeagueStandings(
  leagueId: string,
  clubIds: string[],
  promotionSpots: number | null,
  season: number,
): PyramidStanding[] {
  const allFixtures = useFixtureStore.getState().fixtures;
  const pts: Record<string, number> = {};
  const gd: Record<string, number>  = {};
  const gf: Record<string, number>  = {};
  for (const id of clubIds) { pts[id] = 0; gd[id] = 0; gf[id] = 0; }

  for (const f of allFixtures) {
    if (f.leagueId !== leagueId || f.season !== season || !f.result) continue;
    const { homeGoals, awayGoals } = f.result;
    if (!(f.homeClubId in pts) || !(f.awayClubId in pts)) continue;
    pts[f.homeClubId] += homeGoals > awayGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
    pts[f.awayClubId] += awayGoals > homeGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
    gd[f.homeClubId] += homeGoals - awayGoals;
    gd[f.awayClubId] += awayGoals - homeGoals;
    gf[f.homeClubId] += homeGoals;
    gf[f.awayClubId] += awayGoals;
  }

  const sorted = clubIds.slice().sort(
    (a, b) => (pts[b] - pts[a]) || (gd[b] - gd[a]) || (gf[b] - gf[a]),
  );
  const total = sorted.length;
  return sorted.map((clubId, i) => ({
    clubId,
    isAmp:     false,
    promoted:  promotionSpots != null && (i + 1) <= promotionSpots,
    relegated: (i + 1) === total,
  }));
}

export function SeasonEndOverlay({ visible, onComplete }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  // Tracks whether the conclude-season process has run for the current visible=true period.
  // Resets to false whenever visible transitions back to false so season N+1 re-runs it.
  const processedRef = useRef(false);

  // Snapshot of the completed season — set at the start of performSeasonTransition
  // before store updates wipe fixtures and update the league to the next season.
  const [displayStandings,     setDisplayStandings]     = useState<Standing[]>([]);
  const [displayPromotionSpots, setDisplayPromotionSpots] = useState<number | null>(null);
  const [displayLeagueName,    setDisplayLeagueName]    = useState('');

  useEffect(() => {
    if (visible && !processedRef.current) {
      processedRef.current = true;
      void performSeasonTransition();
    }
    if (!visible) {
      processedRef.current = false;
      setDisplayStandings([]);
      setDisplayPromotionSpots(null);
      setDisplayLeagueName('');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const league   = useLeagueStore((s) => s.league);
  const fixtures = useFixtureStore((s) => s.fixtures);
  const club     = useClubStore((s) => s.club);
  const ampClubId = club.id;

  // Build full standings table from fixture results (used to snapshot at transition start)
  const standings = useMemo<Standing[]>(() => {
    if (!league) return [];

    const npcClubs = league.clubs;
    const allIds   = [ampClubId, ...npcClubs.map((c) => c.id)];

    const map: Record<string, Standing> = {};
    for (const id of allIds) {
      const isAmp = id === ampClubId;
      const snap  = npcClubs.find((c) => c.id === id);
      map[id] = {
        id,
        name:         isAmp ? club.name         : (snap?.name         ?? id),
        primaryColor: isAmp ? (club.primaryColor ?? WK.tealLight) : (snap?.primaryColor ?? '#888888'),
        pts: 0, gd: 0, gf: 0, ga: 0, played: 0,
        wins: 0, draws: 0, losses: 0,
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

  // Display values derived from the snapshot — stable while the overlay is open
  const dispAmpIndex  = displayStandings.findIndex((s) => s.id === ampClubId);
  const dispAmpPos    = dispAmpIndex + 1;
  const dispAmpEntry  = displayStandings[dispAmpIndex] ?? null;
  const dispPromoted  = displayPromotionSpots != null && dispAmpPos > 0 && dispAmpPos <= displayPromotionSpots;
  const dispRelegated = displayStandings.length > 0 && dispAmpPos === displayStandings.length;
  const posColor      = dispPromoted ? WK.green : dispRelegated ? WK.red : WK.yellow;
  const posLabel      = dispPromoted ? 'PROMOTED!' : dispRelegated ? 'RELEGATED' : `#${dispAmpPos}`;

  async function performSeasonTransition() {
    if (isLoading) return;
    setIsLoading(true);

    // Capture current standings + league BEFORE any store mutations so the
    // display snapshot is correct and the API payload uses the completed season's data.
    const capturedStandings  = standings;
    const currentLeague      = useLeagueStore.getState().league;
    const currentSeason      = currentLeague?.season ?? 1;
    const nextSeason         = currentSeason + 1;
    const capturedAmpIndex   = capturedStandings.findIndex((s) => s.id === ampClubId);
    const capturedAmpPos     = capturedAmpIndex + 1;
    const capturedAmpEntry   = capturedStandings[capturedAmpIndex] ?? null;
    const capturedPromoted   = currentLeague?.promotionSpots != null
                                 && capturedAmpPos > 0
                                 && capturedAmpPos <= currentLeague.promotionSpots;
    const capturedRelegated  = capturedStandings.length > 0 && capturedAmpPos === capturedStandings.length;

    // Set display snapshot immediately — fixtures/league will change below
    setDisplayStandings(capturedStandings);
    setDisplayPromotionSpots(currentLeague?.promotionSpots ?? null);
    setDisplayLeagueName(currentLeague?.name ?? '');

    let serverDataApplied = false;

    if (currentLeague && capturedAmpEntry) {
      try {
        const totalClubs = capturedStandings.length;
        const ampLeagueStandings: PyramidStanding[] = capturedStandings.map((s, i) => {
          const pos = i + 1;
          return {
            clubId:    s.id,
            isAmp:     s.id === ampClubId,
            promoted:  currentLeague.promotionSpots != null && pos <= currentLeague.promotionSpots,
            relegated: pos === totalClubs,
          };
        });

        // Include all leagues in the pyramid so the backend can resolve
        // every promotion/relegation across all tiers in one pass.
        const { leagues: worldLeagues } = useWorldStore.getState();
        const pyramidLeagues: PyramidLeague[] = worldLeagues.map((wLeague) => {
          if (wLeague.id === currentLeague.id) {
            return { leagueId: wLeague.id, standings: ampLeagueStandings };
          }
          return {
            leagueId: wLeague.id,
            standings: buildNpcLeagueStandings(
              wLeague.id,
              wLeague.clubIds,
              wLeague.promotionSpots,
              currentSeason,
            ),
          };
        });

        const pyramidSnapshot = { leagues: pyramidLeagues };

        const response = await concludeSeason({
          finalPosition: capturedAmpPos,
          gamesPlayed:   capturedAmpEntry.played,
          wins:          capturedAmpEntry.wins,
          draws:         capturedAmpEntry.draws,
          losses:        capturedAmpEntry.losses,
          goalsFor:      capturedAmpEntry.gf,
          goalsAgainst:  capturedAmpEntry.ga,
          points:        capturedAmpEntry.pts,
          promoted:      capturedPromoted,
          relegated:     capturedRelegated,
          pyramidSnapshot,
        });

        // Update worldStore: refresh league metadata + clubIds, set new ampLeagueId if moved
        const responseLeagues: SeasonUpdateLeague[] = response.leagues ?? [];
        const newAmpLeagueId = capturedPromoted ? (response.newLeague?.id ?? null) : null;
        let ampSeasonLeague: SeasonUpdateLeague | undefined;

        if (responseLeagues.length > 0) {
          await useWorldStore.getState().applySeasonUpdate(responseLeagues, newAmpLeagueId);

          // Find the AMP's next league entry and build its LeagueSnapshot
          const ampLeagueId = newAmpLeagueId ?? currentLeague.id;
          ampSeasonLeague   = responseLeagues.find((l) => l.id === ampLeagueId);

          if (ampSeasonLeague) {
            useLeagueStore.getState().setFromSync(
              buildLeagueSnapshot(ampSeasonLeague, nextSeason),
            );
          } else {
            useLeagueStore.getState().setFromSync({ ...currentLeague, season: nextSeason });
          }

          // Promotion / relegation inbox notification
          if (response.newLeague) {
            const direction = response.newLeague.tier < currentLeague.tier ? 'PROMOTED' : 'RELEGATED';
            useInboxStore.getState().addMessage({
              id:      uuidv7(),
              type:    'system',
              week:    useClubStore.getState().club.weekNumber ?? 1,
              subject: `${direction} — Season ${currentSeason} Complete`,
              body:    `You have been ${direction.toLowerCase()} to ${response.newLeague.name}.`,
              isRead:  false,
            });
          }

          // Load server-generated fixtures for all leagues
          useFixtureStore.getState().clearSeason();
          for (const l of responseLeagues) {
            useFixtureStore.getState().loadFromServerSchedule(l.id, nextSeason, l.fixtures);
          }

          serverDataApplied = true;
        } else {
          useLeagueStore.getState().setFromSync({ ...currentLeague, season: nextSeason });
        }

        // Financial distribution — always fires; uses fresh server data or stored league fallback
        {
          const weekNumber         = useClubStore.getState().club.weekNumber ?? 1;
          const { addTransaction } = useFinanceStore.getState();
          const tvDeal                        = ampSeasonLeague?.tvDeal                        ?? currentLeague?.tvDeal                        ?? 0;
          const sponsorPot                    = ampSeasonLeague?.sponsorPot                    ?? currentLeague?.sponsorPot                    ?? 0;
          const prizeMoney                    = ampSeasonLeague?.prizeMoney                    ?? currentLeague?.prizeMoney                    ?? 0;
          const leaguePositionPot             = ampSeasonLeague?.leaguePositionPot             ?? currentLeague?.leaguePositionPot             ?? 0;
          const leaguePositionDecreasePercent = ampSeasonLeague?.leaguePositionDecreasePercent ?? currentLeague?.leaguePositionDecreasePercent ?? 0;

          if (tvDeal > 0) {
            addTransaction({
              amount:      penceToPounds(tvDeal),
              category:    'tv_deal',
              description: `Season ${nextSeason} TV deal`,
              weekNumber,
            });
          }

          if (sponsorPot > 0) {
            addTransaction({
              amount:      penceToPounds(sponsorPot),
              category:    'league_sponsor',
              description: `Season ${nextSeason} league sponsor`,
              weekNumber,
            });
          }

          if (prizeMoney > 0) {
            addTransaction({
              amount:      penceToPounds(prizeMoney),
              category:    'earnings',
              description: `Season ${currentSeason} prize money (Pos ${capturedAmpPos})`,
              weekNumber,
            });
          }

          const posMultiplier = Math.max(
            0,
            1 - (leaguePositionDecreasePercent / 100) * (capturedAmpPos - 1),
          );
          const posPrize = Math.round(leaguePositionPot * posMultiplier);
          if (posPrize > 0) {
            addTransaction({
              amount:      penceToPounds(posPrize),
              category:    'earnings',
              description: `Season ${currentSeason} position prize (Pos ${capturedAmpPos})`,
              weekNumber,
            });
          }
        }
      } catch (err) {
        console.warn('[SeasonEndOverlay] conclude-season API failed (continuing offline):', err);
      }
    }

    if (!serverDataApplied) {
      // Offline fallback: bump season on current league, regenerate fixtures client-side
      if (currentLeague) {
        useLeagueStore.getState().setFromSync({ ...currentLeague, season: nextSeason });
      }
      const { leagues: worldLeagues, ampLeagueId } = useWorldStore.getState();
      useFixtureStore.getState().clearSeason();
      for (const wLeague of worldLeagues) {
        useFixtureStore.getState().generateFixturesFromWorldLeague(
          wLeague,
          nextSeason,
          wLeague.id === ampLeagueId ? ampClubId : undefined,
        );
      }
    }

    // Record the completed season in local league history (always, regardless of API outcome)
    if (currentLeague && capturedStandings.length > 0) {
      const totalClubs = capturedStandings.length;
      useLeagueHistoryStore.getState().addSeasonRecord({
        tier:          currentLeague.tier,
        leagueName:    currentLeague.name,
        season:        currentSeason,
        weekCompleted: club.weekNumber ?? 1,
        standings:     capturedStandings.map((s, i) => {
          const pos = i + 1;
          return {
            clubId:         s.id,
            clubName:       s.name,
            isAmp:          s.id === ampClubId,
            position:       pos,
            played:         s.played,
            wins:           s.wins,
            draws:          s.draws,
            losses:         s.losses,
            goalsFor:       s.gf,
            goalsAgainst:   s.ga,
            goalDifference: s.gd,
            points:         s.pts,
            promoted:       currentLeague.promotionSpots != null && pos <= currentLeague.promotionSpots,
            relegated:      pos === totalClubs,
          };
        }),
      });
    }

    setIsLoading(false);
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
          <View style={{
            padding: 16,
            borderBottomWidth: 3,
            borderBottomColor: WK.border,
            alignItems: 'center',
            gap: 8,
          }}>
            <Trophy size={28} color={WK.yellow} />
            <PixelText size={14} color={WK.yellow} upper>Season Over</PixelText>
            {displayLeagueName ? (
              <BodyText size={12} dim numberOfLines={1}>{displayLeagueName.toUpperCase()}</BodyText>
            ) : null}
          </View>

          {/* ── AMP summary ── */}
          {dispAmpEntry && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: WK.border,
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
                <PixelText size={14} color={WK.text}>
                  {dispAmpEntry.gf}-{dispAmpEntry.ga}
                </PixelText>
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

          <ScrollView
            style={{ maxHeight: 300 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {displayStandings.map((entry, i) => {
              const isAmp = entry.id === ampClubId;
              return (
                <View
                  key={entry.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 4,
                    borderBottomWidth: i < displayStandings.length - 1 ? 1 : 0,
                    borderBottomColor: WK.border,
                    backgroundColor: isAmp ? WK.yellow + '1A' : 'transparent',
                  }}
                >
                  <BodyText size={12} color={isAmp ? WK.yellow : WK.dim} style={{ width: 28 }}>
                    {i + 1}
                  </BodyText>
                  <View style={{
                    width: 10, height: 10,
                    backgroundColor: entry.primaryColor,
                    borderWidth: 1, borderColor: WK.border,
                    marginRight: 6,
                  }} />
                  <BodyText
                    size={13}
                    color={isAmp ? WK.yellow : WK.text}
                    style={{ flex: 1 }}
                    numberOfLines={1}
                  >
                    {entry.name.toUpperCase()}
                  </BodyText>
                  <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>{entry.played}</BodyText>
                  <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>
                    {entry.gd > 0 ? `+${entry.gd}` : entry.gd}
                  </BodyText>
                  <BodyText size={12} color={isAmp ? WK.yellow : WK.text} style={{ width: 36, textAlign: 'right' }}>
                    {entry.pts}
                  </BodyText>
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
            ) : (
              <Button
                label="CONTINUE TO NEXT SEASON"
                variant="yellow"
                fullWidth
                onPress={onComplete}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
