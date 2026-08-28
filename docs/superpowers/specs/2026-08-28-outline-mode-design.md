# Outline Mode + Ghost Layer — Design

**Status:** Ratified 2026-08-28 (owner: "Make it so"). Design agreed in chat; decisions below are owner rulings.
**Repos:** `alexandria-core` (all UI + endpoints), `alexandria-app` (feature tests against the host app, live DB DDL).
**Branch:** `feat/outline-mode` (both repos). DB snapshot taken before work: `alexandria-2026-08-28_060217`.

## Goal

Outline-first authoring bound to the real `WorkSection` tree: a full-pane Outline view for rapid whole-work outlining (including paste-to-structure), a dimmed **Ghost Layer** plan block inside the writing views with beat check-off, and a read-mostly sidebar outline mode. One source of truth — the outline is a projection of the section tree plus per-scene beats; there is no separate outline document, so outline and manuscript can never drift.

## Owner decisions (locked)

1. **Beats are a JSON column** on `work_sections` (`beats`: array of `{id, text, done}`), NOT child sections. Accepted trade-offs: beats cannot carry notes/comments/mentions; promoting a beat to a scene is a copy, not a relabel.
2. **Both surfaces from day one:** full-pane Outline view (structural editing) + a read-mostly sidebar outline mode (navigate + check-off only).
3. **Ghost Layer = dimmed plan block pinned atop each section** in BOTH the section editor and continuous flow. Editable synopsis in place, tappable beat check-off, auto-collapses to one muted line when all beats are done (expandable). View-menu toggle, persisted per user with the existing view-preference mechanism.
4. **Sync model = structured rows + one bulk apply endpoint** (`PUT /works/{work}/outline`). Rows carry section ids so renames are never confused with delete+create (protects attached notes/comments). No per-row CRUD chatter; no wholesale text parsing on save.

## Data model

- `work_sections.beats` — nullable JSON, default null. Shape: `[{ "id": "<client-generated uuid>", "text": string, "done": bool }]`. Empty/absent means no beats.
- **Alpha migration policy applies:** edit the existing `work_sections` create-migration in place (no new migration file) AND apply `ALTER TABLE work_sections ADD COLUMN beats jsonb NULL` manually to the live app database via tinker. Testbench/CI environments rebuild from the edited migration automatically.
- Beat `done` lives inside the JSON. No changes to `status`, word counts, or the Navigator (beats are not sections).

## API (core, alongside the existing writing endpoints; same auth/policy as section editing — `WorkPolicy` update ability)

### `GET /works/{work}/outline`
Returns the outline projection: flat, depth-annotated, position-ordered rows.

```json
{
  "rows": [
    { "sectionId": 1, "parentId": null, "depth": 0, "label": "Act", "title": "Act 1", "synopsis": null, "beats": [] },
    { "sectionId": 116, "parentId": 1, "depth": 1, "label": "Scene", "title": "The Guild Briefing", "synopsis": "…", "beats": [ { "id": "b1", "text": "All nine pulsed", "done": false } ] }
  ]
}
```

### `PUT /works/{work}/outline`
Bulk, transactional apply of an edited row set. Payload mirrors the GET shape with two additions: new rows carry `"sectionId": null` plus a client `tempId`; deletions are EXPLICIT (`"deleted": [sectionId, …]`), never inferred from absence.

- Server validates: every non-null `sectionId` belongs to `{work}`; parents resolve (real id or `tempId` earlier in the payload); labels from the work's existing label vocabulary (`Act`/`Chapter`/`Scene` + whatever labels the work already uses); no row is its own ancestor.
- Applies in one transaction: creates (slug from title, position from payload order), title/synopsis/beats updates, re-parenting + renumbering positions, then deletions (soft delete).
- **Delete guard:** a section with non-empty `content`, attached notes, or comments is NOT deleted by the bulk apply; it is returned in a `blocked` list `{sectionId, reason}` and the client shows a confirm affordance that re-submits with `"force": [sectionId, …]`.
- Response: the fresh GET projection plus `tempId → sectionId` mapping. Client reconciles optimistic state from it.

