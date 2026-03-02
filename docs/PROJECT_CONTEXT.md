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
│   ├── dev-proxy.py
│   └── generate_project_context.sh
├── src
│   ├── api
│   │   ├── endpoints
│   │   ├── mutations
│   │   └── client.ts
│   ├── components
│   │   ├── radar
│   │   ├── ui
│   │   ├── OnboardingScreen.tsx
│   │   └── SyncStatusIndicator.tsx
│   ├── constants
│   │   └── theme.ts
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
├── package-lock.json
├── package.json
├── README.md
├── tailwind.config.js
└── tsconfig.json

23 directories, 44 files
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
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.156:8080
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
7706af9 Fix expo-font version to match Expo SDK 54 (14.0.11)
8af23e0 Apply pixel-art UI style guide across full app
56aa2be Implement onboarding flow with personality engine and starter squad
ba6bdef Add LAN dev proxy to connect Android device to Lando backend
4330bb7 Pin all packages to exact Expo SDK 54 expected versions
289e4fb Switch to NativeWind v4 (compatible with RN 0.81 New Architecture)
22e3bd4 Realign to Expo Go SDK 54 native binary (RN 0.81.5)
cd9ba12 Downgrade native modules to legacy-arch versions for Expo Go
3eec1e5 Call enableScreens() to initialise react-native-screens
494d426 Add missing expo-router peer dependencies
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

