# wunderkind-app — Project Context

> Generated: 2026-04-18 09:42:28 | Stack: unknown | Dev: bare

---

## Overview

The Wunderkind Factory is a React Native mobile game where players manage a football academy, developing young talent through an 8-trait Personality Matrix engine and navigating finances, staff, and competitions. The app follows a client-authoritative, offline-first architecture built on a "Weekly Tick" game loop that processes trait shifts, financial changes, and behavioral incidents entirely on-device using Zustand and AsyncStorage. Periodic synchronization with a Symfony backend via TanStack Query v5 offline mutations keeps high-level metrics like reputation and career earnings consistent across sessions.

---

## Document Context

### [CLAUDE.md](CLAUDE.md)
> AI Summary: CLAUDE.md is the project guidance file for The Wunderkind Factory — a React Native football academy management strategy game built with Expo, Zustand, TanStack Query, and NativeWind, featuring an offline-first weekly tick engine and Symfony backend sync.

### [docs/superpowers/plans/2026-04-12-chained-events.md](docs/superpowers/plans/2026-04-12-chained-events.md)
> AI Summary: This plan implements a **chained event system** for the Wunderkind Factory game, where triggering an NPC pair event boosts the probability of related follow-up events within a configurable time window. The backend architecture adds a `chainedEvents` JSON column to `GameEventTemplate` and replaces three raw JSON fields (`chainedEvents`, `firingConditions`, `impacts`) with structured EasyAdmin 5 form types, while the frontend introduces an `eventChainStore` (Zustand + AsyncStorage) to track active boosts per player pair. The `SocialGraphEngine` is responsible for activating chains when incidents fire and applying weight multipliers during template selection, with `GameLoop` expiring stale boosts each tick. The plan targets PHP 8.4/Symfony 8.0 on the backend and TypeScript/React Native/Jest on the frontend, with a comprehensive file map spanning ~20 new form type classes on the backend side alone.

### [docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md](docs/superpowers/plans/2026-04-16-browse-all-leagues-club-detail.md)
> AI Summary: This plan implements a "Browse All Leagues" feature for the competitions tab, enabling users to view the full national league pyramid and drill into any club's player roster. The architecture is purely client-side — all league/club data already lives in `worldStore` on-device, so no new data fetching is required. The implementation involves five files: a new `WorldClubList` component for NPC league club lists, updates to `LeagueBrowser` and `LeagueTable` to render the full pyramid with tappable rows, a minor update to `competitions.tsx` to pass world data down, and a new `app/club/[id].tsx` detail screen. Routing is split by club type: tapping an AMP (player's own) club navigates to `/(tabs)/squad`, while NPC clubs route to the new `/club/[id]` screen.

### [docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md](docs/superpowers/plans/2026-04-18-world-init-amp-league-placement.md)
> AI Summary: This plan addresses three coordinated concerns across the frontend and backend:

1. **AMP League Placement** — `setFromWorldPack` in `worldStore.ts` is extended to detect the lowest-tier league in the club's country (highest `tier` number), store its ID as `ampLeagueId`, and immediately wire `leagueStore` and `fixtureStore` via synthetic snapshots so the club enters a real competition at world init rather than floating in a leagueless state.

2. **Storage Hardening** — Every per-league club write to AsyncStorage is followed by a read-back verification that throws loudly on failure, preventing silent data loss that would cause an empty squad; `loadClubs` is also hardened with try/catch per league key, surfacing parse errors via a new `clubsLoadError` state field rather than swallowing them.

3. **Backend Pool Pre-flight Guard** — The Symfony `InitializeController` gains a `PlayerRepository` injection and a `MIN_POOL_SIZE = 500` check that returns HTTP 412 before any initialization work begins, preventing the backend from committing to world generation when the player pool is too small to populate leagues.

The plan spans three files (`worldStore.ts`, `fixtureStore.ts`, `InitializeController.php`), is sequenced so Tasks 2 and 3 must complete before Task 4, and requires resolving existing merge conflicts in `syncQueue.ts` and `GameLoop.ts` as a prerequisite.

### [docs/superpowers/specs/2026-04-12-chained-events-design.md](docs/superpowers/specs/2026-04-12-chained-events-design.md)
> AI Summary: This document specifies a **chained events system** for the game where firing one event for a player pair can probabilistically trigger follow-up events within a configurable time window, supporting multi-step chains (A→B→C). On the backend, a nullable `chainedEvents` JSON column is added to `GameEventTemplate`, storing per-link config (`nextEventSlug`, `boostMultiplier`, `windowWeeks`) — with `note` excluded from the frontend API payload. On the frontend, a new Zustand persisted store (`src/stores/eventChainStore`) tracks active chain state so the game engine knows which event weights are currently boosted for which player pairs. The key architectural decision is a clean separation of concerns: chain configuration lives entirely in the backend, while transient chain state is managed client-side, mirroring the existing `impacts`/`firingConditions` pattern already established in the codebase.

