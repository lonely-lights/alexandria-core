# Outline Mode + Ghost Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Outline-first authoring bound to the real WorkSection tree — a full-pane Outline view with paste-to-structure, a Ghost Layer plan block (synopsis + beat check-off) inside the writing views, and a read-mostly sidebar outline mode.

**Architecture:** Beats are a `beats` jsonb column on `work_sections` (array of `{id, text, done}`), never child sections. The outline is a projection of the section tree served by a new app-side `WorkOutlineController` (GET projection, transactional bulk PUT keyed by section ids + tempIds, PATCH beat toggle). Core ships all frontend: an `Outline/` component family, a third workspace view mode, plan blocks mounted in `ManuscriptEditor` + `FlowSection`, and a fourth built-in sidebar mode.

**Tech Stack:** Laravel 13 (app controllers/routes), PHP 8.4, React 19 + TypeScript in `alexandria-core/resources/js`, Pest 4 (app `tests/Feature/Writing`), Vitest (app `resources/js/editor/tests` importing core via the `@alexandria` alias).

**Spec:** `alexandria-core/docs/superpowers/specs/2026-08-28-outline-mode-design.md` (read it first — owner-ratified decisions are locked).

## Global Constraints

- Branches: `feat/outline-mode` in BOTH `alexandria-core` and `alexandria-app`. Core is consumed by the app via a Composer path repo symlink — edits to core are live in the app after `npm run build`/`npm run dev` (the owner runs `npm run dev`; run `npm run build` only when a task's verification needs built assets).
- **Alpha migration policy:** edit the EXISTING core migration `database/migrations/0001_01_01_000910_create_work_sections_table.php` in place — never create a new migration file. Apply the column to the live DB manually via tinker DDL.
- **Route ordering rule** (comment in `alexandria-app/routes/web.php` works group): literal segments must register BEFORE the `GET /{work:slug}/{section?}` wildcard. `outline` routes go with the other literal routes.
- **Authorization pattern:** route middleware `can:view,work` / `can:update,work` only — the writing controllers contain NO `$this->authorize()` calls. Same-work guard idiom for `{section}` ints: `$model = WorkSection::query()->findOrFail($section); abort_unless($model->work_id === $work->id, 404);`
- **Fetch-consumed endpoints return JSON, never `back()`** (raw `fetch` replays redirects — established repo doctrine). All three new endpoints are fetch-consumed: JSON responses only.
- **UI strings live in `lang/` via translation keys, never inline.** Core keys are package-namespaced: `__('alexandria::writing.…')` server-side; frontend uses the existing `t('writing.…')` mechanism in the writing pages (copy the pattern used by sibling components).
- **No wayfinder in writing components** — raw `fetch` with URLs from `worksBase(projectSlug, workSlug)` (`@alexandria/lib/urls`) and headers matching `resources/js/lib/csrfHeaders.ts`-style helpers (writing components define a local `apiHeaders`; copy `CommentRail.tsx:170`'s).
- **Pest style (owner):** brace-free simple string interpolation (`"$var"` not `"{$var}"` where simple) and chained `->and()` expectations.
- TypeScript strict; existing files' conventions win. PHP: `declare(strict_types=1);`, final controllers, explicit return types. Run `vendor/bin/pint --dirty --format agent` before each app/PHP commit.
- Section `label` vocabulary is per-work (Act/Chapter/Scene/…); the outline NEVER invents labels — depth maps to labels already present in the work's tree (fallback: deepest known label).
- Beat shape everywhere: `{ id: string (client uuid), text: string (≤500), done: boolean }`.

## File Map

| File | Role |
|---|---|
| core `database/migrations/0001_01_01_000910_create_work_sections_table.php` | +`beats` jsonb (edit in place, after `synopsis`) |
| core `src/Models/Writing/WorkSection.php` | +`casts()` with `beats => array` |
| app `app/Services/Writing/SectionTreeService.php` | `payload()` gains `beats` |
| app `app/Http/Controllers/Writing/WorkOutlineController.php` | NEW — show / update / toggleBeat |
| app `routes/web.php` | 3 new routes in the works group |
| core `resources/js/pages/Writing/Outline/outlineTypes.ts` | NEW — `OutlineRow`, `OutlineBeat`, payload types |
| core `resources/js/pages/Writing/Outline/parseOutlinePaste.ts` | NEW — pure paste parser |
| core `resources/js/pages/Writing/Outline/useOutlineSync.ts` | NEW — debounced bulk-save hook |
| core `resources/js/pages/Writing/Outline/OutlineView.tsx` | NEW — full-pane editor |
| core `resources/js/pages/Writing/Outline/PlanBlock.tsx` | NEW — ghost block |
| core `resources/js/pages/Writing/Outline/planPrefs.ts` | NEW — show-plan localStorage pref |
| core `resources/js/pages/Writing/Outline/OutlineSidebar.tsx` | NEW — sidebar mode body |
| core `resources/js/pages/Writing/Flow/viewMode.ts` | widen to `'continuous' | 'focus' | 'outline'` |
| core `resources/js/pages/Writing/Workspace.tsx` | render outline view; wire PlanBlock props; 4th sidebar mode |
| core `resources/js/pages/Writing/Sections/ManuscriptEditor.tsx` | mount PlanBlock |
| core `resources/js/pages/Writing/Flow/FlowSection.tsx` | mount PlanBlock |
| core `resources/js/pages/Writing/Sections/PanelModeSwitcher.tsx` | +outline built-in mode |
| core `resources/js/pages/Writing/ribbon/writingRibbonTabs.tsx` | View-tab: outline view control + show-plan toggle |
| core `lang/en/writing.php` | new `outline.*` / `plan.*` keys |
| app `tests/Feature/Writing/WorkOutlineControllerTest.php` | NEW — endpoint battery |
| app `resources/js/editor/tests/outline-parse.test.ts` etc. | NEW — Vitest |
| app `tests/Browser/Writing/OutlineModeTest.php` | NEW — smoke |

Read before implementing anything: `WorkSectionController.php` (idioms), `useSectionAutosave.ts` (save pattern), `sidebarModeRegistry.ts` + `PanelModeSwitcher.tsx` (modes), `writingRibbonTabs.tsx` (View tab), `Workspace.tsx:85-120` (SectionNode/CurrentSection types), `SectionTreeService::payload()`.

---

### Task 1: Beats data layer (core column + cast + app payload)

**Files:**
- Modify: core `database/migrations/0001_01_01_000910_create_work_sections_table.php` (line 23 area)
- Modify: core `src/Models/Writing/WorkSection.php`
- Modify: app `app/Services/Writing/SectionTreeService.php` (`payload()`)
- Test: app `tests/Feature/Writing/WorkOutlineBeatsColumnTest.php` (NEW)

**Interfaces:**
- Produces: `work_sections.beats` jsonb nullable; `WorkSection->beats` cast to PHP array; `SectionTreeService::payload()` output gains `'beats' => array` (empty array when null). Beat element shape `['id' => string, 'text' => string, 'done' => bool]`.

- [ ] **Step 1: Edit the core migration in place.** After the `synopsis` line (`$table->text('synopsis')->nullable();`) add:

```php
$table->jsonb('beats')->nullable();
```

- [ ] **Step 2: Add the cast to `WorkSection`.** The model currently has NO `casts()` method; add (near the top of the class body, after `$guarded`):

```php
/** @return array<string, string> */
protected function casts(): array
{
    return [
        'beats' => 'array',
    ];
}
```

- [ ] **Step 3: Apply the column to the live app database** (alpha policy — the edited migration only serves fresh/CI environments):

```bash
cd C:/Websites/alexandria/alexandria-app && php artisan tinker --execute 'Illuminate\Support\Facades\DB::statement("alter table work_sections add column if not exists beats jsonb null"); echo "ok\n";'
```

- [ ] **Step 4: Write the failing test** (`php artisan make:test --pest Writing/WorkOutlineBeatsColumnTest` then replace body):

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use App\Models\User;
use App\Services\Writing\SectionTreeService;
use Alexandria\Core\Models\Framework\Project;

uses()->group('writing');

it('round-trips beats through the array cast and payload', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner_id' => $user->id]);
    $work = Work::factory()->forProject($project)->create();
    $section = WorkSection::factory()->create([
        'work_id' => $work->id,
        'title' => 'The Guild Briefing',
        'beats' => [['id' => 'b1', 'text' => 'All nine pulsed', 'done' => false]],
    ]);

    $fresh = $section->fresh();
    $payload = app(SectionTreeService::class)->payload($fresh);

    expect($fresh->beats)->toBeArray()
        ->and($fresh->beats[0]['text'])->toBe('All nine pulsed')
        ->and($payload['beats'])->toBe($fresh->beats);
});

it('payload returns an empty beats array when the column is null', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner_id' => $user->id]);
    $work = Work::factory()->forProject($project)->create();
    $section = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Bare']);

    expect(app(SectionTreeService::class)->payload($section->fresh())['beats'])->toBe([]);
});
```

(Adjust the `payload()` call signature to whatever `SectionTreeService::payload()` actually takes — read `alexandria-app/app/Services/Writing/SectionTreeService.php:54` first; if it takes extra args, pass the minimal real ones.)

- [ ] **Step 5: Run to verify failure:** `php artisan test --compact --filter=WorkOutlineBeatsColumn` — expect failure on missing `beats` key in payload (the cast + column exist after steps 1-3).

- [ ] **Step 6: Implement:** in `SectionTreeService::payload()` add to the returned array:

```php
'beats' => $section->beats ?? [],
```

- [ ] **Step 7: Run to verify pass:** `php artisan test --compact --filter=WorkOutlineBeatsColumn` — 2 passing.

- [ ] **Step 8: Commit** (core and app separately):

```bash
cd C:/Websites/alexandria/alexandria-core && git add database/migrations/0001_01_01_000910_create_work_sections_table.php src/Models/Writing/WorkSection.php && git commit -m "feat(outline): beats jsonb column + array cast on WorkSection"
cd C:/Websites/alexandria/alexandria-app && vendor/bin/pint --dirty --format agent && git add app/Services/Writing/SectionTreeService.php tests/Feature/Writing/WorkOutlineBeatsColumnTest.php && git commit -m "feat(outline): beats in section payload"
```

---

### Task 2: Outline GET projection endpoint

**Files:**
- Create: app `app/Http/Controllers/Writing/WorkOutlineController.php`
- Modify: app `routes/web.php` (works group — BEFORE the `GET /{work:slug}/{section?}` wildcard, beside the other literal-segment routes)
- Test: app `tests/Feature/Writing/WorkOutlineControllerTest.php` (NEW)

**Interfaces:**
- Produces: `GET /{work:slug}/outline` (name `works.outline.show`, middleware `can:view,work`) returning:

```json
{ "rows": [ { "sectionId": 1, "parentId": null, "depth": 0, "label": "Act", "title": "Act 1",
              "synopsis": null, "beats": [] } ],
  "baseVersion": "3:2026-08-28T06:10:00+00:00" }
