# wunderkind-app — Project Context

> Generated: 2026-05-03 13:23:27 | Duration: 75s | Stack: unknown | Dev: bare

---

## Overview

Wunderkind Factory is a football club management strategy game that features a dynamic 8-trait Personality Matrix engine for simulated player development and narrative progression. The application is built with Expo and utilizes a client-authoritative, offline-first "Weekly Tick" architecture to manage its core game loop. It leverages Zustand for persistent state management and TanStack Query for background synchronization, ensuring a seamless experience across varying network conditions.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: This file outlines the development guidelines, tech stack, and offline-first architecture for The Wunderkind Factory, a football club management strategy game built with Expo and Zustand.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: This document outlines a plan to implement a chained event system that allows specific NPC interactions to increase the probability of follow-up events within a defined time window. Architecturally, it involves expanding the backend `GameEventTemplate` with structured JSON fields for event sequencing and firing conditions, while the frontend utilizes a dedicated Zustand `eventChainStore` to track active boosts. The `SocialGraphEngine` is tasked with managing these chains during event selection, supported by a `GameLoop` mechanism that handles boost expiration each tick. The implementation spans a modern full-stack environment, utilizing PHP 8.4 and Symfony on the backend and React Native with Zustand for the frontend state management.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: I will activate the `using-superpowers` skill to ensure I follow the project's established workflows and then read the full content of the implementation plan to provide an accurate summary.

I will read the full content of the implementation plan to provide a complete and detailed summary, as the snippet provided appears to be truncated.

This implementation plan outlines the expansion of the "BROWSE" tab to display the complete national league pyramid, transitioning from a single-league view to a comprehensive browser for all competitive tiers. Architecturally, the system leverages pre-cached data within `worldStore` to enable immediate access to club rosters and league standings without additional network calls. It introduces a dynamic routing strategy via Expo Router, where tapping an NPC club navigates to a new `/club/[id]` detail screen while tapping the user's club redirects to the existing squad tab. The plan also details the creation of specialized UI components like `WorldClubList` and updates to `LeagueTable` to support these new interactive navigation flows while maintaining the app's consistent pixel-art aesthetic.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This implementation plan outlines a series of backend enhancements for the project's administrative interface, primarily focusing on improving player management and simplifying pool configuration. Architecturally, it introduces a new summary query in `PlayerRepository` that is rendered via a custom Twig template override in the EasyAdmin-based `PlayerCrudController`. The plan also details the decommissioning of senior-player pool fields through Doctrine migrations and the addition of a nationality-based filtering mechanism for player generation. These changes are designed for a Symfony 6 and PHP 8.4 environment, leveraging EasyAdmin v4 for the UI and Doctrine ORM for data persistence.

### [docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md](docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md)
> AI Summary: I will start by reading the full content of the documentation file to ensure a comprehensive summary.

This implementation plan outlines the creation of a dynamic configuration matrix within the `StarterConfig` entity to manage player ability ranges based on country and league tier. Architecturally, it utilizes a JSON column in the backend database to store these ranges, which are managed through a dynamically generated Symfony EasyAdmin interface that responds to existing league data. The plan also details updating the frontend TypeScript interfaces to support the new data structure and integrating these configurable ranges into the backend's player generation logic during world initialization. This approach ensures that player quality scales appropriately across different geographic regions and competitive levels through a centralized, admin-managed system.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: The `2026-04-18-country-config.md` implementation plan details how to add an `enabledCountries` field to the `StarterConfig` system, allowing administrators to control which countries are available for selection during the application's onboarding process. Architecturally, the change involves persisting a JSON list of country codes in the backend database using a new column on the `StarterConfig` entity and exposing this data through the existing `/api/starter-config` endpoint. On the frontend, the configuration is early-fetched within the `useAuthFlow` hook to ensure the `OnboardingScreen` can dynamically filter the country picker or automatically skip the selection step if only one country is enabled. This cross-stack update ensures that playable regions remain synchronized between administrative settings and the mobile user interface.

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: I will read the documentation file to provide a detailed summary of its core purpose and architectural decisions.
The documentation file `docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md` outlines a comprehensive implementation plan to automate the placement of the user's club into the lowest-tier league during the world initialization process. Its core purpose is to ensure that new game worlds are correctly structured, while also "hardening" data storage by implementing round-trip verification for `AsyncStorage` to surface failures early. Key architectural decisions include the introduction of a backend pre-flight guard that returns a 412 status code to prevent initialization if the player pool is depleted, and the implementation of cross-store wiring where `worldStore` populates both `leagueStore` and `fixtureStore` with synthetic snapshots. The plan also details a strategy for safe-parsing league data to maintain application stability even in the event of local storage corruption.

