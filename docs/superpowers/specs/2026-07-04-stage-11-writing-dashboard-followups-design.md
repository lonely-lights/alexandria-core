# Stage 11 — Writing Dashboard Priority Follow-Ups: Design

**Date:** 2026-07-04
**Status:** Approved by Andrew (design conversation 2026-07-04)
**Scope source:** `alexandria-app/docs/REMAINING-ROADMAP.md` Stage 11
**Repos:** `alexandria-core` (writing surfaces, ribbon registry, guidance) + `alexandria-app` (nav, migration command, admin boundaries)

## Goal

Finish the writing features that materially affect daily use before package expansion: make the shipped 8g.1 writing dashboard the *actual* home of Andrew's manuscripts (it currently has 0 works / 0 sections), close the known UX gaps, deepen deterministic analysis, and spread the chrome patterns where command density earns them.

## Decisions locked during design

1. **Packaging:** one spec (this document) covering all nine roadmap items, executed as four slices in order. Whatever a session doesn't finish stays specced and planned.
2. **Blueprint→Works migration is a FULL RETIRE** of the Work/Chapter/Scene blueprint family, with softenings: blueprints hidden not deleted (Excerpt→Quotes precedent), DB snapshot first, per-note triage (not blanket re-point) for routed notes, and an explicit "Unsorted scenes" home for orphans. Andrew: "this is what it should have been to begin with."
3. **Ribbon adoption follows command density**, not blanket consistency: Entries get the full ribbon, Blueprints get the File/Edit/View menu bar, Admin keeps its toolbars. **Permission/entitlement gates dictate command visibility everywhere** — this gating lands in the ribbon registry itself.
4. **Structure guidance deepens for screenplay + prose, with templates as data** (selectable/editable per work). Poem stays at the shipped first pass. Anything analyzer-flavored (scansion, passive voice, adverbs) is Stage 12a territory — Stage 11 ships deterministic rules only.
5. **Global nav opens a Writing hub page** (`/writing`): cross-project works, recent sections, "continue where you left off."

## Current-state facts (verified 2026-07-04)

- Works tables are empty: 0 `works`, 0 `work_sections`. The migration is a bootstrap, not a merge.
- Blueprint family in Undaunted: `work` 22 entries / 8 routed notes; `chapter` 0 entries / 7 notes; `scene` 57 entries / 65 notes. All three are `allow_ai_sorting = true` today.
- Cross-parent move backend already exists: `SectionTreeService::move()` (cycle-safe) + `WorkSectionController::move()` accepting `parent_id` + `position`. Only the Navigator UI forbids cross-parent drag (SortableJS hook sets no `group`).
- Section rename already redirects server-side; the Navigator's inline rename leaves a stale URL until reselection (known issue, manual QA line 32).
- Print layout (margins, ruler) shipped; no page-break preview.
- Ribbon framework is generic (`resources/js/ribbon/ribbonRegistry.ts`); only the writing dashboard registered tabs (`pages/Writing/ribbon/writingRibbonTabs.tsx`, 3 tabs).
- Scene links carry `mentions`, `characterCues`, `dialogueWords` per link, rendered in `ReferencePanel.tsx`; `CharactersReport.tsx` aggregates mentions.
- Structure guidance first pass: `pages/Writing/Sections/structureGuidance.ts` + Navigator card; screenplay/poem branches only, driven by `works.length_plan` JSONB.
- Sorting interplay: 18 of Andrew's pending full-pass review proposals move notes INTO `bp:scene`; the corpus gold currently holds 80 notes on the family. Phase B (entity creation) has NOT run for them.

## Slice 1 — Quick wins

### 1a. Section rename → live URL sync (S, core)

After a successful inline rename in the Navigator, perform a client-side `router.replace` (Inertia, preserve state/scroll) to the fresh slug URL. Acceptance: rename active section → address bar updates without reload; browser back does not land on a dead slug (old slug redirects server-side already).

### 1b. Cross-parent section move UI (M, core)

Two affordances over the existing endpoint:

- **Drag:** set a shared SortableJS `group` in the Navigator drag hook so sections drag between parent containers; drop calls the existing `move()` endpoint with the new `parent_id` + `position`. Guard rails come from the service (cycle prevention) — surface its validation errors as toasts.
- **Menu:** a "Move to…" context-menu action opening a parent picker (tree select excluding self + descendants). This is the accessible path and the deep-tree path.

Acceptance: move a section under a new parent by drag and by menu; ordering lands where dropped; moving a parent into its own descendant is rejected with a visible message; read-only collaborators see neither affordance.

### 1c. Pagination preview (M, core)

In print-layout mode only: render page-break divider lines with page numbers inside the manuscript editor, computed deterministically from the work's length plan (words-per-page; screenplay uses its existing page estimation). Add a "~p. N of M" readout near the existing header progress bar. Label estimates as estimates (tilde). No preview outside print layout; real pagination arrives with export (deferred).

### 1d. Global Writing hub (M, app + core query surface)

