# wunderkind-app — Project Context

> Generated: 2026-05-06 22:12:35 | Duration: 35s | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy, developing young players through an 8-trait Personality Matrix engine and navigating finances, staff recruitment, and club reputation across weekly game ticks. The app is client-authoritative and offline-first — all core game logic (trait shifts, financial deductions, behavioral incidents) runs entirely on-device via a centralized GameLoop engine, with high-level metrics asynchronously synced to a Symfony backend when connectivity is available. Built on Expo SDK 54 with Expo Router, Zustand for state persistence, and NativeWind for a pixel-art visual aesthetic, the architecture prioritizes seamless offline play while maintaining eventual consistency with the central API.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: CLAUDE.md is the project guidance file for The Wunderkind Factory — a React Native/Expo football club management game using Zustand, TanStack Query, NativeWind, and an offline-first weekly tick architecture syncing to a Symfony backend.

### [docs/api/sync-v2.md](docs/api/sync-v2.md)
> AI Summary: **`docs/api/sync-v2.md` — Summary**

This document specifies a proposed additive extension to the `POST /api/sync` weekly telemetry endpoint, which is the primary channel the client uses to push game state to the Symfony backend. The core architectural decision it reinforces is that the **client is fully authoritative** for all game state — the backend only records, reconciles, and powers leaderboards/analytics. The v2 additions to the request body are all football-specific metrics derived client-side from `fixtureStore`: recent form (`'W'|'D'|'L'[]`), current league position, a season running record (wins/draws/losses/goals/points), and a full array of unsynced fixture results identified by a `synced: boolean` flag per fixture. The backend is expected to confirm receipt of each fixture via `syncedFixtureIds` in the response, allowing the client to mark them as synced and avoid re-sending on future ticks.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: This plan documents the implementation of a **chained events system** for the Wunderkind app, where firing an NPC pair event can probabilistically boost related follow-up events within a configurable time window. The architecture splits responsibility between backend and frontend: the Symfony backend adds a `chainedEvents` JSON column to `GameEventTemplate` and introduces structured EasyAdmin forms to replace raw JSON editing for `chainedEvents`, `firingConditions`, and `impacts`; the frontend adds a new `eventChainStore` (Zustand + AsyncStorage) to track active per-player-pair boosts, with `SocialGraphEngine` applying multipliers during event selection and `GameLoop` expiring stale boosts each tick. The plan is structured as a task-by-task checklist intended for agentic execution via the `superpowers:subagent-driven-development` or `superpowers:executing-plans` skills, covering new PHP form types, Doctrine migrations, engine modifications, store creation, and Jest tests across both repos.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: This plan implements a **full national league pyramid browser** in the BROWSE tab, enabling users to tap any club and view its player roster on a new detail screen. All data is sourced entirely on-device from `worldStore` (no new API calls), making the feature offline-ready by design.

The architecture routes club taps through a single `handleClubPress` handler in `LeagueBrowser`: tapping the user's own club redirects to `/(tabs)/squad`, while any NPC club navigates to a new `app/club/[id].tsx` Expo Router screen that reads club data from `worldStore`. The plan touches 5 files — creating `WorldClubList` (tappable NPC club rows) and `app/club/[id].tsx` (roster detail), while modifying `LeagueTable`, `LeagueBrowser`, and `competitions.tsx` to wire up the pyramid rendering and prop passing.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This plan outlines three independent backend improvements to the Wunderkind Factory admin panel, targeting a PHP 8.4/Symfony 6/EasyAdmin v4 stack running in a Lando container. The core changes are: (1) adding a `getAdminSummary()` query to `PlayerRepository` and surfacing the results in a custom Twig template override on the `/admin/player` index page; (2) removing five senior-player pool configuration fields from the `PoolConfig` entity, backed by a Doctrine migration that drops the corresponding columns; and (3) threading a `?string $nationality` parameter from a new admin form `<select>` through `DashboardController` into `MarketPoolService::generatePlayers()` and `forceGeneratePool()`. Architecturally, the plan keeps all three changes isolated from one another, touches exactly eight files, and requires no frontend or API contract changes — only backend PHP, Doctrine ORM, and Twig.

