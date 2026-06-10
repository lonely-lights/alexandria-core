# Stage 8g.1 Plan 1 — Writing Data Layer (alexandria-core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the writing dashboard's foundation in `alexandria-core`: works + section-tree tables/models/factories, writing config (types, formats, length plans, starter templates), slug + position behavior, the section-tree service (move/reorder with cycle prevention), the `SectionContentAnalyzer` (word counts, screenplay page estimates, mention extraction from wiki text), the content-persist service that keeps mentions and rollups derived-true, and a rebuild command.

**Architecture:** Per the approved spec (`docs/superpowers/specs/2026-06-10-stage-8g1-writing-dashboard-design.md`, incl. Plan-stage amendments): works belong to one project; sections form a user-controlled tree (`parent_id` + `position`), prose on any node as **wiki markup text** (screenplay = Fountain-style text); `work_section_entry_mentions` is derived data rebuilt on save. HTTP layer (controllers/routes/policies) is **Plan 2, app-side** — this plan is models + services + Testbench tests only.

**Tech Stack:** Laravel 13 package (Orchestra Testbench, `WithWorkbench`), Pest 4 function syntax, SQLite :memory:, PHP 8.4. All code in `Alexandria\Core\` namespace. Run tests from `C:\Websites\alexandria\alexandria-core` with `vendor/bin/pest --filter=<name>`. After PHP edits: `vendor/bin/pint --dirty --format agent`.

**Branch:** `feat/8g1-writing-dashboard` (already exists, has the spec commit).

**Conventions you must follow (verified against the codebase):**
- Migrations: anonymous-class style, numbered `0001_01_01_0009XX_create_*` (writing gets the 900 block; AI owns 700–880).
- Models: subfolder `src/Models/Writing/`, ide-helper `@property` docblocks, `protected function casts(): array`, `protected static function newFactory(): XFactory` pointing at `Alexandria\Core\Database\Factories\Writing\`.
- `user_id` columns are **unconstrained** `unsignedBigInteger` (the user model belongs to the host app); factories fake it with `fake()->numberBetween(1, 1000)` like `UserApiKeyFactory`.
- Slug generation mirrors `Entry::generateUniqueSlug` (`src/Models/System/Entry.php:190-207`): `Str::slug($name)` + `-2`, `-3`… suffix until unique in scope, triggered in `booted()`.
- Config merges deep (`mergeConfigDeepFrom`) — adding a `writing` key to `config/alexandria.php` needs no provider change; model bindings go under `alexandria.models`.
- Tests: `tests/Feature/Writing/`, `uses(RefreshDatabase::class)`, `it(...)` + `expect(...)` chains, factories via `Model::factory()`.

---

## File Structure

```
alexandria-core/
├── config/alexandria.php                                  # MODIFY: + writing block, + models.work/work_section
├── database/migrations/
│   ├── 0001_01_01_000900_create_works_table.php           # CREATE
│   ├── 0001_01_01_000910_create_work_sections_table.php   # CREATE
│   ├── 0001_01_01_000920_create_work_section_entry_mentions_table.php  # CREATE
│   └── 0001_01_01_000930_create_work_entry_pins_table.php # CREATE
├── database/factories/Writing/
│   ├── WorkFactory.php                                    # CREATE
│   └── WorkSectionFactory.php                             # CREATE
├── src/Models/Writing/
│   ├── Work.php                                           # CREATE
│   ├── WorkSection.php                                    # CREATE
│   ├── WorkSectionEntryMention.php                        # CREATE
│   └── WorkEntryPin.php                                   # CREATE
├── src/Services/Writing/
│   ├── WorkScaffolder.php                                 # CREATE: work + starter-template sections + length-plan preset
│   ├── SectionTreeService.php                             # CREATE: move/reorder, cycle prevention
│   ├── SectionContentAnalyzer.php                         # CREATE: pure text analysis (counts, pages, mention names)
│   └── WorkSectionContentService.php                      # CREATE: persist content → counts + mentions + work rollup
├── src/DTO/Writing/AnalyzedSectionContent.php             # CREATE: analyzer result DTO
├── src/Console/RebuildWritingDataCommand.php              # CREATE: alexandria:writing:rebuild
├── src/AlexandriaServiceProvider.php                      # MODIFY: register the command
└── tests/Feature/Writing/
    ├── WorkModelTest.php                                  # CREATE
    ├── WorkSectionTreeTest.php                            # CREATE
    ├── WorkScaffolderTest.php                             # CREATE
    ├── SectionContentAnalyzerTest.php                     # CREATE
    ├── WorkSectionContentServiceTest.php                  # CREATE
    └── RebuildWritingDataCommandTest.php                  # CREATE
