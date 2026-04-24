# Sponsor Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare `sponsorIds[]` tracking with a full per-contract system — negotiated weekly payment, fixed end week, expiry processing, renewal offers, and a live SPONSORS tab.

**Architecture:** A new `SponsorContract` type (stored in `club.sponsorContracts[]`) becomes the source of truth for income and display. A pure `sponsorEngine.ts` module owns the offer-calculation formula and probability look-up. `GameLoop.ts` checks expiry before computing finances, then generates offers using the new helpers. `inbox.tsx` writes a contract record on accept; `finances.tsx` reads contracts directly for display.

**Tech Stack:** Zustand + AsyncStorage persist, React Native, Jest (existing test runner at `src/__tests__/`)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/club.ts` | Add `SponsorContract` interface; add `sponsorContracts` to `Club` |
| Modify | `src/types/gameConfig.ts` | Add 8 probability fields; update `DEFAULT_GAME_CONFIG` |
| **Create** | `src/engine/sponsorEngine.ts` | Pure: `computeSponsorOffer()`, `getSponsorOfferProbability()`, `getInvestorOfferProbability()` |
| **Create** | `src/__tests__/engine/sponsorEngine.test.ts` | Unit tests for the above |
| Modify | `src/stores/clubStore.ts` | Add `sponsorContracts` to `DEFAULT_CLUB`; add `addSponsorContract` / `removeSponsorContract` actions; keep `sponsorIds` in sync |
| Modify | `src/engine/GameLoop.ts` | (a) Expiry + renewal at top of tick; (b) income from contracts; (c) use `sponsorEngine` helpers for offer generation; (d) use config probabilities for investor offers |
| Modify | `app/(tabs)/inbox.tsx` | Sponsor accept: call `addSponsorContract`; add max-10 cap guard |
| Modify | `app/(tabs)/finances.tsx` | `SponsorsPane`: read contracts (with name look-up + weeks-remaining bar). `BalancePane`: derive sponsor income from contracts |

---

## Constants (reference throughout)

```ts
const MAX_ACTIVE_SPONSORS = 10;
const CONTRACT_DURATIONS = [52, 104, 156] as const; // 1, 2, 3 game-years
```

---

## Task 1: Add `SponsorContract` type and `sponsorContracts` to `Club`

**Files:**
- Modify: `src/types/club.ts`

- [ ] **Step 1: Add `SponsorContract` interface**

In `src/types/club.ts`, directly above the `Club` interface, add:

```ts
/** A single active sponsorship contract — source of truth for income + display. */
export interface SponsorContract {
  /** Matches the Sponsor.id from the market data pool. */
  id: string;
  /** Agreed weekly payment in **pence**. */
  weeklyPayment: number;
  /** Game week at which this contract expires (exclusive — tick processes expiry when weekNumber >= endWeek). */
  endWeek: number;
}
```

- [ ] **Step 2: Add `sponsorContracts` to `Club` interface**

In `src/types/club.ts`, inside the `Club` interface, add after the `sponsorIds` line:

```ts
/** Active sponsorship contracts — replaces bare sponsorIds for income + display. */
sponsorContracts: SponsorContract[];
```

- [ ] **Step 3: Commit**

```bash
git add src/types/club.ts
git commit -m "feat(types): add SponsorContract; extend Club with sponsorContracts"
```

---

## Task 2: Add probability fields to `GameConfig`

**Files:**
- Modify: `src/types/gameConfig.ts`

- [ ] **Step 1: Add fields to `GameConfig` interface**

In `src/types/gameConfig.ts`, after the `staffRoles` field (end of the interface), add:

```ts
// ── Offer probabilities (per reputation tier, 0–1) ────────────────────────
/** Weekly probability of a sponsor offer when club is Local tier. */
sponsorProbabilityLocal: number;
/** Weekly probability of a sponsor offer when club is Regional tier. */
sponsorProbabilityRegional: number;
/** Weekly probability of a sponsor offer when club is National tier. */
sponsorProbabilityNational: number;
/** Weekly probability of a sponsor offer when club is Elite tier. */
sponsorProbabilityElite: number;
/** Weekly probability of an investor offer when club is Local tier. */
investorProbabilityLocal: number;
/** Weekly probability of an investor offer when club is Regional tier. */
investorProbabilityRegional: number;
/** Weekly probability of an investor offer when club is National tier. */
investorProbabilityNational: number;
/** Weekly probability of an investor offer when club is Elite tier. */
investorProbabilityElite: number;
```

- [ ] **Step 2: Add defaults to `DEFAULT_GAME_CONFIG`**

In `src/types/gameConfig.ts`, at the end of `DEFAULT_GAME_CONFIG`, after `staffRoles: []`:

```ts
sponsorProbabilityLocal:    1,
sponsorProbabilityRegional: 1,
sponsorProbabilityNational: 1,
sponsorProbabilityElite:    1,
investorProbabilityLocal:    0.2,
investorProbabilityRegional: 0.12,
investorProbabilityNational: 0.06,
investorProbabilityElite:    0.02,
```

- [ ] **Step 3: Commit**

```bash
git add src/types/gameConfig.ts
git commit -m "feat(config): add sponsor/investor offer probability fields per reputation tier"
```

---

## Task 3: Create `sponsorEngine.ts` with TDD

**Files:**
- Create: `src/engine/sponsorEngine.ts`
- Create: `src/__tests__/engine/sponsorEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/engine/sponsorEngine.test.ts`:

```ts
import {
  computeSponsorOffer,
  getSponsorOfferProbability,
  getInvestorOfferProbability,
} from '@/engine/sponsorEngine';
import { DEFAULT_GAME_CONFIG } from '@/types/gameConfig';

