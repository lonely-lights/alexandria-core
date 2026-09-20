# Authored Outline Timing Implementation Plan

## Execution status

Implemented 2026-09-20. [Actual validation, adjustments, and limitations](2026-09-20-rapid-outline-closeout.md). The approved step-by-step recipe below is retained as reference; the task ledger records delivery, not an assertion that every proposed red/green command or commit boundary was followed verbatim.

- [x] Task 1: Nullable timing schema, validation, and payloads
- [x] Task 2: Pure pacing model and strict duration parser
- [x] Task 3: Live outline duration editing and boundary readouts
- [x] Task 4: Work Settings, Navigator, and consistent guidance
- [x] Task 5: Timing preservation through writing operations
- [x] Task 6: Snapshot-backed additive schema and reviewed local migration
- [x] Task 7: Combined acceptance and closeout

## Approved implementation recipe

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execute inline unless delegation is explicitly requested. Steps use checkbox (`- `) syntax for tracking.

**Goal:** Let writers assign section durations and see running time, act budgets, and boundary-anchored pacing markers while outlining.

**Architecture:** Add two nullable integer columns and optional marker anchor fields. A pure pacing model computes all totals and bounds from either the active outline draft or the saved section tree. Outline edits use the reliable bulk queue from Plan 1; settings use the existing work endpoint after that queue drains.

**Tech Stack:** Laravel 13, PHP 8.4+, PostgreSQL, React 19, TypeScript, Inertia 3, Vitest, Pest 4, Orchestra Testbench.

**Spec:** [Combined approved direction and detailed semantics](../specs/2026-09-20-rapid-outline-and-pacing-design.md), supplementing [September duration design](../specs/2026-09-15-scene-durations-pacing-design.md).

## Global constraints

- **Authored only.** No page-count-derived duration, and no second competing number.
- **Any structure.** Duration applies to any section — scene, chapter, act — not only screenplay scenes.
- **Container duration is a budget.** Never add a parent budget to its children's time.
- **Markers keep percentage targets.** Tolerance is percentage points of the work target.
- **Unknowns stay visible.** Blank is not zero. Exact remaining-time claims require complete coverage.
- Field validation: nullable integer, minimum 0, maximum 86400, inclusive. No new dependencies.
- Editing lives only in Outline and Work Settings; Navigator timing is read-only. Preserve the plan modal.
- Core is public: use synthetic fixtures only. App owns private/local backfill tooling and output.
- Alpha migration policy: edit existing create migrations plus snapshot-backed additive live DDL. No reset or incremental add-column migration.
- [Plan 1](2026-09-20-rapid-outline-1-reliability.md) must pass before integrating timing UI with the outline queue.
- This delivery excludes the graphical pacing view, Kanban timing, duration ranges, automatic estimates, and intra-scene marker offsets.

## File map and contracts

`core/` and `app/` denote the sibling repos, as in Plan 1. Continue their coordinated feature branches. Read both specs and Plan 1 interfaces before implementation.

New core files under `resources/js/pages/Writing/pacing/`:

| File | Responsibility |
|---|---|
| pacingTypes.ts | Timing input and result contracts |
| durationValue.ts | Strict duration parsing and formatting |
| pacingModel.ts | Tree traversal, known sums, unknowns, budgets, markers |
| pacingAdapters.ts | OutlineRow and SectionNode adapters |
| DurationInput.tsx | Local input text, validation, commit/cancel, ordinary Tab behavior |
| PacingSummary.tsx | Work-level target, total, unknowns, remaining budget |
| SectionTiming.tsx | Row/compact Navigator timing readout |
| MarkerReadout.tsx | Boundary target/landing and container-before/after readout |

New core `Sections/WorkTimingSettings.tsx` owns the timing portion of the existing settings modal. Do not split unrelated settings as part of this task. Core migrations/models/translated copy are modified in place. Host controllers/tests and local migration files are listed per task below.

Shared interfaces, defined in Task 2:

```ts
export interface TimeAmount { knownSeconds: number; unknownCount: number }
export interface PacingNode {
    key: string;
    sectionId: number | null;
    parentKey: string | null;
    isStructural: boolean;
    hasOwnContent: boolean;
    durationSeconds: number | null;
}
export interface PacingMarkerInput {
    name: string;
    target: number;
    tolerance: number;
    anchor_section_id?: number | null;
    anchor_edge?: 'start' | 'end';
}
export interface PacingRow {
    key: string;
    sectionId: number | null;
    isContainer: boolean;
    durationSeconds: number | null;
    startsAt: TimeAmount;
    endsAt: TimeAmount;
    actual: TimeAmount;
    budgetSeconds: number | null;
    remaining: { seconds: number; bound: 'exact' | 'upper' } | null;
    coverageIssue: 'empty-container' | 'container-content' | null;
}
export interface MarkerTiming {
    name: string;
    targetPercent: number;
    targetSeconds: number | null;
    toleranceSeconds: number | null;
    anchorSectionId: number | null;
    anchorEdge: 'start' | 'end';
    anchorUnavailable: boolean;
    landing: TimeAmount | null;
    gapSeconds: number | null; // landing minus target; null if unknown
    status: 'on-target' | 'early' | 'late' | 'unanchored' | 'unknown';
    containerKey: string | null; // closest enclosing container with a budget
    beforeInContainer: TimeAmount | null;
    afterInContainer: TimeAmount | null;
    remainingContainerBudget: { seconds: number; bound: 'exact' | 'upper' } | null;
}
export interface PacingResult {
    rows: PacingRow[];
    markers: MarkerTiming[];
    totals: {
        actual: TimeAmount;
        targetRuntimeSeconds: number | null;
        remaining: { seconds: number; bound: 'exact' | 'upper' } | null;
    };
}
export function buildPacingModel(
    nodes: PacingNode[], targetRuntimeSeconds: number | null,
    markers: PacingMarkerInput[],
): PacingResult;
```

Input nodes are complete preorder and unique by key; section IDs may be null. Never use a not-yet-persisted section ID as a React key or exclude new scenes from totals. Marker anchors still use persisted IDs. The pure model does no I/O or translation.

## Task 1: Persist durations and marker anchors through all editing endpoints

**Files:** Modify core `database/migrations/0001_01_01_000900_create_works_table.php`, `0001_01_01_000910_create_work_sections_table.php`, `src/Models/Writing/Work.php`, `WorkSection.php`, `resources/js/pages/Writing/Workspace.tsx`, `Outline/outlineTypes.ts`, `outlinePayload.ts`, `Sections/structureTemplates.ts`, `Sections/WorkSettingsModal.tsx`. Modify app `app/Http/Controllers/Writing/{WorkController,WorkSectionController,WorkOutlineController}.php`, `app/Services/Writing/SectionTreeService.php`, and Plan 1 outline projection/apply/guard services. Create core `tests/Feature/Writing/DurationSchemaTest.php`; create app `tests/Feature/Writing/WorkTimingTest.php`. Extend app outline payload tests.

**Interfaces:**

```php
// Existing create migrations, inside the existing Schema::create closures:
$table->unsignedInteger('duration_seconds')->nullable(); // work_sections
$table->unsignedInteger('target_runtime_seconds')->nullable(); // works
// Model casts:
'duration_seconds' => 'integer',
'target_runtime_seconds' => 'integer',
// Existing update validation; absence preserves saved value, null explicitly clears:
'duration_seconds' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:86400'],
'target_runtime_seconds' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:86400'],
```

Use the section rule on `rows.*.duration_seconds` in bulk PUT as well. Scope marker exists validation by work_id and deleted_at null; validate `anchor_edge` with start/end. Require an edge only when provided; default omitted legacy edge to end in the model/UI. Preserve anchors and edges in `resolveLengthPlan`, including when changing a target without changing the structure template.

OutlineRow gains `durationSeconds: number | null`; ServerOutlineRow/wire rows gain `duration_seconds`. Work payload gains `target_runtime_seconds`; SectionNode and CurrentSection gain `duration_seconds`. Plan 1 already supplies `is_structural`/`has_content`. Extend the fingerprint with duration plus work target/marker JSON so conflicting settings cannot silently leave an old timing view in use.

