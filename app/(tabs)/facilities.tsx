import { useState } from 'react';
import { View, ScrollView, Modal, Pressable } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFacilityStore, facilityUpgradeCost, calculateFacilityUpkeep } from '@/stores/facilityStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
import { repairFacilityCost } from '@/types/facility';
import type { FacilityTemplate } from '@/types/facility';
import { useClubStore } from '@/stores/clubStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFinanceStore } from '@/stores/financeStore';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { Button } from '@/components/ui/Button';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { WK, pixelShadow } from '@/constants/theme';
import { penceToPounds, formatPounds } from '@/utils/currency';
import { nationalityToCode } from '@/utils/nationality';

function isoToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

function nationalityFlag(nationality: string): string {
  return isoToFlag(nationalityToCode(nationality));
}

// ─── Category definition ──────────────────────────────────────────────────────

type FacilityCategory = 'TRAINING' | 'MEDICAL' | 'SCOUTING' | 'STADIUM';

const CATEGORIES: { id: FacilityCategory; label: string }[] = [
  { id: 'TRAINING',  label: 'TRAINING'  },
  { id: 'MEDICAL',   label: 'MEDICAL'   },
  { id: 'SCOUTING',  label: 'SCOUTING'  },
  { id: 'STADIUM',  label: 'STADIUM'  },
];

// ─── Benefit labels (client-side game logic) ──────────────────────────────────

const LEVEL_BENEFIT_LABELS: Record<string, (level: number) => string> = {
  technical_zone:  (l) => l === 0 ? 'INACTIVE' : `+${(l * 5).toFixed(0)}% XP BOOST`,
  strength_suite:  (l) => l === 0 ? 'INACTIVE' : `+${(l * 2).toFixed(0)}% POWER/STAM XP`,
  tactical_room:   (l) => l === 0 ? 'INACTIVE' : `+${(l * 5).toFixed(0)}% COACH PERF`,
  physio_clinic:   (l) => l === 0 ? 'INACTIVE' : `-${(l * 8).toFixed(0)}% INJURY PROB · MAX ${10 + l * 3} PLAYERS`,
  hydro_pool:      (l) => l === 0 ? 'INACTIVE' : `-${(l * 10).toFixed(0)}% RECOVERY TIME`,
  scouting_center: (l) => l === 0 ? 'INACTIVE' : `SCOUTING ACTIVE · +${(l * 0.8).toFixed(1)} REP/WK`,
};

function benefitLabel(slug: string, level: number): string {
  return LEVEL_BENEFIT_LABELS[slug]?.(level) ?? (level === 0 ? 'INACTIVE' : `LEVEL ${level} ACTIVE`);
}

/** Condition bar colour: ≥60 teal, ≥30 orange, <30 red */
function conditionColor(pct: number): string {
  if (pct >= 60) return WK.tealLight;
  if (pct >= 30) return WK.orange;
  return WK.red;
}

// ─── Facility card ────────────────────────────────────────────────────────────

function FacilityCard({
  template,
  level,
  condition,
  balance,
}: {
  template: FacilityTemplate;
  level: number;
  condition: number;
  balance: number;
}) {
  const { upgradeLevel, repairFacility } = useFacilityStore();
  const { addBalance, club } = useClubStore();
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [repairModalVisible, setRepairModalVisible] = useState(false);

  const upgradeCost     = facilityUpgradeCost(template, level);
  const maintenance     = calculateFacilityUpkeep(template, level);
  const nextMaintenance = calculateFacilityUpkeep(template, level + 1);
  const repairCost      = repairFacilityCost(level, condition, template.baseCost);

  const canAffordUpgrade = balance >= upgradeCost;
  const canAffordRepair  = balance >= repairCost;
  const atMax      = level >= template.maxLevel;
  const levelPct   = (level / template.maxLevel) * 100;
  const needsRepair = level > 0 && condition < 100;

  function confirmUpgrade() {
    setUpgradeModalVisible(false);
    upgradeLevel(template.slug);
    addBalance(-upgradeCost * 100); // pounds → pence
    useFinanceStore.getState().addTransaction({
      amount:      -upgradeCost,
      category:    'facility_upgrade',
      description: `Upgraded ${template.label} to level ${level + 1}`,
      weekNumber:  club.weekNumber ?? 1,
    });
  }

  function confirmRepair() {
    setRepairModalVisible(false);
    repairFacility(template.slug);
  }

  const condColor  = conditionColor(condition);
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
        <BodyText size={15} upper style={{ flex: 1 }}>{template.label}</BodyText>
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
        ◆ {benefitLabel(template.slug, level)}
      </BodyText>

      {/* Description */}
      <BodyText size={12} dim style={{ marginBottom: 10 }}>{template.description}</BodyText>

      {/* Dual progress bars */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        {/* Level bar */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
            <BodyText size={11} dim>LEVEL</BodyText>
            <BodyText size={11} dim>{level}/{template.maxLevel}</BodyText>
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

      {/* Maintenance */}
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
              <PixelText size={9} upper style={{ marginBottom: 12 }}>Upgrade {template.label}</PixelText>
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
              <PixelText size={9} upper style={{ marginBottom: 12 }}>Repair {template.label}</PixelText>
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
  const { templates, levels, conditions } = useFacilityStore();
  const club = useClubStore((s) => s.club);
  const coaches = useCoachStore((s) => s.coaches);
  const facilityManager = coaches.find((c) => c.role === 'facility_manager') ?? null;
  const [activeCategory, setActiveCategory] = useState<FacilityCategory>('TRAINING');

  const balance = penceToPounds(
    typeof club.balance === 'number' && !isNaN(club.balance)
      ? club.balance
      : club.totalCareerEarnings * 100,
  );

  const visibleTemplates = templates.filter((t) => t.category === activeCategory);

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
        <View>
          <PixelText size={10} upper>Facilities</PixelText>
          {facilityManager && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <BodyText size={13}>{nationalityFlag(facilityManager.nationality)}</BodyText>
              <BodyText size={11} color={WK.tealLight}>{facilityManager.name}</BodyText>
              <BodyText size={9} dim>· AUTO-REPAIR</BodyText>
            </View>
          )}
        </View>
        <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, marginTop: 10, paddingBottom: FAB_CLEARANCE }}>
        {visibleTemplates.map((template) => (
          <FacilityCard
            key={template.slug}
            template={template}
            level={levels[template.slug] ?? 0}
            condition={conditions[template.slug] ?? 100}
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
            £{(calculateTotalUpkeep(templates, levels) / 100).toFixed(2)}
          </PixelText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
