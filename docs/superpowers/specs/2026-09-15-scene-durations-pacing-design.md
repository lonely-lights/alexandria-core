# Scene Durations & Pacing Markers — Design

> **2026-09-20 decision:** Andrew approved the combined outline-and-pacing direction. Read the [combined design supplement](2026-09-20-rapid-outline-and-pacing-design.md) and its [reliability](../plans/2026-09-20-rapid-outline-1-reliability.md) → [timing](../plans/2026-09-20-rapid-outline-2-pacing.md) plans as the execution source of truth. They resolve boundary anchors, incomplete timing, bulk-save integration, range preservation, and lifecycle behavior. The draft below remains the historical source; implementation has not started.

**Status:** DRAFT for owner review 2026-09-15. Owner rulings from the brainstorm: duration is **authored, never derived** ("a block that describes a slow action could make a single page more than 3 minutes… whatever is set for that time in a scene (or chapter…), that's what it reads"); markers carry a **target plus an optional anchor**; surfaces are the **outline, the Navigator, and a dedicated pacing view** (Kanban deliberately not selected); existing synopsis estimates are **migrated, not retyped**; unestimated scenes stay **visible, never zero-filled**.
**Repos:** `alexandria-core` (migrations, model cast, pacing model, outline/Navigator/pacing UI), `alexandria-app` (validation, payloads, backfill command, tests).
**Branch:** `feat/scene-durations` (both repos).

## The idea

Time becomes a dimension of the outline. Every section can carry an authored duration; the app owns all the arithmetic that follows — the running clock, act subtotals, where a structural marker lands, and how much runtime is left before and after it. Today those estimates live as prose inside each synopsis (`Estimated runtime: 3:30`), so nothing can add them up and the writer holds the totals in their head.

The driving use case: a three-hour film whose beat targets are derived from a timing breakdown of another film, where the writer needs to see how much real estate sits in front of and behind each marker while arranging scenes.

## Owner decisions (locked)

- **Authored only.** No page-count-derived duration, and no second competing number. The typed value is the truth at every level.
- **Any structure.** Duration applies to any section — scene, chapter, act — not only screenplay scenes.
- **Container duration is a budget.** An act set to `50:00` whose scenes sum to `64:00` is not a contradiction; the difference (over by `14:00`) is the readout. Same rule for the work against its target runtime.
- **Markers keep percentage targets.** The minute value is derived from the work's target runtime, so a retarget moves every marker correctly and an imported percentage map stays proportional.
- **Unknowns stay visible.** A blank duration is never treated as zero. Totals containing unknowns are presented as floors.

## Data model

Both columns are added **in place to the existing create migrations** (alpha policy — no incremental `add_*` migrations) and applied to the live local database with tinker.

- **`work_sections.duration_seconds`** — `unsignedInteger`, nullable, added to `0001_01_01_000910_create_work_sections_table.php`. On a leaf it is the section's runtime. On a container it is the container's budget.
- **`works.target_runtime_seconds`** — `unsignedInteger`, nullable, added to `0001_01_01_000900_create_works_table.php`. The whole work's budget.
- **Markers** — `length_plan.structure.beats[]` gains an optional `anchor_section_id` (`number | null`). The existing `{ name, target, tolerance }` shape is untouched; `target` remains a percentage of total length and `tolerance` remains percentage points.

`WorkSection` and `Work` cast the new columns to `integer`. No new tables.

### Semantics

| Level | Authored value | Actual | Gap |
|---|---|---|---|
| Leaf section | its runtime | — | — |
| Container section | its budget | sum of descendant leaves | budget − actual |
| Work | `target_runtime_seconds` | sum of all leaves | target − actual |

**Only leaves advance the running clock.** A container's budget is never added to the timeline, which is what prevents double counting when an act carries a budget and its scenes carry durations.

## The pacing model

A pure module at `alexandria-core/resources/js/pages/Writing/pacing/pacingModel.ts`, following the `flowModel.ts` precedent: no DOM, no React, unit-tested directly. Every surface renders this model rather than doing its own arithmetic, which is what keeps three views agreeing and lets a drag update the clock with no server round trip.

**Input:** the section tree (carrying `duration_seconds`), the work's `target_runtime_seconds`, and the markers.

**Output:**