```

---

### Task 1: Migrations + writing config

**Files:**
- Create: `database/migrations/0001_01_01_000900_create_works_table.php`
- Create: `database/migrations/0001_01_01_000910_create_work_sections_table.php`
- Create: `database/migrations/0001_01_01_000920_create_work_section_entry_mentions_table.php`
- Create: `database/migrations/0001_01_01_000930_create_work_entry_pins_table.php`
- Modify: `config/alexandria.php`

- [ ] **Step 1: Write the four migrations**

`database/migrations/0001_01_01_000900_create_works_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('works', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('title');
            $table->string('slug');
            $table->string('type')->default('novel');
            $table->string('format')->default('prose');
            $table->text('logline')->nullable();
            $table->string('genre')->nullable();
            $table->string('status')->default('concept');
            $table->string('target_audience')->nullable();
            $table->string('language')->nullable();
            $table->string('setting_period')->nullable();
            $table->json('length_plan')->nullable();
            $table->unsignedInteger('target_words')->nullable();
            $table->unsignedInteger('word_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['project_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('works');
    }
};
```

`database/migrations/0001_01_01_000910_create_work_sections_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('parent_id')->nullable()->index();
            $table->unsignedInteger('position')->default(0);
            $table->string('title');
            $table->string('slug');
            $table->string('label')->nullable();
            $table->longText('content')->nullable();
            $table->string('format')->nullable();
            $table->text('synopsis')->nullable();
            $table->string('status')->nullable();
            $table->string('beat_type')->nullable();
            $table->text('goal')->nullable();
            $table->text('conflict')->nullable();
            $table->text('stakes')->nullable();
            $table->text('mood')->nullable();
            $table->string('tone')->nullable();
            $table->string('timeline_position')->nullable();
            $table->string('int_ext')->nullable();
            $table->foreignId('pov_entry_id')->nullable()->constrained('entries')->nullOnDelete();
            $table->foreignId('setting_entry_id')->nullable()->constrained('entries')->nullOnDelete();
            $table->unsignedInteger('word_count')->default(0);
            $table->unsignedInteger('target_words')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['work_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_sections');
    }
};
```

`database/migrations/0001_01_01_000920_create_work_section_entry_mentions_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_section_entry_mentions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_section_id')->constrained()->cascadeOnDelete();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->string('source');
            $table->unsignedInteger('mention_count')->default(1);
            $table->timestamps();
            $table->unique(['work_section_id', 'entry_id', 'source'], 'work_section_entry_mention_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_section_entry_mentions');
    }
};
```

`database/migrations/0001_01_01_000930_create_work_entry_pins_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_entry_pins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_id')->constrained()->cascadeOnDelete();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->unique(['work_id', 'entry_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_entry_pins');
    }
};
```

- [ ] **Step 2: Add the `writing` config block + model bindings**

In `config/alexandria.php`, add a top-level `'writing'` key (sibling of `'media'`/`'ai'`/`'models'`) and two entries inside the existing `'models'` array. Import the two model classes at the top alongside the existing imports (`use Alexandria\Core\Models\Writing\Work;` and `use Alexandria\Core\Models\Writing\WorkSection;` — these classes arrive in Task 2; PHP config files tolerate class constants for not-yet-loaded classes since `::class` is compile-time).

```php
'writing' => [

    // Work types (selectable at creation; keys feed lang lookups + templates)
    'types' => ['novel', 'screenplay', 'stage_play', 'short_story', 'essay', 'other'],

    // Format specs. Server side carries the page metrics; element lists and
    // keyboard transition maps are frontend modules (Plan 3).
    'formats' => [
        'prose' => [
            'words_per_page' => 250,
        ],
        'screenplay' => [
            'lines_per_page' => 55,
        ],
    ],

    // Length-plan presets. Seeded onto works.length_plan; every number is
    // user-editable afterwards. per_section_words feeds new-section targets.
    'length_plans' => [
        'short_story' => ['target_words' => 7500, 'per_section_words' => 2500],
        'novella' => ['target_words' => 30000, 'per_section_words' => 3000],
        'novel' => ['target_words' => 90000, 'per_section_words' => 3000],
        'epic' => ['target_words' => 150000, 'per_section_words' => 3500],
        'screenplay' => ['target_pages' => 110],
    ],

    // Starter structures per work type. label is the user-facing level name;
    // children nest one level here but the tree itself supports any depth.
    'templates' => [
        'novel' => [
            'format' => 'prose',
            'length_plan' => 'novel',
            'sections' => [
                ['label' => 'Chapter', 'title' => 'Chapter 1'],
                ['label' => 'Chapter', 'title' => 'Chapter 2'],
                ['label' => 'Chapter', 'title' => 'Chapter 3'],
            ],
        ],
        'screenplay' => [
            'format' => 'screenplay',
            'length_plan' => 'screenplay',
            'sections' => [
                ['label' => 'Act', 'title' => 'Act 1', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
                ['label' => 'Act', 'title' => 'Act 2', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
                ['label' => 'Act', 'title' => 'Act 3', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
            ],
        ],
        'stage_play' => [
            'format' => 'screenplay',
            'length_plan' => 'screenplay',
            'sections' => [
                ['label' => 'Act', 'title' => 'Act 1', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
                ['label' => 'Act', 'title' => 'Act 2', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
            ],
        ],
        'short_story' => [
            'format' => 'prose',
            'length_plan' => 'short_story',
            'sections' => [
                ['label' => 'Section', 'title' => 'Opening'],
            ],
        ],
        'essay' => [
            'format' => 'prose',
            'length_plan' => 'short_story',
            'sections' => [
                ['label' => 'Section', 'title' => 'Draft'],
            ],
        ],
        'other' => [
            'format' => 'prose',
            'length_plan' => 'novella',
            'sections' => [
                ['label' => 'Section', 'title' => 'Section 1'],
            ],
        ],
    ],
],
```

And inside the existing `'models'` array:

```php
'work' => Work::class,
'work_section' => WorkSection::class,
```

- [ ] **Step 3: Commit**

```bash
git add database/migrations config/alexandria.php
git commit -m "feat(writing): works + section-tree migrations and writing config"
```

(Models don't exist yet so nothing exercises the config — the migrations are validated by every test in Task 2.)

---

### Task 2: Models + factories (slug + position behavior)

**Files:**
- Create: `src/Models/Writing/Work.php`, `src/Models/Writing/WorkSection.php`, `src/Models/Writing/WorkSectionEntryMention.php`, `src/Models/Writing/WorkEntryPin.php`
- Create: `database/factories/Writing/WorkFactory.php`, `database/factories/Writing/WorkSectionFactory.php`
- Test: `tests/Feature/Writing/WorkModelTest.php`, `tests/Feature/Writing/WorkSectionTreeTest.php` (slug/position parts)

- [ ] **Step 1: Write the failing model tests**

`tests/Feature/Writing/WorkModelTest.php`:

```php
<?php

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a work scoped to a project with a generated slug', function () {
    $project = Project::factory()->create();

    $work = Work::factory()->create([
        'project_id' => $project->id,
        'title' => 'The Long Dark',
    ]);

    expect($work->slug)->toBe('the-long-dark')
        ->and($work->project_id)->toBe($project->id)
        ->and($work->status)->toBe('concept')
        ->and($work->format)->toBe('prose');
});

it('suffixes duplicate slugs within a project but not across projects', function () {
    $project = Project::factory()->create();
    $other = Project::factory()->create();

    $first = Work::factory()->create(['project_id' => $project->id, 'title' => 'Embers']);
    $second = Work::factory()->create(['project_id' => $project->id, 'title' => 'Embers']);
    $elsewhere = Work::factory()->create(['project_id' => $other->id, 'title' => 'Embers']);

    expect($first->slug)->toBe('embers')
        ->and($second->slug)->toBe('embers-2')
        ->and($elsewhere->slug)->toBe('embers');
});

it('re-syncs the slug when the title changes', function () {
    $work = Work::factory()->create(['title' => 'Working Title']);

    $work->update(['title' => 'Final Title']);

    expect($work->fresh()->slug)->toBe('final-title');
});

it('keeps a manually set slug on title change', function () {
    $work = Work::factory()->create(['title' => 'Working Title']);

    $work->update(['title' => 'Final Title', 'slug' => 'my-slug']);

    expect($work->fresh()->slug)->toBe('my-slug');
});

it('casts length_plan to array and exposes sections relations', function () {
    $work = Work::factory()->create(['length_plan' => ['target_words' => 90000]]);

    expect($work->length_plan)->toBe(['target_words' => 90000])
        ->and($work->sections)->toBeEmpty()
        ->and($work->pins)->toBeEmpty();
});
```

`tests/Feature/Writing/WorkSectionTreeTest.php` (first half — slug/position/format behavior; the tree service tests append in Task 4):

```php
<?php

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('generates section slugs unique per work, not per parent', function () {
    $work = Work::factory()->create();
    $act = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Act 1']);

    $sceneA = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $act->id, 'title' => 'Reunion']);
    $sceneB = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Reunion']);

    expect($sceneA->slug)->toBe('reunion')
        ->and($sceneB->slug)->toBe('reunion-2');
});

it('auto-assigns position as max+1 within the sibling group', function () {
    $work = Work::factory()->create();
    $parent = WorkSection::factory()->create(['work_id' => $work->id]);

    $first = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id]);
    $second = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id]);
    $rootLevel = WorkSection::factory()->create(['work_id' => $work->id]);

    expect($first->position)->toBe(0)
        ->and($second->position)->toBe(1)
        ->and($rootLevel->position)->toBe(1); // parent itself occupies root position 0
});

