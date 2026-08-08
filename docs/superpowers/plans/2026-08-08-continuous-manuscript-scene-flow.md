# Continuous Manuscript Scene Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The writing workspace gains a continuous-flow view — the whole work as one scrollable stack of live per-section editors, with deep-links landing in place, typeset dividers, screenplay slugline anchors, and scroll-driven URL/sidebar sync.

**Architecture:** A `ContinuousFlow` container renders the flattened section tree as `FlowSection` wrappers (placeholder → hydrated via a new batch content endpoint → active via IntersectionObserver). Every section keeps its own editor instance, so autosave/comments/mention contracts stay per-section. Focus mode is the existing single-section view behind a persisted toggle; continuous is the default.

**Tech Stack:** Laravel 13 (app repo), Inertia v3 + React 19 + TipTap (core repo), Pest 4 feature/browser tests (app), Vitest (app testing core via `@alexandria` alias).

**Spec:** `alexandria-core/docs/superpowers/specs/2026-08-08-continuous-manuscript-scene-flow-design.md`

## Global Constraints

- Repos: `C:\Websites\alexandria\alexandria-core` (core) and `C:\Websites\alexandria\alexandria-app` (app). App consumes core via Composer path repo — core edits are live at `alexandria.test` (Vite dev likely running; `npm run build` in app if not).
- Branch per repo: `feat/continuous-manuscript-flow` (create from `main` at task 1 / first touch of each repo).
- NEVER write files via PowerShell (UTF-8 BOM corruption — caused a live 500 once). Use the Write/Edit tools only. Commit messages via Bash heredoc.
- `git add` with EXPLICIT pathspecs only — never `git add -A`/`-u`.
- Commit trailers, both lines, every commit:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01UyDEXiRPgNLECGgYjYWxwM`
- Pest style (owner's): brace-free simple string interpolation (`"$project->slug"` not `"{$project->slug}"`), chained `->and()` expectations.
- PHP: run `vendor/bin/pint --dirty --format agent` in the app repo before each commit that touches PHP.
- Translations: NEVER inline UI strings. Core keys are FLAT dot-keys in `alexandria-core/lang/en/writing.php`, rendered via `useT()` as `t('writing.flow.…')`.
- No new migration files (alpha policy). This feature needs none — no schema changes.
- No SaaS/AI-code contact.
- Vitest runs from the app repo: `cd alexandria-app && npx vitest run <path>` (core components resolve via the `@alexandria` alias; `preserveSymlinks: true` already configured).
- Feature tests: `cd alexandria-app && php artisan test --compact --filter=<Name>`.
- TypeScript check: `npx tsc --noEmit` in app — 6 pre-existing errors in `EntryPhotoManager.tsx` + vendor `CraftPanel.tsx` are allowed; ZERO new errors.

---

## File Structure

**App (`alexandria-app`):**
- Create: `app/Services/Writing/SectionTreeService.php` — shared depth-first flatten + section payload (consolidates 3 duplicate flatteners).
- Create: `app/Http/Controllers/Writing/WorkSectionContentController.php` — invokable batch content endpoint.
- Modify: `routes/web.php` (batch route before the `{section?}` catch-all), `app/Http/Controllers/Writing/WorkController.php`, `WorkPanelController.php`, `WorkReportController.php` (delegate to the service).
- Test: `tests/Feature/Writing/WorkSectionContentBatchTest.php`, `tests/Browser/Writing/ContinuousFlowTest.php`.

**Core (`alexandria-core`), all under `resources/js`:**
- Create: `pages/Writing/Flow/flowModel.ts` (flatten + placeholder heights), `Flow/viewMode.ts` (persistence), `Flow/flowUrl.ts` (URL + fragment), `Flow/useActiveScene.ts` (observer hook), `Flow/FlowSection.tsx`, `Flow/ContinuousFlow.tsx`, `Flow/FlowToggle.tsx`.
- Modify: `components/editor/RichTextEditor.tsx` (+`scrollMode` prop), `pages/Writing/Sections/ManuscriptEditor.tsx` (pass-through), `pages/Writing/Sections/ScreenplayEditor.tsx` (+`scrollMode`), `pages/Writing/Workspace.tsx` (integration), `lang/en/writing.php` (keys).
- Test (in app repo): `resources/js/pages/writing/tests/flowModel.test.ts`, `flowUrl.test.ts`, `viewMode.test.ts`, `ContinuousFlow.test.tsx`, `useActiveScene.test.tsx` (check existing writing vitest location first — if a `resources/js/pages/writing/tests/` folder doesn't exist, follow wherever `contextSwitchRecents.test.ts`-style core-component tests live, e.g. `resources/js/components/notes/tests/` pattern → use `resources/js/pages/writing/tests/`).

---

### Task 1: Batch content endpoint + flatten consolidation (app)

**Files:**
- Create: `alexandria-app/app/Services/Writing/SectionTreeService.php`
- Create: `alexandria-app/app/Http/Controllers/Writing/WorkSectionContentController.php`
- Modify: `alexandria-app/routes/web.php` (inside the works group, before the `works.show` catch-all at ~line 381)
- Modify: `alexandria-app/app/Http/Controllers/Writing/WorkController.php` (`tree()` stays; `sectionPayload()` delegates), `WorkPanelController.php:222-228` (`flattenSections()` delegates), `WorkReportController.php:74-85` (its flatten delegates)
- Test: `alexandria-app/tests/Feature/Writing/WorkSectionContentBatchTest.php`

**Interfaces:**
- Consumes: `Alexandria\Core\Models\Writing\WorkSection`, `Work`, existing `can:view,work` middleware pattern.
- Produces: `GET /works/{project:slug}/{work:slug}/sections/content` (route name `works.sections.content`) accepting `?around={slug}&radius=N` or `?ids[]=…`, returning `{"sections": [sectionPayload, …]}` in flat tree order. `SectionTreeService::flatten(Collection $nodes, Collection $all): Collection` and `SectionTreeService::payload(WorkSection $section): array` (identical shape to today's `WorkController::sectionPayload()` — id, title, slug, label, parent_id, format, status, synopsis, content, word_count, target_words, pov_entry_id, setting_entry_id).

- [ ] **Step 1: Write the failing feature test**

`tests/Feature/Writing/WorkSectionContentBatchTest.php` — follow the setup idiom of the existing `tests/Feature/Writing/WorkControllerTest.php` (factories, acting user, project membership). Cover:

```php
<?php

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->project = Project::factory()->create(['user_id' => $this->user->id]);
    $this->work = Work::factory()->create(['project_id' => $this->project->id]);

    // Tree: root chapter → [scene-a, scene-b], second chapter → [scene-c]
    $this->chapterOne = WorkSection::factory()->create(['work_id' => $this->work->id, 'parent_id' => null, 'position' => 1, 'title' => 'Chapter One', 'content' => null]);
    $this->sceneA = WorkSection::factory()->create(['work_id' => $this->work->id, 'parent_id' => $this->chapterOne->id, 'position' => 1, 'title' => 'Scene A', 'content' => 'Alpha text.']);
    $this->sceneB = WorkSection::factory()->create(['work_id' => $this->work->id, 'parent_id' => $this->chapterOne->id, 'position' => 2, 'title' => 'Scene B', 'content' => 'Bravo text.']);
    $this->chapterTwo = WorkSection::factory()->create(['work_id' => $this->work->id, 'parent_id' => null, 'position' => 2, 'title' => 'Chapter Two', 'content' => null]);
    $this->sceneC = WorkSection::factory()->create(['work_id' => $this->work->id, 'parent_id' => $this->chapterTwo->id, 'position' => 1, 'title' => 'Scene C', 'content' => 'Charlie text.']);
});

