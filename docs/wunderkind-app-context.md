# wunderkind-app — Project Context

> Generated: 2026-05-16 16:34:12 | Duration: 168s | Stack: unknown · SQLite | Dev: bare

---

## Overview

Wunderkind Factory is a mobile football club management strategy game built with React Native and Expo. The application features a robust offline-first architecture, leveraging Zustand for state management, Expo SQLite for local data persistence, and TanStack Query for seamless synchronization with a Symfony backend. It runs a comprehensive core game loop directly on the device, featuring an 8-trait Personality Matrix engine, staff contract management, and extensive world simulation mechanics.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: CLAUDE.md defines the tech stack, architecture, and core game loop for The Wunderkind Factory, an offline-first React Native football management strategy game featuring an 8-trait Personality Matrix engine.

### [docs/api/sync-v2.md](docs/api/sync-v2.md)
> AI Summary: The `docs/api/sync-v2.md` file defines the v2 payload for the `POST /api/sync` endpoint, establishing the weekly sync as the primary telemetry channel for transmitting game state from the client to the backend. It formalizes a client-authoritative architecture where the backend records, reconciles, and powers leaderboards, analytics, and server-detected achievements while maintaining backward compatibility through purely additive changes. Key architectural additions include a robust reconciliation mechanism using client-side synchronization flags for fixture results and player stats, ensuring idempotent and reliable data capture for career history. Furthermore, the specification expands the response to include server-driven milestones, allowing the backend to trigger narrative and achievement messages within the client's inbox based on synchronized performance data.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: I will read the full content of `docs/superpowers/plans/2026-04-12-chained-events.md` to provide a detailed summary.
This documentation file outlines the implementation plan for a **chained event system**, which allows specific NPC pair events to dynamically boost the weight (probability) of follow-up events for the same pair within a configurable time window. 

Architecturally, the plan is structured as follows:
*   **Backend:** Enhances the `GameEventTemplate` entity with a `chainedEvents` JSON column and replaces generic JSON textareas in the EasyAdmin interface with **highly structured, nested forms** for managing firing conditions, impacts, and event chains.
*   **Frontend:** Implements a dedicated Zustand-based **`eventChainStore`** (persisted via AsyncStorage) to track active boosts per player pair.
*   **Engine Integration:** Modifies the **`SocialGraphEngine`** to apply multipliers during event selection and activate new chains when incidents fire, while the **`GameLoop`** is updated to expire stale boosts at the start of each weekly tick.
*   **Verification:** Employs a **test-driven approach** using PHPUnit for the Symfony backend and Jest (with `jest-expo`) for the React Native frontend to ensure state integrity and correct weight application.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: I will read the full content of `docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md` to provide a detailed summary.
This implementation plan outlines a feature to display the full national league pyramid within the BROWSE tab and provide detailed views for any individual club. Architecturally, the system leverages existing on-device data from a Zustand-based `worldStore` to populate a tiered hierarchy of leagues and their respective clubs. It introduces a routing logic where tapping an active manager's club redirects to the internal squad tab, while tapping non-player clubs navigates to a new dynamic `app/club/[id].tsx` screen for viewing player rosters. The plan includes creating specialized UI components like `WorldClubList` and enhancing the `LeagueTable` to support interactive row-level navigation.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This implementation plan outlines enhancements to the wunderkind-app administrative backend, specifically focusing on adding a player statistics summary panel to the EasyAdmin interface and introducing a nationality-specific player generation feature. Architecturally, it utilizes custom Twig template overrides and a new `PlayerRepository` summary method to inject analytical data into the CRUD view, while refactoring the `MarketPoolService` to support targeted generation parameters. The plan also documents a schema reduction via Doctrine migrations to remove obsolete senior-player pool configurations, ensuring a more streamlined backend data model within the Symfony 6 and PHP 8.4 environment.