### [docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md](docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md)
> AI Summary: This implementation plan outlines a dual-purpose update to synchronize player attribute values with league-specific ability ranges and enhance UI navigation for NPC clubs. Architecturally, it replaces hardcoded ability ranges with dynamic tier-based lookups in the `WorldInitializationService` and ties attribute budgets directly to `currentAbility` in the `MarketPoolService` to ensure statistical consistency. Additionally, the plan specifies a frontend modification to the club detail screen, wrapping player rows in interactive components to enable seamless navigation to the existing player detail view for all characters.

### [docs/superpowers/plans/2026-04-19-staff-office-consolidation.md](docs/superpowers/plans/2026-04-19-staff-office-consolidation.md)
> AI Summary: This implementation plan details the consolidation of coaches and scouts into a unified "Staff" management system and the rebranding of the "Market" tab to "Office" to centralize administrative and recruitment workflows. Architecturally, the backend is updated to expose `staffRoles` through the sync API and unify admin controllers, while the frontend merges separate Hub tabs into a single Staff view and restructures navigation to include a club profile editor. Key technical changes involve expanding the `clubStore` with branding attributes like stadium names and colors, alongside populating a `rawRole` field in market data to facilitate role-based filtering during recruitment. This transition effectively simplifies the user interface by grouping all organizational management and personnel hiring functions under a cohesive "Office" paradigm.

### [docs/superpowers/plans/2026-04-20-all-league-tables-browse.md](docs/superpowers/plans/2026-04-20-all-league-tables-browse.md)
> AI Summary: I will read the documentation file `docs/superpowers/plans/2026-04-20-all-league-tables-browse.md` to provide a detailed summary of its purpose and architectural decisions.
This implementation plan outlines the introduction of live, computed league tables for every tier in the Browse tab, enabling users to view real-time standings and navigate to specific club or player details across the entire game world. Architecturally, the plan modifies fixture generation and simulation services to support NPC-only leagues, ensuring these competitions are automatically processed by the simulation engine once their fixtures are initialized at world-start. It also refactors the `computeStandings` utility and `LeagueTable` component to use structural typing, which eliminates the need for complex data adapters by allowing them to handle both active player and NPC club data directly. Overall, the plan transitions the UI from static club lists to dynamic, interactive standings tables that represent the full national league pyramid.

### [docs/superpowers/plans/2026-04-23-sponsor-contracts.md](docs/superpowers/plans/2026-04-23-sponsor-contracts.md)
> AI Summary: This implementation plan outlines the transition from a basic sponsor ID tracking system to a comprehensive, contract-driven architecture featuring negotiated weekly payments, fixed durations, and automated renewal logic. Architecturally, it introduces a new `SponsorContract` data type stored within the `club` state and centralizes all offer generation and probability calculations into a dedicated, pure `sponsorEngine.ts` module. The `GameLoop.ts` is designated to coordinate the lifecycle of these contracts by processing expiries, calculating income directly from active agreements, and triggering new offers based on updated game configuration settings. Implementation also involves extending the `clubStore.ts` for persistence and modifying UI components like the inbox and finance tabs to support contract management and real-time financial reporting.

### [docs/superpowers/plans/2026-04-24-fans-mechanic.md](docs/superpowers/plans/2026-04-24-fans-mechanic.md)
> AI Summary: The "Fan Happiness Implementation Plan" documents the creation of a dynamic system that tracks fan sentiment in response to game events like match results, transfers, and facility upgrades. Architecturally, it employs a derived-state model where a dedicated `fanStore` manages a history of `FanEvent`s, which the `FanEngine` then processes to determine happiness tiers ranging from "Angry" to "Thrilled." This system is designed to directly impact club finances and player morale, integrating seamlessly with the existing React Native and Zustand-based tech stack through specialized UI components and event-driven updates.