### [docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md](docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md)
> AI Summary: This plan implements a dynamic player ability configuration matrix in the Wunderkind backend, where a new `leagueAbilityRanges` JSON column is added to the `StarterConfig` entity to store min/max ability ranges keyed by country code and league tier (e.g., `{ "EN": { "1": { "min": 75, "max": 100 } } }`). The backend uses Symfony/EasyAdmin 5 with a PHP entity and migration to persist this data, while the EasyAdmin form dynamically generates inputs based on countries and tiers present in the database. The frontend TypeScript type for `StarterConfig` in `src/types/api.ts` is updated to include the optional `leagueAbilityRanges` field, enabling the React Native app to consume and apply these server-driven ranges when generating starter players. The architectural decision to use a JSON column rather than a relational table keeps the configuration flexible and avoids schema migrations every time new countries or tiers are added.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: This plan adds an `enabledCountries` field to the `StarterConfig` entity, allowing admins to control which countries appear in the `OnboardingScreen` country picker (defaulting to England only). The architecture stores this as a JSON column in the backend database, surfaced through the existing `/api/starter-config` endpoint and early-fetched during app initialization in `useAuthFlow` so the data is available before the picker renders. On the frontend, `OnboardingScreen` filters the `CLUB_COUNTRIES` list by the enabled set and auto-selects if only one country is enabled, skipping the picker step entirely. The change spans 9 files across both the Symfony backend (entity, migration, controller, admin UI) and the React Native frontend (types, auth hook, layout, onboarding component).

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: This implementation plan documents the **World Init: AMP League Placement + Storage Hardening** feature, which has three core goals: place the AMP club into the lowest-tier league during world initialization, harden club data storage so AsyncStorage write failures surface loudly via round-trip verification, and add a backend pool-size pre-flight check (returning HTTP 412) to guard against depleted player pools before committing to initialization work.

The architectural centerpiece is expanding `setFromWorldPack` in `worldStore.ts` to take on three new responsibilities after building club data: verifying each AsyncStorage write round-trips, detecting the bottom league and persisting `ampLeagueId`, and wiring `leagueStore` and `fixtureStore` from the world data pack. On the backend side, `InitializeController.php` gains a `PlayerRepository` injection and a pool pre-flight guard that short-circuits initialization before any database commits.

The plan also flags a mandatory prerequisite: unresolved merge conflicts in `src/api/syncQueue.ts` and `src/engine/GameLoop.ts` must be resolved before any task begins, as they would block commits. The implementation touches three files total — `fixtureStore.ts` (new `generateFixturesFromWorldLeague` action), `worldStore.ts` (hardened storage + cross-store wiring), and the PHP controller — across a TypeScript/Zustand/Expo frontend and PHP 8.4/Symfony backend stack.

### [docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md](docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md)
> AI Summary: This plan addresses two related correctness issues across the backend and frontend. It fixes a data consistency bug where generated player attributes were computed from a random budget independent of `currentAbility`, causing a mismatch between the ability range used to filter players and their actual visible stats — the fix is a one-liner (`$attrBudget = $currentAbility * 6`) so that the six attributes always average to exactly `currentAbility`. It also removes a hardcoded `STARTER_ABILITY_RANGES` constant from `WorldInitializationService` and replaces it with a dynamic lookup into the admin-configured `leagueAbilityRanges` keyed by the AMP club's actual league tier, eliminating a parallel (and stale) configuration path. On the frontend, the plan adds a simple `Pressable` wrapper to NPC player rows in `club/[id].tsx` to enable tap-through navigation to the existing `player/[id].tsx` detail screen, which already handles NPC players correctly. A fourth operational task requires wiping and regenerating the player pool after the backend changes are deployed, since existing pool entries were generated with the old random budget logic.

