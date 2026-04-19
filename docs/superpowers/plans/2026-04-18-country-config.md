# Country Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `enabledCountries` to `StarterConfig` so the admin can control which countries are available in the `OnboardingScreen` country picker; default to `['EN']` (England only).

**Architecture:** New JSON column on the `StarterConfig` entity (backend), surfaced via the existing `/api/starter-config` endpoint, early-fetched in `useAuthFlow` on app init so it is available before the country picker renders. The `OnboardingScreen` filters `CLUB_COUNTRIES` by the enabled list; if only one country is enabled it auto-selects and skips the picker step.

**Tech Stack:** Symfony 7 / Doctrine ORM / Twig (backend); TypeScript / React Native / Zustand (frontend)

---

## File Map

| File | Change |
|---|---|
| `wunderkind-backend/src/Entity/StarterConfig.php` | Add `enabledCountries` field + getter/setter |
| `wunderkind-backend/migrations/VersionXXX.php` | Add `enabled_countries` JSON column, default `["EN"]` |
| `wunderkind-backend/src/Controller/Api/StarterConfigController.php` | Add `enabledCountries` to JSON response |
| `wunderkind-backend/src/Controller/Admin/DashboardController.php` | Read + persist `enabledCountries` checkboxes in `saveStarterConfig` |
| `wunderkind-backend/templates/admin/starter_config.html.twig` | Add Country Config checkbox section |
| `src/types/api.ts` | Add `enabledCountries: string[]` to `StarterConfig` interface |
| `src/hooks/useAuthFlow.ts` | Early-fetch `enabledCountries` in `useEffect`; expose in return value |
| `app/_layout.tsx` | Destructure + pass `enabledCountries` to `OnboardingScreen` |
| `src/components/OnboardingScreen.tsx` | Accept `enabledCountries` prop; filter country list; auto-select if one |

---

## Task 1: `StarterConfig` entity — add `enabledCountries` field

**Files:**
- Modify: `wunderkind-backend/src/Entity/StarterConfig.php`

- [ ] **Step 1: Add the field, getter, and setter to the entity**

  Open `wunderkind-backend/src/Entity/StarterConfig.php`. After the `$npcSquadConfig` property (line ~71), add:

  ```php
  /**
   * Country codes (ClubCountryCode values) available to players at club creation.
   * Default: ['EN'] — England only.
   */
  #[ORM\Column(type: 'json')]
  private array $enabledCountries = ['EN'];
  ```

  After the `getNpcSquadConfigJson` / `setNpcSquadConfigJson` methods, add:

  ```php
  public function getEnabledCountries(): array { return $this->enabledCountries; }
  public function setEnabledCountries(array $v): static { $this->enabledCountries = $v; return $this; }
  ```

