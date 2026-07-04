# Stage 11 Slice 1 — Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four Stage 11 quick wins: section-rename live URL sync, cross-parent section moves (drag + menu), deterministic pagination preview in print layout, and the global Writing nav entry + hub enrichment.

**Architecture:** All UI work extends the shipped 8g.1 writing workspace in `alexandria-core` (React 19 + Inertia v3, pages under `resources/js/pages/Writing/`). The move backend already exists (`SectionTreeService::move()` + `works.sections.move` route) — Task 3 only adds UI. Pagination gets an analyzer extension (prose page estimates) plus a geometric page-break overlay. The `/writing` route + dashboard page already exist — Task 5 adds the nav entry and enriches the hub with recent sections + continue-writing.

**Tech Stack:** Laravel 13 / PHP 8.4 (core is Testbench-tested; app is the live host), Inertia v3 + React 19 + TypeScript, SortableJS (already a dependency), Pest 4 (+ pest-plugin-browser in app), Vitest.

## Global Constraints

- UI strings go in lang files, never inline: core keys in `alexandria-core/lang/en/writing.php`, referenced via `useT()` as `t('writing.<group>.<key>')` (frontend) or `__('alexandria::writing.<group>.<key>')` (PHP).
- No new npm/composer dependencies.
- After modifying PHP in either repo: run `vendor/bin/pint --dirty --format agent` in that repo before committing.
- Core tests: `cd C:\Websites\alexandria\alexandria-core; vendor/bin/pest`. App tests: `cd C:\Websites\alexandria\alexandria-app; php artisan test --compact --filter=<Name>`. Vitest (core): `cd C:\Websites\alexandria\alexandria-core; npx vitest run <path>`.
- Browser tests live in `alexandria-app/tests/Browser/` and are excluded from CI — run them individually.
- Do NOT touch the live Postgres database in any test — app feature tests run on sqlite `:memory:`.
- Commit trailers required on every commit:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n`

---

### Task 1: Section rename → live URL sync

**Files:**
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/RenameSectionModal.tsx`
- Test: `alexandria-app/tests/Browser/Writing/SectionRenameUrlTest.php` (create)

**Interfaces:**
- Consumes: existing `works.sections.update` endpoint (`PUT /works/{project}/{work}/sections/{id}`), which regenerates the slug on title change; the partial reload already refreshes the `currentSection` prop.
- Produces: nothing downstream — self-contained fix.

**Background:** the controller redirects to the fresh slug on rename, but the modal submits with `preserveState: true` + `only: ['sections', 'currentSection']`, so the partial reload swallows the redirect and the address bar keeps the dead slug (manual QA known issue). Fix: after success, if the renamed section is the currently open one and its slug changed, perform an Inertia **client-side** `router.replace` to the fresh URL (no server round-trip, no editor remount).

- [ ] **Step 1: Verify the Inertia v3 client-side visit API**

Use the Boost `search-docs` tool (queries: `["client-side visits", "router.replace"]`, packages: `["inertiajs/inertia-laravel"]`). Confirm the exact signature for a client-side URL replacement (`router.replace({ url: '...' })` or equivalent). If client-side visits require a component/props payload in the installed version, fall back to `router.visit(url, { replace: true, preserveScroll: true, preserveState: true, only: [] })`. Use whichever form the docs confirm in Step 3.

- [ ] **Step 2: Write the failing browser test**

Create `alexandria-app/tests/Browser/Writing/SectionRenameUrlTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use App\Models\User;

it('updates the address bar when the open section is renamed', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner_id' => $user->id]);
    $work = Work::factory()->create(['project_id' => $project->id, 'title' => 'Test Work']);
    $section = $work->sections()->create(['title' => 'Old Title']);

    $page = visit("/works/{$project->slug}/{$work->slug}/{$section->slug}")->actingAs($user);

    $page->click("[data-writing-section-menu=\"{$section->id}\"]")
        ->clickAndWaitForNavigation(__('alexandria::writing.workspace.rename_section'));

    $page->fill('title', 'Brand New Title')
        ->press(__('alexandria::writing.settings.save'))
        ->assertUrlContains('brand-new-title');
});
```

