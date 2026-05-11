# Staff Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fixed-term contracts to coaches and scouts — sign-on fees on hire, morale decay + inbox warnings as contracts approach expiry, automatic removal at 0 weeks, DOF auto-renewal with fund check, and a renew/release flow with severance.

**Architecture:** Financial math lives in `src/engine/finance.ts`. Contract fields are added to `Coach` (coach.ts) and `Scout` (market.ts). The GameLoop gets a staff-expiry block mirroring the existing player enrollment engine. `hireCoach`/`hireScout` in marketStore accept a `durationWeeks` param; the UI owns fee display and transaction charging. Two new `FinancialCategory` values (`staff_sign_on`, `staff_severance`) are added.

**Tech Stack:** TypeScript, Zustand (coachStore, scoutStore, marketStore), React Native / NativeWind, Jest (`npm test`).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/finance.ts` | Modify | Add `staff_sign_on`, `staff_severance` categories |
| `src/types/gameConfig.ts` | Modify | Add 3 staff contract config fields + defaults |
| `src/types/coach.ts` | Modify | Add `contractEndWeek?`, `initialContractWeeks?` |
| `src/types/market.ts` | Modify | Add `contractEndWeek?`, `initialContractWeeks?` to `Scout` |
| `src/engine/finance.ts` | Modify | Add `calculateStaffSignOnFee`, `calculateStaffSeverance`; remove `staffCount*500`; add `scouts` param |
| `src/hooks/useClubMetrics.ts` | Modify | Pass scouts to `calculateWeeklyFinances` |
| `src/stores/marketStore.ts` | Modify | `hireCoach`/`hireScout` accept `durationWeeks`, set contract fields |
| `src/hooks/useAuthFlow.ts` | Modify | Set 2-year default contracts on starter coaches/scouts |
| `src/engine/GameLoop.ts` | Modify | Staff expiry engine (12/4/0wk warnings + decay); DOF staff auto-renew |
| `app/(tabs)/coaches.tsx` | Modify | Duration selector on hire; weeks-remaining badge; RENEW flow; severance in release dialog |
| `app/office/scouts.tsx` | Modify | Hire modal with duration; weeks-remaining badge; RENEW flow; release + severance |
| `src/__tests__/engine/finance.test.ts` | Create | Unit tests for `calculateStaffSignOnFee`, `calculateStaffSeverance` |

---

## Task 1: Data Model — Types and Config

**Files:**
- Modify: `src/types/finance.ts`
- Modify: `src/types/gameConfig.ts`
- Modify: `src/types/coach.ts`
- Modify: `src/types/market.ts`

- [ ] **Step 1: Add finance transaction categories in `src/types/finance.ts`**

Add to the `FinancialCategory` union (after `'staff_signing'`):
```ts
  | 'staff_sign_on'
  | 'staff_severance'
```

Add to `CATEGORY_LABELS`:
```ts
  staff_sign_on:   'STAFF SIGN-ON',
  staff_severance: 'STAFF SEVERANCE',
```

- [ ] **Step 2: Add config fields to `GameConfig` in `src/types/gameConfig.ts`**

Add in the `// ── Staff` section of the interface:
```ts
/** Minimum % of total contract value charged as sign-on fee. Default: 2 */
staffSignOnFeePercentMin: number;
/** Maximum % of total contract value charged as sign-on fee. Default: 8 */
staffSignOnFeePercentMax: number;
/** % of remaining contract value paid as severance on early release. Default: 50 */
staffSeverancePercent: number;
```

Add to `DEFAULT_GAME_CONFIG`:
```ts
staffSignOnFeePercentMin: 2,
staffSignOnFeePercentMax: 8,
staffSeverancePercent: 50,
```

- [ ] **Step 3: Add contract fields to `Coach` in `src/types/coach.ts`** (after `joinedWeek`):
```ts
/** Game week when this contract expires. Undefined = legacy/no contract. */
contractEndWeek?: number;
/** Original duration chosen at signing (52, 104, or 156 weeks). Used for DOF auto-renewal. */
initialContractWeeks?: number;
```

- [ ] **Step 4: Add contract fields to `Scout` in `src/types/market.ts`** (after `joinedWeek`):
```ts
/** Game week when this contract expires. Undefined = legacy/no contract. */
contractEndWeek?: number;
/** Original duration chosen at signing (52, 104, or 156 weeks). Used for DOF auto-renewal. */
initialContractWeeks?: number;
```

- [ ] **Step 5: TypeScript check**
```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors from the four changed files.

- [ ] **Step 6: Commit**
```bash
git add src/types/finance.ts src/types/gameConfig.ts src/types/coach.ts src/types/market.ts
git commit -m "feat: add staff contract types — contractEndWeek, sign-on/severance categories, config fields"
```

---

## Task 2: Finance Engine Helpers + Legacy Cleanup (TDD)

**Files:**
- Create: `src/__tests__/engine/finance.test.ts`
- Modify: `src/engine/finance.ts`
- Modify: `src/hooks/useClubMetrics.ts`

- [ ] **Step 1: Write failing tests — create `src/__tests__/engine/finance.test.ts`**

```ts
import { calculateStaffSignOnFee, calculateStaffSeverance } from '@/engine/finance';

