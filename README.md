# Wunderkind Factory — Mobile App

The React Native mobile application for **The Wunderkind Factory**, a football club management strategy game. Contains the core game loop, an 8-trait Personality Matrix engine, world simulation, and offline-first synchronisation with a Symfony backend.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 (managed workflow, Expo Go compatible) |
| Navigation | Expo Router v4 (file-based routing under `app/`) |
| State | Zustand + AsyncStorage persist middleware |
| Local DB | Expo SQLite (player season stats, match results, world clubs) |
| API / Sync | TanStack Query v5 (offline mutations + sync queue) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Icons | Lucide React Native / Custom SVG Pixel Art |
| Font | Press Start 2P (`@expo-google-fonts/press-start-2p`) |

## Architecture: Offline-First "Weekly Tick"

The app is **client-authoritative** to support seamless offline play:

1. **GameLoop** (`src/engine/GameLoop.ts`) — processes the Weekly Tick entirely on-device: trait shifts, financial deductions, staff/player contract expiry, behavioral incidents, DOF automation, fan engine updates.
2. **AsyncStorage persistence** — Zustand stores use the persist middleware so all game state survives app closure or power loss.
3. **SQLite** — high-volume append-only data (player season stats, match results, match appearances) lives in SQLite rather than Zustand to avoid memory pressure.
4. **Async sync** — high-level metrics (reputation, career earnings) are queued via `syncQueue` and pushed to the Symfony API with automatic retry. The sync response piggybacks facility templates, game config, and league data.

## Getting Started

### Prerequisites

- Node.js 20.19.6 (`.nvmrc` included — run `nvm use`)
- Expo Go app on your device (iOS / Android)

### Install

```bash
nvm use
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required due to peer dependency conflicts with Expo SDK 54.

### Run

```bash
# Start Metro + show QR code for Expo Go
npx expo start

# Run directly on simulator
npx expo start --ios
npx expo start --android
```

### Backend / API (Local Dev)

The Symfony backend runs via Lando and is only accessible on `127.0.0.1:52100`. Use the dev proxy to expose it on your LAN so a physical device can reach it:

```bash
# Terminal 1 — start the dev proxy (bridges LAN:8080 → Lando:52100)
npm run proxy

# Terminal 2 — start Metro
npx expo start
```

Set the API base URL in `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://<your-machine-ip>:8080
```

## Navigation

Bottom tabs: **ACADEMY** · **BUILD** · **FINANCE** · **MARKET** · **ADVANCE**

Hidden routes (no tab button, reached via hub or deep links): `squad`, `coaches`, `inbox`, `office`, `player/[id]`, `club/[id]`, `league/[id]`, `appearances/[id]`

| Hub | Top Tabs |
|---|---|
| Academy (`index.tsx`) | SQUAD / COACHES / SCOUTS |
| Finance (`finances.tsx`) | BALANCE / INVESTORS / SPONSORS / LOANS |
| Market (`market.tsx`) | PLAYERS / COACHES / SCOUTS |
| Competitions (`competitions.tsx`) | LEAGUE / FIXTURES / BROWSE / RANKINGS / HISTORY |
| Facilities (`facilities.tsx`) | TRAINING / MEDICAL / SCOUTING / STADIUM / HIRE |

## Project Structure

```
app/
├── _layout.tsx                 # Root layout: QueryClient, font loading, config gate, auth gate
├── (tabs)/
│   ├── _layout.tsx             # Tab navigator + FAB + GameLoop trigger
│   ├── index.tsx               # Academy Hub (SQUAD / COACHES / SCOUTS)
│   ├── facilities.tsx          # Facility upgrades + Hire staff
│   ├── finances.tsx            # Finance Hub (BALANCE / INVESTORS / SPONSORS / LOANS)
│   ├── market.tsx              # Market Hub (PLAYERS / COACHES / SCOUTS)
│   ├── competitions.tsx        # Competitions (LEAGUE / FIXTURES / BROWSE / RANKINGS / HISTORY)
│   └── advance.tsx             # Advance Week screen
├── player/[id].tsx             # Player detail: bio, radar, trait bars, appearances
├── club/[id].tsx               # NPC club dashboard: squad, top scorer, transfers
├── league/[id].tsx             # League browser: table, form, golden boot, top assists
├── appearances/[id].tsx        # Player match appearance history
└── office/                     # Office screens (manager, DOF config)

