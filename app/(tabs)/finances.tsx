import { useState } from 'react';
import { View, ScrollView, FlatList, Modal, Pressable, TextInput } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useClubStore } from '@/stores/clubStore';
import { useMarketStore } from '@/stores/marketStore';
import { useLoanStore, getLoanLimit } from '@/stores/loanStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useFinanceStore } from '@/stores/financeStore';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { Loan } from '@/types/market';
import { type FinancialCategory, type FinancialTransaction } from '@/types/finance';
import { calculateWeeklyFinances } from '@/engine/finance';
import { calculateMatchdayIncome } from '@/utils/matchdayIncome';
import { penceToPounds, formatCurrencyCompact, formatPounds } from '@/utils/currency';
import useClubMetrics from '@/hooks/useClubMetrics';

const FINANCE_TABS = ['BALANCE', 'INVESTORS', 'SPONSORS', 'LOANS', 'LEDGER'] as const;
type FinanceTab = typeof FINANCE_TABS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FinanceRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <BodyText size={13} dim style={{ flex: 1, marginRight: 8 }} numberOfLines={1}>{label}</BodyText>
      <PixelText size={9} color={accent ?? WK.text} style={{ flexShrink: 0 }}>{value}</PixelText>
    </View>
  );
}

// ─── Balance pane ─────────────────────────────────────────────────────────────

function BalancePane() {
  const club = useClubStore((s) => s.club);
  const { totalWeeklyRepayment } = useLoanStore();
  const players = useSquadStore((s) => s.players);
  const coaches = useCoachStore((s) => s.coaches);
  const facilityLevels = useFacilityStore((s) => s.levels);
  const facilityConditions = useFacilityStore((s) => s.conditions);
  const facilityTemplates = useFacilityStore((s) => s.templates);

  // balance is stored in pence — convert to whole pounds for display
  const balance = penceToPounds(
    typeof club.balance === 'number' && !isNaN(club.balance) ? club.balance : 0,
  );

  const weeklyRepayment = totalWeeklyRepayment();

  const record = calculateWeeklyFinances(
    club.weekNumber ?? 1,
    club,
    players,
    coaches,
    facilityLevels,
    [],
    weeklyRepayment,
    facilityTemplates,
  );

  // All values in whole pounds for consistent display
  const sponsorIncome = (club.sponsorContracts ?? []).reduce(
    (sum, c) => sum + Math.round(c.weeklyPayment / 100),
    0,
  );
  const reputationIncome = club.reputation; // reputation×100 pence ÷ 100 = reputation pounds
  // wage and salary are stored in pence — convert to pounds for display
  const playerWages = Math.round(players.reduce((sum, p) => sum + (p.wage ?? 0), 0) / 100);
  const coachSalaries = Math.round(coaches.reduce((sum, c) => sum + c.salary, 0) / 100);
  // facilityMaint from breakdown is in pence — convert to pounds
  const facilityMaint = Math.round(
    record.breakdown
      .filter((b) => b.label.includes('maintenance'))
      .reduce((sum, b) => sum + b.amount, 0) / 100,
  );
  const facilityIncome = Math.round(
    calculateMatchdayIncome(facilityTemplates, facilityLevels, facilityConditions, club.reputation) / 100,
  );
  // displayNet computed entirely in pounds (record.net mixes pence/pounds units)
  const displayNet = sponsorIncome + reputationIncome + facilityIncome - playerWages - coachSalaries - facilityMaint - weeklyRepayment;
  const netColor = displayNet >= 0 ? WK.green : WK.red;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: FAB_CLEARANCE }}>
      {/* Current balance hero */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.yellow,
        padding: 16,
        ...pixelShadow,
      }}>
        <BodyText size={13} dim style={{ marginBottom: 6 }}>CURRENT BALANCE</BodyText>
        <PixelText size={22} color={balance >= 0 ? WK.yellow : WK.red}>
          {formatPounds(balance)}
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
          label="FACILITY INCOME"
          value={`+£${facilityIncome.toLocaleString()}`}
          accent={facilityIncome > 0 ? WK.green : WK.dim}
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
        <BodyText size={13} dim style={{ marginBottom: 6 }}>TOTAL CAREER EARNINGS</BodyText>
        <PixelText size={18} color={WK.tealLight}>
          £{penceToPounds(club.totalCareerEarnings).toLocaleString()}
        </PixelText>
      </View>

      {/* Hall of fame */}
      <Card>
        <PixelText size={8} upper style={{ marginBottom: 10 }}>Club Standing</PixelText>
        <FinanceRow label="REPUTATION" value={String(club.reputation)} accent={WK.tealLight} />
        <FinanceRow label="TIER" value={club.reputationTier.toUpperCase()} accent={WK.yellow} />
        <FinanceRow label="HALL OF FAME PTS" value={club.hallOfFamePoints.toLocaleString()} />
      </Card>
    </ScrollView>
  );
}

