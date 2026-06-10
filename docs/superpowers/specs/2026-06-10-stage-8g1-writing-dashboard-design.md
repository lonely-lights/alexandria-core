# Stage 8g.1 — Writing Dashboard Design

**Date:** 2026-06-10
**Status:** Approved (brainstorm with Andrew, 2026-06-10)
**Repo:** `alexandria-core` — the dashboard is generic creative-writing functionality, free in every install. No SaaS concerns (ADR-008); entitlement gating arrives only with 8g.2's `craft_suite` key, bound in the consumer app.
**Branch:** `feat/8g1-writing-dashboard`
**Blocks:** 8g.2 (`lonely-lights/alexandria-craft`) — craft analyzers target this component's works/sections contract.

## Goals

1. A **manuscript surface** where the writing itself happens: works (novel, screenplay, essay, …) drafted in Alexandria and *informed by* the project's worldbuilding data.
2. **User-controlled structure** — the author shapes the work's hierarchy, not the tool.
3. **Format adherence, Final Draft style** — screenplay element formatting enforced by the editor; formats are data (config presets), not code.
4. **Worldbuilding as a writing companion** — wiki-link mentions, a reference side panel, entry-typed craft fields, and appearance tracking, built as an open seam the rest of the app (and future packages) plugs into.
5. **Reports + length planning** — character/structure/progress reports and customizable per-work length plans.

### Provenance

The structure is founded on Andrew's existing blueprint family (Work, Chapter, Scene, Work Character, Scene↔Event, Excerpt) — lifted into purpose-built tables, decoupled from EAV. The blueprint versions (and their entries) are retired *later*; **no automated migration ships in v1**.

## Non-goals (deferred)

- **Beat board / index-card view** — the notes component is the more powerful version; revisit later.
- **Export** (Fountain, FDX, DOCX, PDF, Markdown) — tracked follow-up once the model is stable.
- **Migration tooling** for the existing blueprint Works data.
- **Daily writing-stats table** — v1's progress-over-time uses section `updated_at`; a proper stats table is a follow-up.
- **Stage play format preset** — reserved slot; the format machinery supports it as a config entry when wanted.
- AI features inside the dashboard itself — that's 8g.2's job, arriving through the panel seam.

## Decisions log

| Decision | Choice |
|---|---|
| Works vs. worldbuilding structure | Works are first-class, decoupled from EAV; blueprint family is the design source, retired later |
| Project tie | **Required**, exactly one project per work |
| Hierarchy | User-controlled section tree, any depth, user-facing level labels |
| Prose placement | Any node can hold a document; emergent from how the author builds the tree |
| Craft metadata | Built-in curated fields (from the Scene/Chapter blueprints), incl. real entry FKs |
| Editor | Extend core TipTap; manuscript mode + screenplay element schema |
| Formats | Enforced format specs as config presets (FD-style); length plans customizable per work |
| FD-inspired v1 | Screenplay elements, reports, page/length estimation. Beat board out. |
| Navigation | Global `/writing` dashboard **and** a per-project Writing tab |
| URLs | `/works/{project}/{work}/{section?}` — flat section slugs, unique per work (not per parent, not per project); container nodes addressable |
| Export | Deferred entirely |

## Data model

Three tables + one pivot, in core (`src/Models/Writing/`, standard publishable migrations).

### `works`

- `project_id` (FK, **required**), `user_id` (creator)
- `title`, `slug` (unique per project, derived from title)
- `type` — string from a config list (`novel`, `screenplay`, `stage_play`, `short_story`, `essay`, `other`); config-driven, not a DB lookup
- `format` — default format key new sections inherit (`prose` | `screenplay`)
- Curated from the Work blueprint: `logline`, `genre` (plain string v1), `status` (`concept` | `drafting` | `revising` | `complete`), `target_audience`, `language`, `setting_period`
- `length_plan` (JSONB) — seeded from a preset, fully user-editable (see Formats & length planning)
- `target_words` (nullable), `word_count` (cached rollup)
- Timestamps + soft deletes

### `work_sections` — the user-controlled tree

