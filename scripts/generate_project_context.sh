#!/bin/bash

# generate_project_context.sh
# Generates a comprehensive context file for Claude.ai integration
# Tailored for the Wunderkind Factory React Native / Expo app

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_NAME=$(basename "$PWD")
OUTPUT_FILE="${REPO_NAME}-context.md"

echo -e "${BLUE}Generating docs/${OUTPUT_FILE}...${NC}"

mkdir -p docs

# ─── Header ───────────────────────────────────────────────────────────────────

cat > docs/${OUTPUT_FILE} << EOF
# Wunderkind Factory — React Native App Context

> Last updated: $(date +"%Y-%m-%d %H:%M:%S")

## Overview
Expo-managed React Native app for **The Wunderkind Factory** — a football academy
management strategy game. Offline-first, client-authoritative weekly tick engine,
Zustand state management, NativeWind v4 styling, Symfony backend sync.

---

## Technology Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 54 (managed, Expo Go compatible) |
| Navigation | Expo Router v4 (file-based, \`app/\` directory) |
| State | Zustand + AsyncStorage persist middleware |
| API / Sync | TanStack Query v5 (offline mutations) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Language | TypeScript |
| Icons | Lucide React Native + react-native-svg |
| Font | Press Start 2P (pixel-art) |

---

## npm Dependencies

\`\`\`json
EOF

if [ -f "package.json" ]; then
    node -e "
const pkg = require('./package.json');
const deps = { ...pkg.dependencies };
const devDeps = { ...pkg.devDependencies };
console.log('// dependencies');
Object.entries(deps).forEach(([k,v]) => console.log(\`\${k}: \${v}\`));
console.log('// devDependencies');
Object.entries(devDeps).forEach(([k,v]) => console.log(\`\${k}: \${v}\`));
" 2>/dev/null >> docs/${OUTPUT_FILE} || \
    cat package.json | grep -A 200 '"dependencies"' | head -80 >> docs/${OUTPUT_FILE}
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'
```

---

## Project Structure

```
EOF

echo "- Building directory structure..."
if command -v tree &> /dev/null; then
    tree -L 4 -I 'node_modules|.expo|.git|dist|build|*.lock|*.log' \
         --dirsfirst \
         -F \
         app src scripts docs 2>/dev/null >> docs/${OUTPUT_FILE} || \
    find . -type d \( -path '*/node_modules' -o -path '*/.expo' -o -path '*/.git' \) -prune \
         -o -type f -print | head -60 >> docs/${OUTPUT_FILE}
else
    find . \( -path '*/node_modules' -o -path '*/.expo' -o -path '*/.git' \) -prune \
         -o -type f -print | grep -v '.lock' | head -60 >> docs/${OUTPUT_FILE}
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'
```

---

## Navigation Architecture

### Tab Routes (`app/(tabs)/`)

EOF

echo "- Scanning tab routes..."
if [ -d "app/(tabs)" ]; then
    for f in "app/(tabs)"/*.tsx; do
        [ -f "$f" ] || continue
        name=$(basename "$f" .tsx)
        echo "- \`$name\` — $(head -5 "$f" | grep -o '"[^"]*"' | head -1 | tr -d '"' || echo '')" >> docs/${OUTPUT_FILE}
    done
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'

### Other Routes

EOF

# Non-tab routes
find app -name "*.tsx" -not -path "*/\(tabs\)/*" -not -name "_layout.tsx" 2>/dev/null | sort | while read f; do
    echo "- \`$f\`" >> docs/${OUTPUT_FILE}
done

cat >> docs/${OUTPUT_FILE} << 'EOF'

---

## Zustand Stores (`src/stores/`)

EOF

echo "- Scanning Zustand stores..."
if [ -d "src/stores" ]; then
    for store in src/stores/*.ts; do
        [ -f "$store" ] || continue
        store_name=$(basename "$store" .ts)
        echo "### $store_name" >> docs/${OUTPUT_FILE}
        echo "" >> docs/${OUTPUT_FILE}
        echo '```typescript' >> docs/${OUTPUT_FILE}
        # Extract exported interfaces/types and the state interface
        grep -E '^\s*(export interface|export type|interface [A-Z])' "$store" | head -10 >> docs/${OUTPUT_FILE}
        echo "// Actions:" >> docs/${OUTPUT_FILE}
        # Extract action names from the state interface or create() call
        grep -E '^\s+[a-z][a-zA-Z]+\s*[:(]' "$store" | grep -v '//' | head -20 >> docs/${OUTPUT_FILE}
        echo '```' >> docs/${OUTPUT_FILE}
        echo "" >> docs/${OUTPUT_FILE}
    done
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'

---

## Game Engine (`src/engine/`)

EOF

echo "- Scanning engine files..."
if [ -d "src/engine" ]; then
    for eng in src/engine/*.ts; do
        [ -f "$eng" ] || continue
        eng_name=$(basename "$eng" .ts)
        echo "### $eng_name" >> docs/${OUTPUT_FILE}
        echo "" >> docs/${OUTPUT_FILE}
        echo '```typescript' >> docs/${OUTPUT_FILE}
        # Extract exported functions and interfaces
        grep -E '^export (function|const|interface|type|class)' "$eng" | head -15 >> docs/${OUTPUT_FILE}
        echo '```' >> docs/${OUTPUT_FILE}
        echo "" >> docs/${OUTPUT_FILE}
    done
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'

---

## TypeScript Types (`src/types/`)

EOF

echo "- Scanning type definitions..."
if [ -d "src/types" ]; then
    for types in src/types/*.ts; do
        [ -f "$types" ] || continue
        type_name=$(basename "$types" .ts)
        echo "### $type_name" >> docs/${OUTPUT_FILE}
        echo "" >> docs/${OUTPUT_FILE}
        echo '```typescript' >> docs/${OUTPUT_FILE}
        grep -E '^(export interface|export type|export enum)' "$types" | head -20 >> docs/${OUTPUT_FILE}
        echo '```' >> docs/${OUTPUT_FILE}
        echo "" >> docs/${OUTPUT_FILE}
    done
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'

---

## API Layer (`src/api/`)

### Endpoints

EOF

echo "- Scanning API endpoints..."
if [ -d "src/api/endpoints" ]; then
    for ep in src/api/endpoints/*.ts; do
        [ -f "$ep" ] || continue
        ep_name=$(basename "$ep" .ts)
        echo "#### $ep_name" >> docs/${OUTPUT_FILE}
        echo '```typescript' >> docs/${OUTPUT_FILE}
        grep -E '^export (async function|function|const)' "$ep" | head -10 >> docs/${OUTPUT_FILE}
        echo '```' >> docs/${OUTPUT_FILE}
        echo "" >> docs/${OUTPUT_FILE}
    done
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'

### Mutations (TanStack Query)

EOF

if [ -d "src/api/mutations" ]; then
    for mut in src/api/mutations/*.ts; do
        [ -f "$mut" ] || continue
        mut_name=$(basename "$mut" .ts)
        echo "#### $mut_name" >> docs/${OUTPUT_FILE}
        echo '```typescript' >> docs/${OUTPUT_FILE}
        grep -E '^export (function|const)' "$mut" | head -10 >> docs/${OUTPUT_FILE}
        echo '```' >> docs/${OUTPUT_FILE}
        echo "" >> docs/${OUTPUT_FILE}
    done
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'

---

## UI Components (`src/components/`)

EOF

echo "- Scanning components..."
find src/components -name "*.tsx" 2>/dev/null | sort | while read comp; do
    comp_name=$(basename "$comp" .tsx)
    rel_path="${comp#src/components/}"
    echo "- \`$rel_path\` — $(grep -m1 'export.*function\|export default' "$comp" 2>/dev/null | sed 's/export default function //' | sed 's/export function //' | cut -c1-60 || echo '')" >> docs/${OUTPUT_FILE}
done

cat >> docs/${OUTPUT_FILE} << 'EOF'

---

## Design System

### Color Tokens (`src/constants/theme.ts`)

EOF

if [ -f "src/constants/theme.ts" ]; then
    echo '```typescript' >> docs/${OUTPUT_FILE}
    grep -E '^\s+[a-zA-Z]+:' src/constants/theme.ts | head -30 >> docs/${OUTPUT_FILE}
    grep -E '^export' src/constants/theme.ts | head -10 >> docs/${OUTPUT_FILE}
    echo '```' >> docs/${OUTPUT_FILE}
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'

### Key Design Rules
- Background: `#1a5c2a` (greenDark) · Cards: `#1d5c52` (tealCard)
- Accent: `#f5c842` (yellow) · Border: `#0d2e28`
- Font: `PressStart2P_400Regular` · `borderRadius: 0` · `borderWidth: 3`
- `pixelShadow`: elevation 4, shadowRadius 0, offset (3,3)

---

## Environment Variables

EOF

echo "- Extracting env variables..."
if [ -f ".env" ]; then
    echo '```bash' >> docs/${OUTPUT_FILE}
    grep -v '^#' .env | grep -v '^$' | sed 's/=.*/=***/' >> docs/${OUTPUT_FILE}
    echo '```' >> docs/${OUTPUT_FILE}
fi

cat >> docs/${OUTPUT_FILE} << 'EOF'

---

## Development Commands

```bash
# Use correct Node version
nvm use

# Install dependencies (legacy peer deps required for SDK 54)
npm install --legacy-peer-deps

# Start Metro bundler + Expo Go QR
npx expo start

# iOS simulator
npx expo start --ios

# Android simulator
npx expo start --android

# Start dev proxy (bridges Lando backend to LAN)
npm run proxy
```

---

## Backend API Contract

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Register new academy |
| POST | `/api/login` | Login → JWT token |
| GET | `/api/market/data` | Fetch market entities |
| POST | `/api/market/assign` | Assign entity to academy |
| POST | `/api/academy/initialize` | Initialize academy on backend |
| GET | `/api/academy/status` | Reputation, balance (pence) |
| GET | `/api/squad` | Squad reconciliation |
| GET | `/api/staff` | Staff reconciliation |
| GET | `/api/facilities` | Facility levels + costs (pence) |
| POST | `/api/facilities/:type/upgrade` | Upgrade a facility |
| GET | `/api/inbox` | Inbox messages |
| POST | `/api/inbox/:id/accept\|reject\|read` | Respond to message |
| POST | `/api/sync` | Weekly tick sync |

> **Balance convention**: backend uses pence; local stores use whole pounds.
> Use `penceToPounds()` / `poundsToPence()` from `src/utils/currency.ts`.

---

## Recent Git Activity

EOF

echo "- Extracting recent commits..."
echo '```' >> docs/${OUTPUT_FILE}
git log --oneline -15 2>/dev/null >> docs/${OUTPUT_FILE} || echo "Git history not available" >> docs/${OUTPUT_FILE}
echo '```' >> docs/${OUTPUT_FILE}

cat >> docs/${OUTPUT_FILE} << 'EOF'

---

## Key Architecture Notes

- **Fat client / offline-first**: all game simulation runs on-device; backend receives opaque JSON deltas via `/api/sync`
- **Weekly tick** (`src/engine/GameLoop.ts`): traits, attributes, finances, loans, rep, morale, scouting, relationships — all computed in one pass
- **Personality Matrix**: 8 traits (determination, professionalism, ambition, loyalty, adaptability, pressure, temperament, consistency) on 1–20 scale
- **Attribute model**: 6 attributes (pace, technical, vision, power, stamina, heart) on 0–100 scale; capped at `potential × 20`
- **Overall Rating**: increments by avg attribute gain per tick (not reset to attribute average)
- **Scouting**: Fog of War — `hidden → scouting → revealed` over 2 weeks; gem discovery via `ScoutingService.checkGemDiscovery()`
- **Relationships**: −100 to +100 ledger between players/coaches/scouts/manager
- **Morale**: 0–100; <40 halves coach `effectiveInfluence`
- **Path aliases**: `@/*` → `src/*`

EOF

echo -e "${GREEN}✓ Generated docs/${OUTPUT_FILE}${NC}"
echo ""
echo "Next steps:"
echo "1. Review docs/${OUTPUT_FILE}"
echo "2. Upload to Claude.ai project knowledge base"
echo "3. Re-run whenever major structural changes occur"
