# Admin: Starter Config League Ability Ranges

**Date:** 2026-04-18
**Status:** Approved

---

## Overview

This specification details the addition of a dynamic configuration matrix to the backend `StarterConfig` entity to define the minimum and maximum player ability ranges for every country and league tier in the database. 

Currently, player ability ranges for NPC clubs are either hardcoded or lack granular control per league tier. By moving these ranges into `StarterConfig` and making them configurable via EasyAdmin, administrators gain complete control over the skill distribution across the entire world pyramid during initialization.

---

## Backend Changes

### 1. `StarterConfig` Entity

Add a new JSON column to persist the matrix of ability ranges.

```php
#[ORM\Column(type: 'json')]
private array $leagueAbilityRanges = [];

public function getLeagueAbilityRanges(): array { return $this->leagueAbilityRanges; }
public function setLeagueAbilityRanges(array $ranges): void { $this->leagueAbilityRanges = $ranges; }
```

- Create a Doctrine migration to add `league_ability_ranges` (default `{}`).

### 2. `DashboardController` (EasyAdmin)

**Form Rendering (`adminStarterConfig()`)**:
- Inject `LeagueRepository` or similar service to fetch all available distinct countries and their corresponding league tiers from the database.
- Example structure to pass to the template: `['EN' => [1, 2, 3, 4], 'ES' => [1, 2]]`.

**Form Processing (`adminStarterConfigSave()`)**:
- Read the submitted matrix from the request (e.g., `$request->request->all('leagueRanges')`).
- Validate and cast all values to integers before passing to `setLeagueAbilityRanges()`.

### 3. `starter_config.html.twig` Template

Add a new card section at the bottom of the form for **League Ability Ranges**.

- Iterate over the dynamically provided countries and their tiers.
- Render a grouped layout with `min` and `max` number inputs for each tier.
- Input names should follow the pattern: `name="leagueRanges[{{ country }}][{{ tier }}][min]"` and `name="leagueRanges[{{ country }}][{{ tier }}][max]"`.

```html
<div class="card mb-3">
  <div class="card-header">League Player Ability Ranges</div>
  <div class="card-body">
    <p class="text-muted small">Configure the minimum and maximum overall rating for players generated in each league tier during world initialization.</p>
    
    {% for country, tiers in dynamicLeagueTiers %}
      <h6 class="mt-3">{{ country }} Leagues</h6>
      <div class="row">
      {% for tier in tiers %}
        <div class="col-md-3 mb-2">
           <label>Tier {{ tier }}</label>
           <div class="input-group input-group-sm">
             <input type="number" name="leagueRanges[{{ country }}][{{ tier }}][min]" 
                    class="form-control" placeholder="Min" 
                    value="{{ config.leagueAbilityRanges[country][tier]['min'] | default('') }}"
                    min="1" max="100">
             <input type="number" name="leagueRanges[{{ country }}][{{ tier }}][max]" 
                    class="form-control" placeholder="Max"
                    value="{{ config.leagueAbilityRanges[country][tier]['max'] | default('') }}"
                    min="1" max="100">
           </div>
        </div>
      {% endfor %}
      </div>
    {% endfor %}
  </div>
</div>
```

### 4. Player Generation Logic

Update the service responsible for generating NPC clubs and players (likely `WorldInitializationService` or `MarketPoolService`).

- When generating a player for an NPC club, lookup the club's country and league tier in the `StarterConfig::getLeagueAbilityRanges()`.
- Use the configured `min` and `max` values to constrain the random generation of the player's core attributes (pace, technical, vision, power, stamina, heart) so the resulting overall rating falls within the bounds.
- If a bound is not configured for a specific tier/country, fallback to a sensible default.

---

## Frontend Changes

### `src/types/api.ts`

Update the `StarterConfig` interface to expose the new payload structure. This ensures the frontend is aware of the configuration shape if needed for display purposes during onboarding or debugging.

```typescript
export interface StarterConfig {
  // ... existing fields
  leagueAbilityRanges?: Record<string, Record<number, { min: number; max: number }>>;
}
```

No immediate UI changes are required on the frontend `OnboardingScreen` unless explicitly desired to show the exact starting range to the user, but the data will now be available in the `fetchStarterConfig` response.
