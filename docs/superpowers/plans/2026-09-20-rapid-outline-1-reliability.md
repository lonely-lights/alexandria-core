# Rapid Outline Reliability Implementation Plan

## Execution status

Implemented 2026-09-20. [Actual validation, adjustments, and limitations](2026-09-20-rapid-outline-closeout.md). The approved step-by-step recipe below is retained as reference; the task ledger records delivery, not an assertion that every proposed red/green command or commit boundary was followed verbatim.

- [x] Task 1: Hierarchy transformations
- [x] Task 2: Draft identity and meaningful-row persistence
- [x] Task 3: Atomic lossless conversion
- [x] Task 4: Single-flight saving and version locks
- [x] Task 5: Draft-preserving conflict recovery
- [x] Task 6: Writer workflow and modal acceptance

## Approved implementation recipe

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execute inline unless delegation is explicitly requested. Steps use checkbox (`- `) syntax for tracking.

**Goal:** Make keyboard outlining predictable and preserve every meaningful draft edit through saving, conversion, and conflict handling.

**Architecture:** Retain the actual WorkSection tree and structured bulk endpoint. Extract small pure hierarchy/draft/merge helpers, a single-flight save queue, and focused server projection/apply services rather than further expanding OutlineView and WorkOutlineController. All outline consumers keep the same row model.

**Tech Stack:** Laravel 13, PHP 8.4+, PostgreSQL, React 19, TypeScript, Inertia 3, Vitest, Pest 4 browser tests.

**Spec:** [Combined design](../specs/2026-09-20-rapid-outline-and-pacing-design.md), supplementing [August](../specs/2026-08-28-outline-mode-design.md).

## Global constraints

- One source of truth: WorkSections plus JSON beats. No second outline document.
- Preserve the title-adjacent plan modal, selectable reading text, explicit Edit, and line breaks.
- New UI copy lives in core `lang/en/writing.php`; no new dependencies.
- Core is public and generic. No private content or live work IDs in tracked examples/tests.
- Do not edit vendor. Run host tests from `alexandria-app`; change library code in `alexandria-core`.
- Existing migration files are edited in place under alpha policy; never run migrate:fresh against the live database.
- User approved the combined direction on 2026-09-20. This plan is not evidence that implementation has happened.

## Execution setup and file map

Paths prefixed `core/` mean `C:/Websites/alexandria/alexandria-core/`; `app/` means the sibling host repo. Use a coordinated `feat/rapid-outline-pacing` branch in each repo at execution time, preserving unrelated changes. If isolating with worktrees, preserve Composer path-repo wiring; do not assume a second app points at the second core automatically.

Read the host AGENTS and domain skills. Before code changes, use available Laravel Boost version-specific documentation for validation, transactions, and Inertia lifecycle. Inspect both repos' current status. Existing app subject-workbench planning files are unrelated and must remain untouched.

New production files:

| Path | Responsibility |
|---|---|
| core/src/Services/Writing/OutlineHierarchy.php | Configured section-tier defaults overlaid by existing tree labels |
| core/src/Services/Writing/WorkMutationLock.php | Ordered work-row locks for transactions modifying writing structure |
| core/resources/js/pages/Writing/Outline/outlineDraft.ts | Placeholder filtering and stable draft identity |
| core/resources/js/pages/Writing/Outline/outlineMerge.ts | Three-way draft/server merge and explicit conflicts |
| core/resources/js/pages/Writing/Outline/OutlineSaveQueue.ts | Single in-flight request, acknowledgement and dirty generations |
| core/resources/js/pages/Writing/Outline/OutlineConflictNotice.tsx | Recovery/merge choices and copyable local outline |
| app/app/Services/Writing/Outline/OutlineProjection.php | Existing projection plus hierarchy, eligibility, and fingerprint |
| app/app/Services/Writing/Outline/OutlineApply.php | Existing bulk writes and atomic conversion preflight |
| app/app/Services/Writing/Outline/OutlineConversionGuard.php | Authoritative lossless-conversion eligibility |

Keep existing `outlineTypes.ts`, `outlineReducer.ts`, `outlinePayload.ts`, `parseOutlinePaste.ts`, `useOutlineSync.ts`, and `OutlineView.tsx` as their respective types, transformations, wire format, parser, React adapter, and composed UI. Keep endpoint routes stable. Do not build a general synchronization framework.

