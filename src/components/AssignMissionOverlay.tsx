import { useState } from 'react';
import { Modal, View, ScrollView, Pressable } from 'react-native';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { FlagText } from '@/components/ui/FlagText';
import { WK, pixelShadow } from '@/constants/theme';
import { useAcademyStore } from '@/stores/academyStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useScoutStore } from '@/stores/scoutStore';
import useAcademyMetrics from '@/hooks/useAcademyMetrics';
import { Scout, ScoutingMission } from '@/types/market';
import { getAvailableRegions } from '@/utils/scoutingRegions';
import { calcMissionCost } from '@/utils/scoutingCost';
import { formatCurrencyWhole, penceToPounds } from '@/utils/currency';
import { uuidv7 } from '@/utils/uuidv7';
import { hapticTap } from '@/utils/haptics';

interface Props {
  scout: Scout;
  visible: boolean;
  onClose: () => void;
}

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'] as const;
type PositionType = typeof POSITIONS[number];

const DURATION_OPTIONS = [
  { label: '1 MONTH',  weeks: 4  },
  { label: '3 MONTHS', weeks: 12 },
  { label: '6 MONTHS', weeks: 24 },
] as const;

export function AssignMissionOverlay({ scout, visible, onClose }: Props) {
  const [selectedPosition, setSelectedPosition] = useState<PositionType | null>(null);
  const [selectedNationality, setSelectedNationality] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(4);

  const academy = useAcademyStore((s) => s.academy);
  const { addBalance } = useAcademyStore.getState();
  const { addTransaction } = useFinanceStore.getState();
  const { assignMission } = useScoutStore.getState();

  // totalValuation is in pence — convert to pounds for cost calculation
  const metrics = useAcademyMetrics();
  const academyValuePounds = penceToPounds(metrics.totalValuation);

  const costPence = calcMissionCost(academyValuePounds, selectedWeeks);

  // academy.balance is in pence — compare directly with costPence
  const canAfford = academy.balance >= costPence;

  const reputationTier = academy.reputationTier;
  const availableRegions = getAvailableRegions(reputationTier, scout.scoutingRange);

  const isConfirmDisabled = !canAfford;

  function handleConfirm() {
    // Deduct balance (addBalance takes pence)
    addBalance(-costPence);

    // Log transaction (amount in pence per FinancialTransaction spec)
    const positionLabel = selectedPosition ? ` (${selectedPosition})` : '';
    addTransaction({
      amount: -costPence,
      category: 'upkeep',
      description: `Scouting mission — ${scout.name}${positionLabel}`,
      weekNumber: academy.weekNumber ?? 1,
    });

    // Build mission
    const mission: ScoutingMission = {
      id: uuidv7(),
      scoutId: scout.id,
      position: selectedPosition,
      targetNationality: selectedNationality,
      weeksTotal: selectedWeeks,
      weeksElapsed: 0,
      gemsFound: 0,
      costPaid: costPence,
      startWeek: academy.weekNumber ?? 1,
      status: 'active',
    };

    assignMission(scout.id, mission);
    hapticTap();
    onClose();
  }

  function handleClose() {
    setSelectedPosition(null);
    setSelectedNationality(null);
    setSelectedWeeks(4);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: WK.tealDark,
          borderTopWidth: 4,
          borderTopColor: WK.border,
          maxHeight: '85%',
        }}>
          {/* Modal header */}
          <View style={{
            backgroundColor: WK.tealMid,
            borderBottomWidth: 3,
            borderBottomColor: WK.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}>
            <PixelText size={9} upper>Assign Mission</PixelText>
            <Pressable onPress={handleClose} hitSlop={8}>
              <PixelText size={8} color={WK.dim}>✕</PixelText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14, gap: 16 }}>

            {/* Scout summary */}
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 2,
              borderColor: WK.border,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <FlagText nationality={scout.nationality} size={16} />
              <View style={{ flex: 1 }}>
                <PixelText size={7}>{scout.name}</PixelText>
                <PixelText size={6} dim style={{ marginTop: 2 }}>
                  {scout.scoutingRange.toUpperCase()} · {scout.successRate}% SUCCESS RATE
                </PixelText>
              </View>
            </View>

            {/* Position selector (optional) */}
            <View>
              <PixelText size={7} dim style={{ marginBottom: 8 }}>POSITION (OPTIONAL)</PixelText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {POSITIONS.map((pos) => (
                  <Pressable
                    key={pos}
                    onPress={() => setSelectedPosition(selectedPosition === pos ? null : pos)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: 'center',
                      backgroundColor: selectedPosition === pos ? WK.yellow : WK.tealCard,
                      borderWidth: 3,
                      borderColor: WK.border,
                      ...pixelShadow,
                    }}
                  >
                    <PixelText size={8} color={selectedPosition === pos ? '#3a2000' : WK.text}>
                      {pos}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Region selector (optional) */}
            {availableRegions !== null ? (
              <View>
                <PixelText size={7} dim style={{ marginBottom: 8 }}>REGION (OPTIONAL)</PixelText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {availableRegions.map((region) => {
                      const nat = region.nationalities[0];
                      const isSelected = selectedNationality === nat;
                      return (
                        <Pressable
                          key={region.label}
                          onPress={() => setSelectedNationality(nat)}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            backgroundColor: isSelected ? WK.yellow : WK.tealCard,
                            borderWidth: 3,
                            borderColor: WK.border,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            ...pixelShadow,
                          }}
                        >
                          <FlagText nationality={nat} size={14} />
                          <PixelText size={6} color={isSelected ? '#3a2000' : WK.text}>
                            {region.label.toUpperCase()}
                          </PixelText>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 2,
                borderColor: WK.border,
                padding: 10,
              }}>
                <PixelText size={6} dim>DOMESTIC ONLY</PixelText>
                <PixelText size={6} color={WK.tealLight} style={{ marginTop: 4 }}>
                  Upgrade reputation or scout range to unlock international regions
                </PixelText>
              </View>
            )}

            {/* Duration selector */}
            <View>
              <PixelText size={7} dim style={{ marginBottom: 8 }}>DURATION</PixelText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DURATION_OPTIONS.map(({ label, weeks }) => (
                  <Pressable
                    key={weeks}
                    onPress={() => setSelectedWeeks(weeks)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      alignItems: 'center',
                      backgroundColor: selectedWeeks === weeks ? WK.yellow : WK.tealCard,
                      borderWidth: 3,
                      borderColor: WK.border,
                      ...pixelShadow,
                    }}
                  >
                    <PixelText size={7} color={selectedWeeks === weeks ? '#3a2000' : WK.text}>
                      {label}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Cost summary */}
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: canAfford ? WK.border : WK.red,
              padding: 14,
              ...pixelShadow,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <PixelText size={6} dim>MISSION COST</PixelText>
                <PixelText size={6} color={canAfford ? WK.yellow : WK.red}>
                  {formatCurrencyWhole(costPence)}
                </PixelText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <PixelText size={6} dim>BALANCE AFTER</PixelText>
                <PixelText size={6} color={canAfford ? WK.green : WK.red}>
                  {formatCurrencyWhole(academy.balance - costPence)}
                </PixelText>
              </View>
              {!canAfford && (
                <PixelText size={6} color={WK.red} style={{ marginTop: 8 }}>
                  INSUFFICIENT FUNDS
                </PixelText>
              )}
            </View>

            {/* Confirm button */}
            <Button
              label="CONFIRM MISSION"
              variant="yellow"
              fullWidth
              disabled={isConfirmDisabled}
              onPress={handleConfirm}
            />

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
