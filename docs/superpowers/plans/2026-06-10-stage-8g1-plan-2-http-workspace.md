# Stage 8g.1 Plan 2 — HTTP Layer + Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make works usable end-to-end: app-side authorization (`work.*` permissions + `WorkPolicy`), works/sections controllers + `/works/{project}/{work}/{section?}` routes, and the core workspace UI — works index, Navigator tree, manuscript editor with autosave.

**Architecture:** Per the spec + amendments: core ships models/services/pages; **alexandria-app ships routes, controllers, policies, permission seeds, and HTTP tests** (the Entry-module wiring, cloned). The workspace is one Inertia page; section switching uses partial reloads (`only: ['currentSection']`) with `preserveState` so the URL updates and content loads on demand without losing Navigator state. Content saves via a debounced JSON `PUT` (fetch), returning fresh counts.

**Tech Stack:** Laravel 13 app (Pest 4, Postgres local/SQLite tests) + alexandria-core path repo. React 19 + Inertia v3 + TS + theme tokens. Wiki-markup content (Plan 1 analyzer).

**Repos/branches:** `alexandria-core` → existing `feat/8g1-writing-dashboard`. `alexandria-app` → NEW branch `feat/8g1-writing-dashboard` off `main`.

**Verified wiring facts (do not re-derive):**
- Policies bind in `app/Providers/AppServiceProvider.php` (~line 267): `Gate::policy(Entry::class, EntryPolicy::class);` etc.
- Coarse project permissions: defined in `database/seeders/ProjectPermissionSeeder.php` (`PERMISSIONS` const → `project-access`/`project-content` categories), attached to the four role templates in `database/seeders/ProjectRoleTemplateSeeder.php` (`TEMPLATES` const: Owner, Editor, Collaborator, Viewer).
- `EntryPolicy::hasSpatie(User, Project, string)` is the team-scoped Spatie check to clone (sets `PermissionRegistrar` team id, unsets cached relations, restores).
- Entry routes pattern: `Route::middleware(['auth', 'verified'])` + `{project:slug}` implicit slug bindings + `->middleware('can:update,entry')`.
- Laravel auto-scopes nested custom-key bindings via the pluralized relationship — `{project:slug}/{work:slug}` requires a `works()` HasMany on core's `Project` model.
- Shared lang groups live in `app/Http/Middleware/HandleInertiaRequests.php::resolveSharedTranslations()` — each group merges `alexandria::<group>` + app `<group>`.
- `useT` requires FLAT dot-string keys in lang files (see core `lang/en/editor.php`).
- App test conventions: `tests/Feature/...`, Pest, `RefreshDatabase` via Pest.php; controller-behavior suites commonly use `Gate::before(fn () => true)` in `beforeEach` (see `tests/Feature/EntryThemeUpdateTest.php`); authorization-specific tests arrange real project roles — **mirror the arrange used in `tests/Feature/Security/` suites** (find one that grants a project role template to a member and copy it exactly).
- Core editor: `RichTextEditor` (`components/editor/RichTextEditor.tsx`) takes `value` (wiki string), `onChange` (300ms debounced), `enableEntryLinks`, `projectId`. Layout: `AppLayout` with `immersive`. Fetch-with-CSRF precedent for JSON writes: `alexandria-app/resources/js/lib/EasterEggBridge.tsx`.

---

## File Structure

```
alexandria-app/  (branch feat/8g1-writing-dashboard)
├── database/seeders/ProjectPermissionSeeder.php        # MODIFY: + work.* permission rows
├── database/seeders/ProjectRoleTemplateSeeder.php      # MODIFY: + work.* in role templates
├── app/Policies/WorkPolicy.php                         # CREATE
├── app/Providers/AppServiceProvider.php                # MODIFY: Gate::policy(Work::class, ...)
├── app/Http/Middleware/HandleInertiaRequests.php       # MODIFY: + 'writing' lang group
├── app/Http/Controllers/Writing/WorkController.php     # CREATE: index/store/show/update/destroy
├── app/Http/Controllers/Writing/WorkSectionController.php  # CREATE: store/update/updateContent/move/reorder/destroy
├── routes/web.php                                      # MODIFY: /works/... group
└── tests/Feature/Writing/
    ├── WorkPolicyTest.php                              # CREATE: real-role authorization
    ├── WorkControllerTest.php                          # CREATE
    └── WorkSectionControllerTest.php                   # CREATE

alexandria-core/  (branch feat/8g1-writing-dashboard)
├── src/Models/Framework/Project.php                    # MODIFY: + works() HasMany
├── src/Services/Writing/SectionTreeService.php         # MODIFY: + deleteSubtree()
├── src/Services/Writing/WorkSectionContentService.php  # MODIFY: refreshWorkRollup → public
├── lang/en/writing.php                                 # CREATE: flat keys
├── resources/js/pages/Writing/Index.tsx                # CREATE: project works list + create modal
├── resources/js/pages/Writing/Workspace.tsx            # CREATE: 3-pane shell (panel placeholder until Plan 3)
├── resources/js/pages/Writing/Sections/Navigator.tsx   # CREATE: tree + select/add/delete
├── resources/js/pages/Writing/Sections/ManuscriptEditor.tsx  # CREATE: editor + autosave + counts
└── tests/Feature/Writing/WorkSectionTreeTest.php       # MODIFY: deleteSubtree tests
```

