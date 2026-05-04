import { useState } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { FAB_CLEARANCE } from './_layout';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { WK, pixelShadow } from '@/constants/theme';
import { useClubStore } from '@/stores/clubStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useWorldStore } from '@/stores/worldStore';
import { useSquadStore } from '@/stores/squadStore';
import { getLeaderboard } from '@/api/endpoints/leaderboard';
import { formatCurrencyCompact } from '@/utils/currency';
import { LeagueTable } from '@/components/competitions/LeagueTable';
import { FixtureList } from '@/components/competitions/FixtureList';
import { LeagueBrowser } from '@/components/competitions/LeagueBrowser';
import { SeasonHistory } from '@/components/competitions/SeasonHistory';
import type { LeaderboardEntry } from '@/types/api';

// ─── Leaderboard helpers (ported from world.tsx) ────────────────────────────

type RepTier = 'Local' | 'Regional' | 'National' | 'Elite';

function tierFromRep(reputation: number): RepTier {
  if (reputation >= 75) return 'Elite';
  if (reputation >= 40) return 'National';
  if (reputation >= 15) return 'Regional';
  return 'Local';
}

const TIER_ABBR: Record<RepTier, string> = {
  Local:    'LOC',
  Regional: 'REG',
  National: 'NAT',
  Elite:    'ELT',
};

const TIER_COLOR: Record<RepTier, string> = {
  Local:    WK.dim,
  Regional: '#4CAF50',
  National: '#42A5F5',
  Elite:    WK.yellow,
};

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

// ─── Tab definition ─────────────────────────────────────────────────────────

const COMP_TABS = ['LEAGUE', 'FIXTURES', 'BROWSE', 'RANKINGS', 'HISTORY'] as const;
type CompTab = typeof COMP_TABS[number];

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function CompetitionsScreen() {
  const [activeTab, setActiveTab] = useState<CompTab>('LEAGUE');
  const router = useRouter();

  function handleClubPress(clubId: string) {
    router.push(`/club/${clubId}`);
  }

  const ampClubId       = useClubStore((s) => s.club.id);
  const ampName         = useClubStore((s) => s.club.name);
  const ampStadiumName  = useClubStore((s) => s.club.stadiumName ?? null);
  const weekNumber      = useClubStore((s) => s.club.weekNumber ?? 1);
  const league          = useLeagueStore((s) => s.league);
  const clubs           = useLeagueStore((s) => s.clubs);
  const fixtures        = useFixtureStore((s) => s.fixtures);
  const currentMatchday = useFixtureStore((s) => s.currentMatchday);
  const worldLeagues = useWorldStore((s) => s.leagues);
  const worldClubs   = useWorldStore((s) => s.clubs);
  const ampSquad     = useSquadStore((s) => s.players);

  return (
    <View style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />
      <PixelTopTabBar
        tabs={[...COMP_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as CompTab)}
      />

      {activeTab === 'LEAGUE' && (
        league === null ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
            <PixelText size={9} color={WK.dim}>NO LEAGUE YET</PixelText>
            <BodyText size={13} dim style={{ textAlign: 'center', lineHeight: 20 }}>
              No league assigned yet — sync to get started.
            </BodyText>
          </View>
        ) : (
          <LeagueTable
            fixtures={fixtures}
            clubs={clubs}
            ampClubId={ampClubId}
            ampName={ampName}
            promotionSpots={league.promotionSpots}
            worldClubs={worldClubs}
            ampSquad={ampSquad}
            onClubPress={handleClubPress}
          />
        )
      )}

      {activeTab === 'FIXTURES' && (
        <FixtureList
          fixtures={fixtures}
          clubs={clubs}
          ampClubId={ampClubId}
          ampName={ampName}
          ampStadiumName={ampStadiumName}
          currentMatchday={currentMatchday}
          onClubPress={handleClubPress}
        />
      )}

      {activeTab === 'BROWSE' && (
        <LeagueBrowser
          league={league}
          fixtures={fixtures}
          ampClubId={ampClubId}
          ampName={ampName}
          worldLeagues={worldLeagues}
          worldClubs={worldClubs}
        />
      )}

      {activeTab === 'RANKINGS' && <RankingsPane />}
      {activeTab === 'HISTORY' && <SeasonHistory />}
    </View>
  );
}

