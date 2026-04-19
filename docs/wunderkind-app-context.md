# wunderkind-app — Project Context

> Generated: 2026-04-18 10:37:37 | Duration: 39s | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy, developing young players through an 8-trait Personality Matrix engine while handling finances, scouting, and staff management. Built with Expo SDK 54 and Expo Router, it follows an offline-first architecture where the "Weekly Tick" game loop runs entirely on-device, with Zustand persisting state via AsyncStorage. High-level metrics sync asynchronously to a Symfony backend API via TanStack Query offline mutations, keeping gameplay seamless regardless of connectivity.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: CLAUDE.md is the project guidance file for The Wunderkind Factory — a React Native football academy management strategy game built with Expo, Zustand, TanStack Query, and NativeWind, featuring an offline-first weekly tick architecture synced to a Symfony backend.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: The plan describes a **chained events system** for the Wunderkind app where firing an NPC pair event can boost the probability of related follow-up events within a configurable time window. On the backend, a new `chainedEvents` JSON column is added to `GameEventTemplate`, and EasyAdmin 5 structured forms replace raw JSON editing for `chainedEvents`, `firingConditions`, and `impacts`. On the frontend, a new `eventChainStore` (Zustand + AsyncStorage) tracks active pair-level boosts; `SocialGraphEngine` activates chains on incident fire and applies multipliers during template selection, while `GameLoop` expires stale boosts each tick. The plan is structured as a checklist of tasks intended for agentic execution via the `superpowers:subagent-driven-development` or `superpowers:executing-plans` skills.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: This plan implements the **"Browse: All Leagues + Club Detail Screen"** feature, enabling users to explore the full national league pyramid in the BROWSE tab and drill into any club's player roster.

**Core purpose:** Expand the competitions screen from showing only the user's AMP league to displaying the entire multi-tier pyramid (sourced from the on-device `worldStore`), with every club row being tappable — routing the user's own club to the squad tab, and NPC clubs to a new `/club/[id]` detail screen.

**Architectural decisions:** The feature is entirely client-side, leveraging data already present in `worldStore` (no new API calls), and uses Expo Router's dynamic file-based routing for the club detail screen. The `LeagueBrowser` component acts as the central routing hub with a single `handleClubPress` function that disambiguates AMP vs. NPC clubs, while the existing `LeagueTable` is extended with an optional `onClubPress` prop rather than replaced. A new `WorldClubList` component handles non-AMP league club rendering, keeping the two display modes (standings table vs. simple list) cleanly separated.

**Scope:** 5 tasks across 5 files — 2 new files (`WorldClubList.tsx`, `app/club/[id].tsx`) and 3 modifications (`LeagueTable.tsx`, `LeagueBrowser.tsx`, `competitions.tsx`) — each committed independently with a TypeScript check gate between tasks.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This plan documents three independent improvements to the Wunderkind backend admin panel, all targeting the PHP/Symfony/EasyAdmin stack. The core additions are: (1) a player stats summary panel on `/admin/player` — built by adding `getAdminSummary()` to `PlayerRepository` (grouping by nationality, position, and age bucket), injecting it into `PlayerCrudController`, and rendering it via a custom Twig template override above the EasyAdmin grid; (2) removal of the senior-player pool configuration — deleting five fields from the `PoolConfig` entity, running a Doctrine migration to drop the corresponding DB columns, and stripping the UI section from `pool_config.html.twig`; and (3) a nationality picker for player generation — threading a `?string $nationality` parameter from an HTML `<select>` in the admin form, through `DashboardController`, down to `MarketPoolService::generatePlayers()` so batch-generated players can be filtered to a specific nationality. All tasks are self-contained, ordered to avoid conflicts, and structured with per-step commit checkpoints to support incremental agentic execution.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: This plan implements admin-controlled country availability for the `OnboardingScreen` country picker. It adds an `enabledCountries` JSON column to the backend `StarterConfig` entity (defaulting to `['EN']`), exposes it via `/api/starter-config`, and provides an admin checkbox UI for managing it. On the frontend, `useAuthFlow` early-fetches the config so it's available before the picker renders, and `OnboardingScreen` filters `CLUB_COUNTRIES` to only show enabled options — with a UX optimization that auto-selects and skips the picker step entirely when only one country is enabled. The plan spans 7 tasks across both the Symfony backend and React Native frontend, with explicit commits, verification steps, and a spec-coverage matrix confirming full requirement traceability.

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: This plan implements three coordinated improvements to the Wunderkind Factory app's world initialization flow. Its core purpose is to place the AMP club into the correct bottom-tier league at world init, harden AsyncStorage writes so failures are surfaced loudly (via round-trip verification), and add a backend pre-flight guard that returns HTTP 412 if the player pool is too depleted before committing to initialization work.

