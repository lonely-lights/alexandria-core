# Devices & Tropes (Threads and Promises) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A project-scoped ledger of narrative patterns — a seeded, editable card library; thread instances scoped to any structural node; setup/develop/payoff marks pinned to sections (optionally prose spans); derived open-promise/kept status surfaced while planning, writing, and reviewing.

**Architecture:** Three new core tables + models; app-side `PatternThreadService` (scope containment + derived status + promises query); one app controller with 11 project-scoped routes; core UI = library on the writing hub, MarkThread dialog (outline/Kanban/editor/File-tab entry points), sixth `threads` sidebar mode, Reports Promises group, dashboard cross-work view, Kanban stance chips.

**Tech Stack:** Laravel 13 + Pest (app), React 19 + TS (core). No new dependencies.

**Spec:** `alexandria-core/docs/superpowers/specs/2026-08-29-devices-tropes-design.md` (RATIFIED — binding; Data model, Derived status, Surfaces, HTTP, Testing sections are exact requirements).

## Global Constraints

- Branches `feat/devices-tropes` both repos (cut from main). Tests/builds run from `alexandria-app`.
- New tables = NEW core migration files (additive; alpha edit-in-place governs existing tables only). Apply live with plain `php artisan migrate` after `--pretend` — NEVER fresh/refresh (corpus guard doctrine).
- Conventions bind: route literal-before-wildcard; middleware authz + `assertScoped` belt-and-braces (copy WorkRevisionController); fetch-consumed endpoints return JSON, never back()/redirect; `@throws` documented; typed collection reads (`/** @var */`); typed constants; brace-free Pest interpolation + chained `->and()`; pint before PHP commits; tsc + `npm run test:run` + `npm run build` clean before core commits; UI strings via `writing.threads.*` lang keys in core `lang/en/writing.php`, no inline English.
- Derived status is containment-only (NO positional setup-before-payoff ordering) — spec ruling.
- Payload/shape vocabulary fixed: card kinds `device|trope|<free string>`; mark roles `setup|develop|payoff`; stances `straight|subverted|lampshaded|inverted|averted|played_with`; thread states `kept|open` + boolean `unplanted`.
- Scope morph values: `scope_type` stores the FQCN morph exactly as existing core morphs do (check how `work_section_comments` / notable pivots store morph classes and match).
- NEVER run test/build commands with run_in_background — foreground only.

## File Map

| File | Role |
|---|---|
| core `database/migrations/0001_01_01_000957_create_pattern_cards_table.php` | NEW |
| core `database/migrations/0001_01_01_000958_create_pattern_threads_table.php` | NEW |
| core `database/migrations/0001_01_01_000959_create_pattern_marks_table.php` | NEW |
| core `src/Models/Writing/PatternCard.php`, `PatternThread.php`, `PatternMark.php` | NEW models |
| app `app/Services/Writing/PatternThreadService.php` | containment + status + promises |
| app `app/Http/Controllers/Writing/PatternLibraryController.php` (cards) + `PatternThreadController.php` (threads/marks/promises) | HTTP |
| app `routes/web.php` | 11 routes beside works.* |
| app `database/seeders/Writing/PatternCardSeeder.php` + `database/data/pattern-cards.php` | seeded library |
| core `resources/js/pages/Writing/Threads/threadApi.ts`, `MarkThreadModal.tsx`, `ThreadsPanel.tsx`, `ThreadDetailModal.tsx` | UI |
| core `resources/js/pages/Writing/Threads/PatternLibrary.tsx` (+ writing-hub wiring) | library UI |
| core `Sections/PanelModeSwitcher.tsx`, `panelMode.ts`, `Workspace.tsx`, `Sections/Navigator.tsx`, Kanban view files, outline row menu, editor selection bubble, `ribbon/writingRibbonTabs.tsx`, `lang/en/writing.php` | wiring |
| app `tests/Feature/Writing/Threads/*.php`, `tests/Browser/Writing/ThreadsTest.php`, vitest fixture updates | tests |

