# Chained Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chained event system where firing a NPC pair event can boost the weight of follow-up events for that same pair within a configurable time window, configured in the backend and enforced by a dedicated Zustand store on the frontend.

**Architecture:** The backend `GameEventTemplate` entity gains a `chainedEvents` JSON column. The frontend maintains an `eventChainStore` (Zustand + AsyncStorage) of active boosts per player pair. `SocialGraphEngine` activates chains when an incident fires and applies multipliers during template selection; `GameLoop` expires stale boosts each tick. All three backend JSON fields (`chainedEvents`, `firingConditions`, `impacts`) are replaced with structured EasyAdmin forms.

**Tech Stack:** PHP 8.4, Symfony 8.0, EasyAdmin 5, Doctrine ORM + Migrations (backend); TypeScript, React Native, Zustand + AsyncStorage, Jest + jest-expo (frontend).

---

## File Map

**Backend — new files:**
- `src/Form/Type/ChainLinkType.php` — entry form for one chain link
- `src/Form/Type/TraitRequirementType.php` — entry form for one trait requirement
- `src/Form/Type/FiringConditionsType.php` — sub-form for the firingConditions object
- `src/Form/Type/StatChangeType.php` — entry form for one stat change
- `src/Form/Type/RelationshipEntryType.php` — entry form for one relationship entry
- `src/Form/Type/SelectionLogicFilterType.php` — sub-form for selection_logic.filter
- `src/Form/Type/SelectionLogicType.php` — sub-form for selection_logic
- `src/Form/Type/ManagerShiftType.php` — sub-form for manager_shift
- `src/Form/Type/DurationConfigType.php` — sub-form for duration_config
- `src/Form/Type/EventChoiceType.php` — entry form for one choice
- `src/Form/Type/EventImpactsType.php` — top-level sub-form for the impacts object
- `migrations/VersionXXX.php` — generated migration for chainedEvents column

**Backend — modified files:**
- `src/Entity/GameEventTemplate.php` — add `chainedEvents` property + virtual accessors
- `src/Service/NarrativeImportExportService.php` — include chainedEvents in export/import
- `src/Controller/Api/EventController.php` — include chainedEvents (without note) in API response
- `src/Controller/Admin/GameEventTemplateCrudController.php` — replace JSON textareas with structured fields
- `tests/Repository/GameEventTemplateRepositoryTest.php` — add chainedEvents tests

**Frontend — new files:**
- `src/stores/eventChainStore.ts` — Zustand store for active chain boosts
- `jest.config.js` — Jest configuration for jest-expo
- `__tests__/stores/eventChainStore.test.ts` — store unit tests
- `__tests__/engine/SocialGraphEngine.test.ts` — engine unit tests

**Frontend — modified files:**
- `src/types/narrative.ts` — add `ChainLink`, update `GameEventTemplate`
- `src/engine/SocialGraphEngine.ts` — activate chains + apply boosts
- `src/engine/GameLoop.ts` — call `expireChains` at tick start
- `package.json` — add Jest dependencies

---

## Task 1: Backend entity — add `chainedEvents` field

**Files:**
- Modify: `wunderkind-backend/src/Entity/GameEventTemplate.php`

- [ ] **Step 1: Add the `chainedEvents` property and all accessors**

Open `wunderkind-backend/src/Entity/GameEventTemplate.php`. Add the following property declaration after the `$severity` property (around line 53), and the following methods after `setSeverity()` (around line 134):

```php
    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $chainedEvents = null;
```

```php
    public function getChainedEvents(): ?array { return $this->chainedEvents; }
    public function setChainedEvents(?array $chainedEvents): void { $this->chainedEvents = $chainedEvents; }

    /** Returns the chainedEvents array, defaulting to [] for form binding. */
    public function getChainedEventsArray(): array { return $this->chainedEvents ?? []; }
    public function setChainedEventsArray(array $links): void { $this->chainedEvents = empty($links) ? null : $links; }

    /** Virtual accessor for raw-JSON admin textarea (kept for import/export). */
    public function getChainedEventsJson(): string
    {
        return $this->chainedEvents !== null
            ? (json_encode($this->chainedEvents, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?: '[]')
            : '[]';
    }

    public function setChainedEventsJson(?string $json): void
    {
        $trimmed = trim($json ?? '');
        if ($trimmed === '' || $trimmed === '[]') {
            $this->chainedEvents = null;
            return;
        }
        $decoded = json_decode($trimmed, true);
        $this->chainedEvents = is_array($decoded) ? $decoded : null;
    }
```

- [ ] **Step 2: Commit the entity change**

```bash
cd wunderkind-backend
git add src/Entity/GameEventTemplate.php
git commit -m "feat(entity): add chainedEvents JSON field to GameEventTemplate"
```

---

## Task 2: Backend entity tests for `chainedEvents`

**Files:**
- Modify: `wunderkind-backend/tests/Repository/GameEventTemplateRepositoryTest.php`

- [ ] **Step 1: Write failing tests for the new property**

Add the following test methods to the class in `tests/Repository/GameEventTemplateRepositoryTest.php`:

```php
    public function testChainedEventsDefaultsToNull(): void
    {
        $template = new GameEventTemplate(
            'test_event',
            EventCategory::PLAYER,
            'Test',
            'Body.',
        );

        $this->assertNull($template->getChainedEvents());
        $this->assertSame([], $template->getChainedEventsArray());
    }

    public function testSetChainedEventsArray(): void
    {
        $template = new GameEventTemplate(
            'player-argument',
            EventCategory::NPC_INTERACTION,
            'Argument',
            'Two players argue.',
        );

        $links = [
            [
                'nextEventSlug' => 'player-fight',
                'boostMultiplier' => 4.0,
                'windowWeeks' => 4,
                'note' => 'Escalates to fight',
            ],
        ];

        $template->setChainedEventsArray($links);

        $this->assertSame($links, $template->getChainedEvents());
        $this->assertSame($links, $template->getChainedEventsArray());
    }

    public function testSetChainedEventsArrayEmptyResetsToNull(): void
    {
        $template = new GameEventTemplate(
            'test_event',
            EventCategory::PLAYER,
            'Test',
            'Body.',
        );
        $template->setChainedEventsArray([['nextEventSlug' => 'other', 'boostMultiplier' => 2.0, 'windowWeeks' => 2, 'note' => null]]);
        $template->setChainedEventsArray([]);

        $this->assertNull($template->getChainedEvents());
    }

    public function testGetChainedEventsJsonReturnsEmptyArrayStringWhenNull(): void
    {
        $template = new GameEventTemplate(
            'test_event',
            EventCategory::PLAYER,
            'Test',
            'Body.',
        );

        $this->assertSame('[]', $template->getChainedEventsJson());
    }
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd wunderkind-backend
lando php bin/phpunit tests/Repository/GameEventTemplateRepositoryTest.php --testdox
```

Expected: All 7 tests pass (3 existing + 4 new).

- [ ] **Step 3: Commit**

```bash
git add tests/Repository/GameEventTemplateRepositoryTest.php
git commit -m "test(entity): add chainedEvents accessor tests"
```

---

## Task 3: Backend migration

**Files:**
- Create: `wunderkind-backend/migrations/Version<timestamp>.php` (generated)

- [ ] **Step 1: Generate the migration**

```bash
cd wunderkind-backend
lando php bin/console doctrine:migrations:diff
```

Expected output: `Generated new migration class to "migrations/Version<timestamp>.php"`.

- [ ] **Step 2: Inspect the generated migration**

Open the newly generated migration file. Verify it contains an `ALTER TABLE game_event_template ADD chained_events JSON DEFAULT NULL` (exact SQL varies by Doctrine version — just confirm it adds the `chained_events` column).

- [ ] **Step 3: Run the migration**

```bash
lando php bin/console doctrine:migrations:migrate --no-interaction
```

Expected: `[notice] Migrating up to Version<timestamp>` with no errors.

- [ ] **Step 4: Commit**

```bash
git add migrations/
git commit -m "chore(migration): add chained_events column to game_event_template"
```

---

## Task 4: Backend API serialization

**Files:**
- Modify: `wunderkind-backend/src/Controller/Api/EventController.php`
- Modify: `wunderkind-backend/src/Service/NarrativeImportExportService.php`

- [ ] **Step 1: Add `chainedEvents` to the API response (excluding `note`)**

In `src/Controller/Api/EventController.php`, in the `array_map` callback inside `templates()`, add `chainedEvents` after `severity`:

```php
        $data = array_map(static fn ($t) => [
            'slug'             => $t->getSlug(),
            'category'         => $t->getCategory()->value,
            'weight'           => $t->getWeight(),
            'title'            => $t->getTitle(),
            'bodyTemplate'     => $t->getBodyTemplate(),
            'impacts'          => $t->getImpacts(),
            'firingConditions' => $t->getFiringConditions(),
            'severity'         => $t->getSeverity(),
            'chainedEvents'    => $t->getChainedEventsWithoutNotes(),
        ], $items);
```

- [ ] **Step 2: Add `getChainedEventsWithoutNotes()` to entity**

In `src/Entity/GameEventTemplate.php`, add after `getChainedEventsJson()`:

```php
    /**
     * Returns chainedEvents stripped of the admin-only 'note' field.
     * This is what the frontend API receives.
     *
     * @return array<int, array{nextEventSlug: string, boostMultiplier: float, windowWeeks: int}>|null
     */
    public function getChainedEventsWithoutNotes(): ?array
    {
        if ($this->chainedEvents === null) return null;

        return array_map(static fn (array $link) => [
            'nextEventSlug'  => $link['nextEventSlug'],
            'boostMultiplier' => $link['boostMultiplier'],
            'windowWeeks'    => $link['windowWeeks'],
        ], $this->chainedEvents);
    }
```

- [ ] **Step 3: Update NarrativeImportExportService to include chainedEvents**

In `src/Service/NarrativeImportExportService.php`, find the export mapping (around line 49 where `impacts` and `firingConditions` are exported). Add `chainedEvents` to it:

```php
            'chainedEvents'    => $t->getChainedEvents(),
```

Find the import mapping (around line 155) and add:

```php
        $template->setChainedEvents($row['chainedEvents'] ?? null);
```

- [ ] **Step 4: Clear the cache and verify no errors**

```bash
cd wunderkind-backend
lando php bin/console cache:clear
```

Expected: Cache cleared with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/Controller/Api/EventController.php \
        src/Entity/GameEventTemplate.php \
        src/Service/NarrativeImportExportService.php
git commit -m "feat(api): include chainedEvents in /api/events/templates response"
```

---

## Task 5: Admin — `chainedEvents` CollectionField

**Files:**
- Create: `wunderkind-backend/src/Form/Type/ChainLinkType.php`
- Modify: `wunderkind-backend/src/Controller/Admin/GameEventTemplateCrudController.php`

- [ ] **Step 1: Create `ChainLinkType` form**

Create `src/Form/Type/ChainLinkType.php`:

```php
<?php

namespace App\Form\Type;