### [docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md](docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md)
> AI Summary: This documentation file outlines a comprehensive plan to replace the legacy agent-offer system with a dynamic NPC club hierarchy that actively builds squads, trades between clubs, and makes direct bids on the player's squad. Architecturally, the plan employs a **TDD-first approach**, implementing the core logic in pure-function engines—`MarketEngine`, `PlayerBrain`, and `ManagerBrain`—to ensure testability before integrating them with the game's state stores and bi-weekly simulation loop. A key design decision is the introduction of advisory "opinion cards" driven by these engines, which provide contextual advice on transfers while implementing realistic consequences like morale shifts or personality changes based on the player's decisions. The plan also details significant data model updates, including the addition of `transferValue`, club formations, and `npcClubId` to support a persistent and reactive market ecosystem.

### [docs/superpowers/plans/2026-05-02-season-transition-service.md](docs/superpowers/plans/2026-05-02-season-transition-service.md)
> AI Summary: I will read the documentation file `docs/superpowers/plans/2026-05-02-season-transition-service.md` to provide a detailed summary of its purpose and architectural decisions.
This implementation plan outlines the transition of end-of-season logic from the `SeasonEndOverlay.tsx` UI component into a dedicated, testable engine service named `SeasonTransitionService.ts`. Architecturally, it adopts a **service-orchestration pattern** where a pure TypeScript module manages the complex sequence of standings calculations, backend API synchronization, and multi-store mutations (World, League, Fixture, Inbox, and Finance stores). A key design decision is the use of a **pre-transition state snapshot** to ensure that final financial distributions and historical records are based on authoritative end-of-season data before any store updates occur. Furthermore, the plan introduces a persistent **Season History system**, including a new `HISTORY` tab in the Competition hub that reads from a dedicated `leagueHistoryStore` to display past performance.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: I will read the documentation file to provide a detailed and complete summary.
This document outlines the design for a **Chained Event System** that allows game events to boost the probability of specific follow-up events for a pair of players within a set time window. Architecturally, the system is driven by a backend JSON configuration in the `GameEventTemplate` entity, while the frontend maintains active state in a dedicated, persisted Zustand `eventChainStore`. A key architectural decision is the use of a **normalized "pair key"** (sorting player UUIDs) to ensure consistent tracking of relationships regardless of which player is the "actor." The implementation integrates directly into the `SocialGraphEngine`, where it applies multipliers to event weights during selection and automatically prunes expired chains at the start of each weekly game loop.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This design specification outlines the expansion of the "Browse" tab to display the entire national league pyramid and enable navigation to club-specific detail screens. Architecturally, it leverages existing on-device data from `worldStore` to populate the `LeagueBrowser` component, which now dynamically sorts and renders all league tiers by their hierarchy. A key implementation detail is the introduction of conditional navigation logic: tapping the user's own club redirects to the existing squad screen, while NPC clubs navigate to a new dynamic route (`/club/[id]`). This approach ensures a more immersive exploration of the game world without requiring additional backend API calls or data synchronization changes.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: This specification details three independent administrative enhancements for the Wunderkind platform: a real-time player statistics panel, streamlined pool generation with nationality selection, and a global country filtering system. Architecturally, it introduces aggregate reporting methods within the `PlayerRepository` to provide age, position, and nationality distributions directly to the `PlayerCrudController` for display. The design also centralizes regional availability by adding an `enabledCountries` field to the `StarterConfig` entity, ensuring the frontend country picker respects administrative limits on active nations. These updates aim to provide better data visibility and more granular control over the game's player ecosystem and regional configurations.