// ─── Investors pane ───────────────────────────────────────────────────────────

function InvestorsPane() {
  const club = useClubStore((s) => s.club);
  const { addBalance, setInvestorId } = useClubStore();
  const investors = useMarketStore((s) => s.investors);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const { totalValuation } = useClubMetrics();
  const [showBuyout, setShowBuyout] = useState(false);

  const assignedInvestor = investors.find((inv) => inv.id === club.investorId) ?? null;

  // Buyout cost = equity% of total club valuation (pence)
  const buyoutCostPence = assignedInvestor
    ? Math.round((assignedInvestor.equityTaken / 100) * totalValuation)
    : 0;
  const canAfford = club.balance >= buyoutCostPence;

  function handleBuyout() {
    if (!assignedInvestor || !canAfford) return;
    addBalance(-buyoutCostPence);
    addTransaction({
      weekNumber: club.weekNumber ?? 1,
      category: 'investor_buyout',
      amount: -buyoutCostPence,
      description: `Investor buyout — ${assignedInvestor.name} (${assignedInvestor.equityTaken}% equity)`,
    });
    setInvestorId(null);
    setShowBuyout(false);
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: FAB_CLEARANCE }}>
      {assignedInvestor ? (
        <>
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
              value={`£${Math.round(assignedInvestor.investmentAmount / 100).toLocaleString()}`}
              accent={WK.yellow}
            />
            <FinanceRow
              label="BUYOUT COST"
              value={formatCurrencyCompact(buyoutCostPence)}
              accent={canAfford ? WK.tealLight : WK.red}
            />

            {/* Ownership bar */}
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <BodyText size={12} dim>CLUB OWNERSHIP</BodyText>
                <BodyText size={12} color={WK.green}>{100 - assignedInvestor.equityTaken}%</BodyText>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border, flexDirection: 'row' }}>
                <View style={{ height: '100%', width: `${100 - assignedInvestor.equityTaken}%`, backgroundColor: WK.green }} />
                <View style={{ height: '100%', flex: 1, backgroundColor: WK.orange }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                <BodyText size={11} dim>CLUB</BodyText>
                <BodyText size={11} color={WK.orange}>INVESTOR {assignedInvestor.equityTaken}%</BodyText>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <BodyText size={12} dim>
                INVESTOR RECEIVES {assignedInvestor.equityTaken}% OF ALL PLAYER SALES
              </BodyText>
            </View>

            {/* Buyout CTA */}
            <View style={{ marginTop: 16 }}>
              <Button
                label="BUY OUT INVESTOR"
                variant="yellow"
                fullWidth
                disabled={!canAfford}
                onPress={() => setShowBuyout(true)}
              />
              {!canAfford && (
                <BodyText size={13} color={WK.red} style={{ marginTop: 6, textAlign: 'center' }}>
                  INSUFFICIENT FUNDS
                </BodyText>
              )}
            </View>
          </View>

          {/* Buyout confirmation modal */}
          <Modal visible={showBuyout} transparent animationType="fade">
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.75)',
              justifyContent: 'center',
              padding: 24,
            }}>
              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.yellow,
                padding: 20,
                ...pixelShadow,
              }}>
                <PixelText size={9} upper style={{ marginBottom: 16 }}>CONFIRM BUYOUT</PixelText>

                <FinanceRow label="INVESTOR" value={assignedInvestor.name} />
                <FinanceRow
                  label="EQUITY RECLAIMED"
                  value={`${assignedInvestor.equityTaken}%`}
                  accent={WK.green}
                />
                <FinanceRow
                  label="COST"
                  value={formatCurrencyCompact(buyoutCostPence)}
                  accent={WK.yellow}
                />
                <FinanceRow
                  label="BALANCE AFTER"
                  value={formatCurrencyCompact(club.balance - buyoutCostPence)}
                  accent={(club.balance - buyoutCostPence) < 0 ? WK.red : WK.tealLight}
                />

                <View style={{ marginTop: 8, marginBottom: 16, borderTopWidth: 2, borderTopColor: WK.border, paddingTop: 12 }}>
                  <BodyText size={13} dim style={{ lineHeight: 20 }}>
                    YOU WILL OWN 100% OF YOUR CLUB. THE INVESTOR WILL NO LONGER RECEIVE A CUT OF PLAYER SALES.
                  </BodyText>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button label="CONFIRM" variant="yellow" fullWidth onPress={handleBuyout} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="CANCEL" variant="teal" fullWidth onPress={() => setShowBuyout(false)} />
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        </>
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
  const club = useClubStore((s) => s.club);
  const allSponsors = useMarketStore((s) => s.sponsors);
  const weekNumber = club.weekNumber ?? 1;

  const contracts = club.sponsorContracts ?? [];
  const totalWeeklyIncome = contracts.reduce(
    (sum, c) => sum + Math.round(c.weeklyPayment / 100),
    0,
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: FAB_CLEARANCE }}>
      {/* Summary card */}
      <Card>
        <FinanceRow
          label="WEEKLY SPONSOR INCOME"
          value={`+£${totalWeeklyIncome.toLocaleString()}`}
          accent={WK.green}
        />
        <FinanceRow label="ACTIVE SPONSORS" value={String(contracts.length)} />
      </Card>

      {contracts.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <PixelText size={8} dim>NO ACTIVE SPONSORS</PixelText>
        </View>
      ) : (
        contracts.map((contract) => {
          const sponsor = allSponsors.find((s) => s.id === contract.id);
          const name = sponsor?.name ?? contract.id;
          const size = sponsor?.companySize ?? '—';
          const weeksRemaining = Math.max(0, contract.endWeek - weekNumber);
          const totalContractWeeks = contract.endWeek - (weekNumber - weeksRemaining);
          const progressPct = totalContractWeeks > 0 ? (1 - weeksRemaining / totalContractWeeks) * 100 : 100;
          const weeklyPounds = Math.round(contract.weeklyPayment / 100);

          return (
            <View key={contract.id} style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
              padding: 14,
              ...pixelShadow,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <PixelText size={8} upper style={{ flex: 1 }}>{name}</PixelText>
                <PixelText size={7} color={WK.dim}>{size}</PixelText>
              </View>
              <FinanceRow
                label="WEEKLY PAYMENT"
                value={`+£${weeklyPounds.toLocaleString()}`}
                accent={WK.green}
              />
              <FinanceRow
                label="WEEKS REMAINING"
                value={`${weeksRemaining} WKS`}
              />
              <FinanceRow
                label="TOTAL REMAINING"
                value={`£${(weeklyPounds * weeksRemaining).toLocaleString()}`}
                accent={WK.yellow}
              />
              {/* Contract progress bar */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <BodyText size={12} dim>CONTRACT TERM</BodyText>
                  <BodyText size={12} dim>{weeksRemaining} WKS LEFT</BodyText>
                </View>
                <View style={{ height: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                  <View style={{
                    height: '100%',
                    width: `${Math.min(100, progressPct)}%`,
                    backgroundColor: weeksRemaining <= 8 ? WK.orange : WK.tealLight,
                  }} />
                </View>
              </View>
            </View>
          );
        })
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
        <View style={{ height: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: WK.tealLight }} />
        </View>
        <BodyText size={12} dim style={{ marginTop: 4 }}>{pct}% REPAID</BodyText>
      </View>
    </View>
  );
}

function LoansPane() {
  const club = useClubStore((s) => s.club);
  const addBalance = useClubStore((s) => s.addBalance);
  const { loans, takeLoan, totalWeeklyRepayment } = useLoanStore();
  const [showModal, setShowModal] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [loanError, setLoanError] = useState<string | null>(null);

  const loanLimit = getLoanLimit(club.reputation);
  const weeklyRepayment = totalWeeklyRepayment();

  function handleTakeLoan() {
    setLoanError(null);
    const amount = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      setLoanError('Please enter a valid loan amount.');
      return;
    }
    const result = takeLoan(amount, club.weekNumber ?? 1, club.reputation);
    if (result instanceof Error) {
      setLoanError(result.message);
      return;
    }
    // Credit balance with loan proceeds — amount is whole pounds, store is pence
    addBalance(amount * 100);
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
        <Button label="◈ TAKE A LOAN" variant="yellow" fullWidth onPress={() => { setLoanError(null); setShowModal(true); }} />
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
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: FAB_CLEARANCE }}
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
              <BodyText size={13} dim style={{ marginBottom: 6 }}>
                CURRENT LIMIT: £{loanLimit.toLocaleString()}
              </BodyText>
              <BodyText size={13} dim style={{ marginBottom: 14 }}>
                INTEREST RATE: 4.6% OVER 52 WEEKS
              </BodyText>

              <BodyText size={13} dim style={{ marginBottom: 6 }}>AMOUNT (£)</BodyText>
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

              {loanError && (
                <BodyText size={13} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>
                  {loanError}
                </BodyText>
              )}
              <View style={{ gap: 8 }}>
                <Button label="CONFIRM LOAN" variant="yellow" fullWidth onPress={handleTakeLoan} />
                <Button label="CANCEL" variant="teal" fullWidth onPress={() => { setShowModal(false); setLoanError(null); }} />
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
  { label: 'TERMINATION', value: 'contract_termination' },
];