- [ ] **Step 2: Verify the entity loads without errors**

  ```bash
  cd wunderkind-backend
  lando php bin/console doctrine:schema:validate --skip-sync
  ```

  Expected: `[Mapping] OK` (schema sync will fail until migration runs — that's fine).

- [ ] **Step 3: Commit**

  ```bash
  git add wunderkind-backend/src/Entity/StarterConfig.php
  git commit -m "feat: add enabledCountries field to StarterConfig entity"
  ```

---

## Task 2: Doctrine migration — add `enabled_countries` column

**Files:**
- Create: `wunderkind-backend/migrations/VersionYYYYMMDDHHMMSS.php` (generated)

- [ ] **Step 1: Generate the migration**

  ```bash
  cd wunderkind-backend
  lando php bin/console doctrine:migrations:diff
  ```

  This creates a new file in `migrations/`. Open it and verify:
  - `up()` adds an `enabled_countries` JSON column with `DEFAULT '["EN"]'`
  - `down()` drops the column

  The generated SQL for PostgreSQL should look like:
  ```sql
  ALTER TABLE starter_config ADD enabled_countries JSON NOT NULL DEFAULT '["EN"]';
  ```

  If the `DEFAULT` clause is missing from the generated migration, add it manually by editing the `up()` method.

- [ ] **Step 2: Run the migration**

  ```bash
  lando php bin/console doctrine:migrations:migrate --no-interaction
  ```

  Expected: migration applied, no errors.

- [ ] **Step 3: Verify the column exists**

  ```bash
  lando psql -c "SELECT enabled_countries FROM starter_config LIMIT 1;"
  ```

  Expected: `["EN"]`

- [ ] **Step 4: Commit**

  ```bash
  git add wunderkind-backend/migrations/
  git commit -m "feat: migration — add enabled_countries column to starter_config"
  ```

---

## Task 3: `StarterConfigController` — expose `enabledCountries` in API response

**Files:**
- Modify: `wunderkind-backend/src/Controller/Api/StarterConfigController.php`

Current `index()` returns:
```php
return $this->json([
    'startingBalance'    => $config->getStartingBalance(),
    'starterPlayerCount' => $config->getStarterPlayerCount(),
    'starterCoachCount'  => $config->getStarterCoachCount(),
    'starterScoutCount'  => $config->getStarterScoutCount(),
    'starterSponsorTier' => $config->getStarterSponsorTier(),
    'starterClubTier'    => $config->getStarterClubTier(),
]);
```

- [ ] **Step 1: Add `enabledCountries` to the response**

  Add one line to the array:

  ```php
  return $this->json([
      'startingBalance'    => $config->getStartingBalance(),
      'starterPlayerCount' => $config->getStarterPlayerCount(),
      'starterCoachCount'  => $config->getStarterCoachCount(),
      'starterScoutCount'  => $config->getStarterScoutCount(),
      'starterSponsorTier' => $config->getStarterSponsorTier(),
      'starterClubTier'    => $config->getStarterClubTier(),
      'enabledCountries'   => $config->getEnabledCountries(),
  ]);
  ```

- [ ] **Step 2: Verify the endpoint returns the new field**

  ```bash
  curl http://wunderkind.lndo.site/api/starter-config
  ```

  Expected JSON includes `"enabledCountries":["EN"]`.

- [ ] **Step 3: Commit**

  ```bash
  git add wunderkind-backend/src/Controller/Api/StarterConfigController.php
  git commit -m "feat: include enabledCountries in /api/starter-config response"
  ```

---

## Task 4: Admin UI — save handler + checkbox section

**Files:**
- Modify: `wunderkind-backend/src/Controller/Admin/DashboardController.php`
- Modify: `wunderkind-backend/templates/admin/starter_config.html.twig`

- [ ] **Step 1: Update `saveStarterConfig` to persist `enabledCountries`**

  In `DashboardController.php`, find `saveStarterConfig` (around line 192). After the existing `setNpcSquadConfigJson` call (around line 208), add:

  ```php
  $enabledCountries = $request->request->all('enabledCountries') ?: ['EN'];
  $config->setEnabledCountries($enabledCountries);
  ```

  The full method after the change looks like:

  ```php
  public function saveStarterConfig(Request $request): Response
  {
      if (!$this->isCsrfTokenValid('save_starter_config', $request->request->get('_token'))) {
          $this->addFlash('danger', 'Invalid CSRF token.');
          return $this->redirect($this->generateUrl('admin', ['routeName' => 'admin_starter_config']));
      }

      $config = $this->starterConfigRepository->getConfig();
      $config->setStartingBalance((int) $request->request->get('startingBalance', 5_000_000));
      $config->setStarterPlayerCount((int) $request->request->get('starterPlayerCount', 5));
      $config->setStarterCoachCount((int) $request->request->get('starterCoachCount', 1));
      $config->setStarterScoutCount((int) $request->request->get('starterScoutCount', 1));
      $config->setStarterSponsorTier($request->request->get('starterSponsorTier', 'SMALL'));
      $config->setStarterClubTier($request->request->get('starterClubTier', 'local'));

      $config->setDefaultFacilitiesJson($request->request->get('defaultFacilities', '{}'));
      $config->setNpcSquadConfigJson($request->request->get('npcSquadConfig', '{}'));

      $reputationTierValue = $request->request->get('starterReputationTier', 'local');
      $reputationTier      = ReputationTier::tryFrom($reputationTierValue) ?? ReputationTier::LOCAL;
      $config->setStarterReputationTier($reputationTier);

      $enabledCountries = $request->request->all('enabledCountries') ?: ['EN'];
      $config->setEnabledCountries($enabledCountries);

      $this->em->persist($config);
      $this->em->flush();

      $this->addFlash('success', 'Starter config saved.');
      return $this->redirect($this->generateUrl('admin', ['routeName' => 'admin_starter_config']));
  }
  ```

- [ ] **Step 2: Add the Country Config card to `starter_config.html.twig`**

  Find the closing `</div>` of the form body just before the submit button (around line 110). Insert the following card **before** the `<div class="mt-4">` submit button block:

  ```twig
  <div class="card mt-3">
      <div class="card-header py-2 d-flex align-items-center gap-2">
          <i class="fa fa-globe text-muted"></i>
          <span class="fw-semibold small">Country Config</span>
      </div>
      <div class="card-body">
          <p class="text-muted small mb-3">Controls which countries are available when a player creates a new club. Only enable countries with complete league and club data.</p>
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

- [ ] **Step 3: Verify in browser**

  Navigate to `http://wunderkind.lndo.site/admin?routeName=admin_starter_config`. The Country Config card should appear at the bottom with England pre-checked. Check another country (e.g. Italy), save, reload — Italy should now be checked alongside England.

- [ ] **Step 4: Verify the API reflects the change**

  ```bash
  curl http://wunderkind.lndo.site/api/starter-config
  ```

  Expected: `"enabledCountries":["EN","IT"]` (or whatever you saved).

  Reset England-only before committing:
  ```bash
  # Re-check only England in the admin form and save
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add wunderkind-backend/src/Controller/Admin/DashboardController.php
  git add wunderkind-backend/templates/admin/starter_config.html.twig
  git commit -m "feat: admin country config UI — enabledCountries checkboxes + save handler"
  ```

---

## Task 5: Frontend type — add `enabledCountries` to `StarterConfig`

**Files:**
- Modify: `src/types/api.ts`

- [ ] **Step 1: Add the field to the `StarterConfig` interface**

  Current interface (lines 8–16):
  ```ts
  export interface StarterConfig {
    startingBalance: number;
    starterPlayerCount: number;
    starterCoachCount: number;
    starterScoutCount: number;
    starterSponsorTier: string;
    starterClubTier: string;
  }
  ```

  Updated interface:
  ```ts
  export interface StarterConfig {
    startingBalance: number;
    starterPlayerCount: number;
    starterCoachCount: number;
    starterScoutCount: number;
    starterSponsorTier: string;
    /** Default club tier for new academies e.g. 'local' | 'regional' | 'national' | 'elite' */
    starterClubTier: string;
    /** ClubCountryCode values available in the country picker. Defaults to ['EN'] if absent. */
    enabledCountries?: string[];
  }
  ```

  The field is optional (`?`) so existing callers do not break if a cached/old API response omits it.

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/types/api.ts
  git commit -m "feat: add enabledCountries to StarterConfig type"
  ```

---

## Task 6: `useAuthFlow` — early-fetch `enabledCountries`, expose in return

**Files:**
- Modify: `src/hooks/useAuthFlow.ts`

The hook currently exports:
```ts
export interface AuthFlowResult {
  isReady: boolean;
  isOnboarding: boolean;
  registerClub: (clubName: string, country: ClubCountryCode, managerProfile: ManagerProfile) => Promise<void>;
  showWelcomeSplash: boolean;
  dismissWelcomeSplash: () => void;
}
```

We add `enabledCountries: string[]` to the return, fetched once at init time.

- [ ] **Step 1: Add state + early `useEffect` fetch**

  In `useAuthFlow.ts`, after the existing state declarations (around line 214–216):

  ```ts
  const [isReady, setIsReady] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false);
  ```

  Add:

  ```ts
  const [enabledCountries, setEnabledCountries] = useState<string[]>(['EN']);
  ```

  Then, after the existing `useEffect` (the `initialize()` one, which ends around line 301), add a new `useEffect`:

  ```ts
  useEffect(() => {
    fetchStarterConfig()
      .then((cfg) => setEnabledCountries(cfg.enabledCountries ?? ['EN']))
      .catch(() => {}); // keep default ['EN'] on failure
  }, []);
  ```

- [ ] **Step 2: Update `AuthFlowResult` interface and return value**

  Update the interface:

  ```ts
  export interface AuthFlowResult {
    isReady: boolean;
    isOnboarding: boolean;
    registerClub: (clubName: string, country: ClubCountryCode, managerProfile: ManagerProfile) => Promise<void>;
    showWelcomeSplash: boolean;
    dismissWelcomeSplash: () => void;
    enabledCountries: string[];
  }
  ```

  Update the return statement at the bottom of `useAuthFlow`:

  ```ts
  return {
    isReady,
    isOnboarding,
    registerClub,
    showWelcomeSplash,
    dismissWelcomeSplash: () => setShowWelcomeSplash(false),
    enabledCountries,
  };
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/hooks/useAuthFlow.ts
  git commit -m "feat: early-fetch enabledCountries in useAuthFlow; expose in return"
  ```

---

## Task 7: Wire `enabledCountries` into `OnboardingScreen`

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `src/components/OnboardingScreen.tsx`

- [ ] **Step 1: Pass `enabledCountries` from `_layout.tsx` to `OnboardingScreen`**

  In `app/_layout.tsx`, find the destructure of `useAuthFlow` (line 48):

  ```ts
  const { isReady, isOnboarding, registerClub, showWelcomeSplash, dismissWelcomeSplash } = useAuthFlow();
  ```

  Update it:

  ```ts
  const { isReady, isOnboarding, registerClub, showWelcomeSplash, dismissWelcomeSplash, enabledCountries } = useAuthFlow();
  ```

  Find the `OnboardingScreen` render (around line 157–165):

  ```tsx
  if (isOnboarding || newGameOnboarding) {
    return (
      <OnboardingScreen
        onRegister={async (name, country, managerProfile) => {
          setNewGameOnboarding(false);
          await registerClub(name, country, managerProfile);
        }}
      />
    );
  }
  ```

  Update it:

  ```tsx
  if (isOnboarding || newGameOnboarding) {
    return (
      <OnboardingScreen
        onRegister={async (name, country, managerProfile) => {
          setNewGameOnboarding(false);
          await registerClub(name, country, managerProfile);
        }}
        enabledCountries={enabledCountries}
      />
    );
  }
  ```

- [ ] **Step 2: Update `OnboardingScreen` — accept prop, filter countries, auto-select if one**

  In `src/components/OnboardingScreen.tsx`, update the `Props` interface (lines 24–26):

  ```ts
  interface Props {
    onRegister: (clubName: string, country: ClubCountryCode, managerProfile: ManagerProfile) => Promise<void>;
    enabledCountries: string[];
  }
  ```

  Update the component signature (line 199):

  ```ts
  export function OnboardingScreen({ onRegister, enabledCountries }: Props) {
  ```

  Immediately inside the component body (after `const [step, setStep] = useState<Step>('manager');`), derive `availableCountries`:

  ```ts
  const availableCountries = CLUB_COUNTRIES.filter((c) => enabledCountries.includes(c.code));
  ```

  Replace every usage of `CLUB_COUNTRIES` in the country-step UI with `availableCountries`. There are three places:

  1. **`randomiseCountry`** function (line 231):
     ```ts
     function randomiseCountry() {
       setSelectedCountry(pick(availableCountries).code);
     }
     ```

  2. **Country list in step 2** (`{CLUB_COUNTRIES.map(...)` around line 495):
     ```tsx
     {availableCountries.map((country) => {
     ```

  3. **Manager nationality list in step 1** — leave this one as `CLUB_COUNTRIES` (manager nationality is not restricted by country config; it's a separate concept).

  Now add the auto-select logic. After `const availableCountries = ...` line, add:

  ```ts
  // Auto-select the country and skip the picker if only one is enabled.
  // This runs once on mount; subsequent updates are ignored via the empty dep array.
  useEffect(() => {
    if (availableCountries.length === 1 && selectedCountry === null) {
      setSelectedCountry(availableCountries[0].code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  ```

  Also update `StepIndicator` to hide the `country` step dot when there is only one country. Find `StepIndicator` usage (around line 297). When `availableCountries.length === 1`, the country step is auto-skipped, but the indicator still shows 3 steps. Simplest approach: pass a prop to show 2 steps. Since `StepIndicator` is defined locally in this file, update it:

  ```ts
  function StepIndicator({ current, showCountryStep }: { current: Step; showCountryStep: boolean }) {
    const steps: Step[] = showCountryStep ? ['manager', 'country', 'name'] : ['manager', 'name'];
    const idx = steps.indexOf(current);
    // ... rest unchanged
  }
  ```

  And update the call site:
  ```tsx
  <StepIndicator current={step} showCountryStep={availableCountries.length > 1} />
  ```

  When `availableCountries.length === 1`, the country step is skipped in the indicator. The "NEXT → CLUB LOCATION" button in step 1 should also skip to `name` directly in this case:

  ```tsx
  <Button
    label={availableCountries.length === 1 ? 'NEXT → CLUB NAME' : 'NEXT → CLUB LOCATION'}
    variant="yellow"
    fullWidth
    onPress={() => setStep(availableCountries.length === 1 ? 'name' : 'country')}
    disabled={!managerValid}
  />
  ```

  The country step itself (`step === 'country'`) will still render if the user navigates back from step 3 on a multi-country config. When only one country is available the user never reaches it (the button jumps straight to `name`), so it does not need to be hidden.

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Smoke test in Expo Go**

  - With `enabledCountries = ['EN']` (default backend state): open the app on a clean install. The onboarding step 1 button should read "NEXT → CLUB NAME", and the country step should be skipped with England auto-selected.
  - Enable Italy in the admin (add `IT` to `enabledCountries`): the button reads "NEXT → CLUB LOCATION", the country picker shows England and Italy only.

- [ ] **Step 5: Commit**

  ```bash
  git add app/_layout.tsx src/components/OnboardingScreen.tsx
  git commit -m "feat: OnboardingScreen filters country picker by enabledCountries; auto-selects when one"
  ```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `enabledCountries` JSON column on `StarterConfig`, default `['EN']` | Task 1, Task 2 |
| `/api/starter-config` returns `enabledCountries` | Task 3 |
| Admin checkbox UI in `starter_config.html.twig` | Task 4 |
| Save handler reads + persists checkboxes | Task 4 |
| `StarterConfig` frontend type includes `enabledCountries` | Task 5 |
| `useAuthFlow` early-fetches `enabledCountries` in `useEffect` | Task 6 |
| `enabledCountries` exposed in `useAuthFlow` return | Task 6 |
| `_layout.tsx` passes `enabledCountries` to `OnboardingScreen` | Task 7 |
| `OnboardingScreen` filters `CLUB_COUNTRIES` by `enabledCountries` | Task 7 |
| Auto-selects + skips picker when only one country enabled | Task 7 |

All spec requirements covered.

**Placeholder scan:** None found.

**Type consistency:**
- `enabledCountries: string[]` used consistently across all tasks.
- `availableCountries` is always `CLUB_COUNTRIES` filtered — type remains `readonly { code: ClubCountryCode; label: string; flag: string }[]`.
- `enabledCountries?: string[]` on the TS type is optional for backwards-compatibility; the hook defaults to `['EN']` when missing.
