# wunderkind-app — Project Context

> Generated: 2026-05-11 10:57:22 | Duration: 46s | Stack: unknown · SQLite | Dev: bare

---

## Overview

Wunderkind Factory is a football club management strategy game mobile application built with Expo and React Native that centers on a "Weekly Tick" game loop and a dynamic 8-trait Personality Matrix engine. The project employs a client-authoritative, offline-first architectural approach, utilizing SQLite for robust local data persistence and TanStack Query for seamless state synchronization. It prioritizes a high-performance simulation engine and a distinctive pixel-art aesthetic delivered via NativeWind and custom SVG assets.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: This file provides technical guidance and architectural specifications for the Wunderkind Factory project, a React Native football management game built with Expo and Zustand that utilizes an offline-first "Weekly Tick" engine.

### [docs/api/sync-v2.md](docs/api/sync-v2.md)
> AI Summary: The `docs/api/sync-v2.md` file specifies a proposed additive update to the `POST /api/sync` endpoint, which serves as the primary telemetry channel for transmitting game state from the client to the server. Architecturally, the system treats the client as the authoritative source of truth for all game logic, while the backend is responsible for recording state, reconciling data, and powering leaderboards. The v2 spec introduces new fields to the request payload—including `form`, `leaguePosition`, `seasonRecord`, and detailed `matchResults`—to provide the server with granular performance data and season-long statistics. To ensure data integrity, the proposal includes a synchronization mechanism where the backend acknowledges received fixtures, allowing the client to manage its local unsynced state effectively.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: I will read the documentation file `docs/superpowers/plans/2026-04-12-chained-events.md` to provide a detailed summary of its purpose and architectural decisions.
This implementation plan outlines the introduction of a **chained event system** designed to create narrative momentum by boosting the probability of follow-up NPC events after a specific incident fires. Architecturally, the system extends the backend `GameEventTemplate` with a `chainedEvents` JSON column and introduces a frontend `eventChainStore` (Zustand + AsyncStorage) to track active multipliers for specific player pairs. Key logic is integrated into the `SocialGraphEngine` to activate chains and apply weight multipliers during event selection, while the `GameLoop` handles the expiration of stale boosts each tick. Additionally, the plan replaces several raw JSON textareas in the EasyAdmin backend with structured, type-safe forms to improve the reliability of event configuration.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: This implementation plan outlines the development of a comprehensive league browsing feature and a dedicated club detail screen, enabling users to navigate the full national league pyramid within the "Wunderkind" app. Architecturally, the system leverages existing on-device data from the `worldStore` to render leagues sorted by tier, employing conditional routing to distinguish between the user's club (linking to the squad tab) and NPC clubs (linking to a new detail screen). The implementation involves creating a `WorldClubList` component and a dynamic `app/club/[id].tsx` route, while updating the `LeagueBrowser` and `LeagueTable` to handle interactive club taps using Expo Router and Zustand.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This implementation plan outlines enhancements to the project's administrative backend, specifically focusing on adding a player statistics summary panel, removing deprecated senior-player pool configurations, and introducing a nationality picker for player generation. Architecturally, the changes involve injecting a new `PlayerRepository` query method into the `PlayerCrudController` with a Twig template override and pruning the `PoolConfig` entity via Doctrine migrations. The plan also details threading a nationality parameter from the admin form through the `DashboardController` into the `MarketPoolService` to enable targeted player generation. The technical approach leverages PHP 8.4 and Symfony 6, utilizing EasyAdmin v4 and Lando-managed containers for implementation and deployment.

### [docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md](docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md)
> AI Summary: I will activate the `using-superpowers` skill to ensure I am following the established workflows for this session.

The "Admin: Starter Config League Ability Ranges" plan outlines the implementation of a dynamic configuration matrix to manage player ability ranges across different countries and league tiers within the `StarterConfig`. Architecturally, the system utilizes a JSON column in the backend database to store the matrix, with a dynamic EasyAdmin form that generates inputs based on active database entries. The plan also includes updating the frontend TypeScript interfaces to support the `leagueAbilityRanges` field, ensuring the React Native application can accurately consume these global ability constraints. This change provides administrators with granular control over player attribute distributions during the initial setup of new academies.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: I will read the full content of `docs/superpowers/plans/2026-04-18-country-config.md` to ensure a comprehensive summary.

