# wunderkind-app — Project Context

> Generated: 2026-04-24 13:29:24 | Duration: 43s | Stack: unknown | Dev: bare

---

## Overview

Wunderkind Factory is a mobile football club management strategy game built with React Native and Expo that features a dynamic eight-trait Personality Matrix engine and a client-authoritative "Weekly Tick" game loop. The application employs an offline-first architectural approach, utilizing Zustand for state management and TanStack Query to ensure robust data synchronization and persistence.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: This file provides guidance for development on "The Wunderkind Factory," a React Native football management game, detailing its Expo tech stack, Zustand-driven state management, and offline-first "Weekly Tick" architecture.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: The documentation file `docs/superpowers/plans/2026-04-12-chained-events.md` outlines the implementation of a **chained event system** designed to create narrative momentum by increasing the likelihood of follow-up events between specific NPC pairs. Architecturally, the system introduces a `chainedEvents` JSON column to the backend `GameEventTemplate` entity and a corresponding `eventChainStore` (Zustand + AsyncStorage) on the frontend to track active multipliers per player pair. Key engine updates include modifying the `SocialGraphEngine` to activate these chains upon event firing and apply weight multipliers during event selection, while the `GameLoop` is updated to expire stale boosts each tick. Additionally, the plan mandates a shift from raw JSON editing to structured Symfony forms in the EasyAdmin backend to improve data integrity and content creation workflows.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: I will start by reading the full content of `docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md` to ensure the summary is accurate and complete.
The `2026-04-16-browse-all-leagues-club-detail.md` implementation plan outlines the development of a feature to browse the full national league pyramid and view detailed club rosters. Architecturally, it leverages existing on-device data from `worldStore` and introduces a new `WorldClubList` component for NPC leagues while modifying `LeagueTable` to support tappable rows. The plan updates `LeagueBrowser` to route club interactions—directing users to their own squad or a new `app/club/[id].tsx` screen for other clubs—and ensures seamless navigation using Expo Router. Technical implementation focuses on maintaining the "WK" visual theme with pixel-art aesthetics and efficient state management via Zustand.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This implementation plan outlines a three-pronged enhancement to the project's administrative backend, focusing on player data visualization and pool management simplification. Architecturally, it introduces a custom summary panel to the `PlayerCrudController` by injecting `PlayerRepository` methods and overriding Twig templates to display aggregate statistics. The plan also executes a database schema reduction by removing senior-player configuration fields from the `PoolConfig` entity via Doctrine migrations, while simultaneously extending the `MarketPoolService` and `DashboardController` to support parameter-driven player generation using a new nationality picker. These updates are designed to run within a PHP 8.4/Symfony 6 environment, ensuring that administrative controls for player markets are more focused and data-informed.

### [docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md](docs/superpowers/plans/2026-04-18-admin-starter-config-league-ability-ranges.md)
> AI Summary: The "Admin: Starter Config League Ability Ranges Implementation Plan" outlines a system for managing player ability ranges across different countries and league tiers via a dynamic configuration matrix. Architecturally, the backend stores this matrix in a JSON column within the `StarterConfig` entity and utilizes a dynamically generated EasyAdmin form to provide a flexible administrative interface. The plan also specifies updating the frontend `StarterConfig` TypeScript interface to include a nested `leagueAbilityRanges` record, allowing the React Native application to consume and apply these global ability constraints. This approach centralizes control over player generation parameters, enabling fine-grained balancing and regional adjustments through a unified configuration.

### [docs/superpowers/plans/2026-04-18-country-config.md](docs/superpowers/plans/2026-04-18-country-config.md)
> AI Summary: The `2026-04-18-country-config.md` implementation plan details the addition of an `enabledCountries` field to the `StarterConfig` entity, enabling administrators to control country availability during user onboarding. Architecturally, the change involves persisting a JSON list in the backend, surfacing it via a specialized API endpoint, and early-fetching the data in the React Native app's `useAuthFlow` hook. On the frontend, the `OnboardingScreen` is updated to filter available countries and automatically skip the selection step if only one country (defaulting to England) is enabled. This full-stack approach ensures synchronization between the Symfony-based admin dashboard and the mobile client's configuration state.

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: I will read the content of `docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md` to provide a detailed summary of its purpose and architectural decisions.
The document outlines a plan to initialize the game world by placing the user's club into the lowest-tier league and hardening the client-side storage of club data using round-trip verification in `AsyncStorage`. Key architectural decisions include enhancing the `setFromWorldPack` method to detect the starting league and wire the `leagueStore` and `fixtureStore` directly from the world data, while introducing a `clubsLoadError` state to surface parsing failures loudly. On the backend, a pre-flight guard is added to the initialization endpoint to ensure the player pool meets a minimum size threshold, preventing initialization failures caused by insufficient data. The plan also introduces a specialized `generateFixturesFromWorldLeague` action to handle round-robin scheduling for new leagues before standard snapshots are established.