- `rows[]` — one per section in tree order: `{ section, depth, isContainer, durationSeconds, startsAtSeconds, endsAtSeconds, unknownBefore }`. A container's `startsAtSeconds` is its first descendant leaf's start and its `endsAtSeconds` its last descendant leaf's end, so a container spans its children rather than occupying time of its own.
- `containers` — keyed by section id: `{ budgetSeconds, actualSeconds, unknownCount, gapSeconds }`.
- `markers[]` — `{ name, targetPercent, targetSeconds, anchorSectionId, landsAtSeconds, gapSeconds, status }` where status is one of `on-target` | `early` | `late` | `unanchored` | `unknown`. `on-target` means the gap is within `tolerance` converted from percentage points to seconds. With no `target_runtime_seconds` set on the work, `targetSeconds` and `gapSeconds` are null and every anchored marker reports `unknown`; the percentage target still renders, so markers remain useful before a runtime is chosen.
- `totals` — `{ authoredSeconds, unknownCount, targetRuntimeSeconds, remainingSeconds }`.

**Unknown handling.** A null leaf duration does not stop the walk. `startsAtSeconds` remains the sum of *known* durations before the row, and `unknownBefore` counts how many blanks precede it. Any figure with unknowns behind it renders as a floor (`≥ 1:04:00`). A marker anchored after a blank reports status `unknown` rather than a false gap.

## Surfaces

**Outline view** — the primary surface. A duration column editable in place (`mm:ss`), a running clock down the side, container rows showing budget against actual with the gap, and markers drawn inline at the row they anchor to. This is where arranging happens, so this is where the numbers earn their keep.

**Navigator** — read-only. Each section's duration and each container's total, so the shape stays in peripheral vision while writing. No editing here; it is a reading surface.

**Pacing view** (phase 2) — a new entry in the existing view switcher beside Continuous, Focus, Outline and Kanban. A horizontal time ruler for the whole work, scenes as proportional blocks, markers as vertical lines, making gaps and pile-ups legible at a glance.

**Editing lives in two places only:** durations inline in the outline, and the work's target runtime plus the marker list (including each marker's anchor) in Work Settings.

## API (app-side — writing routes/controllers live in `alexandria-app`)

- `PUT …/works/{work}/sections/{section}` accepts `duration_seconds`: `nullable|integer|min:0|max:86400`.
- `PUT …/works/{work}` accepts `target_runtime_seconds`: `nullable|integer|min:0|max:86400`.
- Marker `anchor_section_id` validates as nullable integer that exists **within this work** — a section id from another work is rejected, matching the existing cross-work guards.
- `SectionTreeService::payload()` and the Navigator tree node payload both gain `duration_seconds`.

Authorization is unchanged: the existing `can:update,work` middleware already covers every route touched.

## Migration of existing estimates

A one-shot local command, `local:writing:backfill-durations`:

- Reads `Estimated runtime: M:SS` (and `H:MM:SS`) out of each section's synopsis into `duration_seconds`.
- Strips that line from the synopsis, along with a trailing separator left behind, so the estimate lives in exactly one place.
- **Dry run is the default.** Writing requires `--apply`, and the dry run prints every section it would touch with the parsed value.
- Leaves a synopsis with no runtime line completely alone, and never overwrites a `duration_seconds` that is already set.
- A database snapshot is taken before the applying run.
- The command is deleted once the backfill has run, per the temporary-code policy.

On the current corpus this lifts roughly thirty estimates; fifteen sections have no estimate and stay null by design.

## Testing

- **Vitest (model):** leaf sums, container budget against actual, containers not double-counting the clock, unknown counting and floor semantics, marker landing/gap/status including tolerance edges, unanchored markers, an empty work.
- **Vitest (surfaces):** the outline renders durations and the running clock and shows a floor when unknowns precede a row; the Navigator renders per-section durations and container totals.
- **Pest (endpoints):** section update accepts and validates `duration_seconds`; the section and tree payloads carry it; work update accepts `target_runtime_seconds`; a marker anchor from a foreign work is rejected.
- **Pest (backfill):** dry run changes nothing; apply parses and strips correctly; a synopsis without a runtime line is untouched; an already-set duration is not overwritten.
- **Browser:** the outline's running clock updates after a reorder.

## Sequencing

**Phase 1** — schema, casts, payloads, validation, the pacing model, the outline and Navigator readouts, and the backfill. This is the part that answers the pacing questions.

**Phase 2** — the dedicated pacing view, built on the same model once the numbers have been proven against a real film.

## Out of scope (deliberate)

- Duration derived from page or word count. Owner ruling: authored is the truth, and a slow page breaks the page-per-minute convention.
- Any planned-versus-measured drift readout, which follows from the same ruling.
- Timing on the Kanban board (offered, not selected).
- Timing inside the continuous-flow and focus editors; this is an outlining concern.
- Auto-adjusting a duration when a scene's prose changes.
- Import of an external timing breakdown. The Abyss note stays a note; markers are entered in Work Settings.
