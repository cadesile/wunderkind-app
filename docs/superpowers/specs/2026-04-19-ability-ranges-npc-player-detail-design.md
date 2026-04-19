# Spec: Ability Ranges Fix + NPC Player Detail

> Created: 2026-04-19

---

## Problem Summary

Two related issues with world initialisation and NPC club viewing:

1. **Ability ranges don't match StarterConfig** — players assigned to NPC clubs (and the AMP club) do not have attribute values that reflect the "League Player Ability Ranges" configured in the admin StarterConfig. The AMP club additionally ignores the admin config entirely, using hardcoded ranges.

2. **NPC player rows are not tappable** — the club detail screen (`app/club/[id].tsx`) shows NPC club players in a list but rows are non-interactive `View` components. The player detail template (`app/player/[id].tsx`) already fully handles NPC players via `useUnifiedPlayer`, but there's no navigation wired to reach it from the club roster.

---

## Root Causes

### Ability Ranges

Pool generation in `MarketPoolService::generatePlayers()` has two disconnected ability systems:

- `currentAbility` — set as `random_int(abilityMin, abilityMax)` from `PoolConfig`. This is the field `findForWorldInit` filters on when selecting players for each tier.
- `attrBudget` — set as `random_int(attributeBudgetMin, attributeBudgetMax)` from `PoolConfig`. This total is distributed across the 6 attributes (pace, technical, vision, power, stamina, heart) via `distributeAttributes()`.

These two values are completely independent. A player with `currentAbility = 80` (correctly within a tier-1 range) can have an attribute budget that makes their displayed OVR ≈ 37 — because the budget is random, not derived from `currentAbility`.

### AMP Ability Range

`WorldInitializationService` ignores `leagueAbilityRanges` for the AMP club. It uses a hardcoded `STARTER_ABILITY_RANGES` constant keyed by the `starterClubTier` string ('local', 'regional', 'national', 'elite'), which has no connection to the admin-configured ranges.

---

## Architecture

### Fix 1 — Correlate Attribute Budget to `currentAbility` (`MarketPoolService`)

**File:** `wunderkind-backend/src/Service/MarketPoolService.php`

Replace:
```php
$attrBudget = random_int($cfg->getPlayerAttributeBudgetMin(), $cfg->getPlayerAttributeBudgetMax());
```

With:
```php
$attrBudget = $currentAbility * 6;
```

`distributeAttributes(position, total)` splits `total` proportionally across 6 attributes by position-specific weights. Setting `total = currentAbility × 6` ensures the 6 attributes sum to that budget, making their average equal `currentAbility` — the same value `findForWorldInit` filters on. Position weighting still applies, so position-relevant attributes are higher than others, but the average tracks the configured range.

`getPlayerAttributeBudgetMin()` / `getPlayerAttributeBudgetMax()` on `PoolConfig` are no longer used for player attribute generation. Leave the fields in place (they may be used elsewhere or referenced in admin UI) but they no longer affect attribute distribution.

**Pool regeneration required:** Existing pool players were generated with random budgets. Their attributes do not correlate to their `currentAbility`. After this code change, the player pool must be wiped and regenerated via the admin pool generation command before world init will produce correctly-ranged players.

---

### Fix 2 — Remove Hardcoded AMP Ranges (`WorldInitializationService`)

**File:** `wunderkind-backend/src/Service/WorldInitializationService.php`

Remove the `STARTER_ABILITY_RANGES` constant entirely.

Replace:
```php
$tierStr  = $starterConfig->getStarterClubTier();
$ampRange = self::STARTER_ABILITY_RANGES[$tierStr] ?? ['min' => 5, 'max' => 30];
```

With:
```php
$ampLeagueTier = $club->getCurrentLeague()?->getTier() ?? 8;
$ampRange = $leagueRanges[$country][(string) $ampLeagueTier] ?? ['min' => 5, 'max' => 30];
```

`$club->getCurrentLeague()` is populated at init time (confirmed by the existing league-membership check at line 76 of the service). The AMP's tier is thus read directly from its assigned league, and the ability range is looked up from the same `$leagueRanges` array already loaded from `$starterConfig->getLeagueAbilityRanges()` at the top of `initialize()`.

This makes AMP player ability driven by the same admin-configured matrix as NPC clubs. The `starterClubTier` string on `StarterConfig` is unchanged — it's used for sponsor tier and reputation tier at club creation, not ability ranges.

---

### Fix 3 — NPC Player Tap-Through (`club/[id].tsx`)

**File:** `wunderkind-app/app/club/[id].tsx`

The player rows in `ClubDetailScreen` are currently plain `View` components. Each row should become a `Pressable` that navigates to `/player/${p.id}`.

Changes:
- Wrap each row `View` with `Pressable` (import `useRouter` from `expo-router`)
- `onPress`: `router.push('/player/${p.id}')`
- Add a `ChevronRight` icon (already imported elsewhere, available from `lucide-react-native`) to the right of the OVR value to signal tappability
- No state changes — pure navigation

**Why no other changes are needed:**
- `useUnifiedPlayer(id)` already searches `worldStore` clubs to find NPC players by ID and maps `WorldPlayer` → `Player`
- `player/[id].tsx` already branches on `isNpc` — all management sections (contract, guardians, release button, support/punish bar) are conditionally hidden with `{!isNpc && (...)}`. Bio, attributes, personality matrix, and scout report render for all players.

---

## Data Flow

```
club/[id].tsx
  player row (Pressable)
    → router.push('/player/${p.id}')

player/[id].tsx
  useUnifiedPlayer(id)
    → searches squadStore (AMP player?) → not found
    → searches worldStore.clubs[*].players (NPC player) → found
    → maps WorldPlayer → Player, sets isNpc = true, returns clubColors + clubName

  isNpc = true
    → renders: bio, attributes (if present), personality matrix, scout report
    → hides: guardians, contract, release, support/punish bar
```

---

## Files Changed

| File | Repo | Change |
|---|---|---|
| `src/Service/MarketPoolService.php` | backend | `attrBudget = currentAbility * 6` |
| `src/Service/WorldInitializationService.php` | backend | Remove `STARTER_ABILITY_RANGES`; derive AMP range from `getCurrentLeague()->getTier()` |
| `app/club/[id].tsx` | app | Wrap player rows with `Pressable`, add chevron, `router.push` |

**Admin action required after backend deploy:** Regenerate the player pool so existing pool players have correctly correlated attributes.

---

## Out of Scope

- Changes to `PoolConfig` entity or its admin UI
- Changes to how `starterClubTier` is used for sponsor/reputation assignment
- Changes to `leagueAbilityRanges` admin UI (already implemented)
- Any changes to `useUnifiedPlayer` or `player/[id].tsx` — they are already correct
