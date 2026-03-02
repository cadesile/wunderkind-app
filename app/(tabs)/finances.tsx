import { useState } from 'react';
import { View, ScrollView, FlatList, Modal, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAcademyStore } from '@/stores/academyStore';
import { useMarketStore } from '@/stores/marketStore';
import { useLoanStore, getLoanLimit } from '@/stores/loanStore';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText } from '@/components/ui/PixelText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { Loan } from '@/types/market';

const FINANCE_TABS = ['BALANCE', 'INVESTORS', 'SPONSORS', 'LOANS'] as const;
type FinanceTab = typeof FINANCE_TABS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Balance pane ─────────────────────────────────────────────────────────────

function BalancePane() {
  const academy = useAcademyStore((s) => s.academy);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>
      {/* Current balance hero */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.yellow,
        padding: 16,
        ...pixelShadow,
      }}>
        <PixelText size={7} dim style={{ marginBottom: 6 }}>CURRENT BALANCE</PixelText>
        <PixelText size={22} color={academy.balance >= 0 ? WK.yellow : WK.red}>
          {academy.balance < 0 ? '-' : ''}£{Math.abs(academy.balance).toLocaleString()}
        </PixelText>
      </View>

      {/* Career earnings */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 16,
        ...pixelShadow,
      }}>
        <PixelText size={7} dim style={{ marginBottom: 6 }}>TOTAL CAREER EARNINGS</PixelText>
        <PixelText size={18} color={WK.tealLight}>
          £{academy.totalCareerEarnings.toLocaleString()}
        </PixelText>
      </View>

      {/* Hall of fame */}
      <Card>
        <PixelText size={8} upper style={{ marginBottom: 10 }}>Academy Standing</PixelText>
        <FinanceRow label="REPUTATION" value={String(academy.reputation)} accent={WK.tealLight} />
        <FinanceRow label="TIER" value={academy.reputationTier.toUpperCase()} accent={WK.yellow} />
        <FinanceRow label="HALL OF FAME PTS" value={academy.hallOfFamePoints.toLocaleString()} />
      </Card>
    </ScrollView>
  );
}

// ─── Investors pane ───────────────────────────────────────────────────────────

