# Scoped Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliberate, user-scoped revision snapshots (scene / container / work, per-scope numbering, full creative-state payloads), a bounded 5-entry safety buffer, and a History sidebar with view + non-destructive restore.

**Architecture:** Two new core tables + models; an app-side `RevisionService` (capture / buffer / restore with pre-restore auto-capture); four routes on one controller; core UI = File-menu scope dialog, Navigator menu item, fifth built-in sidebar mode.

**Tech Stack:** Laravel 13 + Pest (app), React 19 + TS (core). No new dependencies.

**Spec:** `alexandria-core/docs/superpowers/specs/2026-08-29-revisions-design.md` (RATIFIED — binding; its Behavior + Surfaces sections are exact requirements).

## Global Constraints

- Branches `feat/revisions` both repos (cut). Tests/builds from `alexandria-app`.
- **New tables = NEW core migration files** (additive; the alpha edit-in-place policy governs EXISTING tables only). After creating them, apply to the live DB with plain `php artisan migrate` — NEVER any fresh/refresh variant (corpus guard doctrine).
- Established conventions bind: route literal-before-wildcard; middleware-only authz + assertScoped guard (copy WorkOutlineController); fetch-consumed endpoints return JSON; `@throws` documented; typed collection reads; Pest brace-free interpolation + `->and()`; pint before PHP commits; tsc + `npm run build` clean before core commits; UI strings via `writing.revisions.*` lang keys, no inline English.
- Payload field list (exact, from spec): `title, label, content, synopsis, beats, beat_type, goal, conflict, stakes, mood, tone`.
- Buffer hook location: server-side where content saves land — `WorkSectionController::updateContent` AND the outline bulk PUT's row updates (`WorkOutlineController::update`) both accept content-state changes; v1 hooks **updateContent only** (the editors' save path — the outline PUT changes structure/synopsis/beats, and buffering there would spam 5-slots with structural noise). Ledger this boundary.
- Frontend reuse: sidebar mode registration pattern = the Kanban/Outline additions (PanelModeSwitcher built-ins + panelMode allow-list + Workspace render branch); File-menu action + dialog = the FDX ExportFdxModal pattern (read it); Navigator row menu = read how existing row actions (duplicate/delete) are wired.

## File Map

| File | Role |
|---|---|
| core `database/migrations/0001_01_01_000955_create_work_revisions_table.php` | NEW |
| core `database/migrations/0001_01_01_000956_create_work_section_versions_table.php` | NEW |
| core `src/Models/Writing/WorkRevision.php`, `WorkSectionVersion.php` | NEW models (casts: payload array) |
| app `app/Services/Writing/RevisionService.php` | capture / buffer / restore |
| app `app/Http/Controllers/Writing/WorkRevisionController.php` | 4 endpoints |
| app `routes/web.php` | 4 routes |
| app `app/Http/Controllers/Writing/WorkSectionController.php` | buffer hook in updateContent |
| core `resources/js/pages/Writing/Revisions/MarkRevisionModal.tsx`, `HistoryPanel.tsx`, `revisionApi.ts` | UI |
| core `Sections/PanelModeSwitcher.tsx`, `panelMode.ts`, `Workspace.tsx`, `Sections/Navigator.tsx`, `ribbon/writingRibbonTabs.tsx`, `lang/en/writing.php` | wiring |
| app `tests/Feature/Writing/Revisions/*.php`, `tests/Browser/Writing/RevisionsTest.php`, vitest additions | tests |

Read before coding: spec (whole), WorkOutlineController + its tests, ExportFdxModal + fileTab wiring, PanelModeSwitcher/panelMode/Workspace sidebar branches, Navigator row-menu wiring, SectionTreeService.

---

### Task 1: Migrations + models (core) + live apply

- [ ] Two new core migrations per the spec's exact columns (FKs with cascade rules mirroring sibling writing tables — read the work_sections migration's FK style; `payload` jsonb; indexes: revisions (work_id, scope_section_id, number), versions (work_section_id, created_at), versions work_revision_id).
- [ ] Models: `WorkRevision` (fillable via guarded ['id'], casts none beyond timestamps, relations: work, scopeSection, versions), `WorkSectionVersion` (casts payload => array; relations: section, revision). Match `WorkSection.php` style exactly.
- [ ] Apply live: `cd alexandria-app && php artisan migrate` (additive only — verify with `--pretend` first and include the pretend output in your report).
- [ ] Pest smoke (app `tests/Feature/Writing/Revisions/RevisionModelsTest.php`): create revision + version rows via models, payload array round-trip, relations resolve. Run `--filter=RevisionModels`.
- [ ] Commits: core (`feat(revisions): revision + version tables and models`), app (test).

### Task 2: RevisionService (app)