src/
├── api/
│   ├── client.ts               # Fetch wrapper: 401 → re-login → retry once
│   ├── syncQueue.ts            # Offline mutation queue (persisted to AsyncStorage)
│   ├── endpoints/              # auth, market, academy, squad, staff, facilities, inbox, sync, gameConfig
│   └── mutations/              # syncMutations, marketMutations
├── components/
│   ├── competitions/           # LeagueTable, FixtureList, LeagueBrowser, SeasonHistory
│   ├── radar/                  # PersonalityRadar (SVG 8-axis octagon)
│   ├── ui/                     # PixelText, VT323Text, BodyText, PixelTopTabBar, Avatar,
│   │                           # Button, Badge, Card, Money, FlagText, PixelDialog, ClubBadge
│   ├── GlobalHeader.tsx        # Persistent top bar: name | week/date | sync + inbox icon
│   ├── MatchResultOverlay.tsx  # Full-screen match result modal
│   └── OnboardingScreen.tsx    # First-launch academy name input
├── constants/
│   └── theme.ts                # WK color tokens, traitColor(), pixelShadow
├── db/
│   └── repositories/           # SQLite repos: statsRepository, matchResultRepository,
│                               # worldClubRepository, appearanceStorage
├── engine/
│   ├── GameLoop.ts             # Weekly Tick: traits, contracts, finances, incidents, DOF automation
│   ├── FanEngine.ts            # Fan happiness score + tier (Thrilled → Angry)
│   ├── ManagerBrain.ts         # Manager AI: player assessment, tactical decisions
│   ├── SimulationService.ts    # World + AMP fixture simulation, batch stat writes
│   ├── finance.ts              # calculateWeeklyFinances(), calculateNetSalePrice(),
│   │                           # calculateStaffSignOnFee(), calculateStaffSeverance()
│   ├── personality.ts          # generatePlayer(), generatePersonality() — 8-trait matrix
│   ├── recruitment.ts          # generateCoachProspect(), generateScout()
│   └── appearance.ts           # Deterministic pixel-art appearance from player id
├── hooks/
│   ├── useAuthFlow.ts          # Bootstrap: register → login → market data → 20 players + staff
│   ├── useGameConfigSync.ts    # Fetch + cache /api/game-config (refetch every 4 game weeks)
│   ├── useClubMetrics.ts       # Derived financial metrics for Finance hub
│   └── db/                     # SQLite query hooks: useLeagueTopScorers, useLeagueTopAssisters,
│                               # useMatchResult, usePlayerAppearances
├── stores/
│   ├── academyStore.ts         # Legacy reputation/balance fields (superseded by clubStore)
│   ├── archetypeStore.ts       # DOF player archetype targeting config
│   ├── attendanceStore.ts      # Matchday attendance history
│   ├── authStore.ts            # JWT token, email, userId
│   ├── clubStore.ts            # Club: name, balance, reputation, weekNumber, reputationTier
│   ├── clubStatsStore.ts       # All-time W/D/L per club (capped ~80 records)
│   ├── coachStore.ts           # Hired coaches (add/remove/update)
│   ├── debugLogStore.ts        # In-app debug log for API calls
│   ├── facilityStore.ts        # Facility levels, conditions, templates, ticket price
│   ├── fanStore.ts             # Per-club fan event log + happiness score
│   ├── financeStore.ts         # Transaction ledger (capped 364), transfer history (cap 100)
│   ├── fixtureStore.ts         # AMP league fixtures + results + currentMatchday
│   ├── gameConfigStore.ts      # Live game config from backend (persisted, 4-week refetch)
│   ├── guardianStore.ts        # Player guardian records
│   ├── inboxStore.ts           # Unified inbox: guardian/agent/sponsor/investor/system messages
│   ├── interactionStore.ts     # Player interaction records + clique groups (cap 500)
│   ├── leagueStore.ts          # AMP league snapshot: clubs, fixtures, promotionSpots
│   ├── loanStore.ts            # Loans: takeLoan(), processWeeklyRepayments(), getLoanLimit()
│   ├── lossConditionStore.ts   # Bankruptcy / relegation loss detection
│   ├── managerRecordStore.ts   # Manager hire/fire history
│   ├── marketStore.ts          # Market pool: players, coaches, scouts (5-min cache)
│   ├── matchResultStore.ts     # SQLite-backed match results (pruned each season)
│   ├── prospectPoolStore.ts    # DOF prospect scouting pool
│   ├── scoutStore.ts           # Hired scouts (add/remove/update)
│   ├── squadStore.ts           # Player roster: addPlayer(), extendContract(), removePlayer()
│   └── worldStore.ts           # NPC world: leagues, clubs (SQLite-backed for clubs)
├── types/                      # TypeScript interfaces: Player, Coach, Scout, Club,
│                               # Facility, GameConfig, Market, World, API…
└── utils/
    ├── currency.ts             # formatCurrency*, penceToPounds, poundsToPence
    ├── facilityUpkeep.ts       # calculateTotalUpkeep()
    ├── gameDate.ts             # getGameDate(), computePlayerAge()
    ├── matchdayIncome.ts       # calculateMatchdayIncome(), calculateStandIncome()
    ├── stadiumCapacity.ts      # calculateStadiumCapacity()
    ├── standingsCalculator.ts  # computeStandings() — league table from fixtures
    ├── storage.ts              # Zustand StateStorage adapter for AsyncStorage
    ├── tierGate.ts             # computeFacilityTier() — facility tier gating
    └── uuidv7.ts               # Timestamp-ordered UUID generator

