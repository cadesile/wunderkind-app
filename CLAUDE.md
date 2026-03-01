# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native mobile app for **The Wunderkind Factory** — a football academy management strategy game. The app handles the core game loop, a dynamic 8-trait Personality Matrix engine, and offline-first sync with a Symfony backend API.

## Tech Stack

- **Framework:** Expo (managed workflow, Expo Go compatible)
- **Navigation:** Expo Router (file-based routing under `app/`)
- **State Management:** Zustand (8-trait Personality Matrix)
- **Local Persistence:** AsyncStorage via `@react-native-async-storage/async-storage` + Zustand persist middleware
- **Sync & API Fetching:** TanStack Query v5 (with offline mutation support)
- **Styling:** NativeWind v4 (Tailwind CSS for React Native)
- **Icons:** Lucide React Native / Custom SVG Pixel Art

## Commands

```bash
# Use correct Node version
nvm use

# Install dependencies
npm install

# Start Metro bundler + Expo Go QR
npx expo start

# Run on simulator
npx expo start --ios
npx expo start --android
```

## Architecture: Offline-First "Weekly Tick"

The app is **client-authoritative** to support seamless offline play:

1. **GameLoop utility** (`src/engine/GameLoop.ts`) — centralized engine that processes the "Weekly Tick" entirely on-device: attribute shifts, financial deductions, behavioral incidents.
2. **AsyncStorage persistence** — Zustand stores use the persist middleware with AsyncStorage so state survives app closure or power loss.
3. **Async sync** — high-level metrics (Academy Reputation, Total Career Earnings) are queued and pushed to the Symfony API via TanStack Query offline mutations.

## Key Concepts

- **Personality Matrix:** 8-trait system driving player behavior; Zustand manages this state.
- **Guardian Inbox:** Notification system for parent/guardian requests and behavioral incidents.
- **Hybrid Sync Status:** Header indicator showing current sync state with the central API.
- **Data Abstraction:** UI shows progress bars and star ratings rather than raw integers.

## Related Repositories

- **Wunderkind Backend:** Symfony API (separate repo)
