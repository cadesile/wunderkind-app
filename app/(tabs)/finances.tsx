import { useState } from 'react';
import { View, ScrollView, FlatList, Modal, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useAcademyStore } from '@/stores/academyStore';
import { useMarketStore } from '@/stores/marketStore';
import { useLoanStore, getLoanLimit } from '@/stores/loanStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useFinanceStore } from '@/stores/financeStore';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText } from '@/components/ui/PixelText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { Loan } from '@/types/market';
import { type FinancialCategory, type FinancialTransaction, CATEGORY_LABELS } from '@/types/finance';
import { calculateWeeklyFinances } from '@/engine/finance';

const FINANCE_TABS = ['BALANCE', 'INVESTORS', 'SPONSORS', 'LOANS', 'LEDGER'] as const;
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
  const sponsors = useMarketStore((s) => s.sponsors);
  const { totalWeeklyRepayment } = useLoanStore();
  const players = useSquadStore((s) => s.players);
  const coaches = useCoachStore((s) => s.coaches);
  const facilityLevels = useFacilityStore((s) => s.levels);

  const balance = (typeof academy.balance === 'number' && !isNaN(academy.balance)) ? academy.balance : 0;

  const activeSponsors = sponsors.filter((s) => academy.sponsorIds.includes(s.id));
  const weeklyRepayment = totalWeeklyRepayment();

  const record = calculateWeeklyFinances(
    academy.weekNumber ?? 1,
    academy,
    players,
    coaches,
    facilityLevels,
    activeSponsors,
    weeklyRepayment,
  );

  // All values in whole pounds for consistent display
  const sponsorIncome = activeSponsors.reduce((sum, s) => sum + s.weeklyPayment, 0);
  const reputationIncome = academy.reputation; // reputation×100 pence ÷ 100 = reputation pounds
  // wage and salary are stored in pence — convert to pounds for display
  const playerWages = Math.round(players.reduce((sum, p) => sum + (p.wage ?? 0), 0) / 100);
  const coachSalaries = Math.round(coaches.reduce((sum, c) => sum + c.salary, 0) / 100);
  // facilityMaint from breakdown is in pence — convert to pounds
  const facilityMaint = Math.round(
    record.breakdown
      .filter((b) => b.label.includes('maintenance'))
      .reduce((sum, b) => sum + b.amount, 0) / 100,
  );
  // displayNet computed entirely in pounds (record.net mixes pence/pounds units)
  const displayNet = sponsorIncome + reputationIncome - playerWages - coachSalaries - facilityMaint - weeklyRepayment;
  const netColor = displayNet >= 0 ? WK.green : WK.red;

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
        <PixelText size={22} color={balance >= 0 ? WK.yellow : WK.red}>
          {balance < 0 ? '-' : ''}£{Math.abs(balance).toLocaleString()}
        </PixelText>
      </View>

      {/* Weekly cashflow card */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 14,
        ...pixelShadow,
      }}>
        <PixelText size={8} upper style={{ marginBottom: 10 }}>Weekly Cashflow</PixelText>

        <FinanceRow
          label="SPONSOR INCOME"
          value={`+£${sponsorIncome.toLocaleString()}`}
          accent={WK.green}
        />
        <FinanceRow
          label="REPUTATION INCOME"
          value={`+£${reputationIncome.toLocaleString()}`}
          accent={WK.green}
        />
        <FinanceRow
          label="PLAYER WAGES"
          value={`-£${playerWages.toLocaleString()}`}
          accent={playerWages > 0 ? WK.orange : WK.dim}
        />
        <FinanceRow
          label="COACH SALARIES"
          value={`-£${coachSalaries.toLocaleString()}`}
          accent={coachSalaries > 0 ? WK.orange : WK.dim}
        />
        <FinanceRow
          label="FACILITY MAINTENANCE"
          value={`-£${facilityMaint.toLocaleString()}`}
          accent={facilityMaint > 0 ? WK.orange : WK.dim}
        />
        <FinanceRow
          label="LOAN REPAYMENTS"
          value={`-£${weeklyRepayment.toLocaleString()}`}
          accent={weeklyRepayment > 0 ? WK.red : WK.dim}
        />

        {/* Net divider */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 10,
          borderTopWidth: 2,
          borderTopColor: WK.tealMid,
          marginTop: 2,
        }}>
          <PixelText size={8}>NET THIS WEEK</PixelText>
          <PixelText size={9} color={netColor}>
            {displayNet >= 0 ? '+' : '-'}£{Math.abs(displayNet).toLocaleString()}
          </PixelText>
        </View>
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

          {/* Ownership bar */}
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <PixelText size={6} dim>ACADEMY OWNERSHIP</PixelText>
              <PixelText size={6} color={WK.green}>{100 - assignedInvestor.equityTaken}%</PixelText>
            </View>
            <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border, flexDirection: 'row' }}>
              <View style={{ height: '100%', width: `${100 - assignedInvestor.equityTaken}%`, backgroundColor: WK.green }} />
              <View style={{ height: '100%', flex: 1, backgroundColor: WK.orange }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
              <PixelText size={6} dim>ACADEMY</PixelText>
              <PixelText size={6} color={WK.orange}>INVESTOR {assignedInvestor.equityTaken}%</PixelText>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
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

            {/* Contract term bar (static — no startWeek tracked) */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <PixelText size={6} dim>CONTRACT TERM</PixelText>
                <PixelText size={6} dim>{sponsor.contractWeeks} WKS</PixelText>
              </View>
              <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                <View style={{ height: '100%', width: '100%', backgroundColor: WK.tealLight }} />
              </View>
              <PixelText size={6} dim style={{ marginTop: 3 }}>ACTIVE CONTRACT</PixelText>
            </View>
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

// ─── Ledger pane ──────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { label: string; weeks: number }[] = [
  { label: '4W', weeks: 4 },
  { label: '12W', weeks: 12 },
  { label: '52W', weeks: 52 },
];

const CATEGORY_FILTER_OPTIONS: { label: string; value: FinancialCategory | 'all' }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'WAGES', value: 'wages' },
  { label: 'UPKEEP', value: 'upkeep' },
  { label: 'SPONSORS', value: 'sponsor_payment' },
  { label: 'TRANSFERS', value: 'transfer_fee' },
  { label: 'INVEST', value: 'investment' },
  { label: 'FACILITIES', value: 'facility_upgrade' },
  { label: 'EARNINGS', value: 'earnings' },
];