-  Schema/cast test creates a Work/WorkSection with 0, 150, and null, reloads, asserts integer/null types. Endpoint tests use existing WorkOutlineControllerTest fixture style; assert 150 accepted in section PUT and bulk PUT, 0 retained, null cleared, omitted field preserved, negative/86401/fraction rejected, and another work's or deleted section anchor rejected.
-  Test GET outline, workspace tree, current-section payload, and bulk response all carry the value; work target and marker edge round-trip. Include unauthorized update cases using real gates, not the permissive `Gate::before` fixture.
-  Run from core `vendor\bin\pest.bat tests/Feature/Writing/DurationSchemaTest.php` and app `php artisan test --compact tests/Feature/Writing/WorkTimingTest.php`, observe failures, then add columns/casts/validation/payloads. Do not apply live DDL yet.
-  Update payload adapter tests to assert missing old-client duration doesn't overwrite a saved number. Kanban uses the same types/serializer and must preserve the field. Add duration and anchor references to conversion ineligibility; explicit zero counts as authored data.
-  Rerun the new suites, existing WorkController/WorkSectionController/WorkOutlineController tests, and outline payload/merge tests. Commit `feat(writing): persist authored timing and marker boundaries`.

## Task 2: Implement the pure pacing model and strict duration parser

**Files:** Create core `pacing/{pacingTypes,durationValue,pacingModel,pacingAdapters}.ts`. Create app `resources/js/editor/tests/pacing-model.test.ts`, `duration-input.test.ts`.

**Interfaces:** Use the types above. `parseDurationInput(text: string)` returns `{ valid: true, seconds: number | null } | { valid: false }`; `formatDuration(seconds: number): string` accepts finite nonnegative seconds and rounds for display. `pacingNodesFromOutline(rows: OutlineRow[]): PacingNode[]` and `pacingNodesFromSections(sections: SectionNode[]): PacingNode[]` produce identical inputs for equivalent trees.

-  Start with this complete arithmetic fixture:

```ts
const nodes: PacingNode[] = [
    { key: 'act', sectionId: 1, parentKey: null, isStructural: true, hasOwnContent: false, durationSeconds: 600 },
    { key: 'a', sectionId: 2, parentKey: 'act', isStructural: false, hasOwnContent: true, durationSeconds: 120 },
    { key: 'b', sectionId: 3, parentKey: 'act', isStructural: false, hasOwnContent: false, durationSeconds: null },
    { key: 'c', sectionId: 4, parentKey: 'act', isStructural: false, hasOwnContent: true, durationSeconds: 180 },
];
const model = buildPacingModel(nodes, 1200, [
    { name: 'Turn', target: 25, tolerance: 0, anchor_section_id: 4, anchor_edge: 'end' },
]);
expect(model.totals.actual).toEqual({ knownSeconds: 300, unknownCount: 1 });
expect(model.rows[0].remaining).toEqual({ seconds: 300, bound: 'upper' });
expect(model.rows[3].startsAt).toEqual({ knownSeconds: 120, unknownCount: 1 });
expect(model.markers[0]).toMatchObject({ status: 'unknown', gapSeconds: null });
const complete = buildPacingModel(nodes.map(n => n.key === 'b' ? { ...n, durationSeconds: 0 } : n), 1200, [
    { name: 'Turn', target: 25, tolerance: 0, anchor_section_id: 4, anchor_edge: 'end' },
]);
expect(complete.markers[0]).toMatchObject({ status: 'on-target', gapSeconds: 0 });
expect(complete.rows[0].remaining).toEqual({ seconds: 300, bound: 'exact' });
```

Add tests for nested budgets (never double count), start versus end of untimed scene, unknown before container but exact container subtotal, empty structural container, content-bearing parent, missing anchor, absent target, explicit zero target, fractional percent tolerance boundaries, new rows without IDs, reordering, empty tree, and known-over-budget with unknowns. Assert before/after-container quantities count unknowns locally; subtracting two global lower bounds is not sufficient.
-  Parser assertions: `1:30`→90, `90:00`→5400, `1:30:00`→5400, `0:00`→0, blank→null, `24:00:00` accepted; `1:60`, `1:90:00`, `1.5`, `90`, negative, `1:30–2:30`, and `24:00:01` invalid. Format 3599 as `59:59`, 3600 as `1:00:00`.
-  Run `npm.cmd run test:run -- resources/js/editor/tests/pacing-model.test.ts resources/js/editor/tests/duration-input.test.ts`; confirm intended failures.
-  Implement a tree-indexed traversal with one known/unknown contribution per leaf, one unknown slot for empty structural containers, and an extra unknown contribution for a container's own content. Compute subtree intervals and local before/after marker splits from contributions. Use numeric sums, no formatted strings, in arithmetic. Derive remaining bound from coverage; compare marker timing only when landing is exact and target exists.
-  Verify Outline and SectionNode adapters produce equal models and that budgets/markers don't depend on translated labels. Rerun tests; commit `feat(writing): calculate pacing from authored durations`.