// ─── Rankings pane (ported verbatim from world.tsx LeaderboardPane) ──────────

function RankingsPane() {
  const clubName = useClubStore((s) => s.club.name);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['leaderboard', 'club_reputation'],
    queryFn: ({ pageParam }) =>
      getLeaderboard('club_reputation', { page: pageParam as number, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const entries = data?.pages.flatMap((p) => p.entries) ?? [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color={WK.yellow} size="small" />
        <PixelText size={8} color={WK.dim}>LOADING...</PixelText>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 }}>
        <PixelText size={9} color={WK.red}>OFFLINE</PixelText>
        <BodyText size={13} dim style={{ textAlign: 'center', lineHeight: 20 }}>
          Connect to the internet to view the global leaderboard.
        </BodyText>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={9} color={WK.dim}>NO DATA YET</PixelText>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, gap: 6, paddingBottom: FAB_CLEARANCE }}
    >
      <RankingsHeader />
      {entries.map((entry) => (
        <RankingsRow
          key={entry.clubName}
          entry={entry}
          isOwn={entry.clubName === clubName}
        />
      ))}
      {hasNextPage && (
        <Pressable
          onPress={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={[
            {
              marginTop: 8,
              paddingVertical: 12,
              alignItems: 'center',
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
            },
            pixelShadow,
          ]}
        >
          {isFetchingNextPage
            ? <ActivityIndicator color={WK.yellow} size="small" />
            : <PixelText size={8} color={WK.yellow}>LOAD MORE</PixelText>
          }
        </Pressable>
      )}
      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

function RankingsHeader() {
  return (
    <View style={{
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
      marginBottom: 4,
    }}>
      <PixelText size={7} color={WK.dim} style={{ width: 36 }}>#</PixelText>
      <PixelText size={7} color={WK.dim} style={{ flex: 1 }}>CLUB</PixelText>
      <PixelText size={7} color={WK.dim} style={{ width: 36, textAlign: 'right' }}>TIER</PixelText>
      <PixelText size={7} color={WK.dim} style={{ width: 36, textAlign: 'right' }}>REP</PixelText>
      <PixelText size={7} color={WK.dim} style={{ width: 64, textAlign: 'right' }}>EARN</PixelText>
      <PixelText size={7} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>WK</PixelText>
    </View>
  );
}

function RankingsRow({ entry, isOwn }: { entry: LeaderboardEntry; isOwn: boolean }) {
  const rankColor = RANK_COLORS[entry.rank] ?? WK.text;
  const tier = tierFromRep(entry.reputation);
  const tierColor = TIER_COLOR[tier];

  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: WK.tealCard,
        borderWidth: 2,
        borderColor: isOwn ? WK.yellow : WK.border,
      },
      isOwn && pixelShadow,
    ]}>
      <VT323Text size={18} color={rankColor} style={{ width: 36, fontWeight: entry.rank <= 3 ? 'bold' : 'normal' }}>
        {entry.rank}
      </VT323Text>
      <BodyText size={13} style={{ flex: 1, color: isOwn ? WK.yellow : WK.text }} numberOfLines={1}>
        {entry.clubName}{isOwn ? ' ★' : ''}
      </BodyText>
      <VT323Text size={16} color={tierColor} style={{ width: 36, textAlign: 'right' }}>
        {TIER_ABBR[tier]}
      </VT323Text>
      <VT323Text size={18} color={WK.text} style={{ width: 36, textAlign: 'right' }}>
        {entry.reputation}
      </VT323Text>
      <VT323Text size={18} color={WK.text} style={{ width: 64, textAlign: 'right' }}>
        {formatCurrencyCompact(entry.totalCareerEarnings)}
      </VT323Text>
      <VT323Text size={18} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>
        {entry.weekNumber}
      </VT323Text>
    </View>
  );
}
