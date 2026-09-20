# Rapid Outline and Pacing — Combined Design

**Status:** Direction approved by Andrew on 2026-09-20; implementation not started. The detailed rules below resolve implementation ambiguities within that direction; they are not additional historical owner quotations.

**Sources:** [August outline design](2026-08-28-outline-mode-design.md), [September duration design](2026-09-15-scene-durations-pacing-design.md).

**Implementation:** [Plan 1: reliable outlining](../plans/2026-09-20-rapid-outline-1-reliability.md), then [Plan 2: authored timing](../plans/2026-09-20-rapid-outline-2-pacing.md).

This supplement governs conflicts between the two older documents. Their unaffected requirements remain in force. The old ghost block above the manuscript has already been replaced by a title-adjacent note button and a selectable, read-only modal with an explicit Edit action. Preserve that behavior.

## Outcome and delivery

A writer can type a section, indent it, assign time, rearrange it, and see the effect on an act without leaving Outline. The outline remains a projection of actual WorkSections. Beats remain checklist JSON, not hidden sections.

Deliver two independently testable increments:

1. Predictable hierarchy, safe section/beat conversion, stable focus, and reliable saving.
2. Authored durations, running time, container budgets, work target, boundary-anchored markers, and read-only Navigator timing.

The graphical pacing view is a subsequent phase, not a prerequisite for this delivery. Do not add Kanban timing, inferred duration, range arithmetic, intra-scene time offsets, outline templates, or outline drag-and-drop.

## Hierarchy and keyboard rules

- Resolve section tiers from the existing tree and the configured work-type template, not the deepest row currently visible. The server returns a stable ordered hierarchy of `{ label, isStructural }` tiers with the outline projection. Actual labels take precedence at occupied depths; template tiers fill missing depths. For mixed labels at a depth, use the nearest applicable sibling/parent branch as the default and preserve existing labels. Do not relabel the existing tree during load.
- An empty screenplay uses its configured Act → Scene tiers; an empty novel uses Chapter. A missing configured template falls back to Section. The deepest section tier is fixed for an editing session; creating/promoting a beat never invents a deeper tier. Reload hierarchy after a deliberate external tree change.
- Enter inserts a sibling after the current subtree. In a beat, it inserts the next beat. Tab makes a section a child of its previous sibling, not the previous sibling's last descendant. Shift+Tab moves a section after its former parent's entire remaining subtree. Alt+Up/Down moves whole sibling subtrees.
- At the deepest tier, Tab converts an eligible section into a beat of the preceding sibling section. Shift+Tab on a beat under a scene/chapter creates a sibling section after that section's subtree, removes the beat, and focuses the new section. A beat on a structural container promotes to a content section inside that container. Empty-work creation, keyboard commands, and paste share the same hierarchy resolver.
- Never capture Tab as structure editing inside the duration input; it moves focus normally. Keep structural shortcuts on title/beat fields. Respect IME composition; Enter during composition does not create rows.
- Backspace only requests deletion when the whole row is empty, not merely its title. Existing guarded deletion remains available through its explicit confirmation flow.

### Safe conversion

Eligibility is about what a section contains, not whether it has already autosaved. The server supplies `canBecomeBeat` plus a translated reason key; it rechecks under the write transaction. A section with children, manuscript content, notes, comments, mentions, thread references, revision history, nonempty beats, meaningful craft metadata, a duration (including explicit zero), or a pacing anchor is ineligible. No force conversion exists. Title and synopsis are the only authored fields folded into beat text.

Converting a saved section is one atomic operation: insert the destination beat and explicitly soft-delete the source. It must never produce both a surviving scene and a duplicate beat when a guard rejects it. The response retains the original draft on rejection. Ordinary delete confirmation and conversion are separate intents.

## Drafts, identity, and saving