## Task 1: Establish stable hierarchy and repair tree transformations

**Files:** Modify core `config/alexandria.php`, `Outline/outlineTypes.ts`, `Outline/outlineReducer.ts`, `Outline/parseOutlinePaste.ts`, `Outline/OutlineView.tsx` (all Outline paths under `resources/js/pages/Writing/`). Create core `src/Services/Writing/OutlineHierarchy.php`. Modify app `app/Http/Controllers/Writing/WorkOutlineController.php`. Test app `resources/js/editor/tests/outline-view.test.ts`, `outline-parse.test.ts`, and `tests/Feature/Writing/WorkOutlineControllerTest.php`.

**Interfaces:**

```ts
export interface OutlineTier { label: string; isStructural: boolean }
// Add to OutlineProjection; fetched once and stable until authoritative reload.
// hierarchy: OutlineTier[]
// Add isStructural, hasContent, canBecomeBeat, conversionBlockedReason to OutlineRow.
// Server row names: is_structural, has_content, canBecomeBeat, conversionBlockedReason.
export interface OutlineReducerContext { hierarchy: OutlineTier[] }
// Add optional context argument during migration of existing callers.
// All production callers must supply the server-resolved context by task completion.
```

PHP `OutlineHierarchy::resolve(Work $work, Collection $sections): array` returns the tier list. Add optional `alexandria.writing.outline_hierarchies` config by type; defaults are derived from existing templates, not hardcoded in React. Overlay actual tree labels/structural flags, fill absent depths from the template. In mixed-depth custom trees, preserve labels and choose branch-local defaults before the global tier label. Never shrink the tier list as rows are temporarily removed.

-  Add concrete regression cases before changing the reducer:

```ts
const hierarchy = [
    { label: 'Act', isStructural: true },
    { label: 'Scene', isStructural: false },
];
const act = { key: 'a', sectionId: 1, tempId: null, parentKey: null,
    depth: 0, label: 'Act', title: 'Act', slug: 'act', synopsis: null,
    beats: [], isStructural: true, hasContent: false, canBecomeBeat: false };
const fresh = { ...act, key: 't-b', sectionId: null, tempId: 't-b',
    title: 'First scene', isStructural: false, canBecomeBeat: true };
const result = outlineReducer([act, fresh], { type: 'indent', key: 't-b' }, { hierarchy });
expect(result.rows).toHaveLength(2);
expect(result.rows[1]).toMatchObject({ parentKey: 'a', depth: 1, label: 'Scene' });
expect(result.rows[0].beats).toEqual([]);
```

Add cases: outdent B from `[A, B(child A), C(child A)]` produces `[A, C, B]`; indent following a populated sibling selects that sibling rather than its last child; moving a parent moves all descendants; beat promotion creates a sibling content section; structural-container beat promotion creates a child; empty novel starts Chapter; custom labels survive; paste into only an Act creates Scene then beats at deeper indentation; tab/2-space paste and synopsis delimiters retain their existing behavior.
-  Run `npm.cmd run test:run -- resources/js/editor/tests/outline-view.test.ts resources/js/editor/tests/outline-parse.test.ts` from app. Confirm new regressions fail for the intended behavior.
-  Implement hierarchy projection, first-row creation, and context-aware transformations. For outdent, remove the entire source subtree, compute the former parent's remaining subtree end, insert after it, then adjust depth/parent. For indent, find the previous sibling by parentKey, move under it, and retain preorder contiguity. Test invariants after every operation: unique keys, parent precedes child, depth equals parent depth + 1, descendants contiguous.
-  Cover endpoint hierarchy projection with screenplay, novel, empty, and customized-tree factories. Run `php artisan test --compact tests/Feature/Writing/WorkOutlineControllerTest.php`, then the targeted Vitest pair again.
-  Commit only Task 1 changes in each repo: `fix(writing): make outline hierarchy transformations predictable`.

## Task 2: Preserve draft identity and persist completed work beside blank rows

**Files:** Create core `Outline/outlineDraft.ts`. Modify core `Outline/outlineTypes.ts`, `outlinePayload.ts`, `OutlineView.tsx`, and `lang/en/writing.php`. Test app `resources/js/editor/tests/outline-payload.test.ts`; create app `resources/js/editor/tests/outline-draft.test.ts` and `outline-focus.test.tsx`.

**Interfaces:**

