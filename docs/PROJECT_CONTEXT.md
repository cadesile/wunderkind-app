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
│   │   ├── finances.tsx
│   │   ├── inbox.tsx
│   │   ├── index.tsx
│   │   └── squad.tsx
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
│   └── PROJECT_CONTEXT.md
├── scripts
│   └── generate_project_context.sh
├── src
│   ├── api
│   │   ├── endpoints
│   │   ├── mutations
│   │   └── client.ts
│   ├── components
│   │   ├── radar
│   │   ├── ui
│   │   └── SyncStatusIndicator.tsx
│   ├── engine
│   │   ├── finance.ts
│   │   ├── GameLoop.ts
│   │   └── personality.ts
│   ├── hooks
│   │   └── useAuthFlow.ts
│   ├── stores
│   │   ├── academyStore.ts
│   │   ├── authStore.ts
│   │   ├── inboxStore.ts
│   │   └── squadStore.ts
│   ├── types
│   │   ├── academy.ts
│   │   ├── api.ts
│   │   ├── game.ts
│   │   └── player.ts
│   └── utils
│       └── storage.ts
├── app.json
├── babel.config.js
├── CLAUDE.md
├── global.css
├── metro.config.js
├── nativewind-env.d.ts
├── nativewind.d.ts
├── package-lock.json
├── package.json
├── README.md
├── tailwind.config.js
└── tsconfig.json

22 directories, 42 files
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
EXPO_PUBLIC_API_BASE_URL=http://wunderkind-backend.lndo.site
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
3eec1e5 Call enableScreens() to initialise react-native-screens
494d426 Add missing expo-router peer dependencies
7677f1a Add expo-linking (required by expo-router)
ef2d527 Pin tailwindcss to 3.3.2 for NativeWind v2 compatibility
973cf3c Remove nativewind/preset from tailwind config (v4-only)
5f6dd91 Switch to NativeWind v2 for Expo Go compatibility
9670431 Add react-native-reanimated and fix NativeWind babel plugin
51d28a0 Add backend API integration and auth flow
0630921 Scaffold Expo project with full game architecture
250a390 Initial project setup with README and CLAUDE.md
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