### [docs/superpowers/plans/2026-04-19-staff-office-consolidation.md](docs/superpowers/plans/2026-04-19-staff-office-consolidation.md)
> AI Summary: This plan consolidates the app's coach and scout management into a unified **Staff** tab within the Academy Hub, replacing the separate COACHES/SCOUTS tabs with a single filterable STAFF view. It also renames the **Market** tab to **Office**, restructuring it with two sub-nav sections: **CLUB** (a new AMP club profile editor with fields like formation, colors, and stadium name) and **HIRE** (a unified staff marketplace with role-based filtering). On the backend, it fixes the EasyAdmin `StaffCrudController` (broken enum references), renames the sidebar menu entry, and extends the `/api/sync` response to include `staffRoles` from the `StaffRole` enum so the frontend can drive dynamic role filters. The key architectural decisions are adding `rawRole: string` to `MarketCoach` (populated during market data transformation) and introducing a new `clubStore` with setters for club identity fields, keeping the frontend state normalized and the backend as the source of truth for valid staff roles.

### [docs/superpowers/plans/2026-04-20-all-league-tables-browse.md](docs/superpowers/plans/2026-04-20-all-league-tables-browse.md)
> AI Summary: This plan implements live league table standings across all tiers in the Browse tab, replacing the existing `WorldClubList` with `LeagueTable` components that display computed standings with clickable club/player rows. The core architectural decision is making `ampClubId` optional throughout the standings pipeline so that NPC-only leagues (with no player club) can be simulated and displayed identically to the player's own league. Fixture generation is widened to run for every league at world-init time (not just the player's tier), enabling `SimulationService.runBatchSimulation` to process NPC leagues automatically once their fixtures exist. The changes are deliberately minimal — structural typing is used to widen `computeStandings` and `LeagueTable` to accept `WorldClub[]` directly, avoiding any adapter layer across 7 targeted files.

### [docs/superpowers/plans/2026-04-23-sponsor-contracts.md](docs/superpowers/plans/2026-04-23-sponsor-contracts.md)
> AI Summary: This plan replaces the simple `sponsorIds[]` array with a full `SponsorContract` system stored in `club.sponsorContracts[]`, making contracts the authoritative source for sponsor income, display, and lifecycle management. It introduces a new pure `sponsorEngine.ts` module to own offer-calculation logic and probability lookups, keeping game logic decoupled from stores and UI. `GameLoop.ts` is extended to handle contract expiry, renewal offer generation, and income computation from contracts each weekly tick, while `inbox.tsx` writes contract records on accept and `finances.tsx` reads them directly for display. The plan follows a test-first approach with a dedicated Jest test file for the engine module, and touches 7+ files across types, stores, engine, and UI layers.

### [docs/superpowers/plans/2026-04-24-fans-mechanic.md](docs/superpowers/plans/2026-04-24-fans-mechanic.md)
> AI Summary: Based on the content provided in your message, here's a detailed summary:

---

**`docs/superpowers/plans/2026-04-24-fans-mechanic.md`**

This plan documents the implementation of a **Fan Happiness system** — a derived-state mechanic that tracks fan sentiment in response to in-game events such as match results, player transfers, and facility upgrades. The architecture uses a dedicated **`fanStore`** (Zustand + AsyncStorage persistence) to accumulate `FanEvent` records, and a **`FanEngine`** to compute a happiness tier (`Angry → Disappointed → Neutral → Happy → Thrilled`) from those events, keeping fan state derived rather than directly mutated. The system is designed to feed back into game finances and player morale, making fan sentiment a meaningful economic variable. Implementation is structured as checkbox-tracked tasks, starting with type definitions (`src/types/fans.ts`) and the Zustand store (`src/stores/fanStore.ts`), with tests alongside each task — following the project's established store/engine/type layering pattern.

### [docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md](docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md)
> AI Summary: This plan replaces the existing random agent-offer transfer system with a **living NPC club simulation** where AI-controlled clubs build squads, trade with each other, and make direct bids on the player's academy squad. The core architecture adopts a **pure-function-first, TDD approach** — `MarketEngine` and `PlayerBrain` are built and tested in isolation before any side effects (Zustand store mutations, inbox messages) are wired in, keeping the logic deterministic and testable. Two advisory layers (`ManagerBrain.assessTransferOffer`, `PlayerBrain`) generate opinion cards to inform the human manager's decisions rather than auto-resolving transfers. The implementation involves deleting the legacy `agentOffers` system entirely and threading `transferValue`, `formation`, and `npcClubId` through the existing type/store/engine layers, with `GameLoop.ts` as the final integration point.