```ts
export interface PreparedOutlineDraft {
    rows: OutlineRow[]; // serializable rows, keeping stable keys
    placeholderKeys: string[];
}
export function prepareOutlineDraft(rows: OutlineRow[], untitled: string): PreparedOutlineDraft;
// reconcileTempIds keeps key/parentKey unchanged and fills sectionId.
// buildOutlinePayload resolves parent IDs via the current row map, not key prefixes.
```

-  Test acknowledgement while focused before editing implementation:

```ts
const input = { key: 't-new', sectionId: null, tempId: 't-new', parentKey: null,
    depth: 0, label: 'Chapter', title: 'Opening', slug: null, synopsis: null, beats: [] };
const [saved] = reconcileTempIds([input], { 't-new': 72 });
expect(saved.key).toBe('t-new');
expect(saved.sectionId).toBe(72);
expect(saved.tempId).toBeNull();
```

Add payload cases: empty temporary leaf omitted; empty beat omitted; existing blank-titled row retained with localized fallback; unnamed temporary parent of a meaningful child persisted with fallback; meaningful synopsis/metadata prevents omission; unchanged persisted rows always included; child references resolve after parent's acknowledgement. Render a focused title field, acknowledge temp ID, assert same DOM element, selection range, and continued typing.
-  Run `npm.cmd run test:run -- resources/js/editor/tests/outline-payload.test.ts resources/js/editor/tests/outline-draft.test.ts resources/js/editor/tests/outline-focus.test.tsx`; observe intended failures.
-  Implement filtering using the entire row's meaningful data, not only title. Retain focused blank text in draft state; substitute the translated fallback only in the serializable copy. Define one stable key for the row's lifetime and keep all key consumers independent of `s-`/`t-` prefixes. Suppress structure shortcuts during composition and in duration controls when added in Plan 2.
-  Search core `resources/js/pages/Writing` for key-prefix assumptions; update Kanban and sidebar callers if needed. Rerun these tests plus existing `outline-view.test.ts` and `outline-parse.test.ts`.
-  Commit: `fix(writing): keep outline focus and save completed draft rows`.

## Task 3: Make saved-section demotion atomic and lossless

**Files:** Create app `app/Services/Writing/Outline/{OutlineProjection,OutlineApply,OutlineConversionGuard}.php`. Modify app `app/Http/Controllers/Writing/WorkOutlineController.php`; core `Outline/outlineReducer.ts`, `outlineTypes.ts`, `outlinePayload.ts`, `useOutlineSync.ts`, `lang/en/writing.php`. Create app `tests/Feature/Writing/OutlineConversionTest.php`; extend reducer/payload tests.

**Interfaces:** Add an optional `conversions` list to the bulk request:

```ts
export interface OutlineConversion {
    sourceSectionId: number;
    targetKey: string; // client intent; payload converts to parent ID/temp ID
    beatId: string;
}
// Wire shape: { sourceSectionId, targetId: number | string, beatId }
// source must also be in deleted; target beat must exist in submitted target row.
```

PHP `OutlineConversionGuard::reason(WorkSection $section): ?string` returns null or a translation reason key. `OutlineProjection::forWork(Work $work): array` owns the controller's existing projection. `OutlineApply::apply(Work $work, array $data): array` owns bulk mutation, leaving routing and request validation in the controller. No forced conversion branch.

-  Add an endpoint regression using existing `outlineSection`-style factories: create two contentless scene siblings; fetch projection; replace second row with a beat on first; submit explicit deletion/conversion; assert one live section plus exactly one beat. Repeat after editing the source synopsis locally, verifying the composed beat text survives.
-  Add data-driven guard cases for content, child, note, comment, entry mention, thread reference, revision, existing beat, and craft field. On rejection assert the source still exists and no destination beat is inserted. Reject cross-work target/source, missing target beat, reused source IDs, cycles, and absent explicit deletion. A temporary row requires no source deletion but obeys the same lossless-field rules.
-  Run `php artisan test --compact tests/Feature/Writing/OutlineConversionTest.php` and confirm failing assertions before implementation.
-  Extract the existing controller logic without changing normal delete behavior. Preflight every conversion before any bulk mutation. Recheck authoritative relationships and row data in the transaction; reject atomically with a field-addressable 422 reason. Client retains the full draft on failure and exposes Undo conversion to restore the original row. Do not reload over newer edits to recover a blocked operation.
-  Rerun conversion tests, existing `WorkOutlineControllerTest.php`, and reducer/payload tests. Confirm persisted-vs-temporary IDs no longer determine demotion behavior.
-  Commit: `fix(writing): apply section to beat conversions atomically`.

