import { useState } from 'react';
import { View, ScrollView, Modal, Pressable } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFacilityStore, facilityUpgradeCost, calculateFacilityUpkeep } from '@/stores/facilityStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
import { repairFacilityCost } from '@/types/facility';
import { useAcademyStore } from '@/stores/academyStore';
import { useFinanceStore } from '@/stores/financeStore';
import { FACILITY_DEFS, FacilityMeta, FacilityType } from '@/types/facility';
import { PixelText, BodyText } from '@/components/ui/PixelText';
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
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      {/* Title row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <BodyText size={15} upper style={{ flex: 1 }}>{def.label}</BodyText>
        <View style={{
          borderWidth: 2,
          borderColor: level > 0 ? WK.yellow : WK.border,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}>
          <PixelText size={7} color={level > 0 ? WK.yellow : WK.dim}>LV {level}</PixelText>
        </View>
      </View>

      {/* Active benefit */}
      <BodyText size={13} color={WK.tealLight} style={{ marginBottom: 2 }}>
        ◆ {LEVEL_BENEFIT_LABELS[def.type](level)}
      </BodyText>

      {/* Description */}
      <BodyText size={12} dim style={{ marginBottom: 10 }}>{def.description}</BodyText>

      {/* Dual progress bars — side by side */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        {/* Level bar */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
            <BodyText size={11} dim>LEVEL</BodyText>
            <BodyText size={11} dim>{level}/10</BodyText>
          </View>
          <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border }}>
            <View style={{ height: '100%', width: `${levelPct}%`, backgroundColor: WK.tealLight }} />
          </View>
        </View>

        {/* Condition bar — only when built */}
        {level > 0 && (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <BodyText size={11} dim>CONDITION</BodyText>
              <BodyText size={11} color={condColor}>{Math.round(condition)}%</BodyText>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border }}>
              <View style={{ height: '100%', width: `${condition}%`, backgroundColor: condColor }} />
            </View>
          </View>
        )}
      </View>

      {/* Maintenance — single line */}
      <BodyText size={12} dim style={{ marginBottom: 12 }}>
        MAINT: {maintenance === 0 ? 'FREE' : `£${(maintenance / 100).toFixed(2)}/wk`}
        {!atMax ? `  ·  LV${level + 1}: £${(nextMaintenance / 100).toFixed(2)}/wk` : ''}
      </BodyText>

      {/* Action buttons */}
      <View style={{ gap: 8 }}>
        {needsRepair && (
          <Button
            label={`REPAIR  £${repairCost.toLocaleString()}`}
            variant={condition < 30 ? 'orange' : 'teal'}
            fullWidth
            onPress={() => setRepairModalVisible(true)}
            disabled={!canAffordRepair}
          />
        )}

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
              <PixelText size={9} upper style={{ marginBottom: 12 }}>Upgrade {def.label}</PixelText>
              {!canAffordUpgrade ? (
                <BodyText size={13} color={WK.orange} style={{ marginBottom: 20 }}>
                  INSUFFICIENT FUNDS — need £{upgradeCost.toLocaleString()}
                </BodyText>
              ) : (
                <>
                  <BodyText size={13} dim style={{ marginBottom: 4 }}>LEVEL {level} → {level + 1}</BodyText>
                  <BodyText size={13} color={WK.yellow} style={{ marginBottom: 20 }}>
                    COST: £{upgradeCost.toLocaleString()}
                  </BodyText>
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
              <PixelText size={9} upper style={{ marginBottom: 12 }}>Repair {def.label}</PixelText>
              {!canAffordRepair ? (
                <BodyText size={13} color={WK.red} style={{ marginBottom: 20 }}>
                  INSUFFICIENT FUNDS — need £{repairCost.toLocaleString()}
                </BodyText>
              ) : (
                <>
                  <BodyText size={13} dim style={{ marginBottom: 4 }}>
                    CONDITION {Math.round(condition)}% → 100%
                  </BodyText>
                  <BodyText size={13} color={WK.orange} style={{ marginBottom: 20 }}>
                    COST: £{repairCost.toLocaleString()}
                  </BodyText>
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, marginTop: 10, paddingBottom: FAB_CLEARANCE }}>
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
          padding: 12,
          marginTop: 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...pixelShadow,
        }}>
          <BodyText size={13} dim>TOTAL WEEKLY UPKEEP</BodyText>
          <PixelText size={12} color={WK.orange}>
            £{(calculateTotalUpkeep(levels) / 100).toFixed(2)}
          </PixelText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
