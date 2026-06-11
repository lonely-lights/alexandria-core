# Stage 8g.1 Plan 4 — Work Settings & Length Plans, Reports, Reorder, Browser Smokes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out the 8g.1 build: editable length plans + Work Settings (#36), the three live reports (#37), the deferred Navigator drag-reorder, and the browser-smoke suite (#39). After this plan only the #40 UX sweep stands between the branch and main.

**Repos/branches:** both repos, `feat/8g1-writing-dashboard`. Same verification gates as Plans 2–3 (app build/types/Pest, core Pest/pint, token-usage sync, Vitest).

**Verified context (don't re-derive):**
- `works.length_plan` is JSONB (array cast), seeded from `config('alexandria.writing.length_plans')` presets by WorkScaffolder; `works.target_words`, `work_sections.target_words` exist. `works.update` endpoint currently validates title/status/logline ONLY.
- Reports data layer exists: `work_section_entry_mentions` (+ entry/type), cached `word_count` per section + work, craft fields on sections. `BuildsEntryCards` trait app-side.
- Workspace header strip: back-link, status chip, panel-collapse chevron, work word count. `SectionChrome` owns per-section chrome. `ReferencePanel` Section tab shows POV/Setting/mentions (lazy JSON + `saveSignal`).
- Reorder/move endpoints exist (`works.sections.reorder` ordered-ids per sibling group; `works.sections.move`), NO UI yet. `useSortableReorder(ref, onReorder, enabled)` + the store-products optimistic render-time sync is the house pattern. Navigator renders recursive rows with stable keys.
- Browser tests: pest-plugin-browser + Playwright, suites in `alexandria-app/tests/Browser/`, conventions + pitfalls per the 8l findings doc and memory (isolated-world `script()`, text-vs-CSS locators, stop the dev server / build assets first). Existing Store browser smokes are the template (`tests/Browser/Store/StoreSurfacesTest.php`).
- Essay defaults circle-back (user): essay template currently borrows the `short_story` plan (7,500 / 2,500). **Decision needed at check-in — see Open Decisions.**

---

## Open decisions (resolve at check-in before execution)

1. **Essay default plan:** (a) no plan at all — no targets render until the user sets one in Work Settings (recommended: essays vary wildly); (b) a humbler `essay` preset (~2,000 words, no per-section); (c) keep borrowing short_story.
2. **Where Work Settings opens from:** (a) gear icon in the workspace header strip (recommended — you're usually in the workspace); (b) also a kebab/gear on each works-index card. Plan assumes (a) only; (b) is a cheap add if wanted.

---

## Task 1 (app): Work settings + length-plan endpoint

**Files:** modify `app/Http/Controllers/Writing/WorkController.php` (+ `routes/web.php` if a dedicated route reads cleaner), extend `tests/Feature/Writing/WorkControllerTest.php`.

Extend `works.update` (or add `works.settings.update` — implementer's call, note it) to accept, alongside title/status/logline:
- `type` — `Rule::in(config('alexandria.writing.types'))` (works-index created it; settings may correct it; changing type does NOT re-scaffold)
- `length_plan` — nullable array: `preset` (nullable string, `Rule::in(array_keys(config('alexandria.writing.length_plans')))`) + `target_words`/`target_pages`/`per_section_words` (each nullable int min:0). Server resolves: preset given → merge preset values with any explicit overrides; all-null → store null.
- `target_words` top-level stays derived: set from the resolved plan's target_words (or null) — not independently submitted.
- `apply_section_targets` — nullable boolean: when true and the resolved plan has `per_section_words`, bulk-update ALL the work's sections `target_words` to it (one query). When false/absent, existing sections keep their targets (new sections still default at scaffold time only — content sections created via the Navigator get NULL target unless this flag was used; acceptable, document it).

Tests: preset apply (novel → 90k + flag bulk-updates sections), custom numbers without preset, null plan clears targets, apply_section_targets false leaves sections alone, invalid preset 422.

## Task 2 (core): Work Settings modal + progress polish

**Files:** create `resources/js/pages/Writing/Sections/WorkSettingsModal.tsx`; modify `Workspace.tsx` (gear button in the header strip, left of the panel chevron), `lang/en/writing.php`.

- Modal (house Modal + form components + error poppers where validation can fail): title, type select, status select, logline textarea, then **Length plan**: preset Select (`(none)` + the config presets — pass available presets as a new `lengthPlans` prop from `WorkController::show`: key + numbers) + number inputs target_words / per_section_words (+ target_pages shown only for screenplay-format works), prefilled from `work.length_plan`; picking a preset prefills the numbers (still editable — custom overrides win); checkbox `apply_section_targets`. Submit → `router.put(works.update route, ..., {preserveScroll})`.
- Workspace header progress: replace the plain work word count with count + a slim progress bar vs `target_words` when set (theme tokens; cap at 100%, no overflow drama).
- Navigator rows: when a section has `target_words`, append a muted `/ target` to the word count (no bars in the tree — keep it quiet).
- Section target editing: in ReferencePanel's **Section** tab, add a small "Target words" number input (canUpdate only) → PUT section update (`{title: currentSection.title, target_words}`) with the partial-reload idiom. (Workspace must thread `currentSection.target_words` into the panel — it already passes currentSection.)
- Lang keys (flat): `settings.title`, `settings.length_heading`, `settings.preset`, `settings.preset_none`, `settings.target_words`, `settings.per_section_words`, `settings.target_pages`, `settings.apply_targets`, `settings.apply_targets_help`, `settings.save`, `panel.target_words` (+ whatever field labels aren't covered by existing form.* keys).

## Task 3 (app): Reports endpoint

**Files:** create `app/Http/Controllers/Writing/WorkReportController.php`; route `GET /works/{project:slug}/{work:slug}/reports` → name `works.reports` → `can:view,work` (declare BEFORE the `{section?}` show route or the slug `reports` gets captured as a section — same capture-order gotcha as sections/reorder; add a test proving `/reports` renders the reports page AND a section slugged `reports` is still reachable... that collision is real: a section named "Reports" → slug `reports` becomes unreachable via deep link. Accept + document: route order makes /reports win; the section is still selectable in the Navigator).
- Inertia `'Writing/Reports'` props:
  - `characters`: per entry referenced anywhere in the work — EntryCard + `total_mentions`, `sections_count`, `first_section: {title, slug}` (by tree order: ordered sections list, first containing a row), `sources` (distinct). One pass over mentions + sections.
  - `structure`: the FLAT ordered tree (depth-first by position): `{id, depth, title, slug, label, status, beat_type, pov: string|null (entry name), word_count, target_words, has_content}`.
  - `progress`: `{work_word_count, target_words, length_plan, per_level: [{label: string|null, sections: int, words: int, average: int}] (grouped by section label), recent: [{date: 'YYYY-MM-DD', words: int}] last 14 days}` — `recent` v1 = sections' word_count attributed to their `updated_at` date (the documented approximation; a real daily-stats table is post-8g.1).
- Tests (`WorkReportTest.php`): character aggregation across sources/sections, structure ordering + depth, per-label grouping math, the `/reports` vs `{section?}` route-order proof, view-permission 403 for non-members (real-role).

## Task 4 (core): Reports page

**Files:** create `resources/js/pages/Writing/Reports.tsx` (+ small section components in `pages/Writing/Sections/Reports/` if it grows past ~250 lines); modify `Workspace.tsx` (chart icon `fa-chart-simple` in the header strip → Link to the reports route), `lang/en/writing.php`.

- `AppLayout immersive` + PageHeader (breadcrumbs project → work (link back to workspace) → Reports; the Writing hero idiom scaled down — no IconTile needed, plain serif h2 is fine to keep it utilitarian).
- Three stacked cards (house card idiom):
  1. **Characters & references** — table: entry (icon+name, links out), blueprint, mentions, sections, first appears (links into the workspace section). Client-side blueprint filter (Select over distinct blueprint names) + a search-by-name input. Empty state.
  2. **Structure** — indented rows mirroring the Navigator: depth-indented title + label chip, status, beat_type, words vs target (muted), deep-link each row into the workspace.
  3. **Progress** — work total vs target (the same slim bar as the workspace header), per-label averages table, and the 14-day `recent` list rendered as a simple bar row (no chart lib — divs with token backgrounds; honesty caption that it's grouped by last-edit date).
- Lang keys (flat, `reports.*`): title, characters_heading, structure_heading, progress_heading, col_* labels, filter_all, search_placeholder, first_appears, recent_heading, recent_caption, empty states.

## Task 5 (core): Navigator drag-reorder

**Files:** modify `resources/js/pages/Writing/Sections/Navigator.tsx`.

- `useSortableReorder` per SIBLING GROUP (each `children` container + the root list each get their own ref/instance — the hook takes one ref; render each group's rows inside its own container div with `.drag-handle` on a grip icon (`fa-grip-vertical`, visible on row hover beside the existing add/delete actions, canUpdate only).
- On drop: optimistic local reorder using the store-products render-time-state pattern (Navigator currently renders straight from props — add the same "adjusted order" state keyed off props identity, NOT setState-in-effect), then `router.put(works.sections.reorder route, {parent_id, ids}, {preserveScroll: true})`.
- Cross-parent moves stay out of scope (the move endpoint has no UI yet — note in the QA doc's expected gaps).
- Constraint check: SortableJS within nested containers — groups must NOT share a SortableJS `group` option (no cross-list dragging); verify the hook doesn't set one (it doesn't, per the store usage).

## Task 6 (app): Browser smokes

**Files:** create `tests/Browser/Writing/WritingSurfacesTest.php` (mirror `tests/Browser/Store/StoreSurfacesTest.php` setup + the 8l conventions; consult `docs/tests/2026-06-09-stage-8l-findings.md` pitfalls before writing).

Smokes (RefreshDatabase, real user + project + role arrange like the feature suites — or Gate::before if the Store smokes do that; MATCH the store suite):
1. Works index: create a novel via the modal → lands in the workspace, Navigator shows 3 chapters, `assertNoJavaScriptErrors`.
2. Prose autosave: type into the editor → "Saved" appears in the menu bar; reload → text persisted.
3. Screenplay flow: open a screenplay work → type a slugline, Enter, type action, Tab on the empty next line cycles to character → assert `data-element` attributes via locators.
4. Reference panel: search an entry in Browse, pin it, Pins tab shows it; Section tab shows a POV after picking (if the picker flow is too flaky for v1 smokes, pin-flow only + note it).
5. Navigator reorder: drag chapter 3 above chapter 1 (Playwright dragTo on the grip) → order persists after reload. (8l memory: drag interactions were finicky — if irreducibly flaky, assert via the reorder endpoint test instead and mark the browser case skipped with a reason, like the 8l drawer skips.)
6. Reports page renders all three headings without JS errors.
7. `/writing` global dashboard renders the grouped work.

## Task 7: Verification sweep + docs + board

- Full suites both repos + Vitest + token sync + pint + `npm run build`; both trees clean.
- QA doc: append "Plan 4 items" (work settings incl. essay-default behavior per the check-in decision, per-section targets, progress bars, reports incl. the `reports`-slug caveat, drag-reorder, smokes-now-cover list) + move drag-reorder OUT of expected gaps; note cross-parent move as the remaining gap.
- Board: #36, #37, #39 → completed. CLAUDE.md 8g row: update 8g.1 status to "build complete, UX sweep (#40) pending".

---

## Self-Review Notes (applied)

- The `/reports` vs `{section?}` slug collision is called out with route-order resolution + an honest unreachable-deep-link caveat documented rather than hidden.
- `recent` progress data is explicitly labeled an approximation in both payload design and UI caption.
- Drag-and-drop browser-test flakiness has a sanctioned fallback (skip-with-reason, 8l precedent) instead of a doomed hard requirement.
- Two product decisions are parked in **Open decisions** for the check-in rather than assumed.
