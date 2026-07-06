# Task 2 Report: `--phase=cleanup` + `--phase=retire`

## Implementation

### Files modified

**`app/Services/Writing/MediumWorkPlan.php`** — added `alreadyMigrated: bool = false`. `plan()` now always includes all WORK+CONVERT entries in `mediumWorks` (flagged), rather than silently dropping already-migrated ones. `applyCreate()` skips `alreadyMigrated=true` entries; cleanup and retire phases use the section trees that are now always present.

**`app/Services/Writing/MigrationReport.php`** — added three optional fields: `entriesSoftDeleted: int[]`, `entriesSkipped: int[]`, `retiredBlueprints: string[]`.

**`app/Services/Writing/WritingFamilyMigrationService.php`**
- `plan()`: `Entry::whereIn()` → `Entry::withTrashed()->whereIn()` so plans stay valid after SECTION entries are soft-deleted. Added `trashed()` guards in `validateMapping()` and `detectCollisions()`.
- `detectCollisions()`: **Hardening 1** — within-batch Work slug collision check (`Str::slug($entry->name)`) for WORK+CONVERT entries, abort-worthy like entry-slug collisions.
- `applyCreate()`: added `if ($workPlan->alreadyMigrated) continue;`.
- `applyCleanup()`: pre-flights all mediumWorks `alreadyMigrated=true`, then soft-deletes SECTION entries recursively via `cleanupSectionTree()` and FLAG entries after verifying the Scene Bank child section exists by slug. Idempotent via `$entry->trashed()`.
- `applyRetire()`: calls `verifyRetirePreconditions()` (all sections soft-deleted + all works migrated), then `allow_ai_sorting = false` on work/chapter/scene blueprints in one transaction.
- New private helpers: `verifyRetirePreconditions()`, `cleanupSectionTree()`, `collectSectionEntryIds()`, `flattenSectionIds()`.

**`app/Console/Commands/LocalWriting/MigrateBlueprintFamilyCommand.php`**
- Accepts `create|cleanup|retire`; unknown phase → named error.
- `handle()` dispatches to `runCreate()`, `runCleanup()`, `runRetire()`.
- **Hardening 2**: `renderPlanText()` appends `--- STAYS: N entries untouched ---`.
- **Hardening 3**: `parseCsv()` throws `\InvalidArgumentException("CSV row N is malformed: has X columns, expected Y")` instead of silently skipping; `handle()` catches it before plan building.

**`tests/Feature/LocalWriting/MigrateBlueprintFamilyPhasesTest.php`** (new) — 10 tests.

---

## TDD Evidence

**RED**: 8/10 new tests failed (2 passed for the wrong reason — unknown phase → EXIT 1).

**GREEN (intermediate)**: 12/15 total after first implementation pass. Three failures:
- `second cleanup run is a no-op` / `retire dry-run` / `retire sets allow_ai_sorting false` — root cause: `plan()` used `Entry::whereIn()` without `withTrashed()`, so soft-deleted SECTION entries weren't found after cleanup → validation errors → EXIT 1.
- Fix: `Entry::withTrashed()->whereIn()` + `$entry->trashed()` guards in validate + collision paths.

**Final GREEN**: 15/15 (5 Create + 10 Phases), 97 assertions.

---

## Retire Mechanism Finding

`RetireExcerptCommand` only sets `allow_ai_sorting = false`. There is no separate "hidden from creation surfaces" flag in the Blueprint schema — `allow_ai_sorting` IS that mechanism (prevents entries from being routed to the blueprint by the AI sorter, which is the primary creation surface). The work/chapter/scene retire phase replicates this exactly: `$bp->update(['allow_ai_sorting' => false])` for each blueprint when found in the project. No escalation needed — the mapping is clean.

---

## Self-Review

**Can cleanup ever soft-delete an entry whose section did NOT get created?**
No. For SECTION entries: the pre-flight check requires ALL mediumWorks to be `alreadyMigrated=true` before any writes begin. For FLAG entries: `WorkSection::where(work_id, parent_id, slug)->exists()` is checked immediately before each `$entry->delete()`; if the section doesn't exist, the entry is skipped.

**Can retire run with a half-cleaned tree?**
No. `verifyRetirePreconditions()` iterates every SECTION entry ID (from all mediumWork section trees) and every FLAG entry, calling `Entry::withTrashed()->find($id)->trashed()`. Any non-trashed entry adds a named error. Errors are checked before the transaction opens.