### [docs/superpowers/plans/2026-05-02-season-transition-service.md](docs/superpowers/plans/2026-05-02-season-transition-service.md)
> AI Summary: This plan refactors end-of-season game logic out of `SeasonEndOverlay.tsx` — a UI component — into a dedicated `SeasonTransitionService.ts` engine module in `src/engine/`, following a separation of concerns architectural decision. The service exposes individually exported pure functions (standings builder, pyramid payload builder, league snapshot builder, store mutations) composed by a single `performSeasonTransition(snapshot)` orchestrator, making each unit independently testable via Jest mocks. A new `HISTORY` tab is added to the Competition hub, backed by a `leagueHistoryStore` and rendered by a new `SeasonHistory.tsx` component. The overlay component is reduced to a thin UI shell that delegates all business logic to the service.

### [docs/superpowers/plans/2026-05-03-fan-events-trophies-promotions.md](docs/superpowers/plans/2026-05-03-fan-events-trophies-promotions.md)
> AI Summary: This plan implements permanent, undecayed fan events triggered by league wins, promotions, and relegations in the Wunderkind app's FanEvent system. The core architectural decision is adding an `isPermanent` flag to `FanEvent` alongside three new event types (`trophy_won`, `promoted`, `relegated`), with four targeted file changes: the types definition, `fanStore` pruning/cap logic, `FanEngine` score calculation (skipping decay for permanent events), and `SeasonTransitionService` (a new `awardSeasonFanEvents` method called at season end). The plan is structured as a task-by-task checklist designed for agentic execution via the `superpowers:subagent-driven-development` or `superpowers:executing-plans` skills, with a dedicated Jest test file covering all new behavior. The key design principle is that milestone events must never be pruned by the 52-week threshold or evicted by the 50-event cap, ensuring they always contribute their full impact to the fan happiness score indefinitely.

### [docs/superpowers/plans/2026-05-03-trophies-museum.md](docs/superpowers/plans/2026-05-03-trophies-museum.md)
> AI Summary: This plan documents the implementation of a **Trophies & Museum** feature for the Wunderkind app, with the goal of recording league title wins for both the player's club (AMP) and NPC clubs across seasons. The architecture embeds a `TrophyRecord` type directly into existing `Club` and `WorldClub` types (in `clubStore` and `worldStore` respectively), keeping trophy data co-located with club state rather than introducing a separate store. Trophy awarding is handled by extending `SeasonTransitionService` with `awardSeasonTrophies`, called at the end of each season transition orchestration. The Museum is exposed as a new Expo Router screen (`app/museum.tsx`) navigable from the Office tab's Stadium pane, with corresponding Jest tests for the new engine logic.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: This document specifies a **chained events system** for the game, where a fired event between two players can probabilistically trigger follow-up events for that same pair within a configurable time window, supporting multi-step chains (A→B→C). On the backend, the `GameEventTemplate` entity gains a nullable `chainedEvents` JSON column defining `nextEventSlug`, `boostMultiplier`, and `windowWeeks` per chain link, with an admin-only `note` field excluded from the API payload. The frontend receives the chain config via `/api/events/templates` and tracks active chain state in a new persisted Zustand store at `src/stores/eventChainStore.ts`, following the existing store patterns. All chain configuration is owned by the backend; the frontend is purely reactive, consuming slugs and multipliers to adjust event weights during the weekly tick.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This spec defines the design for expanding the BROWSE tab from showing only the user's current league to displaying the full national league pyramid across all tiers. The core architectural decision is that all required data already exists on-device in `worldStore` (leagues and clubs), so no backend changes or new API calls are needed. The implementation involves three changes: passing world data from `competitions.tsx` into `LeagueBrowser`, updating `LeagueBrowser` to render all tiers sorted by tier number (with backward-compat fallback), and making club rows in `LeagueTable` tappable — routing to the user's own squad screen if their club is tapped, or to a new `/club/[id]` detail screen for NPC clubs.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: This spec documents three parallel backend/frontend improvements to the Wunderkind admin panel, approved on 2026-04-18. The first adds a read-only stats panel to `/admin/player` showing global player counts grouped by nationality, position, and age range, implemented via a new `PlayerRepository::getAdminSummary()` method using three separate SQL `COUNT + GROUP BY` queries. The second cleans up pool config by removing senior-player generation settings and adding a nationality picker to the player generation flow. The third introduces an `enabledCountries` field on `StarterConfig` so the frontend country picker is driven by backend configuration rather than a hardcoded list — all three changes are scoped as independent and can be implemented in parallel.