The **Country Config Implementation Plan** outlines a full-stack enhancement to provide administrators with granular control over the countries available during the onboarding process by adding an `enabledCountries` field to the `StarterConfig` entity. Architecturally, the plan utilizes a JSON column in the Symfony backend that is exposed via a REST API and pre-fetched by the mobile application's `useAuthFlow` hook to ensure configuration data is available before the UI renders. A key UX decision involves filtering the country picker within the `OnboardingScreen` and automatically bypassing the selection step if only a single country is enabled, defaulting to England ('EN'). This cross-stack implementation spans database migrations, admin dashboard updates with Twig templates, and React Native component logic to achieve a dynamic, server-driven club creation experience.

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: I will read the file `docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md` to provide a detailed summary of its core purpose and architectural decisions.
This implementation plan details the strategy for refining the "world initialization" process, specifically focusing on placing the user's club (AMP) into the lowest-tier league and hardening data storage. Architecturally, it expands the `worldStore` responsibilities to include verifying `AsyncStorage` write round-trips and identifying the bottom-tier league to automatically initialize the `leagueStore` and `fixtureStore` with synthetic data. A key backend enhancement introduces a pre-flight check in the `InitializeController` that returns a 412 status code if the player pool is insufficient, preventing incomplete world generation. Additionally, the plan introduces the `generateFixturesFromWorldLeague` action to handle fixture creation during this initial phase before official snapshots are available.

### [docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md](docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md)
> AI Summary: I will read the specified documentation file to provide a detailed summary of its purpose and architectural decisions.
This implementation plan outlines a strategy to synchronize player attribute values with configured league ability ranges and enable navigation from NPC club rosters to detailed player screens. Architecturally, it decouples ability ranges from hardcoded constants in favor of dynamic lookups based on league tiers and mathematically ties player attribute budgets directly to their `currentAbility` to ensure statistical consistency. The plan also details a frontend migration from static views to interactive components in the club view, leveraging existing player detail logic to support NPC entities. Finally, it includes operational steps to purge and regenerate the player pool to ensure that the new attribute correlation logic is reflected in the active game data.

### [docs/superpowers/plans/2026-04-19-staff-office-consolidation.md](docs/superpowers/plans/2026-04-19-staff-office-consolidation.md)
> AI Summary: I will read the file `docs/superpowers/plans/2026-04-19-staff-office-consolidation.md` to ensure I have the full context before providing a detailed summary.
This implementation plan outlines the consolidation of coaches and scouts into a unified "Staff" management system and the rebranding of the "Market" tab to a comprehensive "Office" section. Architecturally, the backend is updated to expose valid staff roles via the sync API, while the frontend incorporates role-based metadata into market models and introduces several "frontend-only" club profile fields stored locally via Zustand. The plan details a significant navigation overhaul, replacing separate Hub tabs with a single filtered staff view and introducing a new "Office" sub-navigation for club customization and hiring. Additionally, it addresses technical debt in the Symfony admin panel by fixing broken enum references and exposing missing staff attributes like morale and date of birth.

### [docs/superpowers/plans/2026-04-20-all-league-tables-browse.md](docs/superpowers/plans/2026-04-20-all-league-tables-browse.md)
> AI Summary: I will read the file `docs/superpowers/plans/2026-04-20-all-league-tables-browse.md` to provide an accurate and detailed summary.
This plan details the implementation of live, standings-computed league tables for all tiers in the Browse tab, allowing users to track real-time results for every league in the game world. Architecturally, the `computeStandings` utility and `LeagueTable` component are widened to support NPC-only leagues by making the player-club ID optional and using generic club interfaces. To enable background simulation, fixture generation is expanded to cover all leagues during world initialization, ensuring the `SimulationService` can automatically process matches for non-player tiers. Finally, the UI is updated to replace static club lists with these dynamic tables, providing a consistent and interactive experience across the entire league hierarchy.

### [docs/superpowers/plans/2026-04-23-sponsor-contracts.md](docs/superpowers/plans/2026-04-23-sponsor-contracts.md)
> AI Summary: I will read the implementation plan for sponsor contracts to provide a detailed and accurate summary of its core purpose and architectural decisions.