## Task 3: Add duration editing and live timing to Outline

**Files:** Create core `pacing/{DurationInput,PacingSummary,SectionTiming,MarkerReadout}.tsx`. Modify core `Outline/OutlineView.tsx`, `outlineReducer.ts`, `outlineTypes.ts`, `outlineDraft.ts`, `outlineMerge.ts`, `Workspace.tsx`, `lang/en/writing.php`. Create app `resources/js/editor/tests/outline-timing.test.tsx`, `duration-editor.test.tsx`.

**Interfaces:** `DurationInput` takes `{ value: number | null; onCommit(seconds: number | null): void; label: string; disabled?: boolean }`. `SectionTiming` takes `{ row: PacingRow; compact?: boolean }`; `PacingSummary` takes `{ totals: PacingResult['totals']; empty: boolean }`; `MarkerReadout` takes `{ marker: MarkerTiming }`. Add reducer action `{ type: 'duration'; key: string; seconds: number | null }`. Field labels distinguish Duration on leaves from Budget on containers.

-  Render tests: type `2:30`, blur/Enter, assert onCommit(150) once; invalid `2:99` retains local text and accessible error while not committing; Escape returns to previous value; blank commits null; Tab moves focus and never reparents the row. Add tests for external value changes when unfocused versus preserving a dirty focused input.
-  Outline test renders a known/unknown fixture, asserts floor and upper-bound copy, then edits a duration and reorders; total/positions update before the save promise resolves. Pending edits must be present in the next bulk request. A duration-only untitled row is meaningful and must not be filtered as a placeholder.
-  Run the new Vitest pair before implementation; confirm failures. Compose components into existing outline rows, keeping title/synopsis/beat priority. Use normal inputs, accessible names, tabular numbers, existing theme tokens, and horizontal containment rather than forcing the whole page wider on narrow screens.
-  Keep invalid input outside the canonical numeric draft. Prevent leaving Outline with meaningful invalid input without an explicit fix/discard choice; it must not vanish during autosave. Clearing valid input sends null. Preserve the previous timing while invalid text is being edited; show the field error so that preview is not mistaken for a committed value.
-  Extend conflict merge and saved-section conversion guards for duration. Show marker readouts at the specified row boundary, with target/landing plus local before/after/budget remaining where applicable. Do not add duration controls to focus/continuous editors or the plan modal.
-  Rerun the two UI suites, pacing-model, outline payload/merge/save queue, and `npm.cmd run types:check`; commit `feat(writing): edit duration and read pacing in the outline`.

## Task 4: Work Settings, Navigator, and one consistent timing verdict

**Files:** Create core `Sections/WorkTimingSettings.tsx`. Modify core `Sections/WorkSettingsModal.tsx`, `structureTemplates.ts`, `Navigator.tsx`, `structureGuidance.ts`, `StructureGuidanceCard.tsx`, `Workspace.tsx`, `Outline/OutlineView.tsx`, `lang/en/writing.php`. Create app `resources/js/editor/tests/work-timing-settings.test.tsx`, `navigator-timing.test.tsx`; extend existing `structureGuidance.test.ts`/`structureRules.test.ts` and app WorkTimingTest.

**Interfaces:** WorkTimingSettings receives the current target, markers, flattened saved section choices, disabled/error state, and change callbacks. The settings modal submits the existing work form plus target and marker anchor fields. OutlineView exposes `onDraftChange(rows: OutlineRow[]): void` to Workspace; Workspace owns the active draft overlay used for the read-only Navigator pacing input while Outline is mounted. Share the computed PacingResult by props; no second fetch/queue for timing.

-  Settings tests: runtime input retains unrelated form fields; choosing a section and Start persists the exact anchor; percentage edits recompute targets; unavailable anchor shows a clear state and can be cleared/reassigned; another work's ID remains rejected by server. Changing a template preserves existing user-edited marker data by the modal's existing touched-field rules, including anchor/edge.
-  Navigator test: same fixture/model as Outline yields the same scene value and container sum; draft reorder immediately updates readouts; leaving Outline waits for the queue and then uses confirmed server props. Selection/expansion remain stable. The Navigator has no timing inputs.
-  Guidance tests: screenplay with unknown durations produces missing-timing guidance instead of word-share early/late; fully timed screenplay agrees with marker model; prose without timing retains word diagnostics; prose with explicit zero duration opts into timing; unrelated diagnostics remain. Runtime activation is screenplay format OR non-null target OR any non-null duration OR any non-null anchor.
-  Run the focused Vitest suites, observe failures, then implement these props/components and route existing guidance placement through PacingResult when timing is active. Remove only the contradictory word-based placement verdicts in timing mode; do not delete independent counts, character-load checks, or prose diagnostics.
-  Save queue drains before Work Settings opens. After settings save, refresh target/markers and outline baseline without replacing meaningful unsaved state. Never open settings as a way to reset a conflict. Recheck read-only permission rendering.
-  Rerun settings, navigator, guidance, WorkTimingTest, and types; commit `feat(writing): share timing across settings navigator and guidance`.