---

### Task 1 (app): Branch + `work.*` permissions + WorkPolicy + lang share

**Files:**
- Modify: `database/seeders/ProjectPermissionSeeder.php`, `database/seeders/ProjectRoleTemplateSeeder.php`, `app/Providers/AppServiceProvider.php`, `app/Http/Middleware/HandleInertiaRequests.php`
- Create: `app/Policies/WorkPolicy.php`
- Test: `tests/Feature/Writing/WorkPolicyTest.php`

- [ ] **Step 0: Create the app branch**

```bash
cd C:\Websites\alexandria\alexandria-app
git checkout main && git pull
git checkout -b feat/8g1-writing-dashboard
```

- [ ] **Step 1: Write the failing policy test**

First open one `tests/Feature/Security/` suite that grants a **project role template** to a member and note the exact arrange (team-id handling, role assignment, cache resets). Then write `tests/Feature/Writing/WorkPolicyTest.php` using THAT arrange verbatim. The behavioral cases:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use App\Models\User;

// Arrange helpers: copy the project-role-grant arrange from tests/Feature/Security/*.
// Each test below assumes a seeded permission catalog + role templates
// (ProjectPermissionSeeder, ProjectRoleTemplateSeeder, RolePermissionCategorySeeder).

it('lets a Viewer view works but not update them', function () {
    // arrange: $viewer is a member with the Viewer template on $project
    // $work = Work::factory()->forProject($project)->create();
    expect($viewer->can('view', $work))->toBeTrue()
        ->and($viewer->can('update', $work))->toBeFalse();
});

it('lets a Collaborator create and update works but not delete', function () {
    expect($collaborator->can('create', [Work::class, $project]))->toBeTrue()
        ->and($collaborator->can('update', $work))->toBeTrue()
        ->and($collaborator->can('delete', $work))->toBeFalse();
});

it('lets an Editor delete works', function () {
    expect($editor->can('delete', $work))->toBeTrue();
});

it('denies everything to a non-member', function () {
    expect($outsider->can('view', $work))->toBeFalse()
        ->and($outsider->can('update', $work))->toBeFalse();
});
```

(The commented arrange lines are intent, not literal — replace with the discovered Security-suite pattern. If no such suite exists, report NEEDS_CONTEXT with what you found.)

- [ ] **Step 2: Run it — expect failure** (`php artisan test --compact --filter=WorkPolicy`)

- [ ] **Step 3: Extend the permission seeders**

`ProjectPermissionSeeder::PERMISSIONS` — append after the `entry.forceDelete` row:

```php
[
    'name' => 'work.view',
    'description' => 'View written works (novels, screenplays, essays) within the project.',
    'category_slug' => 'project-content',
    'sort_order' => 100,
],
[
    'name' => 'work.create',
    'description' => 'Create new written works in the project.',
    'category_slug' => 'project-content',
    'sort_order' => 110,
],
[
    'name' => 'work.edit',
    'description' => 'Edit works: structure, sections, and manuscript content.',
    'category_slug' => 'project-content',
    'sort_order' => 120,
],
[
    'name' => 'work.delete',
    'description' => 'Delete works and their sections (soft delete).',
    'category_slug' => 'project-content',
    'sort_order' => 130,
],
```

`ProjectRoleTemplateSeeder::TEMPLATES` — extend each `permissions` list:
- Owner: + `work.view`, `work.create`, `work.edit`, `work.delete`
- Editor: + `work.view`, `work.create`, `work.edit`, `work.delete`
- Collaborator: + `work.view`, `work.create`, `work.edit`
- Viewer: + `work.view`

- [ ] **Step 4: Create `app/Policies/WorkPolicy.php`** (clone EntryPolicy's `hasSpatie` verbatim — same registrar dance):

```php
<?php

namespace App\Policies;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use App\Models\User;
use Spatie\Permission\PermissionRegistrar;

/**
 * Works use the coarse project-scoped Spatie permissions only —
 * no per-object ACL layer (unlike entries). Grants come from the
 * project role templates: work.view / work.create / work.edit /
 * work.delete.
 */
class WorkPolicy
{
    public function view(User $user, Work $work): bool
    {
        return $this->hasSpatie($user, $work->project, 'work.view');
    }

    public function create(User $user, Project $project): bool
    {
        return $this->hasSpatie($user, $project, 'work.create');
    }

    public function update(User $user, Work $work): bool
    {
        return $this->hasSpatie($user, $work->project, 'work.edit');
    }

    public function delete(User $user, Work $work): bool
    {
        return $this->hasSpatie($user, $work->project, 'work.delete');
    }

