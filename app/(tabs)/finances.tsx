import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAcademyStore } from '@/stores/academyStore';
import { PixelText } from '@/components/ui/PixelText';
import { Card } from '@/components/ui/Card';
import { WK, pixelShadow } from '@/constants/theme';

function FinanceRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <PixelText size={7} dim>{label}</PixelText>
      <PixelText size={8} color={accent ?? WK.text}>{value}</PixelText>
    </View>
  );
}

export default function FinancesScreen() {
  const academy = useAcademyStore((s) => s.academy);
  const weeklyStaffCost = academy.staffCount * 500;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
        <PixelText size={10} upper>Finance</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>

        {/* Career earnings hero */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.yellow,
          padding: 16,
          ...pixelShadow,
        }}>
          <PixelText size={7} dim style={{ marginBottom: 6 }}>TOTAL CAREER EARNINGS</PixelText>
          <PixelText size={22} color={WK.yellow}>
            £{academy.totalCareerEarnings.toLocaleString()}
          </PixelText>
        </View>

        {/* Hall of fame */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 16,
          ...pixelShadow,
        }}>
          <PixelText size={7} dim style={{ marginBottom: 6 }}>HALL OF FAME POINTS</PixelText>
          <PixelText size={18} color={WK.tealLight}>
            {academy.hallOfFamePoints.toLocaleString()}
          </PixelText>
        </View>

        {/* Staff & Overheads */}
        <Card>
          <PixelText size={8} upper style={{ marginBottom: 10 }}>Staff & Overheads</PixelText>
          <FinanceRow label="STAFF COUNT" value={String(academy.staffCount)} />
          <FinanceRow
            label="WEEKLY STAFF COST"
            value={`-£${weeklyStaffCost.toLocaleString()}`}
            accent={WK.orange}
          />
          <View style={{ paddingTop: 8 }}>
            <FinanceRow
              label="ANNUAL PROJECTION"
              value={`-£${(weeklyStaffCost * 52).toLocaleString()}`}
              accent={WK.red}
            />
          </View>
        </Card>

        {/* Reputation tier */}
        <Card>
          <PixelText size={8} upper style={{ marginBottom: 10 }}>Academy Standing</PixelText>
          <FinanceRow label="REPUTATION" value={String(academy.reputation)} accent={WK.tealLight} />
          <FinanceRow label="TIER" value={academy.reputationTier.toUpperCase()} accent={WK.yellow} />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}
