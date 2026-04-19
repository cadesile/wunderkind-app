# Ability Ranges Fix + NPC Player Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix player attribute values so they correlate to the configured league ability ranges, and make NPC club player rows tappable so they navigate to the full player detail screen.

**Architecture:** Three independent changes — (1) `MarketPoolService` ties attribute budget to `currentAbility` so pool players' visible stats match the range used to filter them; (2) `WorldInitializationService` removes hardcoded AMP ranges and reads from `leagueAbilityRanges` config based on the AMP's actual league tier; (3) `club/[id].tsx` wraps player rows with `Pressable` to navigate to `player/[id].tsx`, which already handles NPC players correctly.

**Tech Stack:** PHP 8.4 / Symfony / Lando (backend); React Native / Expo Router / TypeScript (frontend)

---

## File Map

| File | Repo | Change |
|---|---|---|
| `src/Service/MarketPoolService.php` | `wunderkind-backend` | Replace random `attrBudget` with `currentAbility * 6` |
| `src/Service/WorldInitializationService.php` | `wunderkind-backend` | Remove `STARTER_ABILITY_RANGES` const; derive AMP range from `getCurrentLeague()->getTier()` |
| `app/club/[id].tsx` | `wunderkind-app` | Wrap player rows with `Pressable`, add `ChevronRight`, navigate to `/player/${p.id}` |

---

## Task 1: Correlate Attribute Budget to `currentAbility` — `MarketPoolService`

**Files:**
- Modify: `wunderkind-backend/src/Service/MarketPoolService.php` (line 183)

**Context:** `generatePlayers()` currently sets `$attrBudget = random_int(min, max)` independently of `currentAbility`. `distributeAttributes(position, total)` distributes `total` across 6 attributes proportionally. Setting `total = currentAbility * 6` means the 6 attributes sum to `currentAbility * 6`, so their average equals `currentAbility` — the same value `findForWorldInit` filters on.

- [ ] **Step 1: Open the file and locate the attribute budget line**

File: `wunderkind-backend/src/Service/MarketPoolService.php`

Find line 183:
```php
$attrBudget = random_int($cfg->getPlayerAttributeBudgetMin(), $cfg->getPlayerAttributeBudgetMax());
```

- [ ] **Step 2: Replace with `currentAbility`-derived budget**

Replace that single line with:
```php
$attrBudget = $currentAbility * 6;
```

The surrounding context (for orientation — do not change these lines) should look like:
```php
            $potential      = $this->bellCurveInt($cfg->getPlayerPotentialMin(), $cfg->getPlayerPotentialMax(), $cfg->getPlayerPotentialMean());
            $currentAbility = random_int($cfg->getPlayerAbilityMin(), $cfg->getPlayerAbilityMax());
            $age            = random_int($cfg->getPlayerAgeMin(), $cfg->getPlayerAgeMax());
            // ...
            $attrBudget = $currentAbility * 6;   // <-- changed line
            $attrs      = $this->distributeAttributes($player->getPosition(), $attrBudget);
```

- [ ] **Step 3: Verify no references to `getPlayerAttributeBudget` remain for player generation**

Run:
```bash
grep -n "getPlayerAttributeBudget" /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend/src/Service/MarketPoolService.php
```

Expected: no output (the calls were only on line 183, now replaced). If output appears, review — the `PoolConfig` getter methods themselves are fine to leave in place (used by admin UI), only the call inside `generatePlayers()` is removed.

- [ ] **Step 4: Run the backend test suite to verify nothing is broken**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend
lando php vendor/bin/phpunit --testdox 2>&1 | tail -20
```

Expected: all tests pass. No test directly covers this one-liner since the service requires full DB infrastructure, but the suite should remain green.

- [ ] **Step 5: Commit**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend
git checkout -b fix/ability-ranges-npc-player-detail
git add src/Service/MarketPoolService.php
git commit -m "fix: tie player attribute budget to currentAbility so OVR tracks ability range"
```

---

## Task 2: Remove Hardcoded AMP Ranges — `WorldInitializationService`

**Files:**
- Modify: `wunderkind-backend/src/Service/WorldInitializationService.php` (lines 34–39 and 125–126)