const cfg = DEFAULT_GAME_CONFIG;

describe('computeSponsorOffer', () => {
  it('SMALL sponsor at rep=0 returns value at or near smallSponsorMin', () => {
    // At rep=0, base = min + 0 * (max - min) = min. Jitter is ±10%, so within [min*0.9, min*1.1].
    const result = computeSponsorOffer('SMALL', 0, cfg);
    expect(result.weeklyPaymentPence).toBeGreaterThanOrEqual(cfg.smallSponsorMin * 0.9);
    expect(result.weeklyPaymentPence).toBeLessThanOrEqual(cfg.smallSponsorMin * 1.1);
  });

  it('SMALL sponsor at rep=100 returns value at or near smallSponsorMax', () => {
    const result = computeSponsorOffer('SMALL', 100, cfg);
    expect(result.weeklyPaymentPence).toBeGreaterThanOrEqual(cfg.smallSponsorMax * 0.9);
    expect(result.weeklyPaymentPence).toBeLessThanOrEqual(cfg.smallSponsorMax * 1.1);
  });

  it('MEDIUM sponsor at rep=50 returns value within medium range', () => {
    const result = computeSponsorOffer('MEDIUM', 50, cfg);
    const base = cfg.mediumSponsorMin + 0.5 * (cfg.mediumSponsorMax - cfg.mediumSponsorMin);
    expect(result.weeklyPaymentPence).toBeGreaterThanOrEqual(base * 0.9);
    expect(result.weeklyPaymentPence).toBeLessThanOrEqual(base * 1.1);
  });

  it('LARGE sponsor at rep=75 returns value within large range', () => {
    const result = computeSponsorOffer('LARGE', 75, cfg);
    const base = cfg.largeSponsorMin + 0.75 * (cfg.largeSponsorMax - cfg.largeSponsorMin);
    expect(result.weeklyPaymentPence).toBeGreaterThanOrEqual(base * 0.9);
    expect(result.weeklyPaymentPence).toBeLessThanOrEqual(base * 1.1);
  });

  it('contractWeeks is always 52, 104, or 156', () => {
    for (let i = 0; i < 30; i++) {
      const { contractWeeks } = computeSponsorOffer('SMALL', 50, cfg);
      expect([52, 104, 156]).toContain(contractWeeks);
    }
  });

  it('weeklyPaymentPence is always a whole number', () => {
    const { weeklyPaymentPence } = computeSponsorOffer('MEDIUM', 40, cfg);
    expect(Number.isInteger(weeklyPaymentPence)).toBe(true);
  });
});