### [docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md](docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md)
> AI Summary: This spec defines a backend feature to make player ability ranges for NPC clubs dynamically configurable per country and league tier, replacing hardcoded or coarse values. The core architectural decision is storing the ability matrix as a JSON column (`league_ability_ranges`) on the existing `StarterConfig` entity, avoiding a new table while keeping the data structured and admin-editable. On the admin side, EasyAdmin's `DashboardController` is extended to dynamically fetch all countries and league tiers from the database, render grouped min/max inputs in a Twig template, and persist the submitted matrix back to `StarterConfig` with integer casting for safety. The naming convention `leagueRanges[COUNTRY][TIER][min|max]` is used for form inputs, tying together the dynamic rendering, form processing, and storage in a single coherent flow.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: This spec addresses two blocking issues at world initialization: NPC club rosters silently losing data due to swallowed AsyncStorage failures, and the player's AMP club having no league assignment at startup (leaving `leagueStore` and `fixtureStore` empty with nothing to simulate against). The architectural solution makes `setFromWorldPack` write-verifiable — each AsyncStorage write is round-trip read-back checked and fails loudly — while also adding a backend pool-size guard (`≥ MIN_POOL_SIZE`, returning HTTP 412 if depleted) to prevent silent empty-roster generation at the source. After storage writes are confirmed, `setFromWorldPack` automatically places the AMP into the lowest-tier league (highest tier number) matching the AMP's country, then synthesizes a `LeagueSnapshot` and calls `leagueStore.setFromSync()` + `fixtureStore.generateFixturesFromWorldLeague()` so fixtures are ready with no user action required. A new persisted field `ampLeagueId` on `worldStore` tracks the placement for the lifetime of the save.

### [docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md](docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md)
> AI Summary: This spec addresses two bugs in the Wunderkind app's world initialization and NPC club viewing: (1) player ability ranges for NPC clubs (and the AMP/player's own club) don't respect the admin-configured `StarterConfig` league ability ranges, and (2) NPC player rows in the club detail screen are non-interactive, blocking navigation to the already-functional player detail template.

The root cause of the ability range bug is that `MarketPoolService::generatePlayers()` uses two completely independent random systems — `currentAbility` (used for tier filtering) and `attrBudget` (used for displayed OVR via `distributeAttributes()`) — so a player can filter into the correct tier but display a wildly incorrect overall rating. The AMP club compounds this by ignoring `leagueAbilityRanges` entirely, falling back to a hardcoded `STARTER_ABILITY_RANGES` constant.

The architectural fix involves correlating `attrBudget` to `currentAbility` (rather than using independent random ranges) in `MarketPoolService`, patching `WorldInitializationService` to use the admin-configured ranges for the AMP club, and wiring navigation from the club roster's player rows to `app/player/[id].tsx` via `useUnifiedPlayer`.

### [docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md](docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md)
> AI Summary: This design spec documents the replacement of Wunderkind's random agent-offer transfer system with a **Dynamic Market Simulation**, where NPC clubs (from `worldStore`) form a living hierarchy that builds squads, trades internally, and bids directly on AMP (player-controlled) academy players. A key architectural decision is the introduction of `ManagerBrain` and `PlayerBrain` advisory systems that generate opinion cards to inform the human player's accept/reject decisions, keeping the player in full control. The spec defines new data model fields across `WorldClub` (formation), `WorldPlayer` (npcClubId), `Player` (transferValue in pence), and `MarketPlayer` (requiresTransferFee/transferFee), with a `TIER_ORDER` convention that maps both the AMP club's string `ClubTier` and NPC clubs' numeric league tiers to a unified 0–3 scale for adjacency comparisons. The `MarketEngine` acts as the central simulation driver, exposing a `worldTierToAppTier()` helper to normalize tier representations across the system.

