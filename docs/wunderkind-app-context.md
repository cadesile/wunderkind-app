# wunderkind-app — Project Context

> Generated: 2026-04-26 16:28:24 | Duration: 39s | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy — scouting and developing talent, managing finances, handling staff, and growing club reputation through a weekly simulation engine. The app is client-authoritative and offline-first, processing all game logic on-device via a centralized GameLoop before asynchronously syncing key metrics to a Symfony backend API. It uses Expo with Zustand for state management, TanStack Query v5 for offline-capable API sync, and a pixel-art design system built on NativeWind with the Press Start 2P font.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: CLAUDE.md is the project guidance file for **The Wunderkind Factory** — a React Native/Expo football club management game using Zustand, TanStack Query, and NativeWind, with an offline-first "Weekly Tick" architecture that syncs to a Symfony backend.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: This plan documents the implementation of a **chained event system** for the Wunderkind app, where firing a social event between two NPC players can boost the probability of related follow-up events for that same pair within a configurable time window. The architecture splits responsibility between backend and frontend: the backend's `GameEventTemplate` entity gains a `chainedEvents` JSON column (configured via structured EasyAdmin forms replacing raw JSON fields), while the frontend adds an `eventChainStore` (Zustand + AsyncStorage) to track active per-pair boost multipliers. The `SocialGraphEngine` activates chains when incidents fire and applies multipliers during template selection, while `GameLoop` handles expiring stale boosts each weekly tick. The plan is structured as an agentic execution target using checkbox-syntax tasks, intended to be run via the `superpowers:subagent-driven-development` or `superpowers:executing-plans` skill across both the Symfony backend and React Native frontend repos.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: This plan documents the implementation of a **league pyramid browsing feature** for the Wunderkind Factory app's BROWSE tab, enabling users to tap any club in the national league structure to view its player roster.

**Core purpose:** Expose all leagues and clubs from the on-device `worldStore` in the competitions screen, replacing the previous single-league view with a full tier-sorted pyramid (T1–T8), and add a new `app/club/[id].tsx` detail screen that renders an NPC club's player roster sorted by position and overall rating.

**Architectural decisions:**
- All data is read from `worldStore` (already on-device, no new API calls needed), keeping the feature fully offline-compatible with the app's client-authoritative model.
- Routing is bifurcated in `LeagueBrowser.handleClubPress`: tapping the user's own club navigates to `/(tabs)/squad`, while tapping any NPC club navigates to the new dynamic route `/club/[id]`.
- The existing `LeagueTable` component is extended with an optional `onClubPress` prop (rows disabled when not provided), preserving backwards compatibility with the LEAGUE tab.
- A new `WorldClubList` component handles non-AMP league expansions, keeping NPC and AMP rendering paths cleanly separated within `LeagueBrowser`.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This plan outlines three independent backend improvements to the Wunderkind Factory admin panel: adding a player stats summary panel to the `/admin/player` page, removing legacy senior-player pool configuration, and adding a nationality picker to the player generation form. Architecturally, the work is cleanly separated — a new `PlayerRepository::getAdminSummary()` method feeds a custom Twig template override in EasyAdmin v4, five `PoolConfig` entity fields are dropped via a Doctrine migration, and a `?string $nationality` parameter is threaded from the admin form through `DashboardController` into `MarketPoolService::generatePlayers()`. The tech stack is PHP 8.4, Symfony 6, Doctrine ORM, PostgreSQL 16, and EasyAdmin v4, with all PHP commands executed inside the Lando container. The plan is structured as checkbox tasks intended for agentic/subagent-driven execution, with a clear file map identifying exactly which files are created, modified, or generated.

