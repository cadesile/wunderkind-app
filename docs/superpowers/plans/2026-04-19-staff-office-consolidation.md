# Staff & Office Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate coaches/scouts into a unified Staff tab in Hub; rename Market → Office with Club (AMP profile editor) and Hire (unified staff market with role filter) sub-nav; fix backend admin Staff section.

**Architecture:** Backend exposes `staffRoles` (StaffRole enum values) in `/api/sync` `gameConfig`. Frontend adds `rawRole` to `MarketCoach` for role-based hire filtering. Hub's `COACHES`/`SCOUTS` tabs merge into a single `STAFF` tab with filter overlay. `market.tsx` becomes `office.tsx` with CLUB | HIRE sub-nav.

**Tech Stack:** PHP 8.4 / Symfony 7 / EasyAdmin 4 (backend); React Native / Expo Router / Zustand / TypeScript (frontend)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `wunderkind-backend/src/Controller/Admin/StaffCrudController.php` | Modify | Fix non-existent enum refs; expose all fields |
| `wunderkind-backend/src/Controller/Admin/DashboardController.php` | Modify | Rename "Coaches" → "Staff" in sidebar menu |
| `wunderkind-backend/src/Service/SyncService.php` | Modify | Add `staffRoles` to `gameConfig` in sync response |
| `src/types/gameConfig.ts` | Modify | Add `staffRoles: string[]` field + default |
| `src/types/market.ts` | Modify | Add `rawRole: string` to `MarketCoach` |
| `src/api/endpoints/market.ts` | Modify | Populate `rawRole` during market data transformation |
| `src/types/club.ts` | Modify | Add `stadiumName`, `formation`, `playingStyle`, `primaryColor`, `secondaryColor` |
| `src/stores/clubStore.ts` | Modify | Add setters + defaults for new club profile fields |
| `app/(tabs)/hub.tsx` | Modify | Replace `COACHES`/`SCOUTS` tabs with unified `STAFF` tab |
| `app/(tabs)/market.tsx` | Rename → `office.tsx` | Restructure as Office with CLUB | HIRE sub-nav |
| `app/(tabs)/_layout.tsx` | Modify | Rename `market` → `office` in tabs + NAV_TABS_BASE |

---

## Task 1: Backend — Fix StaffCrudController

**Files:**
- Modify: `wunderkind-backend/src/Controller/Admin/StaffCrudController.php`

The controller references `StaffRole::HEAD_COACH`, `StaffRole::FITNESS_COACH`, and `StaffRole::ANALYST` which do not exist in the enum. The actual enum cases are: `ASSISTANT_COACH`, `COACH`, `SCOUT`, `MANAGER`, `DIRECTOR_OF_FOOTBALL`, `FACILITY_MANAGER`, `CHAIRMAN`. Also expose `morale` and `dob` fields that are missing from the index.

- [ ] **Step 1: Replace `configureFields()` with corrected implementation**

Replace the entire `configureFields()` method in `src/Controller/Admin/StaffCrudController.php`:

```php
public function configureFields(string $pageName): iterable
{
    yield IdField::new('id')->hideOnForm();
    yield TextField::new('firstName');
    yield TextField::new('lastName');
    yield TextField::new('nationality');

    yield ChoiceField::new('role')
        ->setChoices([
            'Coach'                => StaffRole::COACH,
            'Assistant Coach'      => StaffRole::ASSISTANT_COACH,
            'Scout'                => StaffRole::SCOUT,
            'Manager'              => StaffRole::MANAGER,
            'Director of Football' => StaffRole::DIRECTOR_OF_FOOTBALL,
            'Facility Manager'     => StaffRole::FACILITY_MANAGER,
            'Chairman'             => StaffRole::CHAIRMAN,
        ])
        ->renderAsBadges([
            StaffRole::COACH->value                => 'warning',
            StaffRole::ASSISTANT_COACH->value      => 'info',
            StaffRole::SCOUT->value                => 'primary',
            StaffRole::MANAGER->value              => 'dark',
            StaffRole::DIRECTOR_OF_FOOTBALL->value => 'secondary',
            StaffRole::FACILITY_MANAGER->value     => 'light',
            StaffRole::CHAIRMAN->value             => 'danger',
        ]);

    yield IntegerField::new('coachingAbility')->setHelp('1–100');
    yield IntegerField::new('scoutingRange')->setHelp('1–100');
    yield IntegerField::new('morale')->setHelp('0–100');

    yield \EasyCorp\Bundle\EasyAdminBundle\Field\DateField::new('dob', 'Date of Birth')
        ->hideOnForm();

    yield TextField::new('specialty')->hideOnIndex();

    yield TextField::new('specialisms', 'Specialisms')
        ->formatValue(function ($v) {
            if (!is_array($v) || empty($v)) return '—';
            return implode(', ', array_map(
                fn($k, $val) => ucfirst($k) . ': ' . $val,
                array_keys($v), $v
            ));
        })
        ->hideOnIndex()
        ->hideOnForm();

    yield \EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField::new('specialismsJson', 'Specialisms (JSON)')
        ->setHelp(
            'Keys: pace, technical, vision, power, stamina, heart. Values 50–90. ' .
            'Example: {"pace":85,"technical":70}. Leave as {} to clear.'
        )
        ->hideOnIndex()
        ->setNumOfRows(4)
        ->onlyOnForms();

    yield IntegerField::new('weeklySalary', 'Weekly Salary')
        ->formatValue(fn($v) => $v !== null ? '£' . number_format((int) $v / 100) . ' / wk' : '—')
        ->setHelp('Weekly salary in pence — £1,000 = 100,000')
        ->hideOnIndex();

    yield AssociationField::new('club');

    yield DateTimeField::new('hiredAt')->hideOnForm();
}
```