### [docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md](docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md)
> AI Summary: I will start by reading the specified documentation file to ensure I have the complete content for an accurate summary.
This implementation plan details the creation of a dynamic configuration matrix within the `StarterConfig` entity to manage player ability ranges based on country and league tier. Architecturally, it utilizes a JSON column for flexible backend storage and leverages EasyAdmin 5 to dynamically generate administrative form inputs from active database records. The plan encompasses updating frontend TypeScript definitions for type-safe consumption and modifying backend generation services to respect these configured ranges, enabling data-driven game balancing across the entire ecosystem. This centralized approach allows for fine-tuned control over player quality without requiring direct code modifications.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: This document outlines the implementation plan for adding an `enabledCountries` property to the `StarterConfig` system, allowing administrators to control which countries are available during user onboarding. Architecturally, this involves adding a new JSON column to the backend database via Doctrine ORM and exposing it through the existing Symfony API. On the frontend, the configuration is early-fetched during application initialization using the `useAuthFlow` hook. The `OnboardingScreen` component will then use this data to filter the country picker, with a built-in optimization to auto-select the country and skip the step entirely if only one option is available.

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: I will read the content of `docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md` to provide a detailed summary.
The **"World Init: AMP League Placement + Storage Hardening"** plan focuses on automating the assignment of the user's club (AMP) to the lowest-tier league during world initialization while significantly improving the robustness of local and remote data handling. 

Key architectural decisions include:
*   **Storage Hardening:** Hardening `AsyncStorage` operations within the `worldStore` by implementing round-trip write verification and "safe-parsing" to surface failures loudly rather than allowing silent data corruption.
*   **Cross-Store Integration:** Wiring the `worldStore` to directly bootstrap the `leagueStore` and `fixtureStore` using synthetic snapshots and a new `generateFixturesFromWorldLeague` action, ensuring a cohesive initial game state.
*   **Backend Guards:** Introducing a pre-flight check in the backend's `InitializeController` that returns an HTTP 412 status if the player pool is too small, preventing initialization failures caused by depleted data environments.

### [docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md](docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md)
> AI Summary: I will read the documentation file `docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md` to understand its core purpose and architectural decisions.
This implementation plan outlines a strategy to ensure player attribute values accurately reflect their ability ratings and to enable navigation from NPC club views to player detail screens. 

Architecturally, the plan introduces three key changes: 
1. **Attribute Correlation**: It updates the `MarketPoolService` to derive the attribute budget directly from `currentAbility` ($budget = ability \times 6$), ensuring that a player's visible stats average out to their underlying ability. 
2. **Dynamic Range Configuration**: It refactors `WorldInitializationService` to replace hardcoded starter ranges with dynamic lookups from the `leagueAbilityRanges` configuration based on the club's actual league tier. 
3. **Enhanced UI Navigation**: On the frontend, it converts static player rows in `app/club/[id].tsx` into `Pressable` components, allowing users to tap through to the `player/[id].tsx` screen which already supports NPC player data.

### [docs/superpowers/plans/2026-04-19-staff-office-consolidation.md](docs/superpowers/plans/2026-04-19-staff-office-consolidation.md)
> AI Summary: I will read the full content of the specified documentation file to ensure the summary is accurate and detailed.
The **Staff & Office Consolidation Implementation Plan** outlines the unification of coach and scout management into a single "Staff" interface and the rebranding of the "Market" tab as a comprehensive "Office" section that combines club profile customization with role-filtered hiring. Architecturally, the PHP/Symfony backend is updated to expose `StaffRole` enums via the sync API, while the React Native frontend introduces role-based filtering by extending the `MarketCoach` type and adding new club-specific state (like stadium name and tactical preferences) for local persistence. Significant UI restructuring includes merging redundant Hub tabs into a single view with filter overlays and implementing a new sub-navigation in the Office screen to house both the AMP profile editor and a unified staff recruitment pool. Finally, the plan addresses backend technical debt by fixing EasyAdmin controllers and ensuring naming consistency across the administrative interface.

### [docs/superpowers/plans/2026-04-20-all-league-tables-browse.md](docs/superpowers/plans/2026-04-20-all-league-tables-browse.md)
> AI Summary: This implementation plan outlines the integration of live, standings-computed league tables for all competition tiers within the application's Browse tab. Architecturally, it decouples league fixture generation from the user's club (AMP) to enable world-wide simulation of NPC-only leagues through existing batch processing services. The plan leverages structural typing to widen data consumption in the `computeStandings` utility and `LeagueTable` component, allowing them to handle generic club data without specialized adapters. Finally, it replaces static club lists with these dynamic, interactive tables in the `LeagueBrowser` to ensure consistent data visualization across the entire game world.