it('returns the around window in flat tree order with content', function () {
    actingAs($this->user);

    $response = getJson("/works/$this->project->slug/$this->work->slug/sections/content?around=$this->sceneB->slug&radius=1")
        ->assertOk();

    $slugs = collect($response->json('sections'))->pluck('slug')->all();

    expect($slugs)->toBe([$this->sceneA->slug, $this->sceneB->slug, $this->chapterTwo->slug])
        ->and($response->json('sections.1.content'))->toBe('Bravo text.')
        ->and($response->json('sections.1.format'))->toBeIn(['prose', 'screenplay']);
});

it('returns requested ids in flat order regardless of request order', function () {
    actingAs($this->user);

    $response = getJson("/works/$this->project->slug/$this->work->slug/sections/content?ids[]=$this->sceneC->id&ids[]=$this->chapterOne->id")
        ->assertOk();

    expect(collect($response->json('sections'))->pluck('id')->all())
        ->toBe([$this->chapterOne->id, $this->sceneC->id]);
});

it('silently excludes ids belonging to another work', function () {
    actingAs($this->user);
    $otherWork = Work::factory()->create(['project_id' => $this->project->id]);
    $foreign = WorkSection::factory()->create(['work_id' => $otherWork->id]);

    $response = getJson("/works/$this->project->slug/$this->work->slug/sections/content?ids[]=$foreign->id&ids[]=$this->sceneA->id")
        ->assertOk();

    expect(collect($response->json('sections'))->pluck('id')->all())->toBe([$this->sceneA->id]);
});

it('404s an unknown around slug', function () {
    actingAs($this->user);

    getJson("/works/$this->project->slug/$this->work->slug/sections/content?around=nope&radius=2")
        ->assertNotFound();
});

it('rejects requests exceeding the batch cap', function () {
    actingAs($this->user);
    $ids = implode('&ids[]=', range(1, 21));

    getJson("/works/$this->project->slug/$this->work->slug/sections/content?ids[]=$ids")
        ->assertUnprocessable();
});

it('requires either around or ids', function () {
    actingAs($this->user);

    getJson("/works/$this->project->slug/$this->work->slug/sections/content")
        ->assertUnprocessable();
});

it('denies users outside the project', function () {
    $stranger = User::factory()->create();
    actingAs($stranger);

    getJson("/works/$this->project->slug/$this->work->slug/sections/content?around=$this->sceneA->slug")
        ->assertForbidden();
});
```

Adjust factory/membership boilerplate to match `WorkControllerTest.php` exactly (e.g. if projects attach members via a pivot or the factory differs, mirror it; if a viewer-role helper exists, add one viewer-can-read test in the same style).

- [ ] **Step 2: Run to verify it fails**

Run: `cd alexandria-app && php artisan test --compact --filter=WorkSectionContentBatchTest`
Expected: FAIL — 404s (route doesn't exist).

- [ ] **Step 3: Create `SectionTreeService`**

```php
<?php

namespace App\Services\Writing;

use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Support\Collection;

/**
 * Shared section-tree helpers: the depth-first flatten used by the
 * workspace, panels, reports, and the batch content endpoint, plus the
 * canonical single-section payload shape. Consolidates three former
 * per-controller copies.
 */
