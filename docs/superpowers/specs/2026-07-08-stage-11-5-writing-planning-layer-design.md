# Stage 11.5 — Writing Planning Layer (Design)

**Approved:** 2026-07-08 (Andrew) · **Scope discipline:** deliberately tight — later roadmap items build on the versatile sidebar; nothing beyond the four components below.

## Purpose

Give the writing workspace a planning margin: outlines, notes, and anchored comments live *beside* the manuscript, not inside it. Born from Stage 11 QA: migrated scene outlines sit in section `content`, and the reference sidebar is single-purpose.

## Locked product decisions

- Notes and comments are **separate primitives** (owner + assistant agreed): a note is durable section-scoped planning material; a comment is positional and disposable. The sidebar unifies the view, never the data model.
- **Undo rule for comments (owner):** deleting a comment's whole anchor removes it from view (Word/Docs behavior), but undoing that deletion restores the comment intact.
- Comment depth v1 = **bare + resolve** (no threads; schema reserves `parent_id`).
- Comment rail v1 = **document-order list with two-way jump** (style B). Docs-style aligned rail (style A) is a *planned later build* behind the same user preference — architect the rail as swappable renderers reading `writing.comment_rail_style`; only `list` exists in v1 and **no dead preference UI ships** (the Settings toggle arrives with style A).
- Sidebar mode choice **persists per work** (client-side, QAT-persistence mechanism).

## Component 1 — Notes on writing pages

- `Alexandria\Core\Models\Writing\WorkSection` becomes a notables polymorphic target (the `notables` table already stores arbitrary `notable_type`; follow exactly how Entry attachments work end-to-end: attach/detach routes, policy checks, drawer UI).
- The workspace's existing notes affordance (currently routes to the notes dashboard) opens the **NotesDrawer scoped to the current section**: lists that section's notes, quick-add attaches to it. Permissions ride the work's view/update gates (view notes ⇒ can view work; attach/detach ⇒ can update work).
- Navbar notes button elsewhere is unchanged.

## Component 2 — Anchored comments

**Data:** new table `work_section_comments`: `id`, `work_section_id` FK cascade, `user_id` FK, `parent_id` nullable self-FK (reserved, unused in v1), `body` text, `resolved_at` nullable timestamp, `resolved_by` nullable FK users, timestamps, softDeletes.

**Editor:** a TipTap mark (`comment` mark with `commentId` attr) in BOTH prose and screenplay editors; anchored text gets a subtle theme-token tint (distinct at rest vs active). Marks live in doc history ⇒ the undo rule falls out: full-anchor deletion removes the mark (comment leaves the rail; row remains, surfaced nowhere = "orphaned"); undo restores the mark and the comment reappears. Orphaned rows are retained (no purge in v1).

**Rail (style B):** document-order comment cards — author, relative time, body, resolve toggle (dims/collapses resolved into a collapsed "Resolved (N)" group). Two-way jump: card click → scroll to + flash anchor; anchor click → highlight card. New-comment flow: select text → add-comment affordance (editor bubble/ribbon control per existing editor conventions) → card composer in the rail.

**Permissions:** view comments ⇒ can view the work; create ⇒ can update the work; edit/delete own comments only; resolve ⇒ comment author or work-updaters.

**API:** app-side controller (mirror WorkPanelController conventions): list per section, store, update (body), destroy, resolve/unresolve. JSON, `can:` middleware parity with sibling panel routes.

## Component 3 — Multi-purpose sidebar

The reference panel gains a mode switcher: **Linked items · Notes · Comments** — one click/keystroke to flip; persisted per work. Notes mode = current section's notes (whole-work toggle). Comments mode = the rail. Linked items (incl. scene links) untouched and remains the default for existing users.

## Component 4 — Outline extraction (one-shot, operator-gated)

Command `local:writing:extract-section-outlines {--dry-run} {--force}` (app, LocalWriting): for each live migrated section with non-empty `content` (currently 22):
1. Create a note titled `<Section title> — outline`, text = the content verbatim, attached to the WorkSection (Component 1 plumbing), `ai_notes` provenance (`outline_extracted_from`, timestamps).
2. Clear section `content` (blank manuscript page) — word/line counts recompute via the existing content service path.
3. Synopsis cleanup: `— estimated_duration: X` → `Estimated runtime: X`.
Dry-run prints the full per-section plan; live run only after Andrew's check-in; snapshot before/after. Revisable as the design matures (owner note).

## Testing

Pest: comment CRUD/resolve/orphan lifecycle + policies; notes-on-sections attach/detach + policies; extraction command (fixture, dry-run vs apply, synopsis cleanup). Vitest: mark helpers + rail ordering/jump logic + mode-switcher persistence. Browser: sidebar flip + comment round-trip (add → resolve → anchor jump), notes drawer scoping.

## Explicitly out of scope

Threads/replies, aligned rail (style A — next), notifications, comment search/filters, sidebar modes beyond the three, orphan-purge policy, collaboration presence.