describe('calculateStaffSignOnFee', () => {
  it('returns a value within [totalValue * percentMin / 100, totalValue * percentMax / 100]', () => {
    const salary = 10_000;
    const duration = 52;
    const totalValue = salary * duration; // 520_000
    const fee = calculateStaffSignOnFee(salary, duration, 2, 8);
    expect(fee).toBeGreaterThanOrEqual(Math.round(totalValue * 2 / 100));
    expect(fee).toBeLessThanOrEqual(Math.round(totalValue * 8 / 100));
  });

  it('2yr fee is ~2x 1yr fee averaged over many trials', () => {
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < 1000; i++) {
      sum1 += calculateStaffSignOnFee(10_000, 52,  2, 8);
      sum2 += calculateStaffSignOnFee(10_000, 104, 2, 8);
    }
    expect(sum2 / sum1).toBeCloseTo(2.0, 0);
  });

  it('returns 0 when salary is 0', () => {
    expect(calculateStaffSignOnFee(0, 52, 2, 8)).toBe(0);
  });
});

describe('calculateStaffSeverance', () => {
  it('returns salary * weeksRemaining * percent / 100', () => {
    // 10_000 * 26 * 50 / 100 = 130_000
    expect(calculateStaffSeverance(10_000, 26, 50)).toBe(130_000);
  });

  it('returns 0 when no weeks remain', () => {
    expect(calculateStaffSeverance(10_000, 0, 50)).toBe(0);
  });

  it('returns 0 when severance percent is 0', () => {
    expect(calculateStaffSeverance(10_000, 52, 0)).toBe(0);
  });

  it('returns full remaining value when percent is 100', () => {
    expect(calculateStaffSeverance(5_000, 10, 100)).toBe(50_000);
  });
});
```

- [ ] **Step 2: Run — confirm FAIL**
```bash
npx jest src/__tests__/engine/finance.test.ts --no-coverage 2>&1 | tail -10
```
Expected: FAIL with `calculateStaffSignOnFee is not a function`.

- [ ] **Step 3: Implement the two helpers in `src/engine/finance.ts`** (add after `calculateExtensionCost`):

```ts
/**
 * Sign-on fee (pence) when hiring a staff member for durationWeeks.
 * Fee = totalContractValue × rand(percentMin, percentMax) / 100
 */
export function calculateStaffSignOnFee(
  weeklySalaryPence: number,
  durationWeeks: number,
  percentMin: number,
  percentMax: number,
): number {
  const totalValue = weeklySalaryPence * durationWeeks;
  const pct = percentMin + Math.random() * (percentMax - percentMin);
  return Math.round(totalValue * pct / 100);
}

/**
 * Severance payout (pence) on early release.
 * Severance = weeklySalary × weeksRemaining × severancePercent / 100
 */
