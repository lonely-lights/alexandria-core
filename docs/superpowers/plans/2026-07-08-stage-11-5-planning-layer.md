# Stage 11.5 — Writing Planning Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notes attach to writing pages (scoped drawer), anchored comments with a document-order rail, a three-mode reference sidebar, and the one-shot outline extraction.

**Architecture:** Per the spec `docs/superpowers/specs/2026-07-08-stage-11-5-writing-planning-layer-design.md` — READ IT FIRST for every task; its "Locked product decisions" are binding (esp. the undo rule, style-B rail behind a swappable renderer, no dead preference UI, notes≠comments).

**Tech Stack:** Laravel 13 / PHP 8.4 (app controllers/policies/command; new `work_section_comments` migration — a NEW table, so a new migration file is correct under the alpha policy), React 19 + TS + TipTap (core), Pest 4 + Vitest + browser smokes.

## Global Constraints

- Spec is binding. UI strings via lang keys (writing.* group). Andrew's test style (brace-free interpolation, chained `->and()`). Pint before PHP commits. `npm run build` after core UI changes. **Files UTF-8 without BOM — never write files via PowerShell.**
- Trailers on every commit:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n`
- Branch `feat/stage-11-5-planning-layer` in BOTH repos.
- Key context: notables pivot = `notables` (note_id, notable_type FQCN, notable_id, processing_status); study how Entry note-attachment works end-to-end before Task 1 (routes, controller, policy, NotesDrawer props). WorkPanelController (app) is the JSON-endpoint convention for workspace panels; ReferencePanel.tsx hosts the sidebar; Workspace.tsx owns panel state; editor bridges live in `resources/js/editor/` (prose + screenplay TipTap configs). QAT persistence shows the per-work client-side persistence mechanism. The 22 outline sections: live migrated sections with non-empty content (verify count at runtime, don't hardcode).

---

### Task 1: Notes on WorkSections + scoped drawer

**Files:** core `src/Models/Writing/WorkSection.php` (notable relation), NotesDrawer + Workspace wiring (`resources/js/...` — locate the drawer component + the workspace notes affordance that currently routes to the dashboard); app: whatever routes/policies gate note attachment for entries get WorkSection parity (find them first — likely a NotableController or notes routes). Tests: app Pest (attach/detach/list policies: view ⇒ work view; attach/detach ⇒ work update; cross-project 404) + browser smoke (drawer opens scoped from the workspace, quick-add attaches to the section).

Mirror the Entry pattern EXACTLY — no new abstractions. The workspace notes button opens the drawer scoped to the current section (drawer receives the notable type+id context the way entry pages pass theirs).

Commit: core `feat(writing): notes attach to work sections (scoped drawer)`; app `feat(writing): work-section notable routes + policies`.

---

### Task 2: Comments backend

**Files:** app: new migration `create_work_section_comments_table` (spec schema verbatim), `app/Models/Writing/WorkSectionComment.php` (or core model? — comments are a core-worthy primitive: put the MODEL in core `src/Models/Writing/`, controller/routes/policies in app, mirroring Work/WorkSection split), `WorkSectionCommentController` (list per section incl. `is_orphaned`-agnostic full list — the rail filters client-side by live mark ids; store; update own body; destroy own; resolve/unresolve per spec permissions), routes beside the panel routes, `WorkSectionCommentPolicy`. Pest: full lifecycle incl. resolve permissions matrix + soft-delete + others-cannot-edit + cross-work 404.

Wait — migration location: work_sections migration lives WHERE? Check where create_work_sections_table lives (core ships migrations via loadMigrationsFrom or app owns them?) — put the comments migration in the SAME home as work_sections'. Model goes beside WorkSection.

Commit(s): `feat(writing): work-section comments backend`.

---

### Task 3: Comment mark + rail (style B)

**Files:** core editor: `comment` TipTap mark (attrs: commentId; toggle/apply on selection; render with theme-token tint classes, `data-comment-id`) registered in BOTH prose + screenplay editor configs; add-comment affordance following each editor's existing bubble/toolbar conventions; rail component `resources/js/pages/Writing/Sections/CommentRail.tsx` — renderer-swappable: `CommentRail` reads style from a `writing.comment_rail_style` value (plumb a preference read defaulting `'list'`; DO NOT add Settings UI) and dispatches to `CommentRailList` (v1's only renderer). Document-order via mark positions from the editor; two-way jump (card → scroll+flash anchor; anchor click → highlight card); resolved collapse group; composer on selection. Orphan behavior: comments whose id has no live mark simply don't render (row retained server-side).

Vitest: rail ordering/orphan-filter/resolved-grouping as pure helpers (`commentRailModel.ts` — extract the logic pure, test it; mirror structureRules precedent). Browser smoke: add → appears in rail → resolve → collapses → anchor jump works.

Commit: core `feat(writing): anchored comments — mark + document-order rail`; app test commit.

---

### Task 4: Sidebar mode switcher

**Files:** core `ReferencePanel.tsx` + `Workspace.tsx`: mode switcher **Linked items · Notes · Comments** (linked-items default; icons + lang keys; keyboard-flippable per existing panel shortcut conventions if any exist — check; else click-only, note it), per-work persistence via the QAT mechanism. Notes mode = current section's notes list (whole-work toggle) reusing Task 1 data; Comments mode = Task 3's rail. Scene links untouched inside Linked items.

Vitest for the persistence/mode helpers; browser smoke: flip modes, reload, mode restored per work.

Commit: core `feat(writing): multi-purpose reference sidebar (linked/notes/comments)`.

---

### Task 5: Outline extraction command

**Files:** app `app/Console/Commands/LocalWriting/ExtractSectionOutlinesCommand.php` per spec Component 4 (dry-run default-safe; --force applies; targets live sections with non-empty content whose work came from the migration — use the `metadata.migration`/provenance markers or simply ALL live sections with non-empty content + explicit listing, since Andrew reviews the dry-run; synopsis `— estimated_duration: X` → `Estimated runtime: X` even where content is empty). Notes created via Task 1 plumbing with `ai_notes` provenance. Word/line counts recompute through the existing content-service path (check how WorkSectionContentService persists — call it, don't hand-zero).

Pest: fixture sections → dry-run mutates nothing; apply creates notes/clears content/cleans synopsis; idempotent re-run skips done sections. DO NOT run against the live DB — the operator (controller session) runs it with Andrew at the gate.

Commit: app `feat(writing): one-shot section-outline extraction command`.

---

## Verification (stage level)

Full app Pest (non-browser) + core Pest + full Vitest (token-usage pre-existing) + new browser smokes + `npm run build`. Then the LIVE extraction: snapshot → dry-run → Andrew's check-in → --force → verify in the workspace (blank pages, notes in drawer/sidebar, clean synopses) → works-seed export re-run (manuscript checkpoint now includes cleared content!) → merge gate.

## Plan self-review notes

- Task 2's migration/model home MUST match where work_sections' migration/model live — implementer verifies, doesn't assume app-side.
- The undo rule needs no special code (marks are doc history; rows retained) — tests should PROVE it at the model level (destroying text ≠ deleting rows) rather than simulating editor undo.
- Rail alignment (style A) is explicitly NOT built; the renderer seam + preference key are the only concessions.