- Client row keys stay stable while mounted. Resolving a temporary ID fills in `sectionId`; it does not change the React key or a child's `parentKey`. Resolve parents through the row map when serializing.
- One save is in flight per work. Later edits coalesce into the next request; acknowledgements clear only the mutations included in that request. Enter, blur, debounce, and pagehide share the queue. Keep the current 800 ms idle debounce.
- A completely empty temporary leaf row/beat is a local insertion placeholder and is omitted from the payload. It must not prevent completed rows from saving. A row with meaningful fields or children needs persistence even with a blank title: serialize a localized Untitled fallback, without replacing the focused draft text. A persisted title cleared by the writer uses the same fallback on commit. Empty placeholders do not by themselves trigger an unsaved-work warning.
- Keep parent links valid when filtering placeholders. Never omit an existing persisted row from a complete-tree request unless it is explicitly deleted. Do not silently drop a meaningful descendant of an unnamed parent.
- Network and validation failures retain the complete draft, deletion/conversion intent, and error state. Retry sends the latest draft. Do not label a newer dirty draft Saved when an older request succeeds.
- A lost response may mean the server committed a create. Before retrying that ambiguous request, fetch the authoritative version. If it changed, do not blindly resend temporary rows or silently pair them by title; enter recovery and explicitly match a local temporary row to a server-created row or retain it as a separate new section. This avoids duplicate scenes after a committed save loses its acknowledgement.
- A 409 preserves the local draft and the server projection separately. Pause autosave and show a conflict notice with Copy local outline, Retry after merge, and Reload server version. Offer a three-way merge against the last acknowledged projection: automatically combine disjoint scalar edits, retain local new rows, and require explicit choice for conflicting fields, deletes, or parent/order changes. Never silently adopt server structure and discard local rows/beats. Reload discards meaningful local changes only through an explicit confirmation.
- The server checks the version and applies changes under the same transaction. Replace count/second-resolution-timestamp versions with a deterministic fingerprint of the ordered editable state. Serialize structural mutations for each work with a shared work-row lock; lock existing section rows before reading the fingerprint. Acquire multiple work locks in ID order for transfers. A stale request returns 409 without mutation. Include fields affecting conversion eligibility in the authoritative guard check.
- Before changing views or opening Work Settings, drain the outline queue through the existing writing-save coordination seam. Failed/conflicting saves keep the draft mounted. Pagehide is best effort; retain the browser unsaved-work guard. Do not create a competing browser-local manuscript store.
- Kanban and sidebar consumers of the same projection must tolerate added fields and stable client keys. Kanban edits must preserve timing metadata even though it does not display timing.

## Authored timing

Use nullable integer `work_sections.duration_seconds` and `works.target_runtime_seconds`. Valid values are 0–86400 inclusive; null is unknown/unset, zero is deliberately zero. Durations are never inferred from words, pages, title, or content.

The duration editor accepts `M:SS` or `H:MM:SS`, with seconds 00–59 and middle minutes 00–59 in three-part input. Blank clears the value. Reject negatives, fractions, ambiguous bare numbers, ranges, and values over 24 hours without coercion. Display `M:SS` below an hour and `H:MM:SS` at/above an hour.

- A nonstructural leaf's value advances the clock.
- A node with children, or an explicitly structural node, holds a budget. Never add that budget to its descendants' durations.
- An empty structural container is unplanned: zero known seconds plus one unknown planning slot. Its budget is not actual runtime. Adding its first child replaces this placeholder with the child's timing.
- Existing nodes may contain both writing and children. Preserve their writing. Their duration is a budget; flag their own untimed writing as one additional unknown contribution. Explain that it needs a separately timed child to obtain a complete total. Do not silently claim the descendants account for that writing, or automatically move content.
- A container spans its subtree. An unknown before it affects its global position; unknowns inside it affect its total and end, but not its start. Totals sum each timed leaf once.
- Known sums with unknowns are lower bounds, shown as `≥ 12:30 · 2 untimed`. Remaining budget with unknowns is an upper bound, shown as `≤ 7:30 remaining`, never an exact amount. If known time already exceeds the budget, show `at least 2:00 over`. Exact gap = budget minus actual only when coverage is complete.
- A blank work has no rows, zero known duration, zero unknown rows, and an Empty outline label; it is not presented as a completed zero-length film.
- Converting a timed leaf into a parent changes its authored value into a budget. The label/readout changes immediately; the newly added child remains untimed. Preserve the number, never copy it into the child as an assumed duration.

Ranges and estimates for part of a scene remain in notes. The app does not choose a midpoint or convert a segment estimate into a whole-scene duration.

## Markers and budget questions

Extend `length_plan.structure.beats[]` without changing its existing name/target/tolerance semantics:

```ts
type MarkerAnchor = {
    anchor_section_id?: number | null;
    anchor_edge?: 'start' | 'end';
};
```