## Task 4: Version checks and single-flight saving

**Files:** Create core `src/Services/Writing/WorkMutationLock.php` and `Outline/OutlineSaveQueue.ts`. Modify core `Outline/useOutlineSync.ts`, `Sections/SectionSaveQueue.ts`, `Sections/WritingSaveContext.tsx`, `Workspace.tsx`; app outline projection/apply services. Apply the shared lock at existing structure mutation seams: core `src/Services/Writing/SectionTreeService.php`, app `app/Http/Controllers/Writing/WorkSectionController.php`, `app/Services/Writing/SectionTransferService.php`, and outline apply. Include create/import/delete/restore structure paths discovered via `rg` of WorkSection create/delete/parent updates; document the audited call sites in the task commit. Test app `tests/Feature/Writing/OutlineConcurrencyTest.php`; create app `resources/js/editor/tests/outline-save-queue.test.ts`.

**Interfaces:**

```ts
export interface OutlineSaveSnapshot {
    rows: OutlineRow[];
    deleted: number[];
    force: number[];
    conversions: OutlineConversion[];
    baseVersion: string;
}
export interface OutlineSaveReply extends OutlineProjection {
    tempIds: Record<string, number>;
    blocked: { sectionId: number; reason: string }[];
}
export type SendOutline = (draft: OutlineSaveSnapshot, keepalive: boolean) => Promise<OutlineSaveReply>;
// OutlineSaveQueue constructor(initial, send); update(draft): void;
// flush(keepalive = false): Promise<boolean>; getSnapshot(); subscribe(listener).
// A rejected send retains dirty state; a typed conflict carries its fresh projection.
```

PHP `WorkMutationLock::run(array $workIds, Closure $callback): mixed` wraps a transaction and locks unique work IDs ascending. Under that lock, outline apply locks existing sections ascending ID, builds the fresh projection/fingerprint, compares baseVersion, validates, applies, and returns the acknowledged projection before releasing the lock. Hash deterministic ordered IDs, parents, positions, labels, titles, synopsis, beats, and edited metadata instead of relying on timestamp precision. Plan 2 extends the fingerprint with duration.

-  Queue tests with deferred promises: submit A; edit B and flush repeatedly before A resolves; assert only one request; resolve A; assert B is sent with returned version and resolved IDs. Assert later deletions/conversions are not cleared by A, HTTP 422 and transport failure remain dirty, and a work switch cannot apply A's reply to a different work.
-  Endpoint tests: two saves with the same initial version yield success then 409; editing within one clock second invalidates version; a second structural insert prevents stale complete-tree overwrite. Use a PostgreSQL two-connection test to interleave lock acquisition and verify compare/apply is atomic; skip only on non-PostgreSQL with a documented reason, not on local PostgreSQL.
-  Run the two new focused suites to demonstrate failures. Implement single-flight coalescing using the existing SectionSaveQueue style. Snapshot submitted intents, acknowledge only that generation, rebase ID mappings into the still-current draft, and send the next generation after completion. Keep unload warning raised until all meaningful changes are acknowledged.
-  Register the queue with the writing-save coordinator through a minimal flush/hasUnsaved adapter. Switching Outline/Kanban/manuscript, opening Work Settings, or navigating to another work awaits flush; a failed/conflicting flush prevents silent draft disposal. Do not issue a second pagehide request while one is in flight.
-  Run queue, concurrency, existing outline controller, section move/transfer, and affected writing-save tests. Verify the actual mutation lock callers cover every structural writer before claiming concurrency safety.
-  Commit: `fix(writing): serialize outline saves and validate versions atomically`.

## Task 5: Preserve local changes on conflict

**Files:** Create core `Outline/outlineMerge.ts` and `OutlineConflictNotice.tsx`. Modify core `Outline/useOutlineSync.ts`, `OutlineSaveQueue.ts`, `OutlineView.tsx`, `lang/en/writing.php`. Create app `resources/js/editor/tests/outline-merge.test.ts`, `outline-conflict.test.tsx`.

**Interfaces:**

