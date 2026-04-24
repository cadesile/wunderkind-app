# Fan Happiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dynamic Fan Happiness system that responds to game events (matches, transfers, facility upgrades) and impacts finances and morale.

**Architecture:** A derived-state system using a `fanStore` to track `FanEvent`s and a `FanEngine` to calculate the current happiness tier (Angry, Disappointed, Neutral, Happy, Thrilled). UI components display the current fan favorite and happiness history.

**Tech Stack:** React Native (Expo), TypeScript, Zustand (State Management), Tailwind CSS (NativeWind).

---

### Task 1: Define Types and Fan Store

**Files:**
- Create: `src/types/fans.ts`
- Create: `src/stores/fanStore.ts`
- Test: `src/__tests__/stores/fanStore.test.ts`

- [ ] **Step 1: Create Fan Types**
Define `FanTier`, `FanEventType`, and `FanEvent` interface.

```typescript
export type FanTier = 'Angry' | 'Disappointed' | 'Neutral' | 'Happy' | 'Thrilled';

export type FanEventType = 
  | 'match_win' | 'match_loss' | 'match_draw' 
  | 'player_sold' | 'player_sold_favorite'
  | 'facility_upgrade' | 'system_bonus' | 'system_penalty';

export interface FanEvent {
  id: string;
  type: FanEventType;
  description: string;
  impact: number; // e.g. +5, -10
  weekNumber: number;
}
```

- [ ] **Step 2: Create Fan Store**
Implement a Zustand store to hold the list of events and the current Fan Favorite player ID.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import { FanEvent } from '@/types/fans';

interface FanState {
  events: FanEvent[];
  fanFavoriteId: string | null;
  addEvent: (event: Omit<FanEvent, 'id'>) => void;
  setFanFavoriteId: (id: string | null) => void;
  pruneEvents: (currentWeek: number) => void;
}

export const useFanStore = create<FanState>()(
  persist(
    (set) => ({
      events: [],
      fanFavoriteId: null,
      addEvent: (event) => set((state) => ({
        events: [{ ...event, id: uuidv7() }, ...state.events].slice(0, 50)
      })),
      setFanFavoriteId: (id) => set({ fanFavoriteId: id }),
      pruneEvents: (currentWeek) => set((state) => ({
        events: state.events.filter(e => currentWeek - e.weekNumber < 10)
      })),
    }),
    { name: 'fan-store', storage: zustandStorage }
  )
);
```

- [ ] **Step 3: Commit**
```bash
git add src/types/fans.ts src/stores/fanStore.ts
git commit -m "feat: add fan types and store"
```

---

### Task 2: Implement Fan Engine

**Files:**
- Create: `src/engine/FanEngine.ts`
- Test: `src/__tests__/engine/FanEngine.test.ts`

- [ ] **Step 1: Write calculateHappiness logic**
Calculate score from baseline (50) + events (decayed by 10% per week old).

```typescript
import { useFanStore } from '@/stores/fanStore';
import { FanTier } from '@/types/fans';
import { Player } from '@/types/player';

export class FanEngine {
  static calculateScore(currentWeek: number): number {
    const events = useFanStore.getState().events;
    let score = 50; // Baseline
    
    events.forEach(event => {
      const weeksAgo = currentWeek - event.weekNumber;
      const decay = Math.max(0, 1 - (weeksAgo * 0.1));
      score += event.impact * decay;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  static getTier(score: number): FanTier {
    if (score >= 80) return 'Thrilled';
    if (score >= 60) return 'Happy';
    if (score >= 40) return 'Neutral';
    if (score >= 20) return 'Disappointed';
    return 'Angry';
  }

  static determineFanFavorite(players: Player[]): string | null {
    // Logic: Top 3 OVR + >1 season tenure OR personality traits
    // Simplified for now: Highest OVR with tenure > 0
    const candidates = players
      .filter(p => p.isActive)
      .sort((a, b) => b.overallRating - a.overallRating);
    
    return candidates[0]?.id || null;
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/engine/FanEngine.ts
git commit -m "feat: implement FanEngine for happiness calculation"
```

---

### Task 3: Integrate with Game Loop and Results

**Files:**
- Modify: `src/engine/GameLoop.ts`
- Modify: `src/engine/ResultsEngine.ts`

- [ ] **Step 1: Update ResultsEngine to emit events**
Emit events on win/loss/draw.

- [ ] **Step 2: Update GameLoop to update Fan Favorite and prune events**
Call `FanEngine.determineFanFavorite` and `useFanStore.getState().pruneEvents` during the weekly tick.

- [ ] **Step 3: Commit**
```bash
git add src/engine/GameLoop.ts src/engine/ResultsEngine.ts
git commit -m "feat: integrate fan events into match results and game loop"
```

---

### Task 4: Impact on Finances and Morale

**Files:**
- Modify: `src/utils/matchdayIncome.ts`
- Modify: `src/engine/MoraleEngine.ts`

- [ ] **Step 1: Apply attendance multiplier in matchdayIncome**
Read FanTier and apply +/- 20% multiplier.

- [ ] **Step 2: Apply weekly morale shift in MoraleEngine**
Read FanTier and apply +/- 1 morale per week.

- [ ] **Step 3: Commit**
```bash
git add src/utils/matchdayIncome.ts src/engine/MoraleEngine.ts
git commit -m "feat: apply fan happiness impact to income and morale"
```

---

### Task 5: Facility and Transfer Events

**Files:**
- Modify: `src/stores/facilityStore.ts`
- Modify: `src/stores/squadStore.ts`

- [ ] **Step 1: Emit event on facility upgrade**
In `upgradeLevel`, add a FanEvent.

- [ ] **Step 2: Emit event on player sale**
In `releasePlayer`, check if player was `fanFavoriteId` and emit a large penalty if so.

- [ ] **Step 3: Commit**
```bash
git add src/stores/facilityStore.ts src/stores/squadStore.ts
git commit -m "feat: emit fan events for facility upgrades and player sales"
```

---

### Task 6: UI Components and Screen

**Files:**
- Create: `src/components/FanFavoriteCard.tsx`
- Create: `app/office/fans.tsx`
- Modify: `src/components/ClubDashboard.tsx`
- Modify: `app/office/_layout.tsx`

- [ ] **Step 1: Create FanFavoriteCard**
Display player name, OVR, and current Fan Tier.

- [ ] **Step 2: Create Fans Screen**
Show current score, tier, and last 5 events list.

- [ ] **Step 3: Integrate into Dashboard and Navigation**
Add card to dashboard and link to the new screen in Office.

- [ ] **Step 4: Commit**
```bash
git add src/components/FanFavoriteCard.tsx app/office/fans.tsx src/components/ClubDashboard.tsx app/office/_layout.tsx
git commit -m "feat: add fan happiness UI screens and components"
```
