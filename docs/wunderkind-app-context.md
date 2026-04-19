# wunderkind-app — Project Context

> Generated: 2026-04-19 19:10:42 | Duration: 35s | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy — scouting and developing young talent, managing finances, and building facilities through a weekly simulation tick. The app is client-authoritative and offline-first, running the full game loop (trait evolution, financial calculations, behavioral incidents) entirely on-device via a centralized GameLoop engine. State is persisted locally with Zustand and AsyncStorage, then asynchronously synced to a Symfony backend using TanStack Query offline mutations.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: CLAUDE.md is the project guide for The Wunderkind Factory — a React Native/Expo football academy management game using Zustand, TanStack Query, NativeWind, and an offline-first "Weekly Tick" architecture syncing to a Symfony backend.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: This plan implements a **chained event system** for the Wunderkind Factory game, where NPC pair events can boost the probability of follow-up events for the same pair within a configurable time window. The architecture spans both backend and frontend: the Symfony backend's `GameEventTemplate` entity gains a `chainedEvents` JSON column, while the frontend introduces an `eventChainStore` (Zustand + AsyncStorage) to track active boost state per player pair. The `SocialGraphEngine` handles chain activation and weight multiplier application during template selection, while `GameLoop` is responsible for expiring stale boosts each tick. A notable architectural decision is replacing all three backend JSON fields (`chainedEvents`, `firingConditions`, `impacts`) with structured EasyAdmin form types rather than raw JSON editing, improving data integrity and admin usability.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: This plan implements the "Browse All Leagues + Club Detail" feature for the Competitions tab. Its core purpose is to expose the full national league pyramid (all tiers) in the BROWSE tab by reading from the already-populated `worldStore`, rather than only showing the user's own AMP league. The architecture reuses existing on-device data with no new API calls — `LeagueBrowser` is updated to render a sorted, accordion-style pyramid where the AMP league expands to the existing tappable `LeagueTable` standings and NPC leagues expand to a new `WorldClubList` component. Club taps are routed via a single `handleClubPress` handler: the user's own club navigates to the Squad tab, while any NPC club navigates to a new dynamic `app/club/[id].tsx` screen that displays the club's full player roster (sorted by position then OVR) pulled from `worldStore`. The plan spans 5 tasks across 5 files (2 created, 3 modified) with type-check and commit steps after each task.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This plan outlines three independent backend improvements to the Wunderkind Factory admin panel: adding a player stats summary panel to `/admin/player`, removing deprecated senior-player pool configuration, and adding a nationality picker to the player generation form. The architecture intentionally keeps the three changes decoupled — a new `PlayerRepository::getAdminSummary()` method injected into `PlayerCrudController` with a Twig template override; removal of five `PoolConfig` entity fields backed by a Doctrine migration to drop the corresponding PostgreSQL columns; and a `?string $nationality` parameter threaded from the admin form through `DashboardController` into `MarketPoolService`. The stack is PHP 8.4/Symfony 6/EasyAdmin v4 running inside a Lando container, and all PHP commands must be executed via `lando php`. The plan is structured with checkbox tasks intended for agentic execution using the `superpowers:subagent-driven-development` or `superpowers:executing-plans` skill.

### [docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md](docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md)
> AI Summary: This plan documents the implementation of a **dynamic league ability ranges matrix** for the Wunderkind Factory's `StarterConfig` system across both repos. The core architectural decision is to store the matrix as a **JSON column** (`league_ability_ranges`) in the backend `StarterConfig` entity, keyed by country code and league tier (e.g., `{ "EN": { "1": { "min": 75, "max": 100 } } }`), rather than a normalized relational structure — trading query flexibility for simplicity since this config is read-once at initialization.

On the backend (Symfony/EasyAdmin), the admin form is **dynamically generated** by querying the `League` table at render time, meaning new countries/tiers automatically appear in the UI without code changes. The save handler does minimal validation (casting to `int`), with the full data persisted as JSON. The `WorldInitializationService` then uses these ranges when generating NPC players, falling back to sensible defaults (`10–50`) if a range isn't configured.