use App\Repository\GameEventTemplateRepository;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class ChainLinkType extends AbstractType
{
    public function __construct(
        private readonly GameEventTemplateRepository $templates,
    ) {}

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $slugChoices = [];
        foreach ($this->templates->findAll() as $t) {
            $slugChoices[$t->getSlug()] = $t->getSlug();
        }
        ksort($slugChoices);

        $builder
            ->add('nextEventSlug', ChoiceType::class, [
                'label'       => 'Next Event Slug',
                'choices'     => $slugChoices,
                'placeholder' => '— select event —',
            ])
            ->add('boostMultiplier', NumberType::class, [
                'label' => 'Boost Multiplier',
                'scale' => 2,
                'attr'  => ['min' => 1.0, 'step' => 0.5],
            ])
            ->add('windowWeeks', IntegerType::class, [
                'label' => 'Window (weeks)',
                'attr'  => ['min' => 1],
            ])
            ->add('note', TextType::class, [
                'label'    => 'Note (admin only)',
                'required' => false,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 2: Update the CRUD controller to use CollectionField**

Replace `wunderkind-backend/src/Controller/Admin/GameEventTemplateCrudController.php` with the following (adds `CollectionField` import and the new field — keep all existing fields unchanged):

```php
<?php

namespace App\Controller\Admin;

use App\Entity\GameEventTemplate;
use App\Enum\EventCategory;
use App\Form\Type\ChainLinkType;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class GameEventTemplateCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return GameEventTemplate::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud->setDefaultSort(['category' => 'ASC', 'weight' => 'DESC']);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->hideOnForm();
        yield TextField::new('slug')
            ->setHelp('Unique snake_case identifier, e.g. player_homesick');
        yield ChoiceField::new('category')
            ->setChoices(array_combine(
                array_map(fn (EventCategory $c) => ucfirst($c->value), EventCategory::cases()),
                EventCategory::cases(),
            ))
            ->formatValue(fn ($v) => $v instanceof EventCategory ? ucfirst($v->value) : ucfirst((string) $v));
        yield IntegerField::new('weight')
            ->setHelp('0 = inactive (never randomly selected). Higher = more frequent.');
        yield TextField::new('title');
        yield TextareaField::new('bodyTemplate')
            ->setHelp('Use {player}, {staff}, {facility}, {amount} as placeholders.')
            ->hideOnIndex();
        yield TextareaField::new('impactsJson', 'Impacts (JSON)')
            ->setHelp(
                'Array of impact descriptors. Example: [{"target":"player.morale","delta":-10}]. ' .
                'target: player.morale, player.confidence, player.energy, academy.reputation, academy.finances, staff.morale.'
            )
            ->hideOnIndex()
            ->setNumOfRows(6)
            ->setRequired(false);
        yield ChoiceField::new('severity')
            ->setChoices(['Minor' => 'minor', 'Major' => 'major'])
            ->setRequired(false)
            ->setHelp('minor = read-only inbox report. major = AMP must respond.');
        yield TextareaField::new('firingConditionsJson', 'Firing Conditions (JSON)')
            ->setRequired(false)
            ->setHelp('JSON: maxSquadMorale, maxPairRelationship, requiresCoLocation, actorTraitRequirements, subjectTraitRequirements')
            ->hideOnIndex();
        yield CollectionField::new('chainedEventsArray', 'Chained Events')
            ->setEntryType(ChainLinkType::class)
            ->allowAdd()
            ->allowDelete()
            ->setRequired(false)
            ->hideOnIndex()
            ->setHelp('Each entry boosts a follow-up event\'s weight for the same player pair after this event fires.');
        yield DateTimeField::new('createdAt')->hideOnForm();
    }
}
```

- [ ] **Step 3: Verify the admin form loads without error**

```bash
cd wunderkind-backend
lando php bin/console cache:clear
```

Open the EasyAdmin panel at `/admin` and navigate to a GameEventTemplate edit page. Verify the "Chained Events" collection field renders with add/remove buttons.

- [ ] **Step 4: Commit**

```bash
git add src/Form/Type/ChainLinkType.php \
        src/Controller/Admin/GameEventTemplateCrudController.php
git commit -m "feat(admin): add chainedEvents CollectionField to GameEventTemplate form"
```

---

## Task 6: Admin — `firingConditions` structured form

**Files:**
- Create: `wunderkind-backend/src/Form/Type/TraitRequirementType.php`
- Create: `wunderkind-backend/src/Form/Type/FiringConditionsType.php`
- Modify: `wunderkind-backend/src/Controller/Admin/GameEventTemplateCrudController.php`

- [ ] **Step 1: Create `TraitRequirementType`**

Create `src/Form/Type/TraitRequirementType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class TraitRequirementType extends AbstractType
{
    private const TRAITS = [
        'Determination'  => 'determination',
        'Professionalism' => 'professionalism',
        'Ambition'       => 'ambition',
        'Loyalty'        => 'loyalty',
        'Adaptability'   => 'adaptability',
        'Pressure'       => 'pressure',
        'Temperament'    => 'temperament',
        'Consistency'    => 'consistency',
    ];

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('trait', ChoiceType::class, [
                'label'   => 'Trait',
                'choices' => self::TRAITS,
            ])
            ->add('min', NumberType::class, [
                'label'    => 'Min (1–20)',
                'required' => false,
                'attr'     => ['min' => 1, 'max' => 20],
            ])
            ->add('max', NumberType::class, [
                'label'    => 'Max (1–20)',
                'required' => false,
                'attr'     => ['min' => 1, 'max' => 20],
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 2: Create `FiringConditionsType`**

Create `src/Form/Type/FiringConditionsType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class FiringConditionsType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('minSquadMorale', NumberType::class, [
                'label'    => 'Min Squad Morale',
                'required' => false,
            ])
            ->add('maxSquadMorale', NumberType::class, [
                'label'    => 'Max Squad Morale',
                'required' => false,
            ])
            ->add('minPairRelationship', NumberType::class, [
                'label'    => 'Min Pair Relationship',
                'required' => false,
            ])
            ->add('maxPairRelationship', NumberType::class, [
                'label'    => 'Max Pair Relationship',
                'required' => false,
            ])
            ->add('requiresCoLocation', CheckboxType::class, [
                'label'    => 'Requires Co-Location (same coach)',
                'required' => false,
            ])
            ->add('actorTraitRequirements', CollectionType::class, [
                'label'         => 'Actor Trait Requirements',
                'entry_type'    => TraitRequirementType::class,
                'allow_add'     => true,
                'allow_delete'  => true,
                'required'      => false,
                'by_reference'  => false,
            ])
            ->add('subjectTraitRequirements', CollectionType::class, [
                'label'         => 'Subject Trait Requirements',
                'entry_type'    => TraitRequirementType::class,
                'allow_add'     => true,
                'allow_delete'  => true,
                'required'      => false,
                'by_reference'  => false,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 3: Update the CRUD controller**

In `GameEventTemplateCrudController.php`, add the imports and replace the `firingConditionsJson` field:

Add to imports:
```php
use App\Form\Type\FiringConditionsType;
use EasyCorp\Bundle\EasyAdminBundle\Field\Field;
```

Replace:
```php
        yield TextareaField::new('firingConditionsJson', 'Firing Conditions (JSON)')
            ->setRequired(false)
            ->setHelp('JSON: maxSquadMorale, maxPairRelationship, requiresCoLocation, actorTraitRequirements, subjectTraitRequirements')
            ->hideOnIndex();
```

With:
```php
        yield Field::new('firingConditions', 'Firing Conditions')
            ->setFormType(FiringConditionsType::class)
            ->setRequired(false)
            ->hideOnIndex()
            ->setHelp('Leave blank for events with no firing conditions.');
```

- [ ] **Step 4: Clear cache and verify**

```bash
cd wunderkind-backend
lando php bin/console cache:clear
```

Open the admin edit page for an NPC_INTERACTION event that has firingConditions set (e.g. any altercation event). Verify the structured form fields render and pre-populate from existing data.

- [ ] **Step 5: Commit**

```bash
git add src/Form/Type/TraitRequirementType.php \
        src/Form/Type/FiringConditionsType.php \
        src/Controller/Admin/GameEventTemplateCrudController.php
git commit -m "feat(admin): replace firingConditions JSON textarea with structured form"
```

---

## Task 7: Admin — `impacts` structured form

**Files:**
- Create: `wunderkind-backend/src/Form/Type/StatChangeType.php`
- Create: `wunderkind-backend/src/Form/Type/RelationshipEntryType.php`
- Create: `wunderkind-backend/src/Form/Type/SelectionLogicFilterType.php`
- Create: `wunderkind-backend/src/Form/Type/SelectionLogicType.php`
- Create: `wunderkind-backend/src/Form/Type/ManagerShiftType.php`
- Create: `wunderkind-backend/src/Form/Type/DurationConfigType.php`
- Create: `wunderkind-backend/src/Form/Type/EventChoiceType.php`
- Create: `wunderkind-backend/src/Form/Type/EventImpactsType.php`
- Modify: `wunderkind-backend/src/Controller/Admin/GameEventTemplateCrudController.php`

- [ ] **Step 1: Create `StatChangeType`**

Create `src/Form/Type/StatChangeType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class StatChangeType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('target', TextType::class, [
                'label' => 'Target (e.g. player_1, squad_wide)',
                'attr'  => ['placeholder' => 'player_1'],
            ])
            ->add('field', TextType::class, [
                'label' => 'Field (e.g. morale, overallRating)',
                'attr'  => ['placeholder' => 'morale'],
            ])
            ->add('operator', ChoiceType::class, [
                'label'   => 'Operator',
                'choices' => ['Add' => 'add', 'Subtract' => 'subtract', 'Set' => 'set'],
            ])
            ->add('value', NumberType::class, [
                'label' => 'Value',
                'scale' => 0,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 2: Create `RelationshipEntryType`**

Create `src/Form/Type/RelationshipEntryType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class RelationshipEntryType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('type', ChoiceType::class, [
                'label'   => 'Type',
                'choices' => ['Rivalry' => 'rivalry', 'Friendship' => 'friendship'],
            ])
            ->add('player_1_ref', TextType::class, [
                'label' => 'Player 1 Ref (e.g. player_1)',
                'attr'  => ['placeholder' => 'player_1'],
            ])
            ->add('player_2_ref', TextType::class, [
                'label' => 'Player 2 Ref (e.g. player_2)',
                'attr'  => ['placeholder' => 'player_2'],
            ])
            ->add('intensity', NumberType::class, [
                'label' => 'Intensity',
                'scale' => 0,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 3: Create `SelectionLogicFilterType`**

Create `src/Form/Type/SelectionLogicFilterType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class SelectionLogicFilterType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('position', ChoiceType::class, [
                'label'       => 'Position',
                'required'    => false,
                'placeholder' => '— any —',
                'choices'     => ['GK' => 'GK', 'DEF' => 'DEF', 'MID' => 'MID', 'FWD' => 'FWD'],
            ])
            ->add('active_only', CheckboxType::class, [
                'label'    => 'Active only',
                'required' => false,
            ])
            ->add('min_age', IntegerType::class, [
                'label'    => 'Min Age',
                'required' => false,
            ])
            ->add('max_age', IntegerType::class, [
                'label'    => 'Max Age',
                'required' => false,
            ])
            ->add('max_level', IntegerType::class, [
                'label'    => 'Max Level',
                'required' => false,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 4: Create `SelectionLogicType`**

Create `src/Form/Type/SelectionLogicType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class SelectionLogicType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('target_type', ChoiceType::class, [
                'label'   => 'Target Type',
                'choices' => [
                    'Player'     => 'player',
                    'Facility'   => 'facility',
                    'Staff'      => 'staff',
                    'Squad Wide' => 'squad_wide',
                ],
            ])
            ->add('count', IntegerType::class, [
                'label' => 'Count',
                'attr'  => ['min' => 1],
            ])
            ->add('filter', SelectionLogicFilterType::class, [
                'label'    => 'Filter',
                'required' => false,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 5: Create `ManagerShiftType`**

Create `src/Form/Type/ManagerShiftType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class ManagerShiftType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('temperament', NumberType::class, ['label' => 'Temperament', 'scale' => 0])
            ->add('discipline',  NumberType::class, ['label' => 'Discipline',  'scale' => 0])
            ->add('ambition',    NumberType::class, ['label' => 'Ambition',    'scale' => 0]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 6: Create `DurationConfigType`**

Create `src/Form/Type/DurationConfigType.php`:

```php
<?php

namespace App\Form\Type;

use App\Repository\GameEventTemplateRepository;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class DurationConfigType extends AbstractType
{
    public function __construct(
        private readonly GameEventTemplateRepository $templates,
    ) {}

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $slugChoices = [];
        foreach ($this->templates->findAll() as $t) {
            $slugChoices[$t->getSlug()] = $t->getSlug();
        }
        ksort($slugChoices);

        $builder
            ->add('ticks', IntegerType::class, [
                'label' => 'Duration (ticks)',
                'attr'  => ['min' => 1],
            ])
            ->add('completion_event_slug', ChoiceType::class, [
                'label'       => 'Completion Event',
                'choices'     => $slugChoices,
                'placeholder' => '— select event —',
                'required'    => false,
            ])
            ->add('tick_effect', StatChangeType::class, [
                'label'    => 'Tick Effect (optional stat change each tick)',
                'required' => false,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 7: Create `EventChoiceType`**

Create `src/Form/Type/EventChoiceType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class EventChoiceType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('emoji', TextType::class, ['label' => 'Emoji'])
            ->add('label', TextType::class, ['label' => 'Label'])
            ->add('manager_shift', ManagerShiftType::class, ['label' => 'Manager Shift'])
            ->add('stat_changes', TextareaType::class, [
                'label'    => 'Stat Changes (JSON array)',
                'required' => false,
                'attr'     => ['rows' => 3, 'placeholder' => '[{"target":"player_1","field":"morale","operator":"add","value":5}]'],
                'help'     => 'JSON array of stat change objects. Full structured editing coming in a future update.',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 8: Create `EventImpactsType`**

Create `src/Form/Type/EventImpactsType.php`:

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\OptionsResolver\OptionsResolver;

class EventImpactsType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('selection_logic', SelectionLogicType::class, [
                'label'    => 'Selection Logic',
                'required' => false,
            ])
            ->add('stat_changes', CollectionType::class, [
                'label'        => 'Stat Changes',
                'entry_type'   => StatChangeType::class,
                'allow_add'    => true,
                'allow_delete' => true,
                'required'     => false,
                'by_reference' => false,
            ])
            ->add('relationships', CollectionType::class, [
                'label'        => 'Relationships',
                'entry_type'   => RelationshipEntryType::class,
                'allow_add'    => true,
                'allow_delete' => true,
                'required'     => false,
                'by_reference' => false,
            ])
            ->add('duration_config', DurationConfigType::class, [
                'label'    => 'Duration Config',
                'required' => false,
            ])
            ->add('choices', CollectionType::class, [
                'label'        => 'Choices',
                'entry_type'   => EventChoiceType::class,
                'allow_add'    => true,
                'allow_delete' => true,
                'required'     => false,
                'by_reference' => false,
            ]);

        // Strip null/empty sub-objects so the entity stays clean
        $builder->addEventListener(FormEvents::POST_SUBMIT, static function (FormEvent $event): void {
            $data = $event->getData();
            if (!is_array($data)) return;
            foreach (['selection_logic', 'duration_config'] as $key) {
                if (isset($data[$key]) && array_filter($data[$key]) === []) {
                    $data[$key] = null;
                }
            }
            $event->setData($data);
        });
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
```

- [ ] **Step 9: Update the CRUD controller for `impacts`**

In `GameEventTemplateCrudController.php`, add imports and replace the `impactsJson` field:

Add import:
```php
use App\Form\Type\EventImpactsType;
```

Replace:
```php
        yield TextareaField::new('impactsJson', 'Impacts (JSON)')
            ->setHelp(
                'Array of impact descriptors. Example: [{"target":"player.morale","delta":-10}]. ' .
                'target: player.morale, player.confidence, player.energy, academy.reputation, academy.finances, staff.morale.'
            )
            ->hideOnIndex()
            ->setNumOfRows(6)
            ->setRequired(false);
```

With:
```php
        yield Field::new('impacts', 'Impacts')
            ->setFormType(EventImpactsType::class)
            ->setRequired(false)
            ->hideOnIndex()
            ->setHelp('Configure all stat changes, relationships, choices, and duration for this event.');
```

- [ ] **Step 10: Clear cache and verify**

```bash
cd wunderkind-backend
lando php bin/console cache:clear
```

Open an existing event with impacts in the admin panel. Verify the structured impacts form renders and pre-populates correctly.

- [ ] **Step 11: Commit**

```bash
git add src/Form/Type/StatChangeType.php \
        src/Form/Type/RelationshipEntryType.php \
        src/Form/Type/SelectionLogicFilterType.php \
        src/Form/Type/SelectionLogicType.php \
        src/Form/Type/ManagerShiftType.php \
        src/Form/Type/DurationConfigType.php \
        src/Form/Type/EventChoiceType.php \
        src/Form/Type/EventImpactsType.php \
        src/Controller/Admin/GameEventTemplateCrudController.php
git commit -m "feat(admin): replace impacts JSON textarea with structured form"
```

---

## Task 8: Frontend — Jest setup

**Files:**
- Modify: `wunderkind-app/package.json`
- Create: `wunderkind-app/jest.config.js`
- Create: `wunderkind-app/__tests__/.gitkeep`

- [ ] **Step 1: Install test dependencies**

```bash
cd wunderkind-app
npx expo install jest-expo jest @types/jest
npm install --save-dev babel-jest @babel/core
```

Expected: Packages added to `package.json` devDependencies.

- [ ] **Step 2: Add test script to `package.json`**

In `wunderkind-app/package.json`, add to the `scripts` block:

```json
"test": "jest"
```

- [ ] **Step 3: Create `jest.config.js`**

Create `wunderkind-app/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathPattern: '__tests__',
};
```

- [ ] **Step 4: Create test directories**

```bash
mkdir -p wunderkind-app/__tests__/stores
mkdir -p wunderkind-app/__tests__/engine
```

- [ ] **Step 5: Verify Jest runs**

```bash
cd wunderkind-app
npm test -- --passWithNoTests
```

Expected: `Test Suites: 0 passed, 0 total` with no errors.

- [ ] **Step 6: Commit**

```bash
git add jest.config.js package.json __tests__/
git commit -m "chore: set up Jest with jest-expo for frontend tests"
```

---

## Task 9: Frontend types

**Files:**
- Modify: `wunderkind-app/src/types/narrative.ts`

- [ ] **Step 1: Add `ChainLink` interface and update `GameEventTemplate`**

In `src/types/narrative.ts`, add the following **before** the `GameEventTemplate` interface (around line 100):

```ts
export interface ChainLink {
  /** Slug of the event whose weight is boosted when this event fires */
  nextEventSlug: string;
  /** Multiplier applied to nextEventSlug's weight during selection (e.g. 4.0 = 4×) */
  boostMultiplier: number;
  /** Number of weeks the boost remains active after this event fires */
  windowWeeks: number;
}
```

In the `GameEventTemplate` interface, add the new field after `severity`:

```ts
  chainedEvents?: ChainLink[] | null;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd wunderkind-app
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/narrative.ts
git commit -m "feat(types): add ChainLink interface and chainedEvents to GameEventTemplate"
```

---

## Task 10: Frontend `eventChainStore`

**Files:**
- Create: `wunderkind-app/src/stores/eventChainStore.ts`
- Create: `wunderkind-app/__tests__/stores/eventChainStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `wunderkind-app/__tests__/stores/eventChainStore.test.ts`:

```ts
// Mock AsyncStorage before any imports
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useEventChainStore } from '@/stores/eventChainStore';

const LINK = { nextEventSlug: 'player-fight', boostMultiplier: 4.0, windowWeeks: 4 };

beforeEach(() => {
  useEventChainStore.setState({ boosts: [] });
});

describe('activateChain', () => {
  it('adds a new boost entry', () => {
    useEventChainStore.getState().activateChain('player-argument', 'aaa', 'bbb', LINK, 10);
    const boosts = useEventChainStore.getState().boosts;
    expect(boosts).toHaveLength(1);
    expect(boosts[0].boostedSlug).toBe('player-fight');
    expect(boosts[0].multiplier).toBe(4.0);
    expect(boosts[0].expiresWeek).toBe(14); // 10 + 4
    expect(boosts[0].sourceSlug).toBe('player-argument');
  });

  it('normalises pairKey so (a,b) and (b,a) are the same', () => {
    useEventChainStore.getState().activateChain('evt', 'zzz', 'aaa', LINK, 1);
    useEventChainStore.getState().activateChain('evt', 'aaa', 'zzz', LINK, 1);
    expect(useEventChainStore.getState().boosts).toHaveLength(1); // upserted, not duplicated
  });

  it('refreshes expiresWeek on upsert', () => {
    useEventChainStore.getState().activateChain('evt', 'aaa', 'bbb', LINK, 5);
    useEventChainStore.getState().activateChain('evt', 'aaa', 'bbb', LINK, 10);
    const boosts = useEventChainStore.getState().boosts;
    expect(boosts).toHaveLength(1);
    expect(boosts[0].expiresWeek).toBe(14); // 10 + 4, not 5 + 4
  });
});

describe('expireChains', () => {
  it('removes entries where expiresWeek <= currentWeek', () => {
    useEventChainStore.getState().activateChain('evt', 'aaa', 'bbb', LINK, 1); // expires week 5
    useEventChainStore.getState().activateChain('evt', 'aaa', 'ccc', LINK, 5); // expires week 9
    useEventChainStore.getState().expireChains(5);
    const boosts = useEventChainStore.getState().boosts;
    expect(boosts).toHaveLength(1);
    expect(boosts[0].expiresWeek).toBe(9);
  });

  it('keeps all entries when none have expired', () => {
    useEventChainStore.getState().activateChain('evt', 'aaa', 'bbb', LINK, 10); // expires 14
    useEventChainStore.getState().expireChains(5);
    expect(useEventChainStore.getState().boosts).toHaveLength(1);
  });
});

describe('getBoostsForPair', () => {
  it('returns active boosts for the pair in either order', () => {
    useEventChainStore.getState().activateChain('evt', 'aaa', 'bbb', LINK, 1);
    const result = useEventChainStore.getState().getBoostsForPair('bbb', 'aaa');
    expect(result).toHaveLength(1);
    expect(result[0].boostedSlug).toBe('player-fight');
  });

  it('returns empty array for unknown pair', () => {
    expect(useEventChainStore.getState().getBoostsForPair('xxx', 'yyy')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd wunderkind-app
npm test -- __tests__/stores/eventChainStore.test.ts
```

Expected: `Cannot find module '@/stores/eventChainStore'` or similar import error.

- [ ] **Step 3: Implement `eventChainStore`**

Create `wunderkind-app/src/stores/eventChainStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import { ChainLink } from '@/types/narrative';

export interface ActiveChainBoost {
  id: string;
  /** Canonical: `${lowerUUID}:${higherUUID}` */
  pairKey: string;
  /** Slug of the event that activated this boost */
  sourceSlug: string;
  /** Slug whose weight is boosted */
  boostedSlug: string;
  multiplier: number;
  expiresWeek: number;
}

function makePairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

interface EventChainState {
  boosts: ActiveChainBoost[];

  /**
   * Activates (or refreshes) a chain boost for a player pair.
   * If an entry already exists for the same pair + boostedSlug, its expiresWeek is updated.
   */
  activateChain: (
    sourceSlug: string,
    playerAId: string,
    playerBId: string,
    link: ChainLink,
    currentWeek: number,
  ) => void;

  /** Removes all entries where expiresWeek <= currentWeek. Call at the top of each tick. */
  expireChains: (currentWeek: number) => void;

  /** Returns all active boosts for the given player pair. */
  getBoostsForPair: (playerAId: string, playerBId: string) => ActiveChainBoost[];

  clearAll: () => void;
}

export const useEventChainStore = create<EventChainState>()(
  persist(
    (set, get) => ({
      boosts: [],

      activateChain: (sourceSlug, playerAId, playerBId, link, currentWeek) => {
        const pairKey = makePairKey(playerAId, playerBId);
        const expiresWeek = currentWeek + link.windowWeeks;

        set((state) => {
          const existingIndex = state.boosts.findIndex(
            (b) => b.pairKey === pairKey && b.boostedSlug === link.nextEventSlug,
          );

          if (existingIndex !== -1) {
            // Refresh the expiry window
            const updated = [...state.boosts];
            updated[existingIndex] = {
              ...updated[existingIndex],
              sourceSlug,
              multiplier: link.boostMultiplier,
              expiresWeek,
            };
            return { boosts: updated };
          }

          return {
            boosts: [
              ...state.boosts,
              {
                id: uuidv7(),
                pairKey,
                sourceSlug,
                boostedSlug: link.nextEventSlug,
                multiplier: link.boostMultiplier,
                expiresWeek,
              },
            ],
          };
        });
      },

      expireChains: (currentWeek) =>
        set((state) => ({
          boosts: state.boosts.filter((b) => b.expiresWeek > currentWeek),
        })),

      getBoostsForPair: (playerAId, playerBId) => {
        const pairKey = makePairKey(playerAId, playerBId);
        return get().boosts.filter((b) => b.pairKey === pairKey);
      },

      clearAll: () => set({ boosts: [] }),
    }),
    { name: 'event-chain-store', storage: zustandStorage },
  ),
);
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd wunderkind-app
npm test -- __tests__/stores/eventChainStore.test.ts
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/stores/eventChainStore.ts \
        __tests__/stores/eventChainStore.test.ts
git commit -m "feat(store): add eventChainStore for active chain boost tracking"
```

---

## Task 11: Frontend — `SocialGraphEngine` integration

**Files:**
- Modify: `wunderkind-app/src/engine/SocialGraphEngine.ts`
- Create: `wunderkind-app/__tests__/engine/SocialGraphEngine.test.ts`

- [ ] **Step 1: Write failing tests for chain activation and boost application**

Create `wunderkind-app/__tests__/engine/SocialGraphEngine.test.ts`:

```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { applyChainBoosts, extractChainedSlugsAndActivate } from '@/engine/SocialGraphEngine';
import { useEventChainStore } from '@/stores/eventChainStore';
import { GameEventTemplate } from '@/types/narrative';

const makeTemplate = (slug: string, weight: number, chainedEvents?: GameEventTemplate['chainedEvents']): GameEventTemplate => ({
  id: slug,
  slug,
  category: 'NPC_INTERACTION' as any,
  weight,
  title: slug,
  bodyTemplate: '',
  impacts: {},
  chainedEvents,
});

beforeEach(() => {
  useEventChainStore.setState({ boosts: [] });
});

describe('applyChainBoosts', () => {
  it('multiplies weight of a boosted template', () => {
    useEventChainStore.getState().activateChain(
      'player-argument',
      'aaa', 'bbb',
      { nextEventSlug: 'player-fight', boostMultiplier: 4.0, windowWeeks: 4 },
      1,
    );

    const templates = [
      makeTemplate('player-argument', 5),
      makeTemplate('player-fight', 2),
    ];

    const result = applyChainBoosts(templates, 'aaa', 'bbb');
    const fight = result.find((t) => t.slug === 'player-fight')!;
    expect(fight.weight).toBe(8); // 2 × 4.0
  });

  it('does not mutate original template weights', () => {
    useEventChainStore.getState().activateChain(
      'player-argument',
      'aaa', 'bbb',
      { nextEventSlug: 'player-fight', boostMultiplier: 4.0, windowWeeks: 4 },
      1,
    );

    const original = makeTemplate('player-fight', 2);
    applyChainBoosts([original], 'aaa', 'bbb');
    expect(original.weight).toBe(2);
  });

  it('returns templates unchanged when no boosts are active', () => {
    const templates = [makeTemplate('player-fight', 5)];
    const result = applyChainBoosts(templates, 'aaa', 'bbb');
    expect(result[0].weight).toBe(5);
  });
});

describe('extractChainedSlugsAndActivate', () => {
  it('writes a boost to eventChainStore for each chain link', () => {
    const template = makeTemplate('player-argument', 5, [
      { nextEventSlug: 'player-fight', boostMultiplier: 4.0, windowWeeks: 4 },
    ]);

    extractChainedSlugsAndActivate(template, 'aaa', 'bbb', 10);

    const boosts = useEventChainStore.getState().boosts;
    expect(boosts).toHaveLength(1);
    expect(boosts[0].boostedSlug).toBe('player-fight');
    expect(boosts[0].expiresWeek).toBe(14);
  });

  it('does nothing when chainedEvents is null', () => {
    const template = makeTemplate('simple-event', 3, null);
    extractChainedSlugsAndActivate(template, 'aaa', 'bbb', 1);
    expect(useEventChainStore.getState().boosts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd wunderkind-app
npm test -- __tests__/engine/SocialGraphEngine.test.ts
```

Expected: Fails because `applyChainBoosts` and `extractChainedSlugsAndActivate` are not exported.

- [ ] **Step 3: Add `applyChainBoosts` and `extractChainedSlugsAndActivate` to `SocialGraphEngine.ts`**

At the top of `src/engine/SocialGraphEngine.ts`, add the import:

```ts
import { useEventChainStore } from '@/stores/eventChainStore';
import { GameEventTemplate } from '@/types/narrative';
```

After the existing `BASE_INCIDENT_PROBABILITY` constant, add these two exported helpers:

```ts
/**
 * Returns a new array of templates with chain-boosted weights applied for the given pair.
 * Original template objects are not mutated.
 */
export function applyChainBoosts(
  templates: GameEventTemplate[],
  playerAId: string,
  playerBId: string,
): GameEventTemplate[] {
  const boosts = useEventChainStore.getState().getBoostsForPair(playerAId, playerBId);
  if (boosts.length === 0) return templates;

  return templates.map((t) => {
    const boost = boosts.find((b) => b.boostedSlug === t.slug);
    if (!boost) return t;
    return { ...t, weight: t.weight * boost.multiplier };
  });
}

/**
 * Reads the fired template's chainedEvents and writes boost entries to eventChainStore.
 */
export function extractChainedSlugsAndActivate(
  template: GameEventTemplate,
  playerAId: string,
  playerBId: string,
  currentWeek: number,
): void {
  if (!template.chainedEvents?.length) return;

  const { activateChain } = useEventChainStore.getState();
  for (const link of template.chainedEvents) {
    activateChain(template.slug, playerAId, playerBId, link, currentWeek);
  }
}
```

- [ ] **Step 4: Integrate both helpers into `processSocialGraph`**

In `processSocialGraph()`, find the NPC incident section (around line 336–416). Make these two targeted changes:

**Change 1 — Apply boosts before selection** (around line 380, after `if (eligible.length === 0) continue;`):

Replace:
```ts
      if (eligible.length === 0) continue;
      if (Math.random() > BASE_INCIDENT_PROBABILITY) continue;

      const template = eligible.reduce((best, t) =>
        t.weight > best.weight ? t : best,
      );
```

With:
```ts
      if (eligible.length === 0) continue;
      if (Math.random() > BASE_INCIDENT_PROBABILITY) continue;

      const boosted = applyChainBoosts(eligible, actor.id, subject.id);
      const template = boosted.reduce((best, t) =>
        t.weight > best.weight ? t : best,
      );
```

**Change 2 — Activate chains after the incident fires** (around line 393, after `simulationService.triggerNpcIncident(...)`):

Add the following line immediately after the `simulationService.triggerNpcIncident(...)` call:

```ts
      extractChainedSlugsAndActivate(template, actor.id, subject.id, weekNumber);
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd wunderkind-app
npm test -- __tests__/engine/SocialGraphEngine.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/engine/SocialGraphEngine.ts \
        __tests__/engine/SocialGraphEngine.test.ts
git commit -m "feat(engine): activate and apply chain event boosts in SocialGraphEngine"
```

---

## Task 12: Frontend — `GameLoop` expiry call

**Files:**
- Modify: `wunderkind-app/src/engine/GameLoop.ts`

- [ ] **Step 1: Add the import and expiry call**

In `src/engine/GameLoop.ts`, add the import near the top with the other store imports:

```ts
import { useEventChainStore } from '@/stores/eventChainStore';
```

Inside `processWeeklyTick()`, find the line that reads the current week number (look for `academy.weekNumber` — this is fetched around line 75). Add the `expireChains` call immediately after the week number is resolved and before any event processing:

```ts
  // Expire stale chain boosts before evaluating any events this tick
  useEventChainStore.getState().expireChains(academy.weekNumber ?? 1);
```

Place this line right after the destructuring of `useAcademyStore.getState()` (around line 75–76).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd wunderkind-app
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/GameLoop.ts
git commit -m "feat(engine): expire stale chain boosts at the start of each weekly tick"
```

---

## Task 13: Wire `eventChainStore` into `resetAllStores`

**Files:**
- Modify: `wunderkind-app/src/stores/resetAllStores.ts`

`resetAllStores.ts` uses two mechanisms: `ALL_STORE_KEYS` (passed to `AsyncStorage.multiRemove` in `clearAllAcademyData`) wipes persisted data; `resetInMemoryStores()` clears in-memory state mid-session. Both need updating.

- [ ] **Step 1: Add the store key to `ALL_STORE_KEYS`**

In `src/stores/resetAllStores.ts`, add `'event-chain-store'` to the `ALL_STORE_KEYS` array:

```ts
const ALL_STORE_KEYS = [
  'auth-store',
  'academy-store',
  'squad-store',
  'coach-store',
  'scout-store',
  'market-store',
  'facility-store',
  'inbox-store',
  'finance-store',
  'loan-store',
  'altercation-store',
  'active-effect-store',
  'narrative-store',
  'interaction-store',
  'event-store',
  'prospect-pool-store',
  'game-config-store',
  'archetype-store',
  'loss-condition-store',
  'guardian-store',
  'event-chain-store',   // ← add this
];
```

- [ ] **Step 2: Add in-memory reset to `resetInMemoryStores`**

Add the import near the top of `resetAllStores.ts`:

```ts
import { useEventChainStore } from './eventChainStore';
```

Add the clear call inside `resetInMemoryStores()`, after the `useGuardianStore` line:

```ts
  useEventChainStore.getState().clearAll();
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd wunderkind-app
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/stores/resetAllStores.ts
git commit -m "feat(store): include eventChainStore in resetAllStores"
```