Also update `createEntity()` to use a valid role:

```php
public function createEntity(string $entityFqcn): Staff
{
    $club = $this->clubRepository->findOneBy([]);

    if ($club === null) {
        throw new \RuntimeException('No Club exists yet. Register a user first.');
    }

    return new Staff(
        firstName: '',
        lastName: '',
        role: StaffRole::COACH,
        club: $club,
    );
}
```

- [ ] **Step 2: Verify admin panel loads without errors**

Run: `lando php bin/console cache:clear`

Navigate to `/admin?crudAction=index&crudControllerFqcn=App%5CController%5CAdmin%5CStaffCrudController` in the browser.

Expected: Staff list renders with Role badge column. No PHP error about undefined class constant.

- [ ] **Step 3: Commit**

```bash
cd /path/to/wunderkind-backend
git checkout -b feat/staff-office-consolidation
git add src/Controller/Admin/StaffCrudController.php
git commit -m "fix(admin): fix StaffCrudController non-existent enum refs; expose morale, dob, specialty fields"
```

---

## Task 2: Backend — Rename Admin Menu "Coaches" → "Staff"

**Files:**
- Modify: `wunderkind-backend/src/Controller/Admin/DashboardController.php`

- [ ] **Step 1: Update the Roster section menu items**

Find this block in `DashboardController.php` (around line 815–818):

```php
yield MenuItem::section('Roster');
yield MenuItem::linkTo(PlayerCrudController::class, 'Players', 'fa fa-person-running');
yield MenuItem::linkTo(StaffCrudController::class, 'Coaches', 'fa fa-chalkboard-user');
yield MenuItem::linkTo(ScoutCrudController::class, 'Scouts', 'fa fa-binoculars');
```

Replace with:

```php
yield MenuItem::section('Roster');
yield MenuItem::linkTo(PlayerCrudController::class, 'Players', 'fa fa-person-running');
yield MenuItem::linkTo(StaffCrudController::class, 'Staff', 'fa fa-users');
yield MenuItem::linkTo(ScoutCrudController::class, 'Scouts', 'fa fa-binoculars');
```

- [ ] **Step 2: Verify sidebar shows "Staff" instead of "Coaches"**

Navigate to `/admin` in the browser. Expected: left sidebar shows "Staff" under the Roster section with a users icon.

- [ ] **Step 3: Commit**

```bash
git add src/Controller/Admin/DashboardController.php
git commit -m "feat(admin): rename 'Coaches' sidebar item to 'Staff'"
```

---

## Task 3: Backend — Expose StaffRole values in /api/sync

**Files:**
- Modify: `wunderkind-backend/src/Service/SyncService.php`

- [ ] **Step 1: Add StaffRole import and staffRoles to gameConfigData**

At the top of `SyncService.php`, add the import alongside existing enum imports (around line 16–18):

```php
use App\Enum\StaffRole;
```

Then find the line `$gameConfigData['tacticalMatrix'] = $tacticalMatrix;` (around line 278) and add after it:

```php
$gameConfigData['staffRoles'] = array_column(StaffRole::cases(), 'value');
```

The result should look like:

```php
$gameConfigData['tacticalMatrix'] = $tacticalMatrix;
$gameConfigData['staffRoles'] = array_column(StaffRole::cases(), 'value');

return [
    'accepted'          => true,
    // ...
];
```

- [ ] **Step 2: Verify sync response includes staffRoles**

Run: `lando php bin/console cache:clear`

POST to `/api/sync` with a valid JWT and minimal body. Expected: response JSON contains `gameConfig.staffRoles` as an array of strings:
```json
["assistant_coach","coach","scout","manager","director_of_football","facility_manager","chairman"]
```

- [ ] **Step 3: Commit**

```bash
git add src/Service/SyncService.php
git commit -m "feat(api): expose StaffRole enum values in /api/sync gameConfig.staffRoles"
```

---

## Task 4: Frontend — Add staffRoles to GameConfig + rawRole to MarketCoach

**Files:**
- Modify: `src/types/gameConfig.ts`
- Modify: `src/types/market.ts`
- Modify: `src/api/endpoints/market.ts`

- [ ] **Step 1: Add `staffRoles` to GameConfig type**

In `src/types/gameConfig.ts`, add at the end of the `GameConfig` interface (before the closing `}`):

```ts
  // ── Staff ─────────────────────────────────────────────────────────────────
  /** StaffRole enum values from the backend — used as filter options in the Hire screen. */
  staffRoles: string[];
```

In `DEFAULT_GAME_CONFIG`, add at the end (before the closing `}`):

```ts
  staffRoles: ['assistant_coach', 'coach', 'scout', 'manager', 'director_of_football', 'facility_manager', 'chairman'],
```

- [ ] **Step 2: Add `rawRole` to MarketCoach**

In `src/types/market.ts`, add `rawRole` to the `MarketCoach` interface after the `role` field:

```ts
export interface MarketCoach {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  role: CoachRole;
  /** Raw StaffRole enum value from the backend (e.g. 'coach', 'assistant_coach'). Used for role-based filtering. */
  rawRole: string;
  influence: number;
  salary: number;
  specialisms?: CoachSpecialisms;
  morale?: number;
  tier?: ClubTier;
}
```

- [ ] **Step 3: Populate rawRole in market data transformation**

In `src/api/endpoints/market.ts`, find the coaches transformation (around line 200):

```ts
coaches: raw.coaches.map((c) => ({
```

Add `rawRole: c.role,` to the mapped object. The full coaches map should become:

```ts
coaches: raw.coaches.map((c) => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName,
  nationality: c.nationality,
  rawRole: c.role,
  role: mapCoachRole(c.role),
  influence: mapInfluence(c.coachingAbility),
  salary: c.weeklySalary ?? 0,
  specialisms: c.specialisms as import('@/types/coach').CoachSpecialisms | undefined,
  morale: c.morale,
  tier: c.tier,
})),
```

(Keep existing fields; only `rawRole: c.role` is new — position it after `nationality`.)

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no new type errors.

- [ ] **Step 5: Commit**

```bash
cd /path/to/wunderkind-app
git checkout -b feat/staff-office-consolidation
git add src/types/gameConfig.ts src/types/market.ts src/api/endpoints/market.ts
git commit -m "feat(types): add staffRoles to GameConfig; add rawRole to MarketCoach"
```

---

## Task 5: Frontend — Add Club Profile Fields

**Files:**
- Modify: `src/types/club.ts`
- Modify: `src/stores/clubStore.ts`

These fields (stadiumName, formation, playingStyle, primaryColor, secondaryColor) are frontend-only — stored in Zustand/AsyncStorage, never synced to the backend.

- [ ] **Step 1: Add fields to Club interface**

In `src/types/club.ts`, add to the `Club` interface (after the `lastRepActivityWeek` field):

```ts
  /** Optional stadium name set by AMP in the Office → Club screen. */
  stadiumName: string | null;
  /** Tactical formation selected by AMP — matches backend Formation enum values. */
  formation: '4-4-2' | '4-3-3' | '3-5-2' | '5-4-1' | '4-2-3-1';
  /** Playing style selected by AMP — matches NPC club playingStyle values. */
  playingStyle: 'POSSESSION' | 'DIRECT' | 'COUNTER' | 'HIGH_PRESS';
  /** Primary kit colour as a 7-char hex string (e.g. '#E53935'). */
  primaryColor: string;
  /** Secondary kit colour as a 7-char hex string. */
  secondaryColor: string;
```

- [ ] **Step 2: Add setters to ClubState interface**

In `src/stores/clubStore.ts`, add to the `ClubState` interface:

```ts
  setStadiumName: (name: string | null) => void;
  setFormation: (f: Club['formation']) => void;
  setPlayingStyle: (s: Club['playingStyle']) => void;
  setClubColors: (primary: string, secondary: string) => void;
```

- [ ] **Step 3: Update DEFAULT_CLUB with new field defaults**

Find `const DEFAULT_CLUB: Club = {` and add the new fields before the closing `}`:

```ts
  stadiumName: null,
  formation: '4-4-2',
  playingStyle: 'DIRECT',
  primaryColor: '#00897B',
  secondaryColor: '#FFC107',
```

- [ ] **Step 4: Implement the setters**

Inside the `create<ClubState>()(persist((set) => ({` block, add the setter implementations after `markRepActivity`:

```ts
setStadiumName: (name) =>
  set((state) => ({ club: { ...state.club, stadiumName: name } })),
setFormation: (f) =>
  set((state) => ({ club: { ...state.club, formation: f } })),
setPlayingStyle: (style) =>
  set((state) => ({ club: { ...state.club, playingStyle: style } })),
setClubColors: (primary, secondary) =>
  set((state) => ({ club: { ...state.club, primaryColor: primary, secondaryColor: secondary } })),
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/club.ts src/stores/clubStore.ts
git commit -m "feat(store): add stadiumName, formation, playingStyle, primaryColor, secondaryColor to Club store"
```

---

## Task 6: Frontend — Hub: Replace COACHES/SCOUTS with STAFF Tab

**Files:**
- Modify: `app/(tabs)/hub.tsx`

Replace the `COACHES` and `SCOUTS` tabs with a single `STAFF` tab containing a unified hired-staff list with type-filter overlay. The recruit buttons are removed — hiring happens in Office → Hire.

- [ ] **Step 1: Update CLUB_TABS constant and ClubTab type**

Find:
```ts
const CLUB_TABS = ['SQUAD', 'COACHES', 'SCOUTS', 'DRESSING ROOM'] as const;
```

Replace with:
```ts
const CLUB_TABS = ['SQUAD', 'STAFF', 'DRESSING ROOM'] as const;
```

- [ ] **Step 2: Add SlidersHorizontal import if missing**

At the top of `hub.tsx`, ensure `SlidersHorizontal` is imported from `lucide-react-native`. Add it to the existing import:

```ts
import { SlidersHorizontal } from 'lucide-react-native';
```

(If lucide imports already exist on a single line, just add `SlidersHorizontal` to the destructured list.)

- [ ] **Step 3: Add StaffPane component**

Add the following new component above the existing `ClubHubScreen` default export. Place it after `ScoutsPane` (or wherever `ScoutsPane` currently ends):