The frontend change is minimal — a single optional field `leagueAbilityRanges?` added to the `StarterConfig` TypeScript interface — with Task 2 (the git commit) already reflected in recent history (`21c33bd: types: add leagueAbilityRanges to StarterConfig`), meaning **Task 1 is already complete**.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: This plan adds an `enabledCountries` field to the `StarterConfig` entity (backend JSON column, default `["EN"]`) so admins can control which countries appear in the app's onboarding country picker. The architecture flows from a Symfony/Doctrine backend through the existing `/api/starter-config` endpoint, early-fetched in `useAuthFlow` so the data is ready before the picker renders. On the frontend, `OnboardingScreen` filters the `CLUB_COUNTRIES` list against the enabled set and auto-selects + skips the picker step when only one country is enabled. The plan spans 9 files across both repos (backend entity/migration/controller/admin UI + frontend types/hook/layout/screen).

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: This plan addresses three coordinated concerns around the Wunderkind app's world initialization flow. **The core goal** is to place the AMP (player's club) into the bottom-tier league at world init, persisting this as `ampLeagueId` in `worldStore`, then wiring `leagueStore` and `fixtureStore` from the world data in a single `setFromWorldPack` call. **Storage hardening** is a major architectural decision: every AsyncStorage write now round-trips (write → read back → verify non-empty) and throws loudly on failure rather than silently producing an empty squad, with a new `clubsLoadError` transient field capturing parse failures in `loadClubs`. **The backend change** adds a 412 pre-flight guard to `InitializeController.php` that rejects world init requests if the player pool has fewer than 500 players, preventing the expensive initialization work from committing against a depleted pool. The plan also requires resolving existing merge conflicts in `syncQueue.ts` and `GameLoop.ts` as a prerequisite before any of the four tasks can be committed.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: This spec defines a **chained events system** that probabilistically links game events together for player pairs — when event A fires, it boosts the weighted probability of follow-up event B (or C, etc.) occurring for that same pair within a configurable time window.

The key architectural decision is a **clean backend/frontend split**: all chain configuration (`nextEventSlug`, `boostMultiplier`, `windowWeeks`) lives in a nullable JSON column on the `GameEventTemplate` entity in Symfony and is served via the existing `/api/events/templates` endpoint, while the frontend tracks active boosts at runtime in a new persisted Zustand store (`eventChainStore`) keyed on a canonical player-pair ID. Boost application happens non-destructively at weighted-random selection time in `SocialGraphEngine.ts` — original template weights are never mutated, only adjusted weights are used for selection. Multi-step chains (A→B→C) require no special handling since each event template simply carries its own `chainedEvents` array, and the spec also bundles a backend admin UX improvement: replacing all raw JSON textareas on `GameEventTemplateCrudController` with structured EasyAdmin `CollectionField` forms.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This spec documents the design for expanding the BROWSE tab from showing only the user's current league to displaying the full national league pyramid across all tiers. The core architectural decision is that all required data (`leagues` and `clubs`) already exists on-device in `worldStore`, so no new API calls or backend changes are needed. The implementation touches three components: `competitions.tsx` passes world data as props to `LeagueBrowser`, which sorts all leagues by tier and renders the AMP league as a tappable `LeagueTable` and other leagues as a new `WorldClubList` component, and `LeagueTable` gains an `onClubPress` callback for row taps. Navigation behavior forks based on identity: tapping the user's own club routes to the squad screen, while NPC clubs route to a new `/club/[id]` detail screen.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: This spec documents three parallel backend/frontend improvements to the Wunderkind admin and game configuration system. The **Player Admin Summary** adds a read-only stats panel to `/admin/player` showing global player counts grouped by nationality, position, and age range, implemented via a new `PlayerRepository::getAdminSummary()` method using three `COUNT + GROUP BY` SQL queries. The **Pool Config Cleanup** removes senior-player configuration from the pool generator and adds a nationality picker to player generation, tying generated player nationalities to a configurable list rather than hardcoded logic. The **Country Config** change introduces an `enabledCountries` field on `StarterConfig` in the backend, with a corresponding frontend country picker that respects this field — all three changes are designed to be implemented independently in parallel.

