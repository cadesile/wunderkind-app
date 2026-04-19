# Wunderkind Factory — Mobile App

The React Native mobile application for **The Wunderkind Factory**, a football club management strategy game. Contains the core game loop, the dynamic 8-trait Personality Matrix engine, and offline-first synchronisation logic.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 (managed workflow, Expo Go compatible) |
| Navigation | Expo Router v4 (file-based) |
| State | Zustand + AsyncStorage (persist middleware) |
| API / Sync | TanStack Query v5 (offline mutations) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Icons | Lucide React Native / Custom SVG Pixel Art |
| Font | Press Start 2P (pixel art aesthetic) |

## Architecture: Offline-First "Weekly Tick"

The app is **client-authoritative** to support seamless offline play:

1. **GameLoop** (`src/engine/GameLoop.ts`) — processes the Weekly Tick entirely on-device: trait shifts, financial deductions, behavioral incidents.
2. **AsyncStorage persistence** — Zustand stores are persisted via `@react-native-async-storage/async-storage` so state survives app closure.
3. **Async sync** — high-level metrics (Club Reputation, Total Career Earnings) are queued and pushed to the Symfony API via TanStack Query offline mutations.

## Getting Started

### Prerequisites

- Node.js 20.19.6 (`.nvmrc` included — run `nvm use`)
- Expo Go app on your device (iOS / Android)

### Install

```bash
nvm use
npm install --legacy-peer-deps
```

### Run

```bash
# Start Metro + show QR code for Expo Go
npx expo start

# Run directly on simulator
npx expo start --ios
npx expo start --android
```

Scan the QR code in Expo Go to load the app on your device.

### Backend / API (Local Dev)

The backend runs via Lando and is only accessible on `127.0.0.1`. Use the dev proxy to expose it on your LAN so a physical device can reach it:

```bash
# Terminal 1 — start the dev proxy (bridges LAN → Lando)
npm run proxy

# Terminal 2 — start Metro
npx expo start
```

Set the API base URL in `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-machine-ip>:8080
```

## Project Structure

```
app/
├── _layout.tsx             # Root layout (QueryClient, font loading, auth gate)
├── (tabs)/
│   ├── _layout.tsx         # Tab navigator (4 primary + hidden routes)
│   ├── index.tsx           # Club Hub (SQUAD / COACHES / SCOUTS top tabs)
│   ├── advance.tsx         # Advance Week screen
│   ├── coaches.tsx         # Coaching staff
│   ├── facilities.tsx      # Facility upgrades
│   ├── finances.tsx        # Finance Hub (BALANCE / INVESTORS / SPONSORS / LOANS)
│   ├── inbox.tsx           # Guardian Inbox
│   └── squad.tsx           # Player roster
└── player/[id].tsx         # Player detail (bio, radar, trait bars)

src/
├── api/
│   ├── endpoints/          # auth, marketData
│   ├── mutations/          # syncMutations
│   ├── client.ts           # Fetch wrapper (401 → re-login → retry)
│   └── syncQueue.ts        # Offline mutation queue
├── components/
│   ├── radar/              # PersonalityRadar (SVG octagon)
│   ├── ui/                 # PixelText, PixelTopTabBar, Avatar, etc.
│   ├── AdvanceModal.tsx
│   ├── GlobalHeader.tsx    # Persistent top bar (name | week/date | sync + inbox)
│   ├── OnboardingScreen.tsx
│   └── SyncStatusIndicator.tsx
├── constants/
│   └── theme.ts            # WK color tokens, traitColor(), pixelShadow
├── engine/
│   ├── GameLoop.ts         # Weekly Tick processor
│   ├── finance.ts          # calculateWeeklyFinances(), calculateNetSalePrice()
│   ├── personality.ts      # generatePlayer() — 8-trait Personality Matrix
│   ├── recruitment.ts      # generateCoachProspect(), generateScout()
│   └── appearance.ts       # Player appearance generation
├── hooks/
│   ├── useAuthFlow.ts      # Bootstrap: players + coaches + scouts + market data
│   └── useSyncStatus.ts
├── stores/
│   ├── clubStore.ts        # Reputation, balance, tier, sponsorIds, investorId
│   ├── authStore.ts        # Token, email, userId
│   ├── coachStore.ts       # Coaches (add/remove)
│   ├── facilityStore.ts    # Facility levels (0–10)
│   ├── inboxStore.ts       # Guardian messages + behavioral incidents
│   ├── loanStore.ts        # Loans, repayments, limits
│   ├── marketStore.ts      # Readonly API snapshot (agents/scouts/investors/sponsors)
│   ├── scoutStore.ts       # Scouts (add/remove)
│   └── squadStore.ts       # Players, setPlayers(), generateStarterSquad()
├── types/                  # TypeScript types (Player, Coach, Club, Facility…)
└── utils/
    ├── gameDate.ts
    ├── storage.ts          # Zustand StateStorage adapter for AsyncStorage
    └── uuidv7.ts           # Timestamp-ordered UUID generator

assets/
├── fonts/
├── images/
└── svg/                    # Custom pixel art SVG icons
```

## Related Repositories

- **Wunderkind Backend:** Symfony 6.4 API (separate repo) — JWT auth, leaderboard sync, club management endpoints