- New app route `/writing` + persistent nav entry (matching the Notes/AI nav precedent, but global — visible outside project context).
- Page content: works across the user's projects (title, project, form, progress vs length plan), recent sections (last edited, with word deltas), and a prominent **Continue writing** button deep-linking to the last-edited section.
- Core ships the query surface (works + recent-section activity for a user); the app owns the page and nav placement.
- Respects project membership/permissions — only works the user can see.

## Slice 2 — Blueprint→Works migration (compendium-aware full retire)

> **Amended 2026-07-06** after mapping the live Compendium structure (`/p/undaunted/compendium`) with Andrew. The original Slice 2 assumed scenes attach to works via relationships — false. The real structure is one interleaved `parent_id` tree: compendium roots (Ad Astra Saga, Anthology, The Muses, Undaunted Beyond) contain **work** entries (story containers and medium-works), medium-works contain **compendium act** nodes, and **56 of 57 scene entries hang under compendium acts** (scenes carry zero relationships). The compendium (blueprint #15, `structural`, 156 entries typed by the 17-value compendium-type list) is canonical franchise architecture with authored data (e.g. Ad Astra Saga: 11K chars of content). A blind retire of work/scene would punch holes in that tree.
>
> **Decision (Andrew, check-in #1): "Compendium above, Works below."** The compendium stays canonical for the franchise layer (saga → story → medium variants → series → seasons → episodes) and is untouched above the medium-work level. Everything below a medium-work (acts, scenes) is manuscript-internal and migrates into the Works system. Work entries that serve as tree nodes convert to compendium entries linking to their new Works, so the tree stays whole and the blueprints can retire without holes.
>
> **Process requirements (Andrew):** phased execution with a check-in gate after every phase; **retiring the old blueprints is the LAST step**, only after he has verified the migrated state.

### Mapping rules

- **Medium-works** (work entries owning manuscript structure — act/scene descendants, e.g. "The Lonely Sister (Film)") → each becomes a writing-system `Work` (form inferred from name/medium: Film → screenplay, Novel → novel; every inference listed in the dry-run for correction). Its compendium **act** children become top-level sections; **scene** entries beneath become child sections (titles, content, summaries, timestamps preserved; unmappable EAV/summary data lands in `migration_notes`).
- **Structural work entries** (story containers like "The Lonely Sister", and every migrated medium-work's tree node) → convert to **compendium entries** (blueprint re-home, typed via compendium-type: Films/Novels/etc.), preserving name, slug, position, `parent_id`, and all authored data. Migrated medium-work nodes additionally carry a **link to their Work** (entry metadata + an "Open in Writing" affordance on the entry page).
- **Compendium act nodes** that migrated into sections are removed from the tree (their content lives in the Work now); anything not cleanly migratable stays put and is reported.
- **Seasons/episodes** (S1E01 etc.) stay compendium nodes for now — no manuscripts exist for them; when Andrew writes one, he creates a Work and links it (same affordance).
- **Orphan scene** (1 top-level) → project-level **"Scene Bank"** work, "Unsorted scenes" group.
- **Relationships:** scenes have none (verified). Works carry 10 `work-character` + 1 `depicts_event` — preserved by re-pointing to the converted compendium entry (relationships are entry↔entry; the converted node keeps the entry id if re-homing in place, which is the preferred mechanism: change `blueprint_id`, keep the row).
- `chapter` (0 entries) retires trivially.

### Phases (each ends in an Andrew check-in)

- **Phase A — Inventory & mapping report (read-only):** full tree dump with the proposed per-node disposition (becomes-Work / converts-to-compendium / migrates-to-section / stays). Andrew reviews and corrects the mapping — especially which work entries count as medium-works and the compendium-type assigned to each converted node.
- **Phase B — Migration command dry-run:** `local:writing:migrate-blueprint-family {--project=undaunted} {--dry-run} {--force}` prints the full creation/conversion/loss plan from the approved mapping. Check-in on the plan output.
- **Phase C — Apply creation (additive only):** snapshot → create Works + sections + links + converted nodes; **nothing removed or hidden yet** — old and new live side by side. Andrew explores `/writing` and the compendium and confirms.
- **Phase D — Notes triage:** the 80 routed notes (work 8 / chapter 7 / scene 65) go through the Fable console pipeline (blind reasoning per note → decision console) proposing `nb:plot-points`, `nb:project-meta`, or another notebook; his 18 pending `→ bp:scene` full-pass proposals fold in. Applied only on his approval; `review-final.csv` synced.
- **Phase E — Tree cleanup:** remove migrated act/scene nodes from the old tree positions (their converted parents now point at Works). Check-in: compendium renders exactly as before above the manuscript line.
- **Phase F — Retire (LAST):** `allow_ai_sorting = false` + hidden-not-deleted for work/chapter/scene (retire-excerpt pattern), removed from the AI sort catalog. Final verification pass together.

Acceptance: compendium tree renders identically at/above the medium-work level with all authored data intact; every medium-work opens in the writing workspace with its acts/scenes as sections; converted nodes link to their Works; the 80 notes have approved homes; blueprints retired last; every phase snapshot-guarded (`pre-works-migration-<phase>`).

**Consumer note:** the command ships app-side because the blueprint family is Andrew's seeded content. The entry→work/section mapping logic should live in a small service class so a future consumer-facing import can reuse it, but no consumer surface ships in Stage 11 (YAGNI).

## Slice 3 — Analysis depth

### 3a. Structure templates as data (core)

- Built-in templates defined as data (not hardcoded branches): **three-act screenplay**, **five-act screenplay**, **three-act prose** to start. A template = ordered beats, each with a name and a target position (percentage of pages for screenplay, words for prose) plus optional tolerance.
- Stored per work inside the existing `length_plan` JSONB (`structure: { template: <slug>, beats: [...] }`) — no new table until templates become shareable/user-authored (explicitly post-launch).
- Work Settings gains a **Structure** section: pick a template, edit beat names/targets per work, or select "none."

### 3b. Deterministic diagnostics (core)

Guidance cards (existing surface) gain rules computed from the manuscript vs the selected template:

- Beat placement vs target: "Act 2 break at 71% — target 75% ±5."
- Scene/chapter length outliers vs the work's median (flag > 2× or < ⅓ median, thresholds in the template data).
- Per-act character load from scene links (screenplay): count of distinct speaking characters per act vs template hint.
- Orphaned scene links: links whose canonical entry no longer resolves.

All rules are pure functions over already-available data (sections, word counts, scene links, template) — unit-testable in Vitest, no AI, no new queries beyond what the workspace payload already carries.

### 3c. Scene-link stats + drilldowns (core)

- ReferencePanel per-link stats become clickable: a drilldown lists every mention/cue with position context and jump-to-position in the editor.
- Reports gains a per-section/per-act breakdown: who appears where, dialogue-word share, first/last appearance.

## Slice 4 — Chrome expansion

### 4a. Permission-gated command visibility (core, foundation)

The ribbon registry gains a `requires` field per command/control (permission string or entitlement key). A resolver filters against the user's shared-prop gates (`auth.can`/project permissions/entitlements) at render: permission-locked commands don't render at all; entitlement-locked commands (paid features) render disabled with a lock hint, because store discoverability is wanted there. That's the whole rule — no per-command judgment calls. The writing ribbon inherits the mechanism (its commands mostly declare no `requires`, so nothing changes visually there).

### 4b. File/Edit/View inventory expansion (core, writing)

Bounded additions: **File** — Work Settings, rename section, new section/child, export stub labeled "coming later" (export itself is deferred out of Stage 11). **Edit** — scene-link management (edit display text, convert variant to canonical, remove link). **View** — panel toggles matching the reference panel's existing capabilities. No new capability is invented for a menu item: menus expose what the workspace can already do.

### 4c. Ribbon on Entries; menus on Blueprints; Admin unchanged

- **Entries (full ribbon):** tabs built from real density — fields/sections editing, links/relationships, appearance/theming, AI actions. Commands declare `requires` (e.g., entry edit permission, AI entitlements); read-only viewers get a read-only ribbon (navigation/view commands only).
- **Blueprints (menu bar only):** File/Edit/View menus over existing blueprint-settings capabilities. No full ribbon — density doesn't earn it.
- **Admin:** keeps current toolbars. Explicitly out of scope for ribbon adoption (density rule).

## Boundaries and deferrals

- **Stage 12a seam:** guidance rules that need text analysis (adverbs, passive voice, scansion) are NOT built here; the guidance card surface should accept externally-registered rule providers so 12a analyzers can plug in.
- **Deferred (unchanged from roadmap):** export, mobile ribbon below `md:`, beat board, daily writing-stats table, stage-play preset, full Quick-access customization, Alt KeyTips, per-page ribbon overrides.
- **Phase B interplay:** the migration removes work/chapter/scene from Phase B's entity-creation scope before Phase B runs — decided here, executed in Slice 2.

## Testing / verification

- **Pest:** endpoint/command coverage — move validation, hub queries, migration dry-run + apply against a fixture family (miniature work+scenes with relationships and an orphan), retire effects on the sort catalog.
- **Vitest:** pagination math, structure-diagnostic rules (each rule: on-target, out-of-tolerance, missing-data cases), template editing state.
- **Browser smokes:** cross-parent drag + menu move, hub page render + continue-writing link, ribbon permission gating (a locked command absent for a read-only user), rename URL sync.
- **Manual:** the roadmap's named checks — pagination, cross-parent moves, slug rename, migrated Works data, scene-link stats — plus the writing regression + ribbon edge-case checklists after Slice 4.
- **Migration operator flow:** snapshot → dry-run review with Andrew → apply → verify counts → note-triage console batch → apply notes → sync `review-final.csv`.

## Execution order

Slice 1 → 2 → 3 → 4. Each slice is independently shippable; Slice 2 requires Andrew present for the dry-run review and note-triage approvals.