### [docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md](docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md)
> AI Summary: This spec defines the addition of a `leagueAbilityRanges` JSON column to the backend `StarterConfig` entity, enabling admins to configure minimum and maximum player ability ranges per country and league tier via EasyAdmin — replacing hardcoded or uncontrolled NPC club skill distributions. The core architectural decision is treating this as a configuration matrix stored in a single JSON column rather than a relational table, keeping the data flexible and admin-editable without schema migrations per league addition. On the backend, the `DashboardController` dynamically fetches distinct countries/tiers from the DB to render the form, and processes submitted values with integer casting before persisting. The frontend template (`starter_config.html.twig`) renders grouped min/max number inputs per tier using a naming convention like `leagueRanges[country][tier][min|max]`.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: This spec addresses two blocking issues preventing reliable world simulation from game day one. The core architectural decision is to make `setFromWorldPack` responsible for the full league placement chain atomically: it detects the lowest-tier league matching the AMP's country, persists `ampLeagueId` to `worldStore`, synthesizes a `LeagueSnapshot` for `leagueStore`, and generates round-robin fixtures via `fixtureStore` — all in one call, requiring no subsequent user action. Storage writes are now failure-loud: each AsyncStorage write is immediately read back and verified non-empty, with any failure aborting the entire init and propagating to `useAuthFlow.ts` as a hard error rather than a silent data loss; a new `clubsLoadError` field lets the UI surface parse failures on subsequent loads. The backend gains a pool pre-flight guard (HTTP 412 if `< 500` players exist) to prevent the silent empty-roster problem at the source.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: The `wunderkind-app-context-claude.md` file serves as an auto-generated project context document for AI assistants, aggregating summaries of key documentation files into a single reference. It establishes the core architectural identity of the app: a client-authoritative, offline-first React Native football academy management game built on Expo, Zustand, and AsyncStorage, with a "Weekly Tick" game loop running entirely on-device. The document also surfaces planned feature work, specifically a chained event system that would link NPC pair events to probabilistic follow-up events, requiring both a Symfony backend schema change (`chainedEvents` column, EasyAdmin form types) and a new frontend `eventChainStore` with boost-tracking logic integrated into `SocialGraphEngine` and `GameLoop`. Its primary purpose is to give AI tools a high-level orientation to the project without requiring them to read every individual file.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: `docs/wunderkind-app-context-gemini.md` is an **auto-generated project context snapshot** (produced 2026-04-18 by `generate_project_context.sh` using Gemini as the AI summarizer) that serves as a living reference document for AI agents working on the codebase. It aggregates AI-generated summaries of all key docs — from `CLAUDE.md` to active implementation plans — alongside the full dependency manifest, directory tree (195 TypeScript files across 38 directories), and recent git history. Architecturally, it reflects the project's layered design: a service-engine layer (`src/engine/`), domain-partitioned Zustand stores (`src/stores/`), hook-driven sync (`src/hooks/`), and a modular API layer (`src/api/`). Current development priorities documented include hardening world initialization / AMP league placement, admin nationality picker configuration, and tooling improvements to the context generation script itself.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: The `docs/wunderkind-app-context.md` file is an auto-generated project context document (generated 2026-04-19) that serves as a high-level orientation guide for the Wunderkind Factory app. Its core purpose is to provide a concise overview of the app's architecture: an offline-first, client-authoritative React Native game built with Expo, where all game logic (trait shifts, finances, behavioral incidents) runs on-device via a centralized `GameLoop` engine backed by Zustand + AsyncStorage, with async sync to a Symfony backend via TanStack Query. It also aggregates AI-generated summaries of key documentation files — currently `CLAUDE.md` and a chained events implementation plan (`2026-04-12-chained-events.md`) — capturing architectural decisions like the `eventChainStore` Zustand pattern, `SocialGraphEngine` chain multiplier logic, and `GameLoop`-managed boost expiration.