### [docs/superpowers/plans/2026-04-23-sponsor-contracts.md](docs/superpowers/plans/2026-04-23-sponsor-contracts.md)
> AI Summary: The `2026-04-23-sponsor-contracts.md` document outlines a plan to replace the application's basic sponsor tracking with a robust, per-contract system featuring weekly payments, expirations, and renewal offers. Architecturally, it introduces a new `SponsorContract` type within the club's state to serve as the single source of truth for all financial calculations and UI displays. To maintain separation of concerns, a new, pure `sponsorEngine.ts` module is created to encapsulate the business logic for calculating offer amounts and probabilities. Furthermore, the core `GameLoop` is updated to orchestrate contract lifecycles and income processing, while frontend components are modified to interact directly with the new contract records via Zustand.

### [docs/superpowers/plans/2026-04-24-fans-mechanic.md](docs/superpowers/plans/2026-04-24-fans-mechanic.md)
> AI Summary: The provided documentation outlines an implementation plan for a dynamic Fan Happiness system that reacts to in-game events like match results and transfers, ultimately influencing club finances and morale. Architecturally, it relies on a derived-state approach using a Zustand-based `fanStore` to track a historical log of fan events and the current fan favorite player. A dedicated `FanEngine` will process these events to calculate the current fan happiness tier, ranging from 'Angry' to 'Thrilled'. The implementation leverages React Native with TypeScript and NativeWind, starting with foundational tasks to define necessary event types and initialize the persistent state store.

### [docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md](docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md)
> AI Summary: Using the `using-superpowers` skill to ensure alignment with workspace standards and tool usage.

This implementation plan outlines the transition from a random agent-offer system to a dynamic NPC club hierarchy capable of autonomous squad building, inter-club trading, and direct player bidding. The architecture prioritizes pure-function engines, specifically `MarketEngine` and `PlayerBrain`, which are developed using a TDD-first methodology to isolate core logic from state mutations and side effects. Key architectural decisions include extending `ManagerBrain` to offer advisory insights and utilizing the existing `startTick/endTick` block within `GameLoop` to manage state transitions during the simulation tick.

### [docs/superpowers/plans/2026-05-02-season-transition-service.md](docs/superpowers/plans/2026-05-02-season-transition-service.md)
> AI Summary: The `SeasonTransitionService` implementation plan outlines the refactoring of end-of-season logic from the UI layer into a dedicated, testable engine service located in `src/engine/`. This architectural shift employs a functional decomposition strategy where a central orchestrator, `performSeasonTransition`, coordinates specialized utility functions for tasks like standings generation and league snapshots. By decoupling business logic from `SeasonEndOverlay.tsx`, the system gains improved testability and a cleaner separation of concerns between React components and state management. Additionally, the plan introduces a new persistence layer and UI components to track and display historical season data through a `HISTORY` tab in the Competition hub.

### [docs/superpowers/plans/2026-05-03-fan-events-trophies-promotions.md](docs/superpowers/plans/2026-05-03-fan-events-trophies-promotions.md)
> AI Summary: This implementation plan details the extension of the FanEvent system to include permanent, non-decaying milestone events for major club achievements like league titles, promotions, and relegations. It introduces an `isPermanent` flag and new event types to the `FanEvent` interface, ensuring these high-impact milestones bypass the standard 52-week pruning and 50-event capacity limits within the `fanStore`. Architecturally, the `FanEngine` is modified to calculate scores without applying temporal decay to permanent events, while the `SeasonTransitionService` is updated to trigger these awards during the end-of-season transition. The plan relies on the existing TypeScript and Zustand stack and mandates comprehensive verification through a new dedicated test suite to ensure milestone events maintain their full impact indefinitely.

### [docs/superpowers/plans/2026-05-03-trophies-museum.md](docs/superpowers/plans/2026-05-03-trophies-museum.md)
> AI Summary: I will read the implementation plan for the Trophies and Museum feature to provide an accurate and detailed summary.

