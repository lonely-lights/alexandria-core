# Stage 1: EAV Foundation Lift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the EAV foundation (Project, Blueprint, BlueprintField, Entry, FieldValue + the `HasDynamicAttributes` trait) from `alexandria-legacy` into `alexandria-core` with all Spatie/AI/media/notes/history coupling stripped, leaving a minimal, Testbench-verified, content-free Composer library that any Laravel 13 app can `composer require` to get a working entity-attribute-value worldbuilder backend.

**Architecture:** Core ships its own database migrations under a flattened timestamp scheme (no `0090_*` legacy prefix), Eloquent models under `Alexandria\Core\Models\{Framework,System}`, and the EAV magic trait under `Alexandria\Core\Traits\System`. The User model is abstracted behind `config('alexandria.models.user')` per ADR-006 so consumers (alexandria-app, third parties) plug in their own. Service provider auto-loads migrations + binds default model classes; consumers override via published config. All tests run inside Orchestra Testbench against an in-memory SQLite database — zero host-app coupling.

**Tech Stack:** PHP 8.4 / Laravel 13 / Pest 4 / Orchestra Testbench 11. Uses Eloquent's standard relationships, soft deletes, and slugs (without Spatie's `HasSlug` for now — manual slug generation in `creating` events to keep dependencies lean). No Spatie packages required for Phase 1+2.

**Out of scope (deferred to follow-up plans):** EntryRelationship + RelationshipBlueprint + `HasDynamicRelationships` trait (sibling lift), AI subsystem, view registry, media library wiring, history service, mention parsing, ProjectSetupOrchestrator. Each gets its own plan once this one ships green.

---

## File Structure

**Created in `alexandria-core/`:**

```
src/
├── AlexandriaServiceProvider.php   (modified: load migrations, register config, bind models)
├── Contracts/
│   └── (none yet — User is resolved via config, not a contract, per ADR-006)
├── Models/
│   ├── Framework/
│   │   └── Project.php
│   └── System/
│       ├── Blueprint.php
│       ├── BlueprintField.php
│       ├── Entry.php
│       └── FieldValue.php
└── Traits/
    └── System/
        └── HasDynamicAttributes.php

database/
├── migrations/
│   ├── 0001_01_01_000010_create_projects_table.php
│   ├── 0001_01_01_000020_create_blueprints_table.php
│   ├── 0001_01_01_000025_create_blueprint_fields_table.php
│   ├── 0001_01_01_000030_create_entries_table.php
│   └── 0001_01_01_000040_create_field_values_table.php
└── factories/
    ├── Framework/
    │   └── ProjectFactory.php
    └── System/
        ├── BlueprintFactory.php
        ├── BlueprintFieldFactory.php
        ├── EntryFactory.php
        └── FieldValueFactory.php

config/
└── alexandria.php   (model bindings)

tests/
├── TestCase.php   (modified: load package migrations + set in-memory sqlite)
├── Pest.php   (modified: feature suite uses TestCase)
└── Feature/
    ├── Models/
    │   ├── ProjectTest.php
    │   ├── BlueprintTest.php
    │   ├── BlueprintFieldTest.php
    │   ├── EntryTest.php
    │   └── FieldValueTest.php
    └── Eav/
        └── HasDynamicAttributesTest.php
```

**Touched in `alexandria-app/`** (last task only):

- `config/alexandria.php` — published from core, override `models.user` to `App\Models\User::class`.

---

## Phase 1: Foundation Setup (Tasks 1–3)

Establish directory structure, the published config + service-provider plumbing, and verify Testbench can boot the package against an in-memory SQLite database before any models exist.

---

### Task 1: Configure Testbench for in-memory SQLite + bootable migrations

**Files:**
- Modify: `tests/TestCase.php`
- Create: `phpunit.xml.dist` (modified — add `<php>` env block)
- Test: `tests/Feature/PackageBootsTest.php` (existing — extend assertion)

- [ ] **Step 1: Update `tests/TestCase.php` to set in-memory SQLite + load package migrations**

Replace contents of `tests/TestCase.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Tests;

use Alexandria\Core\AlexandriaServiceProvider;
use Orchestra\Testbench\Concerns\WithWorkbench;
use Orchestra\Testbench\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use WithWorkbench;

    /**
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            AlexandriaServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'testing');
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]);
    }

    protected function defineDatabaseMigrations(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }
}
```

- [ ] **Step 2: Update `phpunit.xml.dist` to set DB env defaults**

Replace `<phpunit>` block's child `<source>` line with `<source>...</source>` followed by:

```xml
<php>
    <env name="DB_CONNECTION" value="testing"/>
    <env name="APP_KEY" value="base64:WgQGfgfH8XPiL1A6f9uLuQwXp7bF6JtL3eY5sZk0bKE="/>
</php>
```

(Add this between the existing `<source>` close tag and the `</phpunit>` close tag.)

- [ ] **Step 3: Run the existing smoke test to confirm Testbench still boots**

Run: `vendor/bin/pest tests/Feature/PackageBootsTest.php`
Expected: PASS, 1 assertion.

- [ ] **Step 4: Commit**

```bash
git add tests/TestCase.php phpunit.xml.dist
git commit -m "test: configure Testbench with in-memory SQLite + package migration loader

The TestCase now uses Orchestra Testbench's WithWorkbench concern, sets
the database connection to in-memory SQLite per test run, and auto-loads
any migrations from database/migrations/. Adding migrations later in
this plan no longer requires test-side wiring -- they just appear."
```

---

### Task 2: Add the alexandria config file with model bindings

