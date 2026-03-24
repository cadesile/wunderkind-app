# wunderkind-app — Project Context

> Generated: 2026-03-24 20:04:20 | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy — recruiting players, hiring staff, and developing talent through a dynamic 8-trait Personality Matrix engine. The app runs an offline-first "Weekly Tick" game loop that processes attribute shifts, finances, and behavioral incidents entirely on-device using Zustand with AsyncStorage persistence. High-level metrics sync asynchronously to a Symfony backend API via TanStack Query offline mutations, making the game fully playable without a network connection.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 172 |
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

26 directories, 126 files
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
5b4d7c1 UI: flip tab/title order on Facilities and Market screens
```

---

## Architecture Notes

- **Store/Command pattern** — Zustand stores under `src/stores/` act as centralized state containers with explicit mutating commands (e.g. `setPlayers`, `addBalance`, `takeLoan`), separating state ownership from UI.
- **Service layer** — `src/engine/` (GameLoop, ScoutingService, ReactionHandler, personality, recruitment) encapsulates domain logic independently of UI and persistence, functioning as a pure business-logic tier.
- **Repository / API gateway pattern** — `src/api/endpoints/` isolates each backend resource (market, squad, staff, facilities, inbox) behind typed fetch wrappers, with `src/api/client.ts` as a shared transport; consumers never call `fetch` directly.
- **Mutation hook pattern (CQRS-lite)** — `src/api/mutations/` separates write operations (sync, market assignment) into dedicated TanStack Query mutation hooks, keeping reads (`endpoints/`) and writes structurally distinct.
- **DTO / transform layer** — raw backend responses are mapped to app-internal types inside `src/api/endpoints/` (e.g. `ATT→FWD`, pence→pounds, `coachingAbility→influence`), acting as an anti-corruption layer between the Symfony API contract and the front-end domain model.

---

## Current Development Focus

- **Guardian/NPC Engine** — three new files (`GuardianEngine.ts`, `guardianStore.ts`, `guardian.ts`) alongside `ReactionHandler.ts` signal an emerging behavioural AI layer; generating contextually realistic guardian reactions, escalation logic, and dialogue trees is a strong AI candidate.
- **Transfer Market & Player Valuation** — centralising asking-price logic and populating a weekly transfer ledger suggests the valuation model is still being defined; AI could generate dynamic market demand curves, transfer rumour narratives, and negotiation outcomes.
- **Financial Event Generation** — sponsor/investor offer events are newly wired but appear rules-based; AI could drive richer, reputation-sensitive deal offers, investor pressure events, and financial crisis narratives to deepen the simulation.
- **Scouting & Report Narrative** — `ScoutingService.ts` and `ScoutReportCard.tsx` are both active; AI is well-suited to generating scout report prose, gem/dud classification reasoning, and scouting trip incident events from underlying trait data.
- **Game-Over & Career Reflection** — `game-over.tsx` is a recently touched screen; AI could produce personalised end-of-career summaries, hall-of-fame citations, and branching "what went wrong" post-mortems based on the session's ledger data.
