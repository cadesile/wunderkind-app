# Staff Contracts Design

**Date:** 2026-05-11
**Status:** Draft
**Goal:** Implement a fixed-term contract system for staff (coaches, scouts, managers, etc.) that mirrors the player enrollment system while introducing strategic sign-on fees and severance payouts.

## 1. Data Model Changes

### 1.1 `GameConfig` (src/types/gameConfig.ts)
Add new global configuration fields to control staff financial scaling:
- `staffSignOnFeePercentMin`: (Number, default 2) Minimum percentage of total contract value for sign-on fees.
- `staffSignOnFeePercentMax`: (Number, default 8) Maximum percentage of total contract value for sign-on fees.
- `staffSeverancePercent`: (Number, default 50) Percentage of remaining contract value paid as severance upon early release.

### 1.2 `Coach` (src/types/coach.ts)
Update the staff interface to include contract persistence:
- `contractEndWeek`: (Number) The game week when the contract expires.
- `initialContractWeeks`: (Number) The original duration (52, 104, or 156) chosen at signing. Used for DOF auto-renewal matching.

## 2. Financial Mechanics

### 2.1 Sign-On Fee (Recruitment)
When signing staff from the market, the user chooses a duration (1, 2, or 3 years).
- `TotalValue = weeklySalary × durationWeeks`
- `SignOnFee = TotalValue × rand(staffSignOnFeePercentMin, staffSignOnFeePercentMax) / 100`
- **Transaction Category:** `staff_sign_on`

### 2.2 Severance Payout (Release)
Releasing a staff member before their `contractEndWeek` now carries a cost.
- `WeeksRemaining = contractEndWeek - currentWeek`
- `Severance = (weeklySalary × WeeksRemaining) × (staffSeverancePercent / 100)`
- **Transaction Category:** `staff_severance`

### 2.3 Cleanup
Remove the legacy `staffCount * 500` wage calculation from `src/engine/finance.ts` in favor of the explicit `salary` fields on active staff.

## 3. Expiry & Automation Logic

### 3.1 Weekly Tick (src/engine/GameLoop.ts)
Implement an expiry engine for staff that mirrors player enrollment:
- **12-Week Warning:** Inbox message + start of weekly morale decay (-2 per week).
- **4-Week Warning:** Final inbox reminder.
- **0-Week Expiry:** Staff member is removed from the club; "Contract Expired" inbox message generated.

### 3.2 DOF Automation
If a Director of Football is present and `dofAutoRenewContracts` is true:
- The DOF attempts to renew contracts at the **12-week mark**.
- They renew for the `initialContractWeeks` duration.
- **Fund Check:** Renewal only triggers if the current club balance covers the required Sign-On Fee.

## 4. UI Changes

### 4.1 Hiring Modal (app/(tabs)/coaches.tsx & app/office/scouts.tsx)
- Replace the single "SIGN" button with a selection for **1 YEAR**, **2 YEARS**, and **3 YEARS**.
- Display the estimated Sign-On Fee for each selection.

### 4.2 Staff Management
- Display "Weeks Remaining" or an "Expiry Date" on staff cards.
- Add a **[ RENEW ]** button to staff details, allowing users to reset the contract length at any time (triggering a new Sign-On Fee).

## 5. Testing Strategy
- **Unit Tests:** Verify sign-on fee and severance math in `src/engine/finance.ts`.
- **Integration Tests:** Ensure `GameLoop` correctly processes staff expiry and DOF fund checks.
- **Manual Verification:** Confirm the hiring UI correctly reflects dynamic costs based on chosen duration.
