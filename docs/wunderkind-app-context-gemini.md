# wunderkind-app — Project Context

> Generated: 2026-04-18 10:32:30 | Duration: 57s | Stack: unknown | Dev: bare

---

## Overview

Wunderkind Factory is a mobile football academy management strategy game built with Expo, featuring a sophisticated 8-trait Personality Matrix engine for character development. It utilizes a client-authoritative "Weekly Tick" architecture with offline-first synchronization powered by TanStack Query and Zustand to ensure a responsive, local-first gameplay experience.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: `CLAUDE.md` provides an overview of The Wunderkind Factory, a React Native football academy management game built with Expo and Zustand that features an offline-first "Weekly Tick" engine and an 8-trait Personality Matrix.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: I will read the full content of `docs/superpowers/plans/2026-04-12-chained-events.md` to ensure a comprehensive summary.
This implementation plan outlines a "chained event" system designed to create dynamic narrative sequences by increasing the selection probability of follow-up events between specific NPC pairs for a configurable duration. Architecturally, the backend is enhanced with a new `chainedEvents` column in the `GameEventTemplate` entity and structured EasyAdmin forms that replace raw JSON textareas for managing complex firing conditions and impacts. On the frontend, a dedicated Zustand `eventChainStore` persists active boosts, while the `SocialGraphEngine` handles weight multiplier application during event selection and the `GameLoop` manages the automatic expiration of stale boosts. This cross-stack approach ensures narrative consequences are both manageable via the CMS and efficiently processed during gameplay simulation.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: The `2026-04-16-browse-all-leagues-club-detail.md` implementation plan outlines the expansion of the "Browse" tab to display the full national league pyramid, utilizing existing on-device data from the `worldStore`. Architecturally, it updates the `LeagueBrowser` component to handle hierarchical navigation and introduces a routing system that directs users to either the active squad or a new dedicated `app/club/[id].tsx` detail screen based on the club's status. The plan details the creation of a `WorldClubList` component for NPC teams and enhancements to the `LeagueTable` to make rows interactive, ensuring a seamless user experience when exploring club rosters. By leveraging pre-synced data, this approach enables deep exploration of the game world without requiring additional API calls while maintaining the project's retro pixel-art aesthetic.

### [docs/superpowers/plans/2026-04-18-admin-backend-improvements.md](docs/superpowers/plans/2026-04-18-admin-backend-improvements.md)
> AI Summary: This implementation plan outlines three key backend enhancements for the `wunderkind-backend` admin interface to improve player management and system configuration. Architecturally, it introduces a `PlayerRepository` query method and Twig template overrides to display a player stats summary panel, while simultaneously streamlining the domain model by removing senior-player pool configuration fields via Doctrine migrations. The plan also facilitates targeted testing by threading a nationality parameter from the admin dashboard through the `MarketPoolService` to the player generation logic. These changes leverage PHP 8.4 and Symfony 6 with EasyAdmin v4 to provide more granular control and better data visualization for administrative users.

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: I will read the content of `docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md` to provide a detailed summary of its purpose and architectural decisions.
This implementation plan outlines a three-pronged strategy to ensure a robust and error-resistant initialization of the game world. Its primary goal is to reliably place the user's club (the AMP) into the lowest-tier league during the first-time setup, while simultaneously hardening the data storage layer and protecting the backend from resource-depleted states. 

Architecturally, the plan introduces several critical safeguards and structural changes:
*   **Backend Pre-flight Guard:** Adds a pool-size check to the initialization endpoint that returns a `412 Precondition Failed` error if the player pool is insufficient, preventing incomplete or corrupted world generation.
*   **Storage Hardening:** Enhances the client-side `worldStore` to verify that `AsyncStorage` writes actually persist via a round-trip check, ensuring that silent storage failures are caught and surfaced as loud errors during the critical world-init phase.
*   **Cross-Store Wiring:** Extends `setFromWorldPack` to handle three distinct responsibilities: detecting the bottom-tier league for the AMP, generating initial fixtures via a new `fixtureStore` action, and hydrating the `leagueStore` with a synthetic snapshot of the world data.
*   **Error Visibility:** Introduces a `clubsLoadError` state to track parsing failures and upgrades initialization logs to `console.error` to ensure that integration issues are unmissable during development.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: I will read the file `docs/superpowers/specs/2026-04-12-chained-events-design.md` to ensure I have the full context before providing the summary.
The **Chained Events Design** documentation outlines a system for creating sequential narratives where initial game events increase the probability of specific follow-up events between the same pair of players within a configurable time window. Architecturally, the backend stores these configurations within the `GameEventTemplate` entity as JSON, defining the target event slug, a boost multiplier, and the duration in weeks, while the admin UI is upgraded to use structured forms for managing these complex nested fields. The frontend manages active chain state through a persistent Zustand-based `eventChainStore`, which normalizes player pairs into canonical keys and tracks expiration dates to ensure narratives progress or expire correctly. Integration occurs within the `SocialGraphEngine`, which triggers new boosts when events fire and applies multipliers to adjusted weights during the weighted random selection process without mutating the underlying template data.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This design document details the expansion of the **Browse tab** to display the entire national league pyramid, transitioning from a single-league view to a comprehensive multi-tier explorer. Architecturally, it leverages existing data in the `worldStore` and updates the `LeagueBrowser` component to sort and render all tiers, while making individual club rows tappable. A key implementation detail is the navigation logic, which routes users to a new club detail screen for NPC teams or back to the academy's squad screen for their own club. This update enhances user immersion by providing full transparency into the game world's competitive structure without requiring additional backend changes.