### [README.md](README.md)
> AI Summary: The Wunderkind Factory mobile app is an offline-first React Native/Expo football academy management strategy game featuring a client-authoritative weekly tick engine, an 8-trait Personality Matrix, and async sync to a Symfony backend via TanStack Query.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 115 |
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
│   ├── wunderkind-app-context.md
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
│   │   ├── useSyncStatus.ts
│   │   └── useUnifiedPlayer.ts
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

38 directories, 150 files
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
3bdb021 Merge branch 'feat/unified-player-view-app' into master (resolved conflicts)
a9feacc chore: commit pending app refactors
4c2057f ui: refactor player detail screen for unified player viewing
5dafef0 feat: implement useUnifiedPlayer hook and update WorldPlayer types
21c33bd types: add leagueAbilityRanges to StarterConfig
190a1b1 fix: back button on name step navigates to manager when only one country enabled
a321f9b feat: OnboardingScreen filters country picker by enabledCountries; auto-selects when one
de270da feat: early-fetch enabledCountries in useAuthFlow; expose in return
1bff2fd feat: add enabledCountries to StarterConfig type
6e00a3b feat: append AI CLI name to footer of generated context
0d46115 docs: admin pool summary, nationality picker & country config spec
5cae029 feat: add generation duration to project context header
25caffb refactor: rename --ai-cli to --ai
9aa6e45 fix: set club country before setFromWorldPack so bottom-league detection finds a match
fdbd0fa fix: prevent AI CLI from consuming stdin in markdown summarization loop
```

---

## Architecture Notes

- **Layered Architecture** — clear separation between `src/api` (data fetching), `src/stores` (state management), `src/engine` (business logic), and `src/components` (presentation), each with a distinct responsibility.
- **Store Pattern (Flux/Redux-like)** — `src/stores/` contains domain-scoped stores (squad, coach, market, loan, facility, inbox, auth), centralizing mutable state outside components; consistent with Zustand's atom-per-domain convention.
- **Engine/Domain Layer** — `src/engine/` encapsulates core game logic (GameLoop, personality, recruitment, finance) as pure utilities, keeping business rules independent of UI and storage concerns.
- **Repository-style API Layer** — `src/api/endpoints/` groups backend calls by resource (squad, staff, facilities, inbox, market), acting as a thin data-access layer; `src/api/mutations/` separates write operations from reads, echoing CQRS at the API boundary.
- **DTO / Transform Pattern** — raw backend responses are transformed into app-typed models within `src/api/endpoints/` before reaching stores or UI, acting as an anti-corruption layer between the Symfony API contract and the client domain model.

---

## Current Development Focus

- **Unified player/entity detail views** — The `useUnifiedPlayer` hook and WorldPlayer type system were just merged; extending the same pattern to coaches and scouts (both `coach/[id].tsx` and `scout/[id].tsx` were modified) would benefit from AI to maintain consistency across the three detail screen implementations.
- **Country/league configuration system** — Active work on `enabledCountries` filtering in onboarding, StarterConfig type extensions, and a dedicated country-config plan doc suggest a growing config surface that AI could help model, validate, and wire end-to-end.
- **Admin + StarterConfig backend improvements** — Two plan docs from the same day (`admin-backend-improvements`, `admin-starter-config-league-ability-ranges`) indicate parallel admin tooling work; AI can help keep the frontend `StarterConfig` type and API contract in sync as the backend evolves.
- **Onboarding flow edge cases** — Recent fixes (back-button navigation, auto-select when one country, early-fetch of enabledCountries) show the onboarding state machine is fragile under non-happy-path conditions; AI could help model the full state graph and surface missing guards.
- **Game-over screen** (`game-over.tsx` modified alongside hub/squad/finances) — Likely tied to the reputation/finance model; AI assistance would be useful for designing loss conditions, surfacing the right end-state metrics, and ensuring the weekly-tick engine feeds the correct signals into the game-over trigger.

---

> _AI summaries generated using **claude**._
