import { useState } from 'react';
import { View, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFacilityStore, facilityUpgradeCost, calculateFacilityUpkeep } from '@/stores/facilityStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
import { repairFacilityCost } from '@/types/facility';
import { useAcademyStore } from '@/stores/academyStore';
import { useFinanceStore } from '@/stores/financeStore';
import { FACILITY_DEFS, FacilityMeta, FacilityType } from '@/types/facility';
import { PixelText } from '@/components/ui/PixelText';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { Button } from '@/components/ui/Button';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { WK, pixelShadow } from '@/constants/theme';
import { penceToPounds, formatPounds } from '@/utils/currency';

// ─── Category definition ──────────────────────────────────────────────────────

type FacilityCategory = 'TRAINING' | 'MEDICAL' | 'SCOUTING';

const CATEGORIES: { id: FacilityCategory; label: string }[] = [
  { id: 'TRAINING',  label: 'TRAINING'  },
  { id: 'MEDICAL',   label: 'MEDICAL'   },
  { id: 'SCOUTING',  label: 'SCOUTING'  },
];

const FACILITY_CATEGORY: Record<FacilityType, FacilityCategory> = {
  technicalZone:  'TRAINING',
  strengthSuite:  'TRAINING',
  tacticalRoom:   'SCOUTING',
  physioClinic:   'MEDICAL',
  hydroPool:      'MEDICAL',
  scoutingCenter: 'SCOUTING',
};

const LEVEL_BENEFIT_LABELS: Record<FacilityType, (level: number) => string> = {
  technicalZone:  (l) => l === 0 ? 'INACTIVE' : `+${(l * 5).toFixed(0)}% XP BOOST`,
  strengthSuite:  (l) => l === 0 ? 'INACTIVE' : `+${(l * 2).toFixed(0)}% POWER/STAM XP`,
  tacticalRoom:   (l) => l === 0 ? 'INACTIVE' : `+${(l * 5).toFixed(0)}% COACH PERF`,
  physioClinic:   (l) => l === 0 ? 'INACTIVE' : `-${(l * 8).toFixed(0)}% INJURY PROB · MAX ${10 + l * 3} PLAYERS`,
  hydroPool:      (l) => l === 0 ? 'INACTIVE' : `-${(l * 10).toFixed(0)}% RECOVERY TIME`,
  scoutingCenter: (l) => l === 0 ? 'INACTIVE' : `SCOUTING ACTIVE · +${(l * 0.8).toFixed(1)} REP/WK`,
};

/** Condition bar colour: ≥60 teal, ≥30 orange, <30 red */
function conditionColor(pct: number): string {
  if (pct >= 60) return WK.tealLight;
  if (pct >= 30) return WK.orange;
  return WK.red;
}

// ─── Facility card ────────────────────────────────────────────────────────────

