# wunderkind-app — Project Context

> Generated: 2026-05-02 23:11:57 | Duration: 47s | Stack: unknown | Dev: bare

---

## Overview

Wunderkind Factory is a mobile football management strategy game built with Expo and React Native, featuring a deep personality-driven engine and a pixel-art aesthetic. It utilizes a client-authoritative "Weekly Tick" game loop powered by Zustand and TanStack Query to support seamless offline-first gameplay. The architecture emphasizes offline synchronization and complex simulation logic, including dynamic player development and financial management.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: This file provides a comprehensive overview of "The Wunderkind Factory" mobile app, detailing its React Native tech stack, client-authoritative "Weekly Tick" architecture, and core gameplay systems like the 8-trait Personality Matrix.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: Using the `using-superpowers` skill to provide a structured summary of the implementation plan.

The "Chained Events Implementation Plan" details a system for sequential NPC interactions where specific events trigger temporary weight boosts for follow-up events between the same pair of players. Architecturally, the backend is updated with a `chainedEvents` JSON column in the `GameEventTemplate` entity, supported by custom Symfony form types to manage complex configuration data. On the frontend, a dedicated Zustand `eventChainStore` persists active boosts via AsyncStorage, while the `SocialGraphEngine` and `GameLoop` are modified to handle the activation, multiplier application, and tick-based expiration of these event chains.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: I will read the full content of the documentation file to provide a detailed and accurate summary.
This implementation plan outlines the creation of a comprehensive league browsing system and a dedicated club detail screen, enabling users to explore the full national league pyramid and view individual NPC club rosters. Architecturally, the system leverages existing on-device data from the `worldStore` (Zustand) and utilizes Expo Router to manage conditional navigation between the user's squad and external club views. Key structural changes include updating `LeagueBrowser` and `LeagueTable` to handle club selections, alongside the introduction of a new `WorldClubList` component and a dynamic `/club/[id]` detail screen. This design ensures seamless data flow and consistent UI styling by adhering to the project's established theme constants and custom pixel-art typography.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: The "Admin Backend Improvements Implementation Plan" outlines a series of enhancements to the project's administrative interface, focusing on improved data visualization and streamlined player pool management. Architecturally, it implements a decoupled summary panel using a custom Twig template override and a specialized `PlayerRepository` query to display player statistics within the EasyAdmin dashboard. The plan also details a schema simplification that removes five senior-player configuration fields via Doctrine migrations and introduces a functional upgrade to the player generation workflow. This upgrade threads a new nationality parameter from the admin interface through to the `MarketPoolService`, allowing for targeted player generation within the Symfony 6 and PostgreSQL-based backend.

### [docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md](docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md)
> AI Summary: I will read the specified documentation file to provide a detailed and accurate summary of its core purpose and architectural decisions.
This document outlines a plan to implement a dynamic configuration matrix within the backend `StarterConfig` to manage player ability ranges (min/max) based on country and league tier. Architecturally, it utilizes a JSON column in the database entity for flexible storage and employs EasyAdmin 5 to dynamically generate administrative form inputs based on existing database records. The plan also details updating TypeScript API definitions to ensure the frontend can consume this new data, alongside modifying the backend's player generation logic to respect these configured ranges during world initialization.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: I will use the `using-superpowers` skill to ensure I'm following the correct procedural guidance before providing the summary.

The "Country Config Implementation Plan" outlines a full-stack strategy to allow administrators to control which countries are available for selection during user onboarding by adding an `enabledCountries` field to the `StarterConfig` entity. Architecturally, the plan involves persisting this configuration as a JSON column in a Symfony backend, surfacing it through an existing API, and early-fetching the data in the React Native app's `useAuthFlow` hook to ensure it is available before the UI renders. A key architectural decision is the inclusion of a UX optimization where the `OnboardingScreen` automatically selects the country and bypasses the picker step if only a single option is enabled, defaulting to England ('EN'). This implementation ensures a synchronized flow between administrative control and client-side behavior using Symfony 7, Doctrine, and React Native with Zustand.

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: This implementation plan details the process for placing the AMP club into the lowest-tier league during world initialization while hardening frontend data storage through mandatory AsyncStorage round-trip verification. Architecturally, the `worldStore`'s `setFromWorldPack` method is expanded to handle league detection, `ampLeagueId` persistence, and the cross-store synchronization of league and fixture data. On the backend, a new pre-flight guard in the `InitializeController` is introduced to verify player pool sufficiency before committing to initialization, returning a 412 error if resources are depleted. The plan emphasizes system robustness by ensuring that storage failures surface loudly and that the core game loop is correctly wired to the initialized world data.

