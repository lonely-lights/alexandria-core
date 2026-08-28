# Beat Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fourth workspace view — act columns of index cards, one per scene, carrying synopsis, beats, and the craft fields (goal/conflict/stakes/mood/tone/beat_type), with drag reorder/reparent riding the existing bulk outline PUT.

**Architecture:** Pure read-enrichment of the outline projection (craft fields join the rows); all board structure/drag logic lives in a pure `boardModel.ts` translated onto the existing `useOutlineSync` row array; field edits save through `works.sections.update` (which already validates every craft field — verified) and beats through the existing beats PATCH. No new endpoints, no migrations.

**Tech Stack:** Laravel 13 (one controller enrichment), React 19 + TS in core `resources/js/pages/Writing/Board/`, native HTML5 drag-and-drop (no new deps), Pest + Vitest + one Pest browser smoke.

**Spec:** `alexandria-core/docs/superpowers/specs/2026-08-28-beat-board-design.md` (RATIFIED — the binding authority).

## Global Constraints

- Branches: `feat/beat-board` in BOTH repos (already cut). Core reaches the app via the path-repo symlink; run builds/tests from `alexandria-app`.
- **No new endpoints, no migrations, no new npm/composer dependencies.** Native HTML5 DnD only.
- The bulk outline PUT contract is UNTOUCHED: complete surviving row set, parents before children, explicit `deleted`, `baseVersion`. Craft fields are NEVER sent through it — they save via `works.sections.update` (PUT `…/sections/{id}` — validates `beat_type/tone/goal/conflict/stakes/mood` already, all nullable strings; the route also requires `title`, so single-field saves send `{title: current, <field>: value}` like PlanBlock does).
- Authorization stays route-middleware-only; fetch-consumed endpoints return JSON.
- UI strings via translation keys in core `lang/en/writing.php` (`board.*` group) — no inline English.
- Reuse, don't duplicate: `useOutlineSync` (rows + bulk save + guards), the beats PATCH pattern from `OutlineView.toggleBeat`, the `router.put` field-save pattern from `PlanBlock.tsx`, view-mode/ribbon wiring patterns from the outline-mode commits (`viewMode.ts`, `FlowToggle.tsx`, `writingRibbonContext.ts`, `writingRibbonTabs.tsx`, `Workspace.tsx`).
- Pest style: brace-free interpolation + chained `->and()`. `vendor/bin/pint --dirty --format agent` before app PHP commits. TS strict; `npx tsc --noEmit` + `npm run build` must stay clean.
- Read before coding: the outline-mode spec + the files in `resources/js/pages/Writing/Outline/` — the Board is their spatial sibling and should feel code-related.

## File Map

| File | Role |
|---|---|
| app `app/Http/Controllers/Writing/WorkOutlineController.php` | projection rows gain craft fields + word_count + status |
| app `tests/Feature/Writing/WorkOutlineControllerTest.php` | enrichment assertions |
| core `resources/js/pages/Writing/Outline/outlineTypes.ts` | optional craft fields on `ServerOutlineRow`/`OutlineRow` |
| core `resources/js/pages/Writing/Outline/outlinePayload.ts` | `rowsFromProjection` passes them through; `buildOutlinePayload` does NOT serialize them |
| core `resources/js/pages/Writing/Board/moodPalette.ts` | NEW pure: mood → accent |
| core `resources/js/pages/Writing/Board/boardModel.ts` | NEW pure: rows → columns/cards + drag translations |
| core `resources/js/pages/Writing/Board/BoardCard.tsx` | NEW card component |
| core `resources/js/pages/Writing/Board/BoardView.tsx` | NEW columns + DnD orchestration |
| core `Flow/viewMode.ts`, `Flow/FlowToggle.tsx`, `ribbon/writingRibbonContext.ts`, `ribbon/writingRibbonTabs.tsx`, `Workspace.tsx` | fourth mode `board` wiring |
| core `lang/en/writing.php` | `flow.board`, `ribbon.board_view`, `board.*` keys |
| app `resources/js/editor/tests/board-model.test.ts`, `mood-palette.test.ts` | NEW Vitest |
| app `tests/Browser/Writing/BeatBoardTest.php` | NEW smoke |

---

### Task 1: Projection craft enrichment (app)

**Files:**
- Modify: `app/Http/Controllers/Writing/WorkOutlineController.php` (the `projection()` row array)
- Test: `tests/Feature/Writing/WorkOutlineControllerTest.php` (extend)