Architecturally, `setFromWorldPack` in `worldStore.ts` is expanded to take on three new responsibilities: verifying each AsyncStorage write round-trips successfully, detecting the lowest league and persisting `ampLeagueId`, and wiring both `leagueStore` and `fixtureStore` from world data. A new `generateFixturesFromWorldLeague` action is added to `fixtureStore.ts`, and `InitializeController.php` on the Symfony backend gains a `PlayerRepository` injection to support the pool size check. The plan also notes a prerequisite: unresolved merge conflicts in `src/api/syncQueue.ts` and `src/engine/GameLoop.ts` must be resolved before any task begins.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: The **Chained Events Design** spec (approved 2026-04-12) defines a system where firing a game event for a player pair can probabilistically trigger follow-up events within a configurable time window, supporting multi-step chains (A→B→C) via recursive configuration. The backend stores chain configuration as a nullable `chainedEvents` JSON column on `GameEventTemplate`, with each link specifying a `nextEventSlug`, `boostMultiplier`, `windowWeeks`, and an admin-only `note` field that is stripped from the API response. The frontend receives trimmed chain metadata via `/api/events/templates` and tracks active chain state in a new persisted Zustand store (`src/stores/eventChainStore`). Architecturally, configuration is entirely backend-driven while the frontend owns only runtime state, mirroring the existing `impacts`/`firingConditions` patterns already in the codebase.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This spec designs the BROWSE tab expansion to display the full national league pyramid (all tiers) instead of just the user's current league, and makes every club row tappable — NPC clubs navigate to a new `/club/[id]` detail screen while the user's own academy navigates to the squad screen. All required data (`leagues` and `clubs`) already exists in `worldStore`, so no new API calls or backend changes are needed. The key architectural decisions are: (1) `competitions.tsx` passes `worldLeagues` and `worldClubs` as props down to `LeagueBrowser`; (2) `LeagueBrowser` renders the AMP league using the existing `LeagueTable` component (with a new `onClubPress` prop) and all other leagues via a new `WorldClubList` component; (3) a new `app/club/[id].tsx` route handles the NPC club detail screen, showing the club's players and staff from `worldStore` data. The design explicitly preserves backward compatibility by falling back to the single existing league if `worldLeagues` is empty while world data is still loading.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: This spec documents three parallel backend/frontend improvements for the Wunderkind Factory admin system. The **Player Admin Summary** adds a read-only stats panel above the EasyAdmin player grid, displaying global counts grouped by nationality, position, and age range, implemented via a new `PlayerRepository::getAdminSummary()` method using three separate SQL `COUNT + GROUP BY` queries. The **Pool Config Cleanup** removes senior-player generation config and adds a nationality picker to the player generation flow, streamlining the admin interface. The **Country Config** change introduces an `enabledCountries` field on `StarterConfig` so the frontend country picker dynamically reflects which countries the backend has enabled, rather than showing a hardcoded list.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: This spec addresses two blocking issues in world initialization: NPC clubs having empty rosters due to silently-swallowed AsyncStorage write failures, and the AMP (player's) club not being placed into any league, leaving the simulation engine with nothing to run against. The architectural solution has three parts: (1) placing the AMP into the lowest-tier league in its country automatically during `setFromWorldPack`, (2) hardening all AsyncStorage writes with round-trip verification and loud failure reporting to eliminate silent data loss, and (3) adding a pre-flight pool size check on the backend init endpoint (returning HTTP 412 if the pool is depleted) to prevent empty club rosters at the source. The data flow is orchestrated entirely within `setFromWorldPack` — it builds leagues and clubs, verifies storage, identifies the bottom-tier league by country, sets `ampLeagueId` on `worldStore`, then synthesizes a `LeagueSnapshot` and triggers `leagueStore.setFromSync()` and `fixtureStore.generateFixturesFromWorldLeague()` so the simulation engine is fully bootstrapped without any additional user action.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: The file is a generated project context document for the Wunderkind Factory app, serving as a consolidated reference for AI assistants working on the codebase. Its core purpose is to aggregate key documentation — including the CLAUDE.md guidance file and active implementation plans — into a single snapshot with AI-generated summaries of each document. The architectural decisions it surfaces include the client-authoritative offline-first Weekly Tick engine (Zustand + AsyncStorage), Symfony backend sync via TanStack Query v5, and a planned chained event system that introduces an `eventChainStore` to track NPC pair event boosts alongside a backend `chainedEvents` column on `GameEventTemplate`. It appears to be auto-generated (timestamped 2026-04-18) as a living reference rather than hand-authored documentation.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: `docs/wunderkind-app-context-gemini.md` is an AI-generated project context document produced by the `generate_project_context.sh` script using Gemini as the summarizing AI. Its core purpose is to give an AI agent a comprehensive snapshot of the Wunderkind Factory codebase — covering the tech stack (Expo, Zustand, TanStack Query, NativeWind), full directory structure (195 TS files across 38 directories), dependency manifest, environment variables, and recent git activity. It also includes AI-generated summaries of every key planning and design document in `docs/superpowers/`, capturing architectural decisions like the chained events system, world initialization hardening (round-trip AsyncStorage verification, backend pool pre-flight guard), and the Browse-tab league pyramid expansion. Finally, it surfaces the current development focus areas — admin pool nationality config, league placement logic, and auth flow country support — giving any AI agent immediate context on in-progress work without needing to explore the codebase from scratch.