function InvestorsPane() {
  const academy = useAcademyStore((s) => s.academy);
  const investors = useMarketStore((s) => s.investors);

  const assignedInvestor = investors.find((inv) => inv.id === academy.investorId) ?? null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>
      {assignedInvestor ? (
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.tealMid,
          padding: 16,
          ...pixelShadow,
        }}>
          <PixelText size={9} upper style={{ marginBottom: 12 }}>{assignedInvestor.name}</PixelText>
          <FinanceRow
            label="EQUITY TAKEN"
            value={`${assignedInvestor.equityTaken}%`}
            accent={WK.orange}
          />
          <FinanceRow
            label="INVESTMENT"
            value={`£${assignedInvestor.investmentAmount.toLocaleString()}`}
            accent={WK.yellow}
          />
          <View style={{ marginTop: 10 }}>
            <PixelText size={6} dim>
              INVESTOR RECEIVES {assignedInvestor.equityTaken}% OF ALL PLAYER SALES
            </PixelText>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
          <PixelText size={8} dim>NO INVESTOR ASSIGNED</PixelText>
          <PixelText size={7} dim style={{ marginTop: 8 }}>Check back after market sync</PixelText>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Sponsors pane ────────────────────────────────────────────────────────────

function SponsorsPane() {
  const academy = useAcademyStore((s) => s.academy);
  const sponsors = useMarketStore((s) => s.sponsors);

  const activeSponsors = sponsors.filter((s) => academy.sponsorIds.includes(s.id));
  const totalWeeklyIncome = activeSponsors.reduce((sum, s) => sum + s.weeklyPayment, 0);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>
      {/* Summary card */}
      <Card>
        <FinanceRow
          label="WEEKLY SPONSOR INCOME"
          value={`+£${totalWeeklyIncome.toLocaleString()}`}
          accent={WK.green}
        />
        <FinanceRow label="ACTIVE SPONSORS" value={String(activeSponsors.length)} />
      </Card>

      {activeSponsors.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <PixelText size={8} dim>NO ACTIVE SPONSORS</PixelText>
        </View>
      ) : (
        activeSponsors.map((sponsor) => (
          <View key={sponsor.id} style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 14,
            ...pixelShadow,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <PixelText size={8} upper style={{ flex: 1 }}>{sponsor.name}</PixelText>
              <PixelText size={7} color={WK.dim}>{sponsor.companySize}</PixelText>
            </View>
            <FinanceRow
              label="WEEKLY PAYMENT"
              value={`+£${sponsor.weeklyPayment.toLocaleString()}`}
              accent={WK.green}
            />
            <FinanceRow
              label="CONTRACT LENGTH"
              value={`${sponsor.contractWeeks} WKS`}
            />
            <FinanceRow
              label="TOTAL VALUE"
              value={`£${(sponsor.weeklyPayment * sponsor.contractWeeks).toLocaleString()}`}
              accent={WK.yellow}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Loans pane ───────────────────────────────────────────────────────────────

function LoanCard({ loan }: { loan: Loan }) {
  const weeksTotal = Math.round(loan.amount * (1 + loan.interestRate) / loan.weeklyRepayment);
  const pct = Math.round((1 - loan.weeksRemaining / weeksTotal) * 100);

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 14,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <FinanceRow label="LOAN AMOUNT" value={`£${loan.amount.toLocaleString()}`} accent={WK.yellow} />
      <FinanceRow label="WEEKLY REPAYMENT" value={`-£${loan.weeklyRepayment.toLocaleString()}`} accent={WK.orange} />
      <FinanceRow label="WEEKS REMAINING" value={String(loan.weeksRemaining)} />
      <View style={{ marginTop: 8 }}>
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: WK.tealLight }} />
        </View>
        <PixelText size={6} dim style={{ marginTop: 3 }}>{pct}% REPAID</PixelText>
      </View>
    </View>
  );
}

function LoansPane() {
  const academy = useAcademyStore((s) => s.academy);
  const addBalance = useAcademyStore((s) => s.addBalance);
  const { loans, takeLoan, totalWeeklyRepayment } = useLoanStore();
  const [showModal, setShowModal] = useState(false);
  const [amountText, setAmountText] = useState('');

  const loanLimit = getLoanLimit(academy.reputation);
  const weeklyRepayment = totalWeeklyRepayment();

  function handleTakeLoan() {
    const amount = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid loan amount.');
      return;
    }
    const result = takeLoan(amount, academy.weekNumber ?? 1, academy.reputation);
    if (result instanceof Error) {
      Alert.alert('Loan Denied', result.message);
      return;
    }
    // Credit balance with loan proceeds
    addBalance(amount);
    setAmountText('');
    setShowModal(false);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Summary + Take Loan */}
      <View style={{ margin: 10, gap: 10 }}>
        <Card>
          <FinanceRow label="CURRENT LOAN LIMIT" value={`£${loanLimit.toLocaleString()}`} accent={WK.yellow} />
          <FinanceRow label="WEEKLY REPAYMENTS" value={`-£${weeklyRepayment.toLocaleString()}`} accent={WK.orange} />
          <FinanceRow label="INTEREST RATE" value="4.6% / 52 WK" accent={WK.dim} />
        </Card>
        <Button label="◈ TAKE A LOAN" variant="yellow" fullWidth onPress={() => setShowModal(true)} />
      </View>

      {loans.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO ACTIVE LOANS</PixelText>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => <LoanCard loan={item} />}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        />
      )}

      {/* Take Loan modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowModal(false)}
        >
          <Pressable onPress={() => {}} style={{ width: '85%' }}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.yellow,
              padding: 20,
              ...pixelShadow,
            }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 16 }}>Take a Loan</PixelText>
              <PixelText size={7} dim style={{ marginBottom: 6 }}>
                CURRENT LIMIT: £{loanLimit.toLocaleString()}
              </PixelText>
              <PixelText size={6} dim style={{ marginBottom: 14 }}>
                INTEREST RATE: 4.6% OVER 52 WEEKS
              </PixelText>

              <PixelText size={7} dim style={{ marginBottom: 6 }}>AMOUNT (£)</PixelText>
              <TextInput
                style={{
                  backgroundColor: WK.tealDark,
                  borderWidth: 2,
                  borderColor: WK.tealLight,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: WK.text,
                  fontFamily: WK.font,
                  fontSize: 10,
                  marginBottom: 16,
                }}
                keyboardType="numeric"
                placeholder="e.g. 10000"
                placeholderTextColor={WK.dim}
                value={amountText}
                onChangeText={setAmountText}
              />

              <View style={{ gap: 8 }}>
                <Button label="CONFIRM LOAN" variant="yellow" fullWidth onPress={handleTakeLoan} />
                <Button label="CANCEL" variant="teal" fullWidth onPress={() => setShowModal(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FinanceHubScreen() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('BALANCE');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PixelTopTabBar
        tabs={[...FINANCE_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as FinanceTab)}
      />

      {activeTab === 'BALANCE' && <BalancePane />}
      {activeTab === 'INVESTORS' && <InvestorsPane />}
      {activeTab === 'SPONSORS' && <SponsorsPane />}
      {activeTab === 'LOANS' && <LoansPane />}
    </SafeAreaView>
  );
}
