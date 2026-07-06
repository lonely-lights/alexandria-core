# Stage 11 Slice 2 — Compendium-Aware Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the phased `local:writing:migrate-blueprint-family` command that bootstraps the Works system from the Work/Chapter/Scene blueprint family while keeping the compendium tree whole ("Compendium above, Works below"), plus the "Open in Writing" link affordance.

**Architecture:** One app-side artisan command with `--phase=create|cleanup|retire`, each dry-run-first and idempotent, driven by the frozen Phase A mapping CSV plus decision rules. Mapping logic lives in a service class (`WritingFamilyMigrationService`) for future consumer reuse. Conversion re-homes entry rows in place (`blueprint_id` swap, id/parent/sort/slug preserved) so the tree and existing relationships survive untouched. **Execution is operator-gated: Andrew checks in after every phase; retire runs LAST.**

**Tech Stack:** Laravel 13 / PHP 8.4, Pest 4 (app feature tests, sqlite `:memory:`), Inertia React 19 (one small core UI chip).

## Global Constraints

- The live phases run ONLY by the session operator with Andrew present — the plan's tasks build + test the command; nothing in a task touches the live Postgres DB.
- Andrew's decisions (2026-07-06 check-in) are binding:
  1. FLAG scenes (no/structural work ancestor) float in a project-level **"Scene Bank"** work ("Unsorted scenes" is an expected ongoing state).
  2. A **`Story`** compendium-type is created; structural containers convert with type `Story`; medium-works convert typed by medium (`Films`, `Novels`, …).
  3. Empty medium-works (no acts/scenes yet) still become Works — one Work per medium, all sections under it.
  4. Type + Work-link + migration payload live in **entry `metadata`** (JSON merge, never clobber existing keys) — no blueprint fields, no core schema changes.