**Interfaces:**
- Produces: every projection row additionally carries `'beat_type' => ?string, 'goal' => ?string, 'conflict' => ?string, 'stakes' => ?string, 'mood' => ?string, 'tone' => ?string, 'word_count' => int, 'status' => ?string`. The PUT contract is untouched.

- [ ] **Step 1: Failing test** — append to the existing test file:

```php
it('enriches projection rows with craft fields for the beat board', function () {
    outlineSection($this->work, [
        'title' => 'Card Scene', 'label' => 'Scene', 'position' => 1,
        'goal' => 'Name Zeal', 'conflict' => 'The room resists', 'stakes' => 'The story turns',
        'mood' => 'tense', 'tone' => 'clinical', 'beat_type' => 'Catalyst',
        'status' => 'draft', 'word_count' => 293,
    ]);

    $row = $this->actingAs($this->user)
        ->getJson(route('works.outline.show', [$this->project, $this->work]))
        ->assertOk()
        ->json('rows.0');

    expect($row['goal'])->toBe('Name Zeal')
        ->and($row['conflict'])->toBe('The room resists')
        ->and($row['stakes'])->toBe('The story turns')
        ->and($row['mood'])->toBe('tense')
        ->and($row['tone'])->toBe('clinical')
        ->and($row['beat_type'])->toBe('Catalyst')
        ->and($row['status'])->toBe('draft')
        ->and($row['word_count'])->toBe(293);
});
```

- [ ] **Step 2: Run to fail:** `php artisan test --compact --filter=WorkOutlineController`.
- [ ] **Step 3: Implement** — in `projection()`'s row array add:

```php
'beat_type' => $section->beat_type,
'goal' => $section->goal,
'conflict' => $section->conflict,
'stakes' => $section->stakes,
'mood' => $section->mood,
'tone' => $section->tone,
'word_count' => $section->word_count,
'status' => $section->status,
```

- [ ] **Step 4: Run to pass** (whole filter — the PUT tests must stay green, proving the write contract untouched).
- [ ] **Step 5: Commit:** `pint --dirty --format agent`, then `feat(board): craft fields on the outline projection`.

---

### Task 2: Pure board domain — model, palette, type widening (core + app tests)

**Files:**
- Modify: core `resources/js/pages/Writing/Outline/outlineTypes.ts`, `outlinePayload.ts`
- Create: core `resources/js/pages/Writing/Board/moodPalette.ts`, `boardModel.ts`
- Test: app `resources/js/editor/tests/board-model.test.ts`, `mood-palette.test.ts`

**Interfaces (produces):**

```ts
// outlineTypes.ts — BOTH row interfaces gain (all optional):
beatType?: string | null; goal?: string | null; conflict?: string | null;
stakes?: string | null; mood?: string | null; tone?: string | null;
wordCount?: number; status?: string | null;
// (server keys are snake_case: rowsFromProjection maps beat_type→beatType, word_count→wordCount;
//  buildOutlinePayload MUST NOT serialize any of them — assert that in tests.)

// moodPalette.ts
export interface MoodAccent { border: string; wash: string }
export function moodAccent(mood: string | null | undefined): MoodAccent
// 8 fixed swatches keyed by fuzzy name-groups (substring match, case-insensitive):
// tense/anxious/dread → red; sad/somber/grief → blue; hopeful/warm/tender → amber;
// eerie/mysterious/uncanny → violet; action/urgent/chase → orange;
// calm/quiet/still → teal; joyful/light/comic → green; cold/clinical/detached → slate.
// Unknown/empty → neutral (var(--theme-base-400)-based). Colors are CSS strings built on
// color-mix over theme tokens, e.g. border 'color-mix(in srgb, #e5484d 70%, var(--theme-base-content))'
// is WRONG — no hex constants; use the theme's status/brand tokens where natural and
// plain named hues via color-mix with the theme content color for the rest. Keep every
// swatch defined in ONE exported map so tests can enumerate it.

// boardModel.ts
export interface BoardCardModel { row: OutlineRow; dividerTitle: string | null }
export interface BoardColumn { key: string; title: string; containerRow: OutlineRow | null; cards: BoardCardModel[] }
export function buildBoardColumns(rows: OutlineRow[]): BoardColumn[]
// Grouping: each depth-0 row = a column (containerRow set, title = its title).
// A column's cards = every DESCENDANT row that has no descendants of its own ("leaf scenes"),
// in document order. A leaf's nearest ancestor BETWEEN it and the column root (e.g. a
// chapter) sets dividerTitle on the FIRST card of each such group (null otherwise).
// Depth-0 rows that are themselves leaves (flat works): one synthetic column
// { key: 'root', title: '', containerRow: null } holding them, ordered, no dividers.
// Mixed trees: the synthetic root column appears first if any root-level leaves exist.

export interface CardDrop { cardKey: string; targetColumnKey: string; beforeCardKey: string | null }
export function applyCardDrop(rows: OutlineRow[], drop: CardDrop): OutlineRow[]
// Translates a drop into a new complete row array for useOutlineSync.setRows:
// moves the card row (and, invariantly, a leaf has no subtree) to the target container —
// parentKey = target containerRow.key (or null for the synthetic root column) and depth =
// container depth + 1 (0 for root); insertion point = before `beforeCardKey`'s row, or at
// the end of the target column's last card's position when null. When the target column has
// intermediate containers (chapters), dropping into the column appends RELATIVE TO THE CARDS
// AS DISPLAYED — the moved row is inserted adjacent to the reference card with the SAME
// parentKey as that reference card (so dropping between two chapter-2 scenes joins chapter 2).
// When beforeCardKey is null and the column has cards, adopt the LAST card's parentKey/depth.
// Empty column: parent = containerRow, depth = containerRow.depth + 1.
// Unknown keys → return `rows` unchanged (defensive, same posture as the outline reducer).
```

