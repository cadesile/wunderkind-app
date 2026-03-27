# wunderkind-app — Project Context

> Generated: 2026-03-26 23:40:06 | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy, overseeing player development through an 8-trait Personality Matrix engine, finances, scouting, and staff. The app is client-authoritative and offline-first, processing all game logic (weekly ticks, trait shifts, financial calculations) entirely on-device via Zustand stores persisted with AsyncStorage. Completed game state is then asynchronously synced to a Symfony backend API using TanStack Query offline mutations, enabling seamless play without a network connection.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 175 |
| Entities/Models   | 0 |
| Controllers       | 0 |
| Services          | 0 |

---

## Technology Stack

| | |
|---|---|
| **Language**      | node |
| **Framework**     | unknown |
| **Dev env**       | bare |

### Dependencies

**dependencies:**
- `@expo-google-fonts/press-start-2p`: ^0.4.1
- `@expo-google-fonts/vt323`: ^0.4.1
- `@react-native-async-storage/async-storage`: ^2.1.2
- `@tanstack/react-query`: ^5.67.3
- `expo`: ~54.0.0
- `expo-asset`: ~12.0.12
- `expo-constants`: ~18.0.13
- `expo-font`: ^14.0.11
- `expo-haptics`: ~15.0.8
- `expo-linking`: ~8.0.11
- `expo-router`: ~6.0.23
- `expo-splash-screen`: ~31.0.13
- `expo-status-bar`: ~3.0.9
- `expo-web-browser`: ~15.0.10
- `lucide-react-native`: ^0.475.0
- `nativewind`: ^4.2.2
- `react`: 19.1.0
- `react-dom`: ^19.1.0
- `react-native`: 0.81.5
- `react-native-reanimated`: ~4.1.1
- `react-native-safe-area-context`: ~5.6.0
- `react-native-screens`: ~4.16.0
- `react-native-svg`: 15.12.1
- `react-native-web`: ^0.21.2
- `react-native-worklets`: 0.5.1
- `zustand`: ^5.0.3

**devDependencies:**
- `@types/react`: ~19.1.0
- `tailwindcss`: 3.3.2
- `typescript`: ~5.9.2

---

## Project Structure

```
.
├── app
│   ├── (tabs)
│   │   ├── _layout.tsx
│   │   ├── advance.tsx
│   │   ├── coaches.tsx
│   │   ├── facilities.tsx
│   │   ├── finances.tsx
│   │   ├── home.tsx
│   │   ├── inbox.tsx
│   │   ├── index.tsx
│   │   ├── market.tsx
│   │   └── squad.tsx
│   ├── coach
│   │   └── [id].tsx
│   ├── market
│   │   ├── _layout.tsx
│   │   ├── coaches.tsx
│   │   ├── index.tsx
│   │   ├── players.tsx
│   │   ├── players.tsx.archived
│   │   └── scouts.tsx
│   ├── player
│   │   └── [id].tsx
│   ├── scout
│   │   └── [id].tsx
│   ├── _layout.tsx
│   └── game-over.tsx
├── assets
│   ├── fonts
│   │   └── FlagsColorWorld.ttf
│   ├── images
│   ├── svg
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   ├── android-icon-monochrome.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
├── docs
│   ├── wunderkind-app-context.md
│   └── wunderkind-app-context.md.tmp
├── scripts
│   ├── dev-proxy.py
│   └── generate_project_context.sh
├── src
│   ├── api
│   │   ├── endpoints
│   │   ├── mutations
│   │   ├── client.ts
│   │   └── syncQueue.ts
│   ├── components
│   │   ├── radar
│   │   ├── ui
│   │   ├── AcademyDashboard.tsx
│   │   ├── ArchetypeBadge.tsx
│   │   ├── AssignMissionOverlay.tsx
│   │   ├── GlobalHeader.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── ScoutReportCard.tsx
│   │   ├── SyncStatusIndicator.tsx
│   │   ├── WeeklyTickOverlay.tsx
│   │   └── WelcomeSplash.tsx
│   ├── constants
│   │   ├── archetypes.ts
│   │   └── theme.ts
│   ├── engine
│   │   ├── agentOffers.ts
│   │   ├── appearance.ts
│   │   ├── archetypeEngine.ts
│   │   ├── CoachPerception.ts
│   │   ├── CoachValuation.ts
│   │   ├── DevelopmentService.ts
│   │   ├── finance.ts
│   │   ├── FormulaEngine.ts
│   │   ├── GameLoop.ts
│   │   ├── GuardianEngine.ts
│   │   ├── MoraleEngine.ts
│   │   ├── personality.ts
│   │   ├── ReactionHandler.ts
│   │   ├── recruitment.ts
│   │   ├── RelationshipService.ts
│   │   ├── ScoutingService.ts
│   │   ├── SimulationService.ts
│   │   └── SocialGraphEngine.ts
│   ├── hooks
│   │   ├── useAcademyMetrics.ts
│   │   ├── useArchetypeSync.ts
│   │   ├── useAuthFlow.ts
│   │   ├── useGameConfigSync.ts
│   │   ├── useNarrativeSync.ts
│   │   ├── useProspectSync.ts
│   │   └── useSyncStatus.ts
│   ├── stores
│   │   ├── academyStore.ts
│   │   ├── activeEffectStore.ts
│   │   ├── altercationStore.ts
│   │   ├── archetypeStore.ts
│   │   ├── authStore.ts
│   │   ├── coachStore.ts
│   │   ├── eventStore.ts
│   │   ├── facilityStore.ts
│   │   ├── financeStore.ts
│   │   ├── gameConfigStore.ts
│   │   ├── guardianStore.ts
│   │   ├── inboxStore.ts
│   │   ├── interactionStore.ts
│   │   ├── loanStore.ts
│   │   ├── lossConditionStore.ts
│   │   ├── marketStore.ts
│   │   ├── narrativeStore.ts
│   │   ├── prospectPoolStore.ts
│   │   ├── resetAllStores.ts
│   │   ├── scoutStore.ts
│   │   ├── squadStore.ts
│   │   └── tickProgressStore.ts
│   ├── types
│   │   ├── academy.ts
│   │   ├── api.ts
│   │   ├── archetype.ts
│   │   ├── coach.ts
│   │   ├── facility.ts
│   │   ├── finance.ts
│   │   ├── game.ts
│   │   ├── gameConfig.ts
│   │   ├── guardian.ts
│   │   ├── interaction.ts
│   │   ├── market.ts
│   │   ├── narrative.ts
│   │   └── player.ts
│   └── utils
│       ├── agentOfferHandlers.ts
│       ├── currency.ts
│       ├── facilityUpkeep.ts
│       ├── gameDate.ts
│       ├── guardianNarrative.ts
│       ├── haptics.ts
│       ├── morale.ts
│       ├── nationality.ts
│       ├── scoutingCost.ts
│       ├── scoutingRegions.ts
│       ├── storage.ts
│       └── uuidv7.ts
├── app.json
├── babel.config.js
├── CLAUDE.md
├── global.css
├── metro.config.js
├── nativewind-env.d.ts
├── package-lock.json
├── package.json
├── README.md
├── tailwind.config.js
└── tsconfig.json

26 directories, 128 files
```