**Interfaces (produces):**
```php
final class RevisionService
{
    /** Capture a deliberate revision. $scopeSection null = whole work. */
    public function capture(Work $work, ?WorkSection $scopeSection, ?string $label, User $user, string $cause = 'manual'): WorkRevision;
    /** Safety-buffer a content save (call AFTER content persisted); prunes beyond 5 buffer entries. No-op when content unchanged vs latest buffer entry. */
    public function buffer(WorkSection $section): void;
    /** Restore one version's payload onto its section; container/work revisions restore via restoreRevision(). Auto-captures cause=pre_restore first. */
    public function restoreVersion(WorkSectionVersion $version, User $user): WorkRevision; // returns the pre_restore revision
    public function restoreRevision(WorkRevision $revision, User $user): WorkRevision;
}
```
- [ ] TDD the spec's Testing bullets: per-scope numbering independence; container scope captures every descendant leaf + the container's own payload row; payload completeness (all 11 fields); buffer cap-5 + no-op-on-unchanged + revision-linked exemption from pruning; restoreVersion round-trip (mark → mutate all fields → restore → all fields back) + pre_restore revision created scene-scoped; restoreRevision multi-section.
- [ ] Wire the buffer hook: `WorkSectionController::updateContent` calls `RevisionService::buffer` after a successful content save (read the method; keep the JSON response contract identical) + regression-run `--filter=WorkSection`.
- [ ] Commit (`feat(revisions): capture/buffer/restore service + buffer hook`).

### Task 3: HTTP endpoints (app)

- [ ] `WorkRevisionController` (final readonly, assertScoped guard) + 4 routes per spec (store/history/show-version/restore; history + versions literals BEFORE the `{section?}` wildcard where applicable). History response groups: `own` (revisions whose scope = this section), `inherited` (revisions whose scope is an ancestor or work-wide AND which captured this section), `buffer` (revision_id-null versions) — metadata only (id, number, label, cause, scope title, created_at, version id for THIS section).
- [ ] TDD: happy paths, grouping correctness incl. inherited, payload endpoint, restore endpoint invoking the service (assert pre_restore appears), authz all four, cross-work 404s. Commit (`feat(revisions): revision HTTP surface`).

### Task 4: Frontend (core)

- [ ] `revisionApi.ts`: fetch helpers for the 4 endpoints (JSON headers idiom from outlineApi — reuse `outlineApiHeaders` by import, don't copy).
- [ ] `MarkRevisionModal.tsx`: scope radio (This scene [default] / each ancestor of the current section by title / Entire work) + label input + Mark. Opened from: File menu item "Mark revision…" (fileTab action, FDX-item pattern) AND Navigator row menu "Mark revision…" (scope locked to that row, radio hidden). Success: toastless inline confirmation in the modal then close; refresh History panel if open.
- [ ] `HistoryPanel.tsx` + fifth built-in sidebar mode `history` (icon `fa-solid fa-clock-rotate-left`, label key `writing.revisions.sidebar_label`): the three spec groups for the current section; row → View opens read-only modal (content pre-wrap + plan fields listed) with a Restore button (confirm dialog text explains the pre-restore capture); after restore, `router.reload({only: ['currentSection', 'sections']})`.
- [ ] Wire: panelMode allow-list, PanelModeSwitcher entry, Workspace render branch, Navigator menu item, fileTab item, all `writing.revisions.*` lang keys.
- [ ] App test updates: panelMode + ribbon fixture lists. Verify: full `npm run test:run`, tsc, build. Commits core + app tests.

### Task 5: Browser smoke + full verification + docs

- [ ] Smoke (OutlineModeTest idioms): mark a scene revision via File dialog → edit the scene content → open History sidebar → own-revision row present → View shows old content → Restore → editor/content reflects the old text (assert via reload) and a "Before restore" row appeared.
- [ ] Full gates: `--filter=Revision`, `--filter=Writing`, `npm run test:run`, tsc, pint, build.
- [ ] Roadmap Stage 11 list (below the FDX line): `- ✅ **Scoped revisions + safety buffer** shipped 2026-08-29: deliberate per-scope revision snapshots (scene/container/work, independent numbering, full creative-state payloads), bounded 5-save safety buffer, History sidebar with non-destructive restore. Spec: alexandria-core docs/superpowers/specs/2026-08-29-revisions-design.md.` Commits.

## Self-review notes (applied)

- Spec coverage: tiers→T2 buffer + T1/T2 revisions; surfaces→T4 (all three); behavior (pre_restore, pruning exemption, per-scope numbering)→T2; HTTP→T3; testing section fully mapped; out-of-scope respected (no diff view, no revision-scoped export, no deletion UI).
- Buffer-hook boundary (updateContent only, not the outline PUT) is a plan-level ruling — ledgered for the controller.
- Payload list appears identically in spec, T2 tests, and the model cast — single wording.