Note: check sibling suites in `alexandria-app/tests/Browser/` for the project's exact browser-test helpers (`visit()->actingAs()` order, how menus are opened) and match their conventions; the factories above must match existing `Work`/section factory usage in `alexandria-app/tests/Feature/` writing tests.

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd C:\Websites\alexandria\alexandria-app; php artisan test --compact tests/Browser/Writing/SectionRenameUrlTest.php`
Expected: FAIL — the URL still contains `old-title` after rename.

- [ ] **Step 4: Implement the URL sync in RenameSectionModal**

In `alexandria-core/resources/js/pages/Writing/Sections/RenameSectionModal.tsx`, add the `router` import and replace the `submit()` function:

```tsx
import { router, useForm } from '@inertiajs/react';
```

```tsx
    function submit() {
        form.put(`/works/${projectSlug}/${workSlug}/sections/${section.id}`, {
            preserveScroll: true,
            preserveState: true,
            only: ['sections', 'currentSection'],
            onSuccess: (page) => {
                const fresh = (page.props as {
                    currentSection?: { id: number; slug: string } | null;
                }).currentSection;

                // The rename regenerated the slug server-side; if the renamed
                // section is the one that's open, sync the address bar with a
                // client-side replace (no server round-trip, no editor remount).
                if (
                    fresh &&
                    fresh.id === section.id &&
                    !window.location.pathname.endsWith(`/${fresh.slug}`)
                ) {
                    router.replace({
                        url: `/works/${projectSlug}/${workSlug}/${fresh.slug}`,
                    });
                }

                onClose();
            },
        });
    }
```

(Adjust the `router.replace` call to the exact API confirmed in Step 1.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd C:\Websites\alexandria\alexandria-app; php artisan test --compact tests/Browser/Writing/SectionRenameUrlTest.php`
Expected: PASS

- [ ] **Step 6: Commit (core repo)**

```bash
cd C:\Websites\alexandria\alexandria-core
git add resources/js/pages/Writing/Sections/RenameSectionModal.tsx
git commit -m "fix(writing): sync address bar after renaming the open section"
```

Commit the app-side test in the app repo:

```bash
cd C:\Websites\alexandria\alexandria-app
git add tests/Browser/Writing/SectionRenameUrlTest.php
git commit -m "test(writing): browser coverage for rename URL sync"
```

---

### Task 2: Prose page estimates in SectionContentAnalyzer

**Files:**
- Modify: `alexandria-core/src/Services/Writing/SectionContentAnalyzer.php`
- Modify: `alexandria-core/config/alexandria.php` (writing formats block)
- Test: `alexandria-core/tests/Unit/Writing/SectionContentAnalyzerTest.php` (extend or create beside existing analyzer tests — check `alexandria-core/tests/` for the current location of analyzer coverage and add there)

**Interfaces:**
- Consumes: `config('alexandria.writing.formats.screenplay.lines_per_page', 55)` (existing pattern).
- Produces: `AnalyzedSectionContent->pageEstimate` now non-null for `prose` format: `ceil(wordCount / words_per_page)` with `words_per_page` default **250**. Task 4's status readout and the autosave JSON (`page_estimate`) rely on this.

- [ ] **Step 1: Write the failing test**

Add to the analyzer's test file (create `tests/Unit/Writing/SectionContentAnalyzerTest.php` if none exists, following the repo's Testbench test conventions):

```php
it('estimates prose pages from the words-per-page metric', function () {
    $analyzer = new \Alexandria\Core\Services\Writing\SectionContentAnalyzer();

    // 500 words at 250 words/page => 2 pages.
    $content = implode(' ', array_fill(0, 500, 'word'));

    $result = $analyzer->analyze($content, 'prose');

    expect($result->pageEstimate)->toBe(2);
});

it('keeps a one-page floor for short prose', function () {
    $analyzer = new \Alexandria\Core\Services\Writing\SectionContentAnalyzer();

    expect($analyzer->analyze('just a few words', 'prose')->pageEstimate)->toBe(1);
    expect($analyzer->analyze('', 'prose')->pageEstimate)->toBe(0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd C:\Websites\alexandria\alexandria-core; vendor/bin/pest --filter="prose pages"`
Expected: FAIL — `pageEstimate` is `null` for prose.

- [ ] **Step 3: Implement**

In `SectionContentAnalyzer::analyze()`, replace the screenplay-only estimate block:

```php
        $pageEstimate = null;

        if ($format === 'screenplay') {
            $linesPerPage = max(1, (int) config('alexandria.writing.formats.screenplay.lines_per_page', 55));
            $pageEstimate = (int) ceil($lineCount / $linesPerPage);
        } else {
            $wordsPerPage = max(1, (int) config('alexandria.writing.formats.prose.words_per_page', 250));
            $pageEstimate = (int) ceil($wordCount / $wordsPerPage);
        }
```