```tsx
type StaffRoleFilter = 'ALL' | 'HEAD COACH' | 'FITNESS COACH' | 'YOUTH COACH' | 'GK COACH' | 'TACTICAL ANALYST' | 'SCOUT';

const STAFF_FILTER_OPTIONS: StaffRoleFilter[] = [
  'ALL',
  'HEAD COACH',
  'FITNESS COACH',
  'YOUTH COACH',
  'GK COACH',
  'TACTICAL ANALYST',
  'SCOUT',
];

function StaffPane() {
  const { coaches, removeCoach } = useCoachStore();
  const { scouts } = useScoutStore();
  const { club, addBalance } = useClubStore();
  const router = useRouter();
  const weekNumber = club.weekNumber ?? 1;

  const [filterRole, setFilterRole] = useState<StaffRoleFilter>('ALL');
  const [showFilter, setShowFilter] = useState(false);
  const [pendingFireCoach, setPendingFireCoach] = useState<{
    coach: Coach;
    penalty: number;
    penaltyPence: number;
  } | null>(null);
  const [fireError, setFireError] = useState<string | null>(null);

  type HiredStaffItem =
    | { kind: 'coach'; data: Coach }
    | { kind: 'scout'; data: Scout };

  const allStaff: HiredStaffItem[] = [
    ...coaches.map((c) => ({ kind: 'coach' as const, data: c })),
    ...scouts.map((s) => ({ kind: 'scout' as const, data: s })),
  ];

  const filtered =
    filterRole === 'ALL'
      ? allStaff
      : allStaff.filter((item) => {
          if (filterRole === 'SCOUT') return item.kind === 'scout';
          const roleMap: Record<string, string> = {
            'HEAD COACH': 'Head Coach',
            'FITNESS COACH': 'Fitness Coach',
            'YOUTH COACH': 'Youth Coach',
            'GK COACH': 'GK Coach',
            'TACTICAL ANALYST': 'Tactical Analyst',
          };
          return item.kind === 'coach' && item.data.role === roleMap[filterRole];
        });

  function fireCoach(coach: Coach) {
    const penaltyPence = Math.floor(coach.salary * 26 * 0.25);
    const penaltyPounds = Math.round(penaltyPence / 100);
    setFireError(null);
    setPendingFireCoach({ coach, penalty: penaltyPounds, penaltyPence });
  }

  function confirmFireCoach() {
    if (!pendingFireCoach) return;
    const { coach, penalty, penaltyPence } = pendingFireCoach;
    const currentBalancePounds = Math.round((club.balance ?? 0) / 100);
    if (currentBalancePounds < penalty) {
      setFireError(`INSUFFICIENT FUNDS — need £${penalty.toLocaleString()}`);
      setPendingFireCoach(null);
      return;
    }
    addBalance(-penalty * 100);
    useFinanceStore.getState().addTransaction({
      amount: -penaltyPence,
      category: 'contract_termination',
      description: `Released ${coach.name} (25% early termination)`,
      weekNumber,
    });
    removeCoach(coach.id);
    setPendingFireCoach(null);
  }

  const totalWeeklyCost = coaches.reduce((s, c) => s + c.salary, 0) +
    scouts.reduce((s, sc) => s + sc.salary, 0);

  return (
    <View style={{ flex: 1 }}>
      {/* Stats bar */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}>
        <BodyText size={11} dim>
          {coaches.length} COACH{coaches.length !== 1 ? 'ES' : ''} · {scouts.length} SCOUT{scouts.length !== 1 ? 'S' : ''}
        </BodyText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BodyText size={11} dim>£{Math.round(totalWeeklyCost / 100).toLocaleString()}/wk</BodyText>
          <Pressable
            onPress={() => { hapticTap(); setShowFilter(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <SlidersHorizontal size={14} color={filterRole !== 'ALL' ? WK.yellow : WK.dim} />
            <PixelText size={7} color={filterRole !== 'ALL' ? WK.yellow : WK.dim}>FILTER</PixelText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
        renderItem={({ item }) =>
          item.kind === 'coach'
            ? <CoachRow coach={item.data} onFire={() => fireCoach(item.data)} />
            : <ScoutRow scout={item.data} />
        }
        ListEmptyComponent={
          <BodyText size={12} dim style={{ textAlign: 'center', marginTop: 32 }}>
            NO STAFF — HIRE FROM OFFICE
          </BodyText>
        }
      />

      {/* Filter overlay */}
      <Modal visible={showFilter} transparent animationType="fade" onRequestClose={() => setShowFilter(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}
          onPress={() => setShowFilter(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderTopWidth: 3,
              borderTopColor: WK.border,
              padding: 16,
              paddingBottom: 32,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <PixelText size={9} upper>FILTER BY TYPE</PixelText>
                <Pressable onPress={() => setShowFilter(false)}>
                  <PixelText size={9} color={WK.dim}>✕</PixelText>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {STAFF_FILTER_OPTIONS.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => { hapticTap(); setFilterRole(role); setShowFilter(false); }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: filterRole === role ? WK.yellow : WK.tealMid,
                      borderWidth: 2,
                      borderColor: filterRole === role ? WK.yellow : WK.border,
                    }}
                  >
                    <PixelText size={7} color={filterRole === role ? WK.border : WK.text}>
                      {role}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fire confirmation */}
      {pendingFireCoach && (
        <PixelDialog
          visible
          title="RELEASE STAFF"
          message={`Release ${pendingFireCoach.coach.name}?\n\nEarly termination fee: £${pendingFireCoach.penalty.toLocaleString()}\n(25% of 26 remaining weeks)`}
          confirmLabel="RELEASE"
          confirmVariant="red"
          onConfirm={confirmFireCoach}
          onCancel={() => setPendingFireCoach(null)}
        />
      )}

      {fireError && (
        <PixelDialog
          visible
          title="ERROR"
          message={fireError}
          onConfirm={() => setFireError(null)}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 4: Update ClubHubScreen default export to use STAFF tab**

Find the `ClubHubScreen` component. Update the `activeTab` default and the conditional renders:

```tsx
export default function ClubHubScreen() {
  const [activeTab, setActiveTab] = useState<ClubTab>('SQUAD');
  // ... rest of state/hooks unchanged

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['top']}>
      <PitchBackground>
        <PixelTopTabBar
          tabs={[...CLUB_TABS]}
          active={activeTab}
          onChange={(tab) => setActiveTab(tab as ClubTab)}
        />

        {activeTab === 'SQUAD' && <SquadPane />}
        {activeTab === 'STAFF' && <StaffPane />}
        {activeTab === 'DRESSING ROOM' && (
          // ... keep existing DRESSING ROOM render unchanged
        )}
      </PitchBackground>
    </SafeAreaView>
  );
}
```

Remove the `{activeTab === 'COACHES' && <CoachesPane />}` and `{activeTab === 'SCOUTS' && <ScoutsPane />}` lines.

**Note:** `CoachesPane` and `ScoutsPane` function bodies can be left in the file (they are no longer rendered) OR removed entirely. Remove them to keep the file clean — but the `CoachRow` and `ScoutRow` sub-components must be kept since `StaffPane` uses them.

- [ ] **Step 5: Verify Hub renders**

Run: `npx expo start --ios`

Navigate to Hub. Expected: three tabs SQUAD | STAFF | DRESSING ROOM. STAFF tab shows all hired coaches and scouts in a single list. Filter button appears in the header. Tapping filter shows overlay with role options.

- [ ] **Step 6: Commit**

```bash
git add app/\(tabs\)/hub.tsx
git commit -m "feat(hub): consolidate COACHES and SCOUTS tabs into unified STAFF tab with filter overlay"
```

---

## Task 7: Frontend — Rename Market Tab → Office

**Files:**
- Rename: `app/(tabs)/market.tsx` → `app/(tabs)/office.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Rename the file**