it('inherits the work format unless overridden', function () {
    $work = Work::factory()->create(['format' => 'screenplay']);
    $inherits = WorkSection::factory()->create(['work_id' => $work->id]);
    $overrides = WorkSection::factory()->create(['work_id' => $work->id, 'format' => 'prose']);

    expect($inherits->effectiveFormat())->toBe('screenplay')
        ->and($overrides->effectiveFormat())->toBe('prose');
});

it('orders children by position', function () {
    $work = Work::factory()->create();
    $parent = WorkSection::factory()->create(['work_id' => $work->id]);
    $b = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id, 'title' => 'B']);
    $a = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id, 'title' => 'A']);

    $a->update(['position' => 0]);
    $b->update(['position' => 1]);

    expect($parent->fresh()->children->pluck('title')->all())->toBe(['A', 'B']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `vendor/bin/pest tests/Feature/Writing --compact`
Expected: FAIL — `Class "Alexandria\Core\Models\Writing\Work" not found`.

- [ ] **Step 3: Write the models**

`src/Models/Writing/Work.php`:

```php
<?php

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Database\Factories\Writing\WorkFactory;
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * A written work (novel, screenplay, essay, ...) — Stage 8g.1.
 *
 * Works are first-class and decoupled from the EAV worldbuilding
 * structure: they belong to exactly one project and hold a
 * user-controlled tree of WorkSections. word_count is a cached
 * rollup maintained by WorkSectionContentService.
 *
 * @property int $id
 * @property int $project_id
 * @property int $user_id
 * @property string $title
 * @property string $slug
 * @property string $type
 * @property string $format
 * @property string|null $logline
 * @property string|null $genre
 * @property string $status
 * @property string|null $target_audience
 * @property string|null $language
 * @property string|null $setting_period
 * @property array<string, mixed>|null $length_plan
 * @property int|null $target_words
 * @property int $word_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Project $project
 * @property-read \Illuminate\Database\Eloquent\Collection<int, WorkSection> $sections
 * @property-read \Illuminate\Database\Eloquent\Collection<int, WorkSection> $rootSections
 * @property-read \Illuminate\Database\Eloquent\Collection<int, WorkEntryPin> $pins
 *
 * @method static WorkFactory factory($count = null, $state = [])
 */
class Work extends Model
{
    use HasFactory;
    use SoftDeletes;

    public const string STATUS_CONCEPT = 'concept';

    public const string STATUS_DRAFTING = 'drafting';

    public const string STATUS_REVISING = 'revising';

    public const string STATUS_COMPLETE = 'complete';

    public const string FORMAT_PROSE = 'prose';

    public const string FORMAT_SCREENPLAY = 'screenplay';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'length_plan' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $work) {
            if (empty($work->slug) && ! empty($work->title)) {
                $work->slug = static::generateUniqueSlug($work->title, $work->project_id);
            }
        });

        static::updating(function (self $work) {
            if ($work->isDirty('title') && ! $work->isDirty('slug')) {
                $work->slug = static::generateUniqueSlug($work->title, $work->project_id, $work->id);
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(WorkSection::class)->orderBy('position');
    }

    public function rootSections(): HasMany
    {
        return $this->sections()->whereNull('parent_id');
    }

    public function pins(): HasMany
    {
        return $this->hasMany(WorkEntryPin::class)->orderBy('position');
    }

    protected static function newFactory(): WorkFactory
    {
        return WorkFactory::new();
    }

    /**
     * Mirror of Entry::generateUniqueSlug, scoped to (project_id).
     */
    private static function generateUniqueSlug(string $title, int $projectId, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 2;

        while (static::withTrashed()
            ->where('project_id', $projectId)
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
```

`src/Models/Writing/WorkSection.php`:

```php
<?php

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Database\Factories\Writing\WorkSectionFactory;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * One node of a work's user-controlled tree — Stage 8g.1.
 *
 * Any node may hold prose (content, wiki markup or Fountain-style
 * text per effectiveFormat()); null content means a pure container.
 * Slugs are unique per WORK (not per parent) so /works/{project}/
 * {work}/{section} deep links survive tree reorganization.
 *
 * @property int $id
 * @property int $work_id
 * @property int|null $parent_id
 * @property int $position
 * @property string $title
 * @property string $slug
 * @property string|null $label
 * @property string|null $content
 * @property string|null $format
 * @property string|null $synopsis
 * @property string|null $status
 * @property string|null $beat_type
 * @property string|null $goal
 * @property string|null $conflict
 * @property string|null $stakes
 * @property string|null $mood
 * @property string|null $tone
 * @property string|null $timeline_position
 * @property string|null $int_ext
 * @property int|null $pov_entry_id
 * @property int|null $setting_entry_id
 * @property int $word_count
 * @property int|null $target_words
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Work $work
 * @property-read WorkSection|null $parent
 * @property-read \Illuminate\Database\Eloquent\Collection<int, WorkSection> $children
 * @property-read Entry|null $povEntry
 * @property-read Entry|null $settingEntry
 * @property-read \Illuminate\Database\Eloquent\Collection<int, WorkSectionEntryMention> $entryMentions
 *
 * @method static WorkSectionFactory factory($count = null, $state = [])
 */
class WorkSection extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(function (self $section) {
            if (empty($section->slug) && ! empty($section->title)) {
                $section->slug = static::generateUniqueSlug($section->title, $section->work_id);
            }

            if ($section->getAttribute('position') === null) {
                $max = static::query()
                    ->where('work_id', $section->work_id)
                    ->where('parent_id', $section->parent_id)
                    ->max('position');

                $section->position = $max === null ? 0 : $max + 1;
            }
        });

        static::updating(function (self $section) {
            if ($section->isDirty('title') && ! $section->isDirty('slug')) {
                $section->slug = static::generateUniqueSlug($section->title, $section->work_id, $section->id);
            }
        });
    }

    public function work(): BelongsTo
    {
        return $this->belongsTo(Work::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position');
    }

    public function povEntry(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'pov_entry_id');
    }

    public function settingEntry(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'setting_entry_id');
    }

    public function entryMentions(): HasMany
    {
        return $this->hasMany(WorkSectionEntryMention::class);
    }

    /**
     * The format this section's content parses as: its own override,
     * else the work default.
     */
    public function effectiveFormat(): string
    {
        return $this->format ?? $this->work->format;
    }

    protected static function newFactory(): WorkSectionFactory
    {
        return WorkSectionFactory::new();
    }

    /**
     * Mirror of Entry::generateUniqueSlug, scoped to (work_id) — NOT
     * parent_id, so deep links survive moves (spec decision).
     */
    private static function generateUniqueSlug(string $title, int $workId, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 2;

        while (static::withTrashed()
            ->where('work_id', $workId)
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
```

**Note on the position block:** the factory must NOT set `position` (the column's `default(0)` applies only to raw inserts; the `creating` hook sees `null` when the attribute was never set). If the position test fails because Eloquent hydrates the column default, switch the check to `! $section->offsetExists('position')`.

`src/Models/Writing/WorkSectionEntryMention.php`:

```php
<?php

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Derived appearance-tracking row — Stage 8g.1. Rebuilt from section
 * content + reference fields on every save (never incremental), so
 * it can never drift from the prose. Sources: mention | pov | setting.
 *
 * @property int $id
 * @property int $work_section_id
 * @property int $entry_id
 * @property string $source
 * @property int $mention_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read WorkSection $section
 * @property-read Entry $entry
 */
class WorkSectionEntryMention extends Model
{
    public const string SOURCE_MENTION = 'mention';

    public const string SOURCE_POV = 'pov';

    public const string SOURCE_SETTING = 'setting';

    protected $guarded = [];

    public function section(): BelongsTo
    {
        return $this->belongsTo(WorkSection::class, 'work_section_id');
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }
}
```

`src/Models/Writing/WorkEntryPin.php`:

```php
<?php

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A per-work pinned entry for the reference panel — Stage 8g.1.
 *
 * @property int $id
 * @property int $work_id
 * @property int $entry_id
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Work $work
 * @property-read Entry $entry
 */
class WorkEntryPin extends Model
{
    protected $guarded = [];

    public function work(): BelongsTo
    {
        return $this->belongsTo(Work::class);
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }
}
```

- [ ] **Step 4: Write the factories**

`database/factories/Writing/WorkFactory.php`:

```php
<?php

namespace Alexandria\Core\Database\Factories\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class WorkFactory extends Factory
{
    protected $model = Work::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => fake()->numberBetween(1, 1000),
            'title' => Str::title(fake()->words(3, true)),
            'type' => 'novel',
            'format' => Work::FORMAT_PROSE,
        ];
    }

    public function screenplay(): static
    {
        return $this->state(fn () => [
            'type' => 'screenplay',
            'format' => Work::FORMAT_SCREENPLAY,
        ]);
    }

    public function forProject(Project $project): static
    {
        return $this->state(fn () => ['project_id' => $project->id]);
    }
}
```

`database/factories/Writing/WorkSectionFactory.php`:

```php
<?php

namespace Alexandria\Core\Database\Factories\Writing;

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class WorkSectionFactory extends Factory
{
    protected $model = WorkSection::class;

    public function definition(): array
    {
        return [
            'work_id' => Work::factory(),
            'title' => Str::title(fake()->words(2, true)),
            'label' => 'Chapter',
        ];
    }

    public function withContent(string $content): static
    {
        return $this->state(fn () => ['content' => $content]);
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `vendor/bin/pest tests/Feature/Writing --compact`
Expected: PASS (9 tests). If the position test fails with `0` vs `null` semantics, apply the `offsetExists` fallback noted in Step 3.

- [ ] **Step 6: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/Models/Writing database/factories/Writing tests/Feature/Writing
git commit -m "feat(writing): Work + WorkSection tree models with per-scope slugs"
```

---

### Task 3: WorkScaffolder (starter templates + length-plan presets)

**Files:**
- Create: `src/Services/Writing/WorkScaffolder.php`
- Test: `tests/Feature/Writing/WorkScaffolderTest.php`

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Writing/WorkScaffolderTest.php`:

```php
<?php

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Services\Writing\WorkScaffolder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('scaffolds a novel with chapters, prose format, and the novel length plan', function () {
    $project = Project::factory()->create();

    $work = app(WorkScaffolder::class)->create($project, 7, [
        'title' => 'The Long Dark',
        'type' => 'novel',
    ]);

    expect($work->format)->toBe('prose')
        ->and($work->user_id)->toBe(7)
        ->and($work->length_plan['target_words'])->toBe(90000)
        ->and($work->target_words)->toBe(90000)
        ->and($work->rootSections)->toHaveCount(3)
        ->and($work->rootSections->first()->label)->toBe('Chapter')
        ->and($work->rootSections->first()->target_words)->toBe(3000);
});

it('scaffolds a screenplay with nested act/scene structure', function () {
    $project = Project::factory()->create();

    $work = app(WorkScaffolder::class)->create($project, 7, [
        'title' => 'Cold Open',
        'type' => 'screenplay',
    ]);

    $acts = $work->rootSections;

    expect($work->format)->toBe('screenplay')
        ->and($acts)->toHaveCount(3)
        ->and($acts->first()->children)->toHaveCount(1)
        ->and($acts->first()->children->first()->label)->toBe('Scene');
});

it('falls back to the other template for unknown types', function () {
    $project = Project::factory()->create();

    $work = app(WorkScaffolder::class)->create($project, 7, [
        'title' => 'Mystery Form',
        'type' => 'zine',
    ]);

    expect($work->type)->toBe('zine')
        ->and($work->rootSections)->toHaveCount(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `vendor/bin/pest tests/Feature/Writing/WorkScaffolderTest.php --compact`
Expected: FAIL — `Class "Alexandria\Core\Services\Writing\WorkScaffolder" not found`.

- [ ] **Step 3: Implement**

`src/Services/Writing/WorkScaffolder.php`:

```php
<?php

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Support\Facades\DB;

/**
 * Creates a work with its type's starter structure and length-plan
 * preset — Stage 8g.1. Templates and presets live in
 * config('alexandria.writing'); consumers override config, not code.
 */
class WorkScaffolder
{
    /**
     * @param  array{title: string, type: string, logline?: string|null, genre?: string|null}  $attributes
     */
    public function create(Project $project, int $userId, array $attributes): Work
    {
        $type = $attributes['type'];
        $template = config("alexandria.writing.templates.{$type}")
            ?? config('alexandria.writing.templates.other');

        $planKey = $template['length_plan'] ?? null;
        $plan = $planKey !== null ? config("alexandria.writing.length_plans.{$planKey}") : null;

        return DB::transaction(function () use ($project, $userId, $attributes, $template, $plan): Work {
            /** @var Work $work */
            $work = Work::create([
                ...$attributes,
                'project_id' => $project->id,
                'user_id' => $userId,
                'format' => $template['format'],
                'length_plan' => $plan,
                'target_words' => $plan['target_words'] ?? null,
            ]);

            foreach ($template['sections'] ?? [] as $node) {
                $this->createSection($work, $node, null, $plan['per_section_words'] ?? null);
            }

            return $work;
        });
    }

    /**
     * @param  array{label: string, title: string, children?: array<int, mixed>}  $node
     */
    private function createSection(Work $work, array $node, ?int $parentId, ?int $perSectionWords): void
    {
        /** @var WorkSection $section */
        $section = $work->sections()->create([
            'parent_id' => $parentId,
            'title' => $node['title'],
            'label' => $node['label'],
            'target_words' => $perSectionWords,
        ]);

        foreach ($node['children'] ?? [] as $child) {
            $this->createSection($work, $child, $section->id, $perSectionWords);
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `vendor/bin/pest tests/Feature/Writing/WorkScaffolderTest.php --compact`
Expected: PASS (3 tests).

- [ ] **Step 5: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/Services/Writing tests/Feature/Writing/WorkScaffolderTest.php
git commit -m "feat(writing): WorkScaffolder applies starter templates + length-plan presets"
```

---

### Task 4: SectionTreeService (move/reorder, cycle prevention)

**Files:**
- Create: `src/Services/Writing/SectionTreeService.php`
- Test: append to `tests/Feature/Writing/WorkSectionTreeTest.php`

- [ ] **Step 1: Append failing tests**

Append to `tests/Feature/Writing/WorkSectionTreeTest.php` (add `use Alexandria\Core\Services\Writing\SectionTreeService;` and `use InvalidArgumentException;` to the imports):

```php
it('moves a section under a new parent at a position, resequencing both sibling groups', function () {
    $work = Work::factory()->create();
    $partOne = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Part One']);
    $partTwo = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Part Two']);
    $chapter = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $partOne->id, 'title' => 'Chapter']);
    $existing = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $partTwo->id, 'title' => 'Existing']);

    app(SectionTreeService::class)->move($chapter, $partTwo->id, 0);

    expect($chapter->fresh()->parent_id)->toBe($partTwo->id)
        ->and($chapter->fresh()->position)->toBe(0)
        ->and($existing->fresh()->position)->toBe(1)
        ->and($chapter->fresh()->slug)->toBe('chapter'); // slug untouched by moves
});

it('refuses to move a section under its own descendant', function () {
    $work = Work::factory()->create();
    $parent = WorkSection::factory()->create(['work_id' => $work->id]);
    $child = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id]);

    app(SectionTreeService::class)->move($parent, $child->id, 0);
})->throws(InvalidArgumentException::class);

it('refuses to move a section under a parent from another work', function () {
    $section = WorkSection::factory()->create();
    $foreign = WorkSection::factory()->create();

    app(SectionTreeService::class)->move($section, $foreign->id, 0);
})->throws(InvalidArgumentException::class);

it('reorders a sibling group to the given id sequence', function () {
    $work = Work::factory()->create();
    $a = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'A']);
    $b = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'B']);
    $c = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'C']);

    app(SectionTreeService::class)->reorder($work, null, [$c->id, $a->id, $b->id]);

    expect($work->fresh()->rootSections->pluck('title')->all())->toBe(['C', 'A', 'B']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `vendor/bin/pest tests/Feature/Writing/WorkSectionTreeTest.php --compact`
Expected: FAIL — `Class "Alexandria\Core\Services\Writing\SectionTreeService" not found` (the 4 earlier tests still pass).

- [ ] **Step 3: Implement**

`src/Services/Writing/SectionTreeService.php`:

```php
<?php

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Tree mutations for a work's sections — Stage 8g.1. Moves validate
 * same-work parentage and cycle safety (a section can never become
 * its own descendant); both touched sibling groups resequence to
 * dense 0-based positions. Slugs are work-scoped so moves never
 * change a section's URL.
 */
class SectionTreeService
{
    public function move(WorkSection $section, ?int $newParentId, int $position): void
    {
        if ($newParentId !== null) {
            $parent = WorkSection::query()->findOrFail($newParentId);

            if ($parent->work_id !== $section->work_id) {
                throw new InvalidArgumentException('Target parent belongs to another work.');
            }

            if ($parent->id === $section->id || $this->isDescendantOf($parent, $section)) {
                throw new InvalidArgumentException('A section cannot become its own descendant.');
            }
        }

        DB::transaction(function () use ($section, $newParentId, $position): void {
            $oldParentId = $section->parent_id;

            $section->forceFill(['parent_id' => $newParentId, 'position' => $position])->save();

            $this->resequence($section->work_id, $newParentId, $section->id, $position);

            if ($oldParentId !== $newParentId) {
                $this->resequence($section->work_id, $oldParentId);
            }
        });
    }

    /**
     * @param  array<int, int>  $orderedIds
     */
    public function reorder(Work $work, ?int $parentId, array $orderedIds): void
    {
        DB::transaction(function () use ($work, $parentId, $orderedIds): void {
            foreach (array_values($orderedIds) as $index => $id) {
                WorkSection::query()
                    ->where('work_id', $work->id)
                    ->where('parent_id', $parentId)
                    ->whereKey($id)
                    ->update(['position' => $index]);
            }
        });
    }

    private function isDescendantOf(WorkSection $candidate, WorkSection $ancestor): bool
    {
        $current = $candidate;

        while ($current->parent_id !== null) {
            if ($current->parent_id === $ancestor->id) {
                return true;
            }

            $current = $current->parent;
        }

        return false;
    }

    /**
     * Rewrite a sibling group to dense 0-based positions. When a moved
     * section is supplied it is held at its requested slot and the
     * remaining siblings fill around it.
     */
    private function resequence(int $workId, ?int $parentId, ?int $movedId = null, ?int $movedPosition = null): void
    {
        $siblings = WorkSection::query()
            ->where('work_id', $workId)
            ->where('parent_id', $parentId)
            ->when($movedId !== null, fn ($query) => $query->whereKeyNot($movedId))
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        $slot = 0;

        foreach ($siblings as $sibling) {
            if ($movedPosition !== null && $slot === $movedPosition) {
                $slot++; // the moved section occupies this slot
            }

            if ($sibling->position !== $slot) {
                $sibling->forceFill(['position' => $slot])->save();
            }

            $slot++;
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `vendor/bin/pest tests/Feature/Writing/WorkSectionTreeTest.php --compact`
Expected: PASS (8 tests).

- [ ] **Step 5: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/Services/Writing/SectionTreeService.php tests/Feature/Writing/WorkSectionTreeTest.php
git commit -m "feat(writing): SectionTreeService move/reorder with cycle prevention"
```

---

### Task 5: SectionContentAnalyzer (pure text analysis)

**Files:**
- Create: `src/DTO/Writing/AnalyzedSectionContent.php`
- Create: `src/Services/Writing/SectionContentAnalyzer.php`
- Test: `tests/Feature/Writing/SectionContentAnalyzerTest.php`

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Writing/SectionContentAnalyzerTest.php` (no DB needed — pure service):

```php
<?php

use Alexandria\Core\Services\Writing\SectionContentAnalyzer;

it('counts prose words treating wiki links as their display text', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze('[[Mira Vance|Mira]] crossed the bridge to [[Haven Spire]].', 'prose');

    // Visible text: "Mira crossed the bridge to Haven Spire." = 7 words
    expect($result->wordCount)->toBe(7)
        ->and($result->pageEstimate)->toBeNull()
        ->and($result->mentionNames)->toBe(['Mira Vance' => 1, 'Haven Spire' => 1]);
});

it('counts repeat mentions of the same entry', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze('[[Mira Vance]] waited. [[Mira Vance]] left.', 'prose');

    expect($result->mentionNames)->toBe(['Mira Vance' => 2]);
});

it('handles empty and null-ish content', function () {
    $result = app(SectionContentAnalyzer::class)->analyze('', 'prose');

    expect($result->wordCount)->toBe(0)
        ->and($result->mentionNames)->toBe([]);
});

it('estimates screenplay pages from non-empty lines via config metric', function () {
    config()->set('alexandria.writing.formats.screenplay.lines_per_page', 10);

    $lines = implode("\n", array_fill(0, 25, 'INT. LIBRARY - NIGHT'));

    $result = app(SectionContentAnalyzer::class)->analyze($lines, 'screenplay');

    expect($result->pageEstimate)->toBe(3) // ceil(25 / 10)
        ->and($result->wordCount)->toBe(75); // 3 counted words per line (bare "-" has no letter/digit) x 25
});

it('extracts mentions from screenplay action lines too', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze("INT. SPIRE - DAY\n\n[[Mira Vance]] enters.", 'screenplay');

    expect($result->mentionNames)->toBe(['Mira Vance' => 1]);
});
```

> **Word-count rule for all expectations:** count tokens containing at least one letter/digit after replacing `[[Name|Display]]` with its display text (or name). Verify each expectation by hand before trusting it.

- [ ] **Step 2: Run tests to verify they fail**

Run: `vendor/bin/pest tests/Feature/Writing/SectionContentAnalyzerTest.php --compact`
Expected: FAIL — class not found.

- [ ] **Step 3: Implement**

`src/DTO/Writing/AnalyzedSectionContent.php`:

```php
<?php

namespace Alexandria\Core\DTO\Writing;

/**
 * Result of one SectionContentAnalyzer pass — Stage 8g.1.
 *
 * mentionNames maps the raw [[wiki-link]] target name to its
 * occurrence count; resolution to Entry ids happens later in
 * WorkSectionContentService (name → entry within the project).
 */
final readonly class AnalyzedSectionContent
{
    /**
     * @param  array<string, int>  $mentionNames
     */
    public function __construct(
        public int $wordCount,
        public ?int $pageEstimate,
        public array $mentionNames,
    ) {}
}
```

`src/Services/Writing/SectionContentAnalyzer.php`:

```php
<?php

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\DTO\Writing\AnalyzedSectionContent;

/**
 * One pass over a section's text content — Stage 8g.1. Produces the
 * canonical word count (the editor's live count is cosmetic), the
 * screenplay page estimate, and the raw mention names, all from the
 * same walk. Pure function of (content, format) + config metrics;
 * 8g.2 craft analyzers are siblings of this walker.
 */
class SectionContentAnalyzer
{
    private const string WIKI_LINK_PATTERN = '/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/u';

    public function analyze(?string $content, string $format): AnalyzedSectionContent
    {
        $content ??= '';

        $mentionNames = [];

        $visibleText = (string) preg_replace_callback(
            self::WIKI_LINK_PATTERN,
            function (array $match) use (&$mentionNames): string {
                $name = trim($match[1]);
                $mentionNames[$name] = ($mentionNames[$name] ?? 0) + 1;

                return trim($match[2] ?? '') !== '' ? trim($match[2]) : $name;
            },
            $content,
        );

        $words = preg_split('/[\s\x{00A0}]+/u', trim($visibleText), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $wordCount = count(array_filter($words, fn (string $word): bool => preg_match('/[\p{L}\p{N}]/u', $word) === 1));

        $pageEstimate = null;

        if ($format === 'screenplay') {
            $linesPerPage = max(1, (int) config('alexandria.writing.formats.screenplay.lines_per_page', 55));
            $lines = array_filter(array_map('trim', explode("\n", $visibleText)), fn (string $line): bool => $line !== '');
            $pageEstimate = (int) ceil(count($lines) / $linesPerPage);
        }

        return new AnalyzedSectionContent($wordCount, $pageEstimate, $mentionNames);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `vendor/bin/pest tests/Feature/Writing/SectionContentAnalyzerTest.php --compact`
Expected: PASS (5 tests).

- [ ] **Step 5: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/DTO/Writing src/Services/Writing/SectionContentAnalyzer.php tests/Feature/Writing/SectionContentAnalyzerTest.php
git commit -m "feat(writing): SectionContentAnalyzer counts words, pages, mention names"
```

---

### Task 6: WorkSectionContentService (persist → mentions + rollups)

**Files:**
- Create: `src/Services/Writing/WorkSectionContentService.php`
- Test: `tests/Feature/Writing/WorkSectionContentServiceTest.php`

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Writing/WorkSectionContentServiceTest.php`:

```php
<?php

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Models\Writing\WorkSectionEntryMention;
use Alexandria\Core\Services\Writing\WorkSectionContentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function writingFixtures(): array
{
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);
    $mira = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id, 'name' => 'Mira Vance']);
    $work = Work::factory()->forProject($project)->create();
    $section = WorkSection::factory()->create(['work_id' => $work->id]);

    return [$project, $blueprint, $mira, $work, $section];
}

it('persists content, caches the word count, and writes mention rows', function () {
    [, , $mira, $work, $section] = writingFixtures();

    app(WorkSectionContentService::class)->persist($section, '[[Mira Vance]] crossed the bridge. [[Mira Vance]] looked back.');

    $section->refresh();

    // "Mira Vance crossed the bridge. Mira Vance looked back." = 9 words
    expect($section->content)->toContain('[[Mira Vance]]')
        ->and($section->word_count)->toBe(9)
        ->and($section->entryMentions)->toHaveCount(1)
        ->and($section->entryMentions->first()->entry_id)->toBe($mira->id)
        ->and($section->entryMentions->first()->source)->toBe(WorkSectionEntryMention::SOURCE_MENTION)
        ->and($section->entryMentions->first()->mention_count)->toBe(2)
        ->and($work->fresh()->word_count)->toBe(9);
});

it('is idempotent and removes stale mention rows on re-save', function () {
    [, , $mira, , $section] = writingFixtures();
    $service = app(WorkSectionContentService::class);

    $service->persist($section, '[[Mira Vance]] waits.');
    $service->persist($section, 'Nobody is here.');

    expect($section->fresh()->entryMentions)->toHaveCount(0)
        ->and($section->fresh()->word_count)->toBe(3);
});

it('ignores mention names that resolve to no entry or another project', function () {
    [, , , , $section] = writingFixtures();

    $foreign = Entry::factory()->create(['name' => 'Foreign Friend']); // different project

    app(WorkSectionContentService::class)->persist($section, '[[Ghost Name]] met [[Foreign Friend]].');

    expect($section->fresh()->entryMentions)->toHaveCount(0);
});

it('resolves mention names case-insensitively within the project', function () {
    [, , $mira, , $section] = writingFixtures();

    app(WorkSectionContentService::class)->persist($section, '[[mira vance]] arrives.');

    expect($section->fresh()->entryMentions->first()?->entry_id)->toBe($mira->id);
});

it('maintains pov and setting source rows from the reference fields', function () {
    [$project, $blueprint, $mira, , $section] = writingFixtures();
    $spire = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id, 'name' => 'Haven Spire']);

    $section->forceFill(['pov_entry_id' => $mira->id, 'setting_entry_id' => $spire->id])->save();

    app(WorkSectionContentService::class)->syncReferenceMentions($section->fresh());

    $sources = $section->fresh()->entryMentions->pluck('source', 'entry_id');

    expect($sources[$mira->id])->toBe(WorkSectionEntryMention::SOURCE_POV)
        ->and($sources[$spire->id])->toBe(WorkSectionEntryMention::SOURCE_SETTING);
});

it('updates the work rollup across multiple sections', function () {
    [, , , $work, $section] = writingFixtures();
    $second = WorkSection::factory()->create(['work_id' => $work->id]);
    $service = app(WorkSectionContentService::class);

    $service->persist($section, 'One two three.');
    $service->persist($second, 'Four five.');

    expect($work->fresh()->word_count)->toBe(5);
});
```

> Word counts verified: test 1 = 9; `Nobody is here.` = 3; `One two three.` + `Four five.` = 5.

- [ ] **Step 2: Run tests to verify they fail**

Run: `vendor/bin/pest tests/Feature/Writing/WorkSectionContentServiceTest.php --compact`
Expected: FAIL — class not found.

- [ ] **Step 3: Implement**

`src/Services/Writing/WorkSectionContentService.php`:

```php
<?php

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Models\Writing\WorkSectionEntryMention;
use Illuminate\Support\Facades\DB;

/**
 * Persists section content and keeps every derived value true —
 * Stage 8g.1. Word counts and mention rows are rebuilt from the
 * text on each save (never incremental), and the work's cached
 * word_count rollup follows. Recomputable from documents alone via
 * the alexandria:writing:rebuild command.
 */
readonly class WorkSectionContentService
{
    public function __construct(private SectionContentAnalyzer $analyzer) {}

    public function persist(WorkSection $section, ?string $content): WorkSection
    {
        $analysis = $this->analyzer->analyze($content, $section->effectiveFormat());

        DB::transaction(function () use ($section, $content, $analysis): void {
            $section->forceFill([
                'content' => $content,
                'word_count' => $analysis->wordCount,
            ])->save();

            $this->syncMentionRows($section, $analysis->mentionNames);
            $this->refreshWorkRollup($section->work_id);
        });

        return $section;
    }

    /**
     * Re-derives the pov/setting mention rows from the section's
     * reference fields. Called after craft-field saves (Plan 2).
     */
    public function syncReferenceMentions(WorkSection $section): void
    {
        DB::transaction(function () use ($section): void {
            foreach ([
                WorkSectionEntryMention::SOURCE_POV => $section->pov_entry_id,
                WorkSectionEntryMention::SOURCE_SETTING => $section->setting_entry_id,
            ] as $source => $entryId) {
                $section->entryMentions()->where('source', $source)->delete();

                if ($entryId !== null) {
                    $section->entryMentions()->create([
                        'entry_id' => $entryId,
                        'source' => $source,
                        'mention_count' => 1,
                    ]);
                }
            }
        });
    }

    /**
     * @param  array<string, int>  $mentionNames
     */
    private function syncMentionRows(WorkSection $section, array $mentionNames): void
    {
        $projectId = $section->work->project_id;

        $resolved = [];

        if ($mentionNames !== []) {
            $lowered = array_map(fn (string $name): string => mb_strtolower($name), array_keys($mentionNames));

            $entries = Entry::query()
                ->where('project_id', $projectId)
                ->whereIn(DB::raw('lower(name)'), $lowered)
                ->get(['id', 'name']);

            foreach ($mentionNames as $name => $count) {
                $entry = $entries->first(fn (Entry $candidate): bool => mb_strtolower($candidate->name) === mb_strtolower($name));

                if ($entry !== null) {
                    $resolved[$entry->id] = ($resolved[$entry->id] ?? 0) + $count;
                }
            }
        }

        $section->entryMentions()
            ->where('source', WorkSectionEntryMention::SOURCE_MENTION)
            ->whereNotIn('entry_id', array_keys($resolved))
            ->delete();

        foreach ($resolved as $entryId => $count) {
            $section->entryMentions()->updateOrCreate(
                ['entry_id' => $entryId, 'source' => WorkSectionEntryMention::SOURCE_MENTION],
                ['mention_count' => $count],
            );
        }
    }

    private function refreshWorkRollup(int $workId): void
    {
        Work::query()->whereKey($workId)->update([
            'word_count' => WorkSection::query()->where('work_id', $workId)->sum('word_count'),
        ]);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `vendor/bin/pest tests/Feature/Writing/WorkSectionContentServiceTest.php --compact`
Expected: PASS (6 tests). SQLite supports `lower(name)` in `whereIn(DB::raw(...))`; Postgres does too — both engines covered.

- [ ] **Step 5: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/Services/Writing/WorkSectionContentService.php tests/Feature/Writing/WorkSectionContentServiceTest.php
git commit -m "feat(writing): content persistence with derived mentions + work rollups"
```

---

### Task 7: Rebuild command

**Files:**
- Create: `src/Console/RebuildWritingDataCommand.php`
- Modify: `src/AlexandriaServiceProvider.php`
- Test: `tests/Feature/Writing/RebuildWritingDataCommandTest.php`

- [ ] **Step 1: Write the failing test**

`tests/Feature/Writing/RebuildWritingDataCommandTest.php`:

```php
<?php

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rebuilds counts and mentions from raw content', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);
    $mira = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id, 'name' => 'Mira Vance']);
    $work = Work::factory()->forProject($project)->create();

    // Raw insert path: content present but derived data missing/stale.
    $section = WorkSection::factory()->create([
        'work_id' => $work->id,
        'content' => '[[Mira Vance]] waits alone.',
        'word_count' => 999,
    ]);

    $this->artisan('alexandria:writing:rebuild')->assertExitCode(0);

    expect($section->fresh()->word_count)->toBe(4)
        ->and($section->fresh()->entryMentions)->toHaveCount(1)
        ->and($work->fresh()->word_count)->toBe(4);
});

it('scopes the rebuild to one work when --work is given', function () {
    $workA = Work::factory()->create();
    $workB = Work::factory()->create();
    $sectionA = WorkSection::factory()->create(['work_id' => $workA->id, 'content' => 'One two.', 'word_count' => 999]);
    $sectionB = WorkSection::factory()->create(['work_id' => $workB->id, 'content' => 'One two.', 'word_count' => 999]);

    $this->artisan('alexandria:writing:rebuild', ['--work' => $workA->id])->assertExitCode(0);

    expect($sectionA->fresh()->word_count)->toBe(2)
        ->and($sectionB->fresh()->word_count)->toBe(999);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vendor/bin/pest tests/Feature/Writing/RebuildWritingDataCommandTest.php --compact`
Expected: FAIL — command not found (`There are no commands defined in the "alexandria:writing" namespace`).

- [ ] **Step 3: Implement the command + register it**

`src/Console/RebuildWritingDataCommand.php`:

```php
<?php

namespace Alexandria\Core\Console;

use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Services\Writing\WorkSectionContentService;
use Illuminate\Console\Command;

/**
 * Rebuilds every derived writing value (section word counts, mention
 * rows, work rollups) from raw content — Stage 8g.1. Safe to run any
 * time: derived data is a pure function of the documents.
 */
class RebuildWritingDataCommand extends Command
{
    protected $signature = 'alexandria:writing:rebuild {--work= : Restrict the rebuild to one work id}';

    protected $description = 'Rebuild derived writing data (word counts, mentions, rollups) from section content';

    public function handle(WorkSectionContentService $contentService): int
    {
        $sections = WorkSection::query()
            ->when($this->option('work') !== null, fn ($query) => $query->where('work_id', (int) $this->option('work')))
            ->orderBy('id')
            ->get();

        foreach ($sections as $section) {
            $contentService->persist($section, $section->content);
            $contentService->syncReferenceMentions($section->fresh());
        }

        $this->info("Rebuilt derived data for {$sections->count()} sections.");

        return self::SUCCESS;
    }
}
```

In `src/AlexandriaServiceProvider.php`, inside the existing `if ($this->app->runningInConsole())` block (where the `publishes` calls live), add:

```php
$this->commands([
    \Alexandria\Core\Console\RebuildWritingDataCommand::class,
]);
```

(First console command in core — there's no existing `commands()` call; place it at the end of the console block with the import style matching the file.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `vendor/bin/pest tests/Feature/Writing/RebuildWritingDataCommandTest.php --compact`
Expected: PASS (2 tests).

- [ ] **Step 5: Pint + commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/Console src/AlexandriaServiceProvider.php tests/Feature/Writing/RebuildWritingDataCommandTest.php
git commit -m "feat(writing): alexandria:writing:rebuild derived-data command"
```

---

### Task 8: Full-suite verification

- [ ] **Step 1: Run the entire core suite**

Run: `vendor/bin/pest --compact`
Expected: PASS — all pre-existing suites stay green (the new migrations must not break any existing test; FK targets are `projects`/`entries`, both present in the Testbench schema).

- [ ] **Step 2: Final pint sweep + commit any leftovers**

```bash
vendor/bin/pint --format agent
git status
```

If pint touched files, commit: `git add -A && git commit -m "style(writing): pint sweep for plan 1"`. Verify `git status` is clean before reporting done — leftover modifications block branch switches later (lint-staged stash hazard).

---

## Self-Review Notes (already applied)

- Word-count expectations in Tasks 5/6 carry worked-arithmetic warnings — the implementer must verify each count rather than trusting the prose.
- `WorkSection::creating` position logic has a known Eloquent-default subtlety; Task 2 Step 3 carries the canonical final form + fallback.
- `Entry::factory()` requires `blueprint_id` — fixture helpers create a Blueprint explicitly everywhere entries appear.
- Spec coverage in this plan: data model (§works/§work_sections/§mentions/§pins) ✔, starter templates ✔, length-plan seeding ✔, slug rules incl. amendments ✔, tree ops + cycle prevention ✔, analyzer + derived mentions + rollup (amendment 4 simplification) ✔, rebuild command ✔. Deliberately out (later plans): HTTP layer (Plan 2), editor/workspace UI (Plan 2/3), panel seam + pickers (Plan 3), reports/global dashboard/smokes (Plan 4).
