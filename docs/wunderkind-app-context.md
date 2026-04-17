# wunderkind-app — Project Context

> Generated: 2026-04-16 23:51:21 | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy, developing young talent through an 8-trait Personality Matrix engine that drives player behavior, incidents, and progression. Built with Expo SDK 54 and Expo Router, the app follows a client-authoritative, offline-first architecture centered on a "Weekly Tick" game loop that processes attribute shifts, finances, and behavioral events entirely on-device. State is persisted locally via Zustand with AsyncStorage, and high-level metrics sync asynchronously to a Symfony backend through TanStack Query offline mutations.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 190 |
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
- `expo-updates`: ~29.0.16
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
- `@babel/core`: ^7.29.0
- `@types/jest`: 29.5.14
- `@types/react`: ~19.1.0
- `babel-jest`: ^30.3.0
- `jest`: ~29.7.0
- `jest-expo`: ~54.0.17
- `sharp`: ^0.34.5
- `tailwindcss`: 3.3.2
- `typescript`: ~5.9.2

---

## Project Structure

```
.
├── __tests__
│   ├── engine
│   └── stores
├── app
│   ├── (tabs)
│   │   ├── _layout.tsx
│   │   ├── advance.tsx
│   │   ├── coaches.tsx
│   │   ├── competitions.tsx
│   │   ├── debug.tsx
│   │   ├── facilities.tsx
│   │   ├── finances.tsx
│   │   ├── hub.tsx
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
│   ├── logo_master.png
│   └── splash-icon.png
├── docs
│   ├── superpowers
│   │   ├── plans
│   │   └── specs
│   ├── wunderkind-app-context.md
│   └── wunderkind-app-context.md.tmp
├── scripts
│   ├── dev-proxy.py
│   ├── generate_project_context.sh
│   └── generate-assets.js
├── src
│   ├── __tests__
│   │   ├── stores
│   │   └── utils
│   ├── api
│   │   ├── endpoints
│   │   ├── mutations
│   │   ├── client.ts
│   │   └── syncQueue.ts
│   ├── components
│   │   ├── competitions
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
│   │   ├── debugLogStore.ts
│   │   ├── eventChainStore.ts
│   │   ├── eventStore.ts
│   │   ├── facilityStore.ts
│   │   ├── financeStore.ts
│   │   ├── fixtureStore.ts
│   │   ├── gameConfigStore.ts
│   │   ├── guardianStore.ts
│   │   ├── inboxStore.ts
│   │   ├── interactionStore.ts
│   │   ├── leagueStore.ts
│   │   ├── loanStore.ts
│   │   ├── lossConditionStore.ts
│   │   ├── marketStore.ts
│   │   ├── narrativeStore.ts
│   │   ├── navStore.ts
│   │   ├── prospectPoolStore.ts
│   │   ├── resetAllStores.ts
│   │   ├── scoutStore.ts
│   │   ├── squadStore.ts
│   │   ├── tickProgressStore.ts
│   │   └── worldStore.ts
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
│   │   ├── player.ts
│   │   └── world.ts
│   └── utils
│       ├── agentOfferHandlers.ts
│       ├── currency.ts
│       ├── facilityUpkeep.ts
│       ├── fixtureGenerator.ts
│       ├── gameDate.ts
│       ├── guardianNarrative.ts
│       ├── haptics.ts
│       ├── matchdayIncome.ts
│       ├── morale.ts
│       ├── nationality.ts
│       ├── scoutingCost.ts
│       ├── scoutingRegions.ts
│       ├── standingsCalculator.ts
│       ├── storage.ts
│       ├── tierGate.ts
│       └── uuidv7.ts
├── app.json
├── babel.config.js
├── CLAUDE.md
├── eas.json
├── global.css
├── jest.config.js
├── metro.config.js
├── nativewind-env.d.ts
├── package-lock.json
├── package.json
├── README.md
├── tailwind.config.js
└── tsconfig.json

36 directories, 144 files
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
59b10d5 feat: add onClubPress prop to LeagueTable rows
15835c5 fix: useMemo for sorted clubs and primaryColor fallback in WorldClubList
8a4f06b feat: add WorldClubList component for NPC league browsing
3695e8f docs: add Browse all-leagues + club detail implementation plan
5d11595 docs: add Browse all-leagues + club detail screen spec
6d6e0de fix: restore initializeAcademy call before initializeWorld in registerAcademy
9c9e2b3 fix: call loadClubs() on app start for returning users in _layout bootstrap
fdf3fff docs: document intentional client-side personality generation in worldPlayerToPlayer
72876ac fix: remove dead pickRandom function from useAuthFlow
9e4fb3f fix: remove dead mapping functions and stale JSDoc after world-init refactor
1d6a9fd feat: replace market-assign onboarding flow with POST /api/initialize world pack
678ad7c feat: add initializeWorld API endpoint
aab18f9 feat: add worldStore with split AsyncStorage persistence
10dba22 feat: add WorldPlayer, WorldStaff, WorldClub, WorldLeague, WorldPackResponse types
5a96653 feat: add calculateMatchdayIncome utility with tests
```

---

## Architecture Notes

- **Store-per-domain pattern** — each bounded context (squad, coach, scout, market, loan, facility, inbox, auth) owns its own Zustand store, mirroring a repository layer for local state
- **Engine/service layer** — `src/engine/` isolates pure game logic (GameLoop, personality, recruitment, finance, ScoutingService) from UI and stores, acting as a headless domain service layer
- **API endpoint + mutation split (CQRS-lite)** — reads live in `src/api/endpoints/` (query functions) while writes live in `src/api/mutations/` (TanStack Query mutation hooks), separating read and write paths
- **DTO transform layer** — `src/api/endpoints/market.ts` and peers translate raw backend shapes (snake_case, pence, mismatched field names) into app-internal types before they reach stores or UI
- **Offline-first with async sync** — client is authoritative; the Weekly Tick runs entirely on-device via GameLoop, with a background sync queue (`src/api/syncQueue.ts`) pushing aggregated deltas to the Symfony backend rather than round-tripping per action

---

## Current Development Focus

- **Club detail screen build-out** — spec and plan docs exist but implementation is pending; AI can accelerate scaffolding the screen, wiring `onClubPress` navigation, and rendering club stats/roster from world data.
- **NPC world player pipeline** — `worldPlayerToPlayer` conversion with client-side personality generation is newly documented as intentional; AI can help harden edge cases, add typing, and ensure trait generation stays consistent with the 1–20 Personality Matrix.
- **League browsing UI polish** — `WorldClubList` and `LeagueTable` are freshly added with active fixes (useMemo, primaryColor fallback); AI can assist with performance optimisation, empty/loading states, and pixel-art design-system conformance.
- **Bootstrap / init ordering fragility** — two recent fixes correcting `initializeAcademy` vs `initializeWorld` call order and `loadClubs()` on returning-user path suggest the startup sequence is brittle; AI can help map the dependency graph and add guard logic or tests.
- **Docs-to-code gap** — plan and spec docs were committed the same day as implementation started; AI can parse those structured docs and generate boilerplate (types, store slices, screen stubs) to keep implementation aligned with the written design.