**Does a second cleanup/retire run change anything?**
Cleanup: already-trashed entries hit `$entry?->trashed()` → `$skipped[]`, not `$softDeleted[]`. Transaction commits with zero writes. Retire: `if ($bp->allow_ai_sorting)` guard skips `update()` for already-retired blueprints. Both return EXIT 0 on subsequent runs.

---

## Commit

- **SHA**: `bf788ab`
- **Message**: `feat(writing): migration cleanup + retire phases`
- **Branch**: `feat/stage-11-slice-2`
- **Files**: 5 changed (4 modified + 1 new test file), 650 insertions, 14 deletions

---

## Review fixes

**Commit**: `1c20df1` — `fix(writing): migration phase dry-run transparency + operator-safety hardening`

### Finding 1 — Cleanup dry-run lists full deletion plan
**What changed**: `renderPlanText()` gained a `'cleanup'` branch that recursively walks every `SectionPlan` tree (via new `appendSectionDeletionLines()`) emitting `SECTION entry #id "name" [bp] → WorkTitle Work > path` lines, then lists every FLAG entry → Scene Bank / Unsorted scenes. A totals line closes the section. The plan is then written to `slice2-phase-cleanup-plan.txt` by the existing `writePlanFile()` call in `handle()`. `runCleanup()` signature gained `$planText` (passed from `handle()`) and the dry-run branch now calls `$this->line($planText)` before returning, mirroring `runCreate()`.
**Test evidence**: test (k) `cleanup dry-run writes the entry deletion list to slice2-phase-cleanup-plan.txt` — asserts plan file exists, contains `'Cleanup Phase: Entries to Soft-Delete'`, act1/scene1/floatingScene entry IDs, and `'Scene Bank / Unsorted scenes'`; verifies all three DB rows remain un-trashed. Green.

### Finding 2 — Unverifiable FLAG entries cause non-zero exit
**What changed**: `applyCleanup()` gained `$unverifiable = []` captured by the transaction closure. Both `continue` branches that previously silently skipped (missing Scene Bank work and missing per-entry section) now push a descriptive string into `$unverifiable` before continuing. The `MigrationReport` gained `entriesUnverifiable: string[]`. `runCleanup()` checks `$report->entriesUnverifiable` after reporting successful counts: if non-empty it prints each message under an error header and returns `self::FAILURE`.
**Test evidence**: test (l) `cleanup exits non-zero and reports unverifiable FLAG entry when Scene Bank section is missing` — adds an extra FLAG entry after create phase (no Scene Bank section created for it), runs cleanup, asserts exit code 1, asserts extra entry un-trashed, asserts original FLAG entry was trashed (partial commit preserved). Green.

### Finding 3 — Retire dry-run prints plan
**What changed**: `renderPlanText()` gained a `'retire'` branch that queries `Blueprint::whereIn('slug', ['work', 'chapter', 'scene'])` for the project and emits `slug: WILL retire (allow_ai_sorting → false)` vs `already retired` per blueprint. `runRetire()` signature gained `$planText`; dry-run prints it. The plan is written to `slice2-phase-retire-plan.txt` by the same `writePlanFile()` call.
**Test evidence**: test (m) checks the retire plan file on the second run contains `'already retired'`. Green.

### Finding 4 — Accurate retire counts
**What changed**: `applyRetire()` now pushes to `$retiredBlueprints` only inside the `if ($bp->allow_ai_sorting)` branch and pushes to new `$alreadyRetiredBlueprints` in the else. `MigrationReport` gained `alreadyRetiredBlueprints: string[]`. `runRetire()` prints retired and already-retired counts separately using two conditional `$this->info`/`$this->line` calls.
**Test evidence**: test (m) also validates the second retire run exits 0 and all three blueprints remain false — confirming idempotent behaviour without spurious "retired 3" output. Green.

### Finding 5 — Work slug pre-flight vs existing DB rows
**What changed**: `detectCollisions()` now pre-collects slugs from already-migrated WORK+CONVERT entries (from `metadata.writing.work_slug`) to build an exclusion list, then queries `Work::where('project_id', ...)->whereNotIn('slug', ...)` for existing works. The inner loop was extended with an `in_array($workSlug, $existingWorkSlugs)` guard that fires before the within-batch guard, producing a named collision error and triggering abort.
**Test evidence**: test (n) `plan aborts when a WORK+CONVERT entry slug collides with an existing project work` — creates a Work with title `'Pilot (Film)'` (slug `pilot-film`) before running the migration, asserts exit code 1 and total work count remains 1 (no new works created). Green.

