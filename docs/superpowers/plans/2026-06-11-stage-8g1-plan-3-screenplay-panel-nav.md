# Stage 8g.1 Plan 3 — Screenplay Elements, Reference Panel, Navigation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Final Draft-style screenplay element schema with format enforcement (#34), the worldbuilding reference panel + `WritingPanelRegistry` + appearance surfaces (#35), and the navigation entry points + global `/writing` dashboard (#38, pulled forward).

**Architecture:** Screenplay content stays **plain text** (spec amendment 1) in a Fountain-flavored serialization with a deterministic round-trip; the editor parses text → element nodes and serializes back on change, exactly like the wiki round-trip. The panel is core UI fed by small app-side JSON endpoints (pins CRUD, section mentions), with `WritingPanelRegistry` cloned from `SettingsSlotRegistry`. Navigation = project tab + global dashboard page (app controller, core page).

**Repos/branches:** both repos, existing `feat/8g1-writing-dashboard`. Run app tests from `C:\Websites\alexandria\alexandria-app`; core Pest from `C:\Websites\alexandria\alexandria-core`; JS unit tests live in the APP's Vitest (`@alexandria` alias).

**Verified context (don't re-derive):**
- `ManuscriptEditor.tsx` mounts `RichTextEditor variant="manuscript"`; menu bar owns title/label/ruler-toggle/status; footer owns counts. `section.format` is `'prose' | 'screenplay'` (effective).
- `RichTextEditor` is wiki-specific (StarterKit + wiki parse/serialize). Screenplay gets its OWN editor component sharing the manuscript chrome idioms — do NOT force screenplay nodes into RichTextEditor.
- Server analyzer: `SectionContentAnalyzer` (core) already estimates screenplay pages as non-empty lines / `lines_per_page` and extracts `[[mentions]]` format-agnostically. UNCHANGED this plan.
- Mentions table: `work_section_entry_mentions` (entry_id, source mention|pov|setting, mention_count). Pins table: `work_entry_pins` (work_id, entry_id, position, unique pair) — model `WorkEntryPin` exists, NO endpoints yet.
- Entry search endpoint: `GET /api/v1/entries/search?q=&project_id=&limit=` returns `{id, name, slug, blueprint_slug, blueprint_name, blueprint_icon}`.
- `SettingsSlotRegistry` pattern: `resources/js/pages/Settings/settingsCache.ts` (module-level registry + register/get + listener).
- Project sidebar: `resources/js/components/navigation/ProjectNavigation.tsx` (hardcoded sections: Dashboard, blueprint rows, AI Hub, Tools). Entry pages: core `pages/Entries/Show.tsx`, app `EntryController::show`.
- Section update endpoint accepts `pov_entry_id`/`setting_entry_id` (project-scoped exists rule) and re-syncs reference mentions. Sections reorder/move endpoints exist (no UI yet — still out of scope; Plan 4).
- House patterns named in prior plans: `EasterEggBridge` fetch+CSRF, error-tone `Tooltip` (controlled `open`), `useSortableReorder`, `SearchableMultiSelectModal`, lazy JSON fetch (SubscriberStats), `alex-toolbar-btn` idiom.

---

## Task 1 (core + app tests): Screenplay text codec

**Files:**
- Create: `alexandria-core/resources/js/editor/screenplay/types.ts` — `ScreenplayElement = 'slugline' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition'`; `ScreenplayBlock = { element: ScreenplayElement; text: string }`
- Create: `alexandria-core/resources/js/editor/screenplay/formatSpec.ts` — the keyboard maps + element order (data, not code):

```ts
import type { ScreenplayElement } from './types';

/** Enter at the end of a block starts this element next. */
export const ENTER_NEXT: Record<ScreenplayElement, ScreenplayElement> = {
    slugline: 'action',
    action: 'action',
    character: 'dialogue',
    parenthetical: 'dialogue',
    dialogue: 'character',
    transition: 'slugline',
};

/** Tab on an EMPTY block cycles through this order. */
export const TAB_CYCLE: ScreenplayElement[] = ['action', 'character', 'transition', 'slugline'];

/** Ordered list for the element indicator dropdown. */
export const ELEMENTS: ScreenplayElement[] = ['slugline', 'action', 'character', 'parenthetical', 'dialogue', 'transition'];
```

- Create: `alexandria-core/resources/js/editor/screenplay/codec.ts` — `parseScreenplay(text: string): ScreenplayBlock[]` and `serializeScreenplay(blocks: ScreenplayBlock[]): string`
- Create test: `alexandria-app/resources/js/__tests__/screenplay-codec.test.ts` (check where existing app Vitest unit tests live — 8l put them under resources/js; match the existing location/naming) importing via `@alexandria/editor/screenplay/codec`

**Codec rules (Fountain-flavored, deterministic round-trip):**

Blocks are separated by exactly one blank line in serialized text. Parsing (per block, after splitting on blank lines; a block may span consecutive non-blank lines):

1. Force markers (first char, stripped on parse): `.` slugline, `>` transition, `@` character, `!` action.
2. No force marker: line 1 matches `/^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i` AND block is single-line → `slugline`.
3. All-caps line 1 (letters exist, no lowercase letters; numbers/punctuation allowed) ending in `TO:` AND single-line → `transition`.
4. All-caps line 1, block has MORE lines → `character` (line 1), then each following line: wrapped in `(...)` → `parenthetical`, else `dialogue` (consecutive dialogue lines join the same dialogue block, a parenthetical splits them).
5. Everything else → `action` (multi-line action joins with `\n` into one block).

Serializing (canonical emission + force-marker escape so `parse(serialize(x)) === x` always):

- `slugline` → text uppercased; prefix `.` ONLY if the text would NOT re-parse as a slugline (rule 2 fails).
- `transition` → uppercased; prefix `>` unless it ends with `TO:` (and is all-caps).
- `character` → uppercased, then its following parenthetical/dialogue blocks attach in the SAME text block (no blank line between character/parenthetical/dialogue runs); prefix `@` if the name alone would parse as a slugline or transition.
- `parenthetical` → wrapped in `(...)` if not already.
- `dialogue` → as-is on its own line(s) under the character. A dialogue block NOT preceded by character/parenthetical serializes as action prefixed `!`... no — that state is unreachable via the editor (Enter from dialogue goes to character); if it occurs in data, emit with `!`? Simplify: treat orphan dialogue as `action` on serialize and document it in a comment.
- `action` → as-is; prefix `!` only if line 1 would mis-parse (all-caps single line, or slugline-like, or starts with a force char).

**Test vectors (write ALL of these as test cases, plus round-trip property checks `parse(serialize(parse(t))) === parse(t)` for each):**

```
"INT. LIBRARY - NIGHT"                          → [slugline]
".moments later"                                → [slugline "moments later"]
"MIRA\nYou came back."                          → [character MIRA, dialogue]
"MIRA\n(quietly)\nYou came back.\nI knew it."   → [character, parenthetical "quietly", dialogue "You came back.\nI knew it."]
"CUT TO:"                                       → [transition]
"BANG!"                                         → [action]  (all-caps single line, no following line)
"@INT. SECURITY\nWho goes there?"               → [character "INT. SECURITY", dialogue]
"She crosses the bridge.\nWind howls."          → [action, single block with newline]
"[[Mira Vance]] enters."                        → [action with wiki link preserved verbatim]
two blocks: "INT. SPIRE - DAY\n\nShe enters."   → [slugline, action]
```

**Step order:** write the test file FIRST against the not-yet-existing module → confirm Vitest fails to resolve → implement types/formatSpec/codec → `npx vitest run <testfile>` green → `npm run types:check` clean. No git.

---

## Task 2 (core): ScreenplayEditor + format switching

**Files:**
- Create: `alexandria-core/resources/js/editor/screenplay/extensions.ts` — TipTap nodes: one node per element, each a block with `content: 'text*'` (plus the entry-link mark/node allowed inside `action` only — reuse the existing entry-link extension), rendered as `<p data-element="slugline">` etc.; a custom `Document` with `content: '(slugline | action | character | parenthetical | dialogue | transition)+'` so ONLY format elements can exist (enforcement). Keyboard shortcuts extension: Enter (at block end → split to `ENTER_NEXT[current]`; mid-block → normal split keeping element), Tab (block empty → cycle `TAB_CYCLE`; in character/dialogue → become `parenthetical`), Shift-Tab (cycle backwards), `(` typed at start of an empty dialogue → convert block to parenthetical with the paren consumed.
- Create: `alexandria-core/resources/js/editor/screenplay/screenplay.css` → import chain like manuscript.css (app resources/css/app.css). Element styling INSIDE the existing manuscript page sheet, industry layout via the page's 1in-margin coordinate system (print layout) and proportional otherwise: slugline + transition uppercase bold; character `margin-left: 2.2in` (print) / centered-ish indent otherwise, uppercase; parenthetical `margin-left: 1.6in`, italic muted; dialogue `margin-left: 1in; max-width: 3.5in` (print) / indented narrower measure otherwise; action full measure. Mono-ish serif (Courier feel) for the whole screenplay sheet: `font-family: 'Courier New', Courier, monospace; font-size: 12pt; line-height: 1;` scoped `.rte-screenplay .ProseMirror`. Tokens for colors only — layout literals are fine (they're print geometry, not theme).
- Create: `alexandria-core/resources/js/pages/Writing/Sections/ScreenplayEditor.tsx` — mirrors ManuscriptEditor's shell contract but for screenplay: receives the same props; uses `useEditor` with the screenplay extension set; value = Fountain-flavored text via the codec (parse on mount/section-switch, serialize on update with the same 300ms inner debounce idiom); REUSES the same autosave machinery — extract it first (next bullet). Toolbar: element indicator `Select` (current block element, changing it converts the block; track via `editor.state` selection), entry-link button (action blocks only — disable otherwise), ruler toggle + help. Footer: counts (the existing pattern).
- Refactor: extract the autosave + flush logic from `ManuscriptEditor.tsx` into `resources/js/pages/Writing/Sections/useSectionAutosave.ts` (a hook: `useSectionAutosave({projectSlug, workSlug, sectionId, onCounts}) → { content, setFromEditor, status, wordCount, pageEstimate, flushNow }` — preserve EXACT current semantics: 3s debounce, 20s max-pending, dirty/saving/saved/error, section-switch flush via refs, title NOT included). ManuscriptEditor consumes the hook; ScreenplayEditor consumes the same hook. No behavior change for prose.
- Modify: `resources/js/pages/Writing/Workspace.tsx` — pick the editor by `currentSection.format`: `screenplay` → ScreenplayEditor, else ManuscriptEditor.
- Lang: add to `writing.php` (flat): `'workspace.element' => 'Element'`, `'elements.slugline' => 'Scene heading'`, `'elements.action' => 'Action'`, `'elements.character' => 'Character'`, `'elements.parenthetical' => 'Parenthetical'`, `'elements.dialogue' => 'Dialogue'`, `'elements.transition' => 'Transition'`.