### [docs/superpowers/specs/2026-05-01-season-transition-service-design.md](docs/superpowers/specs/2026-05-01-season-transition-service-design.md)
> AI Summary: This spec defines the extraction of end-of-season processing logic from `SeasonEndOverlay.tsx` into a dedicated, React-free engine service (`SeasonTransitionService.ts`), following the existing pattern of services like `SimulationService.ts` and `MarketEngine.ts`. The core motivation is separation of concerns — the overlay currently mixes UI rendering (standings table, loading state) with game-engine work (building API payloads, updating stores, distributing finances), making individual steps hard to test. The architectural design breaks the orchestration into individually exported, testable functions composed by a single orchestrator, with all store access done via `.getState()`. A key constraint is that backend club-to-league assignment is treated as fully authoritative — `promoted`/`relegated` flags are display-only and have no effect on actual league membership, with `isAmp: true` as the canonical signal for locating the AMP club's league.

### [docs/superpowers/specs/2026-05-03-fan-events-trophies-promotions-design.md](docs/superpowers/specs/2026-05-03-fan-events-trophies-promotions-design.md)
> AI Summary: This spec defines a minimal extension to the existing `fanStore` / `FanEngine` / `SeasonTransitionService` stack to fire **permanent, never-decaying fan events** when the AMP club wins a trophy, earns promotion, or is relegated. The core architectural decision is a single `isPermanent?: boolean` flag on the `FanEvent` interface — permanent events are exempt from both the 52-week pruning window and the 50-event cap in `addEvent`, and never receive the weekly decay multiplier applied in `FanEngine`. A new pure function `awardSeasonFanEvents` in `SeasonTransitionService` is the sole trigger point, called at season-end to emit the three new event types (`trophy_won`, `promoted`, `relegated`) with fixed impact values (+30, +20, −15). The design deliberately avoids new stores, new UI, or changes to `calculateWeeklyFinances`, keeping the blast radius to four existing files: `src/types/fans.ts`, `src/stores/fanStore.ts`, `src/engine/FanEngine.ts`, and `src/engine/SeasonTransitionService.ts`.

### [docs/superpowers/specs/2026-05-03-trophies-museum-design.md](docs/superpowers/specs/2026-05-03-trophies-museum-design.md)
> AI Summary: This spec defines the **Trophies & Museum feature** for the Wunderkind app, establishing how league title wins are recorded for both the player's club (AMP) and NPC clubs. The core architectural decision is to embed `TrophyRecord` objects directly into the `Club` and `WorldClub` interfaces (in `src/types/club.ts` and `src/types/world.ts`), storing a full final-standings snapshot per trophy rather than just metadata. Trophy awarding is integrated into `SeasonTransitionService.performSeasonTransition` — immediately after season history is recorded — with `clubStore.addTrophy()` and `worldStore.addNpcTrophy()` as the mutation surface. A dedicated `app/museum.tsx` screen, navigable from Office > Stadium, displays the trophy list and per-trophy standings using the Zustand-persisted data.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: This documentation file serves as a consolidated project context reference for the Wunderkind Factory app, auto-generated to give AI assistants (like Claude) a structured overview of the codebase and its associated planning documents. It establishes the core architectural identity of the app: a client-authoritative, offline-first React Native game built on a Weekly Tick engine using Zustand + AsyncStorage, with Symfony backend sync via TanStack Query v5. The file also indexes key planning documents, notably a chained events system plan that spans both frontend (Zustand `eventChainStore`, `SocialGraphEngine`) and backend (EasyAdmin 5 form types, `chainedEvents` column on `GameEventTemplate`), reflecting the project's pattern of tight frontend/backend co-design. Its primary purpose is as a navigational and orientation artifact — a machine-readable summary layer above the actual source files rather than a spec or implementation guide.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: The `wunderkind-app-context-gemini.md` file is an auto-generated project context document (generated 2026-04-18) that aggregates AI summaries of key files across the codebase into a single reference. Its core purpose is to give AI assistants (like Gemini) a high-level map of the project's architecture, plans, and decisions without requiring them to read every file individually. The document captures the app's foundational design — an offline-first, client-authoritative "Weekly Tick" engine with an 8-trait Personality Matrix — alongside summaries of active implementation plans such as the chained events system (cross-stack Zustand + backend EasyAdmin approach) and the leagues/club-detail browsing feature. It serves as a living index that reflects the project's current state and architectural decisions at the time of generation.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: The `docs/wunderkind-app-context.md` file is an auto-generated project context snapshot (generated 2026-05-03) that provides a high-level overview of the Wunderkind Factory app and aggregates AI-generated summaries of key documentation files across the codebase. Its core purpose is to serve as a quick-reference index for AI assistants and developers, describing the app's foundational architecture: an offline-first, client-authoritative "Weekly Tick" game loop built with Expo, Zustand for persistent state, and TanStack Query for background API sync. It documents planned architectural expansions, including a chained NPC event system (using a dedicated `eventChainStore` and a `SocialGraphEngine`) and a league/club browsing feature. The file is essentially a living table of contents for the project's plans and context docs, not a prescriptive spec itself.

