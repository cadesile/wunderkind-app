# Admin Backend Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a player stats summary panel to `/admin/player`, remove senior-player pool config, and add a nationality picker to the player generation form.

**Architecture:** Three independent backend changes — a new `PlayerRepository` query method injected into the existing `PlayerCrudController` with a custom Twig template override; removal of five `PoolConfig` entity fields with a Doctrine migration; and a `?string $nationality` parameter threaded from the admin form through `DashboardController` to `MarketPoolService::generatePlayers()`.

**Tech Stack:** PHP 8.4, Symfony 6, Doctrine ORM, PostgreSQL 16, EasyAdmin v4, Twig, Lando. All PHP commands run inside the Lando container (`lando php ...`).

---

## File Map

| File | Action |
|---|---|
| `src/Repository/PlayerRepository.php` | Add `getAdminSummary()` |
| `src/Controller/Admin/PlayerCrudController.php` | Inject `PlayerRepository`; override `configureCrud()` + `index()` |
| `templates/admin/player_index.html.twig` | New — extends EasyAdmin base index; prepends summary panel |
| `src/Entity/PoolConfig.php` | Remove 5 senior-player fields + their getters/setters |
| `migrations/VersionXXX.php` | Generated — drops 5 senior-player columns |
| `src/Service/MarketPoolService.php` | Remove `generateSeniorPlayers()`; add `?string $nationality` to `generatePlayers()` + `forceGeneratePool()` |
| `src/Controller/Admin/DashboardController.php` | Read `nationality` from request; pass to `forceGeneratePool()` |
| `templates/admin/pool_config.html.twig` | Remove senior-player section; add nationality `<select>` |

---

## Task 1: `PlayerRepository::getAdminSummary()`

**Files:**
- Modify: `wunderkind-backend/src/Repository/PlayerRepository.php`

- [ ] **Step 1: Add the method**

Open `src/Repository/PlayerRepository.php` and append before the final `}`:

```php
/**
 * Returns three summary maps for the player admin panel.
 * Age buckets are computed in PHP from dateOfBirth to avoid PostgreSQL-specific DQL.
 *
 * @return array{byNationality: array<string,int>, byPosition: array<string,int>, byAge: array<string,int>}
 */
public function getAdminSummary(): array
{
    // ── By nationality ────────────────────────────────────────────────────
    $natRows = $this->createQueryBuilder('p')
        ->select('p.nationality AS nationality, COUNT(p.id) AS cnt')
        ->groupBy('p.nationality')
        ->orderBy('cnt', 'DESC')
        ->getQuery()
        ->getResult();

    $byNationality = [];
    foreach ($natRows as $row) {
        $byNationality[(string) $row['nationality']] = (int) $row['cnt'];
    }

    // ── By position ───────────────────────────────────────────────────────
    $posRows = $this->createQueryBuilder('p')
        ->select('p.position AS position, COUNT(p.id) AS cnt')
        ->groupBy('p.position')
        ->getQuery()
        ->getResult();

    $byPosition = [];
    foreach ($posRows as $row) {
        $pos = $row['position'] instanceof \App\Enum\PlayerPosition
            ? $row['position']->value
            : (string) $row['position'];
        $byPosition[$pos] = (int) $row['cnt'];
    }

    // ── By age range (computed in PHP) ────────────────────────────────────
    $dobRows = $this->createQueryBuilder('p')
        ->select('p.dateOfBirth AS dob')
        ->getQuery()
        ->getArrayResult();

    $byAge = ['U16' => 0, '16-18' => 0, '19-21' => 0, '22-25' => 0, '26-30' => 0, '30+' => 0];
    $now   = new \DateTimeImmutable();

    foreach ($dobRows as $row) {
        $dob = $row['dob'];
        if (!$dob instanceof \DateTimeInterface) {
            continue;
        }
        $age    = (int) $dob->diff($now)->y;
        $bucket = match (true) {
            $age < 16   => 'U16',
            $age <= 18  => '16-18',
            $age <= 21  => '19-21',
            $age <= 25  => '22-25',
            $age <= 30  => '26-30',
            default     => '30+',
        };
        $byAge[$bucket]++;
    }

    return compact('byNationality', 'byPosition', 'byAge');
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
lando php bin/console cache:clear
```

Expected: `[OK] Cache for the "dev" environment (debug=true) was successfully cleared.`

- [ ] **Step 3: Commit**

