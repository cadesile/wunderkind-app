# Wunderkind Factory — Mobile App

The React Native mobile application for **The Wunderkind Factory**, a football academy management strategy game. Contains the core game loop, the dynamic 8-trait Personality Matrix engine, and offline-first synchronisation logic.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo (managed workflow, Expo Go compatible) |
| Navigation | Expo Router (file-based) |
| State | Zustand + AsyncStorage (persist middleware) |
| API / Sync | TanStack Query v5 (offline mutations) |
| Styling | NativeWind (Tailwind CSS for React Native) |
| Icons | Lucide React Native / Custom SVG Pixel Art |

## Architecture: Offline-First "Weekly Tick"

The app is **client-authoritative** to support seamless offline play:

1. **GameLoop** (`src/engine/GameLoop.ts`) — processes the Weekly Tick entirely on-device: trait shifts, financial deductions, behavioral incidents.
2. **AsyncStorage persistence** — Zustand stores are persisted via `@react-native-async-storage/async-storage` so state survives app closure.
3. **Async sync** — high-level metrics (Academy Reputation, Total Career Earnings) are queued and pushed to the Symfony API via TanStack Query offline mutations.

## Getting Started

### Prerequisites

- Node.js 20.19.6 (`.nvmrc` included — run `nvm use`)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your device (iOS / Android)

### Install

```bash
nvm use
npm install
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

## Project Structure

```
app/                    # Expo Router screens
├── _layout.tsx         # Root layout (QueryClient provider)
├── (tabs)/             # Tab navigator
│   ├── index.tsx       # Dashboard / Academy overview
│   ├── squad.tsx       # Player roster
│   ├── inbox.tsx       # Guardian Inbox
│   └── finances.tsx    # Financial overview
└── player/[id].tsx     # Player detail

src/
├── components/         # UI components (Button, Card, Badge, PersonalityRadar)
├── engine/             # Game logic (GameLoop, personality, finance)
├── stores/             # Zustand stores (academy, squad, inbox)
├── api/                # Symfony API client + TanStack Query mutations
├── types/              # TypeScript types (Player, Academy, WeeklyTick…)
└── utils/              # AsyncStorage adapter for Zustand persist

assets/
├── fonts/
├── images/
└── svg/                # Custom pixel art SVG icons
```

## Related Repositories

- **Wunderkind Backend:** Symfony API (separate repo)