### [README.md](README.md)
> AI Summary: The Wunderkind Factory mobile app is an offline-first React Native/Expo football academy management strategy game featuring a weekly tick engine, 8-trait Personality Matrix, and async sync to a Symfony backend.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 195 |
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
│   ├── club
│   │   └── [id].tsx
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
│   ├── wunderkind-app-context-claude.md
│   ├── wunderkind-app-context-gemini.md
│   └── wunderkind-app-context.md.tmp
├── scripts
│   ├── dev-proxy.py
│   ├── generate_project_context.sh
│   └── generate-assets.js
├── src
│   ├── __tests__
│   │   ├── engine
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
│   │   ├── ArchetypeBadge.tsx
│   │   ├── AssignMissionOverlay.tsx
│   │   ├── ClubDashboard.tsx
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
│   │   ├── ResultsEngine.ts
│   │   ├── ScoutingService.ts
│   │   ├── SelectionService.ts
│   │   ├── SimulationService.ts
│   │   └── SocialGraphEngine.ts
│   ├── hooks
│   │   ├── useArchetypeSync.ts
│   │   ├── useAuthFlow.ts
│   │   ├── useClubMetrics.ts
│   │   ├── useGameConfigSync.ts
│   │   ├── useNarrativeSync.ts
│   │   ├── useProspectSync.ts
│   │   └── useSyncStatus.ts
│   ├── stores
│   │   ├── activeEffectStore.ts
│   │   ├── altercationStore.ts
│   │   ├── archetypeStore.ts
│   │   ├── authStore.ts
│   │   ├── clubStore.ts
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
│   │   ├── api.ts
│   │   ├── archetype.ts
│   │   ├── club.ts
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

38 directories, 148 files
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
6e00a3b feat: append AI CLI name to footer of generated context
0d46115 docs: admin pool summary, nationality picker & country config spec
5cae029 feat: add generation duration to project context header
25caffb refactor: rename --ai-cli to --ai
9aa6e45 fix: set club country before setFromWorldPack so bottom-league detection finds a match
fdbd0fa fix: prevent AI CLI from consuming stdin in markdown summarization loop
5cb46d0 feat: add markdown documentation summarization
eafaba0 fix: safe-narrow reputationTier when building syntheticLeague
4f6948a fix: move worldStore set() after cross-store wiring; add country-match warning
125b13d feat: harden setFromWorldPack writes; place AMP in bottom league at world init
578222f feat: add ampLeagueId + clubsLoadError to worldStore; harden loadClubs
7949076 feat: add --ai-cli support and generic AI caller
6b511dc feat: add generateFixturesFromWorldLeague to fixtureStore
fe030cd fix: mark resolved merge conflicts in syncQueue and GameLoop
7cb766d docs: add world init AMP league placement implementation plan
```

---

## Architecture Notes

- **Store/Repository Pattern** — `src/stores/` acts as the data layer (e.g. `squadStore`, `marketStore`, `loanStore`), encapsulating state reads/writes behind a consistent Zustand interface
- **Service Layer** — `src/engine/` contains domain logic services (`SimulationService`, `ScoutingService`, `GameLoop`) decoupled from UI and state
- **DTO / API Adapter Pattern** — `src/api/endpoints/` transforms raw backend responses into app-typed models (e.g. pence→pounds, position mapping, derived fields), acting as an anti-corruption layer
- **Command/Mutation Separation (CQRS-lite)** — reads live in `src/api/endpoints/` (queries) while writes are isolated in `src/api/mutations/` (commands), mirroring CQRS read/write separation
- **Hooks-as-Controller Pattern** — `src/hooks/` (e.g. `useAuthFlow`, `useClubMetrics`) orchestrate multi-store and API calls, acting as the controller/presenter layer between engine logic and React Native UI

---

## Current Development Focus

- **World initialization ordering & cross-store wiring** — multiple sequential bug fixes (`setFromWorldPack`, `worldStore set()`, country-match detection) suggest fragile bootstrapping logic that would benefit from AI-assisted invariant analysis and dependency graph generation.
- **Country/nationality configuration system** — an active spec (`admin-pool-country-config-design.md`) and nationality picker work indicate a data-modelling problem where AI could help validate schema completeness, edge cases, and consistency across league/club/player hierarchies.
- **League placement & reputation tier logic** — two fixes around `reputationTier` narrowing and bottom-league detection point to brittle conditional logic that AI could help formalise into tested, rule-based classification functions.
- **Project context & AI CLI tooling** — heavy iteration on `generate_project_context.sh` (summarisation, duration headers, stdin handling, AI name tagging) is meta-tooling that would benefit from AI help designing a robust, idempotent pipeline with clear output contracts.
- **Auth/bootstrap flow (`useAuthFlow.ts`)** — ongoing modifications alongside world-init changes suggest the startup sequence is still evolving; AI assistance could help map the full dependency chain and surface race conditions or missing guards before they become bugs.

---

> _AI summaries generated using **claude**._