**Verification:** app `npm run build` + `types:check`; app `php artisan test --compact --filter=Writing` (32 still green — server untouched); add Vitest coverage for the keyboard maps if cheap (transition-map unit test against formatSpec is Task 1's; editor-level interaction tests are browser-suite territory, Plan 4). Token-usage sync if flagged.

---

## Task 3 (app): Panel endpoints — pins CRUD + section mentions + global dashboard data

**Files:**
- Create: `app/Http/Controllers/Writing/WorkPinController.php` + routes inside the `/works` group:

```php
Route::get('/{project:slug}/{work:slug}/panel/mentions/{section}', [WorkPanelController::class, 'sectionMentions'])
    ->name('works.panel.mentions')->middleware('can:view,work');
Route::post('/{project:slug}/{work:slug}/pins', [WorkPinController::class, 'store'])
    ->name('works.pins.store')->middleware('can:update,work');
Route::delete('/{project:slug}/{work:slug}/pins/{entry}', [WorkPinController::class, 'destroy'])
    ->name('works.pins.destroy')->middleware('can:update,work');
```

- Create: `app/Http/Controllers/Writing/WorkPanelController.php` — `sectionMentions(Project, Work, int $section): JsonResponse`: same-work guard; returns `{ pov: EntryCard|null, setting: EntryCard|null, mentions: EntryCard[] }` where `EntryCard = {id, name, slug, blueprint_slug, blueprint_name, blueprint_icon, mention_count, url}` (mirror the entry-search payload shape + `getSluggableUrl()`).
- `WorkPinController::store` validates `entry_id` (`Rule::exists('entries','id')->where('project_id', $project->id)`), `firstOrCreate` on (work_id, entry_id) with next position; `destroy(Project, Work, Entry $entry)` deletes the pair row. Both return back() (Inertia) — the Workspace page receives a NEW prop `pins: EntryCard[]` from `WorkController::show` (add it: work->pins with entry loaded, mapped to EntryCard shape) so panel pins are server-driven props, not lazy fetch.
- Modify: `app/Http/Controllers/Writing/WorkController.php::show` — add `pins` prop as above.
- Create: `app/Http/Controllers/Writing/WritingDashboardController.php` (single action) + route `GET /writing` (auth+verified, named `writing.index`, NO project param): the user's works across all projects they own or belong to (mirror `DashboardController`'s project-membership query), grouped: `projects: [{id, name, slug, works: WorkRow[]}]` (reuse the index WorkRow shape), rendered as Inertia `'Writing/Dashboard'`.
- Modify: `app/Http/Controllers/Entries/EntryController.php::show` — add an `appearances` prop: works in this project whose sections mention/reference this entry — `[{work: {title, slug}, sections: [{title, slug, sources: string[], mention_count}]}]` via one query over `work_section_entry_mentions` join `work_sections` join `works` (non-deleted), grouped by work, capped at 20 sections.
- Tests: `tests/Feature/Writing/WorkPanelTest.php` — pins store/destroy (+ cross-project entry 422, duplicate pin no-dup), sectionMentions payload (pov/setting/mentions shapes + counts), wrong-work section 404; `WritingDashboardTest.php` — groups works by project, excludes projects the user isn't in; `EntryController` appearances: entry with mentions in two works shows both, soft-deleted section excluded. Gate-bypass convention + real-role spot check like the existing suites.