export function calculateStaffSeverance(
  weeklySalaryPence: number,
  weeksRemaining: number,
  severancePercent: number,
): number {
  return Math.round(weeklySalaryPence * weeksRemaining * severancePercent / 100);
}
```

- [ ] **Step 4: Remove `staffCount * 500` block; add scout salary support in `src/engine/finance.ts`**

Add import at top:
```ts
import { Scout } from '@/types/market';
```

Update `calculateWeeklyFinances` signature — add `scouts: Scout[] = []` as last param:
```ts
export function calculateWeeklyFinances(
  week: number,
  club: Club,
  players: Player[],
  coaches: Coach[],
  facilityLevels: FacilityLevels,
  sponsors: Sponsor[] = [],
  weeklyLoanRepayment: number = 0,
  facilityTemplates: FacilityTemplate[] = [],
  playerWageMultiplier: number = 1.0,
  scouts: Scout[] = [],
): FinancialRecord {
```

**Delete** the legacy staff wages block (the 4 lines for `staffWages = club.staffCount * 500`).

**After** the coach salary block, add:
```ts
// Scout salaries
const scoutSalaryTotal = scouts.reduce((sum, s) => sum + s.salary, 0);
if (scoutSalaryTotal > 0) {
  breakdown.push({ label: 'Scout salaries', amount: scoutSalaryTotal });
}
```

- [ ] **Step 5: Pass scouts to `calculateWeeklyFinances` in `src/hooks/useClubMetrics.ts`**

Add import:
```ts
import { useScoutStore } from '@/stores/scoutStore';
```

Add inside the hook body:
```ts
const scouts = useScoutStore((s) => s.scouts);
```

Update the call to add `scouts` as the last argument:
```ts
const baseNet = calculateWeeklyFinances(
  club.weekNumber ?? 1,
  club,
  players,
  coaches,
  levels,
  [],
  0,
  facilityTemplates,
  1.0,
  scouts,
).net + sponsorIncomePence;
```

- [ ] **Step 6: Pass scouts to `calculateWeeklyFinances` in `src/engine/GameLoop.ts`**

The `scouts` variable is already read early in `processWeeklyTick` (`const { scouts } = useScoutStore.getState()`). Update the call at section 6:
```ts
const financialSummary = calculateWeeklyFinances(
  weekNumber, club, players, coaches, levels, [], weeklyLoanRepayment, facilityTemplates,
  config.playerWageMultiplier,
  scouts,
);
```

- [ ] **Step 7: Run tests — confirm PASS**
```bash
npx jest src/__tests__/engine/finance.test.ts --no-coverage 2>&1 | tail -10
```
Expected: PASS (7 tests).

- [ ] **Step 8: Commit**
```bash
git add src/__tests__/engine/finance.test.ts src/engine/finance.ts src/hooks/useClubMetrics.ts src/engine/GameLoop.ts
git commit -m "feat: calculateStaffSignOnFee/Severance; remove legacy staffCount wage; scout salary in weekly finances"
```

---

## Task 3: Store + Bootstrap — Hire with Duration, Starter Contracts

**Files:**
- Modify: `src/stores/marketStore.ts`
- Modify: `src/hooks/useAuthFlow.ts`

- [ ] **Step 1: Update `hireCoach` and `hireScout` signatures in the `MarketState` interface**

```ts
hireCoach: (coachId: string, weekNumber: number, durationWeeks: number) => void;
hireScout: (scoutId: string, weekNumber: number, durationWeeks: number) => void;
```

- [ ] **Step 2: Update `hireCoach` implementation** — change signature and add contract fields to `addCoach`:

```ts
hireCoach: (coachId, weekNumber, durationWeeks) => {
  const marketCoach = get().coaches.find((c) => c.id === coachId);
  if (!marketCoach) return;
  const { generatePersonality } = require('@/engine/personality');
  const { generateAppearance } = require('@/engine/appearance');
  const personality = generatePersonality();
  useCoachStore.getState().addCoach({
    id: marketCoach.id,
    name: `${marketCoach.firstName} ${marketCoach.lastName}`,
    role: marketCoach.role,
    salary: marketCoach.salary,
    influence: marketCoach.influence,
    personality,
    appearance: generateAppearance(marketCoach.id, 'COACH', 35, personality),
    nationality: marketCoach.nationality,
    joinedWeek: weekNumber,
    contractEndWeek: weekNumber + durationWeeks,
    initialContractWeeks: durationWeeks,
    morale: marketCoach.morale ?? randomBaseMorale(useGameConfigStore.getState().config.defaultMoraleMin, useGameConfigStore.getState().config.defaultMoraleMax),
    specialisms: marketCoach.specialisms,
    relationships: [],
    tier: marketCoach.tier,
  });
  set((state) => ({ coaches: state.coaches.filter((c) => c.id !== coachId) }));
  const { setReputation: setRep, markRepActivity } = useClubStore.getState();
  setRep(1.0);
  markRepActivity();
},
```

- [ ] **Step 3: Update `hireScout` implementation** — change signature and add contract fields to `addScout`:

```ts
hireScout: (scoutId, weekNumber, durationWeeks) => {
  const marketScout = get().marketScouts.find((s) => s.id === scoutId);
  if (!marketScout) return;
  const { generateAppearance } = require('@/engine/appearance');
  const { computePlayerAge, getGameDate } = require('@/utils/gameDate');
  const gameDate = getGameDate(weekNumber);
  const ageRaw = marketScout.dateOfBirth ? computePlayerAge(marketScout.dateOfBirth, gameDate) : 35;
  const scoutAge = typeof ageRaw === 'number' ? ageRaw : 35;
  useScoutStore.getState().addScout({
    id: marketScout.id,
    name: `${marketScout.firstName} ${marketScout.lastName}`,
    role: marketScout.role,
    salary: marketScout.salary,
    scoutingRange: marketScout.scoutingRange,
    successRate: marketScout.successRate,
    nationality: marketScout.nationality,
    joinedWeek: weekNumber,
    contractEndWeek: weekNumber + durationWeeks,
    initialContractWeeks: durationWeeks,
    appearance: generateAppearance(marketScout.id, 'SCOUT', scoutAge),
    morale: randomBaseMorale(useGameConfigStore.getState().config.defaultMoraleMin, useGameConfigStore.getState().config.defaultMoraleMax),
    relationships: [],
    assignedPlayerIds: [],
    tier: marketScout.tier,
  });
  set((state) => ({ marketScouts: state.marketScouts.filter((s) => s.id !== scoutId) }));
},
```

- [ ] **Step 4: Give starter staff 2-year contracts in `src/hooks/useAuthFlow.ts`**

Replace the `for (const coach of assignedCoaches)` loop:
```ts
for (const coach of assignedCoaches) {
  const contractFields = { contractEndWeek: weekNumber + 104, initialContractWeeks: 104 };
  if (coach.role === 'director_of_football') {
    hasDof = true;
    addCoach({ ...coach, ...contractFields, dofAutoRenewContracts: true, dofAutoAssignScouts: true, dofAutoSignPlayers: true });
  } else if (coach.role === 'facility_manager') {
    hasFacilityManager = true;
    addCoach({ ...coach, ...contractFields, facilityManagerAutoRepair: true });
  } else {
    addCoach({ ...coach, ...contractFields });
  }
}
for (const scout of assignedScouts) {
  addScout({ ...scout, contractEndWeek: weekNumber + 104, initialContractWeeks: 104 });
}
```

- [ ] **Step 5: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "marketStore\|useAuthFlow" | head -20
```
Expected: no errors.

- [ ] **Step 6: Commit**
```bash
git add src/stores/marketStore.ts src/hooks/useAuthFlow.ts
git commit -m "feat: hireCoach/hireScout accept durationWeeks; starter staff get 2-year default contracts"
```

---

## Task 4: GameLoop — Staff Expiry Engine + DOF Auto-Renew

**Files:**
- Modify: `src/engine/GameLoop.ts`

- [ ] **Step 1: Add `calculateStaffSignOnFee` to the GameLoop finance import**
```ts
import { calculateWeeklyFinances, calculateWeeklyWage, calculateStaffSignOnFee } from './finance';
```

- [ ] **Step 2: Add staff contract expiry block**

Find the comment `// ── 4. Injury morale impact` and insert the following block **immediately before it**:

```ts
// ── 3d. Staff contract expiry ─────────────────────────────────────────────
// Mirrors player enrollment expiry. Fires inbox warnings at 12 and 4 weeks
// remaining, applies morale decay weeks 1–11, removes the member at 0 weeks.
{
  const { updateCoach: updateCoachRecord, removeCoach: expireCoach } = useCoachStore.getState();
  const { scouts: hiredScouts, updateScout: updateScoutRecord, removeScout: expireScout } = useScoutStore.getState();

  type StaffEntry = {
    id: string; name: string; salary: number; morale?: number;
    contractEndWeek?: number; initialContractWeeks?: number;
    _type: 'coach' | 'scout';
  };

  const allStaff: StaffEntry[] = [
    ...coaches.map((c) => ({ ...c, _type: 'coach' as const })),
    ...hiredScouts.map((s) => ({ ...s, _type: 'scout' as const })),
  ];

  for (const staff of allStaff) {
    if (staff.contractEndWeek === undefined) continue;
    const weeksRemaining = staff.contractEndWeek - weekNumber;

    if (weeksRemaining <= 0) {
      if (staff._type === 'coach') expireCoach(staff.id);
      else expireScout(staff.id);
      addMessage({
        id: `staff-expired-${staff.id}-wk${weekNumber}`,
        type: 'system',
        week: weekNumber,
        subject: `${staff.name} Has Left`,
        body: `${staff.name}'s contract has expired and they have left the club.`,
        isRead: false,
        entityId: staff.id,
      });
      continue;
    }

    // Morale decay: weeks 1–11
    if (weeksRemaining <= 11) {
      const newMorale = Math.max(0, Math.min(100, (staff.morale ?? 70) - 2));
      if (staff._type === 'coach') updateCoachRecord(staff.id, { morale: newMorale });
      else updateScoutRecord(staff.id, { morale: newMorale });
    }

    if (weeksRemaining === 12) {
      addMessage({
        id: `staff-warn-12-${staff.id}-wk${weekNumber}`,
        type: 'system',
        week: weekNumber,
        subject: 'Staff Contract Expiring Soon',
        body: `${staff.name}'s contract ends in 12 weeks. Renew it from the staff screen or they will leave the club.`,
        isRead: false,
        entityId: staff.id,
      });
    }

    if (weeksRemaining === 4) {
      addMessage({
        id: `staff-warn-4-${staff.id}-wk${weekNumber}`,
        type: 'system',
        week: weekNumber,
        subject: 'Staff Contract Ending — Final Notice',
        body: `${staff.name}'s contract ends in 4 weeks. Their morale is suffering. Act now or they will leave.`,
        isRead: false,
        entityId: staff.id,
      });
    }
  }
}
```

- [ ] **Step 3: Add DOF staff auto-renew in section 14**

Find the end of section `// ── 14b. Auto-assign scouts` and add the following block **after it** (still inside `if (dof)`):