### [docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md](docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md)
> AI Summary: I will read the documentation file `docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md` to provide a detailed summary of its purpose and architectural decisions.
This implementation plan outlines a fix for player attribute scaling and the addition of tap-through navigation for NPC player details in the Wunderkind app. Architecturally, it replaces random attribute budgeting in the `MarketPoolService` with a deterministic formula tied to `currentAbility` ($budget = ability \times 6$), ensuring a player's average core stats accurately reflect the league ability ranges used for filtering. The plan also transitions the "AMP" starter range from hardcoded constants to dynamic lookups based on actual league tiers and updates the frontend to wrap NPC player rows in `Pressable` components that navigate to the existing unified player detail screen. Finally, it specifies an administrative requirement to regenerate the player pool so that existing data conforms to the new attribute scaling logic.

### [docs/superpowers/plans/2026-04-19-staff-office-consolidation.md](docs/superpowers/plans/2026-04-19-staff-office-consolidation.md)
> AI Summary: The "Staff & Office Consolidation" plan outlines a major structural reorganization of the application's management interfaces, merging separate coaching and scouting views into a unified "Staff" tab and rebranding the "Market" as the "Office." Architecturally, the backend is updated to expose `staffRoles` via the sync API, while the frontend introduces a `rawRole` property to `MarketCoach` objects to facilitate precise role-based filtering during the hiring process. The implementation also expands the `clubStore` and club profile capabilities to include identity fields like stadium names and playing styles, centralizing personnel management and club customization within a more intuitive "Office" hub.

### [docs/superpowers/plans/2026-04-20-all-league-tables-browse.md](docs/superpowers/plans/2026-04-20-all-league-tables-browse.md)
> AI Summary: Using `using-superpowers` to ensure compliance with workspace standards and identify any relevant procedural skills for this summary task.

This implementation plan outlines the transition from static club lists to dynamic, standings-computed league tables for every tier within the Browse tab, facilitating direct navigation to club and player profiles. Architecturally, it broadens the `computeStandings` utility and `LeagueTable` component to accept generic club data through structural typing, which eliminates the need for complex data adapters. By making fixture generation universal during world initialization, the plan ensures that the existing simulation service automatically handles non-playable leagues, while the UI is updated to replace `WorldClubList` with functional `LeagueTable` components across all tiers.

### [docs/superpowers/plans/2026-04-23-sponsor-contracts.md](docs/superpowers/plans/2026-04-23-sponsor-contracts.md)
> AI Summary: This implementation plan outlines the transition from a simple sponsor ID array to a robust, contract-based system where each partnership features negotiated weekly payments, fixed durations, and a formal renewal lifecycle. Architecturally, the design introduces a new `SponsorContract` type and a pure `sponsorEngine.ts` module to centralize calculation formulas and offer probabilities, ensuring logic is decoupled from state management. The core `GameLoop.ts` is updated to handle automated contract expiry and income processing, while the Zustand-powered `clubStore.ts` is expanded to persist these contracts and support UI updates in the inbox and finance tabs.

### [docs/superpowers/plans/2026-04-24-fans-mechanic.md](docs/superpowers/plans/2026-04-24-fans-mechanic.md)
> AI Summary: This implementation plan details the creation of a dynamic Fan Happiness system that tracks and responds to game events such as match results, player transfers, and facility upgrades. Architecturally, it employs a derived-state model using a Zustand-based `fanStore` to maintain an event history, which is then processed by a dedicated `FanEngine` to calculate happiness tiers ranging from "Angry" to "Thrilled." This design ensures that fan sentiment directly influences critical gameplay elements like club finances and squad morale, while UI components provide visual feedback on happiness trends and fan-favorite players.