- Mapping input: `storage/app/routing-exports/fable-audit/slice2-phase-a-mapping.csv` (columns: entry_id, name, blueprint, parent_id, disposition, detail; dispositions WORK+CONVERT / CONVERT / SECTION / STAYS / FLAG).
- Preserve source `created_at`/`updated_at` on created Works/sections (timestamp-attribution policy).
- `works.user_id` = project owner id. Work/section slugs generated from names; on unique-collision (`works`: project+slug; `work_sections`: work+slug) append `-2`, `-3`, ….
- Local-env guard identical to `local:notes:apply-review` (`app()->environment(['local','testing'])`).
- UI strings via lang files (core `alexandria::` namespace).
- PHP formatted with `vendor/bin/pint --dirty --format agent` pre-commit; commit trailers:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n`

---

### Task 1: WritingFamilyMigrationService + command skeleton + `--phase=create`

**Files:**
- Create: `alexandria-app/app/Services/Writing/WritingFamilyMigrationService.php`
- Create: `alexandria-app/app/Console/Commands/LocalWriting/MigrateBlueprintFamilyCommand.php`
- Test: `alexandria-app/tests/Feature/LocalWriting/MigrateBlueprintFamilyCreateTest.php`

**Interfaces:**
- Consumes: mapping CSV (constraint block), `Alexandria\Core\Models\Writing\{Work, WorkSection}`, `Alexandria\Core\Models\System\Blueprint`, entries table (`parent_id` tree). Study `app/Console/Commands/LocalNotes/ApplyReviewCommand.php` first — CSV parse/validate/transaction/dry-run/force conventions come from it.
- Produces: `local:writing:migrate-blueprint-family {--project=undaunted} {--mapping=storage/app/routing-exports/fable-audit/slice2-phase-a-mapping.csv} {--phase=create} {--dry-run} {--force}`; service methods `plan(Project $project, Collection $mapping): MigrationPlan` (pure, used by dry-run and tests) and `applyCreate(MigrationPlan $plan): MigrationReport`.

**Behavior (create phase):**

1. Parse + validate the mapping CSV: every entry_id exists, blueprints match, dispositions recognized. FLAG rows are resolved by rule to Scene-Bank floats (decision 1). Unknown rows abort before any write.
2. Ensure the `Story` compendium-type exists (create the list entry if missing — name `Story`, seeded-style slug).
3. For each WORK+CONVERT entry (medium-work), in tree order:
   - Create `Work`: title = entry name, slug generated (collision-suffixed), `type`/`format` from the medium suffix (`(Novel)` → type `novel`/format `prose`; everything else → type per suffix word lowercased or `screenplay`, format `screenplay`), `status` `draft`, `user_id` project owner, timestamps copied from the entry.
   - Its SECTION descendants become the section tree: compendium acts → top-level sections (label `Act`, synopsis = entry summary, content = entry content); scene entries beneath → child sections (label `Scene`, same field mapping, `format` left null to inherit). `position` = source `sort_order` rank within siblings; timestamps copied.
4. Create the **Scene Bank** work (title `Scene Bank`, type/format screenplay, status `concept`) with a top-level `Unsorted scenes` section; each FLAG scene becomes a child section under it (same field mapping).
5. Convert ALL work-blueprint entries in the mapping (both WORK+CONVERT and CONVERT): `blueprint_id` → compendium's id — **the row is re-homed in place** (id, parent_id, sort_order, slug, name, summary, content, timestamps untouched). Verify first that the entries unique constraints permit the swap (read the entries table migration; if slug uniqueness is per-blueprint, detect collisions in `plan()` and abort with a named list — do not auto-rename entries).
6. Merge into each converted entry's `metadata`: `compendium_type` (`Story` for CONVERT, medium type for WORK+CONVERT), and for mediums `writing: {work_id, work_slug}` plus `migration: {from_blueprint: 'work', migrated_at, unmapped: {...}}` where `unmapped` captures any source field the Works schema has no home for (inventory `field_values` for the entry; work entries with content keep it on the entry itself — note that in the dry-run).
7. Idempotency: a WORK+CONVERT entry whose metadata already carries `writing.work_id` is skipped (reported as `already-migrated`); sections keyed by (work_id, source entry id recorded in a `migration.source_entry_id` note on the section's… works sections have no metadata column — instead record created-section provenance in the command's report file AND make re-runs detect existing Works by metadata link before creating anything). Running create twice must change nothing.
8. `--dry-run` prints the full plan: works to create (with form/type), section tree per work (indented), conversions with their types, Scene Bank contents, collision/unmapped warnings. `--force` required to write; everything in one DB transaction.
9. The command also writes the dry-run/apply plan to `storage/app/routing-exports/fable-audit/slice2-phase-<phase>-plan.txt` for Andrew's check-in.

**Tests (fixture family — build in the test, no seeders):** project + blueprints (compendium, compendium-type, work, scene, chapter) + tree: comp root → container work → medium work `Pilot (Film)` → comp `Act 1` → 2 scenes; a floating scene FLAG row; an empty `Pilot (Novel)` medium. Mapping CSV written to a temp path by the test. Assert: (a) dry-run writes nothing; (b) create builds 3 works (Film, Novel empty, Scene Bank), correct nesting/labels/synopsis/content/timestamps; (c) conversions re-homed in place with ids preserved and metadata merged (pre-seed one entry with existing metadata to prove merge-not-clobber); (d) second create run is a no-op; (e) invalid mapping row aborts with no writes.

TDD steps: failing tests → run (`php artisan test --compact --filter=MigrateBlueprintFamilyCreate`) → implement service+command → green → pint → commit `feat(writing): compendium-aware migration command — create phase`.

---

### Task 2: `--phase=cleanup` + `--phase=retire`

**Files:**
- Modify: service + command from Task 1
- Test: `alexandria-app/tests/Feature/LocalWriting/MigrateBlueprintFamilyPhasesTest.php`

**Behavior:**

- **cleanup:** soft-delete the SECTION-disposition source entries (compendium acts + scene entries) whose content now lives in sections — ONLY those listed in the mapping AND verifiably migrated (their medium-work's Work exists via metadata link; FLAG scenes covered via Scene Bank). Converted work nodes are NOT touched. Dry-run lists every entry to be soft-deleted with its section destination. Idempotent (already-deleted skipped, reported).
- **retire:** for work/chapter/scene blueprints: `allow_ai_sorting = false` + hidden from creation surfaces following the exact mechanism in `app/Console/Commands/LocalNotes/RetireExcerptCommand.php` (read it first; reuse its flag/fields verbatim). Refuses to run (named error) if any mapping SECTION entry is not yet soft-deleted and any WORK+CONVERT entry not yet converted — retire is last by construction, not convention. Dry-run prints the retire plan.

**Tests:** extend the Task 1 fixture flow: create → cleanup (assert soft-deleted sources, converted nodes intact, compendium STAYS rows untouched) → retire (assert flags; assert retire ABORTS if cleanup hasn't run). Commit `feat(writing): migration cleanup + retire phases`.

---

### Task 3: "Open in Writing" chip on converted entries

**Files:**
- Modify: the core entry Show page (`alexandria-core/resources/js/pages/Entries/Show.tsx` — locate where the title/header chrome renders and follow its patterns)
- Modify: `alexandria-core/lang/en/` (appropriate group — check where entry-page strings live)
- Test: extend an existing core/app entry-page test with the metadata case (find the entry Show feature/browser coverage and match conventions; a Pest feature test asserting the Inertia prop passes metadata through suffices if no browser harness covers entry Show)

**Behavior:** when an entry's `metadata.writing.work_slug` is present, the entry header renders a small link chip ("Open in Writing", feather icon) to `/works/{projectSlug}/{work_slug}`. Generic core behavior — any consumer can link an entry to a work via the same metadata key. Nothing renders when the key is absent. Verify the Show page already ships `metadata` in its Inertia payload; if it does not, add the single key (`metadata.writing` only — do not expose the whole metadata blob without checking what else lives in it).

Commit `feat(writing): Open-in-Writing chip for work-linked entries`.

---

## Out of plan scope (operator steps, run with Andrew at the gates)

- Phase B check-in: run `--phase=create --dry-run` against live, deliver the plan file.
- Phase C: snapshot `pre-works-migration-create` → `--phase=create --force` → Andrew explores `/writing` + compendium (his deferred full mapping review happens HERE).
- Phase D: the 80-note triage (Fable console pipeline) + fold-in of his 18 pending `→ bp:scene` proposals; `review-final.csv` sync.
- Phase E: snapshot → `--phase=cleanup --force` → check-in (compendium renders identically above the manuscript line).
- Phase F: snapshot → `--phase=retire --force` → final joint verification.

## Plan self-review notes

- The works table has no metadata column — migration payloads live on converted entries' metadata (decision 4); section provenance lives in the command's written plan/report files. If re-run detection via Works metadata-links proves too indirect for sections during implementation, the implementer may key sections on (work_id, slug) — both are deterministic from source names.
- The entries unique-constraint check (Task 1 step 5) is a named verification, not an assumption — collisions abort with a list rather than auto-renaming Andrew's slugs.
- Command namespace `LocalWriting` mirrors the established `LocalNotes` grouping.