    /**
     * Same stale-relation guard as EntryPolicy::hasSpatie.
     */
    private function hasSpatie(User $user, Project $project, string $permission): bool
    {
        /** @var PermissionRegistrar $registrar */
        $registrar = app(PermissionRegistrar::class);
        $prev = $registrar->getPermissionsTeamId();

        try {
            $registrar->setPermissionsTeamId($project->id);
            $user->unsetRelation('roles');
            $user->unsetRelation('permissions');

            return $user->can($permission);
        } finally {
            $registrar->setPermissionsTeamId($prev);
        }
    }
}
```

- [ ] **Step 5: Register policy + lang group**

`AppServiceProvider` (beside the existing `Gate::policy` calls): `Gate::policy(Work::class, WorkPolicy::class);` (+ imports). `HandleInertiaRequests::resolveSharedTranslations()`: add `'writing' => $this->loadGroup('writing'),`.

- [ ] **Step 6: Run tests to green** (`php artisan test --compact --filter=WorkPolicy`), then the FULL app suite (`php artisan test --compact`) — the seeder change must not break Security suites.

- [ ] **Step 7: Pint + commit** (controller commits)

---

### Task 2 (core): Project::works() + deleteSubtree + public rollup + lang

**Files:**
- Modify: `src/Models/Framework/Project.php`, `src/Services/Writing/SectionTreeService.php`, `src/Services/Writing/WorkSectionContentService.php`
- Create: `lang/en/writing.php`
- Test: `tests/Feature/Writing/WorkSectionTreeTest.php` (append)

- [ ] **Step 1: Append failing tests** to `WorkSectionTreeTest.php`:

```php
it('soft-deletes a section together with its descendants and refreshes the rollup', function () {
    $work = Work::factory()->create();
    $parent = WorkSection::factory()->create(['work_id' => $work->id, 'word_count' => 5]);
    $child = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id, 'word_count' => 7]);
    $sibling = WorkSection::factory()->create(['work_id' => $work->id, 'word_count' => 3]);
    $work->update(['word_count' => 15]);

    app(SectionTreeService::class)->deleteSubtree($parent);

    expect(WorkSection::query()->find($parent->id))->toBeNull()
        ->and(WorkSection::query()->find($child->id))->toBeNull()
        ->and(WorkSection::withTrashed()->find($child->id))->not->toBeNull()
        ->and($sibling->fresh())->not->toBeNull()
        ->and($work->fresh()->word_count)->toBe(3);
});

it('exposes works on the project for scoped route binding', function () {
    $work = Work::factory()->create();

    expect($work->project->works->pluck('id')->all())->toBe([$work->id]);
});
```

- [ ] **Step 2: Implement**

`Project.php` — add relation (+ docblock `@property-read` line + `use Alexandria\Core\Models\Writing\Work;` import, matching the file's relation style):

```php
public function works(): HasMany
{
    return $this->hasMany(Work::class);
}
```

`SectionTreeService.php` — add (+ `use Throwable;` if pint demands the @throws import):

```php
/**
 * Soft-delete a section and every descendant, then refresh the
 * work's cached word count. Descendants are collected breadth-first
 * over the live tree.
 *
 * @throws Throwable transaction failures bubble to the caller
 */
public function deleteSubtree(WorkSection $section): void
{
    DB::transaction(function () use ($section): void {
        $ids = [$section->id];
        $frontier = [$section->id];

        while ($frontier !== []) {
            $frontier = WorkSection::query()
                ->whereIn('parent_id', $frontier)
                ->pluck('id')
                ->all();
            $ids = [...$ids, ...$frontier];
        }

        WorkSection::query()->whereIn('id', $ids)->get()->each->delete();

        app(WorkSectionContentService::class)->refreshWorkRollup($section->work_id);
    });
}
```

`WorkSectionContentService.php` — change `private function refreshWorkRollup` to `public function refreshWorkRollup` (no other change).

- [ ] **Step 3: Create `lang/en/writing.php`** — FLAT dot keys (useT requirement), `declare(strict_types=1);`:

```php
<?php

declare(strict_types=1);

/*
 * Writing dashboard strings (Stage 8g.1). FLAT dot-string keys on
 * purpose: useT() resolves t('writing.x.y') as a literal 'x.y'
 * lookup inside the group bag.
 */