### [docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md](docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md)
> AI Summary: The documentation outlines the implementation of a dynamic configuration matrix within the `StarterConfig` entity to define granular minimum and maximum player ability ranges for every country and league tier in the system. Architecturally, this moves ability range management from hardcoded values to a JSON-backed column in the database, providing administrators with centralized control over global skill distribution via the EasyAdmin dashboard. The design utilizes a data-driven approach to dynamically render configuration inputs based on existing leagues, ensuring that NPC club initialization remains consistent and highly tunable across the entire world pyramid.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: I will read the full documentation file to ensure a comprehensive summary.
This document outlines the strategy for ensuring a reliable world simulation from day one by resolving issues where NPC clubs had empty rosters and the player's club lacked a league assignment. Architecturally, it introduces logic within `worldStore` to automatically place the player’s club into its country's lowest-tier league and trigger the generation of initial fixtures and a synthetic league snapshot. To prevent silent data loss, the design implements "storage hardening" through immediate round-trip verification of AsyncStorage writes and adds a backend pre-flight check to ensure the player pool is sufficiently populated before initialization. These changes ensure that the game world is robustly initialized with verifiable data and a functioning competitive structure for the simulation engine to process.

### [docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md](docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md)
> AI Summary: This specification addresses critical inconsistencies in player attribute generation and navigation gaps within the NPC club interface. Architecturally, it resolves the "ability range" mismatch by linking a player's attribute budget directly to their `currentAbility` in `MarketPoolService` and replacing hardcoded AMP club ranges with dynamic values from the admin `StarterConfig`. Additionally, the design mandates making NPC player rows interactive on the club detail screen to enable navigation to the player detail template, ensuring a consistent user experience powered by the existing `useUnifiedPlayer` data system.

### [docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md](docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md)
> AI Summary: I will read the design specification file to provide a comprehensive and detailed summary of the architectural decisions and system mechanics.
This document outlines the transition from random agent-driven offers to a **Dynamic Market Simulation** where NPC clubs form a persistent hierarchy, manage squads based on formation-specific targets, and trade amongst themselves. Architecturally, the design extends `WorldClub` and `WorldPlayer` models to track club affiliations and formations while introducing a `MarketEngine` to handle dynamic transfer valuations and bi-weekly NPC-to-NPC transactions. The system incorporates advisory "opinion cards" from `ManagerBrain` and `PlayerBrain` that leverage player traits like loyalty and ambition to inform the human user’s final decision on offers. Furthermore, the spec integrates "rejection fallout" mechanics and updates the scouting flow to require transfer fees for club-affiliated players, ensuring a cohesive and "living" world ecosystem.

### [docs/superpowers/specs/2026-05-01-season-transition-service-design.md](docs/superpowers/specs/2026-05-01-season-transition-service-design.md)
> AI Summary: The `SeasonTransitionService.ts` design spec outlines the architectural refactoring of end-of-season logic away from the UI layer (`SeasonEndOverlay.tsx`) into a dedicated, testable engine service. Architecturally, the service is implemented as a pure TypeScript module that uses an orchestrator pattern to manage individual functions, ensuring a strict separation of concerns where game-state updates are decoupled from React components. A critical mandate of the design is the authoritative handling of backend data, requiring the service to map club-to-league assignments strictly based on the API response regardless of status flags like promotion or relegation. Finally, the spec introduces a new `HISTORY` tab within the Competition hub to provide a persistent record of past seasons, further formalizing how historical data is stored and displayed within the application.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: This document outlines "The Wunderkind Factory," a React Native-based football academy management game driven by an 8-trait Personality Matrix engine and a client-authoritative, offline-first architecture. It details how the core "Weekly Tick" game loop processes simulation logic, trait shifts, and behavioral incidents entirely on-device using Zustand and AsyncStorage. Architectural decisions prioritize periodic synchronization with a Symfony backend via TanStack Query v5 to maintain consistency for high-level metrics like reputation and career earnings across sessions. Additionally, the file documents a chained event system managed by the `SocialGraphEngine`, which dynamically influences NPC interaction probabilities based on previous game incidents.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: This documentation describes **Wunderkind Factory**, a mobile football academy management game built with Expo and React Native that features a sophisticated 8-trait Personality Matrix for character development. Architecturally, the game utilizes a client-authoritative "Weekly Tick" engine with offline-first synchronization powered by TanStack Query and Zustand to ensure responsive, local-first gameplay. It also details a complex narrative "chained event" system that manages dynamic NPC interactions by persisting active narrative boosts in a dedicated `eventChainStore` and integrating with a backend CMS for easy event management. Together, these systems allow for intricate social simulation and narrative consequences that are processed efficiently during the game’s simulation loop.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: `docs/wunderkind-app-context.md` serves as the primary architectural blueprint for Wunderkind Factory, a React Native football management game utilizing a client-authoritative "Weekly Tick" loop to enable offline-first gameplay. The document outlines a sophisticated simulation engine powered by Zustand and TanStack Query, which manages complex systems including an 8-trait Personality Matrix and dynamic player development. A key architectural decision documented is the "Chained Events" system, which uses a dedicated `eventChainStore` and backend JSON schemas to handle sequential NPC interactions and temporary weight boosts. Overall, the file highlights the convergence of deep social graph simulation with robust data synchronization to support a pixel-art strategy experience.