const CAT_BADGE_CONFIG: Record<FinancialCategory, { label: string; color: string }> = {
  wages:                { label: 'WAG', color: WK.orange },
  upkeep:               { label: 'UPK', color: WK.dim },
  sponsor_payment:      { label: 'SPO', color: WK.tealLight },
  transfer_fee:         { label: 'TRF', color: WK.yellow },
  investment:           { label: 'INV', color: WK.green },
  facility_upgrade:     { label: 'FAC', color: WK.orange },
  earnings:             { label: 'ERN', color: WK.green },
  contract_termination: { label: 'TRM', color: WK.red },
  investor_buyout:      { label: 'BYO', color: WK.red },
  guardian_payment:     { label: 'GRD', color: WK.yellow },
  matchday_income:      { label: 'MCH', color: WK.green },
};

function LedgerPane() {
  const [rangeWeeks, setRangeWeeks] = useState(12);
  const [catFilter, setCatFilter] = useState<FinancialCategory | 'all'>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { getRecentHistory, getTotalByCategory } = useFinanceStore();

  const allTx = getRecentHistory(rangeWeeks);
  const filtered = catFilter === 'all'
    ? allTx
    : allTx.filter((tx) => tx.category === catFilter);

  const incomeCats: FinancialCategory[] = ['sponsor_payment', 'investment', 'earnings', 'transfer_fee'];
  const expenseCats: FinancialCategory[] = ['wages', 'upkeep', 'facility_upgrade', 'contract_termination'];
  const totalIncome = incomeCats.reduce((s, c) => s + Math.max(0, getTotalByCategory(c, rangeWeeks)), 0);
  const totalExpenses = expenseCats.reduce((s, c) => s + Math.abs(Math.min(0, getTotalByCategory(c, rangeWeeks))), 0);
  const netTotal = totalIncome - totalExpenses;

  const selectedCatLabel = CATEGORY_FILTER_OPTIONS.find((o) => o.value === catFilter)?.label ?? 'ALL';

  function renderTx({ item, index }: { item: FinancialTransaction; index: number }) {
    const isPositive = item.amount >= 0;
    const catConf = CAT_BADGE_CONFIG[item.category];
    const badgeColor = item.category === 'investment'
      ? (isPositive ? WK.green : WK.red)
      : catConf?.color ?? WK.dim;
    const rowBg = index % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent';

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: rowBg,
        borderBottomWidth: 1,
        borderBottomColor: WK.border,
        gap: 10,
      }}>
        {/* Category badge */}
        <View style={{
          width: 46,
          height: 24,
          backgroundColor: `${badgeColor}22`,
          borderWidth: 1,
          borderColor: badgeColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <PixelText size={8} color={badgeColor}>{catConf?.label ?? '???'}</PixelText>
        </View>

        {/* Description + week number */}
        <View style={{ flex: 1 }}>
          <BodyText size={12} color={WK.text} numberOfLines={1}>{item.description}</BodyText>
          <BodyText size={11} dim>WK {item.weekNumber}</BodyText>
        </View>

        {/* Amount */}
        <PixelText size={9} color={isPositive ? WK.green : WK.red}>
          {isPositive ? '+' : '-'}£{Math.abs(item.amount).toLocaleString()}
        </PixelText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Controls row ──────────────────────────────────────────────── */}
      <View style={{ zIndex: 100 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingTop: 10,
          paddingBottom: 6,
          gap: 6,
        }}>
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

          <View style={{ flex: 1 }} />

          {/* Category dropdown trigger */}
          <Pressable
            onPress={() => setDropdownOpen((o) => !o)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: WK.tealMid,
              borderWidth: 2,
              borderColor: dropdownOpen ? WK.yellow : WK.border,
            }}
          >
            <PixelText size={8} color={dropdownOpen ? WK.yellow : WK.dim}>
              {selectedCatLabel} ▾
            </PixelText>
          </Pressable>
        </View>

        {/* Dropdown overlay */}
        {dropdownOpen && (
          <View style={{
            position: 'absolute',
            top: 52,
            right: 10,
            width: 150,
            zIndex: 200,
            elevation: 8,
            backgroundColor: WK.tealCard,
            borderWidth: 2,
            borderColor: WK.yellow,
          }}>
            {CATEGORY_FILTER_OPTIONS.map(({ label, value }) => {
              const active = value === catFilter;
              return (
                <Pressable
                  key={value}
                  onPress={() => { setCatFilter(value); setDropdownOpen(false); }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: active ? WK.tealMid : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: WK.border,
                  }}
                >
                  <BodyText size={13} color={active ? WK.yellow : WK.dim}>{label}</BodyText>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Summary block ─────────────────────────────────────────────── */}
      <View style={{
        marginHorizontal: 10,
        marginBottom: 8,
        backgroundColor: WK.tealCard,
        borderWidth: 2,
        borderColor: WK.border,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
          <BodyText size={13} dim>INCOME</BodyText>
          <PixelText size={9} color={WK.green}>+£{totalIncome.toLocaleString()}</PixelText>
        </View>
        <View style={{ height: 1, backgroundColor: WK.border }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
          <BodyText size={13} dim>EXPENSES</BodyText>
          <PixelText size={9} color={WK.red}>-£{totalExpenses.toLocaleString()}</PixelText>
        </View>
        <View style={{ height: 1, backgroundColor: WK.tealMid }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
          <BodyText size={13}>NET ({RANGE_OPTIONS.find((r) => r.weeks === rangeWeeks)?.label})</BodyText>
          <PixelText size={9} color={netTotal >= 0 ? WK.green : WK.red}>
            {netTotal >= 0 ? '+' : '-'}£{Math.abs(netTotal).toLocaleString()}
          </PixelText>
        </View>
      </View>

      {/* ── Transaction list ──────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO TRANSACTIONS</PixelText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(tx) => tx.id}
          renderItem={renderTx}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: FAB_CLEARANCE }}
        />
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FinanceHubScreen() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('BALANCE');
  const club = useClubStore((s) => s.club);

  // balance is stored in pence — convert to whole pounds for display
  const balance = penceToPounds(
    typeof club.balance === 'number' && !isNaN(club.balance)
      ? club.balance
      : club.totalCareerEarnings * 100,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />
      <PixelTopTabBar
        tabs={[...FINANCE_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as FinanceTab)}
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
        <PixelText size={10} upper>Finances</PixelText>
        <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
      </View>

      {activeTab === 'BALANCE' && <BalancePane />}
      {activeTab === 'INVESTORS' && <InvestorsPane />}
      {activeTab === 'SPONSORS' && <SponsorsPane />}
      {activeTab === 'LOANS' && <LoansPane />}
      {activeTab === 'LEDGER' && <LedgerPane />}
    </SafeAreaView>
  );
}
