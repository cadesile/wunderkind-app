import { Modal, View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelText } from '@/components/ui/PixelText';
import { MatchResultContent, MatchResultContentData } from '@/components/MatchResultContent';
import { WK } from '@/constants/theme';
import type { Fixture } from '@/stores/fixtureStore';
import type { MatchResultRecord } from '@/stores/matchResultStore';

// ─── Data builder ─────────────────────────────────────────────────────────────

/**
 * Builds a MatchResultContentData payload for a played fixture.
 * Looks up the full player performance record from matchResultStore (keyed by fixtureId).
 * Works for all fixtures — AMP or NPC.
 */
export function buildMatchResultData(
  fixture: Fixture,
  ampClubId: string,
  ampClubName: string,
  clubNameMap: Map<string, string>,
  matchResults: Record<string, MatchResultRecord>,
): MatchResultContentData | null {
  if (!fixture.result) return null;

  const homeName = clubNameMap.get(fixture.homeClubId) ?? fixture.homeClubId;
  const awayName = clubNameMap.get(fixture.awayClubId) ?? fixture.awayClubId;

  const base: MatchResultContentData = {
    homeTeamName: homeName,
    awayTeamName: awayName,
    homeScore: fixture.result.homeGoals,
    awayScore: fixture.result.awayGoals,
    ampClubName,
  };

  const record = matchResults[fixture.id];
  if (!record) return base;

  return {
    ...base,
    homeAvgRating: record.homeAvgRating,
    awayAvgRating: record.awayAvgRating,
    homePlayers:   record.homePlayers,
    awayPlayers:   record.awayPlayers,
  };
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

interface MatchResultOverlayProps {
  visible: boolean;
  onClose: () => void;
  data: MatchResultContentData | null;
}

export function MatchResultOverlay({ visible, onClose, data }: MatchResultOverlayProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)' }}>
        {/* Header bar — paddingTop accounts for Android status bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingTop: 12 + insets.top,
          paddingBottom: 12,
          backgroundColor: WK.tealDark,
          borderBottomWidth: 3,
          borderBottomColor: WK.border,
        }}>
          <PixelText size={8} color={WK.dim}>MATCH RESULT</PixelText>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <PixelText size={9} color={WK.yellow}>✕ CLOSE</PixelText>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        >
          {data && <MatchResultContent data={data} />}
        </ScrollView>
      </View>
    </Modal>
  );
}
