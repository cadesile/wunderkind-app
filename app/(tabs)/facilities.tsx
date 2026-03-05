import { useState } from 'react';
import { View, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFacilityStore, facilityUpgradeCost, calculateFacilityUpkeep } from '@/stores/facilityStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
import { useAcademyStore } from '@/stores/academyStore';
import { useFinanceStore } from '@/stores/financeStore';
import { FACILITY_DEFS, FacilityMeta, FacilityType } from '@/types/facility';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { WK, pixelShadow } from '@/constants/theme';

// ─── Category definition ──────────────────────────────────────────────────────

type FacilityCategory = 'TRAINING' | 'MEDICAL' | 'TECHNICAL';

const CATEGORIES: { id: FacilityCategory; label: string }[] = [
  { id: 'TRAINING',  label: 'TRAINING'  },
  { id: 'MEDICAL',   label: 'MEDICAL'   },
  { id: 'TECHNICAL', label: 'TECHNICAL' },
];

/** Maps each facility type to its category */
const FACILITY_CATEGORY: Record<FacilityType, FacilityCategory> = {
  trainingPitch:  'TRAINING',
  youthHostel:    'TRAINING',
  medicalLab:     'MEDICAL',
  analyticsSuite: 'TECHNICAL',
  mediaCenter:    'TECHNICAL',
};

const LEVEL_BENEFIT_LABELS: Record<FacilityType, (level: number) => string> = {
  trainingPitch:  (l) => l === 0 ? 'INACTIVE' : `+${(l * 5).toFixed(0)}% XP BOOST`,
  medicalLab:     (l) => l === 0 ? 'INACTIVE' : `-${(l * 8).toFixed(0)}% INJURY PROB`,
  youthHostel:    (l) => l === 0 ? 'MAX 15 PLAYERS' : `MAX ${10 + l * 3} PLAYERS`,
  analyticsSuite: (l) => l === 0 ? 'INACTIVE' : 'TRAITS & POT VISIBLE',
  mediaCenter:    (l) => l === 0 ? 'INACTIVE' : `+${(l * 1.2).toFixed(1)} REP/WK`,
};

// ─── Facility card ────────────────────────────────────────────────────────────

function FacilityCard({ def, level, balance }: { def: FacilityMeta; level: number; balance: number }) {
  const { upgradeLevel } = useFacilityStore();
  const { addBalance, academy } = useAcademyStore();

  const upgradeCost = facilityUpgradeCost(def.type, level);
  const maintenance = calculateFacilityUpkeep(def.type, level);
  const nextMaintenance = calculateFacilityUpkeep(def.type, level + 1);
  const canAfford = balance >= upgradeCost;
  const atMax = level >= 10;
  const levelPct = (level / 10) * 100;

  function handleUpgrade() {
    if (!canAfford) {
      Alert.alert('Insufficient Funds', `You need £${upgradeCost.toLocaleString()} to upgrade.`);
      return;
    }
    Alert.alert(
      `Upgrade ${def.label}`,
      `Cost: £${upgradeCost.toLocaleString()}\n\nLevel ${level} → ${level + 1}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: () => {
            upgradeLevel(def.type);
            addBalance(-upgradeCost);
            useFinanceStore.getState().addTransaction({
              amount: -upgradeCost,
              category: 'facility_upgrade',
              description: `Upgraded ${def.label} to level ${level + 1}`,
              weekNumber: academy.weekNumber ?? 1,
            });
          },
        },
      ],
    );
  }

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: level > 0 ? WK.tealLight : WK.border,
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

      {/* Description */}
      <PixelText size={6} dim style={{ marginBottom: 8 }}>{def.description}</PixelText>

      {/* Level bar */}
      <View style={{
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderWidth: 2,
        borderColor: WK.border,
        marginBottom: 8,
      }}>
        <View style={{ height: '100%', width: `${levelPct}%`, backgroundColor: WK.tealLight }} />
      </View>

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

      {/* Upgrade button */}
      {atMax ? (
        <View style={{ borderWidth: 2, borderColor: WK.dim, padding: 8, alignItems: 'center' }}>
          <PixelText size={7} dim>MAX LEVEL</PixelText>
        </View>
      ) : (
        <Button
          label={`UPGRADE → LV${level + 1}  £${upgradeCost.toLocaleString()}`}
          variant={canAfford ? 'yellow' : 'teal'}
          fullWidth
          onPress={handleUpgrade}
          disabled={!canAfford}
        />
      )}
    </View>
  );
}

// ─── Category subnav ─────────────────────────────────────────────────────────

function CategoryNav({
  active,
  onChange,
}: {
  active: FacilityCategory;
  onChange: (c: FacilityCategory) => void;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 8,
    }}>
      {CATEGORIES.map(({ id, label }) => {
        const isActive = id === active;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              backgroundColor: isActive ? WK.yellow : WK.tealMid,
              borderWidth: 3,
              borderColor: WK.border,
              ...(isActive ? {
                shadowColor: '#000',
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 0,
                elevation: 3,
              } : {}),
            }}
          >
            <PixelText
              size={7}
              color={isActive ? '#3a2000' : WK.dim}
            >
              {label}
            </PixelText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FacilitiesScreen() {
  const { levels } = useFacilityStore();
  const academy = useAcademyStore((s) => s.academy);
  const [activeCategory, setActiveCategory] = useState<FacilityCategory>('TRAINING');

  const balance = (typeof academy.balance === 'number' && !isNaN(academy.balance))
    ? academy.balance
    : academy.totalCareerEarnings;

  const visibleDefs = FACILITY_DEFS.filter(
    (def) => FACILITY_CATEGORY[def.type] === activeCategory,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />

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
        <PixelText size={7} color={WK.yellow}>£{balance.toLocaleString()}</PixelText>
      </View>

      {/* Category subnav */}
      <CategoryNav active={activeCategory} onChange={setActiveCategory} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 16 }}>
        {visibleDefs.map((def) => (
          <FacilityCard
            key={def.type}
            def={def}
            level={levels[def.type]}
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