Read before coding (per task, listed in briefs): spec (whole); WorkRevisionController + RevisionService + their tests (the playbook); work_sections + work_section_comments migrations (FK/anchor style); SectionTreeService; HistoryPanel/MarkRevisionModal + panelMode wiring; KanbanView; writing hub page for `writing.project`; AddCommentBubble.

---

### Task 1: Migrations + models (core) + live apply

- [ ] Three core migrations, exact columns from the spec's Data model section. FK style mirrors `work_revisions` (`foreignId(...)->constrained()->cascadeOnDelete()`; `works.entry_id`-style `nullOnDelete` for `pattern_threads.entry_id`). `pattern_threads` scope: `$table->string('scope_type'); $table->unsignedBigInteger('scope_id'); $table->index(['scope_type', 'scope_id']);`. Soft deletes on cards + threads (NOT marks). Marks anchor columns: `$table->text('anchor_text')->nullable(); $table->unsignedInteger('anchor_offset_hint')->nullable();` (the work_section_comments format). Unique: cards `(project_id, slug)`.
- [ ] Models in `src/Models/Writing/`, matching `WorkRevision.php` style exactly (guarded `['id']`, full `@property` docblocks, `@mixin Eloquent` with imported alias, typed constants where used). PatternCard: relations `project`, `threads`; casts none special. PatternThread: relations `project`, `card` (belongsTo PatternCard), `scope` (morphTo), `entry` (belongsTo Entry, nullable), `marks` (hasMany, ordered by id), `creator`; SoftDeletes. PatternMark: relations `thread` (belongsTo PatternThread), `section` (belongsTo WorkSection), `creator`; no UPDATED_AT? — marks ARE editable (note/role/anchor), keep both timestamps.
- [ ] Apply live: `--pretend` first (include output in report), then `php artisan migrate`.
- [ ] Pest smoke `tests/Feature/Writing/Threads/PatternModelsTest.php`: create card→thread→mark rows via models, morph scope round-trips for all three scope types (WorkSection, Work, Entry), relations resolve, soft-delete card leaves thread readable via `card()->withTrashed()`. Run `--filter=PatternModels`.
- [ ] Commits: core `feat(threads): pattern card/thread/mark tables and models`, app test commit.

### Task 2: PatternThreadService (app)

**Interfaces (produces):**
```php
final class PatternThreadService
{
    /** @return array{state: 'kept'|'open', unplanted: bool} */
    public function status(PatternThread $thread): array;

    /** Containment per the spec's Derived status section. */
    public function markInScope(PatternMark $mark, PatternThread $thread): bool;

    /**
     * Open-promise rows across the project, grouped by scope node, oldest thread first.
     * @return array<int, array{scope_type: string, scope_id: int, scope_title: string, threads: array<int, array{id: int, title: string, card_name: string, stance: ?string, unplanted: bool, setup_location: ?string, created_at: string}>}>
     */
    public function promises(Project $project): array;
}
```
- [ ] Containment rules (exact): scope WorkSection → mark section id equals scope id OR appears in the scope's descendant set (walk `work_sections.parent_id` children; reuse/extend SectionTreeService if it exposes a descendants helper, else a recursive id-set builder in the service); scope Work → `mark->section->work_id === scope->id`; scope Entry → mark's section's work has `entry_id` NOT NULL and that entry is the scope entry or a descendant via `entries.parent_id` walk.
- [ ] `status()`: kept when any `payoff` mark passes `markInScope`; `unplanted` when zero `setup` marks exist at all.
- [ ] `promises()`: threads of the project whose status is open, eager-loading card/marks/scope, grouped by (scope_type, scope_id) with a human `scope_title` (section title / work title / entry name), threads oldest-first; `setup_location` = first setup mark's section title or null.
- [ ] TDD `tests/Feature/Writing/Threads/PatternThreadServiceTest.php`: kept/open per scope type (incl. entry-scope with mark in a DIFFERENT work linked to a descendant entry — the cross-work case); payoff outside scope stays open; unplanted flag; develop marks never satisfy; promises grouping + ordering + setup_location; soft-deleted thread excluded.
- [ ] Commit `feat(threads): containment + status + promises service`.