The implementation plan details a transition from a static sponsorship list to a dynamic, contract-based system featuring negotiated weekly payments, variable durations (1–3 years), and automated expiration processing. Architecturally, it introduces a `SponsorContract` model within the `Club` state and a dedicated `sponsorEngine.ts` to centralize reputation-scaled offer calculations and probability logic. The `GameLoop.ts` is redesigned to manage the full lifecycle of these contracts—handling income distribution, expiry notifications, and renewal offers—while the UI is updated with a live sponsors tab that visualizes contract progress and remaining value. Finally, the plan ensures system stability by maintaining legacy `sponsorIds` in sync with active contracts while enforcing a new 10-sponsor cap for club management.

### [docs/superpowers/plans/2026-04-24-fans-mechanic.md](docs/superpowers/plans/2026-04-24-fans-mechanic.md)
> AI Summary: This implementation plan outlines the creation of a dynamic Fan Happiness system that reacts to in-game events such as match results, transfers, and facility upgrades. The architecture employs a derived-state model, utilizing a `fanStore` to log historical events and a `FanEngine` to compute current happiness across five distinct tiers (from Angry to Thrilled). These tiers impact critical gameplay elements like club finances and player morale, while new UI components provide visual feedback on happiness trends and identify "Fan Favorite" players. The system is built using React Native and Zustand, emphasizing a test-driven approach to state management and event processing.

### [docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md](docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md)
> AI Summary: The "Dynamic Market Simulation Implementation Plan" outlines a comprehensive transition from a random agent-offer transfer system to a sophisticated NPC-driven market where clubs actively manage rosters and trade with one another. Architecturally, the plan prioritizes reliability through a TDD-first approach using pure-function engines like `MarketEngine` and `PlayerBrain`, which decouple core market logic from side effects in the `worldStore` and `inboxStore`. A key design decision is the introduction of advisory "opinion cards" from `ManagerBrain` and `PlayerBrain` that provide strategic context—such as positional depth or financial feasibility—to guide the human player’s transfer decisions. Finally, the system integrates a bi-weekly NPC-to-NPC transfer simulation into the existing game loop, ensuring that player valuations and squad movements are consistently processed without disrupting the game's established tick synchronization.

### [docs/superpowers/plans/2026-05-02-season-transition-service.md](docs/superpowers/plans/2026-05-02-season-transition-service.md)
> AI Summary: I will read the full content of `docs/superpowers/plans/2026-05-02-season-transition-service.md` to provide a detailed and accurate summary.
This implementation plan details the refactoring of end-of-season logic by extracting it from the `SeasonEndOverlay` UI component into a dedicated, testable `SeasonTransitionService` located in `src/engine/`. Architecturally, the service is designed as a pure TypeScript module featuring a central orchestrator, `performSeasonTransition`, which coordinates the entire transition lifecycle—from generating complex pyramid payloads for the backend to applying store mutations for league snapshots, finances, and fixture schedules. Additionally, the plan introduces a `HISTORY` tab to the Competition hub, allowing players to view archived season standings through a new `SeasonHistory` component that interfaces with the `leagueHistoryStore`. By decoupling business logic from the view layer and mandating comprehensive unit tests, the design ensures a more robust and maintainable system for handling multi-league "pyramid" transitions.

### [docs/superpowers/plans/2026-05-03-fan-events-trophies-promotions.md](docs/superpowers/plans/2026-05-03-fan-events-trophies-promotions.md)
> AI Summary: This implementation plan outlines the integration of permanent, undecayed fan events into the system to reward milestone achievements like winning a trophy, earning promotion, or suffering relegation. Architecturally, it introduces an `isPermanent` flag to the `FanEvent` type, ensuring these high-impact milestones bypass the standard 52-week pruning threshold and the 50-event storage cap in `fanStore`. The `FanEngine` is updated to exclude these permanent events from the usual impact decay logic, while the `SeasonTransitionService` is expanded to trigger these rewards during the season-end transition process. This approach ensures that major historical club achievements provide a lasting, stable contribution to the overall fan happiness score without being diluted over time.

### [docs/superpowers/plans/2026-05-03-trophies-museum.md](docs/superpowers/plans/2026-05-03-trophies-museum.md)
> AI Summary: I will read the specified documentation file to provide a comprehensive and accurate summary.
This implementation plan outlines the introduction of a system to record and display league title wins for both player-controlled (AMP) and non-player (NPC) clubs. Architecturally, title history is persisted by embedding a `TrophyRecord` structure directly into the existing `clubStore` and `worldStore` Zustand states, ensuring achievements are saved alongside core club data. The core awarding logic is integrated into the `SeasonTransitionService`, which generates standings snapshots and distributes trophies at the end of each season transition lifecycle. Finally, a new "Museum" screen is implemented via Expo Router and made accessible through the Office's Stadium tab, providing a dedicated interface for users to view their club's historical performance.