### [docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md](docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md)
> AI Summary: This plan implements a dynamic **league ability ranges configuration matrix** for the Wunderkind Factory's admin system. The core architectural decision is to store the matrix as a JSON column in the backend `StarterConfig` entity, keyed by country code and league tier (e.g., `{ "EN": { "1": { "min": 75, "max": 100 } } }`), enabling flexible per-country/tier player ability bounds without schema migrations for each new country or tier. On the frontend, the `StarterConfig` TypeScript interface is extended with an optional `leagueAbilityRanges` field to consume this data, while the backend uses EasyAdmin 5 to dynamically generate form inputs driven by whatever countries and tiers exist in the database. The plan spans both repos (Symfony backend + React Native frontend) and is structured as discrete checkbox tasks designed for agentic/parallel execution.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: This plan adds an `enabledCountries` field to the `StarterConfig` entity so administrators can control which countries appear in the app's onboarding country picker, defaulting to England (`['EN']`). The architecture stores this as a JSON column in the Symfony/Doctrine backend, surfaces it via the existing `/api/starter-config` endpoint, and fetches it early in `useAuthFlow` so it's available before the picker renders. On the frontend, `OnboardingScreen` filters the `CLUB_COUNTRIES` list by the enabled set, with an auto-select shortcut when only one country is enabled. The change spans both the Symfony backend (entity, migration, controller, admin Twig template) and the React Native frontend (TypeScript types, auth hook, root layout, onboarding component).

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: This plan documents **World Init: AMP League Placement + Storage Hardening** — a three-part initiative to make world initialization robust and game-mechanically correct.