- `work_id`, `parent_id` (nullable self-reference), `position` (sibling order)
- `title`, `slug` (unique per work), `label` (user-facing level name: "Chapter", "Scene", "Act" — free text, seeded by the work-type starter template)
- `content` (nullable JSONB TipTap document; null = pure container node)
- `format` (`prose` | `screenplay`) — inherited from the work, overridable per section; mixed-format works are natural
- Curated craft fields (from the Scene/Chapter blueprints): `synopsis`, `status`, `beat_type`, `goal`, `conflict`, `stakes`, `mood`, `tone`, `timeline_position`, `int_ext`
- Entry references: `pov_entry_id`, `setting_entry_id` — FKs to `entries`, `nullOnDelete`, validated same-project
- `word_count` (cached, server-computed), `target_words` (defaulted by the length plan, individually editable)
- Timestamps + soft deletes

### `work_section_entry_mentions` — appearance tracking (derived data)

- `work_section_id`, `entry_id`, `source` (`mention` | `pov` | `setting`); unique on the triple
- **Rebuilt on section save** by scanning the document for wiki-link nodes plus the two reference fields — never maintained incrementally, so it can never drift from the prose. A backfill artisan command can rebuild it from documents alone.
- This is the contract the Work Character / Scene↔Event relationship blueprints collapse into, and the lingua franca for panels, reports, and 8g.2.

### `work_entry_pins`

- `work_id`, `entry_id`, `position` — per-work pinned entries for the reference panel.

### Starter templates

Each work type seeds a structure on creation: novel → 3 empty Chapters; screenplay → 3 Acts with one Scene each (format `screenplay`); essay → a single prose section. Templates are arrays in core config — consumers override config, no template machinery.

## Formats & length planning

### Format definitions (enforced, FD-style)

`format` keys point into specs shipped in `config/alexandria.php` → `writing.formats`. Each spec declares:

- **Allowed elements** (prose: standard rich text; screenplay: `slugline`, `action`, `character`, `parenthetical`, `dialogue`, `transition`)
- **Keyboard transition map** — Enter advances conventionally (slugline → action, character → dialogue, dialogue → character; `(` opens a parenthetical); Tab cycles an empty block to the next element type
- **Layout/styling parameters** — casing, margins, dialogue column — resolved through theme tokens, never hardcoded
- **Page-metric constants** — screenplay ~55 lines/page; novel manuscript ~250 words/page

The editor *enforces* the spec: content can only be the format's elements. A new format (stage play) is a config entry, not a new editor.

### Length plans (customizable, per work)

`works.length_plan` JSONB, seeded from presets, every number user-editable in Work Settings:

- Presets: short story (~7.5k words), novella (~30k), novel (~90k), epic (~150k), screenplay (~110 pages)
- Each sets `target_words`/`target_pages` plus per-level defaults (e.g., "chapters target ~3,000 words"); per-section `target_words` follow the plan but stay individually editable
- Progress UI reads the plan: section header shows section-vs-target; work header shows manuscript total vs. plan

Format = how content is structured and rendered (install-level config, strict, shared). Length plan = how big it's meant to be (per-work JSON, personal, freely edited).

## Editor

Two layers over core's existing TipTap stack:

1. **Manuscript mode** — `ManuscriptEditor` wraps the existing rich-text editor with writing-first chrome: wide centered column (theme-token measure), live word count in the footer (current section + work total, cosmetic — server count is canonical), autosave on the existing debounce pattern, wiki-link mention extension active (`[[` references project entries day one). Content persists as TipTap JSON to `work_sections.content`, exactly like entry bodies.
2. **Screenplay element schema** — a new TipTap node set in core (`resources/js/editor/screenplay/`), one styled block node per element, behavior per the format spec's transition map. A footer element indicator shows the current block type and is clickable as a keyboard fallback.

A section's `format` decides which schema loads.

**Estimation:** screenplay sections estimate pages from rendered block structure via the spec's metric; prose sections use word count vs. `target_words`. Both render as unobtrusive progress in the section header.

## Worldbuilding integrations + panel seam

**Workspace layout:** three columns — section tree Navigator (left), editor (center), collapsible **reference panel** (right).

### Reference panel, v1 tabs

- **Browse/search** — the project's entries by name, filtered by blueprint; results open in a peek card (name, image, key fields, link to the full entry) without leaving the draft
- **Pins** — per-work pinned entries (`work_entry_pins`)
- **This section** — the current section's POV/setting refs plus every `[[mention]]` in its prose, live from the mentions table

### Entry-reference pickers

POV/setting craft fields use the existing entry-picker component family, scoped to the work's project. Picks write the FK **and** a `source: pov|setting` mention row.

### Appearance tracking, both directions