## Task 5: Preserve authored time through existing writing operations

**Files:** Modify app `app/Services/Writing/RevisionService.php`; inspect core `src/Services/Writing/SectionTreeService.php` and app `app/Services/Writing/SectionTransferService.php`. Test core `tests/Feature/Writing/WorkSectionTreeTest.php`; app `tests/Feature/Writing/WorkSectionTransferTest.php`, `tests/Feature/Writing/Revisions/RevisionServiceTest.php`, and `WorkTimingTest.php`.

-  Add duration to revision PAYLOAD_FIELDS. Regression: capture at 150; change to 210; restore captured version →150. Restore a legacy payload with no duration key → retains current value. Restore payload with explicit null → clears. Implement key-existence checks, not null-coalescing, for backwards compatibility.
-  Verify duplicateSubtree's existing `replicate` preserves durations for all descendants. Test same-work duplicate doesn't move/duplicate marker anchors. Cross-work move preserves section values and makes any source-work anchor unavailable; it does not copy work targets or markers. Marker rendering resolves only live IDs in the current tree. Settings save normalizes previously unavailable anchor to null unless the writer assigns a new live section.
-  Test destructive deletion leaves the marker target/tolerance intact, shows unavailable anchor, and can't be accidentally retargeted by matching a title. Test FDX/new section import without duration produces null; don't invent an FDX extension in this task.
-  Run the focused revision/tree/transfer/WorkTiming suites before changing code; implement only missing preservation behavior and rerun. Commit `fix(writing): retain timing through section lifecycle operations`.

## Task 6: Apply local schema and migrate unambiguous synopsis estimates

**Files:** Create temporary app `app/Console/Commands/LocalWriting/BackfillDurationsCommand.php` and `tests/Feature/Writing/BackfillDurationsTest.php`. Create retained generic app `app/Services/Writing/RuntimeEstimateParser.php` and `tests/Unit/Writing/RuntimeEstimateParserTest.php`. Private dry-run/change reports go under workspace `sandbox/`, outside tracked repos. No live data in core docs.

**Interfaces:** `RuntimeEstimateParser::parse(string $synopsis): ?array` returns `{ seconds: int, synopsis: string }` only for exactly one valid standalone estimate line. Signature: `local:writing:backfill-durations {--work= : Restrict to a work ID} {--apply : Apply the reviewed dry run}`. Local environment only; reject execution elsewhere.

-  Parser tests with literal strings: `Opening.\n\nEstimated runtime: 2:30` →150 and `Opening.`; no estimate unchanged; `Estimated runtime: 1:30–2:30` skipped; prose trailing after the timestamp skipped; two estimate lines skipped; `1:60` skipped; `1:02:03`→3723; preserve unrelated multiline notes and separators elsewhere. Matching the label is case-insensitive, but removal uses exact matched offsets, not broad trim/replace.
-  Command feature tests: default dry run has zero writes; apply changes only null-duration rows with a unique valid line; an existing zero or positive value leaves synopsis intact; out-of-scope work unaffected; apply twice is idempotent; changed synopsis between scan/apply aborts and rolls back the batch. Test the environment guard without changing global test environment permanently.
-  Run parser/command tests to fail, implement parser/command, then rerun to pass. Review dry-run output before applying; ambiguous rows stay unchanged without blocking unambiguous ones.
-  Inspect live schema using the available database-schema tool. Create the snapshot with `php artisan local:db:snapshot --name=rapid-outline-pacing --no-prune`; verify successful exit and snapshot file before any DDL. If the snapshot tool's mirror location needs permission, use `--no-mirror --path=C:/Websites/alexandria/sandbox/db-snapshots` to keep this task inside the workspace rather than bypassing access restrictions.
-  Apply only missing columns locally using schema checks and additive DDL equivalent to:

```sql
ALTER TABLE work_sections ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NULL;
ALTER TABLE works ADD COLUMN IF NOT EXISTS target_runtime_seconds INTEGER NULL;
```

Use the project's supported local DB tool/CLI; do not drop/recreate anything. Confirm the two columns after application. Fresh test databases already use the edited create migrations.
-  Run `php artisan local:writing:backfill-durations` to a private report; verify every candidate is a whole-section standalone estimate rather than a segment/range. Snapshot-backed apply is within the approved implementation scope; stop only if unexpected content ambiguity cannot be resolved by skipping it. Run with `--apply`, compare changed IDs/seconds/synopses against the dry run, then rerun dry run and expect no eligible remaining rows except intentionally skipped cases.
-  Remove the temporary command and command-only tests after successful local use. Retain the generic parser/tests and a private record of snapshot/report locations. Run parser tests once more and commit only generic retained code/tests plus a data-free completion note. Do not commit private reports or a removed command's obsolete tests.

## Task 7: Verify the combined writer workflow and close the planning loop

**Files:** Create app `tests/Browser/Writing/OutlinePacingTest.php`; update app `docs/REMAINING-ROADMAP.md` and this plan with actual results. Preserve Plan 1 and modal tests.

-  Browser screenplay fixture: set a 20-minute target and a 10-minute act budget; create two scenes of 2 and 3 minutes plus an untimed scene; anchor a marker to second scene End; verify unknown/floor state when relevant. Enter `0:00` for the untimed scene, confirm exact totals; move scenes across the marker, confirm landing changes instantly and after reload. Change edge Start/End and assert different landings.
-  Verify selected-marker readout answers planned time before/after it within the act and budget left after the boundary. An unknown earlier in another act must not corrupt this act's exact internal totals; an unknown within this act must produce bounds.
-  Browser prose fixture: no timing produces normal word guidance; set a chapter duration and confirm timing readout without altering manuscript. Read-only user can see values but cannot edit. Check settings and outline keyboard navigation, numeric input errors, and narrow-screen readability.
-  Run focused model, parser, surface, persistence, and prior outline suites. From app:

```powershell
npm.cmd run test:run -- resources/js/editor/tests/pacing-model.test.ts resources/js/editor/tests/duration-input.test.ts resources/js/editor/tests/duration-editor.test.tsx resources/js/editor/tests/outline-timing.test.tsx resources/js/editor/tests/work-timing-settings.test.tsx resources/js/editor/tests/navigator-timing.test.tsx resources/js/editor/tests/outline-payload.test.ts resources/js/editor/tests/outline-merge.test.ts resources/js/editor/tests/outline-save-queue.test.ts
php artisan test --compact tests/Feature/Writing/WorkTimingTest.php tests/Feature/Writing/WorkOutlineControllerTest.php tests/Feature/Writing/OutlineConversionTest.php tests/Feature/Writing/WorkSectionTransferTest.php tests/Feature/Writing/Revisions/RevisionServiceTest.php tests/Unit/Writing/RuntimeEstimateParserTest.php
npm.cmd run types:check
npm.cmd run build
php artisan test --compact tests/Browser/Writing/OutlinePacingTest.php tests/Browser/Writing/RapidOutlineTest.php tests/Browser/Writing/PlanModalTest.php
```

Run the core schema/tree tests under Testbench as well. Include affected guidance and existing Kanban tests located during implementation; those integrations must not be omitted merely because they are not listed in the convenience command.
-  Run Pint on changed PHP, targeted ESLint/Prettier, and `git diff --check` in both repos. Inspect real rendered desktop/narrow screenshots and save indicators. Record what was verified, including any skipped concurrency platform test; don't claim a check that wasn't run.
-  Mark the roadmap row complete only when both plans' acceptance criteria pass. Keep the graphical pacing view explicitly deferred; its build can reuse the now-proven model without reopening the authored-duration decisions. Commit acceptance coverage and status updates; no push or deployment in this plan.

## Self-review coverage

August: hierarchy, paste, saved/temporary conversions, guarded deletion, stable identity, bulk persistence, conflicts, sidebar/Kanban compatibility, and modal preservation are covered by Plan 1. September: fields, casts, all payloads, bounds, budgets, running clock, markers, settings, Navigator, model tests, live schema, and backfill are covered here. Added lifecycle, before/after-marker, boundary, and range-preservation requirements from the combined review have explicit tasks. Phase 2 graphical pacing remains deliberately separate.