**Core purpose:** At world init, the AMP (player's club) must be automatically placed into the lowest-tier league for their country. To support this, `setFromWorldPack` in `worldStore` is extended to detect the bottom league by tier number, persist its ID as `ampLeagueId`, and wire `leagueStore` and `fixtureStore` using a synthetic `LeagueSnapshot` built from world data — all in a single atomic flow.

**Storage hardening:** Every AsyncStorage write in `setFromWorldPack` is now verified with an immediate read-back round-trip, throwing loudly if the persisted data is missing or empty. `loadClubs` is also hardened with try/catch per-league, surfacing parse failures into a new `clubsLoadError` transient state field rather than silently producing an empty club map.

**Backend guard:** The Symfony `InitializeController` gains a pre-flight check that counts available players in the pool and returns HTTP 412 (Precondition Failed) if fewer than 500 exist — preventing initialization from running against a depleted pool. The plan also requires resolving pre-existing merge conflicts in `syncQueue.ts` and `GameLoop.ts` before any of the four tasks can be committed.

### [docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md](docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md)
> AI Summary: This plan addresses two bugs and one feature: fixing player attribute values to properly correlate with configured league ability ranges, and making NPC club player rows tappable to navigate to the full player detail screen. It involves three independent changes across two repositories — the PHP/Symfony backend (`MarketPoolService.php` and `WorldInitializationService.php`) and the React Native frontend (`app/club/[id].tsx`). The core architectural decision is that player attributes should be derived from `currentAbility` (setting `attrBudget = currentAbility * 6` so the six attributes sum meaningfully to that value) rather than being randomized independently, and that AMP ability ranges should be dynamically read from `leagueAbilityRanges` config based on league tier rather than hardcoded constants. The frontend change is minimal — wrapping existing player rows with a `Pressable` and chevron to leverage the already-functional `player/[id].tsx` NPC detail screen.

### [docs/superpowers/plans/2026-04-19-staff-office-consolidation.md](docs/superpowers/plans/2026-04-19-staff-office-consolidation.md)
> AI Summary: This plan consolidates the app's staff management UI by merging the Hub's separate `COACHES` and `SCOUTS` tabs into a single unified `STAFF` tab with a role filter overlay, and renames the `Market` tab to `Office` with two sub-screens: `CLUB` (academy profile editor) and `HIRE` (staff marketplace with role filtering). On the backend, the `SyncService` is extended to expose `staffRoles` (a `StaffRole` enum list) via `/api/sync`'s `gameConfig` payload, which the frontend uses to drive hire filtering — requiring `rawRole` to be added to `MarketCoach` and populated during market data transformation. Simultaneously, the backend's EasyAdmin `StaffCrudController` is fixed to remove broken enum references and expose all relevant fields, and the sidebar is relabeled from "Coaches" to "Staff". The frontend also gains a new `clubStore` with setters for extended club profile fields (`stadiumName`, `formation`, `playingStyle`, `primaryColor`, `secondaryColor`) to power the new CLUB editor screen.

### [docs/superpowers/plans/2026-04-20-all-league-tables-browse.md](docs/superpowers/plans/2026-04-20-all-league-tables-browse.md)
> AI Summary: This plan implements live league table browsing across all tiers in the app's Browse tab, where standings are computed from simulated fixtures rather than static data. The core architectural decision is to make `ampClubId` optional throughout the standings pipeline (in `computeStandings`, `generateFixturesFromWorldLeague`, and `LeagueTable`) so NPC-only leagues can be processed with the same code paths as the player's league. The approach leverages the existing `SimulationService.runBatchSimulation` to automatically simulate NPC leagues once their fixtures are seeded at world-init time via `setFromWorldPack`, avoiding any new simulation infrastructure. `LeagueBrowser` is updated to swap out `WorldClubList` for `LeagueTable` across all tiers, with structural typing widening (`clubs` accepts `{ id: string }[]`) eliminating the need for adapters between world and local club types.

### [docs/superpowers/plans/2026-04-23-sponsor-contracts.md](docs/superpowers/plans/2026-04-23-sponsor-contracts.md)
> AI Summary: This plan replaces the app's simple `sponsorIds[]` array with a full `SponsorContract` system, introducing per-contract data (weekly payment, end week, expiry) as the authoritative source for sponsor income and display. Architecturally, it isolates all offer-calculation logic into a new pure module (`sponsorEngine.ts`) and distributes the remaining responsibilities clearly: `GameLoop.ts` handles expiry/renewal processing, `inbox.tsx` writes contract records on acceptance, and `finances.tsx` reads contracts directly for display. The plan also introduces probability configuration fields in `gameConfig.ts` to govern when sponsor and investor offers are generated, and enforces a max-10 active sponsor cap. It is structured as a task-by-task checklist for agentic execution, spanning type definitions, a new engine module with unit tests, store mutations, and UI updates across inbox and finances screens.

### [docs/superpowers/plans/2026-04-24-fans-mechanic.md](docs/superpowers/plans/2026-04-24-fans-mechanic.md)
> AI Summary: The `2026-04-24-fans-mechanic.md` plan documents the implementation of a **Fan Happiness system** for the Wunderkind app — a derived-state mechanic where `FanEvent`s (triggered by match results, transfers, and facility upgrades) are accumulated in a `fanStore` and processed by a `FanEngine` to compute a happiness tier (`Angry` → `Thrilled`). The architecture is intentionally derived-state: raw events are stored, and the current tier is calculated on-the-fly from recent event impact scores rather than persisted directly. The plan covers full-stack implementation from type definitions and Zustand store through engine logic, GameLoop integration, finance/morale impact, and UI components (a Fan Happiness card and history screen). It follows a task-by-task checkbox format intended for agentic execution via the `superpowers:subagent-driven-development` or `superpowers:executing-plans` skills.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: This document specifies a **chained event system** for the Wunderkind game, where a fired game event can boost the probability of follow-up events for the same player pair within a configurable time window, supporting multi-step chains (A→B→C) automatically through recursive configuration. The backend implements this via a nullable `chainedEvents` JSON column on the `GameEventTemplate` entity, with each chain link defining a target event slug, a weight boost multiplier, and a window duration in weeks — the admin-facing `note` field is stripped before the frontend payload is sent. The frontend stores active chain state in a new Zustand persisted store (`src/stores/eventChainStore`) to track which boosts are currently live. The key architectural decision is a clean separation of concerns: all chain configuration lives entirely in the backend and is fetched via `/api/events/templates`, while the frontend only holds transient runtime state.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This spec (dated 2026-04-16, status: Approved) describes the design for expanding the BROWSE/competitions tab from showing only the user's current league to displaying the full national league pyramid across all tiers. The core architectural decision is that **no new API calls or backend changes are needed** — all required data already exists on-device in `worldStore` (`leagues` and `clubs`), so the work is purely UI wiring. The implementation spans three components: `competitions.tsx` reads from `worldStore` and passes `worldLeagues`/`worldClubs` as props to `LeagueBrowser`; `LeagueBrowser` sorts leagues by tier and renders either the existing `LeagueTable` (for the user's own league) or a new `WorldClubList` component (for all other leagues); and `LeagueTable` gains an `onClubPress` callback so rows are tappable. Tapping a club routes to `/club/[id]` for NPC clubs, or to the user's own squad screen if the tapped club matches `ampClubId`.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: This spec documents three parallel backend/frontend improvements to the Wunderkind admin tooling dated 2026-04-18. The first change adds a read-only summary panel to the `/admin/player` EasyAdmin page, showing global player counts broken down by nationality, position, and age range — implemented via a new `PlayerRepository::getAdminSummary()` method using three separate `COUNT`/`GROUP BY` queries with age bucketing done in PHP. The second change cleans up pool configuration by removing legacy senior-player config and adding a nationality picker to the player generation flow. The third change introduces an `enabledCountries` field on `StarterConfig` so the frontend country picker is driven by server-side config rather than a hardcoded list.