### [docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md](docs/superpowers/plans/2026-04-19-ability-ranges-npc-player-detail.md)
> AI Summary: I will read the specified documentation file to provide a detailed summary of its purpose and architectural decisions.
This implementation plan outlines a fix for player attribute calculations and the addition of NPC player detail navigation in the Wunderkind application. The core architectural decision involves tying a player's attribute budget directly to their `currentAbility` within the `MarketPoolService` to ensure visible stats accurately reflect configured league ranges. Additionally, the plan replaces hardcoded ability ranges in the `WorldInitializationService` with dynamic lookups from the `leagueAbilityRanges` configuration based on actual league tiers. Finally, it refactors the club view's player list from static views to interactive `Pressable` components, enabling navigation to the player detail screen for NPC characters.

### [docs/superpowers/plans/2026-04-19-staff-office-consolidation.md](docs/superpowers/plans/2026-04-19-staff-office-consolidation.md)
> AI Summary: I will read the documentation file to provide a complete and accurate summary.
The **Staff & Office Consolidation** implementation plan details a comprehensive refactoring of the application's staff management and club administration systems to streamline the user experience. Its primary purpose is to consolidate coaches and scouts into a unified **Staff** interface within the Hub and rename the **Market** tab to **Office**, which now features sub-navigation for club profile editing and a filtered staff hiring market.

Key architectural decisions documented in the plan include:
*   **Unified Staff UI:** Merging previously separate coach and scout tabs into a single "Staff" view in the Hub and "Hire" pane in the Office, utilizing a new role-based filtering system.
*   **API-Driven Role Management:** The backend now exposes valid `staffRoles` (via `StaffRole` enum) through the sync API, allowing the frontend to dynamically generate hiring filters and ensure data consistency.
*   **Enhanced Club Profile Store:** Expanding the `clubStore` with frontend-only fields—such as stadium name, formation, playing style, and kit colors—enabling a "Club" editor for personalizing the user's club identity.
*   **Backend Admin Fixes:** Correcting enum references and exposing missing fields (e.g., morale, DOB) in the PHP/Symfony administrative controllers to ensure the backend roster management aligns with the new unified staff model.

### [docs/superpowers/plans/2026-04-20-all-league-tables-browse.md](docs/superpowers/plans/2026-04-20-all-league-tables-browse.md)
> AI Summary: I will read the specified documentation file to provide a detailed summary of its purpose and architectural decisions.
The **All-League Tables in Browse** implementation plan details the strategy for displaying live, computed standings for every tier in the game's national pyramid within the Browse tab. Architecturally, it makes league fixture generation "optional-AMP," allowing NPC-only leagues to be initialized and simulated automatically via the existing `SimulationService`. To simplify data handling, the `computeStandings` utility and `LeagueTable` component are widened to use structural typing for clubs, eliminating the need for complex adapters when switching between player-led and NPC-only data. Finally, the `LeagueBrowser` is refactored to replace static club lists with these dynamic tables, providing a consistent, interactive experience across the entire league hierarchy.

### [docs/superpowers/plans/2026-04-23-sponsor-contracts.md](docs/superpowers/plans/2026-04-23-sponsor-contracts.md)
> AI Summary: The "Sponsor Contracts Implementation Plan" outlines a transition from simple ID tracking to a comprehensive `SponsorContract` system that manages negotiated weekly payments, expiration dates, and renewal logic. Architecturally, the plan introduces a pure `sponsorEngine.ts` module to centralize offer calculations and probability lookups, while the `GameLoop.ts` is updated to automate contract lifecycles and financial processing during each game tick. State management is centralized in the `clubStore` via a new `sponsorContracts` array, which serves as the single source of truth for both economic simulations and the live display in the application's finance and inbox modules.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: I will read the specified documentation file to provide a detailed and accurate summary of the chained events system design.
This documentation outlines a chained event system designed to create logical sequences of game events (e.g., A→B→C) by boosting the probability of specific follow-up events between pairs of players within a configurable time window. Architecturally, the system follows a backend-driven configuration model where event templates store chain data in a JSON column, while the frontend manages active chain states via a dedicated, persisted Zustand store (`eventChainStore`) that uses normalized player pair keys. Integration is centered in the `SocialGraphEngine`, which applies temporary weight multipliers during event selection and triggers an automated expiry mechanism at the start of each weekly tick to maintain store hygiene. Additionally, the design mandates a significant Admin UI refactor, replacing raw JSON textareas with structured collection forms to simplify the management of event chains, firing conditions, and impacts.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This design specification outlines the expansion of the "Browse" tab to display the full national league pyramid by leveraging existing hierarchical data from the `worldStore`. Architecturally, the `LeagueBrowser` component is updated to sort and render all leagues by tier, incorporating a new `WorldClubList` for NPC tiers while enhancing the `LeagueTable` to support tappable rows. The implementation introduces navigation logic that differentiates between the user's academy and NPC clubs, routing the former to the squad screen and the latter to a dedicated club detail screen. This enhancement provides a comprehensive exploration tool for users to investigate all clubs within the game's world without requiring additional backend integration.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: I will read the specified documentation file to ensure I have the complete context for an accurate summary.