### [docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md](docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md)
> AI Summary: I will read the content of `docs/superpowers/plans/2026-04-26-dynamic-market-simulation.md` to ensure I provide a comprehensive summary based on the full document.
The implementation plan for the **Dynamic Market Simulation** outlines the replacement of the randomized agent-offer system with a "living" NPC club hierarchy that simulates squad building, inter-club trading, and competitive bidding on the user's players. 

Architecturally, the plan mandates a **TDD-first approach** for new pure-function engines (`MarketEngine`, `PlayerBrain`, `ManagerBrain`), ensuring core logic is verified independently of side effects like store mutations or UI updates. It introduces a sophisticated **advisory system** where NPC-driven "opinion cards" provide contextual guidance on transfers based on player personality traits and squad depth. Finally, the system leverages the existing **tick-based game loop** to manage bi-weekly NPC transfer rounds and weekly transfer value recalculations, maintaining performance without introducing new synchronization flags.

### [docs/superpowers/plans/2026-05-02-season-transition-service.md](docs/superpowers/plans/2026-05-02-season-transition-service.md)
> AI Summary: The "Season Transition Service Implementation Plan" details the architectural refactoring of end-of-season logic from UI components into a modular, testable TypeScript service in `src/engine/`. By extracting business logic from `SeasonEndOverlay.tsx` into a dedicated service with a central `performSeasonTransition` orchestrator, the project shifts toward a more maintainable, decoupled structure where the UI serves as a thin shell. The plan also includes the implementation of a `HISTORY` tab within the Competition hub, leveraging the `leagueHistoryStore` to persist and display historical league snapshots. Success is defined by the migration of complex store mutations to this service and the achievement of high test coverage using Jest to verify the accuracy of standings calculations and pyramid transformations.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: This documentation outlines a chained event system designed to create narrative continuity by allowing initial game events between player pairs to boost the probability of specific follow-up interactions within a set time window. Architecturally, the system centralizes configuration in the backend through a JSON column in the `GameEventTemplate` entity, supporting multi-step sequences where sequential events can carry their own chain links. The implementation relies on a dedicated frontend Zustand store, `eventChainStore`, to manage active chain states and apply weight multipliers during event selection, ensuring a data-driven approach to evolving player storylines.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: I will read the design document to provide a detailed and accurate summary of its contents and architectural decisions.
This design document outlines the expansion of the "BROWSE" tab to support full national league pyramid exploration and the introduction of a dedicated "Club Detail" screen for NPC clubs. Architecturally, the plan leverages the existing `worldStore` to populate the new `WorldClubList` and enhanced `LeagueTable` components, ensuring the entire league hierarchy is navigable without additional API calls. A significant architectural decision is the implementation of a routing guard in `LeagueBrowser` that redirects users to their own squad tab while pushing NPC interactions to a new dynamic route (`app/club/[id].tsx`). This "Club Detail" screen is designed to provide a high-level summary of NPC rosters and metrics, maintaining a clear separation between the user-managed academy and the broader simulated world.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: I will read the specified documentation file to provide a detailed and accurate summary.
This documentation outlines three independent improvements to the backend admin and one frontend change designed to enhance data management and onboarding configuration. Architecturally, it introduces a global summary panel to the player admin interface using new `PlayerRepository` aggregation methods and custom EasyAdmin templates to display nationality, position, and age distributions. The plan also streamlines the player pool generation by removing senior player configurations and adding a nationality picker, while implementing a new `enabledCountries` field in `StarterConfig` to control country availability during frontend onboarding. Implementation spans both the PHP/Symfony backend (Doctrine migrations, controller overrides) and the React Native frontend (API synchronization and conditional UI rendering).

### [docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md](docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md)
> AI Summary: I will read the specified documentation file to ensure I have the full context before providing a detailed summary.