return [
    'index.title' => 'Writing',
    'index.intro' => 'The manuscripts of this project: novels, screenplays, essays, and everything between.',
    'index.create' => 'New work',
    'index.empty' => 'Nothing here yet. Start your first work.',
    'index.words' => ':count words',
    'index.sections' => ':count sections',
    'index.updated' => 'Updated :date',

    'form.create_title' => 'Start a new work',
    'form.title' => 'Title',
    'form.type' => 'Type',
    'form.logline' => 'Logline (optional)',
    'form.logline_help' => 'One sentence that captures the core of the work.',
    'form.create' => 'Create',
    'form.cancel' => 'Cancel',

    'types.novel' => 'Novel',
    'types.screenplay' => 'Screenplay',
    'types.stage_play' => 'Stage play',
    'types.short_story' => 'Short story',
    'types.essay' => 'Essay',
    'types.other' => 'Other',

    'statuses.concept' => 'Concept',
    'statuses.drafting' => 'Drafting',
    'statuses.revising' => 'Revising',
    'statuses.complete' => 'Complete',

    'workspace.add_section' => 'Add section',
    'workspace.add_child' => 'Add inside',
    'workspace.delete_section' => 'Delete section',
    'workspace.delete_confirm_title' => 'Delete this section?',
    'workspace.delete_confirm_body' => 'This removes the section and everything nested inside it.',
    'workspace.delete_confirm_action' => 'Delete',
    'workspace.section_title_placeholder' => 'Section title',
    'workspace.new_section_title' => 'New section',
    'workspace.no_section' => 'Select a section to start writing, or add your first one.',
    'workspace.container_hint' => 'This section holds others. Select a child to write, or start writing here.',
    'workspace.start_writing' => 'Start writing here',
    'workspace.words' => ':count words',
    'workspace.of_target' => 'of :target',
    'workspace.pages' => '~:count pages',
    'workspace.saving' => 'Saving…',
    'workspace.saved' => 'Saved',
    'workspace.save_error' => 'Couldn\'t save. Your text is still here; retrying on the next change.',

    'flash.work_created' => 'Work created.',
    'flash.work_updated' => 'Work updated.',
    'flash.work_deleted' => 'Work deleted.',
    'flash.section_created' => 'Section added.',
    'flash.section_updated' => 'Section updated.',
    'flash.section_deleted' => 'Section deleted.',
];
```

- [ ] **Step 4: Run** core Writing suite (expect 32 passed) + pint. (Controller commits.)

---

### Task 3 (app): Routes + WorkController

**Files:**
- Create: `app/Http/Controllers/Writing/WorkController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/Writing/WorkControllerTest.php`

- [ ] **Step 1: Failing tests** (controller-behavior suite — use the `Gate::before(fn () => true)` bypass in `beforeEach` like `EntryThemeUpdateTest`, plus two real-authorization tests WITHOUT the bypass at the end using the Task 1 arrange):

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

beforeEach(function () {
    Gate::before(fn () => true);
    $this->user = User::factory()->create();
    $this->project = Project::factory()->create(['owner_id' => $this->user->id]);
});

it('lists the project works on the index page', function () {
    $work = Work::factory()->forProject($this->project)->create(['title' => 'The Long Dark']);

    $this->actingAs($this->user)
        ->get(route('works.index', $this->project))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Writing/Index')
            ->has('works', 1)
            ->where('works.0.title', 'The Long Dark'));
});

it('creates a work through the scaffolder and redirects to the workspace', function () {
    $this->actingAs($this->user)
        ->post(route('works.store', $this->project), [
            'title' => 'Cold Open',
            'type' => 'screenplay',
        ])
        ->assertRedirect();

    $work = Work::query()->where('title', 'Cold Open')->firstOrFail();

    expect($work->format)->toBe('screenplay')
        ->and($work->user_id)->toBe($this->user->id)
        ->and($work->sections()->count())->toBeGreaterThan(0);
});

it('rejects unknown work types', function () {
    $this->actingAs($this->user)
        ->post(route('works.store', $this->project), ['title' => 'X', 'type' => 'sonnet'])
        ->assertSessionHasErrors('type');
});

it('shows the workspace with the section tree and first section selected', function () {
    $work = Work::factory()->forProject($this->project)->create();
    $root = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Chapter 1']);
    WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $root->id, 'title' => 'Scene 1']);

    $this->actingAs($this->user)
        ->get(route('works.show', [$this->project, $work]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Writing/Workspace')
            ->has('sections', 1)
            ->has('sections.0.children', 1)
            ->where('currentSection.slug', 'chapter-1'));
});

it('selects a section by slug, including container nodes', function () {
    $work = Work::factory()->forProject($this->project)->create();
    $act = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Act 1']);
    WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $act->id, 'title' => 'Scene 1']);

    $this->actingAs($this->user)
        ->get(route('works.show', [$this->project, $work, 'section' => 'scene-1']))
        ->assertInertia(fn ($page) => $page->where('currentSection.slug', 'scene-1'));
});

it('404s on a section slug from another work', function () {
    $work = Work::factory()->forProject($this->project)->create();
    $other = Work::factory()->forProject($this->project)->create();
    WorkSection::factory()->create(['work_id' => $other->id, 'title' => 'Elsewhere']);

    $this->actingAs($this->user)
        ->get(route('works.show', [$this->project, $work, 'section' => 'elsewhere']))
        ->assertNotFound();
});

it('scopes the work binding to the project', function () {
    $foreignProject = Project::factory()->create(['owner_id' => $this->user->id]);
    $foreignWork = Work::factory()->forProject($foreignProject)->create();

    $this->actingAs($this->user)
        ->get("/works/{$this->project->slug}/{$foreignWork->slug}")
        ->assertNotFound();
});

it('updates work attributes', function () {
    $work = Work::factory()->forProject($this->project)->create();

    $this->actingAs($this->user)
        ->put(route('works.update', [$this->project, $work]), [
            'title' => 'Renamed',
            'status' => 'drafting',
            'logline' => 'A keeper of doors loses her key.',
        ])
        ->assertRedirect();

    expect($work->fresh()->title)->toBe('Renamed')
        ->and($work->fresh()->status)->toBe('drafting');
});

it('soft-deletes a work', function () {
    $work = Work::factory()->forProject($this->project)->create();

    $this->actingAs($this->user)
        ->delete(route('works.destroy', [$this->project, $work]))
        ->assertRedirect(route('works.index', $this->project));

    expect(Work::query()->find($work->id))->toBeNull()
        ->and(Work::withTrashed()->find($work->id))->not->toBeNull();
});
```

