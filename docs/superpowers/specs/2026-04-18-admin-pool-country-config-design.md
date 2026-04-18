# Admin: Pool Summary, Nationality Picker & Country Config

**Date:** 2026-04-18
**Status:** Approved

---

## Overview

Three independent improvements to the backend admin and one frontend change:

1. **Player admin summary** — stats panel at the top of `/admin/player`
2. **Pool config cleanup** — remove senior-player config; add nationality picker to player generation
3. **Country config** — new `enabledCountries` field on `StarterConfig`; frontend country picker respects it

All three can be implemented in parallel.

---

## Section 1: Player Admin Summary (`/admin/player`)

### Goal

A read-only summary panel rendered above the EasyAdmin player grid, always showing global counts across all players in the database (unfiltered).

### Three groups

| Group | Breakdown |
|---|---|
| By nationality | All distinct nationalities, sorted descending by count |
| By position | GK / DEF / MID / ATT |
| By age range | U16 / 16–18 / 19–21 / 22–25 / 26–30 / 30+ |

Age is computed from `dateOfBirth` to `CURRENT_DATE` in the query.

### Architecture

**`PlayerRepository` — new method**

```php
/**
 * Returns three summary maps for the player admin panel.
 * @return array{byNationality: array<string,int>, byPosition: array<string,int>, byAge: array<string,int>}
 */
public function getAdminSummary(): array
```

Implementation: three separate `COUNT` + `GROUP BY` queries (nationality, position, age bucket via `EXTRACT(YEAR FROM age(CURRENT_DATE, p.dateOfBirth))`).

Age bucket mapping (applied in PHP after the raw age-year query):
- `< 16` → `'U16'`
- `16–18` → `'16-18'`
- `19–21` → `'19-21'`
- `22–25` → `'22-25'`
- `26–30` → `'26-30'`
- `> 30` → `'30+'`

**`PlayerCrudController`** (already exists at `src/Controller/Admin/PlayerCrudController.php`)

Override the `index()` action to call `PlayerRepository::getAdminSummary()` and inject the result into response parameters:

```php
public function index(AdminContext $context): KeyValueStore|Response
{
    $summary = $this->playerRepository->getAdminSummary();
    $response = parent::index($context);
    if ($response instanceof KeyValueStore) {
        $response->set('playerSummary', $summary);
    }
    return $response;
}
```

Override the index template via `configureCrud()`:

```php
public function configureCrud(Crud $crud): Crud
{
    return $crud
        ->overrideTemplate('crud/index', 'admin/player_index.html.twig');
}
```

**`templates/admin/player_index.html.twig`**

Extends EasyAdmin's `@EasyAdmin/crud/index.html.twig`. Overrides the `content_header_wrapper` block to prepend the summary panel, then calls `{{ parent() }}` to render the normal grid.

Summary panel layout: three side-by-side cards (nationality table, position table, age-range table) using the existing admin CSS classes from other templates.

### Files modified

| File | Change |
|---|---|
| `src/Repository/PlayerRepository.php` | Add `getAdminSummary()` |
| `src/Controller/Admin/PlayerCrudController.php` | Inject `PlayerRepository`; override `index()` and `configureCrud()` |
| `templates/admin/player_index.html.twig` | New file — extends base index, prepends summary panel |

---

## Section 2: Pool Config — Senior Players Removal + Nationality Picker

### 2a. Remove Senior Players config

**`PoolConfig` entity** — remove fields:
- `seniorPlayerAgeMin`, `seniorPlayerAgeMax`
- `seniorPlayerAbilityMin`, `seniorPlayerAbilityMax`
- `poolTargetSeniorPlayers`

Generate a Doctrine migration to drop these columns.

**`templates/admin/pool_config.html.twig`** — remove the entire "Senior Players" form section and its associated target row in the pool status display.

**`MarketPoolService`** — remove the `generateSeniorPlayers()` method and any calls to it from `replenishPool()` and `forceGenerate()`.

### 2b. Nationality picker

**`templates/admin/pool_config.html.twig`** — inside the existing "Player — Age & Core Stats" section, add a `<select name="nationality">` immediately above the "Generate Players" button:

```html
<select name="nationality" class="form-select form-select-sm">
  <option value="">Random (mixed)</option>
  <!-- options sorted alphabetically -->
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
```

**`DashboardController::adminPoolGenerate()`** — read the nationality parameter:

```php
$nationality = $request->request->get('nationality', '') ?: null;
// pass to service
$this->marketPoolService->forceGenerate($count, $type, $nationality);
```

**`MarketPoolService::generatePlayers()`** — add `?string $nationality = null` parameter. When non-null, every player in the batch gets that nationality instead of a random pick:

```php
private function generatePlayers(int $count, ?string $nationality = null): void
{
    for ($i = 0; $i < $count; $i++) {
        $nat = $nationality ?? $this->randomNationality();
        // ... rest of generation unchanged
    }
}
```

The `forceGenerate()` public method signature gains `?string $nationality = null` and passes it through to `generatePlayers()`. For non-player types (coaches, scouts, etc.) the nationality parameter is silently ignored.

### Files modified

| File | Change |
|---|---|
| `src/Entity/PoolConfig.php` | Remove 5 senior-player fields + getters/setters |
| `src/Service/MarketPoolService.php` | Remove `generateSeniorPlayers()`; add `?string $nationality` to `generatePlayers()` and `forceGenerate()` |
| `src/Controller/Admin/DashboardController.php` | Read `nationality` param and pass to service |
| `templates/admin/pool_config.html.twig` | Remove senior-player section; add nationality `<select>` |
| `migrations/VersionXXX.php` | Drop 5 senior-player columns |

---