---

## Data Models


---

## API Routes

```
Run:  debug:router
```

---

## Controllers


---

## Services


---

## Migrations

_No migrations directory found._

---

## Environment Variables

```bash
EXPO_PUBLIC_API_BASE_URL_WEB=http://localhost:8080
```

---

## Development Setup

```bash
composer install
```

---

## Recent Git Activity

```
62453f8 added ui-ux-pro
363de47 frontend latest
3e6d0cd latest project
d9f2b8a updated latest context
175602e latest
250f9e7 Fix currency formatting, scout gem source, and major feature additions
6e67f74 update docs
dd2e47b Implement Phase 1 & 2: NPC interaction ledger + coach performance link
9154a98 ui fixes
ca0553d ui fixes
948b72e Populate transfers and ledger in weekly sync payload
b13672d Centralise player asking price into getPlayerAskingPrice utility
2152caf Implement sponsor/investor offer events + fix starter balance from backend
346c77a Update project context generator for React Native app
0a1aacc Fix agent offer UX, player rating stability, and coach valuation alignment
```

---

## Architecture Notes

- **Store/Slice pattern (Zustand)** — state is partitioned into domain-scoped stores (`academyStore`, `squadStore`, `loanStore`, etc.) each owning its own slice of client state, analogous to Redux slices or repository-per-aggregate.
- **Service layer** — `src/engine/` acts as a pure business-logic layer (`GameLoop`, `DevelopmentService`, `ScoutingService`, `FormulaEngine`) decoupled from UI and persistence, similar to a Domain Service layer in DDD.
- **Command/Query separation (CQRS-lite)** — `src/api/endpoints/` holds read operations (queries) while `src/api/mutations/` isolates write operations (commands), mirroring CQRS without a full event bus.
- **Offline-first / Optimistic Update pattern** — TanStack Query mutations apply local state changes immediately (e.g. `removeFromMarket`) then sync to the Symfony backend asynchronously, with a `syncQueue` for reconciliation.
- **Adapter/DTO transform layer** — `src/api/endpoints/` explicitly maps raw backend types to app-internal types (e.g. `ATT→FWD`, pence→pounds, `coachingAbility→influence`), acting as an Anti-Corruption Layer between the backend contract and domain models.

---

## Current Development Focus

- **UI/UX design system integration** — The `ui-ux-pro-max` skill was just added with extensive stack/style/chart data; AI can accelerate consistent pixel-art component generation across React Native screens using this design intelligence layer.
- **NPC interaction & coach performance systems** — The Phase 1 & 2 ledger/coach-performance commit signals active game logic expansion; AI can help model NPC decision trees, balance trait-driven behavior, and surface edge cases in the Personality Matrix engine.
- **Currency & data formatting correctness** — A dedicated fix commit for currency formatting suggests this is a recurring pain point; AI can audit pence/pounds conversions across all API boundaries and flag inconsistencies before they ship.
- **Frontend–backend sync reliability** — Multiple "frontend latest" and "latest project" commits imply rapid iteration against a live Symfony API; AI can help enforce the API contract (type transforms, pence convention, field mismatches) and generate typed adapters as endpoints evolve.
- **Scout/market data pipeline** — The scout gem source fix and market store complexity (5-min cache, optimistic updates, multi-entity transforms) indicate this area is brittle; AI can help design robust cache invalidation logic and generate thorough integration test cases.
