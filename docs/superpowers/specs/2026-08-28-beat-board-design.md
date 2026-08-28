# Beat Board — Design

**Status:** DRAFT — awaiting owner ratification (direction ratified in the 2026-08-28 outline walkthrough: "Let's work towards a true Beat Board").
**Repos:** `alexandria-core` (all frontend + one projection addition consumed from the app controller), `alexandria-app` (controller field addition + tests).
**Branch:** `feat/beat-board` (both repos).
**Foundation:** builds entirely on the shipped Outline Mode machinery — the outline projection (GET), the transactional bulk `PUT /works/{work}/outline`, the beat PATCH, and `works.sections.update`. **No new endpoints, no migrations** (the craft fields `goal/conflict/stakes/mood/tone/beat_type` have lived on `work_sections` since the planning layer; this feature finally surfaces them).

## Goal

A spatial, index-card view of a work: one card per scene, organized in act columns, carrying the scene's plan (synopsis, beats) and its dormant craft fields (goal, conflict, stakes, mood, tone, beat type). The Outline view is for *drafting* the plan; the Beat Board is for *reading the shape* of the story and rearranging it — corkboard energy, drag-to-reorder, color by mood.

## The view

**A fourth workspace view mode: `board`** — fourth segment on the Continuous/Focus/Outline pill and a View-tab ribbon toggle, persisted per work like the others (`viewMode.ts` widens again). Chrome behaves as in outline mode: sidebar available, no floating Sections navigator (the board is its own map).

**Layout — columns by top-level container.** Each top-level section (Act/Part/whatever the work's roots are) is a column with its title as the header; its scene descendants render as cards in order, flattened depth-first (chapters inside an act contribute their scenes to the act's column, with a slim chapter divider row between groups so novel structures read correctly). A work with no containers (flat scenes at root) renders one untitled column. Horizontal scroll for many acts; column min-width ~280px.

**The card.** Front face, top to bottom:
- Label chip + **title** (inline-editable)
- **Synopsis** (inline-editable, 2-3 line clamp with expand)
- **Beats** as the same check-off list the outline uses (toggle via the beats PATCH; text editable; Enter adds a beat — reusing the outline's reducer semantics where practical)
- **Craft strip**: `beat_type` as a small chip; `goal / conflict / stakes` as three compact labeled fields, hidden behind a "Craft" disclosure on the card (collapsed by default so cards stay scannable); `tone` as a text field beside mood in the disclosure
- **Mood = the card's color accent**: a 4px left border + faint wash derived from a fixed 8-swatch palette mapped by mood value; unset mood = neutral. The mapping lives in one exported module so the palette is testable and reusable.
- Word count + status corner badge (existing row data; read-only here)

**Card interactions:**
- Click anywhere editable → edit in place (saves: title/synopsis/craft fields via `works.sections.update` single-section PUT — the PlanBlock precedent; beats via the beats PATCH).
- **Drag a card** within a column → reorder among its siblings; **drag across columns** → reparent to that container (position at drop index). Both apply through the bulk outline PUT (complete row set, identity-safe — exactly what it was built for). Native HTML5 drag-and-drop, no new dependencies; keyboard fallback: Alt-↑/↓ reorders the focused card, per the outline's idiom.
- **Jump-to-scene**: a corner "open" icon (and double-click on the card header) navigates to the scene in the writing view via the existing `selectSection` wiring.

**Save semantics:** identical layering to the rest of the desk — structural drags debounce through the bulk PUT with the same 800ms/flush/conflict handling (`useOutlineSync` is reused, not duplicated); field edits save on blur; the unsaved-work unload guard and pagehide keepalive net apply automatically because the sync hooks already carry them.

## Data plumbing (the only backend change)

`WorkOutlineController@show`'s projection rows gain the craft fields:
`'beat_type' => …, 'goal' => …, 'conflict' => …, 'stakes' => …, 'mood' => …, 'tone' => …, 'word_count' => …, 'status' => …`.
The bulk PUT does NOT accept these (they save through `works.sections.update`, which already validates them) — the projection is read-enrichment only, so the outline PUT's contract is untouched. `ServerOutlineRow`/`OutlineRow` widen accordingly (optional fields; the outline view simply ignores them).

## Components (core, `resources/js/pages/Writing/Board/`)

| File | Role |
|---|---|
| `BoardView.tsx` | columns layout, DnD orchestration, consumes `useOutlineSync` |
| `BoardCard.tsx` | one scene card (front face + craft disclosure) |
| `boardModel.ts` | pure: rows → columns/cards mapping (top-level grouping, chapter dividers), drop-target → row-mutation translation (reorder/reparent producing the new row array) — the Vitest surface |
| `moodPalette.ts` | pure: mood string → accent color mapping |

Workspace/ribbon/viewMode wiring mirrors the outline-mode additions exactly.

## Testing

- **Vitest:** `boardModel` (grouping incl. chapters-in-acts and flat works; drag translations: within-column reorder, cross-column reparent, drop-at-end; divider placement), `moodPalette` mapping + unknown-mood fallback.
- **Pest:** projection craft-field enrichment (one test extending `WorkOutlineControllerTest`).
- **Browser smoke:** switch to board → cards render with synopsis/beats → toggle a beat → edit a goal in the craft disclosure → drag a card to another column → assert the Navigator (back in continuous) reflects the move.

## Out of scope (deliberate)

Beat-level cards (beats stay ON scene cards) · swimlanes by anything other than top-level containers · card cover images · filtering/search on the board · Save-the-Cat/template overlays (still its own deferred item) · mood palette customization (fixed 8 swatches v1) · touch DnD polish beyond what native DnD gives (mobile uses outline/ghost surfaces).

## Open items for owner ratification

1. **Columns = top-level containers** (kanban by act) vs one continuous grid — spec assumes columns; say the word if you want a flat grid instead.
2. **Craft fields behind a disclosure** (scannable cards) vs always visible (denser cards) — spec assumes disclosure.
3. **Mood palette**: fixed 8 swatches mapped by mood text v1 — name-matching ("tense" → red-ish) is fuzzy by nature; unknown moods go neutral. Good enough for v1?