---

## Final-review fixes

Branch: `feat/stage-11-slice-2`
Date: 2026-07-06
Tests: 24 passed (19 existing + 5 new), 142 assertions

### F1 — data preservation (SECTION/FLAG field_values)

- `buildSectionTree`: calls `getUnmappedFields` per entry; stored on new `SectionPlan.unmappedFields`.
- `plan()`: computes `flagUnmappedFields` (keyed by entry ID); stored on new `MigrationPlan.flagUnmappedFields`.
- `createSections`: passes `unmappedFields` to new `appendUnmappedToSynopsis()` helper; synopsis becomes e.g. `"Opening act\n— estimated_duration: 1:30"`.
- `applyCreate` FLAG loop: looks up `$plan->flagUnmappedFields[$id]` and appends same way.
- `renderPlanText`: emits `unmapped: field = value` lines under each SECTION and FLAG entry so operator can sign off.
- Test (f) in CreateTest: BlueprintField + FieldValue factories; asserts synopsis suffix and plan file content.

### F2 — collision completeness (soft-deleted rows)

- `detectCollisions`: `Entry::withTrashed()` on the taken-slugs query so trashed compendium entries are included in the unique-index collision check.
- `applyCreate`: pre-flight `Entry::onlyTrashed()` check for a trashed `story` compendium-type entry; returns `MigrationReport(errors: [...])` before the transaction if found.
- Tests (g) and (h) in CreateTest cover each sub-fix.

### F3 — cleanup verification for SECTION entries

- `cleanupSectionTree` gains `array &$unverifiable` and `?Work $work` parameters.
- Before soft-deleting, verifies `WorkSection::where('work_id', $work->id)->where('slug', Str::slug($entry->name))->exists()`; unverifiable entries pushed to `$unverifiable`, not deleted.
- `applyCleanup`: resolves the Work via `Entry::withTrashed()->find()->metadata['writing']['work_id']` before each tree traversal.
- Test (o) in PhasesTest: deletes Act 1 WorkSection after create; asserts act1 not trashed, scene1/scene2 trashed, floatingScene trashed, exit 1.

### F4 — log order in runCleanup

- `runCleanup`: the `entriesUnverifiable` failure branch moved before the "Cleanup complete" success message. Success text now only prints when truly clean.
- Error message updated from "FLAG entries" to "entries" (covers SECTION entries too).

### F5 — duplicate Scene Bank section slug warning

- `applyCreate` FLAG loop: when `$exists`, pushes to `$warnings` instead of silently skipping.
- `MigrationReport`: new `warnings: array` field.
- `runCreate`: iterates `$report->warnings` and calls `$this->warn(...)` for each.
- Test (i) in CreateTest: runs create twice; asserts exit 0 and no duplicate WorkSection created.

### F6 — drop @ suppression on plan file writes

- `writePlanFile`: replaced `@mkdir` / `@file_put_contents` with explicit `is_dir` + `mkdir` check (warns on failure) and `file_put_contents() === false` check (warns on failure).

### F7 — tests must not overwrite live plan files

- New `config/local_writing.php`: `migration_plan_dir` key defaulting to `storage_path('app/routing-exports/fable-audit')`.
- `MigrateBlueprintFamilyCommand`: extracted `planFileDirectory()` method returning `config('local_writing.migration_plan_dir', ...)`.
- Both test files: `beforeEach` sets `config(['local_writing.migration_plan_dir' => sys_get_temp_dir().'/test-plan-...'])` and `afterEach` cleans the temp dir. Plan file assertions updated to use `$this->planDir`.

### F8 — compendium_type casing

- `getCompendiumTypeName(string $workType): string` helper: `'film' → 'Films'`, `'novel' → 'Novels'`, `'graphic novel' → 'Graphic Novels'`, fallback `ucwords($type).'s'`.
- `applyCreate` WORK+CONVERT metadata: uses `getCompendiumTypeName($workPlan->workType)` instead of bare `$workPlan->workType`.
- Work.type column untouched (remains lowercase: `'film'`, `'novel'`).
- CreateTest (c) assertions updated: `'Films'` and `'Novels'` instead of `'film'` and `'novel'`.
