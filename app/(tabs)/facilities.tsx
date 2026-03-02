import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFacilityStore, facilityUpgradeCost, facilityMaintenanceCost } from '@/stores/facilityStore';
import { useAcademyStore } from '@/stores/academyStore';
import { FACILITY_DEFS, FacilityMeta, FacilityType } from '@/types/facility';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';

const LEVEL_BENEFIT_LABELS: Record<FacilityType, (level: number) => string> = {
  trainingPitch:  (l) => l === 0 ? 'INACTIVE' : `+${(l * 5).toFixed(0)}% XP BOOST`,
  medicalLab:     (l) => l === 0 ? 'INACTIVE' : `-${(l * 8).toFixed(0)}% INJURY PROB`,
  youthHostel:    (l) => l === 0 ? 'MAX 15 PLAYERS' : `MAX ${10 + l * 3} PLAYERS`,
  analyticsSuite: (l) => l === 0 ? 'INACTIVE' : 'TRAITS & POT VISIBLE',
  mediaCenter:    (l) => l === 0 ? 'INACTIVE' : `+${l * 12} REP/WK`,
};

function FacilityCard({ def, level, balance }: { def: FacilityMeta; level: number; balance: number }) {
  const { upgradeLevel } = useFacilityStore();
  const { addEarnings } = useAcademyStore();

  const upgradeCost = facilityUpgradeCost(def.type, level);
  const maintenance = facilityMaintenanceCost(level);
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
            addEarnings(-upgradeCost);
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
      <PixelText size={6} dim style={{ marginBottom: 12 }}>
        MAINTENANCE: £{maintenance.toLocaleString()}/WK
      </PixelText>

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

export default function FacilitiesScreen() {
  const { levels } = useFacilityStore();
  const academy = useAcademyStore((s) => s.academy);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
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
        <PixelText size={7} color={WK.yellow}>£{academy.totalCareerEarnings.toLocaleString()}</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
        {FACILITY_DEFS.map((def) => (
          <FacilityCard
            key={def.type}
            def={def}
            level={levels[def.type]}
            balance={academy.totalCareerEarnings}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