### [README.md](README.md)
> AI Summary: The Wunderkind Factory mobile app is an offline-first React Native/Expo football club management strategy game featuring a client-authoritative weekly game loop, an 8-trait Personality Matrix engine, and async sync to a Symfony backend via TanStack Query.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 141 |
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
│   ├── appearances
│   │   └── [id].tsx
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
│   ├── game-over.tsx
│   ├── museum.tsx
│   └── transfers.tsx
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
│   ├── api
│   │   └── sync-v2.md
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
│   │   ├── screens
│   │   ├── stores
│   │   ├── types
│   │   └── utils
│   ├── api
│   │   ├── endpoints
│   │   ├── mutations
│   │   ├── client.ts
│   │   └── syncQueue.ts
│   ├── components
│   │   ├── competitions
│   │   ├── radar
│   │   ├── stadium
│   │   ├── ui
│   │   ├── ArchetypeBadge.tsx
│   │   ├── AssignMissionOverlay.tsx
│   │   ├── ClubDashboard.tsx
│   │   ├── FanFavoriteCard.tsx
│   │   ├── GlobalHeader.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── ScoutReportCard.tsx
│   │   ├── SeasonEndOverlay.tsx
│   │   ├── SyncStatusIndicator.tsx
│   │   ├── WeeklyTickOverlay.tsx
│   │   └── WelcomeSplash.tsx
│   ├── constants
│   │   ├── archetypes.ts
│   │   └── theme.ts
│   ├── engine
│   │   ├── appearance.ts
│   │   ├── archetypeEngine.ts
│   │   ├── CoachPerception.ts
│   │   ├── CoachValuation.ts
│   │   ├── DevelopmentService.ts
│   │   ├── facilityEffects.ts
│   │   ├── FanEngine.ts
│   │   ├── finance.ts
│   │   ├── FormulaEngine.ts
│   │   ├── GameLoop.ts
│   │   ├── GuardianEngine.ts
│   │   ├── ManagerBrain.ts
│   │   ├── MarketEngine.ts
│   │   ├── MoraleEngine.ts
│   │   ├── personality.ts
│   │   ├── PlayerBrain.ts
│   │   ├── ReactionHandler.ts
│   │   ├── RelationshipService.ts
│   │   ├── ResultsEngine.ts
│   │   ├── retirementEngine.ts
│   │   ├── ScoutingService.ts
│   │   ├── SeasonTransitionService.ts
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
│   │   ├── attendanceStore.ts
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
│   │   ├── leagueHistoryStore.ts
│   │   ├── leagueStore.ts
│   │   ├── loanStore.ts
│   │   ├── lossConditionStore.ts
│   │   ├── managerRecordStore.ts
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
│   │   ├── attendance.ts
│   │   ├── club.ts
│   │   ├── coach.ts
│   │   ├── facility.ts
│   │   ├── fans.ts
│   │   ├── finance.ts
│   │   ├── game.ts
│   │   ├── gameConfig.ts
│   │   ├── guardian.ts
│   │   ├── interaction.ts
│   │   ├── leagueHistory.ts
│   │   ├── market.ts
│   │   ├── narrative.ts
│   │   ├── player.ts
│   │   └── world.ts
│   └── utils
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
│       ├── stadiumCapacity.ts
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