The **Trophies & Museum Implementation Plan** outlines a system for recording and displaying league title wins for both player-managed (AMP) and NPC clubs, integrated into the game's season transition cycle. Architecturally, it introduces a `TrophyRecord` data structure embedded directly within the `Club` and `WorldClub` Zustand stores to ensure persistent historical tracking across seasons. The implementation involves updating the `SeasonTransitionService` to award trophies based on final standings and creating a new Expo Router screen at `app/museum.tsx` for visual display. Accessible via the Office's Stadium tab, the feature utilizes Lucide icons and pixel-art styling consistent with the app's aesthetic while maintaining rigorous type safety and test coverage.

### [docs/superpowers/plans/2026-05-10-sqlite-historical-storage.md](docs/superpowers/plans/2026-05-10-sqlite-historical-storage.md)
> AI Summary: I will read the full implementation plan to ensure the summary captures all key architectural decisions and details.
This implementation plan details the migration of league statistics, match results, player appearances, and fixture records from AsyncStorage to a unified on-device SQLite database (`wk.db`) to enable permanent historical storage without seasonal pruning. The architecture establishes a dedicated `src/db/` layer featuring a schema definition, a singleton client for non-React engine access, and specialized repositories that handle all CRUD operations. A key design decision involves maintaining a hybrid storage strategy where the `fixtureStore` retains in-memory Zustand state for simulation performance while delegating durable persistence to SQLite, which is then surfaced to the UI through a suite of TanStack Query hooks. Furthermore, the plan includes the extraction of a global `QueryClient` singleton to facilitate immediate cache invalidation across the system whenever the simulation engine writes new historical data.

### [docs/superpowers/plans/2026-05-11-staff-contracts.md](docs/superpowers/plans/2026-05-11-staff-contracts.md)
> AI Summary: I will read the implementation plan to ensure the summary captures all architectural details.

The `2026-05-11-staff-contracts.md` implementation plan outlines the transition from a legacy staff wage system to a fixed-term contract model for coaches and scouts, incorporating sign-on fees, severance payouts, and automated renewal logic. Architecturally, the system centralizes financial math within `src/engine/finance.ts` and extends existing staff types with contract metadata, while integrating a dedicated expiry processing block into the `GameLoop` that mirrors the player enrollment engine. The plan also details modifications to the `marketStore` to support duration-based hiring and the addition of specific financial categories to ensure accurate budgetary tracking of staff-related transactions. This comprehensive update ensures that staff management impacts club morale and finances dynamically through automated inbox warnings and Director of Football-led contract renewals.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: I will read the documentation file `docs/superpowers/specs/2026-04-12-chained-events-design.md` to provide a detailed summary of its purpose and architectural decisions.
This documentation specifies a **Chained Event System** that allows game events to boost the probability of specific follow-up events for the same pair of players within a configurable time window, supporting complex multi-step sequences (e.g., A→B→C). 

Architecturally, the system relies on **backend-driven configuration** via a new JSON column in the `GameEventTemplate` entity, while the frontend maintains active state in a dedicated **Zustand store** using canonicalized pair keys for bidirectional consistency. The `SocialGraphEngine` integrates these boosts by applying multipliers to candidate event weights during selection without mutating original template data, and an automated cleanup process in the `GameLoop` handles weekly expiration of active chains. Additionally, the design mandates **structured admin forms** to replace raw JSON editing, ensuring data integrity when configuring complex event impacts and firing conditions.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This document details a design plan to expand the app's BROWSE tab so it displays the complete national league pyramid and makes all club rows interactable. Architecturally, it decides to exclusively use existing on-device data from the `worldStore` (specifically leagues and clubs), thereby avoiding any new backend dependencies or API calls. To achieve this, the `competitions.tsx` file will pass the global data to an updated `LeagueBrowser` component, which will sort leagues by tier and render them using both the existing `LeagueTable` and a new `WorldClubList` component. Finally, it establishes routing rules for the newly tappable rows: selecting the user's own academy will navigate to the existing squad screen, while tapping any NPC club will open a newly created club detail screen.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: I will read the specified documentation file to provide a detailed summary of its purpose and architectural decisions.
This documentation specifies three independent backend administrative improvements and one coordinated frontend change aimed at enhancing data visibility and configuration control.

The **Player Admin Summary** introduces a read-only stats panel at the top of the player management grid, utilizing new `PlayerRepository` methods to perform global aggregate queries across nationality, position, and age ranges. Architectural changes include overriding the `PlayerCrudController` index action to inject this summary data and extending the base EasyAdmin Twig template to display the three statistical categories.