```bash
mv app/\(tabs\)/market.tsx app/\(tabs\)/office.tsx
```

- [ ] **Step 2: Check for any hard-coded links to the old market route**

```bash
grep -r "'/market'" src/ app/ --include="*.ts" --include="*.tsx"
grep -r '"/market"' src/ app/ --include="*.ts" --include="*.tsx"
grep -r "href.*market" src/ app/ --include="*.ts" --include="*.tsx"
```

Update any matches to use `'/office'` instead.

- [ ] **Step 3: Update _layout.tsx NAV_TABS_BASE**

In `app/(tabs)/_layout.tsx`, find:

```ts
const NAV_TABS_BASE: NavTabDef[] = [
  { name: 'hub',        Icon: LayoutGrid },
  { name: 'facilities', Icon: Building2 },
  { name: 'finances',   Icon: DollarSign },
  { name: 'market',     Icon: Store },
  { name: 'competitions', Icon: Trophy },
];
```

Replace `{ name: 'market', Icon: Store }` with `{ name: 'office', Icon: Store }`.

- [ ] **Step 4: Update Tabs.Screen in _layout.tsx**

Find:
```tsx
<Tabs.Screen name="market"     options={{ title: 'MARKET' }} />
```

Replace with:
```tsx
<Tabs.Screen name="office"     options={{ title: 'OFFICE' }} />
```

- [ ] **Step 5: Verify tab shows "Office" icon and navigates to office.tsx**

Run: `npx expo start --ios`

Expected: bottom tab bar shows Store icon, navigating to it loads `office.tsx` content (existing market layout for now). No 404 or missing route error.

- [ ] **Step 6: Commit**

```bash
git add app/\(tabs\)/office.tsx app/\(tabs\)/_layout.tsx
git commit -m "feat(nav): rename Market tab to Office; update routing from market → office"
```

---

## Task 8: Frontend — Office Screen: CLUB Pane (AMP Profile Editor)

**Files:**
- Modify: `app/(tabs)/office.tsx`

Add the `CLUB` sub-nav item and implement `ClubPane` — a screen where the AMP can view their avatar/name and edit club name, stadium name, formation, playing style, and kit colours.

- [ ] **Step 1: Add OFFICE_TABS and ClubPane to office.tsx**

At the top of `office.tsx`, the current file has `const MARKET_TABS = ['COACHES', 'SCOUTS']` (or equivalent). Change the top-level tabs to `CLUB | HIRE`:

Find the existing pane-switcher constant (something like `const [activePane, setActivePane] = useState<'COACHES' | 'SCOUTS'>('COACHES')`) and replace with:

```ts
const OFFICE_TABS = ['CLUB', 'HIRE'] as const;
type OfficeTab = typeof OFFICE_TABS[number];
```

In the main `OfficeScreen` (or `MarketScreen`) component, change the active state:

```ts
const [activeTab, setActiveTab] = useState<OfficeTab>('CLUB');
```

Update the `PixelTopTabBar` to use `OFFICE_TABS`:

```tsx
<PixelTopTabBar
  tabs={[...OFFICE_TABS]}
  active={activeTab}
  onChange={(tab) => setActiveTab(tab as OfficeTab)}
/>

{activeTab === 'CLUB' && <ClubPane />}
{activeTab === 'HIRE' && <HirePane />}
```

(The existing COACHES/SCOUTS content will move into `HirePane` in Task 9.)

- [ ] **Step 2: Add ClubPane component**

Add the following component to `office.tsx` (before the default export):