### [docs/superpowers/plans/2026-05-10-sqlite-historical-storage.md](docs/superpowers/plans/2026-05-10-sqlite-historical-storage.md)
> AI Summary: This implementation plan outlines the migration of historical game data—including league statistics, match results, appearances, and fixtures—from `AsyncStorage` to a unified on-device SQLite database (`wk.db`) to eliminate the need for season pruning. Architecturally, the solution introduces a dedicated `src/db/` layer featuring a schema definition, a singleton client for direct engine-level access, and four specialized repositories to manage data persistence. While the UI will consume this data through new TanStack Query hooks, performance-critical components like the `fixtureStore` will maintain an in-memory Zustand state for simulation hot-paths while relying on SQLite for durable storage. The transition leverages `expo-sqlite` and `@tanstack/react-query` to ensure a scalable and robust foundation for long-term career tracking and performance analytics.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: I will read the specified documentation file to provide an accurate and detailed summary.
The **Chained Events System** is designed to create narrative continuity by allowing initial game events between player pairs to boost the probability of specific follow-up events within a configurable time window. Architecturally, the system relies on a backend-driven configuration where `GameEventTemplate` entities store chain metadata in a nullable JSON column, which is then synchronized to a dedicated frontend Zustand store (`eventChainStore`) to manage active boosts and their expirations. During the game loop's weekly tick, the `SocialGraphEngine` dynamically applies these multipliers to adjusted event weights for specific player pairs, enabling complex, multi-step narrative arcs (A→B→C) without mutating the underlying template data.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: I will read the full content of the design document to ensure a complete and accurate summary, as the provided text appears to be truncated.

This design document outlines the enhancement of the "Browse" feature to display the complete national league pyramid and enable navigation to individual club detail screens. Architecturally, the implementation leverages existing on-device data from the `worldStore` to populate the new views without requiring additional API calls, maintaining system efficiency and offline capabilities. The solution refactors the `LeagueBrowser` component to manage navigation logic, utilizing a centralized handler to route users to either their own squad screen or a new dynamic NPC club detail screen based on the selected team. This expansion is completed by the introduction of a `WorldClubList` component for non-active tiers and a new routing structure that provides a summarized overview of NPC rosters while preserving the user's context.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: This documentation outlines a series of backend and frontend enhancements focused on player administration and global configuration, specifically introducing a read-only summary dashboard at the top of the player admin panel. Architecturally, it mandates the addition of a `getAdminSummary` method in the `PlayerRepository` to perform grouped SQL queries for nationality, position, and age distributions, which are then injected into the `PlayerCrudController`. Furthermore, the spec details a cleanup of the player pool configuration to include a nationality picker for generation and the implementation of an `enabledCountries` field within the `StarterConfig` to filter available options in the mobile app's country picker.

### [docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md](docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md)
> AI Summary: I will read the specified documentation file to ensure I have the complete context for a detailed summary.
This document specifies the implementation of a dynamic configuration matrix within the `StarterConfig` entity to control player ability ranges (minimum and maximum ratings) across different countries and league tiers. To replace hardcoded skill distributions for NPC clubs, the architecture introduces a new JSON column in the database and a management interface within EasyAdmin that dynamically renders input forms based on existing league data. Key technical decisions include the use of a Doctrine migration for schema updates, strict integer validation during form processing, and updating the world initialization services to utilize these bounds when generating NPC players. While primarily a backend change, the specification also mandates updating frontend TypeScript definitions to ensure the new configuration structure is recognized across the application.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: This design document outlines a critical hardening of the world initialization process to ensure reliable simulation and data integrity for new game saves. Architecturally, it mandates that `setFromWorldPack` perform verifiable storage writes with round-trip checks to prevent silent data loss, while the backend is updated to validate player pool sizes before allowing initialization to proceed. A key feature is the automatic placement of the AMP club into the lowest-tier league of its country during setup, which triggers the immediate generation of synthetic league snapshots and season fixtures. These changes ensure that the simulation engine has a valid competitive structure and fully populated rosters from day one, eliminating the "empty roster" and "missing league" bugs.