**Context:** The AMP player range currently uses a hardcoded `STARTER_ABILITY_RANGES` constant keyed by string tier name ('local'/'regional'/'national'/'elite'). This bypasses the admin-configured `leagueAbilityRanges` entirely. The fix reads the AMP club's actual league tier number (via `$club->getCurrentLeague()->getTier()`, which is set before `initialize()` is called) and looks it up in the same `$leagueRanges` array already loaded from `StarterConfig`.

- [ ] **Step 1: Remove the `STARTER_ABILITY_RANGES` constant**

File: `wunderkind-backend/src/Service/WorldInitializationService.php`

Delete the entire constant block (lines 34–39):
```php
    private const STARTER_ABILITY_RANGES = [
        'local'    => ['min' => 5,  'max' => 30],
        'regional' => ['min' => 20, 'max' => 45],
        'national' => ['min' => 40, 'max' => 65],
        'elite'    => ['min' => 60, 'max' => 85],
    ];
```

After deletion, the only remaining constant should be `ABILITY_RANGES` (the NPC fallback at lines 23–32), which stays untouched.

- [ ] **Step 2: Replace the AMP range lookup**

Locate the AMP starter pack section (currently around line 125 after the deletion offset):
```php
        // AMP starter pack
        $tierStr  = $starterConfig->getStarterClubTier();
        $ampRange = self::STARTER_ABILITY_RANGES[$tierStr] ?? ['min' => 5, 'max' => 30];
```

Replace those two lines with:
```php
        // AMP starter pack — use the same leagueAbilityRanges config as NPC clubs
        $ampLeagueTier = $club->getCurrentLeague()?->getTier() ?? 8;
        $ampRange      = $leagueRanges[$country][(string) $ampLeagueTier] ?? ['min' => 5, 'max' => 30];
```

The fallback `['min' => 5, 'max' => 30]` covers the edge case where the AMP's league tier has no configured range (e.g., a new country not yet in the admin config). `$leagueRanges` is already loaded at the top of `initialize()` — no new variable needed.

- [ ] **Step 3: Verify `STARTER_ABILITY_RANGES` is fully gone**

```bash
grep -n "STARTER_ABILITY_RANGES" /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend/src/Service/WorldInitializationService.php
```

Expected: no output.

- [ ] **Step 4: Run the backend test suite**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend
lando php vendor/bin/phpunit --testdox 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend
git add src/Service/WorldInitializationService.php
git commit -m "fix: derive AMP starter ability range from leagueAbilityRanges config via league tier"
```

---

## Task 3: NPC Player Tap-Through — `club/[id].tsx`

**Files:**
- Modify: `wunderkind-app/app/club/[id].tsx`

**Context:** Player rows are currently `View` components — not tappable. Wrapping each in a `Pressable` with `router.push('/player/${p.id}')` is the full change. `useUnifiedPlayer` in `player/[id].tsx` already resolves NPC players from `worldStore`, and `player/[id].tsx` already hides management sections when `isNpc = true`.

- [ ] **Step 1: Add `ChevronRight` to the lucide import**

File: `wunderkind-app/app/club/[id].tsx`

`Pressable`, `useRouter`, and `router` are already present. Only `ChevronRight` needs adding.

Find:
```tsx
import { ChevronLeft } from 'lucide-react-native';
```

Replace with:
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
```

- [ ] **Step 3: Replace the player row `View` with a `Pressable`**

Locate the player map (currently around line 117):
```tsx
          {players.map((p, i) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderBottomWidth: i < players.length - 1 ? 1 : 0,
                borderBottomColor: WK.border,
              }}
            >
              <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
                {p.firstName[0]}. {p.lastName}
              </BodyText>
              <View style={{
                backgroundColor: WK.tealDark,
                borderWidth: 1,
                borderColor: WK.border,
                paddingHorizontal: 4,
                paddingVertical: 1,
                width: 40,
                alignItems: 'center',
              }}>
                <PixelText size={6} color={WK.tealLight}>{p.position}</PixelText>
              </View>
              <VT323Text size={18} color={WK.yellow} style={{ width: 36, textAlign: 'right' }}>
                {calcOvr(p)}
              </VT323Text>
            </View>
          ))}
```