## Section 3: Country Config in StarterConfig

### Goal

The admin can configure which `ClubCountryCode` values are available to players when creating a new club. Defaults to `['EN']`. The frontend country picker in `OnboardingScreen` renders only the enabled countries.

### Backend

**`StarterConfig` entity** — new field:

```php
#[ORM\Column(type: 'json')]
private array $enabledCountries = ['EN'];

public function getEnabledCountries(): array { return $this->enabledCountries; }
public function setEnabledCountries(array $countries): void { $this->enabledCountries = $countries; }
```

Doctrine migration to add the `enabled_countries` JSON column with default `'["EN"]'`.

**`DashboardController::adminStarterConfigSave()`** — read the posted country checkboxes:

```php
$enabledCountries = $request->request->all('enabledCountries') ?: ['EN'];
$config->setEnabledCountries($enabledCountries);
```

**`templates/admin/starter_config.html.twig`** — new "Country Config" section at the bottom of the form, before the submit button. Renders a checkbox group using the full `CLUB_COUNTRIES` constant (hard-coded in the template since this is backend-only):

```twig
<div class="card mb-3">
  <div class="card-header">Country Config</div>
  <div class="card-body">
    <p class="text-muted small">Controls which countries are available when a player creates a new club. Only enable countries with complete league and club data.</p>
    {% set allCountries = [
      {code: 'EN', label: 'England 🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
      {code: 'IT', label: 'Italy 🇮🇹'},
      {code: 'DE', label: 'Germany 🇩🇪'},
      {code: 'ES', label: 'Spain 🇪🇸'},
      {code: 'BR', label: 'Brazil 🇧🇷'},
      {code: 'AR', label: 'Argentina 🇦🇷'},
      {code: 'NL', label: 'Netherlands 🇳🇱'}
    ] %}
    {% for country in allCountries %}
      <div class="form-check">
        <input class="form-check-input" type="checkbox"
               name="enabledCountries[]"
               value="{{ country.code }}"
               id="country_{{ country.code }}"
               {% if country.code in config.enabledCountries %}checked{% endif %}>
        <label class="form-check-label" for="country_{{ country.code }}">
          {{ country.label }}
        </label>
      </div>
    {% endfor %}
  </div>
</div>
```

**Backend API — `StarterConfigController`** (or wherever `/api/starter-config` is handled) — add `enabledCountries` to the JSON response:

```php
return $this->json([
    // ... existing fields ...
    'enabledCountries' => $config->getEnabledCountries(),
]);
```

### Frontend

**`src/types/api.ts` — `StarterConfig` interface** — add:

```ts
enabledCountries: string[]; // ClubCountryCode[]
```

**`src/hooks/useAuthFlow.ts`** — move `fetchStarterConfig()` out of `registerClub()` and into a `useEffect` that runs at init alongside other startup fetches. Expose `enabledCountries` in the hook's return value, defaulting to `['EN']` before the fetch resolves.

```ts
const [enabledCountries, setEnabledCountries] = useState<string[]>(['EN']);

useEffect(() => {
  fetchStarterConfig()
    .then((cfg) => setEnabledCountries(cfg.enabledCountries ?? ['EN']))
    .catch(() => {}); // keep default on failure
}, []);

// return includes:
return { isReady, isOnboarding, registerClub, enabledCountries, ... };
```

Inside `registerClub()`, `fetchStarterConfig()` is still called for the other config values (balance, player counts, etc.) — only `enabledCountries` is moved to the early fetch.

**`app/_layout.tsx`** — pass `enabledCountries` from `useAuthFlow` to `OnboardingScreen`:

```tsx
const { isReady, isOnboarding, registerClub, enabledCountries, ... } = useAuthFlow();
// ...
<OnboardingScreen
  onRegister={registerClub}
  enabledCountries={enabledCountries}
/>
```

**`src/components/OnboardingScreen.tsx`** — accept `enabledCountries: string[]` prop; filter `CLUB_COUNTRIES` before rendering the country picker:

```ts
interface OnboardingScreenProps {
  onRegister: (...) => Promise<void>;
  enabledCountries: string[];
}
```

```tsx
const availableCountries = CLUB_COUNTRIES.filter((c) =>
  enabledCountries.includes(c.code)
);
// Use availableCountries everywhere CLUB_COUNTRIES was used in the country-picker step
// (randomiseCountry also picks from availableCountries)
```

If `enabledCountries` has only one entry, the country step of onboarding can auto-select it and skip rendering the picker entirely (UX improvement — no point showing a one-item list).

### Files modified

| File | Change |
|---|---|
| `wunderkind-backend/src/Entity/StarterConfig.php` | Add `enabledCountries` field |
| `wunderkind-backend/migrations/VersionXXX.php` | Add `enabled_countries` column |
| `wunderkind-backend/src/Controller/...` (starter-config API) | Add `enabledCountries` to JSON response |
| `wunderkind-backend/src/Controller/Admin/DashboardController.php` | Read + persist `enabledCountries` in save handler |
| `wunderkind-backend/templates/admin/starter_config.html.twig` | Add Country Config checkbox section |
| `src/types/api.ts` | Add `enabledCountries` to `StarterConfig` |
| `src/hooks/useAuthFlow.ts` | Early-fetch enabled countries; expose in return |
| `app/_layout.tsx` | Pass `enabledCountries` to `OnboardingScreen` |
| `src/components/OnboardingScreen.tsx` | Filter country picker by `enabledCountries` |

---

## Out of Scope

- Adding new countries to `CLUB_COUNTRIES` (that requires league/club data to exist first)
- Per-country pool generation targets
- Player admin summary respecting EasyAdmin filters (always global)
- Senior player generation via any other path