```bash
git add src/Repository/PlayerRepository.php
git commit -m "feat: add getAdminSummary() to PlayerRepository"
```

---

## Task 2: `PlayerCrudController` — inject stats + override template

**Files:**
- Modify: `wunderkind-backend/src/Controller/Admin/PlayerCrudController.php`

The existing controller extends `AbstractCrudController`. You need to:
1. Inject `PlayerRepository` via constructor
2. Override `configureCrud()` to point to a custom template
3. Override `index()` to inject the summary stats

- [ ] **Step 1: Add imports and inject PlayerRepository**

At the top of the file, ensure these use statements exist (add any missing ones):

```php
use App\Repository\PlayerRepository;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Collection\KeyValueStore;
use Symfony\Component\HttpFoundation\Response;
```

Add the constructor (or extend the existing one) to inject `PlayerRepository`:

```php
public function __construct(
    private readonly PlayerRepository $playerRepository,
) {}
```

- [ ] **Step 2: Override `configureCrud()` to use the custom index template**

Add this method to the class (or extend the existing `configureCrud()` if one exists):

```php
public function configureCrud(Crud $crud): Crud
{
    return parent::configureCrud($crud)
        ->overrideTemplate('crud/index', 'admin/player_index.html.twig');
}
```

- [ ] **Step 3: Override `index()` to inject summary data**

Add this method to the class:

```php
public function index(AdminContext $context): KeyValueStore|Response
{
    $responseParameters = parent::index($context);
    if ($responseParameters instanceof KeyValueStore) {
        $responseParameters->set('playerSummary', $this->playerRepository->getAdminSummary());
    }
    return $responseParameters;
}
```

- [ ] **Step 4: Verify**

```bash
lando php bin/console cache:clear
```

Navigate to `/admin/player` in the browser. Expected: page loads without errors (template doesn't exist yet, so you may see a Twig error — that's fine, Task 3 creates it).

- [ ] **Step 5: Commit**

```bash
git add src/Controller/Admin/PlayerCrudController.php
git commit -m "feat: inject PlayerRepository into PlayerCrudController; override index and configureCrud"
```

---

## Task 3: `player_index.html.twig` — summary panel

**Files:**
- Create: `wunderkind-backend/templates/admin/player_index.html.twig`

- [ ] **Step 1: Create the template**

```bash
touch templates/admin/player_index.html.twig
```

- [ ] **Step 2: Write the template**

```twig
{% extends '@EasyAdmin/crud/index.html.twig' %}

{% block content_header_wrapper %}
    <div class="row g-3 mb-4">

        {# ── By Nationality ── #}
        <div class="col-lg-5">
            <div class="card h-100">
                <div class="card-header fw-semibold">Players by Nationality</div>
                <div class="card-body p-0" style="max-height: 260px; overflow-y: auto;">
                    <table class="table table-sm table-hover mb-0">
                        <tbody>
                            {% for nationality, count in playerSummary.byNationality %}
                                <tr>
                                    <td>{{ nationality }}</td>
                                    <td class="text-end fw-bold">{{ count }}</td>
                                </tr>
                            {% else %}
                                <tr><td colspan="2" class="text-muted text-center">No players</td></tr>
                            {% endfor %}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {# ── By Position ── #}
        <div class="col-lg-3">
            <div class="card h-100">
                <div class="card-header fw-semibold">By Position</div>
                <div class="card-body">
                    {% set posOrder = ['GK', 'DEF', 'MID', 'ATT'] %}
                    {% for pos in posOrder %}
                        <div class="d-flex justify-content-between py-1 border-bottom">
                            <span class="text-muted">{{ pos }}</span>
                            <strong>{{ playerSummary.byPosition[pos] ?? 0 }}</strong>
                        </div>
                    {% endfor %}
                </div>
            </div>
        </div>

        {# ── By Age Range ── #}
        <div class="col-lg-4">
            <div class="card h-100">
                <div class="card-header fw-semibold">By Age Range</div>
                <div class="card-body">
                    {% for range, count in playerSummary.byAge %}
                        <div class="d-flex justify-content-between py-1 border-bottom">
                            <span class="text-muted">{{ range }}</span>
                            <strong>{{ count }}</strong>
                        </div>
                    {% endfor %}
                </div>
            </div>
        </div>

    </div>
    {{ parent() }}
{% endblock %}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/admin/player`. Expected: three stat cards appear above the player grid. If the player database is empty, counts will be zero — that's correct.

- [ ] **Step 4: Commit**