Replace with:
```tsx
          {players.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/player/${p.id}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderBottomWidth: i < players.length - 1 ? 1 : 0,
                borderBottomColor: WK.border,
              }}
            >
              <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
                {p.firstName[0]}. {p.lastName}
              </BodyText>
              <View style={{
                backgroundColor: WK.tealDark,
                borderWidth: 1,
                borderColor: WK.border,
                paddingHorizontal: 4,
                paddingVertical: 1,
                width: 40,
                alignItems: 'center',
              }}>
                <PixelText size={6} color={WK.tealLight}>{p.position}</PixelText>
              </View>
              <VT323Text size={18} color={WK.yellow} style={{ width: 36, textAlign: 'right' }}>
                {calcOvr(p)}
              </VT323Text>
              <ChevronRight size={12} color={WK.dim} style={{ marginLeft: 4 }} />
            </Pressable>
          ))}
```

Key changes:
- `View` → `Pressable` with `onPress={() => router.push('/player/${p.id}')}`
- `ChevronRight` added after the OVR text as a tappability affordance

- [ ] **Step 4: Type-check**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If any appear they will be in `club/[id].tsx` — fix before proceeding.

- [ ] **Step 5: Commit**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
git add app/club/[id].tsx
git commit -m "feat: make NPC club player rows tappable, navigate to player detail screen"
```

---

## Task 4: Regenerate Player Pool (Admin Action)

**Context:** Existing pool players were generated with random `attrBudget` values before the Task 1 fix. Their visible attributes do not correlate to their `currentAbility`. World init draws from this pool — so the fix only takes effect after the pool is wiped and regenerated with the corrected generation logic.

**Prerequisite:** Task 1 must be deployed (merged + container restarted) before running these steps.

- [ ] **Step 1: Open the EasyAdmin pool management page**

Use the Lando console to clear the existing player pool and regenerate it:

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend
# First delete all unassigned (pooled) players
lando psql -c "DELETE FROM guardian WHERE player_id IN (SELECT id FROM player WHERE club_id IS NULL);"
lando psql -c "DELETE FROM player WHERE club_id IS NULL;"
# Then regenerate the pool with the fixed generation logic
lando php bin/console app:market:generate
```

`app:market:generate` is the confirmed command for pool generation.

- [ ] **Step 2: Verify a sample player has correlated attributes**

After regeneration, sample a player from the pool and confirm `(pace + technical + vision + power + stamina + heart) / 6 ≈ currentAbility`:

```bash
lando psql -c "
SELECT
  id,
  current_ability,
  pace, technical, vision, power, stamina, heart,
  ROUND((pace + technical + vision + power + stamina + heart)::numeric / 6, 1) AS avg_attr
FROM player
WHERE club_id IS NULL
ORDER BY RANDOM()
LIMIT 5;
"
```

Expected: `avg_attr` should equal `current_ability` for every row (exact match, since `attrBudget = currentAbility * 6` with no random spread). If rows show large divergence, the old pool data may not have been fully cleared — re-run the clear step.

- [ ] **Step 3: Verify tier ranges are respected after a world init**

Trigger a world init from the app (or reset and re-init from admin). After init, query the assigned NPC players for a known tier to confirm their attributes fall within the configured range. For example, if tier 1 is configured as `{min: 75, max: 95}`:

```bash
lando psql -c "
SELECT
  p.id,
  p.current_ability,
  ROUND((p.pace + p.technical + p.vision + p.power + p.stamina + p.heart)::numeric / 6, 1) AS avg_attr
FROM player p
JOIN staff s ON s.club_id IS NOT NULL  -- players assigned to NPC clubs are deleted post-init; check snapshots instead
LIMIT 5;
"
```

> Note: `WorldInitializationService` deletes NPC players from the `player` table after building their snapshots. The snapshot data is in the world pack JSON returned to the client. You can verify ranges by inspecting the JSON response from `POST /api/world/initialize` directly in the admin or via a manual API call.

---

## PR / Branch Notes

- Backend branch: `fix/ability-ranges-npc-player-detail` (Tasks 1 + 2)
- App branch: `fix/ability-ranges-npc-player-detail` (Task 3)
- Task 4 is an admin operational step, not a code commit
- Open PRs against `master` (backend) and `master` (app) per the standard branch workflow