This design document outlines three parallel improvements to the administrative backend and frontend aimed at enhancing player oversight and configuration control. Architecturally, it introduces a global statistical summary to the player admin panel—powered by new aggregation methods in the `PlayerRepository`—while simultaneously simplifying the `PoolConfig` system by removing senior-player logic in favor of a manual nationality picker for player generation. Additionally, it implements a centralized `enabledCountries` configuration within the `StarterConfig` entity, which serves as a single source of truth to synchronize country availability between the backend and the frontend onboarding experience. This integrated approach ensures that the application's country-specific features are only exposed to users when the corresponding league and club data are explicitly enabled by an administrator.

### [docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md](docs/superpowers/specs/2026-04-18-admin-starter-config-league-ability-ranges-design.md)
> AI Summary: I will start by activating the `using-superpowers` skill to ensure I follow the correct procedure for this task.

I will use `cli_help` to clarify how to activate skills, as the `activate_skill` tool is missing from my available tools despite being mentioned in the system prompt.

This specification details the transition from hardcoded player ability ranges to a dynamic configuration matrix within the `StarterConfig` entity, enabling granular control over skill distribution across all global league tiers. Architecturally, it introduces a JSON-based schema to persist these ranges and leverages EasyAdmin to provide administrators with a dedicated management interface for defining country- and tier-specific minimum and maximum ability values. The design includes backend modifications to the PHP entity and `DashboardController`, alongside a custom Twig template to facilitate the precise tuning of world-building parameters during initialization through the admin dashboard.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: I will read the specified documentation file to ensure a complete understanding before summarizing.
This specification outlines architectural changes to ensure a reliable game start by automatically placing the user's club (AMP) into its lowest-tier domestic league and hardening world data storage against silent failures. Key decisions include persisting the assigned league ID in `worldStore` and immediately generating synthetic league snapshots and round-robin fixtures to enable gameplay simulation from day one. To guarantee data integrity, the design implements mandatory round-trip verification for all AsyncStorage writes and introduces a backend pre-flight check that prevents initialization if the player pool is insufficient. These updates bridge the world, league, and fixture stores to provide a fully populated and functional simulation environment immediately upon first launch.

### [docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md](docs/superpowers/specs/2026-04-19-ability-ranges-npc-player-detail-design.md)
> AI Summary: This documentation file outlines a design to fix discrepancies in player ability ranges during world initialization and enable tap-through navigation to NPC player details. Architecturally, it mandates correlating a player's attribute budget directly to their `currentAbility` in the `MarketPoolService` (budget = currentAbility × 6) to ensure generated attributes align with their assigned tier. It also removes hardcoded ability ranges for the "AMP" club, deriving them dynamically from the admin-configured league tiers, and updates the mobile application's `ClubDetailScreen` to support navigation to NPC players using the existing `useUnifiedPlayer` hook.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: The documentation outlines *The Wunderkind Factory*, a React Native football management game focused on developing youth talent via a unique 8-trait Personality Matrix engine. It details a client-authoritative, offline-first architecture where a "Weekly Tick" game loop executes all behavioral, financial, and development logic locally using Zustand and AsyncStorage. This architectural approach is balanced by periodic Symfony backend synchronization through TanStack Query v5 to ensure high-level metrics remain consistent across sessions. Furthermore, the file highlights a sophisticated chained event system that integrates with the `SocialGraphEngine` to drive dynamic narrative outcomes based on player and NPC interactions.

### [docs/wunderkind-app-context-gemini.md](docs/wunderkind-app-context-gemini.md)
> AI Summary: I will start by activating the `using-superpowers` skill to ensure I follow the established workflows for this project.

I will read the full content of `docs/wunderkind-app-context-gemini.md` to provide a comprehensive summary, as the provided snippet appears to be truncated.

The `docs/wunderkind-app-context-gemini.md` file serves as a comprehensive technical blueprint and generated status report for "Wunderkind Factory," a mobile football academy management strategy game built with Expo and React 19. It documents a client-authoritative, offline-first "Weekly Tick" architecture that leverages a multi-store Zustand setup for granular state management and TanStack Query for robust data synchronization with a Symfony backend. Architecturally, the system centralizes complex simulation logic into specialized engines (such as the 8-trait Personality Matrix and Social Graph Engine) while maintaining a strict separation between data contracts, business services, and the UI layer. Current development efforts highlighted in the document focus on hardening world initialization logic, implementing "chained event" narrative sequences, and refining administrative tools for player pool and league configuration.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: I will use the `using-superpowers` skill to ensure I follow the correct procedure for this task.