### Task 3: HTTP surface (app)

- [ ] Two controllers (final readonly, `assertScoped` guards binding every child to the routed project). Routes registered beside the `works.*` group under `p/{project:slug}/writing/...`, literal-before-wildcard:

| Verb | Path (after `p/{project:slug}`) | Name | Gate tier |
|---|---|---|---|
| GET | `/writing/cards` | `writing.cards.index` | view |
| POST | `/writing/cards` | `writing.cards.store` | update |
| PUT | `/writing/cards/{card}` | `writing.cards.update` | update |
| DELETE | `/writing/cards/{card}` | `writing.cards.destroy` | update |
| GET | `/writing/threads` | `writing.threads.index` | view (filters: `work_id`, `section_id`, `card_id`, `status`) |
| POST | `/writing/threads` | `writing.threads.store` | update |
| PUT | `/writing/threads/{thread}` | `writing.threads.update` | update |
| DELETE | `/writing/threads/{thread}` | `writing.threads.destroy` | update |
| POST | `/writing/threads/{thread}/marks` | `writing.threads.marks.store` | update |
| PUT | `/writing/marks/{mark}` | `writing.marks.update` | update |
| DELETE | `/writing/marks/{mark}` | `writing.marks.destroy` | update |
| GET | `/writing/promises` | `writing.promises.index` | view |

  Gate mechanics: mirror how the existing writing/works routes authorize (view = `can:view,project` middleware; update tier = the same Gate style `works.*` write routes use — read them and match). All JSON.
- [ ] Validation (exact): card `{name: required string max:120, kind: required string max:40, definition: required string, craft_guidance/pitfalls/shape: nullable string}` (slug generated, uniqueness suffixed like Work slugs); thread `{pattern_card_id: required exists-in-project, title: required string max:160, stance: nullable in:straight,subverted,lampshaded,inverted,averted,played_with, scope_type: required in:section,work,entry (mapped to morph FQCNs server-side), scope_id: required int + must belong to this project (per-type check), entry_id: nullable exists-in-project, notes: nullable string}`; mark `{role: required in:setup,develop,payoff, work_section_id: required + section's work belongs to project, anchor_text: nullable string, anchor_offset_hint: nullable int, note: nullable string}`.
- [ ] Responses: index endpoints return full rows incl. thread `status` (from the service); `writing.threads.index` with `section_id` also returns each thread's marks in that section (the sidebar's feed); `writing.promises.index` returns the service's grouped array verbatim. Card destroy = soft delete, 200 `{deleted: true, threads_kept: <count>}`.
- [ ] TDD `PatternHttpTest.php` (Gate::before bypass) + `PatternHttpAuthorizationTest.php` (real policies, per the Fdx/Revision precedent): happy paths all 11; scope_id cross-project rejection per type; filters; promises endpoint; non-member 403/404 on all; cross-project 404 via assertScoped.
- [ ] Commit `feat(threads): pattern HTTP surface`.

### Task 4: Seeded library (app)