```bash
git add templates/admin/player_index.html.twig
git commit -m "feat: add player summary panel (nationality / position / age) to admin player list"
```

---

## Task 4: Remove senior-player fields from `PoolConfig`

**Files:**
- Modify: `wunderkind-backend/src/Entity/PoolConfig.php`

- [ ] **Step 1: Remove the five senior-player properties and their accessors**

In `src/Entity/PoolConfig.php`, delete the following properties and all their getter/setter methods:

```
$seniorPlayerAgeMin
$seniorPlayerAgeMax
$seniorPlayerAbilityMin
$seniorPlayerAbilityMax
$seniorPlayerPoolTarget
```

Search for the `// ── Senior Player Generation` comment block and delete from there through the last senior-player setter (5 properties × 2 methods each = 10 methods to delete).

- [ ] **Step 2: Verify the entity parses correctly**

```bash
lando php bin/console doctrine:schema:validate
```

Expected: `[FAIL]` on the mapping check (because the DB still has the columns) but `[OK]` on the PHP side — this is expected at this stage.

- [ ] **Step 3: Commit**

```bash
git add src/Entity/PoolConfig.php
git commit -m "refactor: remove senior-player fields from PoolConfig entity"
```

---

## Task 5: Doctrine migration — drop senior-player columns

**Files:**
- Create: `wunderkind-backend/migrations/VersionXXX.php` (auto-generated)

- [ ] **Step 1: Generate the migration**

```bash
lando php bin/console doctrine:migrations:diff
```

Expected: `Generated new migration class to ".../migrations/VersionXXXXXXXXXXXXXX.php"`

- [ ] **Step 2: Inspect the generated file**

Open the generated migration file. Verify the `up()` method drops exactly these 5 columns from `pool_config`:
- `senior_player_age_min`
- `senior_player_age_max`
- `senior_player_ability_min`
- `senior_player_ability_max`
- `senior_player_pool_target`

And the `down()` method re-adds them. If the migration contains anything else, investigate before proceeding.

- [ ] **Step 3: Run the migration**

```bash
lando php bin/console doctrine:migrations:migrate --no-interaction
```

Expected: `[notice] Migrating up to DoctrineMigrations\VersionXXX`

- [ ] **Step 4: Verify schema is clean**

```bash
lando php bin/console doctrine:schema:validate
```

Expected: both `[OK]` lines — mapping valid, schema in sync.

- [ ] **Step 5: Commit**

```bash
git add migrations/
git commit -m "chore: migration — drop senior-player columns from pool_config"
```

---

## Task 6: `MarketPoolService` — remove senior generation + add nationality param

**Files:**
- Modify: `wunderkind-backend/src/Service/MarketPoolService.php`

- [ ] **Step 1: Remove `generateSeniorPlayers()`**

