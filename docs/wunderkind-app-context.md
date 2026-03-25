# wunderkind-app — Project Context

> Generated: 2026-03-24 23:19:17 | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy, recruiting and developing players through an 8-trait Personality Matrix engine while balancing finances, staff, and reputation. The app is client-authoritative and offline-first, processing the core "Weekly Tick" game loop entirely on-device using Zustand with AsyncStorage persistence, then asynchronously syncing high-level metrics to a Symfony backend via TanStack Query offline mutations. Built with Expo SDK 54 and NativeWind v4, it features file-based navigation via Expo Router and a pixel-art design system throughout.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 173 |
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

26 directories, 127 files
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
92d2c56 Complete scouting & relationship system — missing elements
704dd4f Implement Scouting, Relationship & Market Valuation systems
```

---

## Architecture Notes

- **Store/Slice pattern (Flux-like)** — `src/stores/` contains domain-scoped state slices (academyStore, squadStore, loanStore, etc.), each owning its own state and mutations, consistent with Zustand's atomic store pattern.
- **Engine/Domain layer** — `src/engine/` isolates pure game logic (GameLoop, personality, recruitment, finance) from UI and state, analogous to a domain service layer.
- **API Gateway + DTO transformation** — `src/api/endpoints/` acts as an anti-corruption layer, mapping raw backend types to app-internal types (e.g. ATT→FWD, pence→pounds, coachingAbility→influence); `src/api/mutations/` separates write operations from queries.
- **Command/Query separation** — `src/api/mutations/` (commands/writes) is structurally separated from `src/api/endpoints/` (queries/reads), a lightweight CQRS split without a full event bus.
- **Component hierarchy with design system** — `src/components/ui/` provides atomic primitives (PixelText, Avatar, PixelTopTabBar), `src/components/` holds composite/domain components (GlobalHeader, radar), and `src/constants/theme.ts` acts as a centralized design token registry.

---

## Current Development Focus

- **Transfer market & player valuation** — `getPlayerAskingPrice` utility added, transfers wired into weekly sync payload, and active changes in `market/players.tsx`; pricing logic and transfer flow likely need consistency checks and edge-case hardening.
- **NPC interaction ledger & coach performance** — new ledger system linking coach behaviour to outcomes (commit `dd2e47b`) is a complex domain model; AI could help validate scoring logic, surface gaps in coverage, and generate realistic NPC decision trees.
- **Weekly sync payload integrity** — ledger and transfer data now included in `POST /api/sync`; the backend contract is growing and prone to drift; AI assistance useful for schema validation, serialization correctness, and regression testing.
- **Multi-screen UI consistency** — two consecutive "ui fixes" commits touching nearly every tab (`index`, `squad`, `coaches`, `finances`, `market`, `inbox`, `facilities`) suggest a systemic design-system issue; AI can audit NativeWind/pixel-art token usage across screens and flag deviations from `theme.ts`.
- **Staff detail screens** (`coach/[id].tsx`, `scout/[id].tsx`) — newly active alongside the coach-performance link; these screens likely need coherent stat display, radar/trait visualisation parity with `player/[id].tsx`, and hire/fire flow wiring.
