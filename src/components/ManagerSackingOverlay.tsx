import { Modal, View, ScrollView } from 'react-native';
import { PixelText, VT323Text } from '@/components/ui/PixelText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticConfirm } from '@/utils/haptics';
import type { Coach } from '@/types/coach';
import type { ManagerMatchRecord } from '@/stores/managerRecordStore';
import type { TrophyRecord } from '@/types/club';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManagerSackingOverlayProps {
  visible: boolean;
  manager: Coach;
  record: ManagerMatchRecord | undefined;
  allTrophies: TrophyRecord[];
  currentWeek: number;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManagerSackingOverlay({
  visible,
  manager,
  record,
  allTrophies,
  currentWeek,
  onConfirm,
  onCancel,
}: ManagerSackingOverlayProps) {
  const weeksInCharge = Math.max(0, currentWeek - (manager.joinedWeek ?? currentWeek));
  const seasons       = Math.floor(weeksInCharge / 52);
  const remWeeks      = weeksInCharge % 52;

  const trophiesInTenure = allTrophies.filter(
    (t) => t.weekCompleted >= (manager.joinedWeek ?? 0),
  );

  const total   = record ? record.wins + record.draws + record.losses : 0;
  const winRate = total > 0 ? Math.round((record!.wins / total) * 100) : null;
  const winRateColor =
    winRate === null   ? WK.dim    :
    winRate >= 50      ? WK.green  :
    winRate >= 33      ? WK.yellow : WK.red;

  const tenureLabel =
    seasons > 0
      ? `${seasons} SEASON${seasons !== 1 ? 'S' : ''}${remWeeks > 0 ? ` · ${remWeeks} WK${remWeeks !== 1 ? 'S' : ''}` : ''}`
      : `${weeksInCharge} WEEK${weeksInCharge !== 1 ? 'S' : ''}`;

  function handleConfirm() {
    hapticConfirm();
    onConfirm();
  }

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            paddingVertical: 40,
            gap: 16,
          }}
        >
          {/* ── Dramatic header ─────────────────────────────────────────── */}
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 3,
              borderColor: WK.red,
              backgroundColor: 'rgba(200,30,30,0.12)',
              marginBottom: 8,
            }}>
              <PixelText size={7} color={WK.red} style={{ letterSpacing: 4 }}>
                OFFICIAL NOTICE
              </PixelText>
            </View>
            <PixelText
              size={22}
              color={WK.red}
              style={{ textAlign: 'center', lineHeight: 36 }}
            >
              YOU HAVE
            </PixelText>
            <PixelText
              size={22}
              color={WK.red}
              style={{ textAlign: 'center', lineHeight: 36 }}
            >
              BEEN SACKED
            </PixelText>
          </View>

          {/* ── Manager identity ─────────────────────────────────────────── */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.red,
            padding: 14,
            width: '100%',
            maxWidth: 340,
            ...pixelShadow,
          }}>
            {manager.appearance && (
              <Avatar
                appearance={manager.appearance}
                role="COACH"
                size={60}
                morale={0}
                age={manager.age ?? 40}
              />
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <PixelText size={9} color={WK.yellow} numberOfLines={2}>
                {manager.name.toUpperCase()}
              </PixelText>
              <PixelText size={7} color={WK.dim}>MANAGER · DISMISSED</PixelText>
            </View>
          </View>

          {/* ── Tenure card ──────────────────────────────────────────────── */}
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 16,
            width: '100%',
            maxWidth: 340,
            gap: 10,
            ...pixelShadow,
          }}>
            <PixelText size={7} color={WK.yellow} style={{ marginBottom: 2 }}>
              TENURE
            </PixelText>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <PixelText size={7} color={WK.dim}>TIME IN CHARGE</PixelText>
              <PixelText size={9} color={WK.text}>{tenureLabel}</PixelText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <PixelText size={7} color={WK.dim}>TROPHIES WON</PixelText>
              <PixelText
                size={9}
                color={trophiesInTenure.length > 0 ? WK.yellow : WK.dim}
              >
                {trophiesInTenure.length}
              </PixelText>
            </View>

            {trophiesInTenure.length > 0 && (
              <View style={{ gap: 4, marginTop: 2 }}>
                {trophiesInTenure.map((t, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      backgroundColor: 'rgba(245,200,66,0.08)',
                      borderWidth: 2,
                      borderColor: WK.yellow,
                    }}
                  >
                    <PixelText
                      size={6}
                      color={WK.yellow}
                      numberOfLines={1}
                      style={{ flex: 1 }}
                    >
                      {t.leagueName.toUpperCase()}
                    </PixelText>
                    <PixelText size={6} color={WK.dim} style={{ marginLeft: 8 }}>
                      SEASON {t.season}
                    </PixelText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Match record card ────────────────────────────────────────── */}
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 16,
            width: '100%',
            maxWidth: 340,
            gap: 12,
            ...pixelShadow,
          }}>
            <PixelText size={7} color={WK.yellow} style={{ marginBottom: 2 }}>
              MATCH RECORD
            </PixelText>

            {total > 0 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <VT323Text size={32} color={WK.green}>{record!.wins}</VT323Text>
                  <PixelText size={6} color={WK.dim}>WINS</PixelText>
                </View>
                <View style={{ width: 2, backgroundColor: WK.border }} />
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <VT323Text size={32} color={WK.yellow}>{record!.draws}</VT323Text>
                  <PixelText size={6} color={WK.dim}>DRAWS</PixelText>
                </View>
                <View style={{ width: 2, backgroundColor: WK.border }} />
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <VT323Text size={32} color={WK.red}>{record!.losses}</VT323Text>
                  <PixelText size={6} color={WK.dim}>LOSSES</PixelText>
                </View>
                <View style={{ width: 2, backgroundColor: WK.border }} />
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <VT323Text size={32} color={winRateColor}>
                    {winRate}%
                  </VT323Text>
                  <PixelText size={6} color={WK.dim}>WIN RATE</PixelText>
                </View>
              </View>
            ) : (
              <PixelText size={7} color={WK.dim} style={{ textAlign: 'center' }}>
                NO MATCHES MANAGED
              </PixelText>
            )}
          </View>

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <View style={{ width: '100%', maxWidth: 340, gap: 10, marginTop: 4 }}>
            <Button
              label="CONFIRM SACK"
              variant="red"
              fullWidth
              onPress={handleConfirm}
            />
            <Button
              label="CANCEL"
              variant="teal"
              fullWidth
              onPress={onCancel}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