```ts
// ── 14c. DOF auto-renew staff contracts ──────────────────────────────────
if (dof.dofAutoRenewContracts) {
  const { staffSignOnFeePercentMin, staffSignOnFeePercentMax } = config;
  const { scouts: currentScouts } = useScoutStore.getState();
  const { updateCoach: renewCoach } = useCoachStore.getState();
  const { updateScout: renewScout } = useScoutStore.getState();

  type RenewEntry = {
    id: string; name: string; salary: number;
    contractEndWeek?: number; initialContractWeeks?: number;
    _type: 'coach' | 'scout';
  };
  const renewCandidates: RenewEntry[] = [
    ...coaches.filter((c) => c.id !== dof.id).map((c) => ({ ...c, _type: 'coach' as const })),
    ...currentScouts.map((s) => ({ ...s, _type: 'scout' as const })),
  ];

  for (const staff of renewCandidates) {
    if (staff.contractEndWeek === undefined) continue;
    const weeksLeft = staff.contractEndWeek - weekNumber;
    if (weeksLeft <= 0 || weeksLeft > 12) continue;

    const guardId = `dof-staff-renew-${staff.id}-end${staff.contractEndWeek}`;
    if (useInboxStore.getState().messages.some((m) => m.id === guardId)) continue;

    const renewWeeks = staff.initialContractWeeks ?? 52;
    const signOnFee = calculateStaffSignOnFee(staff.salary, renewWeeks, staffSignOnFeePercentMin, staffSignOnFeePercentMax);
    const currentBalance = useClubStore.getState().club.balance ?? 0;

    if (currentBalance < signOnFee) {
      addMessage({
        id: guardId,
        type: 'system',
        week: weekNumber,
        subject: `${staff.name} Renewal Failed`,
        body: `${dof.name} could not renew ${staff.name}'s contract — insufficient funds. Sign-on fee required: £${Math.round(signOnFee / 100).toLocaleString()}.`,
        isRead: false,
        entityId: staff.id,
      });
      continue;
    }

    useFinanceStore.getState().addTransaction({
      amount: -signOnFee,
      category: 'staff_sign_on',
      description: `${dof.name} renewed ${staff.name}'s contract (${renewWeeks / 52} yr)`,
      weekNumber,
    });

    const newEnd = weekNumber + renewWeeks;
    if (staff._type === 'coach') renewCoach(staff.id, { contractEndWeek: newEnd, initialContractWeeks: renewWeeks });
    else renewScout(staff.id, { contractEndWeek: newEnd, initialContractWeeks: renewWeeks });

    addMessage({
      id: guardId,
      type: 'system',
      week: weekNumber,
      subject: `${staff.name} Contract Renewed`,
      body: `${dof.name} has renewed ${staff.name}'s contract for ${renewWeeks / 52} year(s). Sign-on fee of £${Math.round(signOnFee / 100).toLocaleString()} paid.`,
      isRead: false,
      entityId: staff.id,
      metadata: { systemType: 'dof_staff_contract_renewal' },
    });
  }
}
```

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "GameLoop" | head -20
```
Expected: no errors.