function LedgerPane() {
  const [rangeWeeks, setRangeWeeks] = useState(12);
  const [catFilter, setCatFilter] = useState<FinancialCategory | 'all'>('all');
  const { getRecentHistory, getTotalByCategory } = useFinanceStore();

  const allTx = getRecentHistory(rangeWeeks);
  const filtered = catFilter === 'all'
    ? allTx
    : allTx.filter((tx) => tx.category === catFilter);

  // Category totals (only when showing all)
  const incomeCats: FinancialCategory[] = ['sponsor_payment', 'investment', 'earnings'];
  const expenseCats: FinancialCategory[] = ['wages', 'upkeep', 'transfer_fee', 'facility_upgrade'];
  const totalIncome = incomeCats.reduce((s, c) => s + Math.max(0, getTotalByCategory(c, rangeWeeks)), 0);
  const totalExpenses = expenseCats.reduce((s, c) => s + Math.abs(Math.min(0, getTotalByCategory(c, rangeWeeks))), 0);
  const netTotal = totalIncome - totalExpenses;

  function renderTx({ item }: { item: FinancialTransaction }) {
    const isPositive = item.amount >= 0;
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        gap: 8,
      }}>
        <View style={{ flex: 1 }}>
          <PixelText size={6} dim numberOfLines={1}>{item.description}</PixelText>
          <PixelText size={6} color={WK.dim} style={{ marginTop: 2 }}>
            {CATEGORY_LABELS[item.category]} · WK {item.weekNumber}
          </PixelText>
        </View>
        <PixelText size={7} color={isPositive ? WK.green : WK.red}>
          {isPositive ? '+' : '-'}£{Math.abs(item.amount).toLocaleString()}
        </PixelText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Range filter */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, gap: 6 }}>
        {RANGE_OPTIONS.map(({ label, weeks }) => {
          const active = weeks === rangeWeeks;
          return (
            <Pressable
              key={weeks}
              onPress={() => setRangeWeeks(weeks)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: active ? WK.yellow : WK.tealMid,
                borderWidth: 2,
                borderColor: WK.border,
              }}
            >
              <PixelText size={7} color={active ? '#3a2000' : WK.dim}>{label}</PixelText>
            </Pressable>
          );
        })}
      </View>

      {/* Category filter chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
        {CATEGORY_FILTER_OPTIONS.map(({ label, value }) => {
          const active = value === catFilter;
          return (
            <Pressable
              key={value}
              onPress={() => setCatFilter(value)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 5,
                backgroundColor: active ? WK.tealLight : WK.tealMid,
                borderWidth: 2,
                borderColor: active ? WK.tealLight : WK.border,
              }}
            >
              <PixelText size={6} color={active ? WK.tealCard : WK.dim}>{label}</PixelText>
            </Pressable>
          );
        })}
      </View>

      {/* Summary card (all categories) */}
      {catFilter === 'all' && (
        <View style={{
          marginHorizontal: 10,
          marginBottom: 8,
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 12,
          ...pixelShadow,
        }}>
          <FinanceRow label="INCOME" value={`+£${totalIncome.toLocaleString()}`} accent={WK.green} />
          <FinanceRow label="EXPENSES" value={`-£${totalExpenses.toLocaleString()}`} accent={WK.red} />
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 8,
            borderTopWidth: 2,
            borderTopColor: WK.tealMid,
            marginTop: 4,
          }}>
            <PixelText size={7}>NET ({RANGE_OPTIONS.find((r) => r.weeks === rangeWeeks)?.label})</PixelText>
            <PixelText size={8} color={netTotal >= 0 ? WK.green : WK.red}>
              {netTotal >= 0 ? '+' : '-'}£{Math.abs(netTotal).toLocaleString()}
            </PixelText>
          </View>
        </View>
      )}

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO TRANSACTIONS</PixelText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(tx) => tx.id}
          renderItem={renderTx}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FinanceHubScreen() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('BALANCE');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />
      <PixelTopTabBar
        tabs={[...FINANCE_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as FinanceTab)}
      />

      {activeTab === 'BALANCE' && <BalancePane />}
      {activeTab === 'INVESTORS' && <InvestorsPane />}
      {activeTab === 'SPONSORS' && <SponsorsPane />}
      {activeTab === 'LOANS' && <LoansPane />}
      {activeTab === 'LEDGER' && <LedgerPane />}
    </SafeAreaView>
  );
}
