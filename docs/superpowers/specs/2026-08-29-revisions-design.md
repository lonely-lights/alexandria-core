# Scoped Revisions + Safety Buffer — Design

**Status:** RATIFIED 2026-08-29 (owner, talked through in session). Owner rulings: NO ambient version history ("I don't want thousands of versions of small updates"); revisions are DELIBERATE and USER-SCOPED at any tree level ("rev 3 of a scene doesn't mean rev 3 of the entire application"); a revision captures EVERYTHING ("a revision may be a complete pivot in the vision of the scene"); a small bounded safety buffer ships as an experiment ("let's try this and see how it feels"); marking-surface choices delegated to Fable, to be explained at the end.
**Repos:** `alexandria-core` (migrations, models, sidebar/File-menu UI), `alexandria-app` (service, controller, routes, tests).
**Branch:** `feat/revisions` (both repos).

## The three-tier memory model

1. **Keystrokes** — the editors' own undo/redo (already exists; untouched).
2. **The recent past** — an invisible, bounded safety buffer: the server keeps the LAST 5 accepted content saves per section (auto-pruned on insert, never accumulating, no UI ceremony beyond appearing in the history list under "Recent saves"). Experiment status: designed for painless removal if it doesn't earn its keep.
3. **Meaning** — deliberate revisions: a named, numbered, scoped snapshot of the full creative state.

## Data model (new tables — core migrations; additive, `php artisan migrate` on live is safe)

- **`work_revisions`**: `id`, `work_id`, `scope_section_id` (nullable FK — null = whole-work scope; else the section OR container the user marked), `number` (int, **per-scope counter**: max(number)+1 within (work_id, scope_section_id)), `label` (nullable user text), `cause` (`manual` | `pre_restore`), `created_by`, timestamps.
- **`work_section_versions`**: `id`, `work_section_id`, `work_revision_id` (nullable FK — null = safety-buffer entry), `payload` (jsonb), `word_count`, `created_at`. Payload = the section's ENTIRE creative state: `{title, label, content, synopsis, beats, beat_type, goal, conflict, stakes, mood, tone}`.
- A revision captures one version row per LEAF section in scope (scene scope → 1 row; container scope → every descendant leaf; work scope → every leaf). Containers contribute their own payload row too (their title/synopsis are creative state).
- Safety buffer: every accepted content save that CHANGED content inserts a buffer version (revision_id null) and prunes beyond the newest 5 for that section. Buffer entries are never numbered and never block anything.

## Behavior

- **Marking**: creates the revision + versions transactionally. Default label empty → displays as "Rev {number}" of its scope.
- **Restore** (any version — revision or buffer): first auto-captures the CURRENT state as a scene-scoped revision with `cause = pre_restore`, label "Before restore" (the one system-initiated revision, guarding the destructive moment), then writes the payload back onto the section through the normal update path. Restore of a container/work revision restores every captured section the same way, one pre_restore revision per whole restore action (scoped to match).
- Buffer pruning NEVER touches revision-linked versions.

## Surfaces (Fable's delegated choices — explain to owner at delivery)

1. **File → "Mark revision…"** opens a dialog: scope picker (radio: *This scene* [default, = current section], each ancestor container, *Entire work*) + optional label + Mark button. One entry point reachable mid-flow that covers every altitude.
2. **Navigator row menu** gains "Mark revision…" (pre-scoped to that row — scene or container; opens the same dialog with scope locked).
3. **History = a fifth built-in sidebar mode** (clock icon): for the current section, grouped list — *Revisions of this scene* (own scope), *Captured by larger revisions* (ancestor/work scopes, labeled), *Recent saves* (buffer). Each row: view (read-only modal showing content + plan fields) and Restore (confirm; explains the pre-restore capture). Work-scope revisions listed under the work when no section context.

## HTTP (app conventions: middleware authz, JSON for fetch, literal-before-wildcard)

- `POST /{work:slug}/revisions` `{scope_section_id?: int|null, label?: string}` → `works.revisions.store`, `can:update,work` → 201 `{revision}`.
- `GET /{work:slug}/sections/{section}/history` → `works.sections.history`, `can:view,work` → grouped lists (own revisions, inherited revisions, buffer) with version ids + metadata (no payloads).
- `GET /{work:slug}/versions/{version}` → `works.versions.show`, `can:view,work` → the payload.
- `POST /{work:slug}/versions/{version}/restore` → `works.versions.restore`, `can:update,work` → 200 `{restored: true, preRestoreRevision}`.

## Testing

Pest: numbering per-scope independence (scene rev 3 alongside work rev 1); container capture covers descendants; payload completeness (every creative field); buffer cap-5 pruning + revision-linked exemption; restore round-trip (mark → mutate → restore → fields match) + pre_restore auto-capture; history grouping incl. inherited; authz on all four routes. Vitest: any pure grouping/format helpers. Browser smoke: mark a scene revision via File dialog → edit the scene → open History sidebar → restore → content back.

## Out of scope (deliberate)

Diff/compare view (fast-follow once history exists) · exporting a revision to FDX (the ratified future export-versatility hook) · revision deletion UI (rows are cheap; curation later) · ambient/all-saves history (owner-rejected) · buffer for non-content fields.