The **Pool Configuration** update simplifies the system by removing legacy senior-player fields from the `PoolConfig` entity and adding a nationality picker to the manual generation tool. This allows administrators to generate specific batches of players from a single nation, achieved by passing an optional `nationality` parameter from the dashboard controller through to the `MarketPoolService` generation logic.

Lastly, a **Country Configuration** system is implemented via a new JSON field in the `StarterConfig` entity, allowing admins to toggle which countries are available for new clubs. The frontend `useAuthFlow` hook is updated to fetch this configuration during initialization, enabling the `OnboardingScreen` to dynamically filter the country picker and optionally skip the selection step if only one country is enabled.

### [docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md](docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md)
> AI Summary: This specification outlines the transition of player ability ranges from hardcoded values to a dynamic, JSON-based configuration matrix within the `StarterConfig` entity. Architecturally, it introduces a new JSON column to persist minimum and maximum skill ranges for every country and league tier, enabling granular control over the global skill distribution during world pyramid initialization. The design leverages EasyAdmin to dynamically generate management interfaces based on active database records, allowing administrators to tune league-specific quality levels through a unified dashboard. By centralizing these parameters in the database, the system gains the flexibility to adjust global game balance without requiring code modifications or redeployments.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: This design document outlines a critical hardening of the world initialization process to prevent silent data loss and ensure the Agency Managed Player (AMP) club is immediately playable. Architecturally, it mandates verifiable AsyncStorage writes through round-trip checks and adds backend pool-size validation to guarantee that NPC club rosters are fully populated during setup. The most significant change is the automation of league placement: the system now identifies and assigns the AMP club to the lowest-tier league in its country during the `setFromWorldPack` flow, simultaneously generating necessary fixtures and league snapshots. These changes ensure the simulation engine has a valid competitive context from day one, moving league assignment from a manual user step to a core automated requirement of the initialization sequence.

### [docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md](docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md)
> AI Summary: This specification document details fixes for discrepancies in player ability generation and UI navigation limitations within the NPC club detail view. Its primary purpose is to ensure that player attributes accurately reflect admin-configured `StarterConfig` ranges and to implement missing navigation, making NPC player roster rows tappable. Architecturally, the core decision is to modify the `MarketPoolService` so that a player's attribute budget (`attrBudget`) is directly derived from their `currentAbility`, resolving a design flaw where the two values were generated independently and resulted in mismatched overall ratings. Additionally, the plan dictates updating the `WorldInitializationService` to utilize these proper admin configurations instead of relying on hardcoded ability ranges for the AMP club.

### [docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md](docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md)
> AI Summary: The Dynamic Market Simulation design specification outlines a transition from a random agent-offer system to a comprehensive ecosystem where NPC clubs form a living hierarchy that actively manages squads, trades players, and makes direct bids on the human player's roster. Architecturally, the system introduces a `MarketEngine` to manage transfer logic and calculate player valuations based on formation-driven squad targets, supported by schema updates that track NPC club formations and player affiliations. Strategic depth is added via `ManagerBrain` and `PlayerBrain` advisory components, which provide contextual reasoning for transfer offers and trigger personality or morale consequences if the player's decisions conflict with their recommendations. The simulation is deeply integrated into the `GameLoop` and scouting flows, processing market movements bi-weekly and requiring formal transfer fees for players already affiliated with NPC clubs.

### [docs/superpowers/specs/2026-05-01-season-transition-service-design.md](docs/superpowers/specs/2026-05-01-season-transition-service-design.md)
> AI Summary: The design specification outlines the extraction of end-of-season processing logic from the `SeasonEndOverlay.tsx` UI component into a dedicated, independently testable engine service named `SeasonTransitionService.ts`. A key architectural decision is that this new service will operate as a plain TypeScript module devoid of React imports, accessing state exclusively through store `.getState()` methods to clearly separate UI from game-engine concerns. The document also enforces strict adherence to a defined backend response contract, mandating that the backend is the absolute authority on club-to-league assignments while treating promotion and relegation indicators as purely informational status flags. Additionally, the spec dictates the creation of a new `HISTORY` tab in the Competition hub to display past season records.