assets/
├── fonts/
├── images/
└── svg/                        # Custom pixel art SVG icons
```

## Key Game Concepts

**Personality Matrix** — 8 traits on a 1–20 scale: `determination`, `professionalism`, `ambition`, `loyalty`, `adaptability`, `pressure`, `temperament`, `consistency`. Drive player behaviour, morale events, and contract loyalty.

**Weekly Tick** — Every "Advance Week" processes: attribute growth (facility-modified), trait shifts, player/staff contract warnings and expiry, financial deductions (wages, upkeep, loan repayments), facility income, sponsor payments, DOF automation (scouting, signing, renewals), fan engine update, reputation gain, and loss condition checks.

**Staff Contracts** — Coaches and scouts have `contractEndWeek` / `initialContractWeeks`. GameLoop fires inbox warnings at 12 and 4 weeks remaining, applies morale decay in the final 11 weeks, and removes the member at 0. DOF auto-renews staff meeting the loyalty threshold.

**Player Contracts** — Players have `enrollmentEndWeek` (default `joinedWeek + 52`). GameLoop fires expiry warnings, removes players at 0 weeks. DOF auto-renews loyal players. `extendContract()` adds 52 weeks + wage bump.

**Facilities** — 9 facility types across TRAINING / MEDICAL / SCOUTING / STADIUM categories. Each has upkeep (exponential by level), condition decay, and gameplay effects applied per tick. Stadium stands generate attendance income based on capacity × fill % × ticket price.

**Finance Model** — All monetary values stored in pence. Balance in `clubStore` is pence. `penceToPounds()` / `poundsToPence()` bridge backend (pence) ↔ display (whole pounds). `financeStore` holds a capped transaction ledger and transfer history.

**World Simulation** — `SimulationService` simulates all league fixtures each week, writes stats via `batchUpsertStats()` to SQLite, and updates club records. NPC clubs are stored in SQLite (`world_clubs` table) to avoid Zustand memory pressure.

## Related Repositories

- **Wunderkind Backend:** Symfony 6.4 API (separate repo) — JWT auth, leaderboard sync, facility templates, game config, squad/staff reconciliation