### `PATCH /works/{work}/sections/{section}/beats/{beatId}`
Body `{ "done": bool }`. Toggles one beat without touching the rest of the row. Used by Ghost Layer + sidebar. 404 if the beat id is absent.

## Outline view (full pane)

- Entered from the **View menu** (chrome doctrine: File/Edit/View is writing-views only), alongside manuscript/screenplay. Route/view state follows however the desk currently switches views (implementer: match the existing mechanism, do not invent a new one).
- Rendering: one row per section, indented by depth. `Title` in normal weight, ` — synopsis` inline muted. Beats as further-indented sub-rows with a check-off dot. Sections and beats are visually distinct (beats have no label chip).
- Editing model: controlled rows in client state; every row keeps `sectionId` (or `tempId`). Saves debounce (~800ms after idle) through `PUT …/outline`; a save-state indicator matches the autosave affordance the manuscript editor already uses. Optimistic UI; on response, reconcile ids.
- Keyboard: `Enter` = new sibling below (beat context: new beat); `Tab` / `Shift-Tab` = demote/promote (Scene→beat demotion converts a scene row to a beat ONLY if the scene has no content/attachments, else blocked with a hint; beat→Scene promotion creates a real section with the beat text as title and removes the beat); `Alt-↑/↓` = move among siblings; `Backspace` on an empty row = delete (guard above applies through the endpoint).
- Label logic on nesting: depth maps to the work's existing hierarchy (whatever labels its current tree uses at each depth). Rows deeper than the deepest section label become beats of their nearest section ancestor.
- **Paste-to-structure:** pasting multi-line text splits on newlines; leading tabs / 2-space groups set relative depth; ` — ` or ` - ` after the title splits synopsis; lines deeper than the scene depth become beats. Parsed rows insert at the paste location as ordinary new rows (same payload path). Single-line pastes behave as normal text.

## Ghost Layer

- In `ManuscriptEditor` and `ContinuousFlow`/`FlowSection`: when the per-user "Show plan" view toggle is on and the section has a synopsis or beats, render the plan block above the section's text: muted/dimmed style consistent with the desk's paper theme; synopsis as text (click to edit in place; saves via the outline PUT carrying only that section's row — no new endpoint); beats as a checklist (tap toggles via the beats PATCH).
- All-done behavior: block collapses to a single muted line ("Plan ✓ — n beats"), click expands.
- No plan block when the section has neither synopsis nor beats (no empty chrome).

## Sidebar outline mode

- A fourth mode in the existing writing sidebar mode set, using the same seam the craft package uses for sidebar modes. Read-mostly: rows render as in the full pane but without structural editing; clicking a row navigates to that section; beat check-off works. No keyboard restructuring here.

## Error handling

- Bulk apply is all-or-nothing; on failure the client keeps local state, surfaces the server message, and retries on next debounce.
- Version safety: the PUT carries `baseVersion` = the `updated_at` max the client last saw; if the tree changed since (another window), server returns 409 with the fresh projection and the client merges (keep local unsaved row edits, take server structure) and re-presents.
- The paste parser never throws: unparseable lines become plain title rows.

## Testing

- **Pest (app):** outline GET projection; bulk apply — create/rename/move/re-nest/synopsis/beats; explicit-delete + guard + force; temp-id parenting; cross-work authorization; 409 stale-version; beat PATCH.
- **Vitest (core):** paste parser (depths, synopsis split, beat demotion, garbage-in); row diff/payload builder; ghost collapse logic.
- **Browser (app, one smoke):** type an outline in the pane → structure appears in Navigator → ghost block shows in the editor → check off a beat → sidebar mode reflects it.

## Out of scope (deliberate)

Drag-and-drop in the outline pane (keyboard + Navigator drag cover it) · beat-level comments/notes (beats are JSON) · outline templates (Save-the-Cat remains its own deferred item) · screenplay-specific outline semantics · mobile-specific outline pane work beyond it not breaking (Ghost Layer is the mobile plan surface).