### [docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md](docs/superpowers/specs/2026-04-16-browse-all-leagues-club-detail-design.md)
> AI Summary: This spec designs the "Browse All Leagues + Club Detail" feature for the BROWSE tab, solving the problem that users can currently only see their own league with no way to explore other tiers or tap into club details. Architecturally, it leverages existing on-device `worldStore` data (`leagues[]` and `clubs{}`) with no new API calls, passing world data as props into `LeagueBrowser` which renders the full national pyramid sorted by tier. Club rows become tappable throughout — NPC clubs route to a new `/club/[id]` detail screen while the user's own academy routes to the squad screen — with the AMP league expanding to the existing `LeagueTable` and other tiers rendering a new `WorldClubList` component. A new `app/club/[id].tsx` screen displays club metadata and a scrollable squad/staff list using data already present in `worldStore.clubs`.

### [docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md](docs/superpowers/specs/2026-04-18-world-init-amp-league-placement-design.md)
> AI Summary: This spec addresses two blocking issues in world initialization: NPC clubs having empty rosters due to silently-swallowed AsyncStorage write failures, and the AMP club not being placed into any league at init time (leaving the simulation engine with no fixtures or opponents to run against). The architectural solution has three parts: (1) automatic AMP placement into the lowest-tier league matching the AMP's country during `setFromWorldPack`, (2) verified round-trip writes to AsyncStorage so storage failures are loud and recoverable, and (3) a backend guard that returns a 412 if the player/club pool is below a minimum threshold before committing initialization. Post-init, `setFromWorldPack` builds a synthetic `LeagueSnapshot` from the bottom league and passes it to `leagueStore.setFromSync`, then calls `fixtureStore.generateFixturesFromWorldLeague` to populate season-1 fixtures — making the full simulation loop available immediately after onboarding with no additional user action.

### [docs/wunderkind-app-context.md](docs/wunderkind-app-context.md)
> AI Summary: The `wunderkind-app-context.md` file serves as an auto-generated project context document for the Wunderkind Factory app, aggregating AI-generated summaries of all documentation files into a single reference. Its core purpose is to give AI assistants (and developers) a high-level orientation to the project without reading every individual document. Architecturally, it reflects the app's key design pillars: a client-authoritative offline-first "Weekly Tick" game loop, an 8-trait Personality Matrix engine, and Zustand + TanStack Query for state management and backend sync. The document also surfaces planned system expansions, including a Chained Events system for narrative momentum and a league/club browsing feature, documenting how the game's social and competitive layers are intended to evolve.

### [README.md](README.md)
> AI Summary: The Wunderkind Factory mobile app is an offline-first React Native/Expo football academy management strategy game featuring an 8-trait Personality Matrix engine, Zustand state management, and async sync to a Symfony backend via TanStack Query.

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

38 directories, 147 files
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
15f9d6e docs: add world init AMP league placement + storage hardening spec
26174f2 feat: implement Club World Evolution (Selection/Results/UX)
05e7d15 chore: ignore .worktrees/
9d35b3f fix: loading state, pressed feedback, country fallback and data contract comment
```

---

## Architecture Notes

- **Store-per-domain (vertical slice state)** — each domain (squad, coach, scout, market, loan, facility, inbox, auth) has its own Zustand store, keeping state ownership colocated with its slice of the domain model.
- **Service layer** — `src/engine/` encapsulates game logic (GameLoop, SimulationService, ScoutingService, personality, finance) separately from UI and state, acting as a pure domain service layer.
- **Repository / API endpoint abstraction** — `src/api/endpoints/` groups backend calls by resource (auth, market, squad, staff, facilities, inbox), separating transport concerns from business logic.
- **Mutation / Command pattern** — `src/api/mutations/` isolates write operations (sync, market assign) as discrete command objects, consistent with CQRS-lite: reads via endpoints, writes via mutations.
- **DTO transform at the boundary** — market and academy endpoints map raw backend shapes to app-internal types (position renaming, unit conversion pence→pounds, derived fields), keeping domain models clean of API coupling.

---

## Current Development Focus

- **World-pack initialization & cross-store wiring** — Multiple commits patching `setFromWorldPack`, country-matching, and bottom-league detection suggest fragile ordering dependencies between stores; AI could help model the correct initialization sequence and guard against regression.
- **Fixture generation logic** — `generateFixturesFromWorldLeague` was just introduced; scheduling algorithms (round-robin, home/away balance, conflict avoidance) are a well-known area where AI can accelerate correctness and edge-case coverage.
- **AI CLI / documentation pipeline** — The project is actively building its own AI-assisted tooling (`--ai-cli`, markdown summarization); AI can help harden prompt design, handle stdin edge cases, and improve output parsing reliability.
- **GameLoop sync & conflict resolution** — Merge conflicts in `syncQueue` and `GameLoop` signal that this module is touched frequently by parallel work; AI can assist with idempotency design and regression test generation.
- **Reputation-tier narrowing & league placement** — `safe-narrow reputationTier` and `syntheticLeague` fixes indicate brittle enum/range logic; AI can help formalize the tier boundary rules and generate exhaustive unit tests across the full 0–100 reputation range.
