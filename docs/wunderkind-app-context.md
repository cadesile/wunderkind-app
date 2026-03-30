# wunderkind-app — Project Context

> Generated: 2026-03-30 22:18:25 | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy, developing young players through an 8-trait Personality Matrix engine and navigating finances, recruitment, and weekly progression ticks. The app is client-authoritative and offline-first, processing all game logic (attribute shifts, financial deductions, behavioral incidents) entirely on-device via a centralized GameLoop engine with Zustand + AsyncStorage persistence. High-level metrics sync asynchronously to a Symfony backend via TanStack Query offline mutations, ensuring seamless play regardless of connectivity.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 174 |
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
- `@types/react`: ~19.1.0
- `sharp`: ^0.34.5
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
│   │   ├── squad.tsx
│   │   └── world.tsx
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
│   ├── wunderkind-app-context.md
│   └── wunderkind-app-context.md.tmp
├── scripts
│   ├── dev-proxy.py
│   ├── generate_project_context.sh
│   └── generate-assets.js
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
├── eas.json
├── global.css
├── metro.config.js
├── nativewind-env.d.ts
├── package-lock.json
├── package.json
├── README.md
├── tailwind.config.js
└── tsconfig.json

26 directories, 131 files
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
622ede2 token refresh flow
6772297 token refresh
5f3158b fixed layout table issue
87ab21b fresh commit
d409fd7 UI/UX amends
2615bfb latest
23ee143 update assets
700331b added version to header
e7a0425 Remove stale Claude agent worktree gitlink; ignore .claude/worktrees/
a9d3dce updated workflows
00d2aca looking to fix bugs on android
c04aded updated deployment
efaa536 latest code + expo deploy
62453f8 added ui-ux-pro
363de47 frontend latest
```

---

## Architecture Notes

- **Layered API Client pattern** — `src/api/endpoints/` handles data fetching/transformation (DTO mapping), while `src/api/mutations/` separates write operations (commands), loosely resembling CQRS.
- **Store-per-domain (vertical slice state)** — each domain (squad, coach, scout, market, loan, facility, inbox, auth) owns its own Zustand store, avoiding a single monolithic state tree.
- **Engine/Service layer** — `src/engine/` encapsulates pure business logic (GameLoop, personality, recruitment, finance) decoupled from UI and stores, analogous to a domain service layer.
- **Offline-first with optimistic sync** — TanStack Query mutations (in `src/api/mutations/`) apply changes locally first and sync to the backend asynchronously; stores act as the local source of truth.
- **Component decomposition by concern** — `src/components/ui/` holds generic primitives, `src/components/radar/` holds domain-specific visualisation, and root-level components (`GlobalHeader`, `OnboardingScreen`) handle app-shell concerns — a presentational/container split without a formal pattern library.

---

## Current Development Focus

- **Token refresh & auth resilience** — Multiple commits touching `src/api/client.ts`, `src/api/endpoints/auth.ts`, and `useAuthFlow.ts` suggest the auth flow is still being stabilised; AI could help design a robust retry/queue strategy that handles concurrent 401s and edge cases like expired refresh tokens during offline sync.

- **Coach intelligence engine** — New files `CoachPerception.ts` and `CoachValuation.ts` indicate active work on coach AI logic; AI assistance could help model realistic valuation curves, perception biases, and decision weights that align with the 8-trait Personality Matrix.

- **Data display & table UX** — `SortableTable.tsx` introduced alongside the "fixed layout table issue" commit points to ongoing work on tabular data; AI could help define consistent sort/filter patterns and accessible column layouts that work within the pixel-art design system.

- **Squad & staff server reconciliation** — Recent changes to `squad.ts` and `staff.ts` endpoints suggest the backend sync logic is evolving; AI could help design a deterministic merge strategy that resolves conflicts between client-authoritative local state and server responses without data loss.

- **Game loop & financial engine** — `GameLoop.ts` and `finances.tsx` both appear in recent changes; AI could assist in balancing weekly tick economics (reputation gain rates, loan limits, sponsor income scaling) so progression feels rewarding across all reputation tiers.