In `config/alexandria.php`, add `'words_per_page' => 250` under a `formats.prose` key beside the existing `formats.screenplay` block (match the file's existing structure and comment style).

- [ ] **Step 4: Run the analyzer suite**

Run: `cd C:\Websites\alexandria\alexandria-core; vendor/bin/pest --filter=SectionContentAnalyzer`
Expected: PASS (new tests + all existing analyzer tests — the screenplay branch is untouched).

- [ ] **Step 5: Commit**

```bash
cd C:\Websites\alexandria\alexandria-core
vendor/bin/pint --dirty --format agent
git add -A src config tests
git commit -m "feat(writing): deterministic prose page estimates (250 words/page, configurable)"
```

---

### Task 3: Cross-parent section moves — drag + "Move to…" menu

**Files:**
- Modify: `alexandria-core/resources/js/hooks/useSortableReorder.ts`
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/Navigator.tsx`
- Create: `alexandria-core/resources/js/pages/Writing/Sections/MoveSectionModal.tsx`
- Modify: `alexandria-core/lang/en/writing.php` (new keys)
- Test: `alexandria-app/tests/Browser/Writing/SectionMoveTest.php` (create)

**Interfaces:**
- Consumes: existing `works.sections.move` endpoint — `PUT /works/{project}/{work}/sections/{id}/move` with `{ parent_id: number|null, position: number }`; server rejects cycles with 422.
- Produces: `useSortableReorder` gains an optional `options` parameter: `{ group?: string; onMoveAcross?: (sectionId: number, toParentId: number | null, newIndex: number) => void }`. Container elements must carry `data-sortable-parent` (`'root'` or the parent id) and draggable items `data-section-id`.

- [ ] **Step 1: Write the failing browser test (menu path — deterministic, unlike drag)**

Create `alexandria-app/tests/Browser/Writing/SectionMoveTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use App\Models\User;

it('moves a section under a new parent via the Move to menu', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner_id' => $user->id]);
    $work = Work::factory()->create(['project_id' => $project->id]);
    $act1 = $work->sections()->create(['title' => 'Act One']);
    $act2 = $work->sections()->create(['title' => 'Act Two']);
    $scene = $work->sections()->create(['title' => 'Floating Scene', 'parent_id' => $act1->id]);

    $page = visit("/works/{$project->slug}/{$work->slug}/{$scene->slug}")->actingAs($user);

    $page->click("[data-writing-section-menu=\"{$scene->id}\"]")
        ->click(__('alexandria::writing.workspace.move_section'))
        ->select('parent_id', (string) $act2->id)
        ->press(__('alexandria::writing.workspace.move_confirm'));

    expect($scene->fresh()->parent_id)->toBe($act2->id);
});

it('excludes the section and its descendants from the parent picker', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner_id' => $user->id]);
    $work = Work::factory()->create(['project_id' => $project->id]);
    $parent = $work->sections()->create(['title' => 'Parent']);
    $child = $work->sections()->create(['title' => 'Child', 'parent_id' => $parent->id]);

    $page = visit("/works/{$project->slug}/{$work->slug}/{$parent->slug}")->actingAs($user);

    $page->click("[data-writing-section-menu=\"{$parent->id}\"]")
        ->click(__('alexandria::writing.workspace.move_section'))
        ->assertDontSee('Child');
});
```

(Match sibling browser suites' helper conventions as in Task 1.)

- [ ] **Step 2: Run to verify failure**

Run: `cd C:\Websites\alexandria\alexandria-app; php artisan test --compact tests/Browser/Writing/SectionMoveTest.php`
Expected: FAIL — no "Move to…" menu item exists.

- [ ] **Step 3: Extend useSortableReorder with cross-container support**

Replace `alexandria-core/resources/js/hooks/useSortableReorder.ts` body (keeping the existing docblock, extending it):

```ts
import { useEffect, useRef, type RefObject } from 'react';
import Sortable, { type SortableEvent } from 'sortablejs';

export interface SortableReorderOptions {
    /** Shared SortableJS group name enabling drags across containers. */
    group?: string;
    /**
     * Cross-container drop handler. Containers must set
     * `data-sortable-parent` ('root' or a parent id) and items
     * `data-section-id`. The DOM mutation is reverted before this
     * fires — the caller persists the move and lets fresh props
     * re-render the tree.
     */
    onMoveAcross?: (itemId: number, toParentId: number | null, newIndex: number) => void;
}

export function useSortableReorder(
    ref: RefObject<HTMLElement | null>,
    onReorder: (oldIndex: number, newIndex: number) => void,
    enabled: boolean = true,
    options?: SortableReorderOptions,
): void {
    const onReorderRef = useRef(onReorder);
    onReorderRef.current = onReorder;
    const onMoveAcrossRef = useRef(options?.onMoveAcross);
    onMoveAcrossRef.current = options?.onMoveAcross;
    const group = options?.group;

    useEffect(() => {
        if (!enabled) return;
        const el = ref.current;
        if (!el) return;

        const sortable = Sortable.create(el, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'opacity-30',
            ...(group ? { group } : {}),
            onEnd: (evt: SortableEvent) => {
                const { oldIndex, newIndex, from, to, item } = evt;
                if (oldIndex == null || newIndex == null) return;

                // Revert SortableJS's DOM mutation so React remains the
                // source of truth (same-list and cross-list alike).
                if (item.parentNode) {
                    item.parentNode.removeChild(item);
                }
                const refNode = from.children[oldIndex];
                if (refNode) {
                    from.insertBefore(item, refNode);
                } else {
                    from.appendChild(item);
                }

                if (to !== from) {
                    const parentAttr = to.getAttribute('data-sortable-parent');
                    const itemId = Number(item.getAttribute('data-section-id'));
                    if (parentAttr !== null && Number.isFinite(itemId)) {
                        onMoveAcrossRef.current?.(
                            itemId,
                            parentAttr === 'root' ? null : Number(parentAttr),
                            newIndex,
                        );
                    }
                    return;
                }

                onReorderRef.current(oldIndex, newIndex);
            },
        });

        return () => sortable.destroy();
    }, [ref, enabled, group]);
}
```

Check existing callers of `useSortableReorder` (grep the repo) — the new parameter is optional, so no caller changes are required; confirm none pass a 4th argument already.

- [ ] **Step 4: Wire the Navigator**

In `alexandria-core/resources/js/pages/Writing/Sections/Navigator.tsx`:

(a) Add a descendant guard + move helper near `findNodeBySlug`:

```tsx
function findNodeById(nodes: SectionNode[], id: number): SectionNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNodeById(node.children, id);
        if (found !== null) return found;
    }
    return null;
}