- [ ] `database/data/pattern-cards.php` returns an array of card rows. 18 cards — devices: Chekhov's Gun, Foreshadowing, Red Herring, Dramatic Irony, Plant and Payoff, MacGuffin, In Medias Res, Frame Story, Unreliable Narrator, Motif, Callback; tropes: The Mentor's Death, The Reluctant Hero, Bookends, The Reveal, Bittersweet Ending, False Victory, Dark Night of the Soul. Every card ships `name, kind, definition, craft_guidance, pitfalls, shape` — ALL WRITTEN FRESH in original phrasing (never copied from TV Tropes or any source), 2–4 sentences per field, practical writer-facing voice. Template quality bar (write the remaining 16 to match):
```php
[
    'name' => 'Chekhov\'s Gun',
    'kind' => 'device',
    'definition' => 'An element introduced with enough emphasis that the audience registers it must matter later. The introduction is a promise; the later use is the payment.',
    'craft_guidance' => 'Plant it doing something innocent so the emphasis feels earned, not flagged. The payoff lands hardest when the audience remembers the plant only as the payoff arrives.',
    'pitfalls' => 'A gun that never fires reads as sloppy, not mysterious. Too heavy a plant telegraphs the ending; too light a plant makes the payoff feel unearned or contrived.',
    'shape' => 'Setup: the element appears with weight. Payoff: it becomes decisive, ideally at a moment of maximum pressure.',
],
[
    'name' => 'False Victory',
    'kind' => 'trope',
    'definition' => 'The protagonist appears to win before the true crisis reveals itself, and the apparent triumph collapses into the real low point.',
    'craft_guidance' => 'Let the victory resolve a real problem — just not the deepest one. The collapse should expose that the protagonist solved the wrong thing.',
    'pitfalls' => 'If the victory is obviously hollow, the audience waits impatiently for the drop. If the collapse comes from nowhere, it reads as cruelty rather than consequence.',
    'shape' => 'Setup: a goal achieved mid-story with celebration. Payoff: the achievement unravels or reveals the greater threat.',
],
```
- [ ] `PatternCardSeeder` (in the structure-seeder family — read how existing structure seeders register + how they resolve the target project) inserts the 18 with `is_seeded => true`, idempotent by `(project_id, slug)` (skip existing — never overwrite owner edits). Wire into the structure seeder chain the way sibling seeders are registered.
- [ ] Run live for Andrew's project(s) via the seeder path used by structure seeders; verify with a `database-query` count.
- [ ] Test `PatternCardSeederTest.php`: seeds 18, is idempotent, never overwrites an edited card (edit one field, reseed, assert preserved).
- [ ] Commit `feat(threads): seeded pattern library (18 cards)`.

### Task 5: Frontend A — API + MarkThread dialog + entry points (core)

- [ ] `threadApi.ts`: typed fetch helpers for all Task-3 endpoints; import `outlineApiHeaders` (never copy). Exported TS types: `PatternCard`, `PatternThread` (with `status: {state: 'kept'|'open', unplanted: boolean}`), `PatternMark`, `PromiseGroup` — field names exactly as the HTTP responses.
- [ ] `MarkThreadModal.tsx` (MarkRevisionModal is the pattern — read it): two-step body in one modal: (1) thread picker — searchable existing open threads + "New thread…" inline form (card select grouped by kind, title, stance select, scope picker: current section's ancestors nearest-first → this work → the work's linked compendium entry + its ancestors when `work.entry_id` exists); (2) mark fields — role radio (setup default), note. When opened from an editor selection, `anchor_text`/`anchor_offset_hint` are passed in and shown as a quoted snippet. Success: inline confirmation, close.
- [ ] Entry points: Kanban card menu + outline row menu gain "Mark device…" (locked to that section); editor selection bubble (read AddCommentBubble; add the sibling action) captures the selection as the anchor; File-tab ribbon `threads` group button `mark-thread` (icon `fa-solid fa-book-bookmark`, visible when canUpdate) opens it unlocked on the current section.
- [ ] Lang keys `writing.threads.*` for every string. App vitest fixture updates (ribbon items list etc.).
- [ ] Gates: tsc, `npm run test:run`, `npm run build`. Commits: core `feat(threads): mark-thread dialog + entry points`, app fixtures commit.

### Task 6: Frontend B — Threads panel, detail, Reports, dashboard, chips (core)