- Forward: the reports (below)
- Reverse: the entry view gains an **"Appears in"** block — sections mentioning/referencing the entry, grouped by work, deep-linking into the workspace. Core owns this (both ends live in core).

### `WritingPanelRegistry` — the seam

Same shape as `SettingsSlotRegistry`: core renders built-in panel tabs, then registered extras. Registration: `{ id, labelKey, icon, component, placement }`. This is how the rest of the app ties in without core knowing: notes can register a panel tab beside the draft; 8g.2 registers Adverb Review results for the open section; 8h could surface the project calendar. Panels needing server data use their own lazy JSON routes (the SubscriberStats fetch pattern) — core's controllers stay closed.

## Reports + counting plumbing

A **Reports tab on the work** (not a separate area), server-computed live from existing tables (one controller, three queries), rendered as themed tables/charts:

1. **Character report** — every entry referenced across the work (mentions + POV/setting): appearance counts, which sections, first appearance; filterable by blueprint (equally a location/terminology report)
2. **Structure report** — flattened tree with status, beat type, POV, word count vs. target per node; the "where am I stalled" view
3. **Progress report** — work total vs. length plan, per-level rollups, words-over-time line from section `updated_at` (v1 approximation)

### `SectionContentAnalyzer`

One server-side walker over the TipTap JSON on save produces: word count (prose) **or** line/page estimate (screenplay, from the format spec), **plus** the mention scan — one tree walk feeds both. Cached numbers are recomputable truth (artisan rebuild command). Rollups: section save → recompute own count → bubble to ancestors + work in a single UPDATE chain; reorder/move re-bubbles affected branches only. 8g.2 analyzers are siblings of this walker, reading the same JSON.

## Routes, navigation, permissions

### URL scheme

- `GET /writing` — global dashboard: the user's works across all their projects, grouped by project, status/progress at a glance
- `/works/{project}/{work}/{section?}` — the workspace. Flat section slugs, **unique per work** (not per parent/project): `/works/undaunted/the-long-dark/act-1` works for container nodes too; moving a section never changes its address (only renaming does — slug auto-syncs with title, name-first auto-slug pattern). Section selection in the Navigator updates the URL client-side (shallow visit, no reload), so back/forward walks the reading path.
- Section endpoints behind the workspace: create/update/delete, reorder/move (ordered-ids pattern), content save (autosave target), lazy JSON for panel search/peeks/mentions/reports

Structural URL paths (`/part-one/chapter-three/scene-two`) were rejected: the tree is reorganizable, so subtree moves would rot every deep link; the Navigator already shows ancestry.

### Navigation

Writing item in the main navbar (global dashboard) + a Writing tab in project navigation, registered like existing core nav items. Work-type icons distinguish forms in lists.

### Permissions

`WorkPolicy` / `WorkSectionPolicy` delegate to the same project-membership checks entries use (project view access → read; entry-edit-level access → write). Collaborators co-write with no new role machinery. No 8d entitlement gating in core.

## Testing strategy

- **Core Testbench feature tests:** tree CRUD + reorder/move (incl. cycle prevention — no section becomes its own descendant), same-project validation on entry refs, slug uniqueness scopes (work per project, section per work), `SectionContentAnalyzer` (prose counts, screenplay page estimates, mention extraction), idempotent mention rebuilds, rollup bubbling, reports queries, policy delegation, starter templates per type
- **Vitest:** screenplay transition maps (Enter/Tab from every element), format-spec resolution, length-plan math
- **App browser smokes** (in `alexandria-app`): create novel → type → word count updates; create screenplay → Tab/Enter cycling yields correct elements; pin + peek an entry; drag-reorder sections

## Build order (for the implementation plan)

1. Migrations + models + factories (works, sections, mentions, pins) + config (types, formats, length-plan presets, starter templates)
2. Policies + works/sections CRUD + tree operations (reorder/move, cycle prevention, slugs)
3. `SectionContentAnalyzer` + mention rebuild + count rollups + artisan rebuild command
4. Workspace page: Navigator + manuscript editor (prose) + autosave + shallow section URLs
5. Screenplay schema + format enforcement + page estimation
6. Reference panel (browse/pins/this-section) + `WritingPanelRegistry` + entry pickers + "Appears in" block
7. Length plans + Work Settings + progress UI
8. Reports
9. Global `/writing` dashboard + navigation registration
10. Browser smokes in the app