43 directories, 171 files
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
63b85c5 vast improvements across UI
f442a97 vast improvements git
bb94bed The AMP club name now always renders as plain text; only the opponent club is a tappable link.
ea321fd trophies and museum
3160dd5 trophies and museum
427c239 feat: add awardSeasonFanEvents to SeasonTransitionService
9b5b566 feat: skip decay for permanent FanEvents in FanEngine.calculateScore
8c73741 fix: preserve insertion order in addEvent, add pruneEvents comment, complete beforeEach resets
4b84b6d feat: update fanStore pruneEvents to 52 weeks and protect permanent events from cap
ce82056 fix: strengthen fanEvents test 3 with individual value assertions
9113cde feat: add isPermanent flag and trophy/promotion event types to FanEvent
3790822 docs: add spec and plan for fan events — trophies and promotions
95a17c1 fix: populate NPC trophy clubName from worldStore, fix test snapshot and mock
b48baac fix: remove marginHorizontal from VIEW MUSEUM button for visual consistency
1607651 fix: add STADIUM to FacilityTemplate category union type
```

---

## Architecture Notes

- **Layered Architecture** — clear separation between `src/api` (data fetching), `src/stores` (state management), `src/engine` (business logic), and `src/components` (presentation), each with a distinct responsibility.
- **Store-per-Domain (Feature Stores)** — Zustand stores are split by bounded context (`academyStore`, `squadStore`, `coachStore`, `scoutStore`, `marketStore`, `loanStore`, `facilityStore`, `inboxStore`, `authStore`) rather than a single global store.
- **Engine / Game Loop Pattern** — `src/engine/` isolates deterministic game logic (trait simulation, finance calculation, recruitment generation) from UI and persistence, analogous to a domain service or use-case layer.
- **Endpoint + Mutation Split (CQRS-lite)** — `src/api/endpoints/` handles read queries while `src/api/mutations/` handles write operations as TanStack Query mutation hooks, separating query from command concerns.
- **DTO / Transform Layer** — raw backend responses are transformed into app-typed models inside `src/api/endpoints/` before reaching stores or UI, acting as an anti-corruption layer between the Symfony API contract and the client domain model.

---

## Current Development Focus

- **Trophies & Museum system** — Multiple commits and dedicated spec/plan docs suggest this feature is mid-build; AI could accelerate data modeling, display logic, and edge cases (e.g. career trophy aggregation, hall-of-fame eligibility).
- **Fan Engine & Events** — Recent commits show active iteration on `FanEngine.calculateScore`, permanent event protection, pruning logic, and season transitions; AI could help formalize scoring algorithms and generate comprehensive test coverage.
- **Competition & Match UI** — `competitions.tsx`, `appearances/[id].tsx`, and `FixtureList.tsx` all recently modified; AI could assist with fixture rendering logic, club link behavior (per the AMP club name commit), and stat display patterns.
- **Sync V2 / API contract** — `sync-v2.md` and `syncQueue.ts` both active; AI could help design the queue flush strategy, conflict resolution between client-authoritative state and server responses, and offline edge cases.
- **Club & Squad detail screens** — `club/[id].tsx`, `squad.tsx`, `player/[id].tsx`, and `ClubDashboard.tsx` all touched recently; AI could assist with consistent data-fetching patterns, optimistic UI, and shared component extraction across these overlapping detail views.

---

> _AI summaries generated using **claude**._