function FacilityCard({
  def,
  level,
  condition,
  balance,
}: {
  def: FacilityMeta;
  level: number;
  condition: number;
  balance: number;
}) {
  const { upgradeLevel, repairFacility } = useFacilityStore();
  const { addBalance, academy } = useAcademyStore();
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [repairModalVisible, setRepairModalVisible] = useState(false);

  const upgradeCost    = facilityUpgradeCost(def.type, level);
  const maintenance    = calculateFacilityUpkeep(def.type, level);
  const nextMaintenance = calculateFacilityUpkeep(def.type, level + 1);
  const repairCost     = repairFacilityCost(def.type, level, condition);

  const canAffordUpgrade = balance >= upgradeCost;
  const canAffordRepair  = balance >= repairCost;
  const atMax      = level >= 10;
  const levelPct   = (level / 10) * 100;
  const effectiveLevel = (level * (condition / 100)).toFixed(1);
  const needsRepair = level > 0 && condition < 100;

  function confirmUpgrade() {
    setUpgradeModalVisible(false);
    upgradeLevel(def.type);
    addBalance(-upgradeCost * 100); // pounds → pence
    useFinanceStore.getState().addTransaction({
      amount: -upgradeCost,
      category: 'facility_upgrade',
      description: `Upgraded ${def.label} to level ${level + 1}`,
      weekNumber: academy.weekNumber ?? 1,
    });
  }

  function confirmRepair() {
    setRepairModalVisible(false);
    repairFacility(def.type);
  }

  const condColor = conditionColor(condition);
  const cardBorder = level > 0
    ? (condition < 30 ? WK.red : WK.tealLight)
    : WK.border;

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: cardBorder,
      padding: 14,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      {/* Title row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <PixelText size={8} upper style={{ flex: 1 }}>{def.label}</PixelText>
        <View style={{
          borderWidth: 2,
          borderColor: level > 0 ? WK.yellow : WK.border,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}>
          <PixelText size={7} color={level > 0 ? WK.yellow : WK.dim}>LV {level}</PixelText>
        </View>
      </View>

      <PixelText size={6} dim style={{ marginBottom: 10 }}>{def.description}</PixelText>

      {/* Level bar */}
      <PixelText size={6} dim style={{ marginBottom: 4 }}>LEVEL</PixelText>
      <View style={{
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderWidth: 2,
        borderColor: WK.border,
        marginBottom: 10,
      }}>
        <View style={{ height: '100%', width: `${levelPct}%`, backgroundColor: WK.tealLight }} />
      </View>

      {/* Condition bar — only shown for built facilities */}
      {level > 0 && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <PixelText size={6} dim>CONDITION</PixelText>
            <PixelText size={6} color={condColor}>{Math.round(condition)}%</PixelText>
          </View>
          <View style={{
            height: 6,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderWidth: 2,
            borderColor: WK.border,
            marginBottom: 6,
          }}>
            <View style={{ height: '100%', width: `${condition}%`, backgroundColor: condColor }} />
          </View>
          <PixelText size={6} color={WK.dim} style={{ marginBottom: 10 }}>
            EFFECTIVE LV {effectiveLevel}
          </PixelText>
        </>
      )}

      {/* Active benefit */}
      <PixelText size={6} color={WK.tealLight} style={{ marginBottom: 4 }}>
        ◆ {LEVEL_BENEFIT_LABELS[def.type](level)}
      </PixelText>
      <PixelText size={6} dim style={{ marginBottom: atMax ? 12 : 4 }}>
        MAINTENANCE: {maintenance === 0 ? 'FREE' : `£${(maintenance / 100).toFixed(2)}/WK`}
      </PixelText>
      {!atMax && (
        <PixelText size={6} color={WK.dim} style={{ marginBottom: 12 }}>
          NEXT LEVEL: £{(nextMaintenance / 100).toFixed(2)}/WK
        </PixelText>
      )}

      {/* Action buttons */}
      <View style={{ gap: 8 }}>
        {/* Repair button — shown when condition < 100 and level > 0 */}
        {needsRepair && (
          <Button
            label={`REPAIR  £${repairCost.toLocaleString()}`}
            variant={condition < 30 ? 'orange' : 'teal'}
            fullWidth
            onPress={() => setRepairModalVisible(true)}
            disabled={!canAffordRepair}
          />
        )}

        {/* Upgrade button */}
        {atMax ? (
          <View style={{ borderWidth: 2, borderColor: WK.dim, padding: 8, alignItems: 'center' }}>
            <PixelText size={7} dim>MAX LEVEL</PixelText>
          </View>
        ) : (
          <Button
            label={`UPGRADE → LV${level + 1}  £${upgradeCost.toLocaleString()}`}
            variant={canAffordUpgrade ? 'yellow' : 'teal'}
            fullWidth
            onPress={() => setUpgradeModalVisible(true)}
            disabled={!canAffordUpgrade}
          />
        )}
      </View>

      {/* Upgrade confirmation modal */}
      <Modal
        visible={upgradeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUpgradeModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setUpgradeModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 4,
              borderColor: WK.yellow,
              padding: 20,
              minWidth: 280,
              maxWidth: 340,
              ...pixelShadow,
            }}>
              <PixelText size={9} upper style={{ marginBottom: 14 }}>Upgrade {def.label}</PixelText>
              {!canAffordUpgrade ? (
                <PixelText size={7} color={WK.orange} style={{ marginBottom: 20 }}>
                  INSUFFICIENT FUNDS{'\n'}NEED £{upgradeCost.toLocaleString()}
                </PixelText>
              ) : (
                <>
                  <PixelText size={7} dim style={{ marginBottom: 6 }}>LEVEL {level} → {level + 1}</PixelText>
                  <PixelText size={7} color={WK.yellow} style={{ marginBottom: 20 }}>
                    COST: £{upgradeCost.toLocaleString()}
                  </PixelText>
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="CANCEL" variant="teal" onPress={() => setUpgradeModalVisible(false)} style={{ flex: 1 }} />
                {canAffordUpgrade && (
                  <Button label="UPGRADE" variant="yellow" onPress={confirmUpgrade} style={{ flex: 1 }} />
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Repair confirmation modal */}
      <Modal
        visible={repairModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRepairModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setRepairModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 4,
              borderColor: WK.orange,
              padding: 20,
              minWidth: 280,
              maxWidth: 340,
              ...pixelShadow,
            }}>
              <PixelText size={9} upper style={{ marginBottom: 14 }}>Repair {def.label}</PixelText>
              {!canAffordRepair ? (
                <PixelText size={7} color={WK.red} style={{ marginBottom: 20 }}>
                  INSUFFICIENT FUNDS{'\n'}NEED £{repairCost.toLocaleString()}
                </PixelText>
              ) : (
                <>
                  <PixelText size={7} dim style={{ marginBottom: 6 }}>
                    CONDITION {Math.round(condition)}% → 100%
                  </PixelText>
                  <PixelText size={7} color={WK.orange} style={{ marginBottom: 20 }}>
                    COST: £{repairCost.toLocaleString()}
                  </PixelText>
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="CANCEL" variant="teal" onPress={() => setRepairModalVisible(false)} style={{ flex: 1 }} />
                {canAffordRepair && (
                  <Button label="REPAIR" variant="orange" onPress={confirmRepair} style={{ flex: 1 }} />
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FacilitiesScreen() {
  const { levels, conditions } = useFacilityStore();
  const academy = useAcademyStore((s) => s.academy);
  const [activeCategory, setActiveCategory] = useState<FacilityCategory>('TRAINING');

  const balance = penceToPounds(
    typeof academy.balance === 'number' && !isNaN(academy.balance)
      ? academy.balance
      : academy.totalCareerEarnings * 100,
  );

  const visibleDefs = FACILITY_DEFS.filter(
    (def) => FACILITY_CATEGORY[def.type] === activeCategory,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />

      <PixelTopTabBar
        tabs={CATEGORIES.map((c) => c.label)}
        active={activeCategory}
        onChange={(t) => setActiveCategory(t as FacilityCategory)}
      />

      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <PixelText size={10} upper>Facilities</PixelText>
        <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, marginTop: 10, paddingBottom: 16 }}>
        {visibleDefs.map((def) => (
          <FacilityCard
            key={def.type}
            def={def}
            level={levels[def.type]}
            condition={conditions[def.type]}
            balance={balance}
          />
        ))}

        {/* Total weekly upkeep summary */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.yellow,
          padding: 14,
          marginTop: 4,
          ...pixelShadow,
        }}>
          <PixelText size={7} dim style={{ marginBottom: 6 }}>TOTAL WEEKLY UPKEEP</PixelText>
          <PixelText size={14} color={WK.orange}>
            £{(calculateTotalUpkeep(levels) / 100).toFixed(2)}
          </PixelText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