- [ ] **Step 1: Failing Vitest** — `board-model.test.ts` fixtures: act→scenes; act→chapters→scenes (divider on first scene of chapter 2); flat work (synthetic root column); drop within column (reorder before a sibling); drop across columns (reparent adopts reference card's parentKey); drop to empty column; drop with null beforeCardKey (append, adopts last card's parent); unknown key no-op. `mood-palette.test.ts`: each named group maps to its swatch; unknown + null + '' → neutral; the exported map has exactly 8 entries.
- [ ] **Step 2: Fail run:** `npm run test:run -- board`.
- [ ] **Step 3: Implement** the three modules + `rowsFromProjection` mapping (+ a payload test asserting craft fields never appear in `buildOutlinePayload` output rows).
- [ ] **Step 4: Pass run** + `npx tsc --noEmit`.
- [ ] **Step 5: Commit** core (`feat(board): board model, mood palette, projection craft passthrough`) and app tests separately.

---

### Task 3: BoardCard component (core)

**Files:**
- Create: core `resources/js/pages/Writing/Board/BoardCard.tsx`
- Modify: core `lang/en/writing.php` (`board.*` card keys)
- Test: none new beyond Task 2's pure coverage (interaction covered by Task 5's smoke) — but the component must type-check and build.

**Interfaces:**
- Produces: `<BoardCard card={BoardCardModel} projectSlug workSlug canUpdate accent={MoodAccent} onRowEdit(key, patch) onBeatToggle(row, beat) onOpen(slug) dragHandleProps />`
- Consumes: `moodAccent`, the `router.put` single-section save pattern from `PlanBlock.tsx` (send `{title, <field>}` to `works.sections.update`, `only: ['currentSection','sections']` NOT needed here — board reads from the outline projection, so use `preserveState: true, preserveScroll: true, only: []` and optimistically patch local rows via `onRowEdit`), the beats PATCH pattern from `OutlineView.toggleBeat`.

- [ ] **Step 1: Implement the card**: mood accent (4px left border + wash background from `accent`); label chip + inline title input; clamped synopsis textarea (expand on focus); beats checklist (toggle dot → PATCH via callback, text inputs editable, Enter adds a beat — local edit through `onRowEdit` patching the row's beats then flushing through the board's sync); craft disclosure (`<details>`-style toggle button, chevron) containing `beat_type` chip-input, `goal/conflict/stakes` compact labeled textareas, `tone` input; footer: word count + status badge (read-only); corner open icon → `onOpen(row.slug)` (guard null slug). All strings via `t('writing.board.…')`; every field disabled when `!canUpdate`. Blur on any field triggers its save (craft/title/synopsis via the section PUT; beats ride the board sync flush).
- [ ] **Step 2:** `npx tsc --noEmit` + `npm run build` clean.
- [ ] **Step 3: Commit** (`feat(board): scene index card`).

---

### Task 4: BoardView + fourth view mode wiring (core)