---

## Task 4 (core): Reference panel UI + WritingPanelRegistry + Appears-in

**Files:**
- Create: `resources/js/pages/Writing/writingPanelRegistry.ts` — clone of `settingsCache.ts`: `interface WritingPanelTab { id: string; labelKey: string; icon: string; component: ComponentType<WritingPanelContext>; }` where `WritingPanelContext = { project, work, currentSection }` (typed against the Workspace interfaces); `registerWritingPanels(tabs)` + `getWritingPanels()` + subscribe listener (copy settingsCache's mechanics exactly).
- Create: `resources/js/pages/Writing/Sections/ReferencePanel.tsx` — the right rail content. Tab strip (icon buttons, alex-toolbar-btn idiom): built-ins **Browse**, **Pins**, **Section** + any registered extras (render `getWritingPanels()`; subscribe for changes). Tabs:
  - **Browse:** search input (debounced 300ms) → fetch `/api/v1/entries/search?q=&project_id=&limit=15` (plain GET fetch, lazy-JSON house pattern); result rows: blueprint icon + name + blueprint label; row click → expand an inline peek card (name, blueprint, link out via `url` — use the row payload only, no second fetch v1) + a pin button.
  - **Pins:** from the `pins` prop (server-driven): rows like Browse results + unpin button → `router.delete(.../pins/{entryId}, {preserveScroll: true})`. Pin from Browse → `router.post(.../pins, {entry_id}, {preserveScroll: true})`.
  - **Section:** lazy GET `works.panel.mentions` for `currentSection.id` (refetch on section change + after save status flips to 'saved' — pass `saveSignal` prop bumped by the editor's onCounts); shows POV + Setting (with PICKERS — see below) and the `[[mention]]` list with counts; rows link to entries.
  - **POV/Setting pickers:** a compact picker per field — button opens `SearchableMultiSelectModal` (single-select mode, items from the same entry-search endpoint fed by a search box... read the component's props first; if it's static-items-only, build a small `EntrySearchModal` beside it reusing its row/modal idioms) → on pick: `router.put(.../sections/{id}, { title: currentSection.title, pov_entry_id: pickedId }, {preserveScroll: true, only: ['currentSection','sections']})` (the endpoint requires `title`; send current values for fields you're not changing — confirm against WorkSectionController::update validation and send the minimal valid payload).
- Modify: `resources/js/pages/Writing/Workspace.tsx` — replace the empty `<aside>` with `<ReferencePanel ...>` (still `hidden xl:block w-72`... widen to `w-80`); add a collapse toggle (chevron button in the work header strip, persisted localStorage `alexandria.writing.panel_open`).
- Modify: `resources/js/pages/Entries/Show.tsx` — add an **"Appears in"** card rendered only when `appearances` prop is non-empty: grouped by work, section rows deep-linking `/works/{project.slug}/{work.slug}/{section.slug}`, source chips (POV/Setting/Mention). Place it with the existing relationship/connection cards (read the page's card section and match).
- Lang additions (`writing.php`, flat): `panel.browse`, `panel.pins`, `panel.section`, `panel.search_placeholder`, `panel.no_results`, `panel.no_pins`, `panel.pin`, `panel.unpin`, `panel.pov`, `panel.setting`, `panel.mentions`, `panel.none_set`, `panel.choose`, `panel.clear`, `panel.collapse`, `panel.expand`, `appears_in.title`, `appears_in.mention`, `appears_in.pov`, `appears_in.setting` (sensible English strings).

**Verification:** app build + types + `--filter=Writing` green + token sync if flagged.

---

## Task 5 (core + app): Navigation + global Writing dashboard page

**Files:**
- Modify: `resources/js/components/navigation/ProjectNavigation.tsx` — add a **Writing** row (icon `fa-solid fa-feather-pointed`) linking `/works/{project.slug}`, placed with the AI Hub/Notes-style tool rows (read the component; match the row idiom + active-state detection via `window.location.pathname.startsWith('/works/')`... use however the component detects active for Notes/AI).
- Navbar global item: read `Navbar.tsx` + how Notes/AI appear globally (they may not — if there's no global-tools precedent in the navbar, put Writing ONLY in: (a) the project sidebar row, and (b) the user-facing main Dashboard page if it has tool links — check `pages/Dashboard.tsx` for a Notes/AI entry pattern and mirror; report what you found rather than inventing a navbar slot).
- Create: `resources/js/pages/Writing/Dashboard.tsx` — the global `/writing` page (Inertia `'Writing/Dashboard'`, props from Task 3's controller): PageHeader hero (same IconTile/serif idiom as Writing/Index, breadcrumb just "Writing", no project crumb), then per-project groups: project name heading linking `/works/{slug}` + the WorkCard rows (EXTRACT `WorkCard` from `Index.tsx` into `resources/js/pages/Writing/Sections/WorkCard.tsx` and reuse in both pages). Empty state for no works anywhere.
- Lang: `dashboard.title => 'Writing'`, `dashboard.intro => 'Every manuscript across your projects.'`, `dashboard.empty => 'No works yet. Open a project and start one.'` (flat, `writing.` group).

**Verification:** app build + types; app `php artisan test --compact --filter=Writing` (Task 3 added WritingDashboardTest).

---

## Task 6: Cross-repo verification + board

- [ ] Core: `vendor/bin/pest --compact` (561+2 baseline) + pint clean
- [ ] App: `php artisan test --compact` full suite + pint + `npm run build` + token-usage test clean
- [ ] Vitest: codec tests green (`npx vitest run` the screenplay codec file)
- [ ] Both `git status` clean
- [ ] Board: #34, #35, #38 → completed
- [ ] QA doc: append a "Plan 3 items" section (screenplay typing flow incl. Enter/Tab/( behaviors + element dropdown + courier sheet, panel tabs incl. pin/unpin + POV/setting pickers + section mentions, Appears-in block, project sidebar row + /writing dashboard) so the #40 UX sweep covers them

---

## Self-Review Notes (applied)

- Codec round-trip invariant + force-marker escape hatch is specified with executable vectors — the one genuinely tricky part of #34 is pinned by tests before the editor exists.
- Orphan-dialogue serialization simplification (treat as action) is documented in the codec comment rather than left ambiguous.
- The pins surface is server-prop-driven (Inertia) while section mentions are lazy JSON — deliberate: pins mutate via Inertia (flash/refetch free), mentions change on every save (lazy + saveSignal).
- The section-update picker payload constraint (endpoint requires `title`) is flagged with instructions to verify the validation rather than assume.
- Navbar global entry is reconnaissance-gated (mirror an existing global-tool precedent or report) — no invented UI surface.
- Screenplay layout literals (inches) are intentionally NOT tokens — print geometry, documented in the CSS task.