```

Rows are depth-first in position order. `baseVersion` = `"{sectionCount}:{maxUpdatedAtIso}"` over the work's non-deleted sections (`"0:"` for an empty work). Later tasks consume: `buildOutlineProjection(Work $work): array` (public method on the controller's service — see Step 3) and the row shape above.

- [ ] **Step 1: Write the failing tests** (start `WorkOutlineControllerTest.php` — this file grows through Task 3):

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use App\Models\User;
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Support\Facades\Gate;

uses()->group('writing');

beforeEach(function () {
    Gate::before(fn () => true);
    $this->user = User::factory()->create();
    $this->project = Project::factory()->create(['owner_id' => $this->user->id]);
    $this->work = Work::factory()->forProject($this->project)->create();
});

function outlineSection(Work $work, array $attrs = []): WorkSection
{
    return WorkSection::factory()->create(array_merge(['work_id' => $work->id], $attrs));
}

it('returns the outline projection depth-first with beats and a base version', function () {
    $act = outlineSection($this->work, ['title' => 'Act 1', 'label' => 'Act', 'position' => 1]);
    $sceneB = outlineSection($this->work, ['title' => 'Scene B', 'label' => 'Scene', 'parent_id' => $act->id, 'position' => 2]);
    $sceneA = outlineSection($this->work, [
        'title' => 'Scene A', 'label' => 'Scene', 'parent_id' => $act->id, 'position' => 1,
        'synopsis' => 'The plan', 'beats' => [['id' => 'b1', 'text' => 'Open cold', 'done' => true]],
    ]);

    $response = $this->actingAs($this->user)
        ->getJson(route('works.outline.show', [$this->project, $this->work]))
        ->assertOk()
        ->json();

    expect(array_column($response['rows'], 'title'))->toBe(['Act 1', 'Scene A', 'Scene B'])
        ->and($response['rows'][1]['depth'])->toBe(1)
        ->and($response['rows'][1]['synopsis'])->toBe('The plan')
        ->and($response['rows'][1]['beats'][0]['done'])->toBeTrue()
        ->and($response['rows'][2]['beats'])->toBe([])
        ->and($response['baseVersion'])->toStartWith('3:');
});

it('rejects the outline of another project\'s work', function () {
    $other = Project::factory()->create(['owner_id' => $this->user->id]);

    $this->actingAs($this->user)
        ->getJson(route('works.outline.show', [$other, $this->work]))
        ->assertNotFound();
});
```