/** True when `candidateId` is `nodeId` itself or inside its subtree. */
function isSelfOrDescendant(nodes: SectionNode[], nodeId: number, candidateId: number | null): boolean {
    if (candidateId === null) return false;
    const node = findNodeById(nodes, nodeId);
    if (node === null) return false;
    const walk = (n: SectionNode): boolean =>
        n.id === candidateId || n.children.some(walk);
    return walk(node);
}
```

(b) In the `Navigator` component add a `moveSection` function and a `moveTarget` state (mirroring `renameTarget`):

```tsx
    const [moveTarget, setMoveTarget] = useState<SectionNode | null>(null);

    function moveSection(sectionId: number, toParentId: number | null, position: number) {
        if (isSelfOrDescendant(sections, sectionId, toParentId)) {
            return; // dropping a parent into its own subtree — ignore
        }
        if (toParentId !== null) {
            setExpanded((prev) => new Set(prev).add(toParentId));
        }
        router.put(
            `/works/${projectSlug}/${workSlug}/sections/${sectionId}/move`,
            { parent_id: toParentId, position },
            { preserveScroll: true, preserveState: true, only: ['sections'] },
        );
    }
```

(c) Thread it through `TreeShared` (add `onMove: (sectionId: number, toParentId: number | null, position: number) => void;` and `onMoveTo: (node: SectionNode) => void;` to the interface; set `onMove: moveSection, onMoveTo: setMoveTarget` in `shared`).

(d) In `SiblingGroup`: mark the container and pass the group options —

```tsx
    useSortableReorder(
        groupRef,
        (oldIndex, newIndex) => { /* existing body unchanged */ },
        shared.canUpdate,
        {
            group: 'writing-sections',
            onMoveAcross: (sectionId, toParentId, newIndex) =>
                shared.onMove(sectionId, toParentId, newIndex),
        },
    );

    return (
        <div ref={groupRef} data-sortable-parent={parentId ?? 'root'} className="flex flex-col gap-0.5">
```

(e) In `NavigatorRow`: add `data-section-id={node.id}` to the outer wrapper `div` (the SortableJS item), and add a menu entry after "Rename section":

```tsx
                                    {
                                        label: t('writing.workspace.move_section'),
                                        icon: 'fa-arrows-up-down-left-right',
                                        onClick: () => shared.onMoveTo(node),
                                    },
```

(f) Render the modal beside `RenameSectionModal`:

```tsx
            {moveTarget !== null && (
                <MoveSectionModal
                    projectSlug={projectSlug}
                    workSlug={workSlug}
                    section={moveTarget}
                    sections={sections}
                    onMove={moveSection}
                    onClose={() => setMoveTarget(null)}
                />
            )}
```

- [ ] **Step 5: Create MoveSectionModal**

Create `alexandria-core/resources/js/pages/Writing/Sections/MoveSectionModal.tsx`:

```tsx
import { useState } from 'react';

import Button from '@alexandria/components/ui/Button';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

import type { SectionNode } from '../Workspace';

/**
 * "Move to…" parent picker — Stage 11 Slice 1. The accessible /
 * deep-tree alternative to cross-parent drag. Options are every
 * section except the moving node's own subtree, plus top level; the
 * move appends at the end of the chosen parent's children.
 */
export default function MoveSectionModal({
    projectSlug: _projectSlug,
    workSlug: _workSlug,
    section,
    sections,
    onMove,
    onClose,
}: {
    projectSlug: string;
    workSlug: string;
    section: SectionNode;
    sections: SectionNode[];
    onMove: (sectionId: number, toParentId: number | null, position: number) => void;
    onClose: () => void;
}) {
    const t = useT();
    const [parentId, setParentId] = useState<string>(section.parent_id === null ? 'root' : String(section.parent_id));

    interface Option {
        id: number;
        title: string;
        depth: number;
        childCount: number;
    }

    const options: Option[] = [];
    const collect = (nodes: SectionNode[], depth: number) => {
        for (const node of nodes) {
            if (node.id === section.id) continue; // self + subtree excluded
            options.push({ id: node.id, title: node.title, depth, childCount: node.children.length });
            collect(node.children, depth + 1);
        }
    };
    collect(sections, 0);

    function submit() {
        const toParentId = parentId === 'root' ? null : Number(parentId);
        const position = toParentId === null
            ? sections.length
            : options.find((o) => o.id === toParentId)?.childCount ?? 0;
        onMove(section.id, toParentId, position);
        onClose();
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={t('writing.workspace.move_section')} onClose={onClose} />
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <div className="grid gap-2 px-6 py-5">
                    <label className="text-sm font-medium" htmlFor="move-section-parent">
                        {t('writing.workspace.move_target_label')}
                    </label>
                    <select
                        id="move-section-parent"
                        name="parent_id"
                        className="alex-input w-full"
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                    >
                        <option value="root">{t('writing.workspace.move_top_level')}</option>
                        {options.map((o) => (
                            <option key={o.id} value={o.id}>
                                {'—'.repeat(o.depth)} {o.title}
                            </option>
                        ))}
                    </select>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button type="submit">{t('writing.workspace.move_confirm')}</Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
```

Notes for the implementer: check `SectionNode` in `Workspace.tsx` — if it lacks `parent_id`, default the picker to `'root'` instead of reading it. Check the repo's native-select styling (`alex-input` vs a `form/Select` component — grep for an existing styled `<select>` in `resources/js/components/form/` and use that component if one exists).

- [ ] **Step 6: Add the lang keys**

In `alexandria-core/lang/en/writing.php`, inside the `workspace` group:

```php
        'move_section' => 'Move to…',
        'move_target_label' => 'New parent',
        'move_top_level' => 'Top level',
        'move_confirm' => 'Move',
```

- [ ] **Step 7: Run the browser tests**

Run: `cd C:\Websites\alexandria\alexandria-app; php artisan test --compact tests/Browser/Writing/SectionMoveTest.php`
Expected: PASS (both tests).

- [ ] **Step 8: Manual drag smoke (operator note)**

Drag a section between two parent groups at `alexandria.test` — verify it lands and persists after reload, and that dragging a parent into its own child group is a no-op. (SortableJS drag is not covered by the browser suite — this is a manual QA checklist item.)

- [ ] **Step 9: Commit**

```bash
cd C:\Websites\alexandria\alexandria-core
git add resources/js/hooks/useSortableReorder.ts resources/js/pages/Writing/Sections/Navigator.tsx resources/js/pages/Writing/Sections/MoveSectionModal.tsx lang/en/writing.php
git commit -m "feat(writing): cross-parent section moves via drag and Move-to menu"

cd C:\Websites\alexandria\alexandria-app
git add tests/Browser/Writing/SectionMoveTest.php
git commit -m "test(writing): browser coverage for cross-parent section moves"
```

---

### Task 4: Pagination preview in print layout

**Files:**
- Create: `alexandria-core/resources/js/pages/Writing/Sections/PageBreakGuides.tsx`
- Create: `alexandria-core/resources/js/pages/Writing/Sections/pageBreakMath.ts`
- Create: `alexandria-core/resources/js/pages/Writing/Sections/pageBreakMath.test.ts`
- Modify: `alexandria-core/resources/js/components/editor/RichTextEditor.tsx` (manuscript print-layout branch, around lines 860–886)
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/WorkspaceStatusBar.tsx` (page readout)
- Modify: `alexandria-core/lang/en/writing.php`

**Interfaces:**
- Consumes: `printLayout` boolean already threaded into `RichTextEditor`; `page_estimate` already returned by the autosave endpoint (now non-null for prose after Task 2) and flowing through the existing `onCounts` callback.
- Produces: `computePageBreaks(contentHeightPx, pageHeightPx): number[]` (pure, tested) returning divider offsets; `<PageBreakGuides linesPerPage={n} />` rendered inside the print-layout wrapper.

**Design:** geometric, deterministic, labeled as an estimate. Page height = `linesPerPage × line-height` of the rendered `.ProseMirror` (prose 25 double-spaced manuscript lines, screenplay 55 — the same constant family the analyzer uses server-side). Dividers are absolutely-positioned dashed lines with a page number chip. The status bar shows `~p. N` from the server's `page_estimate`.

- [ ] **Step 1: Write the failing Vitest for the math**

Create `pageBreakMath.ts`'s test first — `pageBreakMath.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { computePageBreaks } from './pageBreakMath';

describe('computePageBreaks', () => {
    it('returns one divider per full page boundary inside the content', () => {
        // 2500px of content at 1000px pages => dividers at 1000 and 2000.
        expect(computePageBreaks(2500, 1000)).toEqual([1000, 2000]);
    });

    it('returns no dividers when content fits one page', () => {
        expect(computePageBreaks(900, 1000)).toEqual([]);
    });

    it('handles zero and negative inputs safely', () => {
        expect(computePageBreaks(0, 1000)).toEqual([]);
        expect(computePageBreaks(1000, 0)).toEqual([]);
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd C:\Websites\alexandria\alexandria-core; npx vitest run resources/js/pages/Writing/Sections/pageBreakMath.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the math module**

Create `pageBreakMath.ts`:

```ts
/**
 * Divider offsets (px from content top) for the print-layout pagination
 * preview — Stage 11 Slice 1. Pure geometry: one divider per full page
 * boundary strictly inside the content. Deterministic estimate only;
 * real pagination arrives with export.
 */
export function computePageBreaks(contentHeightPx: number, pageHeightPx: number): number[] {
    if (contentHeightPx <= 0 || pageHeightPx <= 0) {
        return [];
    }

    const breaks: number[] = [];
    for (let y = pageHeightPx; y < contentHeightPx; y += pageHeightPx) {
        breaks.push(y);
    }
    return breaks;
}

/** Manuscript-convention lines per page, mirroring the server analyzer family. */
export const LINES_PER_PAGE: Record<'prose' | 'screenplay', number> = {
    prose: 25,
    screenplay: 55,
};
```

- [ ] **Step 4: Run to verify pass**

Run: `cd C:\Websites\alexandria\alexandria-core; npx vitest run resources/js/pages/Writing/Sections/pageBreakMath.test.ts`
Expected: PASS

- [ ] **Step 5: Create PageBreakGuides**

Create `PageBreakGuides.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';

import useT from '@alexandria/hooks/useT';

import { computePageBreaks } from './pageBreakMath';

/**
 * Print-layout pagination preview — dashed page-boundary guides with
 * page-number chips, absolutely positioned over the manuscript. Mount
 * as a sibling of the editor content inside a `relative` wrapper; it
 * measures the nearest `.ProseMirror` via ResizeObserver.
 */
export default function PageBreakGuides({ linesPerPage }: { linesPerPage: number }) {
    const t = useT();
    const hostRef = useRef<HTMLDivElement>(null);
    const [breaks, setBreaks] = useState<number[]>([]);

    useEffect(() => {
        const host = hostRef.current;
        const prose = host?.parentElement?.querySelector<HTMLElement>('.ProseMirror');
        if (!host || !prose) return;

        const measure = () => {
            const lineHeight = parseFloat(getComputedStyle(prose).lineHeight) || 0;
            const pageHeight = lineHeight * linesPerPage;
            // Offset guides by the prose block's position inside the
            // scroll container so page 1 starts at the text top.
            const top = prose.offsetTop;
            setBreaks(computePageBreaks(prose.scrollHeight, pageHeight).map((y) => y + top));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(prose);
        return () => observer.disconnect();
    }, [linesPerPage]);

    return (
        <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
            {breaks.map((y, i) => (
                <div
                    key={y}
                    className="absolute right-0 left-0 border-t border-dashed"
                    data-page-break={i + 2}
                    style={{
                        top: `${y}px`,
                        borderColor: 'color-mix(in srgb, var(--theme-base-content) 22%, transparent)',
                    }}
                >
                    <span
                        className="absolute -top-2.5 right-2 px-1.5 font-mono text-[10px]"
                        style={{
                            color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
                            background: 'var(--theme-base-surface)',
                            borderRadius: 'var(--theme-radius-badge)',
                        }}
                    >
                        {t('writing.workspace.page_break_label').replace(':page', String(i + 2))}
                    </span>
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 6: Mount it in RichTextEditor's manuscript print branch**

In `RichTextEditor.tsx` (the `isManuscript` branch, currently lines ~878–885), make the editor row `relative` and mount the guides when `printLayout` is on. The inner block becomes:

```tsx
                        <div className="relative flex min-h-0 flex-1">
                            {printLayout && <ManuscriptRuler orientation="vertical" />}
                            <div className="relative min-h-0 flex-1">
                                <EditorContent
                                    editor={editor}
                                    className="tiptap-editor writing-workspace-scroll h-full min-h-0 overflow-y-auto"
                                    onMouseDown={handleGutterMouseDown}
                                />
                                {printLayout && (
                                    <PageBreakGuides linesPerPage={variant === 'manuscript' && screenplayMode ? 55 : 25} />
                                )}
                            </div>
                        </div>
```

Implementer notes: (1) import `PageBreakGuides` and `LINES_PER_PAGE` — prefer `LINES_PER_PAGE[format]`; check how `RichTextEditor` knows screenplay vs prose (grep its props for `screenplay`/`format` — the ScreenplayEditor is a separate component, so inside `RichTextEditor` the manuscript variant is prose: if no screenplay signal exists here, pass `linesPerPage={LINES_PER_PAGE.prose}` unconditionally and let `ScreenplayEditor` adopt guides separately later). (2) The guides overlay must live INSIDE the scroll container element so guides scroll with content — if `EditorContent` is itself the scroll container, wrap guides+content exactly as shown and move `overflow-y-auto` to the new wrapper `div` instead. Verify by scrolling: dividers stay glued to text.

- [ ] **Step 7: Status-bar page readout**

In `WorkspaceStatusBar.tsx`, locate where the word count renders (grep `word_count` / `words`), and add a page segment beside it that renders only when a `pageEstimate` value is present (thread it from the Workspace's existing counts state — the autosave response already carries `page_estimate` through `onCounts`; check `useSectionAutosave`'s `SectionCountsCallback` signature and extend the Workspace state if it currently drops `page_estimate`):

```tsx
            {pageEstimate !== null && pageEstimate > 0 && (
                <span className="tabular-nums" title={t('writing.workspace.page_estimate_title')}>
                    {t('writing.workspace.page_estimate').replace(':pages', pageEstimate.toLocaleString())}
                </span>
            )}
```

- [ ] **Step 8: Lang keys**

In `alexandria-core/lang/en/writing.php` `workspace` group:

```php
        'page_break_label' => 'p. :page',
        'page_estimate' => '~:pages p.',
        'page_estimate_title' => 'Estimated pages (deterministic estimate — real pagination arrives with export)',
```

- [ ] **Step 9: Full Vitest + visual check**

Run: `cd C:\Websites\alexandria\alexandria-core; npx vitest run`
Expected: PASS (all suites).

Manual: open a long prose section at `alexandria.test`, toggle print layout — dashed page guides appear, scroll with content, and the status bar shows `~N p.`.

- [ ] **Step 10: Commit**

```bash
cd C:\Websites\alexandria\alexandria-core
git add resources/js/pages/Writing/Sections/PageBreakGuides.tsx resources/js/pages/Writing/Sections/pageBreakMath.ts resources/js/pages/Writing/Sections/pageBreakMath.test.ts resources/js/components/editor/RichTextEditor.tsx resources/js/pages/Writing/Sections/WorkspaceStatusBar.tsx lang/en/writing.php
git commit -m "feat(writing): pagination preview guides + page readout in print layout"
```

---

### Task 5: Global Writing nav entry + hub enrichment

**Files:**
- Modify: the global navbar component in `alexandria-core` (locate via `grep -rn "AppLayout" alexandria-core/resources/js/layouts/` — the nav-items block that renders global links; `pages/Writing/Index.tsx:61` shows pages wrap in `AppLayout`)
- Modify: `alexandria-app/app/Http/Controllers/Writing/WritingDashboardController.php`
- Modify: `alexandria-core/resources/js/pages/Writing/Dashboard.tsx`
- Modify: `alexandria-core/lang/en/writing.php`
- Test: `alexandria-app/tests/Feature/Writing/WritingDashboardTest.php` (extend if it exists, else create)

**Interfaces:**
- Consumes: existing `writing.index` route (`GET /writing`), existing Dashboard page + `projects` prop shape (see controller).
- Produces: two new Inertia props on `Writing/Dashboard` — `recentSections: Array<{ id, title, slug, work_slug, work_title, project_slug, updated_at, word_count }>` and `continueUrl: string | null`.

- [ ] **Step 1: Write the failing feature test**

In `alexandria-app/tests/Feature/Writing/WritingDashboardTest.php` (match existing writing feature-test setup conventions):

```php
it('ships recent sections and a continue-writing deep link', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner_id' => $user->id]);
    $work = Work::factory()->create(['project_id' => $project->id]);
    $older = $work->sections()->create(['title' => 'Older']);
    $newest = $work->sections()->create(['title' => 'Newest']);
    $older->update(['updated_at' => now()->subDay()]);

    $this->actingAs($user)
        ->get('/writing')
        ->assertInertia(fn ($page) => $page
            ->component('Writing/Dashboard')
            ->has('recentSections', 2)
            ->where('recentSections.0.title', 'Newest')
            ->where('continueUrl', "/works/{$project->slug}/{$work->slug}/{$newest->slug}"));
});

it('sends null continueUrl when the user has no sections', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/writing')
        ->assertInertia(fn ($page) => $page->where('continueUrl', null));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd C:\Websites\alexandria\alexandria-app; php artisan test --compact --filter=WritingDashboardTest`
Expected: FAIL — `recentSections` prop missing.

- [ ] **Step 3: Extend the controller**

In `WritingDashboardController::__invoke()`, after the `$projects` query, add:

```php
        $accessibleProjectIds = $projects->pluck('id');

        $recentSections = WorkSection::query()
            ->whereHas('work', fn ($q) => $q->whereIn('project_id', $accessibleProjectIds))
            ->with('work.project:id,slug')
            ->orderByDesc('updated_at')
            ->limit(8)
            ->get()
            ->map(fn (WorkSection $section): array => [
                'id' => $section->id,
                'title' => $section->title,
                'slug' => $section->slug,
                'work_slug' => $section->work->slug,
                'work_title' => $section->work->title,
                'project_slug' => $section->work->project->slug,
                'word_count' => $section->word_count,
                'updated_at' => $section->updated_at?->toIso8601String(),
            ]);

        $latest = $recentSections->first();
```

and add to the `Inertia::render` payload:

```php
            'recentSections' => $recentSections->values(),
            'continueUrl' => $latest !== null
                ? "/works/{$latest['project_slug']}/{$latest['work_slug']}/{$latest['slug']}"
                : null,
```

Add `use Alexandria\Core\Models\Writing\WorkSection;` to the imports. Check the `WorkSection` model for a `project` accessor through `work` — the `with('work.project:id,slug')` eager load requires `Work::project()` to exist (it does; `Project::works()` is the inverse).

- [ ] **Step 4: Run the feature tests to verify pass**

Run: `cd C:\Websites\alexandria\alexandria-app; php artisan test --compact --filter=WritingDashboardTest`
Expected: PASS

- [ ] **Step 5: Enrich Dashboard.tsx**

In `alexandria-core/resources/js/pages/Writing/Dashboard.tsx`: add the two props to the page's prop types, render (a) a **Continue writing** button at the top when `continueUrl` is non-null (primary `ButtonLink`/`Link` to the URL, label `t('writing.dashboard.continue')`), and (b) a **Recent sections** list (title, work title, project, relative updated time — reuse the page's existing card/list styling; each row links to `/works/{project_slug}/{work_slug}/{slug}`). Follow the page's existing layout and empty-state patterns — read the file before editing.

- [ ] **Step 6: Global nav entry**

Locate the global navbar (the `AppLayout` chrome in `alexandria-core/resources/js/layouts/`). Add a Writing link pointing at `/writing` beside the existing global items, gated the same way those items are (auth-only), with icon `fa-feather` (matching the project sidebar's writing icon) and label `t('writing.dashboard.nav')`. Follow the exact markup pattern of the neighboring nav items — do not invent a new pattern.

- [ ] **Step 7: Lang keys**

In `alexandria-core/lang/en/writing.php`, add a `dashboard` group (or extend it if present):

```php
        'nav' => 'Writing',
        'continue' => 'Continue writing',
        'recent_sections' => 'Recent sections',
```

(Verify against Dashboard.tsx's existing key group — if the page already uses `writing.dashboard.*` keys, merge instead of duplicating.)

- [ ] **Step 8: Browser smoke**

Add to `SectionRenameUrlTest.php`'s suite directory a hub smoke `alexandria-app/tests/Browser/Writing/WritingHubTest.php`:

```php
it('reaches the writing hub from the global nav and continues writing', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner_id' => $user->id]);
    $work = Work::factory()->create(['project_id' => $project->id]);
    $section = $work->sections()->create(['title' => 'My Scene']);

    $page = visit('/dashboard')->actingAs($user);

    $page->click(__('alexandria::writing.dashboard.nav'))
        ->assertUrlContains('/writing')
        ->click(__('alexandria::writing.dashboard.continue'))
        ->assertUrlContains($section->slug);
});
```

Run: `cd C:\Websites\alexandria\alexandria-app; php artisan test --compact tests/Browser/Writing/WritingHubTest.php`
Expected: PASS (adjust the starting URL to wherever the global navbar is visible — check sibling browser tests).

- [ ] **Step 9: Commit**

```bash
cd C:\Websites\alexandria\alexandria-app
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Writing/WritingDashboardController.php tests/Feature/Writing/WritingDashboardTest.php tests/Browser/Writing/WritingHubTest.php
git commit -m "feat(writing): recent sections + continue-writing on the global hub"

cd C:\Websites\alexandria\alexandria-core
git add resources/js/pages/Writing/Dashboard.tsx resources/js/layouts lang/en/writing.php
git commit -m "feat(writing): global Writing nav entry + hub continue/recents UI"
```

---

## Plan self-review notes

- Spec coverage: Slice 1's four items map to Tasks 1, 3, 4 (2 is 4's server-side prerequisite), 5. Slices 2–4 get their own plans when they start.
- The riskiest assumptions are called out inline as implementer verification notes: the Inertia client-side `router.replace` signature (Task 1 Step 1), `SectionNode.parent_id` presence (Task 3 Step 5), the scroll-container element in RichTextEditor (Task 4 Step 6), and existing `writing.dashboard.*` keys (Task 5 Step 7).
- Factories: browser/feature tests assume `Work` has a factory and `sections()->create()` works with title-only payloads (slugs auto-generate) — both patterns come from the existing 8g.1 test suites; implementers must mirror the closest sibling test's setup.