describe('getSponsorOfferProbability', () => {
  it('returns Local probability for Local tier', () => {
    expect(getSponsorOfferProbability('Local', cfg)).toBe(cfg.sponsorProbabilityLocal);
  });
  it('returns Regional probability for Regional tier', () => {
    expect(getSponsorOfferProbability('Regional', cfg)).toBe(cfg.sponsorProbabilityRegional);
  });
  it('returns National probability for National tier', () => {
    expect(getSponsorOfferProbability('National', cfg)).toBe(cfg.sponsorProbabilityNational);
  });
  it('returns Elite probability for Elite tier', () => {
    expect(getSponsorOfferProbability('Elite', cfg)).toBe(cfg.sponsorProbabilityElite);
  });
});

describe('getInvestorOfferProbability', () => {
  it('returns correct probability per tier', () => {
    expect(getInvestorOfferProbability('Local',    cfg)).toBe(cfg.investorProbabilityLocal);
    expect(getInvestorOfferProbability('Regional', cfg)).toBe(cfg.investorProbabilityRegional);
    expect(getInvestorOfferProbability('National', cfg)).toBe(cfg.investorProbabilityNational);
    expect(getInvestorOfferProbability('Elite',    cfg)).toBe(cfg.investorProbabilityElite);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/__tests__/engine/sponsorEngine.test.ts --no-coverage
```

Expected: `Cannot find module '@/engine/sponsorEngine'`

- [ ] **Step 3: Create `src/engine/sponsorEngine.ts`**

```ts
import type { GameConfig } from '@/types/gameConfig';
import type { ReputationTier } from '@/types/club';

type CompanySize = 'SMALL' | 'MEDIUM' | 'LARGE';

const CONTRACT_DURATIONS = [52, 104, 156] as const;

/**
 * Compute a sponsor's negotiated weekly payment (pence) and contract duration.
 *
 * Formula:
 *   base = min + (rep / 100) × (max − min)
 *   jitter = random in [0.90, 1.10]
 *   weeklyPaymentPence = round(base × jitter)
 */
export function computeSponsorOffer(
  size: CompanySize,
  reputation: number,
  config: Pick<
    GameConfig,
    | 'smallSponsorMin' | 'smallSponsorMax'
    | 'mediumSponsorMin' | 'mediumSponsorMax'
    | 'largeSponsorMin' | 'largeSponsorMax'
  >,
): { weeklyPaymentPence: number; contractWeeks: 52 | 104 | 156 } {
  const rep = Math.max(0, Math.min(100, reputation));

  let min: number;
  let max: number;
  if (size === 'LARGE') {
    min = config.largeSponsorMin;
    max = config.largeSponsorMax;
  } else if (size === 'MEDIUM') {
    min = config.mediumSponsorMin;
    max = config.mediumSponsorMax;
  } else {
    min = config.smallSponsorMin;
    max = config.smallSponsorMax;
  }

  const base = min + (rep / 100) * (max - min);
  const jitter = 0.9 + Math.random() * 0.2; // ±10%
  const weeklyPaymentPence = Math.round(base * jitter);

  const contractWeeks = CONTRACT_DURATIONS[Math.floor(Math.random() * CONTRACT_DURATIONS.length)];

  return { weeklyPaymentPence, contractWeeks };
}

/** Weekly probability of a sponsor offer for the club's current reputation tier. */
export function getSponsorOfferProbability(
  tier: ReputationTier,
  config: Pick<
    GameConfig,
    | 'sponsorProbabilityLocal' | 'sponsorProbabilityRegional'
    | 'sponsorProbabilityNational' | 'sponsorProbabilityElite'
  >,
): number {
  if (tier === 'Elite')    return config.sponsorProbabilityElite;
  if (tier === 'National') return config.sponsorProbabilityNational;
  if (tier === 'Regional') return config.sponsorProbabilityRegional;
  return config.sponsorProbabilityLocal;
}

/** Weekly probability of an investor offer for the club's current reputation tier. */
export function getInvestorOfferProbability(
  tier: ReputationTier,
  config: Pick<
    GameConfig,
    | 'investorProbabilityLocal' | 'investorProbabilityRegional'
    | 'investorProbabilityNational' | 'investorProbabilityElite'
  >,
): number {
  if (tier === 'Elite')    return config.investorProbabilityElite;
  if (tier === 'National') return config.investorProbabilityNational;
  if (tier === 'Regional') return config.investorProbabilityRegional;
  return config.investorProbabilityLocal;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/engine/sponsorEngine.test.ts --no-coverage
```

Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/sponsorEngine.ts src/__tests__/engine/sponsorEngine.test.ts
git commit -m "feat(engine): add sponsorEngine with computeSponsorOffer + probability helpers"
```

---

## Task 4: Extend `clubStore` with `sponsorContracts`

**Files:**
- Modify: `src/stores/clubStore.ts`

- [ ] **Step 1: Import `SponsorContract`**

At the top of `src/stores/clubStore.ts`, update the club import line:

```ts
import { Club, ReputationTier, ManagerPersonality, ManagerProfile, SponsorContract } from '@/types/club';
```

- [ ] **Step 2: Add `sponsorContracts` to `DEFAULT_CLUB`**

In `DEFAULT_CLUB`, after `sponsorIds: []`:

```ts
sponsorContracts: [],
```

- [ ] **Step 3: Add actions to `ClubState` interface**

In the `ClubState` interface, after `setSponsorIds`:

```ts
/**
 * Register a newly accepted sponsorship contract.
 * Keeps sponsorIds in sync so legacy reads still work.
 */
addSponsorContract: (contract: SponsorContract) => void;
/**
 * Remove an expired or terminated sponsorship contract.
 * Keeps sponsorIds in sync.
 */
removeSponsorContract: (id: string) => void;
```

- [ ] **Step 4: Implement the actions in the store**

Inside `useClubStore` create(), after the `setSponsorIds` implementation:

```ts
addSponsorContract: (contract) =>
  set((state) => ({
    club: {
      ...state.club,
      sponsorContracts: [...state.club.sponsorContracts, contract],
      sponsorIds: [...state.club.sponsorIds, contract.id],
    },
  })),

removeSponsorContract: (id) =>
  set((state) => ({
    club: {
      ...state.club,
      sponsorContracts: state.club.sponsorContracts.filter((c) => c.id !== id),
      sponsorIds: state.club.sponsorIds.filter((sid) => sid !== id),
    },
  })),
```

- [ ] **Step 5: Verify existing clubStore tests still pass**

```bash
npx jest src/__tests__/stores/clubStore.test.ts --no-coverage
```

Expected: all existing tests PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/stores/clubStore.ts
git commit -m "feat(store): add sponsorContracts to Club; addSponsorContract/removeSponsorContract actions"
```

---

## Task 5: GameLoop — contract expiry + renewal

**Files:**
- Modify: `src/engine/GameLoop.ts`

This task adds sponsor contract expiry processing **before** finances run (so expired contracts don't receive income in the tick they expire). It also fires renewal offers with 50/50 probability.

- [ ] **Step 1: Add `computeSponsorOffer` import**

At the top of `src/engine/GameLoop.ts`, add to the existing engine imports:

```ts
import { computeSponsorOffer } from './sponsorEngine';
```

- [ ] **Step 2: Add expiry block at the top of `processWeeklyTick`**

Locate the comment `// ── 0. Narrative simulation tick` (around line 92). Insert the new block **above** it:

```ts
// ── 0a. Sponsor contract expiry ───────────────────────────────────────────────
// Run before finances so expired contracts don't generate income this tick.
{
  const { sponsorContracts, removeSponsorContract } = useClubStore.getState();
  const expired = sponsorContracts.filter((c) => c.endWeek <= weekNumber);
  for (const contract of expired) {
    removeSponsorContract(contract.id);
    const sponsor = allSponsors.find((s) => s.id === contract.id);
    const sponsorName = sponsor?.name ?? 'your sponsor';

    // Expiry notification
    addMessage({
      id: `sponsor-expired-${contract.id}-wk${weekNumber}`,
      type: 'system',
      week: weekNumber,
      subject: 'Sponsorship Deal Ended',
      body: `Your sponsorship deal with ${sponsorName} has come to an end. The club will no longer receive their weekly contribution.`,
      isRead: false,
    });

    // 50/50 renewal offer
    if (Math.random() < 0.5 && sponsor) {
      const renewConfig = useGameConfigStore.getState().config;
      const offer = computeSponsorOffer(sponsor.companySize, club.reputation, renewConfig);
      const renewWeeklyPounds = Math.round(offer.weeklyPaymentPence / 100);
      addMessage({
        id: `sponsor-renewal-${contract.id}-wk${weekNumber}`,
        type: 'sponsor',
        week: weekNumber,
        subject: 'Renewal Offer',
        body: `${sponsorName} has offered to renew their sponsorship. They are offering £${renewWeeklyPounds.toLocaleString()} per week for ${offer.contractWeeks} weeks.`,
        isRead: false,
        requiresResponse: true,
        entityId: sponsor.id,
        metadata: {
          sponsorId: sponsor.id,
          sponsorName: sponsor.name,
          weeklyPayment: offer.weeklyPaymentPence,
          contractWeeks: offer.contractWeeks,
          companySize: sponsor.companySize,
        },
      });
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/GameLoop.ts
git commit -m "feat(gameloop): process sponsor contract expiry and conditional renewal offers"
```

---

## Task 6: GameLoop — income from contracts + updated offer generation

**Files:**
- Modify: `src/engine/GameLoop.ts`

- [ ] **Step 1: Add `getSponsorOfferProbability` and `getInvestorOfferProbability` to import**

Update the import added in Task 5:

```ts
import { computeSponsorOffer, getSponsorOfferProbability, getInvestorOfferProbability } from './sponsorEngine';
```

- [ ] **Step 2: Replace sponsor income calculation in section 6**

Find the existing block (around line 342–345):

```ts
const activeSponsors = allSponsors.filter((s) =>
  club.sponsorIds.includes(s.id)
);
const sponsorIncome = activeSponsors.reduce((sum, s) => sum + s.weeklyPayment, 0);

const financialSummary = calculateWeeklyFinances(
  weekNumber, club, players, coaches, levels, activeSponsors, weeklyLoanRepayment, facilityTemplates,
);
```

Replace with:

```ts
// Sponsor income comes from active contracts (pence), not the market pool's static weeklyPayment.
// Re-read from store so expiry processing in step 0a is reflected.
const activeContracts = useClubStore.getState().club.sponsorContracts;
const sponsorIncomePence = activeContracts.reduce((sum, c) => sum + c.weeklyPayment, 0);

// Pass empty sponsors array — income is handled separately below.
const financialSummary = calculateWeeklyFinances(
  weekNumber, club, players, coaches, levels, [], weeklyLoanRepayment, facilityTemplates,
);
```

- [ ] **Step 3: Apply contract income to balance**

Find the line `addBalance(financialSummary.net);`. After it, add:

```ts
// Add sponsor income separately (contracts are source of truth)
if (sponsorIncomePence > 0) {
  addBalance(sponsorIncomePence);
  addEarnings(sponsorIncomePence);
}
```

- [ ] **Step 4: Update ledger `sponsor_payment` transaction**

Find the existing ledger block that checks `if (sponsorIncome > 0)`. Replace it:

```ts
if (sponsorIncomePence > 0) {
  addTransaction({
    amount: Math.round(sponsorIncomePence / 100), // pence → whole pounds
    category: 'sponsor_payment',
    description: `Week ${nextWeek} sponsor income`,
    weekNumber: nextWeek,
  });
}
```

- [ ] **Step 5: Update section 9a — sponsor offer generation**

Find the section 9a block. Replace the entire `if (!hasPendingSponsorOffer && Math.random() < 0.15)` block with:

```ts
// ── 9a. Sponsor offers ────────────────────────────────────────────────────────
// Probability and payment driven by GameConfig. No offer if pending or at cap (10 sponsors).
const hasPendingSponsorOffer = inboxMessages.some(
  (m) => m.type === 'sponsor' && m.requiresResponse && !m.response
);
const currentSponsorCount = useClubStore.getState().club.sponsorContracts.length;
const sponsorOfferProb = getSponsorOfferProbability(club.reputationTier, config);

if (!hasPendingSponsorOffer && currentSponsorCount < 10 && Math.random() < sponsorOfferProb) {
  const rep = club.reputation;
  const activeContractIds = new Set(useClubStore.getState().club.sponsorContracts.map((c) => c.id));
  const availableSponsors = allSponsors.filter((s) => !activeContractIds.has(s.id));

  let eligibleSizes: CompanySize[];
  if (rep >= 75)      eligibleSizes = ['LARGE'];
  else if (rep >= 40) eligibleSizes = ['MEDIUM', 'LARGE'];
  else if (rep >= 15) eligibleSizes = ['SMALL', 'MEDIUM'];
  else                eligibleSizes = ['SMALL'];

  const eligible = availableSponsors.filter((s) => eligibleSizes.includes(s.companySize));
  const sponsor = eligible.length > 0
    ? eligible[Math.floor(Math.random() * eligible.length)]
    : null;

  if (sponsor) {
    const offer = computeSponsorOffer(sponsor.companySize, rep, config);
    const weeklyPounds = Math.round(offer.weeklyPaymentPence / 100);
    addMessage({
      id: `sponsor-offer-wk${weekNumber}-${sponsor.id}`,
      type: 'sponsor',
      week: weekNumber,
      subject: 'Sponsorship Offer',
      body: `${sponsor.name} has approached your club with a sponsorship proposal. They are offering £${weeklyPounds.toLocaleString()} per week for ${offer.contractWeeks} weeks. Your growing reputation has caught their attention.`,
      isRead: false,
      requiresResponse: true,
      entityId: sponsor.id,
      metadata: {
        sponsorId: sponsor.id,
        sponsorName: sponsor.name,
        weeklyPayment: offer.weeklyPaymentPence,
        contractWeeks: offer.contractWeeks,
        companySize: sponsor.companySize,
      },
    });
  }
}
```

- [ ] **Step 6: Update section 9b — investor offer probability**

Find the existing `Math.random() < 0.08` check in section 9b. Replace:

```ts
Math.random() < 0.08
```

with:

```ts
Math.random() < getInvestorOfferProbability(club.reputationTier, config)
```

- [ ] **Step 7: Commit**

```bash
git add src/engine/GameLoop.ts
git commit -m "feat(gameloop): contract-based sponsor income; config-driven offer probabilities and payment formula"
```

---

## Task 7: Update inbox sponsor accept handler

**Files:**
- Modify: `app/(tabs)/inbox.tsx`

- [ ] **Step 1: Add `addSponsorContract` to the destructured `useClubStore` call**

Find the line:

```ts
const { setInvestorId, setSponsorIds, addBalance, club } = useClubStore();
```

Replace with:

```ts
const { setInvestorId, addBalance, addSponsorContract, club } = useClubStore();
```

- [ ] **Step 2: Update the `sponsorMeta` inline type**

Find the inline `sponsorMeta` type assertion (around line 976):

```ts
const sponsorMeta = message.type === 'sponsor' && message.metadata ? message.metadata as {
  sponsorId: string; sponsorName: string; weeklyPayment: number; contractWeeks: number; companySize: string;
} : null;
```

The `weeklyPayment` field is now in **pence** (changed in Task 6). The type itself stays the same — no change needed — but the interpretation changes.

- [ ] **Step 3: Replace the sponsor accept block in `handleAccept`**

Find:

```ts
if (message.type === 'sponsor' && message.entityId && sponsorMeta) {
  setSponsorIds([...club.sponsorIds, message.entityId]);
}
```

Replace with:

```ts
if (message.type === 'sponsor' && message.entityId && sponsorMeta) {
  if (club.sponsorContracts.length < 10) {
    addSponsorContract({
      id: message.entityId,
      weeklyPayment: sponsorMeta.weeklyPayment,          // pence
      endWeek: message.week + sponsorMeta.contractWeeks,
    });
    useFinanceStore.getState().addTransaction({
      amount: 0,
      category: 'sponsor_payment',
      description: `Signed: ${sponsorMeta.sponsorName} (${Math.round(sponsorMeta.weeklyPayment / 100).toLocaleString()}/wk)`,
      weekNumber: message.week,
    });
  }
}
```

> Note: `amount: 0` records the signing event in the ledger without affecting balance. Weekly income is added each tick by `GameLoop`.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/inbox.tsx
git commit -m "feat(inbox): sponsor accept writes SponsorContract; enforce 10-sponsor cap"
```

---

## Task 8: Update `finances.tsx` — SponsorsPane + BalancePane

**Files:**
- Modify: `app/(tabs)/finances.tsx`

- [ ] **Step 1: Update `SponsorsPane` to read from `sponsorContracts`**

Find the `SponsorsPane` function (around line 362). Replace its entire body with:

```tsx
function SponsorsPane() {
  const club = useClubStore((s) => s.club);
  const allSponsors = useMarketStore((s) => s.sponsors);
  const weekNumber = club.weekNumber ?? 1;

  const contracts = club.sponsorContracts;
  const totalWeeklyIncome = contracts.reduce(
    (sum, c) => sum + Math.round(c.weeklyPayment / 100),
    0,
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: FAB_CLEARANCE }}>
      {/* Summary header */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 14,
        ...pixelShadow,
      }}>
        <FinanceRow
          label="WEEKLY SPONSOR INCOME"
          value={`+£${totalWeeklyIncome.toLocaleString()}`}
          accent={WK.green}
        />
        <FinanceRow
          label="ACTIVE SPONSORS"
          value={String(contracts.length)}
        />
      </View>

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
          const totalWeeks = contract.endWeek - (weekNumber - weeksRemaining); // approximate total
          const progressPct = totalWeeks > 0 ? (1 - weeksRemaining / totalWeeks) * 100 : 100;
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
```

- [ ] **Step 2: Update `BalancePane` sponsor income calculation**

In `BalancePane`, find:

```ts
const activeSponsors = sponsors.filter((s) => club.sponsorIds.includes(s.id));
...
const sponsorIncome = activeSponsors.reduce((sum, s) => sum + s.weeklyPayment, 0);
```

Replace with:

```ts
const sponsorIncome = club.sponsorContracts.reduce(
  (sum, c) => sum + Math.round(c.weeklyPayment / 100),
  0,
);
```

Also remove the `const sponsors = useMarketStore((s) => s.sponsors);` line from `BalancePane` if it is no longer referenced (the sponsors store variable was used only for `activeSponsors`).

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/finances.tsx
git commit -m "feat(finances): SponsorsPane reads sponsorContracts with live weeks-remaining bar"
```

---

## Self-Review

### Spec coverage
| Requirement | Task |
|---|---|
| Weekly payment from config min/max + rep formula | Task 3 (`computeSponsorOffer`) |
| ±10% jitter | Task 3 |
| Contract duration 1–3 years (52/104/156 wks) | Task 3 |
| Max 10 sponsors | Task 6 (offer gate) + Task 7 (accept gate) |
| Expiry: inbox notification | Task 5 |
| Expiry: 50/50 renewal offer | Task 5 |
| Config-driven sponsor offer probability per tier | Task 3 + Task 6 |
| Config-driven investor offer probability per tier | Task 3 + Task 6 |
| `sponsorContracts` in club store | Task 4 |
| Income from contracts (not static market data) | Task 6 |
| SponsorsPane shows name, weekly pay, weeks remaining | Task 8 |
| BalancePane uses contract income | Task 8 |
| Inbox accept writes contract | Task 7 |

### Type consistency check
- `SponsorContract.weeklyPayment` — pence throughout (Tasks 1, 4, 5, 6, 7, 8 all consistent)
- `computeSponsorOffer` returns `{ weeklyPaymentPence, contractWeeks }` — used correctly in Tasks 5 and 6
- `getSponsorOfferProbability` / `getInvestorOfferProbability` accept `ReputationTier` (uppercase, matches `club.reputationTier`) — correct
- `addSponsorContract` / `removeSponsorContract` names match between interface (Task 4) and usage (Tasks 5, 7)
- `club.sponsorContracts` referenced in Tasks 5, 6, 7, 8 — field added in Tasks 1 + 4 ✓