- [ ] **Step 5: Full test suite**
```bash
npx jest --no-coverage 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 6: Commit**
```bash
git add src/engine/GameLoop.ts
git commit -m "feat: GameLoop staff contract expiry (12/4/0wk warnings, morale decay) + DOF staff auto-renew"
```

---

## Task 5: Coaches UI — Duration Selector, Weeks Remaining, Renew, Severance

**Files:**
- Modify: `app/(tabs)/coaches.tsx`

- [ ] **Step 1: Add imports at top of `app/(tabs)/coaches.tsx`**
```ts
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { calculateStaffSignOnFee, calculateStaffSeverance } from '@/engine/finance';
```

- [ ] **Step 2: Add DURATION_OPTIONS constant** (before any component definition):
```ts
const DURATION_OPTIONS = [
  { weeks: 52,  label: '1 YEAR' },
  { weeks: 104, label: '2 YEARS' },
  { weeks: 156, label: '3 YEARS' },
];
```

- [ ] **Step 3: Replace `ProspectCard` with duration-selector version**

```tsx
function ProspectCard({
  coach,
  onSign,
}: {
  coach: MarketCoach;
  onSign: (durationWeeks: number, signOnFeePence: number) => void;
}) {
  const config = useGameConfigStore((s) => s.config);
  return (
    <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.tealMid, padding: 12, marginBottom: 10, ...pixelShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <Avatar appearance={generateAppearance(coach.id, 'COACH', 35)} role="COACH" size={44} morale={70} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.firstName} {coach.lastName}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.replace(/_/g, ' ').toUpperCase()}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={coach.nationality} size={12} />
            <PixelText size={7} dim>{coach.nationality}</PixelText>
          </View>
        </View>
        <Badge label={`INF ${coach.influence}`} color="green" />
      </View>
      <PixelText size={6} dim style={{ marginBottom: 6 }}>SALARY: £{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
      <View style={{ gap: 6 }}>
        {DURATION_OPTIONS.map((opt) => {
          const fee = calculateStaffSignOnFee(coach.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
          return (
            <Button key={opt.weeks} label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`} variant="yellow" fullWidth onPress={() => onSign(opt.weeks, fee)} />
          );
        })}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Replace `CoachCard` with version showing weeks remaining + RENEW**

```tsx
function CoachCard({ coach, weekNumber, onFire, onRenew }: { coach: Coach; weekNumber: number; onFire: () => void; onRenew: () => void }) {
  const weeksRemaining = coach.contractEndWeek !== undefined ? Math.max(0, coach.contractEndWeek - weekNumber) : undefined;
  const contractColor = weeksRemaining === undefined ? WK.tealLight : weeksRemaining <= 4 ? WK.red : weeksRemaining <= 12 ? WK.orange : WK.green;
  return (
    <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 12, marginBottom: 10, ...pixelShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Avatar appearance={coach.appearance} role="COACH" size={44} morale={coach.morale ?? 70} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.replace(/_/g, ' ').toUpperCase()}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={coach.nationality} size={12} />
            <PixelText size={7} dim>{coach.nationality}</PixelText>
          </View>
          {weeksRemaining !== undefined && (
            <PixelText size={6} color={contractColor} style={{ marginTop: 2 }}>CONTRACT: {weeksRemaining} WKS</PixelText>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`INF ${coach.influence}`} color="yellow" />
          <PixelText size={6} dim>£{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
        </View>
      </View>
      {coach.specialisms && Object.keys(coach.specialisms).length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {(Object.entries(coach.specialisms) as [string, number][]).map(([key, val]) => (
            <Badge key={key} label={key.toUpperCase()} color={val >= 70 ? 'green' : val >= 40 ? 'yellow' : 'dim'} />
          ))}
        </View>
      )}
      <View style={{ marginTop: 8 }}>
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
          <View style={{ height: '100%', width: `${(coach.influence / 20) * 100}%`, backgroundColor: traitColor(coach.influence) }} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
        <Pressable onPress={() => { hapticWarning(); onRenew(); }}>
          <PixelText size={6} color={WK.yellow}>[ RENEW ]</PixelText>
        </Pressable>
        <Pressable onPress={() => { hapticWarning(); onFire(); }}>
          <PixelText size={6} color={WK.red}>[ RELEASE ]</PixelText>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Update `CoachesScreen` — new state, updated handlers, updated JSX**

Replace the screen body (keeping the existing return structure, updating the logic):

```tsx
export default function CoachesScreen() {
  const { coaches, removeCoach, updateCoach } = useCoachStore();
  const { club } = useClubStore();
  const { coaches: marketCoaches, hireCoach } = useMarketStore();
  const config = useGameConfigStore((s) => s.config);
  const { addTransaction } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [pendingFireId, setPendingFireId] = useState<string | null>(null);
  const [pendingRenewCoach, setPendingRenewCoach] = useState<Coach | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const weekNumber = club.weekNumber ?? 1;
  const totalInfluence = coaches.reduce((s, c) => s + c.influence, 0);
  const totalSalary = coaches.reduce((s, c) => s + c.salary, 0);
  const prospects = marketCoaches.slice(0, 3);

  const firingCoach = coaches.find((c) => c.id === pendingFireId) ?? null;
  const severance = firingCoach?.contractEndWeek !== undefined
    ? calculateStaffSeverance(firingCoach.salary, Math.max(0, firingCoach.contractEndWeek - weekNumber), config.staffSeverancePercent)
    : 0;

  function signCoach(coach: MarketCoach, durationWeeks: number, signOnFeePence: number) {
    if ((club.balance ?? 0) < signOnFeePence) {
      setSignError(`INSUFFICIENT FUNDS — need £${Math.round(signOnFeePence / 100).toLocaleString()}`);
      return;
    }
    setSignError(null);
    addTransaction({ amount: -signOnFeePence, category: 'staff_sign_on', description: `Signed ${coach.firstName} ${coach.lastName} (${durationWeeks / 52} yr)`, weekNumber });
    hireCoach(coach.id, weekNumber, durationWeeks);
  }

  function confirmFire() {
    if (!pendingFireId) return;
    if (severance > 0) {
      addTransaction({ amount: -severance, category: 'staff_severance', description: `Released ${firingCoach?.name ?? 'staff'}`, weekNumber });
    }
    removeCoach(pendingFireId);
    setPendingFireId(null);
  }

  function renewCoach(durationWeeks: number) {
    if (!pendingRenewCoach) return;
    const fee = calculateStaffSignOnFee(pendingRenewCoach.salary, durationWeeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
    if ((club.balance ?? 0) < fee) {
      setSignError(`INSUFFICIENT FUNDS — need £${Math.round(fee / 100).toLocaleString()}`);
      return;
    }
    setSignError(null);
    addTransaction({ amount: -fee, category: 'staff_sign_on', description: `Renewed ${pendingRenewCoach.name}'s contract (${durationWeeks / 52} yr)`, weekNumber });
    updateCoach(pendingRenewCoach.id, { contractEndWeek: weekNumber + durationWeeks, initialContractWeeks: durationWeeks });
    setShowRenewModal(false);
    setPendingRenewCoach(null);
  }
```

Update `renderItem` in the FlatList:
```tsx
renderItem={({ item }) => (
  <CoachCard
    coach={item}
    weekNumber={weekNumber}
    onFire={() => setPendingFireId(item.id)}
    onRenew={() => { setPendingRenewCoach(item); setSignError(null); setShowRenewModal(true); }}
  />
)}
```

Update `ProspectCard` usage in the modal:
```tsx
{prospects.map((c) => (
  <ProspectCard key={c.id} coach={c} onSign={(dur, fee) => signCoach(c, dur, fee)} />
))}
```

Add renew modal (insert after the prospect modal `</Modal>`):
```tsx
<Modal visible={showRenewModal} transparent animationType="fade" onRequestClose={() => { setShowRenewModal(false); setSignError(null); }}>
  <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => { setShowRenewModal(false); setSignError(null); }}>
    <Pressable onPress={() => {}} style={{ width: '90%' }}>
      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
        <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 6 }}>Renew Contract</PixelText>
        {pendingRenewCoach && <PixelText size={7} color={WK.tealLight} style={{ textAlign: 'center', marginBottom: 14 }}>{pendingRenewCoach.name}</PixelText>}
        {signError && <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{signError}</PixelText>}
        <View style={{ gap: 8 }}>
          {pendingRenewCoach && DURATION_OPTIONS.map((opt) => {
            const fee = calculateStaffSignOnFee(pendingRenewCoach.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
            return <Button key={opt.weeks} label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`} variant="yellow" fullWidth onPress={() => renewCoach(opt.weeks)} />;
          })}
          <Button label="CANCEL" variant="teal" fullWidth onPress={() => { setShowRenewModal(false); setSignError(null); }} />
        </View>
      </View>
    </Pressable>
  </Pressable>
</Modal>
```

Update the fire dialog to show severance:
```tsx
<PixelDialog
  visible={!!pendingFireId}
  title="Release Coach?"
  message={severance > 0
    ? `Releasing this coach requires a severance payout of £${Math.round(severance / 100).toLocaleString()}. Proceed?`
    : 'Are you sure you want to release this coach?'}
  onClose={() => setPendingFireId(null)}
  onConfirm={confirmFire}
  confirmLabel="RELEASE"
  confirmVariant="red"
/>
```

- [ ] **Step 6: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "coaches" | head -20
```
Expected: no errors.

- [ ] **Step 7: Commit**
```bash
git add "app/(tabs)/coaches.tsx"
git commit -m "feat: coaches UI — duration selector, weeks-remaining badge, RENEW flow, severance on release"
```

---

## Task 6: Scouts UI — Hire Modal, Weeks Remaining, Renew, Severance

**Files:**
- Modify: `app/office/scouts.tsx`

- [ ] **Step 1: Replace imports section entirely**

```ts
import { useState } from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { WK, pixelShadow } from '@/constants/theme';
import { MoraleBar } from '@/components/ui/MoraleBar';
import { useScoutStore } from '@/stores/scoutStore';
import { useMarketStore } from '@/stores/marketStore';
import { useClubStore } from '@/stores/clubStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useFinanceStore } from '@/stores/financeStore';
import { Scout, MarketScout } from '@/types/market';
import { hapticWarning } from '@/utils/haptics';
import { calculateStaffSignOnFee, calculateStaffSeverance } from '@/engine/finance';

const DURATION_OPTIONS = [
  { weeks: 52,  label: '1 YEAR' },
  { weeks: 104, label: '2 YEARS' },
  { weeks: 156, label: '3 YEARS' },
];
```

- [ ] **Step 2: Update `ScoutCard` props and add contract display + action buttons**

Change the component signature:
```tsx
function ScoutCard({ scout, weekNumber, onPress, onRenew, onRelease }: {
  scout: Scout; weekNumber: number; onPress: () => void; onRenew: () => void; onRelease: () => void;
})
```

Inside the component, add before the closing `</View>` of the outer card:
```tsx
const weeksRemaining = scout.contractEndWeek !== undefined ? Math.max(0, scout.contractEndWeek - weekNumber) : undefined;
const contractColor = weeksRemaining === undefined ? WK.tealLight : weeksRemaining <= 4 ? WK.red : weeksRemaining <= 12 ? WK.orange : WK.green;
```

After the morale warning block, before the final closing `</View></Pressable>`, add:
```tsx
{weeksRemaining !== undefined && (
  <PixelText size={6} color={contractColor} style={{ marginTop: 8 }}>CONTRACT: {weeksRemaining} WKS</PixelText>
)}
<View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
  <Pressable onPress={() => { hapticWarning(); onRenew(); }}>
    <PixelText size={6} color={WK.yellow}>[ RENEW ]</PixelText>
  </Pressable>
  <Pressable onPress={() => { hapticWarning(); onRelease(); }}>
    <PixelText size={6} color={WK.red}>[ RELEASE ]</PixelText>
  </Pressable>
</View>
```

- [ ] **Step 3: Add `ProspectScoutCard` component** (after `ScoutCard`):

```tsx
function ProspectScoutCard({ scout, onSign }: { scout: MarketScout; onSign: (durationWeeks: number, signOnFeePence: number) => void }) {
  const config = useGameConfigStore((s) => s.config);
  return (
    <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.tealMid, padding: 12, marginBottom: 10, ...pixelShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{scout.firstName} {scout.lastName}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{scout.scoutingRange.toUpperCase()} SCOUT</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={scout.nationality} size={10} />
            <PixelText size={6} dim>{scout.nationality}</PixelText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`${scout.successRate}% RATE`} color="yellow" />
          <PixelText size={6} dim>£{Math.round(scout.salary / 100).toLocaleString()}/wk</PixelText>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        {DURATION_OPTIONS.map((opt) => {
          const fee = calculateStaffSignOnFee(scout.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
          return <Button key={opt.weeks} label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`} variant="yellow" fullWidth onPress={() => onSign(opt.weeks, fee)} />;
        })}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Replace `MarketScoutsScreen` with full implementation**

```tsx
export default function MarketScoutsScreen() {
  const router = useRouter();
  const scouts = useScoutStore((s) => s.scouts);
  const { removeScout, updateScout } = useScoutStore();
  const { marketScouts, hireScout } = useMarketStore();
  const { club } = useClubStore();
  const config = useGameConfigStore((s) => s.config);
  const { addTransaction } = useFinanceStore();

  const [showHireModal, setShowHireModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState<string | null>(null);
  const [pendingRenewScout, setPendingRenewScout] = useState<Scout | null>(null);
  const [hireError, setHireError] = useState<string | null>(null);
  const [renewError, setRenewError] = useState<string | null>(null);

  const weekNumber = club.weekNumber ?? 1;
  const prospects = marketScouts.slice(0, 3);

  const releasingScout = scouts.find((s) => s.id === pendingReleaseId) ?? null;
  const severance = releasingScout?.contractEndWeek !== undefined
    ? calculateStaffSeverance(releasingScout.salary, Math.max(0, releasingScout.contractEndWeek - weekNumber), config.staffSeverancePercent)
    : 0;

  function signScout(scout: MarketScout, durationWeeks: number, signOnFeePence: number) {
    if ((club.balance ?? 0) < signOnFeePence) {
      setHireError(`INSUFFICIENT FUNDS — need £${Math.round(signOnFeePence / 100).toLocaleString()}`);
      return;
    }
    setHireError(null);
    addTransaction({ amount: -signOnFeePence, category: 'staff_sign_on', description: `Signed ${scout.firstName} ${scout.lastName} (${durationWeeks / 52} yr)`, weekNumber });
    hireScout(scout.id, weekNumber, durationWeeks);
  }

  function confirmRelease() {
    if (!pendingReleaseId) return;
    if (severance > 0) {
      addTransaction({ amount: -severance, category: 'staff_severance', description: `Released ${releasingScout?.name ?? 'scout'}`, weekNumber });
    }
    removeScout(pendingReleaseId);
    setPendingReleaseId(null);
  }

  function renewScout(durationWeeks: number) {
    if (!pendingRenewScout) return;
    const fee = calculateStaffSignOnFee(pendingRenewScout.salary, durationWeeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
    if ((club.balance ?? 0) < fee) {
      setRenewError(`INSUFFICIENT FUNDS — need £${Math.round(fee / 100).toLocaleString()}`);
      return;
    }
    setRenewError(null);
    addTransaction({ amount: -fee, category: 'staff_sign_on', description: `Renewed ${pendingRenewScout.name}'s contract (${durationWeeks / 52} yr)`, weekNumber });
    updateScout(pendingRenewScout.id, { contractEndWeek: weekNumber + durationWeeks, initialContractWeeks: durationWeeks });
    setShowRenewModal(false);
    setPendingRenewScout(null);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />
      <View style={{ backgroundColor: WK.tealMid, borderBottomWidth: 4, borderBottomColor: WK.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={18} color={WK.text} />
        </Pressable>
        <PixelText size={9} upper style={{ flex: 1 }}>Scout Hub</PixelText>
        <PixelText size={7} color={WK.tealLight}>{scouts.length} SCOUTS</PixelText>
      </View>

      <View style={{ marginHorizontal: 10, marginTop: 10 }}>
        <Button label="◈ HIRE SCOUT" variant="green" fullWidth onPress={() => { setHireError(null); setShowHireModal(true); }} />
      </View>

      {scouts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <PixelText size={10} color={WK.yellow}>NO SCOUTS HIRED</PixelText>
          <PixelText size={7} dim>RECRUIT SCOUTS FROM THE MARKET</PixelText>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
          {scouts.map((scout) => (
            <ScoutCard
              key={scout.id}
              scout={scout}
              weekNumber={weekNumber}
              onPress={() => router.push(`/scout/${scout.id}`)}
              onRenew={() => { setPendingRenewScout(scout); setRenewError(null); setShowRenewModal(true); }}
              onRelease={() => setPendingReleaseId(scout.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Hire modal */}
      <Modal visible={showHireModal} transparent animationType="fade" onRequestClose={() => setShowHireModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowHireModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '90%', maxHeight: '80%' }}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 14 }}>Hire Scout</PixelText>
              {hireError && <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{hireError}</PixelText>}
              {prospects.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <PixelText size={7} dim>NO SCOUTS AVAILABLE</PixelText>
                  <View style={{ marginTop: 12 }}><Button label="CLOSE" variant="teal" onPress={() => setShowHireModal(false)} /></View>
                </View>
              ) : (
                <>
                  {prospects.map((s) => <ProspectScoutCard key={s.id} scout={s} onSign={(dur, fee) => signScout(s, dur, fee)} />)}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowHireModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Renew modal */}
      <Modal visible={showRenewModal} transparent animationType="fade" onRequestClose={() => { setShowRenewModal(false); setRenewError(null); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => { setShowRenewModal(false); setRenewError(null); }}>
          <Pressable onPress={() => {}} style={{ width: '90%' }}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 6 }}>Renew Contract</PixelText>
              {pendingRenewScout && <PixelText size={7} color={WK.tealLight} style={{ textAlign: 'center', marginBottom: 14 }}>{pendingRenewScout.name}</PixelText>}
              {renewError && <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{renewError}</PixelText>}
              <View style={{ gap: 8 }}>
                {pendingRenewScout && DURATION_OPTIONS.map((opt) => {
                  const fee = calculateStaffSignOnFee(pendingRenewScout.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
                  return <Button key={opt.weeks} label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`} variant="yellow" fullWidth onPress={() => renewScout(opt.weeks)} />;
                })}
                <Button label="CANCEL" variant="teal" fullWidth onPress={() => { setShowRenewModal(false); setRenewError(null); }} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Release confirmation */}
      <PixelDialog
        visible={!!pendingReleaseId}
        title="Release Scout?"
        message={severance > 0
          ? `Releasing this scout requires a severance payout of £${Math.round(severance / 100).toLocaleString()}. Proceed?`
          : 'Are you sure you want to release this scout?'}
        onClose={() => setPendingReleaseId(null)}
        onConfirm={confirmRelease}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "scouts\|office" | head -20
```
Expected: no errors.

- [ ] **Step 6: Full test suite**
```bash
npx jest --no-coverage 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 7: Commit**
```bash
git add app/office/scouts.tsx
git commit -m "feat: scouts UI — hire modal with duration selector, weeks-remaining badge, RENEW flow, severance on release"
```

---

## Spec Coverage

| Spec requirement | Task |
|---|---|
| GameConfig 3 new fields | Task 1 Step 2 |
| Coach contractEndWeek + initialContractWeeks | Task 1 Step 3 |
| Scout contractEndWeek + initialContractWeeks | Task 1 Step 4 |
| Sign-on fee formula | Task 2 Step 3 |
| `staff_sign_on` transaction category | Task 1 Step 1 |
| Severance formula | Task 2 Step 3 |
| `staff_severance` transaction category | Task 1 Step 1 |
| Remove staffCount*500 legacy | Task 2 Step 4 |
| 12-week warning + morale decay weeks 1–11 | Task 4 Step 2 |
| 4-week final warning | Task 4 Step 2 |
| 0-week expiry + inbox message | Task 4 Step 2 |
| DOF auto-renew at 12-week mark | Task 4 Step 3 |
| DOF uses initialContractWeeks duration | Task 4 Step 3 |
| DOF fund check before renewal | Task 4 Step 3 |
| Hiring modal duration selector (coaches) | Task 5 Steps 3–5 |
| Sign-on fee displayed per duration option | Task 5 Steps 3–5 |
| Hiring modal duration selector (scouts) | Task 6 Steps 3–4 |
| Weeks remaining on coach cards | Task 5 Step 4 |
| Weeks remaining on scout cards | Task 6 Step 2 |
| RENEW button (coaches) | Task 5 Steps 4–5 |
| RENEW button (scouts) | Task 6 Steps 2, 4 |
| Severance shown in release confirmation | Tasks 5–6 |
| Unit tests for finance math | Task 2 Step 1 |
| Integration: GameLoop expiry via full test run | Task 4 Step 5 |