### [docs/superpowers/specs/2026-05-03-fan-events-trophies-promotions-design.md](docs/superpowers/specs/2026-05-03-fan-events-trophies-promotions-design.md)
> AI Summary: This design specification outlines the implementation of permanent fan events to commemorate major milestones such as league titles, promotions, and relegations, ensuring these achievements provide a non-decaying impact on a club's fan score. Architecturally, it introduces an `isPermanent` flag to the `FanEvent` model and extends the `FanEventType` union, allowing these specific events to bypass standard pruning and decay logic in the `fanStore`. The plan includes increasing the event pruning threshold to 52 weeks and refining the event-capping logic to prioritize permanent records while maintaining a buffer for recent transient events. Integration is handled via a new `awardSeasonFanEvents` function within the `SeasonTransitionService`, which triggers these milestone rewards during the season-end transition process.

### [docs/superpowers/specs/2026-05-03-trophies-museum-design.md](docs/superpowers/specs/2026-05-03-trophies-museum-design.md)
> AI Summary: This design specification outlines the implementation of a **Trophies & Museum** system to track and display league title wins for both the player's club and NPC clubs. Architecturally, it embeds a `TrophyRecord` interface—containing comprehensive season snapshots and final standings—directly into the `Club` and `WorldClub` data models, ensuring data persistence via Zustand and AsyncStorage. The awarding logic is integrated into the `SeasonTransitionService`, while the frontend features a dedicated `Museum` route in Expo Router that leverages Lucide icons for a polished visual history of achievements.

### [docs/superpowers/specs/2026-05-10-sqlite-historical-storage-design.md](docs/superpowers/specs/2026-05-10-sqlite-historical-storage-design.md)
> AI Summary: The specification outlines a migration of historical, unboundedly-growing game data from AsyncStorage to a local SQLite database (`wk.db`) to overcome storage capacity limits and preserve long-term career records without pruning. It defines a three-layer architecture where active game state remains in low-latency Zustand stores, while historical records are persisted in SQLite and managed through typed repositories. A key architectural decision ensures that the simulation "hot path" remains synchronous by hydrating fixtures into memory at boot, while the UI layer transitions to reading historical data through TanStack Query. This design allows the game's data footprint to scale indefinitely while maintaining the performance and structural integrity of the core simulation loop.

### [docs/superpowers/specs/2026-05-11-staff-contracts-design.md](docs/superpowers/specs/2026-05-11-staff-contracts-design.md)
> AI Summary: I will read the `docs/superpowers/specs/2026-05-11-staff-contracts-design.md` file to ensure I have the complete context for the summary.
This document outlines the transition of staff management from a legacy flat-rate wage system to a robust, fixed-term contract architecture that mirrors the existing player enrollment system. Key architectural decisions include updating the `Coach` data model to track contract duration and modifying `GameConfig` to define global scaling for strategic sign-on fees and severance payouts. The implementation integrates an expiry engine into the `GameLoop` to manage morale decay and automated Director of Football (DOF) renewals, while refactoring the finance engine to utilize explicit per-staff salary fields instead of flat counts. Additionally, the design mandates UI enhancements to support multi-year hiring selections and provide financial transparency for recruitment and release costs.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: I will read the file `docs/wunderkind-app-context-claude.md` to provide a detailed summary of its purpose and architectural decisions.
The `docs/wunderkind-app-context-claude.md` file serves as a comprehensive project orientation for AI assistants, detailing "The Wunderkind Factory" as an offline-first React Native mobile game managed by a client-authoritative "Weekly Tick" engine. Architecturally, it documents a "vertical slice" state management strategy using domain-specific Zustand stores and a decoupled service layer (`src/engine/`) that encapsulates core game logic like personality shifts and financial processing. The document also highlights a CQRS-lite infrastructure that separates read-only API endpoints from write-heavy mutations, while tracking critical development milestones such as storage hardening and the implementation of a narrative "chained event" system.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: This documentation file provides a comprehensive technical overview of Wunderkind Factory, a mobile football academy management game built with Expo that centers on a sophisticated 8-trait Personality Matrix engine. The application utilizes a client-authoritative "Weekly Tick" architecture designed for offline-first responsiveness, leveraging TanStack Query and Zustand for data synchronization and local state management. Architecturally, it details a "chained event" system that enables dynamic narrative sequences by managing event weight multipliers within a SocialGraphEngine and persisting active boosts in a dedicated store. Ultimately, the document serves as a centralized context hub, linking to core standards and implementation plans for complex features like league browsing and NPC interaction logic.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: I will read the full content of `docs/wunderkind-app-context.md` to provide an accurate and detailed summary of its purpose and architectural context.