```tsx
const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '5-4-1', '4-2-3-1'] as const;
const PLAYING_STYLES = ['POSSESSION', 'DIRECT', 'COUNTER', 'HIGH_PRESS'] as const;
const KIT_COLORS = [
  '#E53935', '#1565C0', '#2E7D32', '#F9A825',
  '#6A1B9A', '#00838F', '#BF360C', '#0D47A1',
  '#880E4F', '#37474F', '#F5F5F5', '#212121',
];

function ClubPane() {
  const {
    club, managerProfile,
    setName, setStadiumName, setFormation, setPlayingStyle, setClubColors,
  } = useClubStore();

  const [clubNameDraft, setClubNameDraft] = useState(club.name);
  const [stadiumDraft, setStadiumDraft] = useState(club.stadiumName ?? '');

  function commitClubName() {
    const trimmed = clubNameDraft.trim();
    if (trimmed) setName(trimmed);
    else setClubNameDraft(club.name);
  }

  function commitStadiumName() {
    const trimmed = stadiumDraft.trim();
    setStadiumName(trimmed || null);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: FAB_CLEARANCE }}>

      {/* AMP identity — avatar + name (read-only, set at onboarding) */}
      {managerProfile && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
          padding: 12, marginBottom: 16, ...pixelShadow,
        }}>
          <Avatar appearance={managerProfile.appearance} role="MANAGER" size={52} />
          <View style={{ flex: 1 }}>
            <PixelText size={9} upper>{managerProfile.name}</PixelText>
            <BodyText size={11} dim style={{ marginTop: 2 }}>{managerProfile.nationality}</BodyText>
          </View>
          <Badge label="AMP" color="yellow" />
        </View>
      )}

      {/* Club Name */}
      <View style={{ marginBottom: 16 }}>
        <PixelText size={8} dim style={{ marginBottom: 6 }}>CLUB NAME</PixelText>
        <TextInput
          value={clubNameDraft}
          onChangeText={setClubNameDraft}
          onBlur={commitClubName}
          returnKeyType="done"
          onSubmitEditing={commitClubName}
          style={{
            backgroundColor: WK.tealMid, color: WK.text,
            borderWidth: 2, borderColor: WK.border,
            padding: 10, fontFamily: 'monospace', fontSize: 14,
          }}
        />
      </View>

      {/* Stadium Name */}
      <View style={{ marginBottom: 16 }}>
        <PixelText size={8} dim style={{ marginBottom: 6 }}>STADIUM NAME</PixelText>
        <TextInput
          value={stadiumDraft}
          onChangeText={setStadiumDraft}
          onBlur={commitStadiumName}
          returnKeyType="done"
          onSubmitEditing={commitStadiumName}
          placeholder="e.g. The Factory Ground"
          placeholderTextColor={WK.dim}
          style={{
            backgroundColor: WK.tealMid, color: WK.text,
            borderWidth: 2, borderColor: WK.border,
            padding: 10, fontFamily: 'monospace', fontSize: 14,
          }}
        />
      </View>

      {/* Formation */}
      <View style={{ marginBottom: 16 }}>
        <PixelText size={8} dim style={{ marginBottom: 8 }}>FORMATION</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FORMATIONS.map((f) => (
            <Pressable
              key={f}
              onPress={() => { hapticTap(); setFormation(f); }}
              style={{
                paddingHorizontal: 16, paddingVertical: 10,
                backgroundColor: club.formation === f ? WK.yellow : WK.tealMid,
                borderWidth: 2,
                borderColor: club.formation === f ? WK.yellow : WK.border,
                ...pixelShadow,
              }}
            >
              <PixelText size={9} color={club.formation === f ? WK.border : WK.text}>{f}</PixelText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Playing Style */}
      <View style={{ marginBottom: 16 }}>
        <PixelText size={8} dim style={{ marginBottom: 8 }}>PLAYING STYLE</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PLAYING_STYLES.map((s) => (
            <Pressable
              key={s}
              onPress={() => { hapticTap(); setPlayingStyle(s); }}
              style={{
                paddingHorizontal: 16, paddingVertical: 10,
                backgroundColor: club.playingStyle === s ? WK.yellow : WK.tealMid,
                borderWidth: 2,
                borderColor: club.playingStyle === s ? WK.yellow : WK.border,
                ...pixelShadow,
              }}
            >
              <PixelText size={8} color={club.playingStyle === s ? WK.border : WK.text}>
                {s.replace('_', ' ')}
              </PixelText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Kit Colours */}
      <View style={{ marginBottom: 8 }}>
        <PixelText size={8} dim style={{ marginBottom: 8 }}>PRIMARY COLOUR</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {KIT_COLORS.map((color) => (
            <Pressable
              key={`p-${color}`}
              onPress={() => { hapticTap(); setClubColors(color, club.secondaryColor); }}
              style={{
                width: 40, height: 40,
                backgroundColor: color,
                borderWidth: club.primaryColor === color ? 3 : 1,
                borderColor: club.primaryColor === color ? WK.yellow : WK.border,
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 20 }}>
        <PixelText size={8} dim style={{ marginBottom: 8 }}>SECONDARY COLOUR</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {KIT_COLORS.map((color) => (
            <Pressable
              key={`s-${color}`}
              onPress={() => { hapticTap(); setClubColors(club.primaryColor, color); }}
              style={{
                width: 40, height: 40,
                backgroundColor: color,
                borderWidth: club.secondaryColor === color ? 3 : 1,
                borderColor: club.secondaryColor === color ? WK.yellow : WK.border,
              }}
            />
          ))}
        </View>

        {/* Colour preview strip */}
        <View style={{ flexDirection: 'row', marginTop: 14, gap: 0 }}>
          <View style={{ flex: 1, height: 24, backgroundColor: club.primaryColor, borderWidth: 2, borderColor: WK.border }} />
          <View style={{ flex: 1, height: 24, backgroundColor: club.secondaryColor, borderWidth: 2, borderColor: WK.border, borderLeftWidth: 0 }} />
        </View>
      </View>

    </ScrollView>
  );
}
```

- [ ] **Step 3: Add necessary imports to office.tsx**

Ensure these are imported at the top of `office.tsx`:

```ts
import { useClubStore } from '@/stores/clubStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { TextInput } from 'react-native';
```

(Most will already be present from the existing market.tsx imports — only add what is missing.)

- [ ] **Step 4: Verify CLUB pane renders**

Run: `npx expo start --ios`

