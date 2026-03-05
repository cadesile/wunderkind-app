# Wunderkind Backend - Project Context

> Last Updated: $(date +"%Y-%m-%d %H:%M:%S")

## Overview
Wunderkind Factory backend API built with Symfony for managing youth football academies and leaderboard systems.

---

## Technology Stack

### Core Framework
- **Symfony**: 6.4
- **PHP**: 8.x
- **Database**: MySQL/MariaDB
- **Local Dev**: Lando

### Key Packages

```json
```

---

## Project Structure

```
.
├── app
│   ├── (tabs)
│   │   ├── _layout.tsx
│   │   ├── advance.tsx
│   │   ├── coaches.tsx
│   │   ├── facilities.tsx
│   │   ├── finances.tsx
│   │   ├── inbox.tsx
│   │   ├── index.tsx
│   │   ├── market.tsx
│   │   └── squad.tsx
│   ├── market
│   │   ├── _layout.tsx
│   │   ├── coaches.tsx
│   │   ├── index.tsx
│   │   ├── players.tsx
│   │   └── scouts.tsx
│   ├── player
│   │   └── [id].tsx
│   └── _layout.tsx
├── assets
│   ├── fonts
│   ├── images
│   ├── svg
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   ├── android-icon-monochrome.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
├── docs
│   └── wunderkind-app-context.md
├── scripts
│   ├── dev-proxy.py
│   └── generate_project_context.sh
├── src
│   ├── api
│   │   ├── endpoints
│   │   ├── mutations
│   │   ├── client.ts
│   │   └── syncQueue.ts
│   ├── components
│   │   ├── radar
│   │   ├── ui
│   │   ├── AdvanceModal.tsx
│   │   ├── GlobalHeader.tsx
│   │   ├── OnboardingScreen.tsx
│   │   └── SyncStatusIndicator.tsx
│   ├── constants
│   │   └── theme.ts
│   ├── engine
│   │   ├── appearance.ts
│   │   ├── finance.ts
│   │   ├── GameLoop.ts
│   │   ├── personality.ts
│   │   ├── ReactionHandler.ts
│   │   ├── recruitment.ts
│   │   └── SimulationService.ts
│   ├── hooks
│   │   ├── useAuthFlow.ts
│   │   ├── useNarrativeSync.ts
│   │   └── useSyncStatus.ts
│   ├── stores
│   │   ├── academyStore.ts
│   │   ├── activeEffectStore.ts
│   │   ├── authStore.ts
│   │   ├── coachStore.ts
│   │   ├── eventStore.ts
│   │   ├── facilityStore.ts
│   │   ├── financeStore.ts
│   │   ├── inboxStore.ts
│   │   ├── loanStore.ts
│   │   ├── marketStore.ts
│   │   ├── narrativeStore.ts
│   │   ├── scoutStore.ts
│   │   └── squadStore.ts
│   ├── types
│   │   ├── academy.ts
│   │   ├── api.ts
│   │   ├── coach.ts
│   │   ├── facility.ts
│   │   ├── finance.ts
│   │   ├── game.ts
│   │   ├── market.ts
│   │   ├── narrative.ts
│   │   └── player.ts
│   └── utils
│       ├── currency.ts
│       ├── facilityUpkeep.ts
│       ├── gameDate.ts
│       ├── storage.ts
│       └── uuidv7.ts
├── app.json
├── babel.config.js
├── CLAUDE.md
├── global.css
├── metro.config.js
├── nativewind-env.d.ts
├── package-lock.json
├── package.json
├── README.md
├── tailwind.config.js
└── tsconfig.json

24 directories, 80 files
```

---

## Database Entities


---

## API Routes

```
```

---

## Controllers


---

## Services


---

## Security Configuration


---

## Environment Configuration

### Required Environment Variables

```bash
EXPO_PUBLIC_API_BASE_URL_WEB=http://localhost:8080
```

---

## Development Setup

### Local Development with Lando

```bash
# Start the environment
lando start

# Install dependencies
lando composer install

# Database setup
lando php bin/console doctrine:database:create
lando php bin/console doctrine:migrations:migrate

# Clear cache
lando php bin/console cache:clear
```

### Useful Commands

```bash
# View logs
lando logs -s appserver

# Run tests
lando php bin/phpunit

# Debug routes
lando php bin/console debug:router

# Debug firewall
lando php bin/console debug:firewall
```

---

## Recent Development Activity

```
fe6c466 added updated readme
da4dde3 UI fixes: safe area, pitch grid, NaN balance, player profile, facilities subnav
fa5877b Implement deep management simulation upgrade
c42c203 Implement optimistic background sync queue
34ed782 Fix Advance Week lag — fire sync in background
ba3b63c Implement Academy Growth & Temporal Engine
7706af9 Fix expo-font version to match Expo SDK 54 (14.0.11)
8af23e0 Apply pixel-art UI style guide across full app
56aa2be Implement onboarding flow with personality engine and starter squad
ba6bdef Add LAN dev proxy to connect Android device to Lando backend
```

---

## Notes for AI Context

### Current Focus Areas
- JWT Authentication implementation
- Leaderboard sync endpoints
- Admin UI development
- Academy management system

### Key Design Patterns
- Repository pattern for data access
- Service layer for business logic
- DTO pattern for API requests/responses
- Event-driven architecture where applicable

### Testing Strategy
- Unit tests for services
- Integration tests for repositories
- API tests for controllers

---

## Additional Resources

- [Symfony Documentation](https://symfony.com/doc/current/index.html)
- [Doctrine ORM](https://www.doctrine-project.org/projects/doctrine-orm/en/latest/)
- [JWT Authentication Bundle](https://github.com/lexik/LexikJWTAuthenticationBundle)