This documentation file serves as a comprehensive central hub for the **wunderkind-app**, providing an auto-generated overview of the project's technical stack, architectural structure, and development history. It establishes the foundation for a high-performance mobile application built on **Expo (React Native)** and **TypeScript**, utilizing **SQLite** for local data persistence and **Zustand** for granular state management across dozens of specialized stores. 

The architecture is characterized by a service-oriented engine layer (e.g., `SimulationService`, `GameLoop`) and complex simulation logic driven by distinct "brains" for NPCs, alongside recent transitions toward robust historical data storage and advanced staff contract mechanics. Additionally, the document maps out a detailed feature roadmap through integrated references to specific design specs and implementation plans, ranging from dynamic market simulations to season transition services.

### [README.md](README.md)
> AI Summary: Wunderkind Factory is an offline-first football club management strategy game built with React Native and Expo that features a complex personality engine, world simulation, and synchronization with a Symfony backend.

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
| **Database**      | SQLite |
| **Dev env**       | bare |

### Dependencies

**dependencies:**
- `@dicebear/collection`: ^9.4.2
- `@dicebear/core`: ^9.4.2
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
│   ├── 20807.jpg
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
│   │   ├── InitializationScreen.tsx
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
│   │   ├── useInitFlow.ts
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

48 directories, 193 files
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
928949e dashboard improvements
ef251b2 update avatar colours
3ae7cd3 avatar tweaks
e013747 improve initialization process
8211f9c staff contracts and refinement to stats
2eaa95e fix: pass default durationWeeks to hireCoach/hireScout in facilities.tsx
410b7c0 fix: add idempotency guards to staff contract warning messages in GameLoop
7a5961b feat: scouts UI — hire modal with duration selector, weeks-remaining badge, RENEW flow, severance on release
b7d97b8 feat: coaches UI — duration selector, weeks remaining, RENEW flow, severance on release
193a771 feat: GameLoop staff contract expiry (12/4/0wk warnings, morale decay) + DOF staff auto-renew
e038094 feat: hireCoach/hireScout accept durationWeeks; starter staff get 2-year default contracts
55322ce feat: calculateStaffSignOnFee/Severance; remove legacy staffCount wage; scout salary in weekly finances
8300434 feat: add staff contract types — contractEndWeek, sign-on/severance categories, config fields
9326be7 latest code base
8c2489f fix: season end overlay fetches SQLite stats for golden boot/assists; add Squad Ability donut chart to Performance pane
```

---

## Architecture Notes

- Repository Pattern (evident in `src/db/repositories`)
- Service Layer (evident in `src/engine` with classes like `DevelopmentService` and `ScoutingService`)
- Centralized State Management / Store Pattern (evident in `src/stores`)
- Engine-based Architecture (evident in `src/engine` containing specialized simulation logic like `GameLoop`, `FormulaEngine`, and `SimulationService`)
- Custom Hooks Pattern (evident in `src/hooks` for extracting React-specific logic)

---

## Current Development Focus

* Staff Contract Management & Game Loop Logic: Refining the hiring, renewal, and severance workflows for coaches and scouts, including the automated warning systems and morale decay triggers within the `GameLoop`.
* Dashboard & Performance Visualization: Enhancing the `ClubDashboard` and `PerformancePane` with more sophisticated data summaries and visual feedback, following recent updates to the avatar system and general dashboard UI.
* App Initialization & State Hydration: Optimizing the startup flow and synchronization between the local database and API, particularly around the `InitializationScreen` and the sync-v2 architecture.
* Simulation Engine Balancing: Tuning the interactions between staff attributes, facility effects, and club metrics to ensure the "morale decay" and "staff auto-renew" mechanics are balanced and impactful.
* Financial Systems & Reporting: Expanding the `finances.tsx` and `office.tsx` views to provide more granular insights into contract costs, staff-related expenses, and long-term club sustainability.

---

> _AI summaries generated using **gemini**._