Missing edge defaults to end for compatibility; the settings control always shows the edge explicitly. An absent anchor is unanchored, never inferred from a section's label. Only live sections belonging to the work can be assigned. Anchoring to an unsaved row requires saving it first.

`targetSeconds = targetRuntimeSeconds * target / 100`; tolerance is also percentage points of the work target. Keep fractional precision for comparisons, round only for display. The status is on-target, early, late, unanchored, or unknown. An anchor's start includes preceding unknowns; its end also includes unknowns within the anchored row. Unknown landing or absent target yields unknown status, not an early/late claim. Explicit target zero is a valid numeric value, not absence.

Display work target, planned total, and remaining budget above the outline; container rows show budget, planned total, and gap. Marker readouts show target, landing, and early/late amount. For an anchored marker inside a budgeted container, also show the container's planned time before/after that boundary and budget remaining after the boundary. This directly answers how much room remains after a midpoint without estimating future scenes for the writer. Use the same lower/upper-bound rules for incomplete coverage.

Deleted/transferred anchors render as unavailable/unanchored and preserve the marker's percentage target. Clear invalid anchor IDs on the next settings save. Do not transfer a source work's markers to a destination automatically; duplicating a scene does not duplicate or retarget its marker.

## Surfaces and shared state

One pure pacing model consumes ordered section data plus target and markers. It operates on stable client keys so new sections participate before saving. Both the outline draft and saved Navigator tree adapt into that input.

- Outline: title/synopsis/beat editing, duration field, running start/end, budget rows, and boundary markers. Arithmetic updates immediately after a valid edit, paste, or reorder. Invalid duration text stays local to its field and never overwrites the last valid duration.
- Navigator: read-only per-section duration and container total; use the active outline draft while Outline is open so its timing agrees immediately. On leaving, use the save-confirmed tree. Preserve expansion and selection.
- Work Settings: target runtime and marker anchor plus Start/End. Retain unrelated settings and template edits. Labels and errors are translated; keyboard and screen-reader access are required.
- Structure guidance: for screenplay works, use authored timing for placement and report missing timing explicitly. For prose, retain word-based diagnostics unless a runtime target, any duration, or any marker anchor opts the work into timing. Keep unrelated diagnostics. Never present word-share placement as a second runtime verdict.
- Plan modal: stays selectable by default, explicit Edit, preserved line breaks. No timing fields inside manuscript editors.

## Persistence and migration

Core owns schema/casts/config and generic frontend. App owns its existing controllers, validation, payload assembly, revision integration, local migration tooling, and host tests. Never put private story examples, live IDs, or backfill output in public core.

The outline GET/PUT must round-trip `duration_seconds` with titles, synopsis, beats, and hierarchy. An omitted duration in an older client preserves the saved value; explicit null clears it. Section PUT and work PUT use the same validation. Payloads include `is_structural` and `has_content` for timing semantics without exposing manuscript text in the outline.

Duplicate and cross-work move preserve duration; revision capture/restore includes it. Restoring a historical revision with no duration key preserves the current duration. Existing importers with no duration input create null rather than inventing estimates.

Follow the alpha policy: edit the two existing create migrations; do not reset the live DB. Snapshot first, then apply only missing nullable columns with additive local DDL. Backfill runs only in the local environment and defaults to dry run. Parse only a single standalone `Estimated runtime: M:SS` or `H:MM:SS` line, with valid bounds and no trailing prose/range. Multiple estimates, ranges, invalid values, and already-populated durations are skipped intact with reasons. Preserve unrelated synopsis whitespace and separators; remove only the exact estimate line and a clearly adjacent standalone separator when it was part of that estimate block.

The dry run records proposed changes privately. The applying run locks/rechecks each candidate against its scanned synopsis and current null duration, and rolls back on mismatch. Verify modified values and untouched rows, then remove the temporary command and its command-only tests. Retain the generic parsing helper and unit coverage. Data changes happen during implementation, not this planning pass.

## Completion evidence

Plan 1 proves hierarchy invariants and a real continuous typing/paste/reorder/save workflow, including a delayed acknowledgement and a second-tab conflict. Plan 2 proves arithmetic, persistence, marker boundary semantics, unknowns, migration safety, and a browser flow where reordering immediately changes timing and survives reload. Keep the existing modal, Kanban, and prose writing flows passing.