```ts
export interface OutlineMergeConflict {
    key: string;
    field: 'title' | 'synopsis' | 'beats' | 'structure' | 'deleted' | 'created' | 'durationSeconds';
    base: unknown;
    local: unknown;
    server: unknown;
}
export interface OutlineMergeResult { rows: OutlineRow[]; conflicts: OutlineMergeConflict[] }
export function mergeOutlineDraft(base: OutlineRow[], local: OutlineRow[], server: OutlineRow[]): OutlineMergeResult;
```

Scalar rule: equal values agree; a value equal to base takes the other side; different edits on both sides produce a conflict. Match persisted rows by sectionId, retaining local stable keys; merge beat edits by beat ID with the same rule. Preserve local new rows and server new rows. If the previous create request may have committed without an acknowledgement, mark new-row identity as a created conflict: the recovery UI explicitly links a local temp row to the corresponding server row, or keeps it separate. Never auto-match on title or resubmit ambiguous creates. Test a committed create with a lost response: retry fetches the current version and enters recovery before resending. Structural collisions are resolved as a whole affected subtree, never by splicing unrelated parent/order arrays. A choice that omits an existing server row still requires explicit guarded deletion. Missing parents require an explicit new parent choice, never fallback to root.

-  Test local new scene plus server rename; disjoint synopsis/title; same-field collision; local new beat plus server check-off; deletion versus edit; server-added parent; incompatible moves; and duration metadata reserved for Plan 2. Assert every conflicting local value remains available to copy/recover.
-  Run the new Vitest pair, confirm failure, then implement pure merge and compact conflict UI. Keep draft visible. Do not auto-retry a request with unresolved conflicts. After choices, recompute the complete payload against the fresh server baseline, revalidate parentage and explicit deletions, and resume saving.
-  Test Copy local outline using a selectable-text fallback if clipboard access fails; Reload server version requires explicit discard confirmation. Keep error and conflict messages accessible without repeatedly announcing every keystroke.
-  Rerun both new suites and `outline-save-queue.test.ts`; commit `fix(writing): retain outline drafts through concurrent edits`.

## Task 6: Prove rapid outlining in the running app

**Files:** Create app `tests/Browser/Writing/RapidOutlineTest.php`. Update app `tests/Browser/Writing/OutlineModeTest.php` only where its old structural expectations were incorrect. Preserve `tests/Browser/Writing/PlanModalTest.php`. Update app `docs/REMAINING-ROADMAP.md` with actual completion evidence after checks pass.

-  Browser path: create a factory screenplay with empty structure; add act and scene by actual keyboard events; type through a delayed autosave; enter another scene, indent to beat after it has saved, promote back, reorder, paste an indented hierarchy, reload, and assert tree/text. Verify a blank next row doesn't block saving the previous completed row. Use stable row IDs/labels and real key events, not only synthetic dispatch.
-  Browser conflict path: two pages on the same factory work; make incompatible edits; assert local draft survives, copy it, resolve, save, reload. Separate read-only permission case: no structural controls or writes.
-  Confirm existing modal reading/copy/edit behavior and Kanban reorder still work, then run:

```powershell
npm.cmd run test:run -- resources/js/editor/tests/outline-view.test.ts resources/js/editor/tests/outline-parse.test.ts resources/js/editor/tests/outline-payload.test.ts resources/js/editor/tests/outline-draft.test.ts resources/js/editor/tests/outline-focus.test.tsx resources/js/editor/tests/outline-save-queue.test.ts resources/js/editor/tests/outline-merge.test.ts resources/js/editor/tests/outline-conflict.test.tsx
php artisan test --compact tests/Feature/Writing/WorkOutlineControllerTest.php tests/Feature/Writing/OutlineConversionTest.php tests/Feature/Writing/OutlineConcurrencyTest.php
npm.cmd run types:check
npm.cmd run build
php artisan test --compact tests/Browser/Writing/RapidOutlineTest.php tests/Browser/Writing/OutlineModeTest.php tests/Browser/Writing/PlanModalTest.php
```

-  Run Pint on changed PHP and targeted ESLint/Prettier using the repo configuration, plus `git diff --check` in both repos. Inspect desktop and narrow-screen screenshots. Record actual pass counts and any genuine limitations; do not mark checkbox tasks complete merely because code exists.
-  Commit the acceptance coverage/docs. Plan 1 is deliverable on its own; continue to [Plan 2](2026-09-20-rapid-outline-2-pacing.md) only after this queue/hierarchy baseline is green. No push/deploy is included.
