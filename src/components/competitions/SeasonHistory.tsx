import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useLeagueHistoryStore } from '@/stores/leagueHistoryStore';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import type { LeagueSeasonRecord, LeagueStandingEntry } from '@/types/leagueHistory';

export function SeasonHistory() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const history   = useLeagueHistoryStore((s) => s.history);

  // Flatten all tier records and sort newest season first
  const allRecords: LeagueSeasonRecord[] = Object.values(history)
    .flat()
    .sort((a, b) => b.season - a.season || b.tier - a.tier); // lower tier number = higher prestige → show first within same season

  if (allRecords.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
        <PixelText size={9} color={WK.dim}>NO HISTORY YET</PixelText>
        <BodyText size={13} dim style={{ textAlign: 'center', lineHeight: 20 }}>
          Complete a season to see your history here.
        </BodyText>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
      {allRecords.map((record) => {
        const recordId    = `${record.tier}-${record.season}-${record.weekCompleted}`;
        const isExpanded  = expandedId === recordId;
        const ampEntry    = record.standings.find((s) => s.isAmp);
        const ampPos      = ampEntry?.position ?? 0;
        const isPromoted  = ampEntry?.promoted ?? false;
        const isRelegated = ampEntry?.relegated ?? false;
        const posColor    = isPromoted ? WK.green : isRelegated ? WK.red : WK.yellow;
        const posLabel    = isPromoted ? `#${ampPos} PROMOTED` : isRelegated ? `#${ampPos} REL` : `#${ampPos}`;

        return (
          <View key={recordId} style={{ marginBottom: 4 }}>
            {/* ── Collapsed header row ── */}
            <Pressable
              onPress={() => setExpandedId((prev) => (prev === recordId ? null : recordId))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: WK.tealCard,
                borderWidth: 2,
                borderColor: WK.border,
                gap: 10,
              }}
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
                <VT323Text size={16} color={WK.yellow}>T{record.tier}</VT323Text>
              </View>

              {/* League + season info */}
              <View style={{ flex: 1 }}>
                <PixelText size={8} color={WK.text} numberOfLines={1}>{record.leagueName}</PixelText>
                <BodyText size={12} dim style={{ marginTop: 2 }}>Season {record.season}</BodyText>
              </View>

              {/* AMP position badge */}
              {ampEntry && (
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <PixelText size={8} color={posColor}>{posLabel}</PixelText>
                  <BodyText size={11} dim>
                    {ampEntry.wins}W {ampEntry.draws}D {ampEntry.losses}L · {ampEntry.points}pts
                  </BodyText>
                </View>
              )}

              {isExpanded
                ? <ChevronDown size={16} color={WK.dim} />
                : <ChevronRight size={16} color={WK.dim} />
              }
            </Pressable>

            {/* ── Expanded standings table ── */}
            {isExpanded && (
              <View style={{
                borderWidth: 2,
                borderTopWidth: 0,
                borderColor: WK.border,
              }}>
                {/* Table header */}
                <View style={{
                  flexDirection: 'row',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: WK.border,
                  backgroundColor: WK.tealDark,
                }}>
                  <BodyText size={10} dim style={{ width: 28 }}>#</BodyText>
                  <BodyText size={10} dim style={{ flex: 1 }}>CLUB</BodyText>
                  <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>PL</BodyText>
                  <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>GD</BodyText>
                  <BodyText size={10} dim style={{ width: 36, textAlign: 'right' }}>PTS</BodyText>
                </View>

                {/* Table rows */}
                {record.standings
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((entry: LeagueStandingEntry, i: number, arr: LeagueStandingEntry[]) => {
                    const isAmp = entry.isAmp;
                    return (
                      <View
                        key={entry.clubId}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                          borderBottomColor: WK.border,
                          backgroundColor: isAmp ? WK.yellow + '1A' : 'transparent',
                        }}
                      >
                        <BodyText size={12} color={isAmp ? WK.yellow : WK.dim} style={{ width: 28 }}>
                          {entry.position}
                        </BodyText>
                        <BodyText size={13} color={isAmp ? WK.yellow : WK.text} style={{ flex: 1 }} numberOfLines={1}>
                          {entry.clubName.toUpperCase()}
                        </BodyText>
                        <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>{entry.played}</BodyText>
                        <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>
                          {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                        </BodyText>
                        <BodyText size={12} color={isAmp ? WK.yellow : WK.text} style={{ width: 36, textAlign: 'right' }}>
                          {entry.points}
                        </BodyText>
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