Search for the method `generateSeniorPlayers` (it's the method that creates players with the `SENIOR_INTAKE` recruitment source or uses the `seniorPlayer*` PoolConfig values). Delete the entire method body.

Also remove any call to `generateSeniorPlayers()` inside `replenishPool()` — search for `generateSeniorPlayers` and remove all call sites.

- [ ] **Step 2: Add `?string $nationality` to `generatePlayers()`**

Find the `generatePlayers(int $count)` private method signature. Change it to:

```php
private function generatePlayers(int $count, ?string $nationality = null): void
```

Inside the method body, find where the player's nationality is randomly assigned. It will look something like:

```php
$nationality = $this->nationalities[array_rand($this->nationalities)];
// or
$nat = $nationalities[array_rand($nationalities)];
```

Replace that line with:

```php
$nat = $nationality ?? $this->nationalities[array_rand($this->nationalities)];
```

Then ensure the rest of the method uses `$nat` (or the variable you renamed) wherever the player nationality is set on the entity.

- [ ] **Step 3: Add `?string $nationality` to `forceGeneratePool()`**

Find the `forceGeneratePool(int $count, string $type)` public method. Change its signature to:

```php
public function forceGeneratePool(int $count, string $type, ?string $nationality = null): void
```

Inside the method body, find the `case 'player':` (or equivalent) branch that calls `generatePlayers()`. Pass through the nationality:

```php
// Before:
$this->generatePlayers($count);

// After:
$this->generatePlayers($count, $nationality);
```

For all other `$type` branches (coach, scout, agent, etc.), the `$nationality` parameter is silently ignored — no change needed there.

- [ ] **Step 4: Verify**

```bash
lando php bin/console cache:clear
```

Expected: no errors. Navigate to `/admin?routeName=admin_pool_config` and confirm the page still loads.

- [ ] **Step 5: Commit**

```bash
git add src/Service/MarketPoolService.php
git commit -m "feat: remove senior-player generation from MarketPoolService; add nationality param to generatePlayers"
```

---

## Task 7: Controller + template — nationality picker UI

**Files:**
- Modify: `wunderkind-backend/src/Controller/Admin/DashboardController.php`
- Modify: `wunderkind-backend/templates/admin/pool_config.html.twig`

### 7a. DashboardController — read nationality from request

- [ ] **Step 1: Find the `generatePool` action**

Open `src/Controller/Admin/DashboardController.php` and find the method with `#[Route('/admin/pool/generate', ...)]` (or similar — it's the action called when the admin clicks "Force Add Batch").

- [ ] **Step 2: Read the nationality param and pass to service**

Inside that method, find the line that calls `$this->marketPoolService->forceGeneratePool(...)`. Add the nationality read immediately before it and pass it through:

```php
$nationality = $request->request->getString('nationality') ?: null;
$this->marketPoolService->forceGeneratePool($count, $type, $nationality);
```

(The existing `$count` and `$type` variables are already read from the request earlier in the method — do not change those.)

- [ ] **Step 3: Commit the controller change**

```bash
git add src/Controller/Admin/DashboardController.php
git commit -m "feat: pass nationality from pool generate request to MarketPoolService"
```

### 7b. pool_config.html.twig — remove senior section + add nationality select

- [ ] **Step 4: Remove the senior-player section**

Open `templates/admin/pool_config.html.twig`. Search for any of these strings and delete the surrounding form section (input fields and their labels/wrappers):

- `senior_player_age_min` / `seniorPlayerAgeMin`
- `senior_player_age_max` / `seniorPlayerAgeMax`
- `senior_player_ability_min` / `seniorPlayerAbilityMin`
- `senior_player_ability_max` / `seniorPlayerAbilityMax`
- `senior_player_pool_target` / `seniorPlayerPoolTarget`

Also remove the senior-player row from the pool status display (the progress bar section at the top of the page).

- [ ] **Step 5: Add nationality `<select>` above the player generate button**

Find the "Player — Age & Core Stats" section (or the section containing the player generation form / "Force Add" button for players). Immediately above the generate button for players, insert:

```html
<div class="mb-2">
    <label for="poolNationality" class="form-label form-label-sm">Nationality</label>
    <select id="poolNationality" name="nationality" class="form-select form-select-sm">
        <option value="">Random (mixed)</option>
        <option value="American">American</option>
        <option value="Argentine">Argentine</option>
        <option value="Austrian">Austrian</option>
        <option value="Belgian">Belgian</option>
        <option value="Brazilian">Brazilian</option>
        <option value="Canadian">Canadian</option>
        <option value="Colombian">Colombian</option>
        <option value="Croatian">Croatian</option>
        <option value="Danish">Danish</option>
        <option value="Dutch">Dutch</option>
        <option value="Emirati">Emirati</option>
        <option value="English">English</option>
        <option value="French">French</option>
        <option value="German">German</option>
        <option value="Italian">Italian</option>
        <option value="Japanese">Japanese</option>
        <option value="Mexican">Mexican</option>
        <option value="Norwegian">Norwegian</option>
        <option value="Portuguese">Portuguese</option>
        <option value="Saudi">Saudi</option>
        <option value="South Korean">South Korean</option>
        <option value="Spanish">Spanish</option>
        <option value="Swedish">Swedish</option>
        <option value="Swiss">Swiss</option>
        <option value="Turkish">Turkish</option>
        <option value="Uruguayan">Uruguayan</option>
    </select>
    <div class="form-text">Leave as "Random" to generate mixed nationalities.</div>
</div>
```

Make sure this `<select>` is inside the same `<form>` element that submits to the pool generate endpoint, so the `nationality` field is included in the POST payload.

- [ ] **Step 6: Verify end-to-end**

1. Navigate to `/admin?routeName=admin_pool_config`
2. Confirm the senior-player section is gone
3. Select "English" from the nationality dropdown
4. Click the player generate button
5. Check the generated players in `/admin/player` — all new players should have nationality "English"

- [ ] **Step 7: Commit**

```bash
git add templates/admin/pool_config.html.twig
git commit -m "feat: remove senior-player UI; add nationality picker to player generation"
```