### [docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md](docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md)
> AI Summary: This spec defines the addition of a dynamic `leagueAbilityRanges` JSON column to the backend `StarterConfig` entity, allowing administrators to configure minimum and maximum player ability values per country and league tier via EasyAdmin, replacing hardcoded or non-granular NPC club ability distributions. The core architectural decision is storing the entire configuration matrix as a single JSON column (`league_ability_ranges`) on `StarterConfig`, making the full world pyramid skill distribution configurable without code changes. The backend implementation spans three layers: a Doctrine entity/migration for persistence, `DashboardController` methods to fetch distinct leagues and process submitted form data (with explicit int casting for safety), and a Twig template that renders grouped `min`/`max` inputs following a structured naming pattern (`leagueRanges[country][tier][min/max]`). The design gives the admin panel complete, data-driven control over how player quality is distributed across every league tier during world initialization.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: This design document addresses two blocking issues in the world initialization flow: NPC clubs having empty rosters due to silently swallowed AsyncStorage write failures, and the AMP (player's) club having no league assignment at init time. The core architectural solution is a hardened `setFromWorldPack` function that verifies each AsyncStorage write round-trips successfully and fails loudly on errors, plus automatic placement of the AMP club into the lowest-tier league in its country during that same init call — requiring no subsequent user action. A backend guard is also added to the `/api/initialize` endpoint that returns HTTP 412 before depleting the player pool if the pool falls below a minimum size threshold. Together these changes establish a reliable one-shot world init path where storage integrity is verified and league/fixture state is fully bootstrapped from a single response.

### [docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md](docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md)
> AI Summary: This spec documents two backend + one frontend fix for world initialisation correctness and NPC player navigation.

**Core problem:** Player attribute budgets (`attrBudget`) in `MarketPoolService` were generated independently of `currentAbility`, meaning a tier-1 player (ability 80) could display an OVR of ~37 because the budget controlling their 6 attributes was random rather than derived. Additionally, the AMP (player's own) club bypassed the admin-configured `leagueAbilityRanges` entirely, using a hardcoded constant.

**Architectural decisions:** The fix correlates `attrBudget` to `currentAbility` via the formula `attrBudget = currentAbility × 6` — ensuring the 6 attributes average out to exactly `currentAbility` while preserving position-specific weighting. For the AMP club, hardcoded ranges are removed and replaced with a live lookup into the same `$leagueRanges` matrix used for NPC clubs, keyed off the club's actual assigned league tier. Both changes require a pool wipe and regeneration after deploy.

**Frontend fix:** NPC player rows in `club/[id].tsx` are upgraded from non-interactive `View` components to `Pressable` elements that navigate to `/player/${p.id}`. No changes to `useUnifiedPlayer` or `player/[id].tsx` were needed since both already handle NPC players correctly — the data flow and `isNpc` branching were already in place.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: The `wunderkind-app-context-claude.md` file is an auto-generated project context document that aggregates summaries of key documentation files across the Wunderkind Factory codebase into a single reference for AI assistants. Its core purpose is to give a high-level orientation to the project — a React Native football academy management game with an offline-first, client-authoritative "Weekly Tick" engine built on Zustand, AsyncStorage, and TanStack Query with a Symfony backend for periodic sync. Architecturally, it documents two notable design decisions: the chained event system (linking NPC pair events to probabilistically weighted follow-up events via `eventChainStore` and `SocialGraphEngine`) and the clean separation between on-device processing and backend sync. The document functions as a living index rather than authoritative source — each entry is an AI-generated summary pointing back to the canonical file.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: The file `docs/wunderkind-app-context-gemini.md` is an auto-generated project context snapshot (generated 2026-04-18) intended to give AI assistants (likely Gemini) a structured overview of the Wunderkind Factory codebase. Its core purpose is to aggregate and summarize key project documents — including `CLAUDE.md` and active implementation plans — into a single reference document, with AI-generated summaries of each source file. Architecturally, it documents two notable planned systems: a **chained events** system using a cross-stack approach (backend `GameEventTemplate` entity + frontend `eventChainStore` Zustand store) to create dynamic narrative sequences between NPCs, and a **league/club browsing** feature (content truncated). The document reflects the project's client-authoritative, offline-first design philosophy and serves as a portable context file for multi-AI-tool workflows.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: The `docs/wunderkind-app-context.md` file is an auto-generated project context index for the Wunderkind Factory app, capturing a snapshot of the codebase and its associated planning documents as of April 24, 2026. Its core purpose is to provide a high-level overview for AI assistants and developers, summarizing the app's architecture — a React Native/Expo football management game built around a client-authoritative "Weekly Tick" game loop with an offline-first design using Zustand and TanStack Query. It also serves as a navigable index of key documentation artifacts, including `CLAUDE.md` and planning docs under `docs/superpowers/plans/`, each with AI-generated summaries of their contents. The architectural decisions documented include the eight-trait Personality Matrix engine, planned chained event systems with Zustand-backed multiplier tracking, and a league/club browsing feature — reflecting the project's roadmap and its modular, plan-driven development approach.

### [README.md](README.md)
> AI Summary: The Wunderkind Factory mobile app README describes a React Native/Expo football club management strategy game with an offline-first architecture, featuring a client-authoritative weekly tick engine, 8-trait Personality Matrix, and async sync to a Symfony backend via TanStack Query.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 121 |
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
│   │   ├── office.tsx
│   │   └── squad.tsx
│   ├── club
│   │   └── [id].tsx
│   ├── coach
│   │   └── [id].tsx
│   ├── office
│   │   ├── _layout.tsx
│   │   ├── coaches.tsx
│   │   ├── fans.tsx
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
│   │   ├── FanFavoriteCard.tsx
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
│   │   ├── FanEngine.ts
│   │   ├── finance.ts
│   │   ├── FormulaEngine.ts
│   │   ├── GameLoop.ts
│   │   ├── GuardianEngine.ts
│   │   ├── ManagerBrain.ts
│   │   ├── MoraleEngine.ts
│   │   ├── personality.ts
│   │   ├── ReactionHandler.ts
│   │   ├── RelationshipService.ts
│   │   ├── ResultsEngine.ts
│   │   ├── ScoutingService.ts
│   │   ├── SelectionService.ts
│   │   ├── SimulationService.ts
│   │   ├── SocialGraphEngine.ts
│   │   └── sponsorEngine.ts
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
│   │   ├── fanStore.ts
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
│   │   ├── fans.ts
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

38 directories, 157 files
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
8f32f1b feat: implement fan happiness mechanic and complete staff/office consolidation
876b94a feat: add fan happiness UI screens and components
88223a1 feat: emit fan events for facility upgrades and player sales
ee439a0 feat: apply fan happiness impact to income and morale
8358e2d feat: integrate fan events into match results and game loop
b2227a3 feat: implement FanEngine for happiness calculation
4df775c feat: add fan types and store
5c36575 feat(reputation): cap club reputation at league reputationCap from worldpack sync
14cbc98 feat(office): block hire when role cap reached; show occupied-role popup with current hire card
88e3847 feat(office): expand KEY STAFF cards with avatar, archetype badge and influence
43dd95f feat(office): move KEY STAFF section above tactics
278e600 feat(office): add staff caps to GameConfig; show singleton role cards on CLUB tab with hire deep-link
a16d429 feat(finances): SponsorsPane reads sponsorContracts with live weeks-remaining bar
1ed615b feat(inbox): sponsor accept writes SponsorContract; enforce 10-sponsor cap
e76bdb6 feat(gameloop): contract-based sponsor income; config-driven offer probabilities and payment formula
```

---

## Architecture Notes

- **Store-per-domain (Flux/Zustand slice pattern)** — each bounded context (`squadStore`, `coachStore`, `facilityStore`, `inboxStore`, etc.) owns its own state slice with collocated actions, mirroring Redux ducks but via Zustand.
- **Engine/service layer** — `src/engine/` contains pure computation units (`GameLoop`, `FanEngine`, `GuardianEngine`, `SimulationService`, `ManagerBrain`) that are stateless processors invoked by stores or hooks, separating business logic from state.
- **Repository/endpoint abstraction** — `src/api/endpoints/` wraps raw HTTP calls per resource (squad, staff, facilities, inbox), acting as a thin repository layer that transforms backend DTOs into app-local types before they reach stores.
- **Command/mutation separation (CQRS-lite)** — reads live in `src/api/endpoints/` (queries), writes are isolated in `src/api/mutations/` (e.g. `syncMutations`, `marketMutations`), separating read and write concerns aligned with TanStack Query's model.
- **Offline-first with optimistic sync** — client is authoritative; local Zustand+AsyncStorage is the source of truth, with background sync mutations queuing changes to the remote API rather than blocking on network availability.

---

## Current Development Focus

- **Fan happiness system** — The `FanEngine`, fan store, and fan UI screens were all built in rapid succession across 7 commits, suggesting the core mechanic is new and still evolving; AI could help tune happiness decay/recovery formulas, validate edge cases, and generate test fixtures for the `FanEngine`.
- **Office & staff management** — Role-cap enforcement, hire blocking, and staff card UI are actively changing across multiple office screens (`coaches.tsx`, `scouts.tsx`, `players.tsx`); AI could help unify the hire/fire flow and ensure consistent validation logic across all role types.
- **Sponsor contracts** — An open plan doc (`2026-04-23-sponsor-contracts.md`) indicates this feature is planned but not yet implemented; AI is well-suited to scaffold the contract lifecycle (offer → sign → weekly payment → expiry) against the existing finance and inbox architecture.
- **League table browsing** — Another open plan (`2026-04-20-all-league-tables-browse.md`) suggests a data-heavy UI feature pending implementation; AI could help design efficient data fetching, caching strategy (extending the existing 5-min TanStack Query cache pattern), and rendering for potentially large table datasets.
- **Reputation cap / world-pack sync** — The recent commit capping reputation at `reputationCap` from a worldpack sync suggests the world-state model is expanding; AI could help design the sync contract, handle offline divergence, and ensure the `GameLoop` correctly respects dynamic league-level constraints.

---

> _AI summaries generated using **claude**._