### [docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md](docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md)
> AI Summary: I will read the specification file `docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md` to provide a comprehensive and accurate summary.
This documentation specifies a fix for disconnected player ability systems and navigation gaps when viewing NPC clubs. Architecturally, it mandates correlating a player's attribute budget directly to their `currentAbility` in the backend `MarketPoolService` to ensure displayed overalls match configured league ranges. It also replaces hardcoded ability ranges for the starter club with dynamic lookups based on league tiers and enables NPC player tap-through in the mobile app by wrapping roster rows in `Pressable` components that link to the existing unified player detail view.

### [docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md](docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md)
> AI Summary: I will read the full content of `docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md` to provide a detailed and accurate summary.
This design specification outlines the transition from a randomized agent-offer system to a **Dynamic Market Simulation**, where NPC clubs within the `worldStore` form a living hierarchy that builds squads, trades players, and makes direct bids on the human player's squad. Architecturally, it introduces a `MarketEngine` to handle bi-weekly NPC transfers and dynamic player valuations based on age and potential, alongside `ManagerBrain` and `PlayerBrain` modules that provide advisory opinions on offers. The system integrates these simulation mechanics into the existing game loop and scouting flow, requiring transfer fees for contracted players and introducing personality fallout if the human player rejects bids from higher-tier clubs.

### [docs/superpowers/specs/2026-05-01-season-transition-service-design.md](docs/superpowers/specs/2026-05-01-season-transition-service-design.md)
> AI Summary: Using `activate_skill` to load the `using-superpowers` skill for context, although this is a direct inquiry.

The `SeasonTransitionService` design spec outlines the refactoring of end-of-season processing logic from UI components into a dedicated, testable TypeScript engine service to improve separation of concerns and testability. Architecturally, the service acts as a single orchestrator that composes individually exported functions to handle backend responses, authoritative league assignments, and store updates without UI dependencies. Key implementation details include strict mapping rules for club-to-league assignments based on backend authority and the introduction of a new "HISTORY" tab in the Competition hub to track past records. This shift ensures game engine concerns are isolated from React components, following established patterns like `SimulationService.ts`.

### [docs/superpowers/specs/2026-05-03-fan-events-trophies-promotions-design.md](docs/superpowers/specs/2026-05-03-fan-events-trophies-promotions-design.md)
> AI Summary: I will read the design specification file to ensure I have the full context before providing a detailed summary.

This design specification defines a system for creating permanent, undecayed fan events for major club milestones like league titles, promotions, and relegations. Architecturally, it minimally extends the existing `FanEngine` stack by introducing an `isPermanent` flag to the `FanEvent` model, which exempts these specific events from the standard periodic decay and pruning logic. Implementation involves modifying `fanStore.ts` to protect these milestones from the 50-event cap and adding a new pure function to `SeasonTransitionService.ts` to trigger them at the conclusion of each season. This surgical approach leverages existing state management and calculation logic to ensure high-impact achievements provide a lasting contribution to the club's fan score without requiring new UI components or additional storage layers.

### [docs/superpowers/specs/2026-05-03-trophies-museum-design.md](docs/superpowers/specs/2026-05-03-trophies-museum-design.md)
> AI Summary: This design specification outlines the implementation of a "Trophies & Museum" system to record and display league title wins for both player-managed and NPC clubs. Architecturally, it introduces a `TrophyRecord` interface that captures comprehensive final-standings snapshots and seasonal performance metrics, which are embedded directly into the `Club` and `WorldClub` data models. The logic for awarding trophies is integrated into the `SeasonTransitionService` to ensure historical data is persisted via Zustand immediately following season completion. This design enables a dedicated Museum screen in the UI, accessible via the Office route, providing players with a visual archive of their club's achievements and detailed records of past successes.