- [ ] Sixth built-in sidebar mode `threads` (icon `fa-solid fa-wand-magic-sparkles`, label key `writing.threads.sidebar_label`) — register exactly like `history` (panelMode allow-list + PanelModeSwitcher + Workspace branch). `ThreadsPanel.tsx`: section header "In this scene" (threads with marks here — role chip, thread title, card name, status dot) + "Open promises in this work" list; rows open `ThreadDetailModal.tsx`: card definition/craft_guidance/pitfalls (collapsible), stance, scope, marks in list order with section titles + jump (navigate to `#scene-n` anchor / section), add-mark shortcut (opens MarkThreadModal locked to the thread), edit scope/stance, delete mark/thread (confirms).
- [ ] Reports view gains a **Promises** group (read how existing Reports groups render): open promises table (thread, card, setup location, scope, age in days), kept count, stance distribution (count per stance).
- [ ] Writing hub `/p/{project}/writing` (writing.project page): "Devices & Tropes" library section — `PatternLibrary.tsx` card list grouped by kind with create/edit modal (all card fields, textarea for the three prose fields) + delete (confirm explains threads keep working); plus the cross-work **Open promises** block rendering `writing.promises.index` groups (scope heading, thread rows, oldest first).
- [ ] Kanban stance chips: cards whose section carries marks show up to 3 small chips (role letter + stance color token) — read the mood-accent token approach in the Kanban view and reuse its palette utilities.
- [ ] Lang keys; vitest for pure helpers (promise grouping render map, age formatting); fixture updates. Gates: tsc, `npm run test:run`, `npm run build`, `php artisan test --compact --filter=WorkSection` regression.
- [ ] Commits core + app tests.

### Task 7: Browser smoke + full verification + roadmap

- [ ] `tests/Browser/Writing/ThreadsTest.php` (RevisionsTest idioms — its wait helpers pattern): seed a card via factory → workspace → mark a setup from the File-tab dialog (new thread, scope = entire work) → open Threads sidebar → open promise listed → mark payoff on a later section (row-menu path) → panel/report shows kept. Second scenario: entry-scoped thread with payoff in a second work linked to a child entry → promises endpoint empties (HTTP-level assert is fine inside the browser test file if UI reach is awkward — document the choice).
- [ ] Full gates (all foreground, report numbers): `--filter=Pattern`, `--filter=Writing` (pre-existing skips/failures on main are not yours), `npm run test:run`, tsc, pint, `npm run build`.
- [ ] Roadmap: in `alexandria-app/docs/REMAINING-ROADMAP.md` below the Scoped revisions line add: `- ✅ **Devices & Tropes (threads + promises)** shipped 2026-08-29: seeded editable pattern library, scoped thread instances (act/work/compendium node), setup/develop/payoff marks with optional prose anchors, derived open-promise tracking across works, Threads sidebar + Reports + dashboard surfaces. Spec: alexandria-core docs/superpowers/specs/2026-08-29-devices-tropes-design.md.`
- [ ] Commits.

## Self-review notes (applied)

- Spec coverage: data model→T1; derived status+promises→T2; HTTP→T3; seeded library→T4; surfaces 1 (library)→T6, 2 (marking, all four entry points)→T5, 3 (sidebar)→T6, 4 (Reports)→T6, 5 (dashboard)→T6, 6 (chips)→T6; testing section mapped across T2/T3/T4/T7; out-of-scope respected (no margin rail, no AI suggestion, no positional ordering).
- Type consistency: `status()` shape `{state, unplanted}` identical in T2 interface, T3 responses, T5 TS types. Stance/role/kind enumerations appear once in Global Constraints and are referenced, not restated divergently.
- Route names use the existing `writing.` namespace beside `writing.project`; no collision (checked live route list — only `writing.index`/`writing.project` exist).
- Marks keep both timestamps (editable note/role) — deliberate divergence from `work_section_versions`' immutable no-UPDATED_AT style; noted for T1's implementer.
