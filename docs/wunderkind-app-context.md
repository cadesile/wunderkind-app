# wunderkind-app — Project Context

> Generated: 2026-03-29 18:54:27 | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy — recruiting players, hiring coaches and scouts, handling finances, and developing talent through an 8-trait Personality Matrix engine. The app runs a client-authoritative "Weekly Tick" game loop entirely on-device, persisting all state offline via Zustand and AsyncStorage, then asynchronously syncing key metrics to a Symfony backend API. Built with Expo SDK 54, Expo Router, TanStack Query v5, and NativeWind, it features a retro pixel-art design system and supports seamless play with or without a network connection.

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
3e6d0cd latest project
d9f2b8a updated latest context
175602e latest
250f9e7 Fix currency formatting, scout gem source, and major feature additions
6e67f74 update docs
```

---

## Architecture Notes

- **Store/Repository Pattern** — `src/stores/` acts as a client-side data layer (academyStore, squadStore, marketStore, etc.), encapsulating state mutations and persistence behind a consistent interface, mirroring a repository pattern for local data.
- **Service Layer** — `src/api/endpoints/` and `src/api/mutations/` separate API communication concerns from UI; endpoints expose typed fetch functions while mutations wrap TanStack Query hooks, forming a two-tier service layer.
- **Engine/Domain Layer** — `src/engine/` (GameLoop, CoachPerception, CoachValuation, agentOffers) houses pure business logic isolated from UI and persistence, analogous to a domain/application layer in DDD.
- **DTO / Transform Layer** — `src/types/` defines app-side types that diverge from backend shapes; `src/api/endpoints/market.ts` explicitly transforms raw API responses into app DTOs (e.g. `ATT→FWD`, string→number coercions), acting as an anti-corruption layer.
- **Command/Event Separation (soft CQRS)** — reads flow through TanStack Query hooks (queries), while writes flow through Zustand store actions and `src/api/mutations/` (commands), keeping read and write paths distinct without full CQRS infrastructure.

---

## Current Development Focus

- **Asset pipeline & branding** — Multiple asset updates (`android-icon-foreground/monochrome`, `splash-icon`, `logo_master`, `generate-assets.js`) suggest ongoing visual identity work; AI could automate asset variant generation and consistency checks across platforms.
- **CI/CD & deployment workflows** — Active changes to `eas-update-prod.yml`, `eas-update-staging.yml`, and deployment commits indicate evolving release infrastructure; AI could help optimize workflow logic, add rollback gates, or validate EAS config diffs.
- **Android bug resolution** — The explicit "looking to fix bugs on android" commit signals platform-specific issues; AI could assist with diagnosing NativeWind/Reanimated compatibility, safe-area quirks, or metro bundler anomalies on Android.
- **GlobalHeader iteration** — `GlobalHeader.tsx` is among the most recently touched source files alongside the version display addition; AI could help with responsive layout, sync-state indicator logic, or accessibility improvements.
- **App configuration drift** — `app.json`, `package.json`, and `package-lock.json` all modified recently alongside `_layout.tsx`; AI could audit dependency compatibility (especially with `--legacy-peer-deps` requirement) and flag risky version bumps before they reach production.