### [README.md](README.md)
> AI Summary: This README describes the Wunderkind Factory mobile app, a React Native football management game featuring an offline-first "Weekly Tick" architecture powered by Expo, Zustand, and TanStack Query.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 137 |
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

38 directories, 167 files
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
bc5f1c8 new dashboard features
72c99b8 DOF role development
96b83f2 DOF role development
45c7465 fix: add staff_signing to CAT_BADGE_CONFIG and reset leagueHistoryStore in resetInMemoryStores
5aaeee1 feat: add HISTORY tab to Competition hub showing season records
ff7c922 fix: correct secondary sort in SeasonHistory (ascending tier = higher prestige first)
a90b3ca fix: use entry.isAmp for AMP detection in SeasonHistory, collision-safe recordId
ca376c7 feat: add SeasonHistory component with expandable per-season standings
4b97ff3 fix: address code quality issues in SeasonEndOverlay (retry button, guard cleanup, finally consolidation)
bfffe63 refactor: slim SeasonEndOverlay to UI shell, delegate logic to SeasonTransitionService
bef4977 fix: address code quality issues in Task 4 (type comment, relegation guard, lookup order, test cleanup)
2e5575d fix: address spec compliance issues in performSeasonTransition and recordSeasonHistory tests
67d5294 feat: complete SeasonTransitionService with full orchestrator and all exported functions
6623574 fix: address code quality issues in applySeasonResponse (throw on missing AMP, call-order test, relegated test)
ca75a72 feat: add applySeasonResponse to SeasonTransitionService
```

---

## Architecture Notes

- **Service Layer Pattern**: Core business and simulation logic are encapsulated in standalone service classes (e.g., `SimulationService`, `ScoutingService`, `DevelopmentService`) within the `src/engine` directory.
- **Store-Based State Management**: Application state is partitioned into domain-specific stores (e.g., `clubStore`, `coachStore`, `marketStore`) to manage complex reactive data and persistence.
- **Engine-Driven Architecture**: Specialized "Engines" (e.g., `GameLoop`, `ResultsEngine`, `FormulaEngine`, `FanEngine`) isolate specific simulation rules and heavy calculation cycles.
- **Centralized Type Definition Layer**: A dedicated `src/types` directory provides a single source of truth for domain models, API contracts, and entity structures used across the project.
- **Synchronization/Middleware Pattern**: A coordination layer (e.g., `syncQueue`, `useSyncStatus`, `useArchetypeSync`) handles data consistency and queuing between the client state and remote API endpoints.

---

## Current Development Focus

- Implementation of the Director of Football (DOF) role and its associated automated management logic.
- Refining the `SeasonTransitionService` to handle complex state migrations, awards distribution, and seasonal resets.
- Expansion of competition history features, including the `SeasonHistory` component and historical standings visualization.
- Strengthening the offline-first synchronization layer (`syncQueue.ts`) and data persistence strategy.
- Standardizing UI/UX patterns across the dashboard, recruitment screens, and detailed entity views for clubs and players.

---

> _AI summaries generated using **gemini**._