The `wunderkind-app-context.md` file defines the architectural foundation for The Wunderkind Factory, a React Native football academy management game that utilizes a client-authoritative, offline-first model where the full simulation loop runs entirely on-device. State management is handled through Zustand and AsyncStorage for local persistence, with TanStack Query managing asynchronous synchronization to a Symfony backend via offline mutations. A significant architectural feature is the chained event system, which uses a dedicated `eventChainStore` and `SocialGraphEngine` to dynamically adjust NPC event probabilities based on recent interactions. To ensure data integrity, the system replaces raw JSON editing in the backend with structured EasyAdmin form types for complex fields like firing conditions and impacts.

### [README.md](README.md)
> AI Summary: This React Native mobile application for Wunderkind Factory is an offline-first football club management strategy game featuring a client-authoritative "Weekly Tick" game loop and a dynamic 8-trait Personality Matrix engine.

---

## Metrics

| Category | Count |
|---|---|
| TypeScript files  | 117 |
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

38 directories, 151 files
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
5c36575 feat(reputation): cap club reputation at league reputationCap from worldpack sync
14cbc98 feat(office): block hire when role cap reached; show occupied-role popup with current hire card
88e3847 feat(office): expand KEY STAFF cards with avatar, archetype badge and influence
43dd95f feat(office): move KEY STAFF section above tactics
278e600 feat(office): add staff caps to GameConfig; show singleton role cards on CLUB tab with hire deep-link
a16d429 feat(finances): SponsorsPane reads sponsorContracts with live weeks-remaining bar
1ed615b feat(inbox): sponsor accept writes SponsorContract; enforce 10-sponsor cap
e76bdb6 feat(gameloop): contract-based sponsor income; config-driven offer probabilities and payment formula
dcde1db feat(gameloop): process sponsor contract expiry and conditional renewal offers
25f6c21 feat(store): add sponsorContracts to Club; addSponsorContract/removeSponsorContract actions
53d5582 feat(engine): add sponsorEngine with computeSponsorOffer + probability helpers
bdb3e5a feat(config): add sponsor/investor offer probability fields per reputation tier
7c5a5de feat(types): add SponsorContract; extend Club with sponsorContracts
631b01e feat(office): add Hire sub-nav with unified staff market and StaffRole filter overlay
7868cf6 feat(office): add Club sub-nav with AMP profile editor (stadium, formation, playing style, kit colours)
```

---

## Architecture Notes

- **Zustand-based State Management**: The existence of a dedicated `src/stores` directory containing numerous domain-specific stores (e.g., `clubStore.ts`, `playerStore.ts`, `financeStore.ts`) indicates a centralized state management architecture, likely using Zustand given the React Native context.
- **Service Layer Pattern**: The `src/engine` directory contains specialized service classes (e.g., `DevelopmentService.ts`, `ScoutingService.ts`, `SimulationService.ts`) that encapsulate complex business logic and domain rules, separating them from the UI and state stores.
- **Hook-based Data Synchronization**: The `src/hooks` directory features synchronization-specific hooks (e.g., `useArchetypeSync.ts`, `useNarrativeSync.ts`), suggesting a pattern where custom hooks orchestrate the flow between API endpoints and the local application state.
- **Domain-Driven Type System**: A robust `src/types` directory containing domain models (e.g., `archetype.ts`, `club.ts`, `guardian.ts`) suggests a design where the application is structured around strongly-typed domain entities used across the entire stack.
- **Centralized API Client and Endpoint Management**: The `src/api` structure, with separate directories for `endpoints` and `mutations`, points to a structured communication layer that abstracts network requests from the rest of the application.

---

## Current Development Focus

* **Sponsorship System Refinement:** Implementing the logical conclusion of the new contract system, including complex renewal negotiation logic and the fine-tuning of payment formulas within the `GameLoop`.
* **Staff Archetype & Influence Logic:** Developing the underlying simulation mechanics for the "influence" and "archetype" badges recently added to Key Staff cards to ensure they have a functional impact on club performance.
* **Worldpack Sync & Reputation Balancing:** Calibrating the interaction between synced league constraints and club progression, specifically handling edge cases where a club's reputation hits the new league caps.
* **Office UI/UX State Management:** Orchestrating the increasingly complex conditional rendering in `office.tsx`, such as the hire-blocking popups and singleton role card deep-linking, as staff management becomes more feature-rich.

---

> _AI summaries generated using **gemini**._