Real-authorization addendum (no Gate bypass — own `describe` block or separate file section; use the Task 1 Security-suite arrange): a Viewer member gets 403 on `works.store`; a non-member gets 403 on `works.index`.

- [ ] **Step 2: Routes** — in `routes/web.php`, inside (or beside) the existing `auth`+`verified` grouping, add a `/works` group ABOVE any conflicting catch-alls:

```php
Route::middleware(['auth', 'verified'])->prefix('works')->group(function () {
    Route::get('/{project:slug}', [WorkController::class, 'index'])
        ->name('works.index')
        ->middleware('can:view,project');
    Route::post('/{project:slug}', [WorkController::class, 'store'])
        ->name('works.store')
        ->middleware('can:create,' . \Alexandria\Core\Models\Writing\Work::class . ',project');
    Route::get('/{project:slug}/{work:slug}/{section?}', [WorkController::class, 'show'])
        ->name('works.show')
        ->middleware('can:view,work');
    Route::put('/{project:slug}/{work:slug}', [WorkController::class, 'update'])
        ->name('works.update')
        ->middleware('can:update,work');
    Route::delete('/{project:slug}/{work:slug}', [WorkController::class, 'destroy'])
        ->name('works.destroy')
        ->middleware('can:delete,work');
});
```

**Gotcha:** the `can:create,...,project` string form for class+model arguments is finicky — if it misbehaves, drop the middleware and call `Gate::authorize('create', [Work::class, $project]);` inside `store()` (EntryController authorizes in-method too). Section routes come in Task 4.

