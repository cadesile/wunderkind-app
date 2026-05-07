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
import { useFixtureStore } from '@/stores/fixtureStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { renderMoney } from '@/utils/currency';
import { Money } from '@/components/ui/Money';
import useClubMetrics from '@/hooks/useClubMetrics';

const FINANCE_TABS = ['BALANCE', 'INVESTORS', 'SPONSORS', 'LOANS', 'LEDGER'] as const;
type FinanceTab = typeof FINANCE_TABS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FinanceRow({ label, value, accent, pence, moneyStyle = 'whole', sign = false }: {
  label: string;
  value?: string;
  accent?: string;
  pence?: number;
  moneyStyle?: 'whole' | 'compact' | 'decimal';
  sign?: boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <BodyText size={14} dim style={{ flex: 1, marginRight: 8 }} numberOfLines={1}>{label}</BodyText>
      {pence !== undefined ? (
        <Money pence={pence} style={moneyStyle} sign={sign} size={17} color={accent} textStyle={{ flexShrink: 0 }} />
      ) : (
        <PixelText size={17} color={accent ?? WK.text} style={{ flexShrink: 0 }}>{value}</PixelText>
      )}
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
  const fixtures = useFixtureStore((s) => s.fixtures);
  const currentMatchday = useFixtureStore((s) => s.currentMatchday);
  const nonMatchPct = useGameConfigStore((s) => s.config.nonMatchFacilityIncomePercent ?? 0);

  const weeklyRepaymentPence = totalWeeklyRepayment();

  const record = calculateWeeklyFinances(
    club.weekNumber ?? 1,
    club,
    players,
    coaches,
    facilityLevels,
    [],
    weeklyRepaymentPence,
    facilityTemplates,
  );

  // All values in pence for consistent display via Money component
  const sponsorIncomePence = (club.sponsorContracts ?? []).reduce(
    (sum, c) => sum + c.weeklyPayment,
    0,
  );
  const playerWagesPence = players.reduce((sum, p) => sum + (p.wage ?? 0), 0);
  const coachSalariesPence = coaches.reduce((sum, c) => sum + c.salary, 0);
  const facilityMaintPence = record.breakdown
    .filter((b) => b.label.includes('maintenance'))
    .reduce((sum, b) => sum + b.amount, 0);

  const hasHomeMatch = fixtures.some(
    (f) => f.round === currentMatchday && f.homeClubId === club.id,
  );
  const facilityMultiplier = hasHomeMatch ? 1.0 : nonMatchPct / 100;
  const facilityIncomePence = Math.round(
    calculateMatchdayIncome(facilityTemplates, facilityLevels, facilityConditions, club.reputation)
    * facilityMultiplier
  );
  const facilityIncomeLabel = hasHomeMatch
    ? 'FACILITY INCOME'
    : `FACILITY INCOME (${nonMatchPct}% NON-MATCHDAY)`;

  const displayNetPence = sponsorIncomePence + facilityIncomePence - playerWagesPence - coachSalariesPence - facilityMaintPence - weeklyRepaymentPence;

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
        <Money pence={club.balance ?? 0} size={22} autoColor color={club.balance >= 0 ? WK.yellow : undefined} />
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
          pence={sponsorIncomePence}
          accent={WK.green}
          sign
        />
        <FinanceRow
          label={facilityIncomeLabel}
          pence={facilityIncomePence}
          accent={facilityIncomePence > 0 ? WK.green : WK.dim}
          sign
        />
        <FinanceRow
          label="PLAYER WAGES"
          pence={-playerWagesPence}
          accent={playerWagesPence > 0 ? WK.orange : WK.dim}
          sign
        />
        <FinanceRow
          label="COACH SALARIES"
          pence={-coachSalariesPence}
          accent={coachSalariesPence > 0 ? WK.orange : WK.dim}
          sign
        />
        <FinanceRow
          label="FACILITY MAINTENANCE"
          pence={-facilityMaintPence}
          accent={facilityMaintPence > 0 ? WK.orange : WK.dim}
          sign
        />
        <FinanceRow
          label="LOAN REPAYMENTS"
          pence={-weeklyRepaymentPence}
          accent={weeklyRepaymentPence > 0 ? WK.red : WK.dim}
          sign
        />

        {/* Net divider */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          borderTopWidth: 2,
          borderTopColor: WK.tealMid,
          marginTop: 2,
        }}>
          <PixelText size={10}>NET THIS WEEK</PixelText>
          <Money pence={displayNetPence} size={18} autoColor sign />
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
        <Money pence={club.totalCareerEarnings} size={18} color={WK.tealLight} />
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
  const { setInvestorId } = useClubStore();
  const investors = useMarketStore((s) => s.investors);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const { totalValuation } = useClubMetrics();
  const [showBuyout, setShowBuyout] = useState(false);

  const assignedInvestor = investors.find((inv) => inv.id === club.investorId) ?? null;

  // Use accepted offer terms stored on club; fall back to market data if missing (legacy saves)
  const equityTaken = club.investorEquityPct ?? assignedInvestor?.equityTaken ?? 0;
  const originalInvestmentPence = club.investorInvestmentAmount ?? assignedInvestor?.investmentAmount ?? 0;

  // Buyout cost = equity% of total club valuation + 50% of original investment (all in pence)
  const buyoutCostPence = assignedInvestor
    ? Math.round((equityTaken / 100) * totalValuation + 0.5 * originalInvestmentPence)
    : 0;
  const canAfford = club.balance >= buyoutCostPence;

  function handleBuyout() {
    if (!assignedInvestor || !canAfford) return;
    // addTransaction drives addBalance automatically
    addTransaction({
      weekNumber: club.weekNumber ?? 1,
      category: 'investor_buyout',
      amount: -buyoutCostPence, // pence
      description: `Investor buyout — ${assignedInvestor.name} (${equityTaken}% equity)`,
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
              value={`${equityTaken}%`}
              accent={WK.orange}
            />
            <FinanceRow
              label="INVESTMENT"
              pence={originalInvestmentPence}
              accent={WK.yellow}
            />
            <FinanceRow
              label="BUYOUT COST"
              pence={buyoutCostPence}
              moneyStyle="compact"
              accent={canAfford ? WK.tealLight : WK.red}
            />

            {/* Ownership bar */}
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <BodyText size={12} dim>CLUB OWNERSHIP</BodyText>
                <BodyText size={12} color={WK.green}>{100 - equityTaken}%</BodyText>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border, flexDirection: 'row' }}>
                <View style={{ height: '100%', width: `${100 - equityTaken}%`, backgroundColor: WK.green }} />
                <View style={{ height: '100%', flex: 1, backgroundColor: WK.orange }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                <BodyText size={11} dim>CLUB</BodyText>
                <BodyText size={11} color={WK.orange}>INVESTOR {equityTaken}%</BodyText>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <BodyText size={12} dim>
                INVESTOR RECEIVES {equityTaken}% OF ALL PLAYER SALES
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
                  value={`${equityTaken}%`}
                  accent={WK.green}
                />
                <FinanceRow
                  label="COST"
                  pence={buyoutCostPence}
                  moneyStyle="compact"
                  accent={WK.yellow}
                />
                <FinanceRow
                  label="BALANCE AFTER"
                  pence={club.balance - buyoutCostPence}
                  moneyStyle="compact"
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
  const totalWeeklyIncomePence = contracts.reduce(
    (sum, c) => sum + c.weeklyPayment,
    0,
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: FAB_CLEARANCE }}>
      {/* Summary card */}
      <Card>
        <FinanceRow
          label="WEEKLY SPONSOR INCOME"
          pence={totalWeeklyIncomePence}
          accent={WK.green}
          sign
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
                pence={contract.weeklyPayment}
                accent={WK.green}
                sign
              />
              <FinanceRow
                label="WEEKS REMAINING"
                value={`${weeksRemaining} WKS`}
              />
              <FinanceRow
                label="TOTAL REMAINING"
                pence={contract.weeklyPayment * weeksRemaining}
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
      <FinanceRow label="LOAN AMOUNT" pence={loan.amount} accent={WK.yellow} />
      <FinanceRow label="WEEKLY REPAYMENT" pence={-loan.weeklyRepayment} accent={WK.orange} sign />
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

  const loanLimitPounds = getLoanLimit(club.reputation);
  const weeklyRepaymentPence = totalWeeklyRepayment();

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
          <FinanceRow label="CURRENT LOAN LIMIT" pence={loanLimitPounds * 100} accent={WK.yellow} />
          <FinanceRow label="WEEKLY REPAYMENTS" pence={-weeklyRepaymentPence} accent={WK.orange} sign />
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
              <View style={{ gap: 6, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <BodyText size={13} dim>CURRENT LIMIT:</BodyText>
                  <Money pence={loanLimitPounds * 100} dim />
                </View>
                <BodyText size={13} dim style={{ textAlign: 'center' }}>
                  INTEREST RATE: 4.6% OVER 52 WEEKS
                </BodyText>
              </View>

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
  { label: 'TV DEAL', value: 'tv_deal' },
  { label: 'LG SPNSR', value: 'league_sponsor' },
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
  tv_deal:              { label: 'TV',  color: WK.tealLight },
  league_sponsor:       { label: 'LGS', color: WK.tealLight },
  loan_repayment:       { label: 'LNR', color: WK.dim },
  contract_termination: { label: 'TRM', color: WK.red },
  investor_buyout:      { label: 'BYO', color: WK.red },
  guardian_payment:     { label: 'GRD', color: WK.yellow },
  matchday_income:      { label: 'MCH', color: WK.green },
  staff_signing:        { label: 'STF', color: WK.orange },
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

  const incomeCats: FinancialCategory[] = ['sponsor_payment', 'investment', 'earnings', 'transfer_fee', 'tv_deal', 'league_sponsor', 'matchday_income'];
  const expenseCats: FinancialCategory[] = ['wages', 'upkeep', 'facility_upgrade', 'contract_termination'];
  const totalIncomePence = incomeCats.reduce((s, c) => s + Math.max(0, getTotalByCategory(c, rangeWeeks)), 0);
  const totalExpensesPence = expenseCats.reduce((s, c) => s + Math.abs(Math.min(0, getTotalByCategory(c, rangeWeeks))), 0);
  const netTotalPence = totalIncomePence - totalExpensesPence;

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
        paddingVertical: 12,
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
          <BodyText size={13} color={WK.text} numberOfLines={1}>{item.description}</BodyText>
          <BodyText size={11} dim>WK {item.weekNumber}</BodyText>
        </View>

        {/* Amount */}
        <Money pence={item.amount} size={17} autoColor sign />
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
        paddingVertical: 8,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
          <BodyText size={14} dim>INCOME</BodyText>
          <Money pence={totalIncomePence} size={17} color={WK.green} sign />
        </View>
        <View style={{ height: 1, backgroundColor: WK.border }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
          <BodyText size={14} dim>EXPENSES</BodyText>
          <Money pence={-totalExpensesPence} size={17} color={WK.red} sign />
        </View>
        <View style={{ height: 1, backgroundColor: WK.tealMid }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
          <BodyText size={14}>NET ({RANGE_OPTIONS.find((r) => r.weeks === rangeWeeks)?.label})</BodyText>
          <Money pence={netTotalPence} size={18} autoColor sign />
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
        <Money pence={club.balance ?? 0} size={14} color={WK.yellow} />
      </View>

      {activeTab === 'BALANCE' && <BalancePane />}
      {activeTab === 'INVESTORS' && <InvestorsPane />}
      {activeTab === 'SPONSORS' && <SponsorsPane />}
      {activeTab === 'LOANS' && <LoansPane />}
      {activeTab === 'LEDGER' && <LedgerPane />}
    </SafeAreaView>
  );
}

