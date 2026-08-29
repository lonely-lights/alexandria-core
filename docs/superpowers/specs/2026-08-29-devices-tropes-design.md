# Literary Devices & Tropes — Threads and Promises — Design

**Status:** DRAFT for owner review 2026-08-29. Owner rulings from the brainstorm: anchors are **tiered** (section backbone required, optional prose-span refinement — "planning this in an outline style is the way my brain works"); scope = **any structural node** (act → work → compendium container); library is **seeded + editable, owner's definitions first-class**; devices and tropes are **one system, two lenses**; architecture = **Approach 1: core-native** (revisions playbook — core tables/models/UI, app service/controller/tests).
**Repos:** `alexandria-core` (migrations, models, workspace + dashboard UI), `alexandria-app` (service, controller, routes, seeder data, tests).
**Branch:** `feat/devices-tropes` (both repos).

## The idea

A ledger of narrative promises. A *card* defines a pattern (Chekhov's gun, red herring, a trope). A *thread* is one live instance of a card in the story ("THE gun"), scoped to the node it must resolve within. *Marks* pin the thread's moments (setup / development / payoff) to real sections — optionally to exact prose spans. Status is **derived, never stored**: a thread with no payoff mark inside its scope subtree is an *open promise*. Because works link into the compendium tree, "pays off later in the longer narrative" is a queryable containment check, not a vibe.

## Vocabulary (owner may re-christen; these strings live in `writing.threads.*` lang keys, so renames are cheap)

- **Card** — the pattern definition in the library. UI library title: **"Devices & Tropes"**.
- **Thread** — an instance of a card in this project's story.
- **Mark** — one pinned moment of a thread (setup / development / payoff).
- **Open promise / Kept** — derived thread status inside its scope.

## Data model (new core migrations; additive, live `php artisan migrate` safe)

- **`pattern_cards`** — project-scoped library. `id`, `project_id`, `name`, `slug` (unique per project), `kind` (`device` | `trope` | free string for owner-made kinds), `definition` (text), `craft_guidance` (text, "how it works well"), `pitfalls` (text, "how it goes wrong"), `shape` (nullable text, typical setup→payoff shape), `is_seeded` (bool, provenance only — seeded cards are fully editable/deletable), timestamps, soft deletes.
- **`pattern_threads`** — `id`, `project_id`, `pattern_card_id` (FK), `title` (the instance name, e.g. "Leyla's locket"), `stance` (nullable: `straight` | `subverted` | `lampshaded` | `inverted` | `averted` | `played_with`), `scope_type` + `scope_id` (morph: `WorkSection` | `Work` | `Entry`), `entry_id` (nullable FK — when the thread's object IS a compendium entry, e.g. the gun has an entry page), `notes` (nullable text), `created_by`, timestamps, soft deletes.
- **`pattern_marks`** — `id`, `pattern_thread_id` (FK cascade), `role` (`setup` | `develop` | `payoff`), `work_section_id` (FK — the required backbone), `anchor_text` (nullable text) + `anchor_offset_hint` (nullable unsignedInteger) — the prose-span refinement in the SAME two-column text-quote format `work_section_comments` uses, reusing its re-anchoring machinery, `note` (nullable text), `created_by`, timestamps.

Indexes: cards (project_id, slug) unique; threads (project_id, pattern_card_id), (scope_type, scope_id); marks (pattern_thread_id), (work_section_id).

## Derived status (service logic, never a column)

A mark is **in scope** of a thread when:
- scope is a **WorkSection** → the mark's section is that node or a descendant;
- scope is a **Work** → the mark's section belongs to that work;
- scope is an **Entry** (compendium container) → the mark's section's work has `works.entry_id` linking to that entry or a descendant entry in the compendium tree.

Thread status: `kept` when ≥1 `payoff` mark is in scope; `open` otherwise (with sub-flag `unplanted` when it has no `setup` mark either). **Deliberate v1 simplification:** containment only, no positional "payoff must come after setup" ordering — writers reorder scenes constantly during drafting; sequencing enforcement would cry wolf. Revisit only if lived use demands it.

## Seeded library (app-side structure seeder — structure, not content, per the reproducibility doctrine)

Shipped as data in the app's structure seeders, editable/deletable like anything owner-made. Starter set (~18 cards): **devices** — Chekhov's gun, foreshadowing, red herring, dramatic irony, plant-and-payoff (generalized), MacGuffin, in medias res, frame story, unreliable narrator, motif, callback; **tropes** — the mentor's death, the reluctant hero, bookends, the reveal, bittersweet ending, false victory, dark night of the soul. Each card carries definition + craft_guidance + pitfalls + shape written fresh (no TV Tropes text — original phrasing, chronicle-voice-safe since these are tool copy, not world lore).

## Surfaces

1. **Library** — "Devices & Tropes" management lives on the project writing hub (`/writing/{project}`), a third panel/route section beside the structure tree: card list grouped by kind, create/edit modal (all card fields), delete with in-use guard (threads exist → confirm explains threads keep working, card soft-deletes).
2. **Marking** — a `MarkThreadModal` (MarkRevision pattern): pick/create thread (search cards + existing threads), role, section (defaults to current), scope node picker (ancestors → work → linked compendium ancestors), stance. Entry points: **outline + Kanban row menus** ("Mark device…" — planning-first per the owner's anchor ruling), **editor selection bubble** ("Mark as setup/payoff…" — captures the prose-span anchor), **File-tab ribbon group**.
3. **Threads sidebar mode** — sixth built-in mode (icon `fa-solid fa-link` family, distinct from Linked): for the current section, threads with marks here (role chips, jump-to-mark); below, the work's open promises. Rows open a thread detail modal: card guidance, stance, all marks in story order, add/remove mark, edit scope.
4. **Reports** — a **Promises** group in the work's Reports view: open promises table (thread, card, setup location, scope, age), kept threads count, stance distribution.
5. **Dashboard cross-work view** — on `/writing/{project}`: open promises across the narrative, grouped by scope node, oldest first — the "3 unfired guns with scope ending in this film" view no other tool can make.
6. **Kanban stance chips** — cards carrying threads show small stance/role chips so trope posture across acts is visible at a glance.

## HTTP (app conventions: middleware authz, JSON for fetch, literal-before-wildcard, assertScoped guards)

Project-scoped (threads cross works): `GET/POST /p/{project}/writing/cards` + `PUT/DELETE /cards/{card}`; `GET/POST /p/{project}/writing/threads` (+ filters: work, section, status, card) + `PUT/DELETE /threads/{thread}`; `POST /threads/{thread}/marks` + `PUT/DELETE /marks/{mark}`; `GET /p/{project}/writing/promises` (the derived cross-work report, also feeds Reports + dashboard). All `can:update,project`-tier gates matching how writing hub endpoints authorize; reads at view tier.

## Testing

Pest: status derivation for all three scope types incl. compendium containment + descendant entries; unplanted/open/kept transitions; scope-change re-derivation; card delete with live threads; mark backbone required + anchor optional round-trip; authz + cross-project 404s on every route. Vitest: dialog scope-picker ordering, status chip mapping, promises grouping helpers. Browser smoke: create thread from Kanban row → mark payoff from a later scene's editor → Reports shows kept; second thread stays open on the dashboard view.

## Out of scope (deliberate)

Positional setup-before-payoff ordering (see derived status) · AI-suggested devices from prose (later — pairs with Stage 12.8 synthesis era) · trope analytics beyond stance distribution · cross-PROJECT threads · public/shared libraries (SaaS-era question) · prose-anchor rail rendering in the margin (threads surface via sidebar + chips in v1; the comment rail stays comments-only).