The specification outlines the implementation of a dynamic configuration matrix within the `StarterConfig` entity to provide granular control over player ability ranges across different countries and league tiers. By introducing a JSON column to persist these ranges and integrating them into the world initialization logic, the architecture moves away from hardcoded values to an administrator-managed system via EasyAdmin. This shift enables precise tuning of the global competitive landscape through a custom Twig-based interface, ensuring that NPC player generation adheres to specific min/max skill distributions defined for each tier in the world pyramid. The design also includes updates to API type definitions to maintain synchronization between the PHP backend and the TypeScript frontend.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: I will read the file `docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md` to ensure I have the full context before providing the summary.
This documentation outlines a system for hardening world initialization by ensuring the user's club (AMP) is automatically placed into the lowest-tier national league and that all initial club data is verified during storage. Architecturally, the `worldStore` is updated to persist the user's league ID and immediately trigger the generation of a synthetic league snapshot and fixtures to enable simulation from day one. To prevent silent failures, the design introduces "failure-loud" storage writes with round-trip verification and a backend pre-flight check to ensure the player pool meets minimum requirements before initialization. These changes collectively resolve issues where NPC clubs appeared with empty rosters and the game loop lacked a valid league context to run against.

### [docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md](docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md)
> AI Summary: I will use the `using-superpowers` skill to ensure I follow the correct procedure for this task, then I will read the specified documentation file to provide a detailed and accurate summary.
I will read the full documentation file to ensure I have the complete context before providing the detailed summary.
This documentation outlines a design to align player ability ranges with the `StarterConfig` and enable navigation to NPC player details. Architecturally, it resolves a data disconnect in the backend by deriving a player's attribute budget directly from their `currentAbility` ($budget = ability \times 6$), ensuring that distributed attributes accurately reflect their assigned tier. Additionally, it replaces hardcoded ability ranges for AMP clubs with a dynamic lookup system based on the admin-configured league tier and updates the mobile application's club detail screen to permit navigation to the existing player detail template for NPC athletes. Completing these changes requires a mandatory player pool regeneration to ensure all historical data conforms to the new attribute correlation logic.

### [docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md](docs/superpowers/specs/2026-04-26-dynamic-market-simulation-design.md)
> AI Summary: I will read the design specification file to ensure a comprehensive and detailed summary.

The Dynamic Market Simulation design spec replaces the legacy agent-offer system with a living ecosystem where NPC clubs manage rosters based on formation targets, trade players amongst themselves, and place competitive bids on user-controlled players. Architecturally, the system centralizes logic within a new `MarketEngine` that calculates player transfer values based on rating, age, and potential, while extending the `WorldClub` and `WorldPlayer` models to track formations and club affiliations. The design integrates `ManagerBrain` and `PlayerBrain` components to provide advisory insights that impact manager morale and player personality traits based on the user's transfer decisions. Finally, the simulation is tied into the weekly game loop to trigger bid generation and bi-weekly NPC transfer digests, ensuring world consistency by re-persisting the `worldStore` to AsyncStorage after every market mutation.

### [docs/superpowers/specs/2026-05-01-season-transition-service-design.md](docs/superpowers/specs/2026-05-01-season-transition-service-design.md)
> AI Summary: The `SeasonTransitionService.ts` is a dedicated TypeScript engine service designed to decouple end-of-season processing logic from the `SeasonEndOverlay.tsx` UI component. Architecturally, it follows the project's established engine service pattern by using individually testable functions orchestrated by a single module that interacts with stores via `.getState()` rather than React hooks. A key design decision is the strict adherence to backend authority for club-to-league assignments, where `promoted` and `relegated` flags are treated as purely descriptive status markers for UI and inbox messaging rather than structural drivers. Additionally, the spec mandates the implementation of a new `HISTORY` tab within the Competition hub to persist and display past season records.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: The Wunderkind Factory is a React Native strategy game where players manage a football academy, focusing on developing young athletes through a sophisticated 8-trait Personality Matrix engine that drives developmental and behavioral outcomes. The app utilizes a client-authoritative, offline-first architecture powered by Expo and Zustand, where a "Weekly Tick" game loop processes all trait shifts, financial changes, and incidents locally via AsyncStorage. High-level metrics like reputation and career earnings are periodically synchronized with a Symfony backend using TanStack Query v5 offline mutations to ensure cross-session consistency. Additionally, the architecture incorporates a complex chained event system managed by a `SocialGraphEngine`, which dynamically modifies event probabilities based on active NPC relationships and previous incidents.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: I will start by reading the full content of `docs/wunderkind-app-context-gemini.md` to ensure a comprehensive and detailed summary.