### [docs/superpowers/specs/2026-05-10-sqlite-historical-storage-design.md](docs/superpowers/specs/2026-05-10-sqlite-historical-storage-design.md)
> AI Summary: I will read the specified documentation file to provide a detailed summary of its purpose and architectural decisions.
The design spec outlines a transition from AsyncStorage to SQLite (`wk.db`) for all historical, unboundedly-growing game data to overcome iOS storage limits and eliminate the need for aggressive data pruning. Architecturally, it establishes a three-layer system: Zustand for active in-memory state, a typed repository layer for SQLite operations, and TanStack Query hooks for UI data retrieval. Key implementation changes include moving fixture, match result, and player statistics storage to dedicated SQL tables and updating the `SimulationService` to perform batch database writes during the simulation loop. This migration ensures the indefinite preservation of player career history and match records while maintaining synchronous performance for critical game-state paths.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: The `docs/wunderkind-app-context-claude.md` file serves as a comprehensive architectural overview for "The Wunderkind Factory," a React Native football academy management game. It documents a client-authoritative, offline-first system built on a "Weekly Tick" game loop that processes complex simulations—including an 8-trait Personality Matrix and behavioral incidents—entirely on-device using Zustand and AsyncStorage. The architecture leverages TanStack Query v5 for periodic synchronization with a Symfony backend to maintain cross-session consistency for high-level metrics like reputation. Additionally, it highlights the implementation of a sophisticated social graph and chained event system, where NPC interactions trigger weighted follow-up probabilities managed by a dedicated `eventChainStore`.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: The `docs/wunderkind-app-context-gemini.md` file serves as a comprehensive architectural and technical overview of "Wunderkind Factory," a mobile football academy management game built with Expo. It highlights a client-authoritative "Weekly Tick" architecture that leverages TanStack Query and Zustand for offline-first synchronization, ensuring high responsiveness during local simulation. The document specifically details complex systems like the 8-trait Personality Matrix for character development and a dynamic "chained event" narrative engine that utilizes a `SocialGraphEngine` to manage weighted event selection based on NPC relationships. Architecturally, it documents a cross-stack approach where narrative consequences are managed via a backend CMS with structured forms and processed on the frontend through dedicated Zustand stores and the core `GameLoop`.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: The `docs/wunderkind-app-context.md` file defines the architectural blueprint for "The Wunderkind Factory," a React Native mobile game where players manage a football academy using an 8-trait Personality Matrix engine. The system is built on a client-authoritative, offline-first architecture where all core game logic—including financial deductions, trait shifts, and behavioral incidents—is executed locally via a centralized GameLoop engine. High-level metrics are asynchronously synced to a Symfony backend primarily for leaderboards and analytics, maintaining the client as the source of truth for all game state. The technical stack leverages Expo SDK 54, Zustand for state persistence, and NativeWind to deliver a specialized pixel-art visual aesthetic.

### [README.md](README.md)
> AI Summary: Wunderkind Factory is an Expo-based mobile football management game featuring a client-authoritative engine with offline-first synchronization and a pixel art aesthetic.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 170 |
| Entities/Models   | 0 |
| Controllers       | 0 |
| Services          | 0 |

---

## Technology Stack

| | |
|---|---|
| **Language**      | node |
| **Framework**     | unknown |
| **Database**      | SQLite |
| **Dev env**       | bare |

### Dependencies

