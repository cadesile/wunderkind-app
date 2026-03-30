import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { Card } from '@/components/ui/Card';
import { WK, pixelShadow } from '@/constants/theme';
import { useAcademyStore } from '@/stores/academyStore';
import { getLeaderboard } from '@/api/endpoints/leaderboard';
import { formatCurrencyCompact } from '@/utils/currency';
import type { LeaderboardEntry } from '@/types/api';
import { useState } from 'react';

const WORLD_TABS = ['LEADERBOARD'] as const;
type WorldTab = typeof WORLD_TABS[number];

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export default function WorldScreen() {
  const [activeTab, setActiveTab] = useState<WorldTab>('LEADERBOARD');

  return (
    <View style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />
      <PixelTopTabBar
        tabs={[...WORLD_TABS]}
        activeTab={activeTab}
        onTabPress={(tab) => setActiveTab(tab as WorldTab)}
      />

      {activeTab === 'LEADERBOARD' && <LeaderboardPane />}
    </View>
  );
}

function LeaderboardPane() {
  const academyName = useAcademyStore((s) => s.academy.name);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['leaderboard', 'academy_reputation'],
    queryFn: ({ pageParam }) =>
      getLeaderboard('academy_reputation', { page: pageParam as number, pageSize: 20 }),
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
      <TableHeader />

      {entries.map((entry) => (
        <LeaderboardRow
          key={`${entry.rank}-${entry.academyName}`}
          entry={entry}
          isOwn={entry.academyName === academyName}
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

function TableHeader() {
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
      <PixelText size={7} color={WK.dim} style={{ flex: 1 }}>ACADEMY</PixelText>
      <PixelText size={7} color={WK.dim} style={{ width: 36, textAlign: 'right' }}>REP</PixelText>
      <PixelText size={7} color={WK.dim} style={{ width: 64, textAlign: 'right' }}>EARN</PixelText>
      <PixelText size={7} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>WK</PixelText>
    </View>
  );
}

function LeaderboardRow({ entry, isOwn }: { entry: LeaderboardEntry; isOwn: boolean }) {
  const rankColor = RANK_COLORS[entry.rank] ?? WK.text;

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
      <VT323Text
        size={18}
        color={rankColor}
        style={{ width: 36, fontWeight: entry.rank <= 3 ? 'bold' : 'normal' }}
      >
        {entry.rank}
      </VT323Text>

      <BodyText
        size={13}
        style={{ flex: 1, color: isOwn ? WK.yellow : WK.text }}
        numberOfLines={1}
      >
        {entry.academyName}
        {isOwn ? ' ★' : ''}
      </BodyText>

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