`docs/wunderkind-app-context-gemini.md` provides a comprehensive technical blueprint and status report for "Wunderkind Factory," an Expo-based football academy management game featuring a sophisticated 8-trait Personality Matrix. It documents a client-authoritative, offline-first architecture that leverages partitioned Zustand stores and TanStack Query to deliver a responsive, local-first "Weekly Tick" simulation. Architecturally, the project centralizes business and simulation logic into dedicated engine modules while utilizing custom React hooks and a `syncQueue` to maintain data consistency between the on-device state and the Symfony backend. The file also integrates summaries of recent design plans, such as hardening the world initialization process and implementing a narrative "chained event" system driven by a Social Graph Engine.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: The Wunderkind Factory is a React Native mobile simulation game where players manage a football academy through a weekly tick-based engine that handles scouting, player development, and financial operations. Architecturally, the app is client-authoritative and offline-first, processing all game logic on-device via a centralized GameLoop before asynchronously syncing state to a Symfony backend using TanStack Query v5. The system leverages Zustand for local state management and a custom pixel-art design system built with NativeWind to maintain its retro aesthetic.

### [README.md](README.md)
> AI Summary: This is a React Native mobile application for a football club management strategy game, featuring a client-authoritative offline-first architecture built with Expo, Zustand, and NativeWind.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 135 |
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

38 directories, 166 files
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
1bb067b fix: address code review issues in SeasonTransitionService (type safety, invariant docs, test cleanup)
8652d6e feat: add buildPyramidPayload and buildLeagueSnapshot to SeasonTransitionService
```

---

## Architecture Notes

- **Zustand/Atom-based State Management**: The extensive `src/stores` directory containing granular files (e.g., `clubStore.ts`, `financeStore.ts`, `prospectPoolStore.ts`) indicates a decentralized, reactive state architecture common in React/Expo applications.
- **Service-Oriented Engine Layer**: The `src/engine` directory uses a Service Layer pattern (e.g., `DevelopmentService.ts`, `ScoutingService.ts`, `SimulationService.ts`) to encapsulate complex game logic and "brain" mechanics away from the UI components.
- **Custom Hook Data Fetching/Synchronization**: The presence of `src/hooks` with names like `useArchetypeSync.ts` and `useProspectSync.ts` suggests a pattern of using specialized hooks to bridge the gap between API/Persistence layers and the application state.
- **Domain-Driven Type System**: The `src/types` directory mirrors the domain models (e.g., `club.ts`, `coach.ts`, `facility.ts`), suggesting a structured approach to data modeling and type safety across the simulation.
- **Component-Based UI Architecture**: A clear separation between domain-specific components (`src/components/competitions`) and generic primitives (`src/components/ui`) follows an Atomic Design or Feature-based component pattern.

---

## Current Development Focus

* **Season Transition & Lifecycle Management**: Extensive refactoring of `SeasonTransitionService` and `SeasonEndOverlay`, including logic delegation, spec compliance, and automated testing of transition boundaries.
* **Director of Football (DOF) & Staff Systems**: Active development of the Director of Football role and staff-related features, including new badge configurations for staff signings and management logic.
* **Competition History & Data Visualization**: Implementation of a persistent "History" tab in the Competition hub, featuring season-over-season record tracking, expandable standings, and prestige-based sorting.
* **Simulation Engine Intelligence**: Updates to core simulation services including `ManagerBrain`, `ScoutingService`, and `retirementEngine`, likely aimed at refining AI decision-making and squad lifecycle transitions.
* **Data Consistency & Synchronization**: Recent fixes to `syncQueue`, `syncMutations`, and store reset logic (`leagueHistoryStore`) to ensure stable state management during season transitions and API operations.

---

> _AI summaries generated using **gemini**._