**Files:**
- Create: `config/alexandria.php`
- Modify: `src/AlexandriaServiceProvider.php`
- Test: `tests/Feature/ConfigPublishingTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/ConfigPublishingTest.php`:

```php
<?php

declare(strict_types=1);

it('exposes the alexandria config with default model bindings', function () {
    expect(config('alexandria.models.project'))
        ->toBe(\Alexandria\Core\Models\Framework\Project::class);

    expect(config('alexandria.models.user'))
        ->toBe(\Illuminate\Foundation\Auth\User::class);
});

it('publishes the alexandria config when vendor:publish is run', function () {
    $stub = realpath(__DIR__.'/../../config/alexandria.php');
    expect($stub)->toBeFile();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `vendor/bin/pest tests/Feature/ConfigPublishingTest.php`
Expected: FAIL — config keys not defined, file does not exist.

- [ ] **Step 3: Create `config/alexandria.php`**

```php
<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Model Bindings
    |--------------------------------------------------------------------------
    |
    | Override any Alexandria model with your own subclass. The framework
    | resolves model classes through these config values, never via direct
    | class references. To swap a model, extend the default class and
    | replace the binding here.
    |
    */
    'models' => [
        'user' => \Illuminate\Foundation\Auth\User::class,
        'project' => \Alexandria\Core\Models\Framework\Project::class,
        'blueprint' => \Alexandria\Core\Models\System\Blueprint::class,
        'blueprint_field' => \Alexandria\Core\Models\System\BlueprintField::class,
        'entry' => \Alexandria\Core\Models\System\Entry::class,
        'field_value' => \Alexandria\Core\Models\System\FieldValue::class,
    ],
];
```

- [ ] **Step 4: Update `src/AlexandriaServiceProvider.php` to merge the config + register migrations**

Replace contents of `src/AlexandriaServiceProvider.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core;

use Illuminate\Support\ServiceProvider;

class AlexandriaServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/alexandria.php', 'alexandria');
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/alexandria.php' => config_path('alexandria.php'),
            ], 'alexandria-config');
        }
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `vendor/bin/pest tests/Feature/ConfigPublishingTest.php`
Expected: PASS — first assertion currently fails because Project class doesn't exist yet. Skip if so; revisit after Task 4. For now, comment out the first assertion or run with `--filter "publishes the alexandria config"`.

Actually — the first `it()` will fail because `\Alexandria\Core\Models\Framework\Project::class` doesn't exist yet. That's expected. Either:
  a) Skip the first test now and re-enable in Task 4, or
  b) Comment out the model-binding assertions and uncomment them after Task 4.

Use option (b) — comment-only:

```php
it('exposes the alexandria config with default model bindings', function () {
    // Re-enabled in Task 4 once Project model exists.
    // expect(config('alexandria.models.project'))
    //     ->toBe(\Alexandria\Core\Models\Framework\Project::class);

    expect(config('alexandria.models.user'))
        ->toBe(\Illuminate\Foundation\Auth\User::class);
})->todo('re-enable after Task 4 lifts Project');
```

Run again, expected: PASS for the publish test, todo for the bindings test.

- [ ] **Step 6: Commit**

```bash
git add config/alexandria.php src/AlexandriaServiceProvider.php tests/Feature/ConfigPublishingTest.php
git commit -m "feat: register alexandria config with model bindings + publishable tag

config/alexandria.php exposes 'models.*' resolution per ADR-006. The
service provider merges defaults at register time and offers a
'alexandria-config' publish tag so consumers can override bindings
in their own host app's config/alexandria.php."
```

---

### Task 3: Wire the alexandria-app to consume the published config

This task is performed in **`alexandria-app/`**, not `alexandria-core/`. It validates the path-repo wiring works end-to-end.

**Files:**
- Modify: `../alexandria-app/config/alexandria.php` (created via vendor:publish)
- Test: manual smoke test

- [ ] **Step 1: From `alexandria-app/`, publish the alexandria config**

```bash
cd ../alexandria-app
php artisan vendor:publish --tag=alexandria-config
```

Expected: A new `config/alexandria.php` file appears in the app, copied from the symlinked package.

- [ ] **Step 2: Override `models.user` to point at the app's User model**

Open `config/alexandria.php` in alexandria-app. Change the `'user'` line to:

```php
'user' => \App\Models\User::class,
```