- [ ] **Step 3: Implement `WorkController`** (`final readonly`, no base class — EntryController style):

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Services\Writing\WorkScaffolder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final readonly class WorkController
{
    public function index(Project $project): Response
    {
        $works = $project->works()
            ->withCount('sections')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Work $work): array => [
                'id' => $work->id,
                'title' => $work->title,
                'slug' => $work->slug,
                'type' => $work->type,
                'status' => $work->status,
                'logline' => $work->logline,
                'word_count' => $work->word_count,
                'target_words' => $work->target_words,
                'sections_count' => $work->sections_count,
                'updated_at' => $work->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('Writing/Index', [
            'project' => ['id' => $project->id, 'name' => $project->name, 'slug' => $project->slug],
            'works' => $works,
            'types' => array_values(config('alexandria.writing.types')),
            'can' => ['create' => Gate::allows('create', [Work::class, $project])],
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        Gate::authorize('create', [Work::class, $project]);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(config('alexandria.writing.types'))],
            'logline' => ['nullable', 'string', 'max:1000'],
        ]);

        $work = app(WorkScaffolder::class)->create($project, (int) $request->user()->id, $data);

        return redirect()
            ->route('works.show', [$project, $work])
            ->with('message', __('writing.flash.work_created'));
    }

    public function show(Project $project, Work $work, ?string $section = null): Response
    {
        $sections = $work->sections()->get();

        $current = $section !== null
            ? $sections->firstWhere('slug', $section) ?? abort(404)
            : $sections->firstWhere('parent_id', null);

        return Inertia::render('Writing/Workspace', [
            'project' => ['id' => $project->id, 'name' => $project->name, 'slug' => $project->slug],
            'work' => [
                'id' => $work->id,
                'title' => $work->title,
                'slug' => $work->slug,
                'type' => $work->type,
                'format' => $work->format,
                'status' => $work->status,
                'word_count' => $work->word_count,
                'target_words' => $work->target_words,
            ],
            'sections' => $this->tree($sections->whereNull('parent_id'), $sections),
            'currentSection' => $current === null ? null : $this->sectionPayload($current),
            'can' => ['update' => Gate::allows('update', $work)],
        ]);
    }

    public function update(Request $request, Project $project, Work $work): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in([Work::STATUS_CONCEPT, Work::STATUS_DRAFTING, Work::STATUS_REVISING, Work::STATUS_COMPLETE])],
            'logline' => ['nullable', 'string', 'max:1000'],
        ]);

        $work->update($data);

        return back()->with('message', __('writing.flash.work_updated'));
    }

    public function destroy(Project $project, Work $work): RedirectResponse
    {
        $work->delete();

        return redirect()
            ->route('works.index', $project)
            ->with('message', __('writing.flash.work_deleted'));
    }

    /**
     * Nested tree payload for the Navigator. Content stays out —
     * the workspace loads it per-section via currentSection.
     *
     * @param  \Illuminate\Support\Collection<int, WorkSection>  $nodes
     * @param  \Illuminate\Support\Collection<int, WorkSection>  $all
     * @return array<int, array<string, mixed>>
     */
    private function tree($nodes, $all): array
    {
        return $nodes->sortBy('position')->values()->map(fn (WorkSection $node): array => [
            'id' => $node->id,
            'title' => $node->title,
            'slug' => $node->slug,
            'label' => $node->label,
            'position' => $node->position,
            'word_count' => $node->word_count,
            'target_words' => $node->target_words,
            'has_content' => $node->content !== null && $node->content !== '',
            'children' => $this->tree($all->where('parent_id', $node->id), $all),
        ])->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function sectionPayload(WorkSection $section): array
    {
        return [
            'id' => $section->id,
            'title' => $section->title,
            'slug' => $section->slug,
            'label' => $section->label,
            'parent_id' => $section->parent_id,
            'format' => $section->effectiveFormat(),
            'status' => $section->status,
            'synopsis' => $section->synopsis,
            'content' => $section->content,
            'word_count' => $section->word_count,
            'target_words' => $section->target_words,
            'pov_entry_id' => $section->pov_entry_id,
            'setting_entry_id' => $section->setting_entry_id,
        ];
    }
}
```

- [ ] **Step 4: Green + full suite + pint.** Watch for: implicit scoped binding requires `works()` on Project (Task 2 must land in core FIRST — composer path repo picks it up immediately).

---

### Task 4 (app): WorkSectionController

**Files:**
- Create: `app/Http/Controllers/Writing/WorkSectionController.php`
- Modify: `routes/web.php` (section routes inside the works group)
- Test: `tests/Feature/Writing/WorkSectionControllerTest.php`

- [ ] **Step 1: Failing tests** (same Gate-bypass convention; fixtures: user+project+work+sections):

Cases (write them all, full Pest code in the file):
1. `store` creates a section (`title`, optional `parent_id`, optional `label`) → redirect back, section exists with auto slug/position; `parent_id` from ANOTHER work → 422.
2. `update` edits title + craft fields (`label`, `synopsis`, `status`, `beat_type`, `goal`, `conflict`, `stakes`, `mood`, `tone`, `timeline_position`, `int_ext`, `format` nullable in:prose,screenplay, `target_words`) → redirect back.
3. `update` with `pov_entry_id` / `setting_entry_id` belonging to the project writes the FKs AND mention rows appear (`source` pov/setting); an entry id from another project → 422.
4. `updateContent` (PUT JSON `{content}`) → 200 JSON `{word_count, page_estimate, work_word_count}`; persists content; mention rows from `[[Name]]` resolve (create a project entry first).
5. `move` (PUT `{parent_id, position}`) → moves; cycle attempt → 422 with error message.
6. `reorder` (PUT `{parent_id, ids: []}`) → positions follow the sequence.
7. `destroy` soft-deletes the subtree (children gone too) and the work rollup updates.
8. Section belonging to a DIFFERENT work than the route's `{work}` → 404 on update/content/move/destroy.

- [ ] **Step 2: Routes** (inside the `/works` group; `{section}` is the numeric section id — slug stays a display/deep-link concern of `show`):

```php
Route::post('/{project:slug}/{work:slug}/sections', [WorkSectionController::class, 'store'])
    ->name('works.sections.store')->middleware('can:update,work');
Route::put('/{project:slug}/{work:slug}/sections/reorder', [WorkSectionController::class, 'reorder'])
    ->name('works.sections.reorder')->middleware('can:update,work');
Route::put('/{project:slug}/{work:slug}/sections/{section}', [WorkSectionController::class, 'update'])
    ->name('works.sections.update')->middleware('can:update,work');
Route::put('/{project:slug}/{work:slug}/sections/{section}/content', [WorkSectionController::class, 'updateContent'])
    ->name('works.sections.content')->middleware('can:update,work');
Route::put('/{project:slug}/{work:slug}/sections/{section}/move', [WorkSectionController::class, 'move'])
    ->name('works.sections.move')->middleware('can:update,work');
Route::delete('/{project:slug}/{work:slug}/sections/{section}', [WorkSectionController::class, 'destroy'])
    ->name('works.sections.destroy')->middleware('can:update,work');