**dependencies:**
- `@expo-google-fonts/press-start-2p`: ^0.4.1
- `@expo-google-fonts/vt323`: ^0.4.1
- `@react-native-async-storage/async-storage`: ^2.1.2
- `@tanstack/react-query`: ^5.67.3
- `expo`: ~54.0.34
- `expo-asset`: ~12.0.13
- `expo-constants`: ~18.0.13
- `expo-file-system`: ~19.0.22
- `expo-font`: ^14.0.11
- `expo-haptics`: ~15.0.8
- `expo-linking`: ~8.0.12
- `expo-router`: ~6.0.23
- `expo-splash-screen`: ~31.0.13
- `expo-sqlite`: ~16.0.10
- `expo-status-bar`: ~3.0.9
- `expo-updates`: ~29.0.17
- `expo-web-browser`: ~15.0.11
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
│   ├── league
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
│   │   ├── db
│   │   ├── engine
│   │   ├── screens
│   │   ├── stores
│   │   ├── types
│   │   └── utils
│   ├── api
│   │   ├── endpoints
│   │   ├── mutations
│   │   ├── client.ts
│   │   ├── queryClient.ts
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
│   │   ├── ManagerSackingOverlay.tsx
│   │   ├── MatchResultContent.tsx
│   │   ├── MatchResultOverlay.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── PerformancePane.tsx
│   │   ├── ScoutReportCard.tsx
│   │   ├── SeasonEndOverlay.tsx
│   │   ├── SyncStatusIndicator.tsx
│   │   ├── TransferWindowTicker.tsx
│   │   ├── WeeklyTickOverlay.tsx
│   │   └── WelcomeSplash.tsx
│   ├── constants
│   │   ├── archetypes.ts
│   │   └── theme.ts
│   ├── db
│   │   ├── repositories
│   │   ├── client.ts
│   │   ├── expo-sqlite-web-stub.js
│   │   ├── schema.ts
│   │   └── types.ts
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
│   │   ├── db
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
│   │   ├── calendarStore.ts
│   │   ├── clubStatsStore.ts
│   │   ├── clubStore.ts
│   │   ├── coachStore.ts
│   │   ├── debugLogStore.ts
│   │   ├── dofScoutingConfigStore.ts
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
│   │   ├── stats.ts
│   │   └── world.ts
│   └── utils
│       ├── currency.ts
│       ├── dateUtils.ts
│       ├── facilityUpkeep.ts
│       ├── fixtureArchive.ts
│       ├── fixtureGenerator.ts
│       ├── gameDate.ts
│       ├── guardianNarrative.ts
│       ├── haptics.ts
│       ├── matchdayIncome.ts
│       ├── morale.ts
│       ├── nationality.ts
│       ├── scoutingCost.ts
│       ├── scoutingRegions.ts
│       ├── seasonReviewUtils.ts
│       ├── stadiumCapacity.ts
│       ├── standingsCalculator.ts
│       ├── storage.ts
│       ├── storageDiagnostics.ts
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

48 directories, 190 files
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
9326be7 latest code base
8c2489f fix: season end overlay fetches SQLite stats for golden boot/assists; add Squad Ability donut chart to Performance pane
f372661 fix: invalidate match-result, player-career, club-top-scorer queries after simulation writes
a7fbac7 feat: delete leagueStatsStore, matchResultStore, appearanceStorage; update nuke button with SQLite.deleteDatabaseAsync
10d6777 feat: migrate player appearances and league stats UI to SQLite hooks
c8c513a feat: remove fixtureStore AsyncStorage persist; add setFixtures + applyResultsToMemory; add boot hydration
290e142 feat: GameLoop uses batchInsertAppearances; SeasonTransitionService persists fixtures to SQLite
fb59c89 feat: migrate SimulationService write path to SQLite repositories
04c66bc feat: add 8 TanStack Query hooks for SQLite repositories
fab7663 feat: add matchResultRepository with batchInsert, getByFixtureId, getSeasonResults
ed84b7c feat: add fixtureRepository with batchInsert, loadSeason, batchUpdateResults
55e0e22 feat: add statsRepository with additive upsert and top scorer queries
0ee1e02 feat: add appearanceRepository with SQLite-backed batchInsert + loadPlayerAppearances
ab35409 feat: add db types for repository layer
64def79 feat: install expo-sqlite, add schema, db client, extract queryClient singleton
```

---

## Architecture Notes

* Repository Pattern (evident from `src/db/repositories`)
* Service Layer (evident from `src/engine/` files like `DevelopmentService.ts` and `ScoutingService.ts`)
* Centralized State Management / Store Pattern (evident from `src/stores/`)
* Custom Hooks Pattern (evident from `src/hooks/`)
* Component-Based Architecture (evident from `src/components/` and `app/` directories)

---

## Current Development Focus

- **Migration to SQLite Persistence:** Completing the transition from AsyncStorage and memory-based stores to a structured SQLite schema across the remaining repositories, including implementing efficient batch operations for `GameLoop` and `SimulationService`.
- **Query Cache Invalidation Strategy:** Refining TanStack Query key management to ensure UI components like the `MatchResultOverlay` and `PerformancePane` reactively update after simulation-driven database writes.
- **Data Visualization & Analytics UI:** Building complex SQL queries and corresponding UI components for advanced statistics, such as player career tracking, club-specific leaderboards, and the newly introduced Squad Ability metrics.
- **Performance Optimization of Simulation Writes:** Auditing the `batchInsertAppearances` and fixture persistence logic to ensure the game engine maintains high frame rates and avoids blocking the UI thread during heavy database activity.
- **Automated Testing for Repositories:** Expanding the unit test suite for the new SQLite repositories and TanStack Query hooks to ensure data integrity and prevent regressions during the migration of core game services.

---

> _AI summaries generated using **gemini**._