**Files:**
- Create: core `resources/js/pages/Writing/Board/BoardView.tsx`
- Modify: core `Flow/viewMode.ts` (union + MODES + doc), `Flow/FlowToggle.tsx` (fourth segment, `data-flow-toggle-board`), `ribbon/writingRibbonContext.ts` (nothing new — `viewMode`/`setViewMode` already threaded), `ribbon/writingRibbonTabs.tsx` (a `board-view` toggle beside `outline-view`, same shape), `Workspace.tsx` (render branch: `viewMode === 'board'` → `<BoardView …/>`; the floating Sections layer stays hidden for board exactly like outline — extend that condition; leaving board → the same `sections` reload treatment as leaving outline: generalize `leavingOutline` to `leavingStructuralView = (viewMode === 'outline' || viewMode === 'board') && next !== …`), core `lang/en/writing.php` (`flow.board`, `ribbon.board_view`)
- Modify: app `resources/js/pages/Writing/tests/viewMode.test.ts` + `resources/js/ribbon/tests/writing-ribbon-tabs.test.ts` (extend like outline mode did)

**Interfaces:**
- Consumes: `useOutlineSync` (rows/setRows/flush/status/blocked/reload — the board never talks to the PUT directly), `buildBoardColumns`, `applyCardDrop`, `BoardCard`, `moodAccent`.
- Produces: `<BoardView projectSlug workSlug canUpdate onNavigate />`; `WorkspaceViewMode = 'continuous' | 'focus' | 'outline' | 'board'`.

- [ ] **Step 1: BoardView**: horizontal scroll container; columns from `buildBoardColumns(rows)`; column header = title + card count; cards render `BoardCard` with `moodAccent(row.mood)`; chapter `dividerTitle` renders a slim divider row above its card. **DnD**: cards `draggable` when `canUpdate`; `onDragStart` stores the card key (dataTransfer + local ref); columns and card gaps are drop targets with visual insertion indicator; `onDrop` → `applyCardDrop` → `setRows(next)` (debounced bulk save + guards ride free); keyboard fallback Alt-↑/↓ on a focused card title = drop before previous / after next sibling card in the same column. Save-status chip reused from OutlineView's header pattern; blocked/conflict states surface the same way (reuse the strings).
- [ ] **Step 2: Wire the mode** exactly as the outline commits did (read them: `git log --oneline --grep=outline` in core, commits `3242bda`/`021aa2c` are the reference diffs). Extend the leaving-structural-view reload; ribbon toggle; FlowToggle fourth segment; viewMode widen + its app test.
- [ ] **Step 3:** `npm run test:run` (full), `npx tsc --noEmit`, `npm run build` — all clean.
- [ ] **Step 4: Commit** core (`feat(board): beat board view, fourth workspace mode`) + app test updates.

---

### Task 5: Browser smoke + full verification + docs (app)

**Files:**
- Create: `tests/Browser/Writing/BeatBoardTest.php` (copy `OutlineModeTest.php` idioms)
- Modify: `docs/REMAINING-ROADMAP.md` (Stage 11 list: Beat Board shipped line, mirroring the outline entry)

- [ ] **Step 1: Smoke** (one test): seed act+scenes with mood/goal/beats → switch to board via `data-flow-toggle-board` → assert columns + a card's synopsis + mood accent present (style attribute contains the accent border) → toggle a beat (strikethrough) → open the craft disclosure and edit goal, blur, assert persisted via a fresh projection fetch (or page reload) → drag is NOT smoke-tested via native DnD events if flaky within one attempt — fall back to the Alt-↑/↓ keyboard reorder and assert order change after save; note whichever path was used in the report.
- [ ] **Step 2:** `npm run build` then `php artisan test --compact tests/Browser/Writing/BeatBoardTest.php`; then the full suites: `php artisan test --compact --filter=Writing`, `npm run test:run`, `npx tsc --noEmit`, `vendor/bin/pint --format agent`.
- [ ] **Step 3:** Roadmap line + commit (`docs: beat board shipped note` + `test(board): browser smoke`).

## Self-review notes (applied)

- Spec coverage: columns/cards/craft/mood/DnD/jump/save-layering → T2-T4; enrichment → T1; testing section → T1-T5; out-of-scope respected (no new deps — native DnD; no beat cards; fixed palette).
- Contract safety: craft fields read-only in the outline PUT path (T2 asserts they never serialize) — the spec's "projection is read-enrichment only" holds.
- Type consistency: `BoardCardModel`/`BoardColumn`/`CardDrop`/`MoodAccent` names consistent across T2-T4; camelCase client fields with snake_case mapping pinned in T2.
- Known judgment already ledgered in spec: leaf-scenes-as-cards (containers never render as cards); drop-adjacency adopts the reference card's parent so chapter membership follows visual position.