Navigate to Office tab. Expected: CLUB | HIRE sub-nav. CLUB pane shows AMP avatar, name, editable club name and stadium name inputs, formation pills, playing style pills, colour swatches, and preview strip.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/office.tsx
git commit -m "feat(office): add Club sub-nav with AMP profile editor (stadium, formation, playing style, kit colours)"
```

---

## Task 9: Frontend — Office Screen: HIRE Pane (Unified Market + Role Filter)

**Files:**
- Modify: `app/(tabs)/office.tsx`

Replace the existing COACHES | SCOUTS two-pane structure with a single unified hire list filtered by StaffRole. The signing, tier-restriction, and filter-sheet logic from the original market.tsx is preserved but merged into one pane.

- [ ] **Step 1: Add HirePane component to office.tsx**

Add the following component above `ClubPane`. It merges `MarketCoach` and `MarketScout` items into a single FlatList, filtered by the rawRole value from the backend:

```tsx
type HireItem =
  | { kind: 'coach'; data: MarketCoach }
  | { kind: 'scout'; data: MarketScout };

function formatStaffRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function HirePane() {
  const coaches      = useMarketStore((s) => s.coaches);
  const marketScouts = useMarketStore((s) => s.marketScouts);
  const hireCoach    = useMarketStore((s) => s.hireCoach);
  const hireScout    = useMarketStore((s) => s.hireScout);
  const refreshPool  = useMarketStore((s) => s.refreshMarketPool);
  const isLoading    = useMarketStore((s) => s.isLoading);

  const { club, addBalance } = useClubStore();
  const staffRoles = useGameConfigStore((s) => s.config.staffRoles);

  const weekNumber  = club.weekNumber ?? 1;
  const clubTierKey = (club.reputationTier?.toLowerCase() ?? 'local') as ClubTier;

  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [tierPopup, setTierPopup] = useState<string | null>(null);

  const roleOptions = ['ALL', ...staffRoles];

  const allItems: HireItem[] = [
    ...coaches.map((c) => ({ kind: 'coach' as const, data: c })),
    ...marketScouts.map((s) => ({ kind: 'scout' as const, data: s })),
  ];

  const filtered =
    selectedRole === 'ALL'
      ? allItems
      : allItems.filter((item) => {
          if (item.kind === 'scout') return selectedRole === 'scout';
          return item.data.rawRole === selectedRole;
        });

  const visibleItems = filtered.map((item) => {
    const itemTierKey = (item.data.tier ?? 'local') as ClubTier;
    const tierRestricted = TIER_ORDER[itemTierKey] > TIER_ORDER[clubTierKey];
    const signingFeePounds = Math.round((item.data.salary * 4) / 100);
    const canAfford = (club.balance ?? 0) >= signingFeePounds;
    return { ...item, tierRestricted, canAfford, signingFeePounds };
  });

  function signCoach(mc: MarketCoach) {
    const fee = Math.round((mc.salary * 4) / 100);
    if ((club.balance ?? 0) < fee) {
      setSignError(`INSUFFICIENT FUNDS — need £${fee.toLocaleString()}`);
      return;
    }
    addBalance(-fee);
    hireCoach(mc.id, weekNumber);
  }

  function signScout(ms: MarketScout) {
    const fee = Math.round((ms.salary * 4) / 100);
    if ((club.balance ?? 0) < fee) {
      setSignError(`INSUFFICIENT FUNDS — need £${fee.toLocaleString()}`);
      return;
    }
    addBalance(-fee);
    hireScout(ms.id, weekNumber);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Filter toolbar */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 8,
        borderBottomWidth: 2, borderBottomColor: WK.border,
      }}>
        <BodyText size={11} dim>{filtered.length} AVAILABLE</BodyText>
        <Pressable
          onPress={() => { hapticTap(); setShowRoleFilter(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <SlidersHorizontal size={14} color={selectedRole !== 'ALL' ? WK.yellow : WK.dim} />
          <PixelText size={7} color={selectedRole !== 'ALL' ? WK.yellow : WK.dim}>
            {selectedRole === 'ALL' ? 'FILTER' : formatStaffRole(selectedRole).toUpperCase()}
          </PixelText>
        </Pressable>
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
        onRefresh={refreshPool}
        refreshing={isLoading}
        renderItem={({ item }) => {
          const { tierRestricted, canAfford, signingFeePounds } = item;
          const isDisabled = tierRestricted || !canAfford;

          if (item.kind === 'coach') {
            const mc = item.data;
            return (
              <Pressable
                onPress={() => {
                  if (tierRestricted) { setTierPopup('Tier Restriction: Upgrade your club to hire this staff member.'); return; }
                  signCoach(mc);
                }}
                style={[{
                  backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
                  padding: 12, marginBottom: 10, ...pixelShadow,
                  opacity: isDisabled ? 0.55 : 1,
                }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar appearance={mc.appearance} role="COACH" size={44} />
                  <View style={{ flex: 1 }}>
                    <BodyText size={14} upper numberOfLines={1}>{mc.firstName} {mc.lastName}</BodyText>
                    <PixelText size={8} color={WK.tealLight}>{formatStaffRole(mc.rawRole).toUpperCase()}</PixelText>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <FlagText nationality={mc.nationality} size={11} />
                      <BodyText size={11} dim>· £{Math.round(mc.salary / 100).toLocaleString()}/wk</BodyText>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={`INF ${mc.influence}`} color="yellow" />
                    <BodyText size={10} dim>Fee: £{signingFeePounds.toLocaleString()}</BodyText>
                  </View>
                </View>
              </Pressable>
            );
          }

          // Scout card
          const ms = item.data;
          const rangeLabel: Record<string, string> = { local: 'LOCAL', national: 'NATIONAL', international: 'INTL' };
          const rangeColor: Record<string, string> = { local: WK.dim, national: WK.yellow, international: WK.red };
          const range = ms.scoutingRange ?? 'local';
          return (
            <Pressable
              onPress={() => {
                if (tierRestricted) { setTierPopup('Tier Restriction: Upgrade your club to hire this scout.'); return; }
                signScout(ms);
              }}
              style={[{
                backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
                padding: 12, marginBottom: 10, ...pixelShadow,
                opacity: isDisabled ? 0.55 : 1,
              }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar appearance={ms.appearance} role="SCOUT" size={44} />
                <View style={{ flex: 1 }}>
                  <BodyText size={14} upper numberOfLines={1}>{ms.firstName} {ms.lastName}</BodyText>
                  <PixelText size={8} color={rangeColor[range]}>{rangeLabel[range]} SCOUT</PixelText>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <FlagText nationality={ms.nationality} size={11} />
                    <BodyText size={11} dim>· £{Math.round(ms.salary / 100).toLocaleString()}/wk</BodyText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={`${ms.successRate}%`} color="green" />
                  <BodyText size={10} dim>Fee: £{signingFeePounds.toLocaleString()}</BodyText>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <BodyText size={12} dim style={{ textAlign: 'center', marginTop: 32 }}>
            NO STAFF AVAILABLE
          </BodyText>
        }
      />

      {/* Role filter overlay */}
      <Modal visible={showRoleFilter} transparent animationType="fade" onRequestClose={() => setShowRoleFilter(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}
          onPress={() => setShowRoleFilter(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: WK.tealCard, borderTopWidth: 3, borderTopColor: WK.border,
              padding: 16, paddingBottom: 32,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <PixelText size={9} upper>HIRE BY ROLE</PixelText>
                <Pressable onPress={() => setShowRoleFilter(false)}>
                  <PixelText size={9} color={WK.dim}>✕</PixelText>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {roleOptions.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => { hapticTap(); setSelectedRole(role); setShowRoleFilter(false); }}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8,
                      backgroundColor: selectedRole === role ? WK.yellow : WK.tealMid,
                      borderWidth: 2,
                      borderColor: selectedRole === role ? WK.yellow : WK.border,
                    }}
                  >
                    <PixelText size={7} color={selectedRole === role ? WK.border : WK.text}>
                      {role === 'ALL' ? 'ALL' : formatStaffRole(role).toUpperCase()}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sign error */}
      {signError && (
        <PixelDialog visible title="SIGN FAILED" message={signError} onConfirm={() => setSignError(null)} />
      )}

      {/* Tier restriction popup */}
      {tierPopup && (
        <PixelDialog visible title="TIER RESTRICTION" message={tierPopup} onConfirm={() => setTierPopup(null)} />
      )}
    </View>
  );
}
```

**Note on `Avatar` for market scouts:** `MarketScout` doesn't have an `appearance` field. Pass `undefined` or use a fallback — the `Avatar` component should handle `appearance={undefined}` gracefully. Check existing scout card rendering in the original market.tsx for the exact pattern used.

- [ ] **Step 2: Wire HirePane into the office.tsx default export**

In the main `OfficeScreen` component, the `HIRE` tab should render `<HirePane />`. The `CLUB` tab renders `<ClubPane />` (added in Task 8). Remove the old `<CoachesPane />` and `<ScoutsPane />` renders.

Ensure `useGameConfigStore` is imported:
```ts
import { useGameConfigStore } from '@/stores/gameConfigStore';
```

Ensure `SlidersHorizontal` is imported from lucide-react-native. Ensure `ClubTier`, `TIER_ORDER` are imported from `@/types/club`.

- [ ] **Step 3: Remove old CoachesPane / ScoutsPane from office.tsx**

The original market.tsx had `CoachesPane` and `ScoutsPane` as top-level functions. They are now replaced by `HirePane`. Delete them. Keep any sub-components they shared (like `FilterInput`, `FilterPill`) if `HirePane` uses them — otherwise delete those too.

- [ ] **Step 4: Verify Hire pane renders and signs staff**

Run: `npx expo start --ios`

Navigate to Office → HIRE. Expected:
- Single list shows all available market staff (coaches + scouts)
- Filter button in header — tap shows role overlay (ALL + each StaffRole value formatted as display label)
- Selecting a role filters the list (e.g. "Scout" shows only scouts)
- Tapping an affordable, non-tier-restricted item signs them and removes from market list
- Pull-to-refresh re-fetches market data

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/office.tsx
git commit -m "feat(office): add Hire sub-nav with unified staff market and StaffRole filter overlay"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Hub COACHES/SCOUTS → STAFF tab with filter overlay ✓ (Task 6)
  - Remove "+ Recruit {type}" button ✓ (Task 6 — StaffPane has no recruit button)
  - Market → Office rename ✓ (Task 7)
  - Office sub-nav CLUB + HIRE ✓ (Tasks 8, 9)
  - Club pane: AMP name, avatar, club name, stadium name, formation, playing style, colours ✓ (Task 8)
  - Hire pane: existing market UI + type filter ✓ (Task 9)
  - StaffRole exposed via /api/sync ✓ (Task 3)
  - Backend admin Staff consolidation (rename menu, fix enum) ✓ (Tasks 1, 2)

- [x] **Types consistent across tasks:**
  - `Club.formation` set in Task 5, used in Task 8 ✓
  - `MarketCoach.rawRole` added in Task 4, used in Task 9 ✓
  - `GameConfig.staffRoles` added in Task 4, used in Task 9 ✓
  - `Club.playingStyle` type `'POSSESSION' | 'DIRECT' | 'COUNTER' | 'HIGH_PRESS'` consistent with `ClubPersonality` in `world.ts` ✓

- [x] **No placeholders:** All code blocks contain actual implementations.

- [x] **Scope check:** Tasks are ordered by dependency (backend → types → store → UI). Each task produces independently testable changes.