### [docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md](docs/superpowers/specs/2026-04-18-admin-pool-country-config-design.md)
> AI Summary: This documentation outlines three parallel improvements to the project's administrative backend and frontend configuration designed to enhance player data visibility and generation control. Architecturally, it introduces a read-only summary panel in the player admin dashboard, powered by new `PlayerRepository` methods that aggregate global counts by nationality, position, and age. The design also mandates extending the `StarterConfig` entity with an `enabledCountries` field, ensuring the frontend country picker and backend generation logic remain synchronized. Finally, it streamlines player pool management by removing legacy senior-player settings in favor of a granular nationality picker for manual player generation.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: This documentation details a plan to resolve critical world initialization bugs by hardening the storage process and automating league placement for the player's club (AMP). It introduces a "failure-loud" data flow where `setFromWorldPack` performs round-trip verification of AsyncStorage writes and the backend validates player pool sizes to prevent the silent data loss that previously resulted in empty NPC rosters. Architecturally, the design mandates the immediate placement of the AMP into the lowest-tier domestic league, which triggers the automatic population of the `leagueStore` and the generation of the first season's fixtures. Finally, it adds a persisted `ampLeagueId` to the `worldStore` to ensure a stable, verifiable reference for the player's league context across the simulation.

### [docs/wunderkind-app-context-claude.md](docs/wunderkind-app-context-claude.md)
> AI Summary: This documentation provides a high-level technical overview of "The Wunderkind Factory," a React Native football academy management game, emphasizing its client-authoritative and offline-first architectural design. The core game mechanics are driven by a "Weekly Tick" engine that processes trait shifts, financial updates, and behavioral incidents on-device using Zustand for state management and AsyncStorage for persistence. It outlines a synchronization strategy with a Symfony backend via TanStack Query v5 offline mutations to maintain cross-session consistency for metrics like reputation and career earnings. Additionally, the file documents advanced systems like the Social Graph Engine and a chained event architecture that dynamically influences narrative progression based on previous NPC interactions.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: I will read the full content of `docs/wunderkind-app-context.md` to ensure a comprehensive and accurate summary.
`docs/wunderkind-app-context.md` serves as a comprehensive technical blueprint and status report for "Wunderkind Factory," a mobile football academy management game built with Expo and React 19. It documents a client-authoritative, offline-first architecture that leverages a multi-store Zustand setup for granular state management and TanStack Query for robust data synchronization. Architecturally, the system centralizes simulation logic into specialized "Engines" and "Services" while employing a repository pattern to abstract API interactions and formal DTOs for data contracts. The file also tracks current development priorities, including the hardening of world initialization logic and the implementation of a narrative "chained events" system driven by a dynamic 8-trait personality matrix.

### [README.md](README.md)
> AI Summary: Wunderkind Factory is an offline-first football academy management strategy game built with React Native and Expo, featuring a client-authoritative "Weekly Tick" engine and a pixel art aesthetic.

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

- **Service Layer**: Business and simulation logic are encapsulated into dedicated service modules within `src/engine/` (e.g., `SimulationService`, `DevelopmentService`, `ScoutingService`).
- **Store-Based State Management**: Application state is partitioned into domain-specific stores in `src/stores/` (e.g., `clubStore`, `playerStore`, `worldStore`) to manage global data and persistence.
- **Hook-Driven Data Synchronization**: Custom React hooks in `src/hooks/` (e.g., `useNarrativeSync`, `useProspectSync`) manage the reactive flow between simulation engines, state stores, and the UI.
- **Modular API Architecture**: Network logic is separated into discrete endpoints and mutations within `src/api/`, utilizing a `syncQueue` for managing data consistency.
- **Layered Domain Modeling**: Explicit separation of data structures (`src/types/`), business logic (`src/engine/`), and presentation (`src/components/`) to maintain a clean boundary between concerns.

---

## Current Development Focus

- **Context Generation & Tooling:** Refining the `generate_project_context.sh` script and markdown summarization logic to optimize how codebase information is presented to AI agents.
- **Admin Pool & World Initialization:** Implementing the "Admin Pool" (AMP) features, including nationality picking and country configuration, as outlined in the recent design specifications.
- **League & Club Logic:** Hardening the `worldStore` initialization and league assignment logic to ensure reliable "bottom-league" detection and reputation-based club placement.
- **User Onboarding & Auth Flow:** Updating `useAuthFlow.ts` and related components to support new country-specific initialization requirements during the setup process.
- **Validation & Error Handling:** Enhancing warning systems (e.g., country-match warnings) and type-safety narrowing (e.g., `reputationTier`) within the game engine's data synchronization layer.

---

> _AI summaries generated using **gemini**._