```

(`reorder` is declared BEFORE `{section}` so it isn't captured as an id — the store products reorder route has the same ordering note.)

- [ ] **Step 3: Implement** (`final readonly`; every method begins with the same-work guard `abort_unless($section->work_id === $work->id, 404);` after resolving `WorkSection $section` by id via `WorkSection::query()->findOrFail($id)` — use an explicit `int $section` param, NOT implicit binding, to keep the guard obvious):

Key bodies (full file in the implementer's hands; these are the load-bearing parts):

```php
public function store(Request $request, Project $project, Work $work): RedirectResponse
{
    $data = $request->validate([
        'title' => ['required', 'string', 'max:255'],
        'label' => ['nullable', 'string', 'max:60'],
        'parent_id' => ['nullable', 'integer', Rule::exists('work_sections', 'id')->where('work_id', $work->id)->whereNull('deleted_at')],
    ]);

    $section = $work->sections()->create([
        'title' => $data['title'],
        'label' => $data['label'] ?? null,
        'parent_id' => $data['parent_id'] ?? null,
    ]);

    return back()->with('message', __('writing.flash.section_created'));
}

public function updateContent(Request $request, Project $project, Work $work, int $section): JsonResponse
{
    $model = WorkSection::query()->findOrFail($section);
    abort_unless($model->work_id === $work->id, 404);

    $data = $request->validate(['content' => ['nullable', 'string', 'max:2000000']]);

    $model = app(WorkSectionContentService::class)->persist($model, $data['content'] ?? null);

    $analysis = app(SectionContentAnalyzer::class)->analyze($model->content, $model->effectiveFormat());

    return response()->json([
        'word_count' => $model->word_count,
        'page_estimate' => $analysis->pageEstimate,
        'work_word_count' => $model->work->fresh()->word_count,
    ]);
}