(The cross-project 404 relies on the works group's scoped bindings — mirror however `WorkSectionControllerTest` asserts the equivalent; if scoped binding responds differently there, match that assertion.)

- [ ] **Step 2: Run to verify failure:** `php artisan test --compact --filter=WorkOutlineController` — route not defined.

- [ ] **Step 3: Implement controller + route.** Controller (projection logic as private methods so Task 3 reuses them):

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

final readonly class WorkOutlineController
{
    public function show(Project $project, Work $work): JsonResponse
    {
        return response()->json($this->projection($work));
    }

    /** @return array{rows: list<array<string, mixed>>, baseVersion: string} */
    private function projection(Work $work): array
    {
        $sections = $work->sections()->orderBy('position')->get();
        $byParent = $sections->groupBy(fn (WorkSection $s) => $s->parent_id ?? 0);

        $rows = [];
        $walk = function (?int $parentId, int $depth) use (&$walk, &$rows, $byParent): void {
            foreach ($byParent->get($parentId ?? 0, collect()) as $section) {
                $rows[] = [
                    'sectionId' => $section->id,
                    'parentId' => $section->parent_id,
                    'depth' => $depth,
                    'label' => $section->label,
                    'title' => $section->title,
                    'synopsis' => $section->synopsis,
                    'beats' => $section->beats ?? [],
                ];
                $walk($section->id, $depth + 1);
            }
        };
        $walk(null, 0);

        return ['rows' => $rows, 'baseVersion' => $this->version($sections)];
    }

    /** @param Collection<int, WorkSection> $sections */
    private function version(Collection $sections): string
    {
        $max = $sections->max('updated_at');

        return $sections->count().':'.($max?->toIso8601String() ?? '');
    }
}
```

Route, inside the works group next to the other literal-segment routes (read the surrounding block and match its style exactly):

```php
Route::get('/{work:slug}/outline', [WorkOutlineController::class, 'show'])
    ->name('works.outline.show')
    ->middleware('can:view,work');
```

- [ ] **Step 4: Run to verify pass:** `php artisan test --compact --filter=WorkOutlineController`.

- [ ] **Step 5: Commit:**

```bash
cd C:/Websites/alexandria/alexandria-app && vendor/bin/pint --dirty --format agent && git add app/Http/Controllers/Writing/WorkOutlineController.php routes/web.php tests/Feature/Writing/WorkOutlineControllerTest.php && git commit -m "feat(outline): GET outline projection endpoint"
```

---

### Task 3: Bulk outline apply (PUT) + beat toggle (PATCH)

**Files:**
- Modify: app `app/Http/Controllers/Writing/WorkOutlineController.php`
- Modify: app `routes/web.php` (PUT beside the GET; PATCH with the other `sections/{section}` literals)
- Test: app `tests/Feature/Writing/WorkOutlineControllerTest.php` (extend)

**Interfaces:**
- Produces `PUT /{work:slug}/outline` (`works.outline.update`, `can:update,work`). Request body:

```json
{ "baseVersion": "3:2026-…", "force": [],
  "deleted": [12],
  "rows": [ { "sectionId": 1, "tempId": null, "parentId": null, "depth": 0, "label": "Act",
              "title": "Act 1", "synopsis": null, "beats": [] },
            { "sectionId": null, "tempId": "t-abc", "parentId": 1, "depth": 1, "label": "Scene",
              "title": "New Scene", "synopsis": "…", "beats": [ { "id": "b1", "text": "…", "done": false } ] } ] }
```

Responses: `200` → fresh projection + `"tempIds": {"t-abc": 119}` + `"blocked": [{"sectionId": 12, "reason": "content"}]`; `409` → `{"conflict": true}` + fresh projection; `422` on validation. `parentId` may be an int (existing id), a `tempId` string appearing EARLIER in `rows`, or null. Deletions only via `deleted`; guard reasons: `"content"` | `"notes"` | `"comments"`, overridden per-id by `force`.
- Produces `PATCH /{work:slug}/sections/{section}/beats/{beatId}` (`works.sections.beats.toggle`, `can:update,work`), body `{"done": true}` → `200 {"beats": [...]}`; 404 unknown beat.

- [ ] **Step 1: Write the failing tests** (append to `WorkOutlineControllerTest.php`; a `putOutline` helper keeps them tight):

```php
function putOutline(object $test, array $overrides = []): \Illuminate\Testing\TestResponse
{
    $base = $test->actingAs($test->user)
        ->getJson(route('works.outline.show', [$test->project, $test->work]))
        ->json();

    $payload = array_merge([
        'baseVersion' => $base['baseVersion'],
        'rows' => $base['rows'],
        'deleted' => [],
        'force' => [],
    ], $overrides);

    return $test->actingAs($test->user)
        ->putJson(route('works.outline.update', [$test->project, $test->work]), $payload);
}

it('creates new sections from tempId rows with parent resolution and payload order', function () {
    $act = outlineSection($this->work, ['title' => 'Act 1', 'label' => 'Act', 'position' => 1]);

    $response = putOutline($this, ['rows' => [
        ['sectionId' => $act->id, 'tempId' => null, 'parentId' => null, 'depth' => 0, 'label' => 'Act', 'title' => 'Act 1', 'synopsis' => null, 'beats' => []],
        ['sectionId' => null, 'tempId' => 't-1', 'parentId' => $act->id, 'depth' => 1, 'label' => 'Scene', 'title' => 'First', 'synopsis' => 'Opens', 'beats' => [['id' => 'b1', 'text' => 'Cold open', 'done' => false]]],
        ['sectionId' => null, 'tempId' => 't-2', 'parentId' => 't-1', 'depth' => 2, 'label' => 'Scene', 'title' => 'Nested under temp', 'synopsis' => null, 'beats' => []],
    ]])->assertOk()->json();

    $firstId = $response['tempIds']['t-1'];
    $first = WorkSection::query()->findOrFail($firstId);

    expect($first->work_id)->toBe($this->work->id)
        ->and($first->synopsis)->toBe('Opens')
        ->and($first->beats[0]['text'])->toBe('Cold open')
        ->and(WorkSection::query()->findOrFail($response['tempIds']['t-2'])->parent_id)->toBe($firstId);
});

it('renames, moves, and reorders without losing identity', function () {
    $act = outlineSection($this->work, ['title' => 'Act 1', 'label' => 'Act', 'position' => 1]);
    $a = outlineSection($this->work, ['title' => 'A', 'label' => 'Scene', 'parent_id' => $act->id, 'position' => 1]);
    $b = outlineSection($this->work, ['title' => 'B', 'label' => 'Scene', 'parent_id' => $act->id, 'position' => 2]);

    putOutline($this, ['rows' => [
        ['sectionId' => $act->id, 'tempId' => null, 'parentId' => null, 'depth' => 0, 'label' => 'Act', 'title' => 'Act 1', 'synopsis' => null, 'beats' => []],
        ['sectionId' => $b->id, 'tempId' => null, 'parentId' => $act->id, 'depth' => 1, 'label' => 'Scene', 'title' => 'B renamed', 'synopsis' => 'now first', 'beats' => []],
        ['sectionId' => $a->id, 'tempId' => null, 'parentId' => $act->id, 'depth' => 1, 'label' => 'Scene', 'title' => 'A', 'synopsis' => null, 'beats' => []],
    ]])->assertOk();

    expect($b->fresh()->title)->toBe('B renamed')
        ->and($b->fresh()->position)->toBeLessThan($a->fresh()->position)
        ->and($b->fresh()->id)->toBe($b->id);
});

it('blocks deleting a section with content unless forced', function () {
    $keeper = outlineSection($this->work, ['title' => 'Full', 'label' => 'Scene', 'position' => 1, 'content' => 'Words already written.']);

    $blocked = putOutline($this, ['rows' => [], 'deleted' => [$keeper->id]])->assertOk()->json('blocked');
    expect($blocked)->toBe([['sectionId' => $keeper->id, 'reason' => 'content']])
        ->and($keeper->fresh())->not->toBeNull();

    putOutline($this, ['rows' => [], 'deleted' => [$keeper->id], 'force' => [$keeper->id]])->assertOk();
    expect(WorkSection::query()->find($keeper->id))->toBeNull()
        ->and(WorkSection::withTrashed()->find($keeper->id))->not->toBeNull();
});

it('rejects a stale base version with 409 and the fresh projection', function () {
    outlineSection($this->work, ['title' => 'One', 'label' => 'Scene', 'position' => 1]);

    $response = putOutline($this, ['baseVersion' => '99:2020-01-01T00:00:00+00:00']);

    $response->assertStatus(409);
    expect($response->json('conflict'))->toBeTrue()
        ->and($response->json('rows'))->toBeArray();
});

it('rejects rows whose sectionId belongs to another work', function () {
    $foreignWork = Work::factory()->forProject($this->project)->create();
    $foreign = outlineSection($foreignWork, ['title' => 'Foreign', 'label' => 'Scene', 'position' => 1]);

    putOutline($this, ['rows' => [
        ['sectionId' => $foreign->id, 'tempId' => null, 'parentId' => null, 'depth' => 0, 'label' => 'Scene', 'title' => 'Hijack', 'synopsis' => null, 'beats' => []],
    ]])->assertStatus(422);
});

it('toggles a single beat by id', function () {
    $scene = outlineSection($this->work, ['title' => 'S', 'label' => 'Scene', 'position' => 1,
        'beats' => [['id' => 'b1', 'text' => 'One', 'done' => false], ['id' => 'b2', 'text' => 'Two', 'done' => false]]]);

    $this->actingAs($this->user)
        ->patchJson(route('works.sections.beats.toggle', [$this->project, $this->work, $scene->id, 'b2']), ['done' => true])
        ->assertOk();

    $beats = $scene->fresh()->beats;
    expect($beats[1]['done'])->toBeTrue()->and($beats[0]['done'])->toBeFalse();

    $this->actingAs($this->user)
        ->patchJson(route('works.sections.beats.toggle', [$this->project, $this->work, $scene->id, 'nope']), ['done' => true])
        ->assertNotFound();
});
```

- [ ] **Step 2: Run to verify failure:** `php artisan test --compact --filter=WorkOutlineController`.

- [ ] **Step 3: Implement.** Add to `WorkOutlineController` (validation via `$request->validate`, everything inside `DB::transaction`):

```php
public function update(Request $request, Project $project, Work $work): JsonResponse
{
    $data = $request->validate([
        'baseVersion' => ['required', 'string'],
        'force' => ['array'], 'force.*' => ['integer'],
        'deleted' => ['array'], 'deleted.*' => ['integer'],
        'rows' => ['array'],
        'rows.*.sectionId' => ['nullable', 'integer'],
        'rows.*.tempId' => ['nullable', 'string', 'max:64'],
        'rows.*.parentId' => ['nullable'],
        'rows.*.label' => ['nullable', 'string', 'max:50'],
        'rows.*.title' => ['required', 'string', 'max:255'],
        'rows.*.synopsis' => ['nullable', 'string', 'max:5000'],
        'rows.*.beats' => ['array'],
        'rows.*.beats.*.id' => ['required', 'string', 'max:64'],
        'rows.*.beats.*.text' => ['required', 'string', 'max:500'],
        'rows.*.beats.*.done' => ['boolean'],
    ]);
    $data['force'] ??= []; $data['deleted'] ??= []; $data['rows'] ??= [];

    $sections = $work->sections()->orderBy('position')->get();
    if ($this->version($sections) !== $data['baseVersion']) {
        return response()->json(['conflict' => true] + $this->projection($work), 409);
    }

    $known = $sections->keyBy('id');
    foreach ($data['rows'] as $row) {
        abort_if($row['sectionId'] !== null && ! $known->has($row['sectionId']), 422, 'Unknown section.');
        abort_if($row['sectionId'] === null && empty($row['tempId']), 422, 'New rows need a tempId.');
    }
    foreach ($data['deleted'] as $id) {
        abort_unless($known->has($id), 422, 'Unknown deleted id.');
    }

    [$tempIds, $blocked] = DB::transaction(function () use ($data, $known, $work): array {
        $tempIds = [];
        $positions = []; // parentKey => next position counter

        $resolveParent = function ($parentId) use (&$tempIds, $known) {
            if ($parentId === null) { return null; }
            if (is_int($parentId)) { abort_unless($known->has($parentId), 422, 'Unknown parent.'); return $parentId; }
            abort_unless(array_key_exists($parentId, $tempIds), 422, 'Forward tempId parent.');
            return $tempIds[$parentId];
        };

        foreach ($data['rows'] as $row) {
            $parentId = $resolveParent($row['parentId']);
            $position = $positions[$parentId ?? 0] = ($positions[$parentId ?? 0] ?? 0) + 1;
            $attrs = [
                'parent_id' => $parentId, 'position' => $position,
                'label' => $row['label'] ?? 'Scene', 'title' => $row['title'],
                'synopsis' => $row['synopsis'] ?? null, 'beats' => $row['beats'] ?? [],
            ];
            if ($row['sectionId'] === null) {
                $created = WorkSection::query()->create($attrs + ['work_id' => $work->id]);
                $tempIds[$row['tempId']] = $created->id;
            } else {
                $known->get($row['sectionId'])->update($attrs);
            }
        }

        $blocked = [];
        foreach ($data['deleted'] as $id) {
            $section = $known->get($id);
            $reason = $section->content !== null && trim((string) $section->content) !== '' ? 'content'
                : ($section->notes()->exists() ? 'notes'
                : ($section->comments()->exists() ? 'comments' : null));
            if ($reason !== null && ! in_array($id, $data['force'], true)) {
                $blocked[] = ['sectionId' => $id, 'reason' => $reason];
                continue;
            }
            $section->delete();
        }

        return [$tempIds, $blocked];
    });

    return response()->json($this->projection($work->fresh()) + ['tempIds' => $tempIds, 'blocked' => $blocked]);
}

public function toggleBeat(Request $request, Project $project, Work $work, int $section, string $beatId): JsonResponse
{
    $data = $request->validate(['done' => ['required', 'boolean']]);

    $model = WorkSection::query()->findOrFail($section);
    abort_unless($model->work_id === $work->id, 404);

    $beats = $model->beats ?? [];
    $found = false;
    foreach ($beats as $i => $beat) {
        if ($beat['id'] === $beatId) {
            $beats[$i]['done'] = $data['done'];
            $found = true;
            break;
        }
    }
    abort_unless($found, 404);

    $model->update(['beats' => $beats]);

    return response()->json(['beats' => $beats]);
}
```

Notes for the implementer: `HasNotes` supplies `notes()`; `comments()` exists on the model. `use Illuminate\Http\Request;` + `use Illuminate\Support\Facades\DB;`. Rows omitted from `rows` but not listed in `deleted` are LEFT UNTOUCHED (partial payloads are legal — the ghost layer sends single-row payloads with only that row present; verify the loop semantics allow this: they do, since only listed rows are written and positions restart per parent — **because of that, single-row ghost saves must send `parentId` and rely on… no.** STOP: partial payloads would corrupt positions. Resolution (spec-conformant): the ghost layer's synopsis save sends the FULL current row set (it has it from the outline GET/props). Enforce in Task 6, and note here: `rows` is always the complete surviving tree; sections in neither `rows` nor `deleted` are a 422 (`'Row set incomplete.'`) — add that check after the known-id loop:

```php
$accounted = collect($data['rows'])->pluck('sectionId')->filter()->merge($data['deleted']);
abort_unless($known->keys()->diff($accounted)->isEmpty(), 422, 'Row set incomplete.');
```

Routes:

```php
Route::put('/{work:slug}/outline', [WorkOutlineController::class, 'update'])
    ->name('works.outline.update')
    ->middleware('can:update,work');
Route::patch('/{work:slug}/sections/{section}/beats/{beatId}', [WorkOutlineController::class, 'toggleBeat'])
    ->name('works.sections.beats.toggle')
    ->middleware('can:update,work');
```

- [ ] **Step 4: Run to verify pass:** `php artisan test --compact --filter=WorkOutlineController` (all Task 2+3 tests).

- [ ] **Step 5: Run the neighboring suites to catch regressions:** `php artisan test --compact --filter=WorkSection`.

- [ ] **Step 6: Commit:**

```bash
cd C:/Websites/alexandria/alexandria-app && vendor/bin/pint --dirty --format agent && git add app/Http/Controllers/Writing/WorkOutlineController.php routes/web.php tests/Feature/Writing/WorkOutlineControllerTest.php && git commit -m "feat(outline): transactional bulk outline apply + beat toggle"
```

---

### Task 4: Outline TS domain — types, paste parser, payload builder

**Files:**
- Create: core `resources/js/pages/Writing/Outline/outlineTypes.ts`
- Create: core `resources/js/pages/Writing/Outline/parseOutlinePaste.ts`
- Create: core `resources/js/pages/Writing/Outline/outlinePayload.ts`
- Test: app `resources/js/editor/tests/outline-parse.test.ts`, `outline-payload.test.ts` (import via `@alexandria/pages/Writing/Outline/...`)

**Interfaces:**
- Produces:

```ts
// outlineTypes.ts
export interface OutlineBeat { id: string; text: string; done: boolean }
export interface OutlineRow {
    key: string;                 // stable client key: `s-${sectionId}` or the tempId
    sectionId: number | null;
    tempId: string | null;
    parentKey: string | null;    // client-side tree by key
    depth: number;
    label: string;
    title: string;
    synopsis: string | null;
    beats: OutlineBeat[];
}
export interface OutlineProjection { rows: ServerOutlineRow[]; baseVersion: string }
export interface ServerOutlineRow { sectionId: number; parentId: number | null; depth: number;
    label: string; title: string; synopsis: string | null; beats: OutlineBeat[] }

// parseOutlinePaste.ts
export interface ParsedOutlineLine { depth: number; title: string; synopsis: string | null }
export function parseOutlinePaste(text: string): ParsedOutlineLine[]

// outlinePayload.ts
export function rowsFromProjection(projection: OutlineProjection): OutlineRow[]
export function buildOutlinePayload(rows: OutlineRow[], deleted: number[], force: number[], baseVersion: string): object
export function reconcileTempIds(rows: OutlineRow[], tempIds: Record<string, number>): OutlineRow[]
```

- [ ] **Step 1: Write the failing Vitest specs:**

```ts
// outline-parse.test.ts
import { describe, expect, it } from 'vitest';
import { parseOutlinePaste } from '@alexandria/pages/Writing/Outline/parseOutlinePaste';

describe('parseOutlinePaste', () => {
    it('parses depth from tabs and 2-space groups, splitting synopsis on em/en dashes', () => {
        const text = 'Act 1\n\tThe Guild Briefing — Zeal is named\n\t\tAll nine pulsed\n  Two-space scene - dash synopsis';
        expect(parseOutlinePaste(text)).toEqual([
            { depth: 0, title: 'Act 1', synopsis: null },
            { depth: 1, title: 'The Guild Briefing', synopsis: 'Zeal is named' },
            { depth: 2, title: 'All nine pulsed', synopsis: null },
            { depth: 1, title: 'Two-space scene', synopsis: 'dash synopsis' },
        ]);
    });

    it('skips blank lines, never throws on garbage, strips list markers', () => {
        expect(parseOutlinePaste('\n- bullet item\n* star item\n\n')).toEqual([
            { depth: 0, title: 'bullet item', synopsis: null },
            { depth: 0, title: 'star item', synopsis: null },
        ]);
        expect(parseOutlinePaste('')).toEqual([]);
    });

    it('does not treat hyphenated words as synopsis splits', () => {
        expect(parseOutlinePaste('Twelve-cycle leader')).toEqual([
            { depth: 0, title: 'Twelve-cycle leader', synopsis: null },
        ]);
    });
});
```

```ts
// outline-payload.test.ts
import { describe, expect, it } from 'vitest';
import { buildOutlinePayload, reconcileTempIds, rowsFromProjection } from '@alexandria/pages/Writing/Outline/outlinePayload';

const projection = {
    baseVersion: '2:2026-08-28T00:00:00+00:00',
    rows: [
        { sectionId: 1, parentId: null, depth: 0, label: 'Act', title: 'Act 1', synopsis: null, beats: [] },
        { sectionId: 2, parentId: 1, depth: 1, label: 'Scene', title: 'S', synopsis: 'x', beats: [{ id: 'b1', text: 't', done: false }] },
    ],
};

describe('outline payload round trip', () => {
    it('maps projection to client rows with stable keys and parentKeys', () => {
        const rows = rowsFromProjection(projection);
        expect(rows[1]).toMatchObject({ key: 's-2', parentKey: 's-1', sectionId: 2, depth: 1 });
    });

    it('serializes rows back with tempIds for new rows and resolves parent references', () => {
        const rows = rowsFromProjection(projection);
        rows.push({ key: 't-1', sectionId: null, tempId: 't-1', parentKey: 's-2', depth: 2, label: 'Scene', title: 'New', synopsis: null, beats: [] });
        const payload = buildOutlinePayload(rows, [], [], projection.baseVersion) as { rows: Array<{ parentId: unknown; tempId: string | null }> };
        expect(payload.rows[2].parentId).toBe(2);
        expect(payload.rows[2].tempId).toBe('t-1');
    });

    it('reconciles tempIds into real section ids', () => {
        const rows = reconcileTempIds(
            [{ key: 't-1', sectionId: null, tempId: 't-1', parentKey: null, depth: 0, label: 'Scene', title: 'New', synopsis: null, beats: [] }],
            { 't-1': 42 },
        );
        expect(rows[0]).toMatchObject({ sectionId: 42, tempId: null, key: 's-42' });
    });
});
```

- [ ] **Step 2: Run to verify failure:** from `alexandria-app`: `npm run test:run -- outline` — modules not found.

- [ ] **Step 3: Implement the three modules.** Parser rules (all in `parseOutlinePaste.ts`): split on `\n`; skip blank/whitespace lines; depth = number of leading tabs, else `floor(leadingSpaces / 2)`; strip leading `- ` / `* ` list markers after de-indenting; synopsis split on the FIRST ` — `, ` – `, or ` - ` (space-dash-space only — never bare hyphens); trim both halves; empty synopsis → null. `buildOutlinePayload` maps `parentKey` → the referenced row's `sectionId` if set, else its `tempId` (rows are serialized in array order, parents must precede children — the view maintains that invariant). `rowsFromProjection` key: `s-${sectionId}`; `reconcileTempIds` swaps ids and rewrites dependent `parentKey`s (`t-x` → `s-42`).

- [ ] **Step 4: Run to verify pass:** `npm run test:run -- outline`.

- [ ] **Step 5: Commit (core):**

```bash
cd C:/Websites/alexandria/alexandria-core && git add resources/js/pages/Writing/Outline && git commit -m "feat(outline): outline row types, paste parser, payload builder"
cd C:/Websites/alexandria/alexandria-app && git add resources/js/editor/tests/outline-parse.test.ts resources/js/editor/tests/outline-payload.test.ts && git commit -m "test(outline): parser + payload vitest coverage"
```

---

### Task 5: OutlineView pane + sync hook + view-mode wiring

**Files:**
- Create: core `resources/js/pages/Writing/Outline/useOutlineSync.ts`
- Create: core `resources/js/pages/Writing/Outline/OutlineView.tsx`
- Modify: core `resources/js/pages/Writing/Flow/viewMode.ts` (widen union)
- Modify: core `resources/js/pages/Writing/Workspace.tsx` (render branch + FlowToggle/ribbon)
- Modify: core `resources/js/pages/Writing/ribbon/writingRibbonTabs.tsx` (View tab: outline view control)
- Modify: core `lang/en/writing.php` (+ keys) and the frontend translation catalog the writing pages use (find where `writing.ribbon.*` keys live and add siblings)
- Test: app `resources/js/editor/tests/outline-view.test.ts` (behavioral pieces that don't need DOM: key-handling reducer)

**Interfaces:**
- Consumes: Task 4 modules; Task 2/3 endpoints; `worksBase(projectSlug, workSlug)`; `readViewMode/writeViewMode` from `Flow/viewMode.ts`.
- Produces: `useOutlineSync({ projectSlug, workSlug }): { rows, setRows, deleteRow, forceDelete, status, blocked, reload }` with `status: 'idle'|'dirty'|'saving'|'saved'|'error'|'conflict'` and an 800ms idle debounce + flush-on-unmount (model the lifecycle on `useSectionAutosave.ts` — read it first); `<OutlineView projectSlug workSlug canUpdate onNavigate(slug) />`; `WorkspaceViewMode = 'continuous' | 'focus' | 'outline'`.

- [ ] **Step 1: Extract the keyboard/structure logic as a pure reducer** so it's testable without DOM: `outlineReducer(rows, action)` in `OutlineView.tsx`'s sibling `outlineReducer.ts` with actions `{type:'enter', key}`, `{type:'indent', key}`, `{type:'outdent', key}`, `{type:'move', key, dir}`, `{type:'edit', key, title, synopsis}`, `{type:'paste', anchorKey, lines: ParsedOutlineLine[]}`, `{type:'toggle-beat', key, beatId}`, `{type:'delete', key}`. Indent converts a row to a beat of the previous section row when its depth would exceed the deepest section depth AND the row has no `sectionId` with content (rows with real sections + content refuse beat-conversion: return state unchanged with a `blockedHint` flag). Paste inserts parsed lines relative to the anchor row's depth; lines deeper than the work's deepest section depth become beats of their nearest ancestor line.

- [ ] **Step 2: Write failing reducer tests** (`outline-view.test.ts`): Enter creates a sibling with same depth/label and a fresh tempId; Tab under a Scene converts a contentless row to a beat; Shift-Tab promotes a beat to a Scene row (new tempId, beat removed from parent); paste of three parsed lines under an Act anchor produces two Scene rows + one beat; move swaps siblings only. Use compact literal row fixtures.

- [ ] **Step 3: Run to verify failure**, then implement the reducer, then verify pass:** `npm run test:run -- outline-view`.

- [ ] **Step 4: Implement `useOutlineSync`.** GET on mount → `rowsFromProjection`; `setRows` marks dirty; debounce 800ms → `buildOutlinePayload` → PUT with local `apiHeaders(true)` (copy the CommentRail helper); on 200 → `reconcileTempIds`, store new `baseVersion`, status `saved`, surface `blocked`; on 409 → status `conflict`, keep local edits for title/synopsis of surviving keys, adopt server structure, re-mark dirty; on error → status `error`, retry on next change. Flush pending save on unmount.

- [ ] **Step 5: Implement `OutlineView.tsx`.** Render rows as indented editable lines (title `contentEditable={false}` — use controlled `<input>`/`<textarea autosize>` styled borderless to match the desk paper theme); muted ` — synopsis` inline input; beat sub-rows with a round check control (PATCH immediately via the beats endpoint for existing sections, reducer-only for temp rows); key handlers dispatch reducer actions; paste handler intercepts multi-line clipboard text → `parseOutlinePaste` → `{type:'paste'}`; a slim save-status chip (reuse the wording keys of `SaveStatus`); blocked-delete rows render an inline confirm ("has content — delete anyway?") that calls `forceDelete(key)`. Strings via the writing translation mechanism — no inline English.

- [ ] **Step 6: Wire the view mode.** `viewMode.ts`: widen the union + `normalize` guard to accept `'outline'`. `Workspace.tsx`: render `<OutlineView …/>` when `viewMode === 'outline'` (chrome stays visible like continuous mode: `chromeVisible = viewMode !== 'focus'`); extend `FlowToggle` with a third segment (read `FlowToggle`'s current two-segment markup and match it); add a View-tab ribbon control in `writingRibbonTabs.tsx` mirroring the `print-layout` toggle shape with `active: (ctx) => ctx.viewMode === 'outline'`, `onAction: (ctx) => ctx.actions.setViewMode(ctx.viewMode === 'outline' ? 'continuous' : 'outline')` — thread `viewMode`/`setViewMode` through the ribbon ctx the same way existing ctx fields are threaded (read the ctx type in `writingRibbonTabs.tsx` top).
- On entering outline view, `OutlineView` reloads the projection (fresh `baseVersion`); on leaving, flush.

- [ ] **Step 7: Type-check + build:** from `alexandria-app`: `npx tsc --noEmit` (or the repo's `npm run types` if present) and `npm run build`. Fix errors.

- [ ] **Step 8: Commit (core):**

```bash
cd C:/Websites/alexandria/alexandria-core && git add resources/js/pages/Writing lang && git commit -m "feat(outline): full-pane outline view, sync hook, third view mode"
cd C:/Websites/alexandria/alexandria-app && git add resources/js/editor/tests/outline-view.test.ts && git commit -m "test(outline): reducer coverage"
```

---

### Task 6: Ghost Layer plan blocks

**Files:**
- Create: core `resources/js/pages/Writing/Outline/PlanBlock.tsx`
- Create: core `resources/js/pages/Writing/Outline/planPrefs.ts`
- Modify: core `resources/js/pages/Writing/Sections/ManuscriptEditor.tsx` (mount inside `SectionChrome`, above `<RichTextEditor>`)
- Modify: core `resources/js/pages/Writing/Flow/FlowSection.tsx` (mount after the `data-flow-section-title` heading, before the editor branch)
- Modify: core `resources/js/pages/Writing/Workspace.tsx` (thread `showPlan` + section beats into both mounts; `CurrentSection` type gains `beats: OutlineBeat[]`)
- Modify: core `resources/js/pages/Writing/ribbon/writingRibbonTabs.tsx` (View tab "Show plan" toggle)
- Modify: core `lang/en/writing.php` (+ `plan.*` keys)
- Test: app `resources/js/editor/tests/plan-block.test.ts` (collapse logic as a pure function)

**Interfaces:**
- Consumes: `CurrentSection.beats` (server payload from Task 1 — confirm `WorkController@show` / `SectionTreeService::payload()` delivers it to the page props; it does after Task 1), beats PATCH endpoint, `planPrefs` (`readShowPlan(): boolean` / `writeShowPlan(bool)`, localStorage key `alexandria.writing.show-plan`, default `true`).
- Produces: `<PlanBlock section={{id, synopsis, beats}} projectSlug workSlug canUpdate onSynopsisEdit? />` and pure helper `planCollapsed(beats: OutlineBeat[]): boolean` (true iff `beats.length > 0` and every beat done).

- [ ] **Step 1: Failing Vitest for the pure bits** (`plan-block.test.ts`): `planCollapsed` truth table (empty → false; mixed → false; all done → true); prefs read/write round-trip with a stubbed localStorage that also throws (must not crash, returns default).

- [ ] **Step 2: Implement `planPrefs.ts` + `planCollapsed` + verify pass:** `npm run test:run -- plan-block`.

- [ ] **Step 3: Implement `PlanBlock.tsx`.** Render nothing when (!synopsis && beats.length === 0) or pref off. Dimmed block styled with the desk's muted tokens (read how `SectionChrome`/FlowSection style muted text and match): synopsis paragraph (click → inline textarea when `canUpdate`; save via the outline PUT carrying the full current row set is NOT available here — instead call the existing `works.sections.update` route (`PUT …/sections/{section}`) with `{synopsis}` which already validates it; that is the section's existing update path and spec-conformant since it edits only this row's synopsis field);

> NOTE — spec deviation, pre-approved resolution: the spec says ghost synopsis saves "via the outline PUT carrying only that section's row", but Task 3 locked full-row-set semantics for the PUT. `works.sections.update` is the correct lighter path; it existed before this feature and validates synopsis identically. Record this in the ledger as a spec-vs-plan resolution, no owner interrupt needed (the spec's own intent was "no new endpoint").

  beats as a checklist (`done` strikethrough, tap → PATCH `works.sections.beats.toggle`, optimistic with revert on error); all-done → collapsed single line `t('writing.plan.done_line')` with count, click expands (local state).

- [ ] **Step 4: Mount it.** `ManuscriptEditor.tsx`: inside `<SectionChrome>` before `<RichTextEditor>`, `{showPlan && <PlanBlock section={section} …/>}` — add `showPlan?: boolean` + pass-throughs to `ManuscriptEditorProps`. `FlowSection.tsx`: after the `<h3 data-flow-section-title…>` and before the `{showEditor ? …}` branch; the flow's hydrated `section` (`CurrentSection | null`) carries beats when hydrated — render only when hydrated. `Workspace.tsx`: `const [showPlan, setShowPlan] = useState(readShowPlan)`; thread to both editors + ContinuousFlow (add a pass-through prop mirroring how `printLayout` flows — read those paths and copy them); ribbon View-tab toggle `show-plan` mirrors `print-layout` exactly (`active: ctx.showPlan`, action toggles + `writeShowPlan`).

- [ ] **Step 5: Type-check + build:** `npx tsc --noEmit` && `npm run build` from the app. Manually verify in the browser is deferred to Task 8's smoke; still do a quick `npm run dev` sanity load of a work if a dev server is already running.

- [ ] **Step 6: Commit (core + app test):**

```bash
cd C:/Websites/alexandria/alexandria-core && git add resources/js/pages/Writing lang && git commit -m "feat(outline): ghost plan blocks in manuscript + flow"
cd C:/Websites/alexandria/alexandria-app && git add resources/js/editor/tests/plan-block.test.ts && git commit -m "test(outline): plan block collapse + prefs"
```

---

### Task 7: Sidebar outline mode

**Files:**
- Create: core `resources/js/pages/Writing/Outline/OutlineSidebar.tsx`
- Modify: core `resources/js/pages/Writing/Sections/PanelModeSwitcher.tsx` (4th built-in)
- Modify: core `resources/js/pages/Writing/Workspace.tsx` (render branch `panelMode === 'outline'`)
- Modify: core `resources/js/pages/Writing/panelMode.ts` (include `'outline'` in the normalize allow-list of built-ins)
- Modify: core `lang/en/writing.php`
- Test: app `resources/js/editor/tests/panel-mode.test.ts` (extend existing — `normalizePanelMode('outline')` survives)

**Interfaces:**
- Consumes: the outline GET, `worksBase`, beats PATCH, `onSelect(slug)` navigation callback already used by Navigator, `planCollapsed`.
- Produces: `<OutlineSidebar projectSlug workSlug currentSectionId canUpdate onNavigate />` — read-mostly: indented rows (title + muted synopsis first line), beat check-off dots (PATCH-wired), click row → `onNavigate(slug)`; NO structural editing. Refreshes on mount and when `editorTick`-equivalent props change (match how `SidebarNotesPanel` refreshes — read it).

- [ ] **Step 1: Extend `panel-mode.test.ts`** with `'outline'` as a valid built-in; run, watch fail, update `panelMode.ts`, pass.
- [ ] **Step 2: Implement `OutlineSidebar` + switcher entry** (icon `fa-solid fa-list-tree` or the closest FA the project ships — check existing icon usage; labelKey `writing.outline.sidebar_label`). Note: the outline GET does not return slugs — extend the Task 2 projection rows with `'slug' => $section->slug` (add to controller + its test expectations; it's one line each) so navigation works.
- [ ] **Step 3: Type-check + build + vitest:** `npm run test:run -- panel-mode` and `npx tsc --noEmit`.
- [ ] **Step 4: Commit** (core + app tests, message `feat(outline): read-mostly sidebar outline mode`).

---

### Task 8: Browser smoke test

**Files:**
- Create: app `tests/Browser/Writing/OutlineModeTest.php` (model setup/auth on `tests/Browser/Writing/ContinuousFlowTest.php` — read it first and copy its idioms exactly)

- [ ] **Step 1: Write the smoke:** one test that (a) visits a work, switches to outline view via the FlowToggle third segment, (b) types a new scene title + Tab-indents a beat under it, waits for the saved status chip, (c) asserts the Navigator (after switching back to continuous) shows the new scene, (d) asserts the ghost block renders the beat in the flow, (e) checks the beat off and asserts strikethrough, (f) opens sidebar outline mode and asserts the row + checked beat render.
- [ ] **Step 2: Run:** `php artisan test --compact tests/Browser/Writing/OutlineModeTest.php` (requires built assets — run `npm run build` first).
- [ ] **Step 3: Commit** (`test(outline): browser smoke for outline mode + ghost layer`).

---

### Task 9: Full verification + docs closeout

- [ ] **Step 1:** App: `php artisan test --compact` (full), `npm run test:run` (full vitest), `npx tsc --noEmit`, `vendor/bin/pint --format agent`, `npm run build`.
- [ ] **Step 2:** Update `alexandria-app/docs/REMAINING-ROADMAP.md`: add a one-line ✅ under Stage 11 follow-ups ("Outline Mode + Ghost Layer shipped <date>, spec in core docs/superpowers/specs/2026-08-28").
- [ ] **Step 3:** Commit docs; report branch state for owner review (NO merge to main — owner reviews live first per visual-checkpoint doctrine).

## Self-review notes (already applied)

- Spec coverage: every spec section maps to a task (data → 1; GET/PUT/PATCH → 2-3; pane+paste → 4-5; ghost → 6; sidebar → 7; tests → 1-8; error handling → 3 (409/guard) + 5 (conflict/retry)). The spec's ghost-synopsis-save line is resolved in Task 6's NOTE (uses the pre-existing `works.sections.update` — spec's intent "no new endpoint" holds).
- Type consistency: `OutlineBeat`/`OutlineRow`/`ServerOutlineRow` names used consistently across Tasks 4-7; endpoint names `works.outline.show|update`, `works.sections.beats.toggle` consistent across 2-3-6-7.
- The projection gains `slug` in Task 7 — Task 2's test asserts titles/depths only, so no cross-task breakage; Task 7 updates the endpoint test.