class SectionTreeService
{
    /**
     * Flatten depth-first by position into tree order.
     *
     * Typed on the base Collection: recursion feeds it $all->where(...),
     * which narrows to Illuminate\Support\Collection.
     *
     * @param  Collection<int, WorkSection>  $nodes
     * @param  Collection<int, WorkSection>  $all
     * @return Collection<int, WorkSection>
     */
    public function flatten(Collection $nodes, Collection $all): Collection
    {
        return $nodes->sortBy('position')->values()
            ->flatMap(fn (WorkSection $node): Collection => collect([$node])
                ->concat($this->flatten($all->where('parent_id', $node->id), $all)));
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(WorkSection $section): array
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

- [ ] **Step 4: Create the invokable controller**

```php
<?php

namespace App\Http\Controllers\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use App\Http\Controllers\Controller;
use App\Services\Writing\SectionTreeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Batch section-content endpoint for the continuous manuscript flow
 * (spec 2026-08-08). Windowed by design: `around` a slug ± radius in
 * flat tree order, or explicit `ids`, capped at 20 sections — never
 * the whole novel in one payload.
 */
class WorkSectionContentController extends Controller
{
    private const MAX_BATCH = 20;

    public function __invoke(Request $request, Project $project, Work $work, SectionTreeService $tree): JsonResponse
    {
        $data = $request->validate([
            'around' => ['required_without:ids', 'string', 'max:255'],
            'radius' => ['sometimes', 'integer', 'min:1', 'max:9'],
            'ids' => ['required_without:around', 'array', 'max:'.self::MAX_BATCH],
            'ids.*' => ['integer'],
        ]);

        $all = $work->sections()->get();
        $flat = $tree->flatten($all->whereNull('parent_id'), $all)->values();

        if (isset($data['around'])) {
            $index = $flat->search(fn (WorkSection $s): bool => $s->slug === $data['around']);
            abort_if($index === false, 404);

            $radius = (int) ($data['radius'] ?? 3);
            $window = $flat->slice(max(0, $index - $radius), $radius * 2 + 1);
        } else {
            $wanted = array_map(intval(...), $data['ids']);
            $window = $flat->filter(fn (WorkSection $s): bool => in_array($s->id, $wanted, true));
        }

        return response()->json([
            'sections' => $window->values()->map(fn (WorkSection $s): array => $tree->payload($s))->all(),
        ]);
    }
}
```

(`abort_if($index === false…)`: Collection `search()` returns `false` when the slug is absent.)

- [ ] **Step 5: Register the route**

In `routes/web.php`, inside the works group, directly ABOVE the `works.show` registration (~line 381), following the comments-route precedent:

```php
    // Continuous-flow batch content (spec 2026-08-08). MUST register
    // before the {section?} catch-all, same as the comments routes.
    Route::get('/{project:slug}/{work:slug}/sections/content', WorkSectionContentController::class)
        ->name('works.sections.content')
        ->middleware('can:view,work');
```

Add the controller import at the top of the file beside the other `Writing` controller imports.

- [ ] **Step 6: Run the test to verify it passes**

Run: `php artisan test --compact --filter=WorkSectionContentBatchTest`
Expected: PASS (all cases).

- [ ] **Step 7: Consolidate the three flatteners**

- `WorkPanelController`: delete the private `flattenSections()` (:222-228); inject `SectionTreeService $tree` into the methods that call it (or constructor-inject) and replace call sites with `$tree->flatten(...)`.
- `WorkReportController`: same for its private `flatten()` (:74-85).
- `WorkController`: keep `tree()` (nested — different shape); replace the body of `sectionPayload()` with `return app(SectionTreeService::class)->payload($section);` or constructor-inject. Do NOT change `tree()`.
- Run: `php artisan test --compact --filter=WorkPanelController` then `--filter=WorkReport` then `--filter=WorkController` (existing suites prove the refactor).
Expected: PASS, zero behavior change.

- [ ] **Step 8: Pint + commit**

```bash
cd /c/Websites/alexandria/alexandria-app && vendor/bin/pint --dirty --format agent
git checkout -b feat/continuous-manuscript-flow
git add app/Services/Writing/SectionTreeService.php app/Http/Controllers/Writing/WorkSectionContentController.php routes/web.php app/Http/Controllers/Writing/WorkController.php app/Http/Controllers/Writing/WorkPanelController.php app/Http/Controllers/Writing/WorkReportController.php tests/Feature/Writing/WorkSectionContentBatchTest.php
git commit -m "$(cat <<'EOF'
feat: batch section content endpoint + shared tree flatten

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UyDEXiRPgNLECGgYjYWxwM
EOF
)"
```

---

### Task 2: Editor `scrollMode` prop (core)

**Files:**
- Modify: `alexandria-core/resources/js/components/editor/RichTextEditor.tsx` (scroll container ~:964-985; props interface near the top)
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/ManuscriptEditor.tsx` (pass-through)
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/ScreenplayEditor.tsx` (~:457-483; props interface)

**Interfaces:**
- Produces: optional prop `scrollMode?: 'self' | 'parent'` (default `'self'`) on `RichTextEditor`, `ManuscriptEditor`, `ScreenplayEditor`. `'parent'` = the editor does NOT own a scroll container — it grows to content height inside a scrolling ancestor; manuscript rulers are suppressed (a per-section repeated ruler is visual noise; page-break guides stay).

- [ ] **Step 1: RichTextEditor**

Add to its props interface: `scrollMode?: 'self' | 'parent';` and destructure with default `scrollMode = 'self'`. At the manuscript-variant scroll container (~:971), make the classes conditional:

```tsx
<div
    className={
        scrollMode === 'self'
            ? 'writing-workspace-scroll min-h-0 flex-1 overflow-y-auto flex flex-col'
            : 'flex flex-col'
    }
    onMouseDown={handleGutterMouseDown}
>
```

The inner `relative flex min-h-full flex-col` wrapper is unchanged — in parent mode it is naturally content-tall, so `PageBreakGuides` keeps working. Suppress both `ManuscriptRuler` renders (horizontal strip ~:948-962 and vertical ~:965) when `scrollMode === 'parent'`: change their conditions from `printLayout && …` to `printLayout && scrollMode === 'self' && …` (match the actual existing conditions; only add the `scrollMode` clause).

Also make the outer variant wrapper non-growing in parent mode if it carries `flex-1`/`min-h-0` classes that assume a bounded frame — inspect the enclosing manuscript-variant container and, where it uses `min-h-0 flex-1`, render `flex` alone in parent mode (same conditional pattern). Verify with `npx tsc --noEmit` (app repo) — zero new errors.

- [ ] **Step 2: ManuscriptEditor pass-through**

Add `scrollMode?: 'self' | 'parent';` to its props and forward to `<RichTextEditor scrollMode={scrollMode} …>` alongside the existing forwarded props.

- [ ] **Step 3: ScreenplayEditor**

Add the prop. At ~:458 change the outer `div` from `flex min-h-0 flex-1 flex-col` to drop `min-h-0 flex-1` in parent mode, suppress the printLayout ruler block (~:459-470 and the vertical at :474) in parent mode, and at `EditorContent` (~:475):

```tsx
<EditorContent
    editor={editor}
    className={
        scrollMode === 'self'
            ? 'tiptap-editor writing-workspace-scroll min-h-0 flex-1 overflow-y-auto'
            : 'tiptap-editor'
    }
    …existing handlers unchanged…
/>
```

- [ ] **Step 4: Verify + commit**

Run: `cd alexandria-app && npx tsc --noEmit` (expect only the 6 pre-existing errors) and `npx vitest run resources/js` for the existing suites (no regressions — default `'self'` renders byte-identical classes).

```bash
cd /c/Websites/alexandria/alexandria-core && git checkout -b feat/continuous-manuscript-flow
git add resources/js/components/editor/RichTextEditor.tsx resources/js/pages/Writing/Sections/ManuscriptEditor.tsx resources/js/pages/Writing/Sections/ScreenplayEditor.tsx
git commit -m "$(cat <<'EOF'
feat: editors accept scrollMode=parent for the continuous flow stack

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UyDEXiRPgNLECGgYjYWxwM
EOF
)"
```

---

### Task 3: Flow model modules (core, pure TS + vitest)

**Files:**
- Create: `alexandria-core/resources/js/pages/Writing/Flow/flowModel.ts`, `Flow/viewMode.ts`, `Flow/flowUrl.ts`
- Test: `alexandria-app/resources/js/pages/writing/tests/flowModel.test.ts`, `flowUrl.test.ts`, `viewMode.test.ts` (create the folder; import via `@alexandria/pages/Writing/Flow/…` — copy the exact alias form from an existing core-importing test such as the notes ones)

**Interfaces:**
- Consumes: `SectionNode` from `../Workspace` (import type).
- Produces:
  - `interface FlatSection { node: SectionNode; depth: number; isContainer: boolean; }`
  - `flattenTree(sections: SectionNode[]): FlatSection[]` — depth-first, children in array order (server pre-sorts by position).
  - `estimatePlaceholderHeight(wordCount: number, format: 'prose' | 'screenplay'): number` — px; constants `PROSE_WORDS_PER_LINE = 11`, `SCREENPLAY_WORDS_PER_LINE = 7`, `LINE_HEIGHT_PX = 28`, `SECTION_CHROME_PX = 96`, `MIN_PLACEHOLDER_PX = 120`; formula `max(MIN, ceil(words / wordsPerLine) * LINE_HEIGHT + CHROME)`.
  - `viewMode.ts`: `type WorkspaceViewMode = 'continuous' | 'focus'`, `readViewMode(workId: number): WorkspaceViewMode` (default `'continuous'`), `writeViewMode(workId: number, mode: WorkspaceViewMode): void`, key `alexandria.writing.view-mode:<workId>` — mirror `pages/Writing/panelMode.ts` exactly (try/catch, normalize unknown → `'continuous'`).
  - `flowUrl.ts`: `flowUrl(projectSlug: string, workSlug: string, sectionSlug: string, sceneIndex?: number | null): string` → `/works/{p}/{w}/{s}` + `#scene-{n}` when `sceneIndex` is a number ≥ 1; `parseSceneFragment(hash: string): number | null` → `'#scene-4'` → `4`, anything else → `null`.

- [ ] **Step 1: Write the failing tests** — flatten order/depth/isContainer over a 2-chapter fixture (assert `['ch1','sc-a','sc-b','ch2','sc-c']` + depths `[0,1,1,0,1]`); height monotonicity + MIN floor + format divergence; viewMode default/round-trip/garbage-normalize (mirror assertions from the existing `contextSwitchRecents.test.ts` hardening style); flowUrl with/without fragment + parse round-trip + `parseSceneFragment('#scene-0')` → null.
- [ ] **Step 2: Run to verify failure** — `npx vitest run resources/js/pages/writing/tests` → module-not-found FAIL.
- [ ] **Step 3: Implement the three modules** per the Produces block (each file gets a short doc comment naming the spec).
- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** (core: the 3 modules; app: the 3 test files — two commits, one per repo, explicit pathspecs, standard trailers, message `feat: flow model modules for continuous manuscript` / `test: flow model vitest coverage`).

---

### Task 4: FlowSection + ContinuousFlow (core)

**Files:**
- Create: `alexandria-core/resources/js/pages/Writing/Flow/FlowSection.tsx`, `Flow/ContinuousFlow.tsx`
- Modify: `alexandria-core/lang/en/writing.php` — add flat keys:
  `'flow.begin_writing' => 'Begin writing…'`, `'flow.scene_break' => 'Scene break'`, `'flow.divider_aria' => ':title'`, `'flow.loading' => 'Loading…'`, `'flow.continuous' => 'Continuous'`, `'flow.focus' => 'Focus'`, `'flow.toggle_aria' => 'Switch manuscript view mode'` (place beside the existing `panel.*`/workspace keys; keep alphabetical-ish grouping under a `// Continuous flow (spec 2026-08-08)` comment).
- Test: `alexandria-app/resources/js/pages/writing/tests/ContinuousFlow.test.tsx`

**Interfaces:**
- Consumes: Task 3 modules; Task 2 `scrollMode`; `CurrentSection`/`SectionNode` types from `../Workspace`; editors `ManuscriptEditor`/`ScreenplayEditor` (mocked in tests); endpoint from Task 1.
- Produces:

```tsx
// ContinuousFlow.tsx
export interface FlowWork { id: number; title: string; slug: string; format: string; }
export interface ActiveScene { section: CurrentSection; sceneIndex: number | null; }

interface ContinuousFlowProps {
    project: { id: number; name: string; slug: string };
    work: FlowWork;
    sections: SectionNode[];
    initialSection: CurrentSection | null;   // server currentSection = first hydrated block
    canUpdate: boolean;
    printLayout: boolean;
    onCounts: (sectionId: number, words: number, workWords: number, pages: number | null) => void;
    onActiveSceneChange: (active: ActiveScene) => void;   // debounced upstream by useActiveScene (Task 5)
    onBridgeChange: (sectionId: number, bridge: WritingEditorBridge | null) => void;
    onEditorStateChange: () => void;          // forwards editors' onStateChange for editorTick
    onOutlineChange: (outline: OutlineItem[] | null) => void;  // forwarded ONLY from the active section — copy the exact outline type from Workspace's setCurrentOutline usage
    onSceneLinksChange: (links: ScreenplaySceneLink[] | null) => void; // active section only
    onEntryLinkSelect: Parameters — copy the exact handler types from Workspace.tsx's existing editor props (handleEntryLinkSelect / handleAddComment signatures).
    onAddComment: same.
    scrollToSlugRef: React.MutableRefObject<((slug: string) => void) | null>; // imperative scroll for Navigator clicks
}
```

ContinuousFlow OWNS the scroll container ref and MOUNTS `useActiveScene` itself (Task 5): it holds the hydrated map, so it converts the hook's `ActiveSceneRef` into a full `ActiveScene` (`hydrated[sectionId]` lookup — if the centered section isn't hydrated yet, skip the emit; the next debounce fires after hydration) and calls `onActiveSceneChange`. It bumps the hook's `version` internally after every hydration merge and on `sections` prop identity change. Workspace never touches the observer.

Behavior contract (implement exactly):
1. `flat = flattenTree(sections)` memoized on `sections`.
2. `hydrated: Record<number, CurrentSection>` state, seeded `{ [initialSection.id]: initialSection }` when non-null. `inFlightRef: Set<number>` guards duplicate fetches.
3. `fetchWindow(params: { around?: string; ids?: number[] })` → `fetch('/works/{p}/{w}/sections/content?…', { credentials: 'same-origin', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })` → merge `payload.sections` into `hydrated` keyed by id. Build `ids[]=` query-string params for the ids form; `around=slug&radius=3` for landing. Non-ok responses: clear in-flight, leave placeholders (they retry on next approach).
4. On mount: if `initialSection`, `fetchWindow({ around: initialSection.slug })`.
5. Near-viewport hydration: a scroll listener on the container (passive, throttled via `requestAnimationFrame` gate) collects placeholder wrappers whose `getBoundingClientRect()` is within 1500px of the viewport band and calls `fetchWindow({ ids })` batching ≤ 20.
6. Renders: outer `<div ref={scrollRef} className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-[52rem]">…FlowSections…</div></div>`.
7. Each flat row → `<FlowSection key={node.id} …>` receiving `flat` row, `hydrated[node.id] ?? null`, and the pass-through editor callbacks. The wrapper element (same element placeholder→hydrated, for scroll anchoring) carries `data-flow-section`, `data-flow-section-id={node.id}`, `data-flow-section-slug={node.slug}`.

```tsx
// FlowSection.tsx — per-row wrapper
interface FlowSectionProps {
    row: FlatSection;
    section: CurrentSection | null;          // null = placeholder
    project / workSlug / canUpdate / printLayout / onCounts / onBridgeChange / onEditorStateChange / onOutline / onSceneLinks / onEntryLinkSelect / onAddComment — as above;
    isActive: boolean;                        // gates outline/scene-links forwarding
}
```

FlowSection behavior:
- **Divider:** containers (`row.isContainer`) render `<h2 className="alex-flow-heading" style={{ fontSize: depth === 0 ? '1.5rem' : '1.25rem' }}>` with `{row.node.label ? `${row.node.label} — ` : ''}{row.node.title}` (visible text is DATA — titles/labels come from the user's own tree, no lang key needed); leaves render a centered ornament `<div role="separator" aria-label={row.node.title} data-flow-divider className="alex-flow-ornament" title={row.node.title}>* * *</div>`. First flat row skips the leaf ornament (no break before the opening scene) but containers always render their heading.
- **Placeholder:** `<div style={{ minHeight: estimatePlaceholderHeight(node.word_count, guessFormat) }} className="…muted…">` showing `t('writing.flow.loading')` only when `node.has_content`; `guessFormat` = work.format normalized to `'prose' | 'screenplay'`.
- **Hydrated + has content (or user focuses it):** the real editor with `scrollMode="parent"`, `chrome="none"`, each editor given a LOCAL `bridgeRef` (`useRef<WritingEditorBridge | null>(null)`); report `onBridgeChange(id, ref.current)` inside the editor's `onStateChange` forwarding (bridge identity churns per keystroke — always re-report). Only forward `onOutlineChange`/`onSceneLinksChange` when `isActive` (pass no-ops otherwise).
- **Hydrated + empty:** ghost line `<button type="button" data-flow-begin className="…italic muted…" onClick={mount editor + focus}>` labeled `t('writing.flow.begin_writing')`; clicking swaps to the mounted editor (local `engaged` state).
- Styles: add `alex-flow-heading` / `alex-flow-ornament` classes inline via Tailwind utilities instead of new CSS files if expressible (`text-center tracking-[0.5em] opacity-60 my-8` for the ornament); use theme-variable colors like siblings (`var(--theme-base-content)` mixes), never hard-coded colors.

- [ ] **Step 1: Write failing vitest** (`ContinuousFlow.test.tsx`): `vi.mock` both editors to lightweight stubs that render `data-testid="editor-{id}"`; stub `global.fetch`. Assert: (a) placeholders render for all flat rows with min-height ≥ MIN and the initial section renders its editor; (b) mount fires exactly one `around` fetch with radius 3; (c) a fetch response hydrates rows (stub editors appear); (d) container heading text and leaf ornament render per fixture; first-leaf ornament suppressed; (e) empty hydrated section shows the begin-writing ghost; clicking engages the editor stub. Use fake timers where the rAF throttle needs flushing.
- [ ] **Step 2: Verify failure.** `npx vitest run resources/js/pages/writing/tests/ContinuousFlow.test.tsx`
- [ ] **Step 3: Implement `FlowSection.tsx` then `ContinuousFlow.tsx`** per the contract above. Keep each file under ~300 lines; extract tiny pure helpers into `flowModel.ts` if a file bloats.
- [ ] **Step 4: Verify pass + tsc clean.**
- [ ] **Step 5: Commit** — core: `resources/js/pages/Writing/Flow/FlowSection.tsx resources/js/pages/Writing/Flow/ContinuousFlow.tsx lang/en/writing.php`, message `feat: continuous flow stack — placeholders, hydration, typeset dividers`; app: the test file, `test: continuous flow stack coverage`.

---

### Task 5: `useActiveScene` hook (core)

**Files:**
- Create: `alexandria-core/resources/js/pages/Writing/Flow/useActiveScene.ts`
- Test: `alexandria-app/resources/js/pages/writing/tests/useActiveScene.test.tsx`

**Interfaces:**
- Consumes: DOM contract from Task 4 (`[data-flow-section]` wrappers with id/slug data attrs; screenplay sluglines are `p[data-element="slugline"]` inside the wrapper).
- Produces:

```ts
export interface ActiveSceneRef { sectionId: number; slug: string; sceneIndex: number | null; }

export function useActiveScene(options: {
    containerRef: React.RefObject<HTMLElement | null>;
    enabled: boolean;                    // false in focus mode — observers torn down
    version: number;                     // bump to re-scan children (after hydration/tree changes)
    onChange: (active: ActiveSceneRef) => void;   // fires ≥600ms after scroll rest, only on actual change
}): void
```

Behavior contract:
1. When `enabled` flips true (and on `version` bumps), query `container.querySelectorAll('[data-flow-section]')` and observe with ONE `IntersectionObserver` (`root: container, rootMargin: '-30% 0px -30% 0px', threshold: 0`) — the center band.
2. Track currently-intersecting entries in a ref map; candidate = the intersecting section whose bounding top is closest to the band without going below it (fallback: first intersecting).
3. Debounce: on every observer callback and on container `scroll` events, reset a 600 ms timer; when it fires, resolve the candidate, compute `sceneIndex`, and call `onChange` if `(sectionId, sceneIndex)` differs from the last emitted pair.
4. `sceneIndex`: `null` unless the candidate wrapper contains ≥2 `p[data-element="slugline"]` elements; otherwise 1-based index of the LAST slugline whose `getBoundingClientRect().top` ≤ container center line (`containerRect.top + containerRect.height / 2`); before the first slugline → `1`.
5. Full teardown on disable/unmount (disconnect observer, clear timer, remove scroll listener).

- [ ] **Step 1: Failing test** — install a `MockIntersectionObserver` class on `globalThis` capturing instances + callbacks (pattern: constructor stores callback, `observe/disconnect` record elements; test fires `instance.trigger(entries)`); fake timers for the debounce. DOM fixture: container with three `[data-flow-section]` divs, one containing three sluglines with stubbed `getBoundingClientRect`. Assert: onChange fires once after 600 ms with the centered section; no re-fire for identical state; slugline refinement produces `sceneIndex: 2` for a mid-section center; disable tears down (trigger after unmount → no call).
- [ ] **Step 2: Verify failure.** — module not found.
- [ ] **Step 3: Implement** per contract (~120 lines, pure hook, no component).
- [ ] **Step 4: Verify pass.**
- [ ] **Step 5: Commit** (core hook `feat: active-scene tracking hook`; app test `test: active-scene hook coverage`).

---

### Task 6: Workspace integration (core)

**Files:**
- Create: `alexandria-core/resources/js/pages/Writing/Flow/FlowToggle.tsx` (small segmented control)
- Modify: `alexandria-core/resources/js/pages/Writing/Workspace.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2-5.
- Produces: the feature. No new exports.

Implement, in order:

- [ ] **Step 1: FlowToggle** — a two-button segmented pill, `data-flow-toggle`, buttons `data-flow-toggle-continuous` / `data-flow-toggle-focus`, labels `t('writing.flow.continuous')` / `t('writing.flow.focus')`, `aria-label={t('writing.flow.toggle_aria')}`, active button styled with the workspace's existing accent pattern (copy the styling idiom from `PanelModeSwitcher.tsx`). Props: `{ mode: WorkspaceViewMode; onChange: (m: WorkspaceViewMode) => void }`.

- [ ] **Step 2: Workspace state.** Add:

```tsx
const [viewMode, setViewMode] = useState<WorkspaceViewMode>(() => readViewMode(work.id));
const [activeScene, setActiveScene] = useState<ActiveScene | null>(
    currentSection === null ? null : { section: currentSection, sceneIndex: parseSceneFragment(window.location.hash) },
);
const scrollToSlugRef = useRef<((slug: string) => void) | null>(null);
const bridgesRef = useRef(new Map<number, WritingEditorBridge | null>());
```

Derived: `const effectiveSection = viewMode === 'continuous' ? (activeScene?.section ?? currentSection) : currentSection;`

- [ ] **Step 3: Swap the editor pane.** In the `<section className="flex min-w-0 flex-1 flex-col overflow-hidden">` block (:922-968): when `viewMode === 'continuous' && sections.length > 0`, render `<ContinuousFlow …/>` instead of the single-editor branch; keep the existing branch for focus mode; keep the `no_section` fallback for empty works. Wire props:
  - `onActiveSceneChange`: setActiveScene; update shared bridge `bridgeRef.current = bridgesRef.current.get(active.section.id) ?? null`; `history.replaceState(null, '', flowUrl(project.slug, work.slug, active.section.slug, active.sceneIndex))`. NEVER an Inertia visit.
  - `onBridgeChange(id, bridge)`: `bridgesRef.current.set(id, bridge); if (activeScene?.section.id === id) bridgeRef.current = bridge;`
  - `onEditorStateChange`: reuse the existing `handleEditorStateChange` (bumps editorTick).
  - `onCounts`: existing `handleCounts`.
  - `onOutlineChange`/`onSceneLinksChange`: existing setters (`setCurrentOutline`, `setScreenplaySceneLinks`) — ContinuousFlow only forwards from the active section.
  - `onEntryLinkSelect`/`onAddComment`: existing handlers.
  - The observer lives inside ContinuousFlow (see Task 4's ownership note) — Workspace only consumes `onActiveSceneChange`.
- [ ] **Step 4: Landing + fragment.** In ContinuousFlow's mount effect (already fetching `around`): after first paint (`requestAnimationFrame`), `scrollToSlugRef`-style instant scroll of the initial section wrapper into view (`block: 'start', behavior: 'auto'`); if `parseSceneFragment(location.hash)` is `n ≥ 2`, after the initial section hydrates, find its nth `p[data-element="slugline"]` and scroll THAT into view instead. (Guard: only on first mount, never on later hydrations.)
- [ ] **Step 5: Navigator in continuous mode.** In `selectSection` (:598-604): when `viewMode === 'continuous'`, call `scrollToSlugRef.current?.(slug)` (ContinuousFlow implements: find wrapper by `data-flow-section-slug`, instant scrollIntoView, then `fetchWindow({ around: slug })`) and return — no router.visit. Focus mode keeps the existing partial visit. Pass `currentSlug={viewMode === 'continuous' ? (activeScene?.section.slug ?? null) : currentSection?.slug ?? null}` to Navigator.
- [ ] **Step 6: Panels + ribbon + status bar follow the active scene.** Replace `currentSection` with `effectiveSection` at: ReferencePanel `currentSection=`, SidebarNotesPanel `currentSection=`, CommentRail `sectionId=`, registered-mode components `currentSection=`, ribbonCtx `format:` (:633), WorkspaceStatusBar `hasSection`/`sectionWords`/`sectionTarget`/`sectionPages` inputs, and the Navigator `currentSection=` prop. Do NOT touch the panels' internals — their `currentSection?.id`-keyed effects now follow the debounced active scene for free.
- [ ] **Step 7: The toggle.** Render `<FlowToggle mode={viewMode} onChange={switchViewMode} />` in the workspace header row where `PanelModeSwitcher`-adjacent controls live — concretely: inside the editor `<section>` top, absolutely positioned top-right (`className="absolute right-4 top-2 z-10"` on a relative section) so it floats over both views. `switchViewMode(next)`: `writeViewMode(work.id, next); setViewMode(next);` and when switching continuous→focus, first `router.visit(flowUrl(project.slug, work.slug, activeScene?.section.slug ?? currentSection?.slug ?? ''), { only: ['currentSection'], preserveState: true, preserveScroll: true })` so focus opens ON the scene you were reading (skip the visit when no active scene). Editors unmounting on the swap flush pending autosaves via the existing `useSectionAutosave` cleanup — do not add extra flush code.
- [ ] **Step 8: Tree-mutation coherence.** Where Navigator mutations partial-reload `sections` (no Workspace change needed — props flow), ContinuousFlow already re-derives `flat` from the `sections` prop and bumps its internal observer version; confirm hydrated map entries for deleted ids are simply never rendered (flat no longer contains them).
- [ ] **Step 9: Verify.** `npx tsc --noEmit` (6 pre-existing only); `npx vitest run resources/js` full app suite green; `cd alexandria-core && vendor/bin/pest` green (no PHP touched here, cheap confirmation); manual boot: load `alexandria.test`, open a work — flow renders. Do NOT deep-verify visuals — that is Task 7's owner checkpoint.
- [ ] **Step 10: Commit** — core: `resources/js/pages/Writing/Flow/FlowToggle.tsx resources/js/pages/Writing/Flow/ContinuousFlow.tsx resources/js/pages/Writing/Flow/FlowSection.tsx resources/js/pages/Writing/Workspace.tsx` (+ any lang additions), message `feat: continuous manuscript flow — workspace integration, landing, sync`.

---

### Task 7: OWNER VISUAL CHECKPOINT (hard stop)

- [ ] Pause ALL work. Prompt Andrew to check, per surface, look AND behavior:
  1. Deep-link a mid-work scene URL → lands in the full text at the right spot, no scroll jump as neighbors hydrate.
  2. Dividers: chapter headings + `* * *` scene breaks + hover titles.
  3. Scroll a few scenes → URL, Navigator highlight, notes/linked/comments panels follow after the rest debounce.
  4. Screenplay: slugline anchors — `#scene-n` deep-link lands on the line; scene-links tab follows in-section scrolling.
  5. FlowToggle: continuous↔focus round-trip, opens focus on the active scene, persists per work.
  6. Typing + autosave in two different stacked sections; comments rail on the active section.
- [ ] Apply his rulings before proceeding. Do not start Task 8 until he clears the checkpoint.

---

### Task 8: Browser smokes + close-out (app)

**Files:**
- Create: `alexandria-app/tests/Browser/Writing/ContinuousFlowTest.php`
- Modify: `alexandria-app/docs/REMAINING-ROADMAP.md` (Stage 11.6 scene-flow item → shipped bullet)

- [ ] **Step 1: Four Pest 4 browser smokes** (follow `tests/Browser/Writing/NotesContextSwitcherTest.php` setup idiom — factories, login, visit):
  1. `it('lands a scene deep link in the continuous flow at the target section')` — seed a 5-section work with distinct content strings, visit the 4th section's URL, assert its text is visible and `[data-flow-section-slug]` for it is within viewport (Playwright `assertVisible`/`assertSee`), and the 1st section's wrapper exists above.
  2. `it('updates the url and notes panel as the reader scrolls to the next scene')` — scroll the flow container to section 2 (`$page->script(...)` scrollTop set), wait ≥ debounce, assert URL path ends with section 2's slug and the notes panel header shows its title.
  3. `it('round trips the focus toggle on the active scene')` — click `[data-flow-toggle-focus]`, assert single-editor view showing the active section; click `[data-flow-toggle-continuous]`, assert stack returns; reload → mode persisted.
  4. `it('lands a screenplay slugline fragment on the scene line')` — screenplay work, one section, 3 sluglines, visit `…#scene-3`, assert the 3rd slugline is in viewport.
- [ ] **Step 2: Run** `php artisan test --compact tests/Browser/Writing/ContinuousFlowTest.php` until 4/4 green (2 clean consecutive runs; Vite dev or `npm run build` must be current).
- [ ] **Step 3: Full gates** — app: `php artisan test --compact tests/Feature/Writing tests/Feature/Notes`, `npx vitest run resources/js`, `npx tsc --noEmit`; core: `vendor/bin/pest`. All green (token-usage.test.ts doc-drift failure is pre-existing-allowed if still failing on main).
- [ ] **Step 4: Roadmap** — move the Stage 11.6 "continuous-manuscript scene flow" flagged item to a shipped bullet (date, one-line summary, spec path).
- [ ] **Step 5: Commit** (app: test + roadmap, `test: continuous flow browser smokes + roadmap close-out`).

---

## Deviation from spec (recorded intentionally)

Spec §3 proposed renaming the panels' prop to `activeSectionId`. Task 6 instead passes the full hydrated `CurrentSection` (`effectiveSection`) through the EXISTING `currentSection` props — zero panel churn, same behavior (their id-keyed effects follow the debounced active scene). The spec's goal (sidebar follows the reading position, one debounce, no per-scroll fetch storm) is met; amend the spec's §3 wording at merge time.