public function move(Request $request, Project $project, Work $work, int $section): RedirectResponse
{
    $model = WorkSection::query()->findOrFail($section);
    abort_unless($model->work_id === $work->id, 404);

    $data = $request->validate([
        'parent_id' => ['nullable', 'integer', Rule::exists('work_sections', 'id')->where('work_id', $work->id)->whereNull('deleted_at')],
        'position' => ['required', 'integer', 'min:0'],
    ]);

    try {
        app(SectionTreeService::class)->move($model, $data['parent_id'] ?? null, $data['position']);
    } catch (InvalidArgumentException $e) {
        abort(422, $e->getMessage());
    }

    return back();
}
```

`update` validates the craft-field list (all nullable strings except `target_words` int; `format` `Rule::in(['prose','screenplay'])` nullable; `pov_entry_id`/`setting_entry_id` `Rule::exists('entries', 'id')->where('project_id', $project->id)`), saves, and calls `syncReferenceMentions($model->fresh())` when `pov_entry_id`/`setting_entry_id` were present in the payload. `reorder` validates `ids` array + `parent_id` nullable and calls `SectionTreeService::reorder($work, $parentId, $ids)`. `destroy` calls `SectionTreeService::deleteSubtree($model)` then `back()->with('message', __('writing.flash.section_deleted'))`.

- [ ] **Step 4: Green + full suite + pint.**

---

### Task 5 (core): Writing/Index page

**Files:**
- Create: `resources/js/pages/Writing/Index.tsx`

Works list + create modal. Build it lean and theme-tokened, in the house page style (AppLayout, useT, typed props interface with `[key: string]: unknown`). Structure:

- Props: `{ project: {id,name,slug}; works: WorkRow[]; types: string[]; can: {create: boolean} }`
- Header: `t('writing.index.title')` + intro + right-aligned `Button` → opens create modal (the admin store CreateProductModal interaction pattern: Esc/overlay close)
- Modal form (Inertia `useForm`): title (autofocus), type (Select from `types`, labels via `t('writing.types.'+type)`), logline (Textarea) → `form.post('/works/'+project.slug)`; on success the server redirects to the new workspace
- Works grid/list: each row links to `/works/{project.slug}/{work.slug}` and shows title, type label, status chip (`t('writing.statuses.'+status)`), `word_count` (+ `of :target` when target_words), sections count, updated date; empty state `t('writing.index.empty')`
- Use existing `ui/` components (`Button`, `Modal`, `Card` or `FramedCard`, form `Input`/`Textarea`/`Select`); no hardcoded colors — theme tokens via the components

Verification: `cd C:\Websites\alexandria\alexandria-app && npm run build` (the app's Vite globs core pages — a compile error fails the build). No browser test in this plan.

---

### Task 6 (core): Workspace shell + Navigator

**Files:**
- Create: `resources/js/pages/Writing/Workspace.tsx`, `resources/js/pages/Writing/Sections/Navigator.tsx`

`Workspace.tsx`:
- Props: `{ project; work; sections: SectionNode[]; currentSection: CurrentSection | null; can: {update: boolean} }` (shapes mirror the controller payloads; define interfaces)
- Layout: `AppLayout title={work.title + ' - ' + project.name} immersive` → flex row: Navigator (w-72, collapsible on mobile later), editor pane (flex-1), and a placeholder right rail div (Plan 3 mounts the reference panel there — leave an empty `<aside>` with a TODO-free comment "reference panel mounts here in the next plan")
- Section selection handler:

```tsx
function selectSection(slug: string) {
    router.visit(`/works/${project.slug}/${work.slug}/${slug}`, {
        only: ['currentSection'],
        preserveState: true,
        preserveScroll: true,
    });
}
```

(Partial reload keeps Navigator expansion state; Inertia updates the URL — back/forward walks the reading path.)
- Work header strip: title, status chip, work word count vs `target_words`

`Navigator.tsx`:
- Recursive tree render of `SectionNode[]`: chevron expand/collapse (local `Set<number>` state, default expanded), row = label chip (small) + title + word count; selected row highlighted (compare slug to `currentSection?.slug`)
- Per-row hover actions (when `can.update`): "add inside" (opens the add modal with `parent_id` preset), "delete" (ConfirmModal → `router.delete(route, {preserveScroll: true})` — body copy from `t('writing.workspace.delete_confirm_body')`)
- Root-level "Add section" button → modal: title (+ optional label) → `router.post('/works/{p}/{w}/sections', {title, label, parent_id}, {preserveScroll: true})`
- Reorder is NOT in this plan (Plan 3/4 wires useSortableReorder); keep rows ready (stable keys, flat row component)

Verification: `npm run build` in the app +, if `composer run dev` is running, a manual click-through is welcome but not required.

---

### Task 7 (core): ManuscriptEditor + autosave

**Files:**
- Create: `resources/js/pages/Writing/Sections/ManuscriptEditor.tsx`
- Modify: `resources/js/pages/Writing/Workspace.tsx` (mount it)

`ManuscriptEditor.tsx`:
- Props: `{ projectId: number; projectSlug: string; workSlug: string; section: CurrentSection; canUpdate: boolean; onCounts: (sectionWords: number, workWords: number, pages: number | null) => void }`
- Local `content` state seeded from `section.content ?? ''`, RESET via `useEffect` on `section.id` change (flush any pending save for the previous section first)
- Renders core `RichTextEditor` with `value={content}`, `onChange={handleChange}`, `enableEntryLinks`, `projectId`, `tier="pro"`, no AI; wide centered column (`max-w-3xl mx-auto`), `label` hidden
- Autosave: `handleChange` sets state + debounces 1200ms → `PUT /works/{projectSlug}/{workSlug}/sections/{section.id}/content` as JSON `fetch` — clone the CSRF/headers pattern from `alexandria-app/resources/js/lib/EasterEggBridge.tsx` EXACTLY (read it first; it's the house pattern for JSON writes outside Inertia). On 200: parse `{word_count, page_estimate, work_word_count}` → `onCounts(...)`, set status 'saved'; on failure: status 'error' (copy `t('writing.workspace.save_error')`), keep the dirty state, retry on next change. Flush pending save on unmount (`useEffect` cleanup) and on section switch.
- Footer bar: save status (`saving`/`saved`/error), live word count of the CURRENT section (server-confirmed value; cosmetic interim = unchanged), `~N pages` for screenplay sections, `of :target` when `target_words`
- Title row above the editor: inline title input (value from section, `onBlur` → `router.put(sections.update route, {title, ...unchanged craft fields}, {preserveScroll: true, only: ['sections', 'currentSection']})` — send only `title` plus required fields per the controller validation; if the controller requires the full field list, send the section's current values)
- Container sections (`content === null` && has children): show `t('writing.workspace.container_hint')` + a "start writing here" button that simply focuses the editor (content starts empty string — saving it converts the node to content-bearing)
- `currentSection === null` (empty work): centered `t('writing.workspace.no_section')`

`Workspace.tsx` mount: editor pane renders `ManuscriptEditor` when `currentSection` present; `onCounts` updates local state for the work-header count and the Navigator row count (lift counts into Workspace state keyed by section id, merged over the props tree at render).

Verification: `npm run build`; then full app test suite still green (`php artisan test --compact`).

---

### Task 8: Cross-repo verification + docs

- [ ] Core: `vendor/bin/pest --compact` (expect 561+ passed) + `vendor/bin/pint --format agent`
- [ ] App: `php artisan test --compact` (full suite green) + `vendor/bin/pint --format agent` + `npm run build`
- [ ] `git status` clean in BOTH repos (watch lint-staged leftovers)
- [ ] Board: #31 → completed, #33 → completed

---

## Self-Review Notes (already applied)

- The `can:create,...,project` middleware string is flagged as a gotcha with the in-controller fallback (EntryController precedent).
- Scoped binding depends on Task 2's `Project::works()` — task ordering states core-first; the path repo makes it visible to the app immediately.
- `updateContent` re-runs the analyzer for `page_estimate` (persist() doesn't expose it); acceptable double-walk for now — noted for Plan 3 if it grows.
- `reorder` route declared before `{section}` (capture-order gotcha, store-products precedent).
- Tests that need real roles point at the Security-suite arrange instead of inventing one; NEEDS_CONTEXT is the escape hatch.
- UI tasks (5–7) specify behavior + component inventory rather than full TSX listings; the implementers have the house patterns (CreateProductModal, EasterEggBridge fetch, EntryForm useForm) named explicitly. Build-pass is the verification gate; browser smokes come in Plan 4.