Leave the other bindings as-is (they reference core's classes, which is the default).

- [ ] **Step 3: Verify the binding resolves**

```bash
php artisan tinker --execute="dump(config('alexandria.models.user'));"
```

Expected output: `"App\Models\User"`.

- [ ] **Step 4: Commit in alexandria-app**

```bash
cd ../alexandria-app
git add config/alexandria.php
git commit -m "config: publish alexandria config and override models.user

The Alexandria Core package resolves the User model through
config('alexandria.models.user') so consumers can plug in their own.
Override it to App\Models\User::class so Project's owner/creator
relations bind correctly once the Project model lifts."
git push origin main
```

---

## Phase 2: Lift the foundation models (Tasks 4–6)

Lift Project, Blueprint, BlueprintField — the three models that don't need EAV magic. Each gets a stripped-down lift (no Spatie traits, no AI configuration, no media), a Pest test asserting standard CRUD, and a factory.

---

### Task 4: Lift Project model + migration + factory

**Files:**
- Create: `database/migrations/0001_01_01_000010_create_projects_table.php`
- Create: `src/Models/Framework/Project.php`
- Create: `database/factories/Framework/ProjectFactory.php`
- Test: `tests/Feature/Models/ProjectTest.php`

- [ ] **Step 1: Lift the migration**

Read the legacy file: `C:\Websites\alexandria\alexandria-legacy\database\migrations\0090_alexandria_foundation\0090_01_01_000010_create_projects_table.php`. Copy its full schema into `database/migrations/0001_01_01_000010_create_projects_table.php` with three changes:

1. The migration class name stays anonymous (`return new class extends Migration`).
2. Drop any conditional FK to `ai_transactions` — that table doesn't exist in core.
3. The `users` foreign key becomes a configurable target. Since the user table belongs to the host app and might be `App\Models\User`'s `users` table, use `Schema::hasTable('users')` to make the FK conditional, or simply omit `->constrained()` on `owner_id` and `creator_id` and document that the host app's `users` table is the binding (alexandria-app's default `0001_01_01_000000_create_users_table.php` creates it before this one runs because of the timestamp `000010 > 000000`).

Replace the legacy content with the cleaned-up version (verbatim columns + the changes above).

- [ ] **Step 2: Write the failing test**

Create `tests/Feature/Models/ProjectTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a project with a slug and name', function () {
    $project = Project::factory()->create([
        'name' => 'Test World',
        'slug' => 'test-world',
    ]);

    expect($project)->toBeInstanceOf(Project::class)
        ->and($project->name)->toBe('Test World')
        ->and($project->slug)->toBe('test-world')
        ->and($project->id)->toBeInt();
});

it('soft-deletes a project', function () {
    $project = Project::factory()->create();

    $project->delete();

    expect($project->fresh()?->trashed())->toBeTrue();
});
```

- [ ] **Step 3: Run the test, expect failure**

Run: `vendor/bin/pest tests/Feature/Models/ProjectTest.php`
Expected: FAIL — `Class "Alexandria\Core\Models\Framework\Project" not found`.

- [ ] **Step 4: Create the Project model**

Create `src/Models/Framework/Project.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Framework;

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): \Alexandria\Core\Database\Factories\Framework\ProjectFactory
    {
        return \Alexandria\Core\Database\Factories\Framework\ProjectFactory::new();
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'is_public' => 'boolean',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'creator_id');
    }

    public function blueprints(): HasMany
    {
        return $this->hasMany(Blueprint::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(Entry::class);
    }
}
```

Note any columns in the legacy schema that aren't covered by `$guarded = ['id']` should still get cast in `casts()` (verify against legacy migration columns; add `array` casts for any JSON columns and `boolean` casts for any flags).

- [ ] **Step 5: Lift the factory (stripped of orchestrator + Spatie)**

Create `database/factories/Framework/ProjectFactory.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Framework;

use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        $name = fake()->words(3, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::slug($name).'-'.Str::random(6),
            // owner_id / creator_id intentionally null at the factory level;
            // tests that need a user create one explicitly via the host app's
            // User model. Project doesn't require an owner.
            'is_public' => false,
        ];
    }

    public function named(string $name): self
    {
        return $this->state(fn () => [
            'name' => $name,
            'slug' => Str::slug($name),
        ]);
    }
}
```

(Reference legacy's `ProjectFactory.php` for any other states. Lift only `named()` for Phase 1; defer `withOwner()` etc. to follow-up plans because they require a User factory.)

- [ ] **Step 6: Update the Project model's `newFactory()` path to match the autoload**

Verify `composer.json`'s `autoload-dev` PSR-4 mapping includes the factory namespace. Currently it's:

```json
"autoload-dev": {
    "psr-4": {
        "Alexandria\\Core\\Tests\\": "tests/"
    }
}
```

We need factories to be available at runtime (not just during testing) for consumers calling `Project::factory()` from their own seeders. Update `composer.json`'s `autoload` block (not `autoload-dev`) to:

```json
"autoload": {
    "psr-4": {
        "Alexandria\\Core\\": "src/",
        "Alexandria\\Core\\Database\\Factories\\": "database/factories/"
    }
}
```

Run `composer dump-autoload` to refresh.

- [ ] **Step 7: Run the test, expect pass**

Run: `vendor/bin/pest tests/Feature/Models/ProjectTest.php`
Expected: PASS — both assertions green.

- [ ] **Step 8: Re-enable the Project assertion in `tests/Feature/ConfigPublishingTest.php`**

Edit `tests/Feature/ConfigPublishingTest.php` to uncomment the project binding assertion and remove the `->todo()` modifier. Re-run: `vendor/bin/pest tests/Feature/ConfigPublishingTest.php`. Expected: PASS.

- [ ] **Step 9: Run Pint**

```bash
vendor/bin/pint
```

Expected: passes or auto-fixes harmless style.

- [ ] **Step 10: Commit**

```bash
git add database/migrations/0001_01_01_000010_create_projects_table.php \
        src/Models/Framework/Project.php \
        database/factories/Framework/ProjectFactory.php \
        tests/Feature/Models/ProjectTest.php \
        tests/Feature/ConfigPublishingTest.php \
        composer.json composer.lock
git commit -m "feat(models): lift Project from legacy

Foundation EAV model. Soft deletes, slug-based routing, owner/creator
relations resolved through config('alexandria.models.user') per ADR-006.
Spatie HasSlug/HasTags/InteractsWithMedia, AI configuration, notes,
and ProjectSetupOrchestrator are deliberately NOT lifted -- they're
consumer concerns or follow up in later plans.

Factory exposes only definition() and named(). withOwner/withDetails
states defer to a follow-up plan that introduces a User factory."
```

---

### Task 5: Lift Blueprint model + migration + factory

**Files:**
- Create: `database/migrations/0001_01_01_000020_create_blueprints_table.php`
- Create: `src/Models/System/Blueprint.php`
- Create: `database/factories/System/BlueprintFactory.php`
- Test: `tests/Feature/Models/BlueprintTest.php`

- [ ] **Step 1: Lift the migration**

Read `C:\Websites\alexandria\alexandria-legacy\database\migrations\0090_alexandria_foundation\0090_01_01_000020_create_blueprints_table.php`. Copy verbatim into `database/migrations/0001_01_01_000020_create_blueprints_table.php`. No content changes — schema is project-scoped and doesn't reference users or AI tables.

- [ ] **Step 2: Write the failing test**

Create `tests/Feature/Models/BlueprintTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a blueprint scoped to a project', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create([
        'project_id' => $project->id,
        'name' => 'Character',
        'slug' => 'character',
    ]);

    expect($blueprint->project_id)->toBe($project->id)
        ->and($blueprint->name)->toBe('Character')
        ->and($blueprint->slug)->toBe('character');
});

it('belongs to a project', function () {
    $blueprint = Blueprint::factory()->create();

    expect($blueprint->project)->toBeInstanceOf(Project::class);
});

it('soft-deletes a blueprint', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->delete();

    expect($blueprint->fresh()?->trashed())->toBeTrue();
});
```

- [ ] **Step 3: Run the test, expect failure**

Run: `vendor/bin/pest tests/Feature/Models/BlueprintTest.php`
Expected: FAIL — class not found.

- [ ] **Step 4: Create the Blueprint model**

Create `src/Models/System/Blueprint.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Blueprint extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): \Alexandria\Core\Database\Factories\System\BlueprintFactory
    {
        return \Alexandria\Core\Database\Factories\System\BlueprintFactory::new();
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'views' => 'array',
            'infobox_schema' => 'array',
            'is_linkable' => 'boolean',
            'show_tree_view' => 'boolean',
            'enable_timeline' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function fields(): HasMany
    {
        return $this->hasMany(BlueprintField::class)->orderBy('sort_order');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(Entry::class);
    }

    public function scopeStandard(Builder $query): Builder
    {
        return $query->where('classification', 'standard');
    }

    public function scopeList(Builder $query): Builder
    {
        return $query->where('classification', 'list');
    }
}
```

(Verify the legacy migration's column names: `classification`, `sort_order`, `is_linkable`, `views`, `infobox_schema`, `metadata`, `show_tree_view`, `enable_timeline`. Adjust the casts to match exactly.)

- [ ] **Step 5: Lift the factory**

Create `database/factories/System/BlueprintFactory.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Blueprint>
 */
class BlueprintFactory extends Factory
{
    protected $model = Blueprint::class;

    public function definition(): array
    {
        $name = fake()->words(2, true);

        return [
            'project_id' => Project::factory(),
            'name' => Str::title($name),
            'slug' => Str::slug($name),
            'classification' => 'standard',
            'sort_order' => 0,
            'is_linkable' => true,
        ];
    }

    public function standard(): self
    {
        return $this->state(fn () => ['classification' => 'standard']);
    }

    public function list(): self
    {
        return $this->state(fn () => ['classification' => 'list']);
    }

    public function character(): self
    {
        return $this->state(fn () => [
            'name' => 'Character',
            'slug' => 'character',
            'classification' => 'standard',
        ]);
    }
}
```

(Reference legacy's `BlueprintFactory.php` for any other states.)

- [ ] **Step 6: Run the test, expect pass**

Run: `vendor/bin/pest tests/Feature/Models/BlueprintTest.php`
Expected: PASS — all 3 assertions green.

- [ ] **Step 7: Run Pint**

```bash
vendor/bin/pint
```

- [ ] **Step 8: Commit**

```bash
git add database/migrations/0001_01_01_000020_create_blueprints_table.php \
        src/Models/System/Blueprint.php \
        database/factories/System/BlueprintFactory.php \
        tests/Feature/Models/BlueprintTest.php
git commit -m "feat(models): lift Blueprint from legacy

Project-scoped entry-type definition. SoftDeletes, project belongs-to,
fields/entries has-many, classification scopes (standard / list).
Spatie LogsActivity, AI configuration, media handling, and the
view-registry sync events are deliberately not lifted -- separate
follow-up plan."
```

---

### Task 6: Lift BlueprintField model + migration + factory

**Files:**
- Create: `database/migrations/0001_01_01_000025_create_blueprint_fields_table.php`
- Create: `src/Models/System/BlueprintField.php`
- Create: `database/factories/System/BlueprintFieldFactory.php`
- Test: `tests/Feature/Models/BlueprintFieldTest.php`

- [ ] **Step 1: Lift the migration**

Copy `0090_01_01_000025_create_blueprint_fields_table.php` from legacy into `database/migrations/0001_01_01_000025_create_blueprint_fields_table.php` verbatim.

- [ ] **Step 2: Write the failing test**

Create `tests/Feature/Models/BlueprintFieldTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a field on a blueprint', function () {
    $blueprint = Blueprint::factory()->create();
    $field = BlueprintField::factory()->create([
        'blueprint_id' => $blueprint->id,
        'name' => 'age',
        'type' => 'integer',
    ]);

    expect($field->blueprint_id)->toBe($blueprint->id)
        ->and($field->name)->toBe('age')
        ->and($field->type)->toBe('integer');
});

it('belongs to a blueprint', function () {
    $field = BlueprintField::factory()->create();

    expect($field->blueprint)->toBeInstanceOf(Blueprint::class);
});

it('exposes target_blueprint_slug from validation_rules for entry_reference fields', function () {
    $field = BlueprintField::factory()->create([
        'type' => 'entry_reference',
        'validation_rules' => ['target_blueprint_slug' => 'location'],
    ]);

    expect($field->targetBlueprintSlug)->toBe('location');
});
```

- [ ] **Step 3: Run the test, expect failure**

Run: `vendor/bin/pest tests/Feature/Models/BlueprintFieldTest.php`
Expected: FAIL.

- [ ] **Step 4: Create the BlueprintField model**

Create `src/Models/System/BlueprintField.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BlueprintField extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $touches = ['blueprint'];

    protected static function newFactory(): \Alexandria\Core\Database\Factories\System\BlueprintFieldFactory
    {
        return \Alexandria\Core\Database\Factories\System\BlueprintFieldFactory::new();
    }

    protected function casts(): array
    {
        return [
            'validation_rules' => 'array',
            'is_required' => 'boolean',
        ];
    }

    public function blueprint(): BelongsTo
    {
        return $this->belongsTo(Blueprint::class);
    }

    protected function targetBlueprintSlug(): Attribute
    {
        return Attribute::get(fn () => $this->validation_rules['target_blueprint_slug'] ?? null);
    }

    protected function isTypeField(): Attribute
    {
        return Attribute::get(fn () => (bool) ($this->validation_rules['is_type_field'] ?? false));
    }
}
```

(Verify column list against the legacy migration: `name`, `label`, `type`, `validation_rules`, `is_required`, `sort_order`. Match exactly.)

- [ ] **Step 5: Lift the factory**

Create `database/factories/System/BlueprintFieldFactory.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BlueprintField>
 */
class BlueprintFieldFactory extends Factory
{
    protected $model = BlueprintField::class;

    public function definition(): array
    {
        return [
            'blueprint_id' => Blueprint::factory(),
            'name' => fake()->unique()->word(),
            'label' => fake()->words(2, true),
            'type' => 'text',
            'is_required' => false,
            'sort_order' => 0,
        ];
    }

    public function text(): self
    {
        return $this->state(fn () => ['type' => 'text']);
    }

    public function integer(): self
    {
        return $this->state(fn () => ['type' => 'integer']);
    }

    public function boolean(): self
    {
        return $this->state(fn () => ['type' => 'boolean']);
    }

    public function date(): self
    {
        return $this->state(fn () => ['type' => 'date']);
    }

    public function entryReference(string $targetSlug): self
    {
        return $this->state(fn () => [
            'type' => 'entry_reference',
            'validation_rules' => ['target_blueprint_slug' => $targetSlug],
        ]);
    }

    public function required(): self
    {
        return $this->state(fn () => ['is_required' => true]);
    }
}
```

- [ ] **Step 6: Run the test, expect pass**

Run: `vendor/bin/pest tests/Feature/Models/BlueprintFieldTest.php`
Expected: PASS.

- [ ] **Step 7: Pint + commit**

```bash
vendor/bin/pint
git add database/migrations/0001_01_01_000025_create_blueprint_fields_table.php \
        src/Models/System/BlueprintField.php \
        database/factories/System/BlueprintFieldFactory.php \
        tests/Feature/Models/BlueprintFieldTest.php
git commit -m "feat(models): lift BlueprintField from legacy

Field schema definition for blueprints. Touches parent blueprint on
save so any cached blueprint state invalidates. targetBlueprintSlug
+ isTypeField accessors expose validation_rules data for the
EAV resolver and AI sorting prompts. AI configuration trait
deliberately not lifted."
```

---

## Phase 3: The EAV magic (Tasks 7–9)

This is where the package starts being interesting — the `HasDynamicAttributes` trait that gives Entry the ability to read/write fields like native attributes (`$entry->age = 42`) while persisting them in the `field_values` table.

---

### Task 7: Lift Entry model (without HasDynamicAttributes for now) + migration + factory

We lift Entry's structural shape first (project, blueprint, parent, slug, native columns) and add the magic trait separately in Task 9. This keeps the magic isolated for review.

**Files:**
- Create: `database/migrations/0001_01_01_000030_create_entries_table.php`
- Create: `src/Models/System/Entry.php` (basic version, no EAV trait yet)
- Create: `database/factories/System/EntryFactory.php`
- Test: `tests/Feature/Models/EntryTest.php`

- [ ] **Step 1: Lift the migration**

Copy `0090_01_01_000030_create_entries_table.php` from legacy into `database/migrations/0001_01_01_000030_create_entries_table.php` verbatim. The `cascade_archived_by` self-referential FK should stay as-is.

- [ ] **Step 2: Write the failing test (basic CRUD only — EAV magic comes later)**

Create `tests/Feature/Models/EntryTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates an entry scoped to a project and blueprint', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);

    $entry = Entry::factory()->create([
        'project_id' => $project->id,
        'blueprint_id' => $blueprint->id,
        'name' => 'Test Entry',
    ]);

    expect($entry->project_id)->toBe($project->id)
        ->and($entry->blueprint_id)->toBe($blueprint->id)
        ->and($entry->name)->toBe('Test Entry');
});

it('belongs to a project', function () {
    $entry = Entry::factory()->create();
    expect($entry->project)->toBeInstanceOf(Project::class);
});

it('belongs to a blueprint via the type relationship', function () {
    $entry = Entry::factory()->create();
    expect($entry->type)->toBeInstanceOf(Blueprint::class);
});

it('supports parent/child hierarchies', function () {
    $parent = Entry::factory()->create();
    $child = Entry::factory()->create(['parent_id' => $parent->id]);

    expect($child->parent->id)->toBe($parent->id)
        ->and($parent->children->first()->id)->toBe($child->id);
});

it('auto-assigns sort_order on create as max+1 in sibling group', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);

    $first = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id]);
    $second = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id]);

    expect($second->sort_order)->toBeGreaterThan($first->sort_order);
});

it('soft-deletes', function () {
    $entry = Entry::factory()->create();
    $entry->delete();

    expect($entry->fresh()?->trashed())->toBeTrue();
});
```

- [ ] **Step 3: Run the test, expect failure**

Run: `vendor/bin/pest tests/Feature/Models/EntryTest.php`
Expected: FAIL.

- [ ] **Step 4: Create the basic Entry model (without EAV trait — added in Task 9)**

Create `src/Models/System/Entry.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Entry extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): \Alexandria\Core\Database\Factories\System\EntryFactory
    {
        return \Alexandria\Core\Database\Factories\System\EntryFactory::new();
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'is_stub' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Entry $entry): void {
            $entry->sort_order ??= static::query()
                ->where('project_id', $entry->project_id)
                ->where('blueprint_id', $entry->blueprint_id)
                ->where('parent_id', $entry->parent_id)
                ->max('sort_order') + 1;

            $entry->slug ??= Str::slug($entry->name).'-'.Str::random(6);
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(Blueprint::class, 'blueprint_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(FieldValue::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->whereNotNull('archived_at');
    }
}
```

- [ ] **Step 5: Lift the EntryFactory**

Create `database/factories/System/EntryFactory.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Entry>
 */
class EntryFactory extends Factory
{
    protected $model = Entry::class;

    public function definition(): array
    {
        $name = fake()->words(2, true);

        return [
            'project_id' => Project::factory(),
            'blueprint_id' => Blueprint::factory(),
            'name' => Str::title($name),
            'slug' => Str::slug($name).'-'.Str::random(6),
            'sort_order' => 0,
            'is_stub' => false,
        ];
    }

    public function withParent(Entry $parent): self
    {
        return $this->state(fn () => [
            'parent_id' => $parent->id,
            'project_id' => $parent->project_id,
            'blueprint_id' => $parent->blueprint_id,
        ]);
    }

    public function named(string $name): self
    {
        return $this->state(fn () => [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
        ]);
    }
}
```

- [ ] **Step 6: Run the test, expect pass**

Run: `vendor/bin/pest tests/Feature/Models/EntryTest.php`
Expected: PASS.

- [ ] **Step 7: Pint + commit**

```bash
vendor/bin/pint
git add database/migrations/0001_01_01_000030_create_entries_table.php \
        src/Models/System/Entry.php \
        database/factories/System/EntryFactory.php \
        tests/Feature/Models/EntryTest.php
git commit -m "feat(models): lift Entry skeleton from legacy

Phase 1 of the Entry lift: native columns only (project, blueprint,
parent, name, slug, sort_order, archived_at, metadata). Auto-assigns
sort_order as sibling-group max+1 on create. The EAV magic
(HasDynamicAttributes) follows in Task 9 -- this commit establishes
the structural shape so the magic can be reviewed in isolation."
```

---

### Task 8: Lift FieldValue model + migration + factory

**Files:**
- Create: `database/migrations/0001_01_01_000040_create_field_values_table.php`
- Create: `src/Models/System/FieldValue.php`
- Create: `database/factories/System/FieldValueFactory.php`
- Test: `tests/Feature/Models/FieldValueTest.php`

- [ ] **Step 1: Lift the migration**

Copy `0090_01_01_000040_create_field_values_table.php` from legacy verbatim.

- [ ] **Step 2: Write the failing test**

Create `tests/Feature/Models/FieldValueTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\FieldValue;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a field value attached to an entry and blueprint field', function () {
    $entry = Entry::factory()->create();
    $field = BlueprintField::factory()->create(['blueprint_id' => $entry->blueprint_id]);

    $value = FieldValue::factory()->create([
        'entry_id' => $entry->id,
        'blueprint_field_id' => $field->id,
        'value' => '42',
    ]);

    expect($value->entry_id)->toBe($entry->id)
        ->and($value->blueprint_field_id)->toBe($field->id)
        ->and($value->value)->toBe('42');
});

it('allows multi-value fields (no unique constraint on entry+field)', function () {
    $entry = Entry::factory()->create();
    $field = BlueprintField::factory()->create(['blueprint_id' => $entry->blueprint_id]);

    FieldValue::factory()->create(['entry_id' => $entry->id, 'blueprint_field_id' => $field->id, 'value' => 'A']);
    FieldValue::factory()->create(['entry_id' => $entry->id, 'blueprint_field_id' => $field->id, 'value' => 'B']);

    expect(FieldValue::where('entry_id', $entry->id)->count())->toBe(2);
});

it('belongs to an entry and a blueprint field', function () {
    $value = FieldValue::factory()->create();
    expect($value->entry)->toBeInstanceOf(Entry::class)
        ->and($value->blueprintField)->toBeInstanceOf(BlueprintField::class);
});
```

- [ ] **Step 3: Run the test, expect failure**

- [ ] **Step 4: Create the FieldValue model**

Create `src/Models/System/FieldValue.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldValue extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $touches = ['entry'];

    protected static function newFactory(): \Alexandria\Core\Database\Factories\System\FieldValueFactory
    {
        return \Alexandria\Core\Database\Factories\System\FieldValueFactory::new();
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }

    public function blueprintField(): BelongsTo
    {
        return $this->belongsTo(BlueprintField::class);
    }
}
```

- [ ] **Step 5: Lift the factory**

Create `database/factories/System/FieldValueFactory.php`:

```php
<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\FieldValue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FieldValue>
 */
class FieldValueFactory extends Factory
{
    protected $model = FieldValue::class;

    public function definition(): array
    {
        return [
            'entry_id' => Entry::factory(),
            'blueprint_field_id' => BlueprintField::factory(),
            'value' => fake()->word(),
        ];
    }

    public function forEntry(Entry $entry): self
    {
        return $this->state(fn () => ['entry_id' => $entry->id]);
    }

    public function forField(BlueprintField $field): self
    {
        return $this->state(fn () => ['blueprint_field_id' => $field->id]);
    }
}
```

- [ ] **Step 6: Run the test, expect pass**

- [ ] **Step 7: Pint + commit**

```bash
vendor/bin/pint
git add database/migrations/0001_01_01_000040_create_field_values_table.php \
        src/Models/System/FieldValue.php \
        database/factories/System/FieldValueFactory.php \
        tests/Feature/Models/FieldValueTest.php
git commit -m "feat(models): lift FieldValue from legacy

EAV value-side row. Touches parent entry on save. No unique constraint
on (entry_id, blueprint_field_id) -- intentional, allows multi-value
fields per entry. EntryHistory recording events from legacy are
deliberately not lifted -- separate follow-up plan."
```

---

### Task 9: Lift HasDynamicAttributes trait + integration test

This is the centerpiece. Once this lands, `$entry->age = 42; $entry->save();` works.

**Files:**
- Create: `src/Traits/System/HasDynamicAttributes.php`
- Modify: `src/Models/System/Entry.php` (add `use HasDynamicAttributes`)
- Test: `tests/Feature/Eav/HasDynamicAttributesTest.php`

- [ ] **Step 1: Read the legacy trait + dependencies**

Read `C:\Websites\alexandria\alexandria-legacy\app\Traits\System\HasDynamicAttributes.php` in full. Note any dependencies:
- `App\Models\System\BlueprintField` → `Alexandria\Core\Models\System\BlueprintField`
- `App\Models\System\FieldValue` → `Alexandria\Core\Models\System\FieldValue`
- `Carbon\Carbon` → already core
- `Illuminate\Support\Collection` → already core
- `Illuminate\Validation\Rule` / `Validator` → already core

The trait should lift cleanly with only namespace adjustments.

- [ ] **Step 2: Write the failing integration test**

Create `tests/Feature/Eav/HasDynamicAttributesTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\FieldValue;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->blueprint = Blueprint::factory()->create(['project_id' => $this->project->id]);
});

it('reads a dynamic field after persisting it directly', function () {
    $field = BlueprintField::factory()->integer()->create([
        'blueprint_id' => $this->blueprint->id,
        'name' => 'age',
    ]);
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);
    FieldValue::factory()->create([
        'entry_id' => $entry->id,
        'blueprint_field_id' => $field->id,
        'value' => '42',
    ]);

    $entry->refresh()->load('attributes', 'type.fields');

    expect($entry->age)->toBe(42); // integer cast
});

it('writes a dynamic field via attribute assignment', function () {
    BlueprintField::factory()->text()->create([
        'blueprint_id' => $this->blueprint->id,
        'name' => 'occupation',
    ]);
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    $entry->occupation = 'Cartographer';
    $entry->save();

    expect(FieldValue::where('entry_id', $entry->id)->first()->value)
        ->toBe('Cartographer');
});

it('falls through to native columns first', function () {
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
        'name' => 'My Entry',
    ]);

    expect($entry->name)->toBe('My Entry');
});

it('returns null for an unknown attribute when no native column or field exists', function () {
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    expect($entry->doesnt_exist)->toBeNull();
});

it('casts boolean fields correctly', function () {
    BlueprintField::factory()->boolean()->create([
        'blueprint_id' => $this->blueprint->id,
        'name' => 'is_friendly',
    ]);
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    $entry->is_friendly = true;
    $entry->save();

    expect($entry->fresh()->load('attributes', 'type.fields')->is_friendly)
        ->toBeTrue();
});
```

- [ ] **Step 3: Run the test, expect failure**

Run: `vendor/bin/pest tests/Feature/Eav/HasDynamicAttributesTest.php`
Expected: All 5 fail — `$entry->age` returns null because the trait isn't applied yet.

- [ ] **Step 4: Lift the trait into core**

Create `src/Traits/System/HasDynamicAttributes.php` by copying legacy's `app/Traits/System/HasDynamicAttributes.php`. Apply these namespace edits:

- Change `namespace App\Traits\System;` → `namespace Alexandria\Core\Traits\System;`
- Change `use App\Models\System\BlueprintField;` → `use Alexandria\Core\Models\System\BlueprintField;`
- Change `use App\Models\System\FieldValue;` → `use Alexandria\Core\Models\System\FieldValue;`

Leave all other code unchanged. The trait's logic is data-shape-agnostic and lifts as-is.

- [ ] **Step 5: Apply the trait to Entry**

Modify `src/Models/System/Entry.php`. Add to the `use` statements:

```php
use Alexandria\Core\Traits\System\HasDynamicAttributes;
```

Inside the class body, add the trait:

```php
class Entry extends Model
{
    use HasDynamicAttributes;
    use HasFactory;
    use SoftDeletes;
```

- [ ] **Step 6: Run the test, expect pass**

Run: `vendor/bin/pest tests/Feature/Eav/HasDynamicAttributesTest.php`
Expected: All 5 pass.

If any fail, the legacy trait may have implicit dependencies on a method we haven't surfaced (e.g., Entry's `getDynamicAttribute()` method). Read the trait's failing path, then surface the missing method on Entry.

- [ ] **Step 7: Run the full test suite to make sure nothing regressed**

Run: `vendor/bin/pest`
Expected: ALL pass — 5 from Phase 3, 6 from Entry, 3 each from Blueprint/BlueprintField/FieldValue, 2 from Project, 1 from package boot, 1 from config. ~22 tests, 0 failures.

- [ ] **Step 8: Pint + commit**

```bash
vendor/bin/pint
git add src/Traits/System/HasDynamicAttributes.php \
        src/Models/System/Entry.php \
        tests/Feature/Eav/HasDynamicAttributesTest.php
git commit -m "feat(eav): lift HasDynamicAttributes trait + apply to Entry

The EAV centerpiece -- magic property access lets entries read/write
dynamic field values like native attributes (\$entry->age = 42).
The trait intercepts via __get/__set, groups FieldValue rows by
field name, applies casts based on the BlueprintField's type, and
bulk-inserts/updates on save.

Lifted verbatim from legacy with only namespace edits. Validates
end-to-end via 5 integration tests covering read, write, fallthrough
to native columns, unknown-attribute null handling, and boolean casting."
```

---

## Phase 4: Verify the path-repo round-trip (Task 10)

The package now has a working EAV core. Final task: prove that when alexandria-app does `composer update`, the new models are reachable from inside the host app.

---

### Task 10: Smoke-test the alexandria-core lift from inside alexandria-app

**Files:**
- Create: `../alexandria-app/tests/Feature/AlexandriaCoreSmokeTest.php`

- [ ] **Step 1: Create the host-app smoke test**

In **`alexandria-app/`**, create `tests/Feature/AlexandriaCoreSmokeTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('boots the core package from the host app and creates a working entry', function () {
    $project = Project::factory()->create(['name' => 'Smoke Test']);
    $blueprint = Blueprint::factory()->create([
        'project_id' => $project->id,
        'name' => 'Character',
        'slug' => 'character',
    ]);
    BlueprintField::factory()->integer()->create([
        'blueprint_id' => $blueprint->id,
        'name' => 'age',
    ]);

    $entry = Entry::factory()->create([
        'project_id' => $project->id,
        'blueprint_id' => $blueprint->id,
        'name' => 'Test Character',
    ]);
    $entry->age = 30;
    $entry->save();

    expect($entry->fresh()->load('attributes', 'type.fields')->age)
        ->toBe(30);
});
```

- [ ] **Step 2: Run the test from alexandria-app**

```bash
cd ../alexandria-app
php artisan migrate:fresh --no-interaction
vendor/bin/pest tests/Feature/AlexandriaCoreSmokeTest.php
```

Expected: PASS. This confirms:
1. The Composer path-repo wiring resolves correctly.
2. Core's migrations run alongside app's migrations.
3. Core's models are autoloadable from the host app.
4. The EAV magic survives the round-trip.

- [ ] **Step 3: Commit in alexandria-app**

```bash
cd ../alexandria-app
git add tests/Feature/AlexandriaCoreSmokeTest.php
git commit -m "test: smoke-test alexandria-core lift from inside the host app

Validates the Composer path-repo wiring + the core package's EAV
foundation work end-to-end from alexandria-app. Creating a Project,
Blueprint, BlueprintField, Entry, and assigning a dynamic field
through the EAV trait all succeed against the host app's Postgres
database (or its fresh test DB)."
git push origin main
```

- [ ] **Step 4: Push core's accumulated commits**

```bash
cd ../alexandria-core
git push origin main
```

---

## Self-review checklist

After implementing, run this sweep before declaring done:

- [ ] All 22+ tests pass: `cd alexandria-core && vendor/bin/pest`
- [ ] Linter passes: `cd alexandria-core && vendor/bin/pint --test`
- [ ] CI workflows on `lonely-lights/alexandria-core` are green for the latest push.
- [ ] CI workflows on `lonely-lights/alexandria-app` are green for the latest push.
- [ ] alexandria-app boots in the browser at https://alexandria.test (still — should not have regressed).
- [ ] `tests/Feature/ConfigPublishingTest.php` no longer has `->todo()` modifiers.
- [ ] No file in `src/` references `App\` namespaces, Spatie traits, AI services, media library, or notes.
- [ ] No factory in `database/factories/` uses world-specific values (Undaunted, Lonely Sister, etc.). Faker only.

---

## What's deferred (separate plans)

After this plan ships:

1. **Plan: EntryRelationship + RelationshipBlueprint + HasDynamicRelationships trait.** Adds the relationship side of EAV (entries connecting to entries via typed relationships).
2. **Plan: View registry.** Lifts `blueprint_views` table + view registration system + Inertia/React page resolution per ADR-003.
3. **Plan: AI subsystem.** Lifts AI provider abstraction (OpenAI, Google, Anthropic via `laravel/ai`), `PromptService`, `DataMarker`, `AbstractContext`. Concrete agents and the `EavAiCategorizationOrchestrator` live in `alexandria-app`, not core (see ADR-010).
4. **Plan: Media library.** Spatie media wiring + the `HasAlexandriaMedia` trait (media cascade Entry → Blueprint → Project).
5. **Plan: Permissions + activity log.** Spatie wiring for project-scoped roles.
6. **Plan: Notes subsystem.** Lift the Notable models + `HasNotes` trait + AI-enhanced note workflow.
7. **Plan: Frontend extraction (Inertia/React).** Stage 4 of the original extraction spec. Vite alias, tsconfig wiring, page resolution.

Each is independently shippable on top of this foundation.
