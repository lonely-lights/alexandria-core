# Stage 11 Slice 3 — Analysis Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Structure templates as data (selectable/editable per work), deterministic structure diagnostics feeding the existing guidance card, and scene-link drilldowns with a per-section Reports breakdown.

**Architecture:** Templates live in `length_plan.structure` JSONB (no new table — spec decision); diagnostics are pure functions (Vitest-covered) that extend `getStructureGuidance()`'s existing card items and expose a provider seam for Stage 12a analyzers; drilldowns add one JSON endpoint + a ReferencePanel modal; Reports gain a per-act character-load table.

**Tech Stack:** Laravel 13 / PHP 8.4 (app controllers/validation), React 19 + TS (core UI), Pest 4 (app), Vitest (suite lives in `alexandria-app/resources/js/editor/tests/` — core has NO Vitest runner).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-stage-11-writing-dashboard-followups-design.md` Slice 3 — templates: **three-act screenplay, five-act screenplay, three-act prose**; beats carry name + target position (% of pages for screenplay, % of words for prose) + optional tolerance; outlier thresholds: **> 2× or < ⅓ of the work's median section length** (thresholds live in template data); diagnostics are pure functions over already-available data (NO AI, no new queries in the workspace payload path); the guidance card must accept externally-registered rule providers (12a seam).
- UI strings via lang files only (`alexandria-core/lang/en/writing.php`, guidance keys follow the existing flat `guidance.*` style; frontend `useT()` with `.replace(':x', …)` interpolation).
- Andrew's test style: brace-free simple string interpolation, chained `->and()` Pest expectations.
- No new npm/composer dependencies. Pint (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- Commit trailers on every commit:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n`
- Branch `feat/stage-11-slice-3` in BOTH repos.
- Key context (verified 2026-07-07): `length_plan` shape today = `{preset?, target_words?, per_section_words?, target_lines?, target_pages?}` written by `WorkSettingsModal.tsx` (form.transform ~87–127; new Structure section slots after the apply-targets checkbox ~line 338) and validated by app `WorkController::update` → `resolveLengthPlan()` (~152–155). `structureGuidance.ts` branches on work.type with hardcoded screenplay/stage_play/poem paths; Navigator renders `guidance.items` (~327–349). `ScreenplaySceneLink = {key,id,name,displayText,variants[{text,mentions,characterCues}],slug,blueprintSlug,mentions,characterCues,dialogueWords}`; ReferencePanel's SceneLinksTab renders stat chips (~667–750). Reports: `Reports.tsx` shapes (`CharacterReportRow`, `ProgressReportData.per_level`), app `WorkReportController` builds the payload. Per-section scene-link data is NOT client-side today.

---

### Task 1: Structure templates as data + Work Settings Structure section

**Files:**
- Create: `alexandria-core/resources/js/pages/Writing/Sections/structureTemplates.ts`
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/WorkSettingsModal.tsx` (types ~24–30, transform ~87–127, new section after ~338)
- Modify: `alexandria-app/app/Http/Controllers/Writing/WorkController.php` (`update` validation + `resolveLengthPlan`)
- Modify: `alexandria-core/lang/en/writing.php` (settings/structure keys)
- Test: `alexandria-app/tests/Feature/Writing/WorkControllerTest.php` (extend) + `alexandria-app/resources/js/editor/tests/structureTemplates.test.ts`

**Interfaces (produces — later tasks depend on these exact names):**

```ts
// structureTemplates.ts
export interface StructureBeat { name: string; target: number; tolerance: number } // target/tolerance in % (0–100)
export interface StructureTemplate {
    slug: 'three-act-screenplay' | 'five-act-screenplay' | 'three-act-prose' | string;
    labelKey: string;                    // lang key
    unit: 'pages' | 'words';
    beats: StructureBeat[];
    outlierHigh: number;                 // 2 (× median)
    outlierLow: number;                  // 1/3 (× median) — store as 0.333
    characterLoadHint?: number;          // max distinct speaking characters per act (screenplay)
}
export const STRUCTURE_TEMPLATES: StructureTemplate[];
export interface WorkStructure { template: string; beats: StructureBeat[] } // persisted in length_plan.structure
```

- Built-ins: three-act-screenplay (beats: Act 1 end 25%±5, Midpoint 50%±5, Act 2 end 75%±5; unit pages; characterLoadHint 8), five-act-screenplay (20/40/60/80 ±5), three-act-prose (25/50/75 ±5; unit words). Values are the defaults — per-work beats are editable copies.
- Work Settings gains a **Structure** heading: template `Select` (existing form/Select; options = templates + a "none" choice) + per-beat editable rows (name Input, target number, tolerance number) shown when a template is chosen; picking a template seeds `structure.beats` from its defaults (deep copy); "none" clears `length_plan.structure`. Follow the length-plan preset patterns (`handlePresetChange`, `touched` state) exactly.
- App validation: `length_plan.structure` nullable array — `structure.template` string max:64; `structure.beats` array; each beat `name` string max:60, `target` numeric 0–100, `tolerance` numeric 0–50. `resolveLengthPlan` passes `structure` through when present (no server-side template registry — templates are client data; server stores what it's given).
- Vitest: templates well-formed (beats ascending by target, tolerances sane, slugs unique). Pest: update with a structure persists it; invalid beat target 422s; structure absent leaves length_plan unchanged shape.

TDD, then commit `feat(writing): structure templates as data + Work Settings structure section` (core) / `feat(writing): validate length_plan.structure` (app).

---

### Task 2: Deterministic diagnostic rules (pure functions + Vitest)

**Files:**
- Create: `alexandria-core/resources/js/pages/Writing/Sections/structureRules.ts`
- Test: `alexandria-app/resources/js/editor/tests/structureRules.test.ts` (mirror pageBreakMath.test.ts conventions)

**Interfaces (produces):**

```ts
export interface DiagnosticInput {
    structure: WorkStructure | null;
    template: StructureTemplate | null;          // resolved from structure.template, null when custom/none
    unit: 'pages' | 'words';
    totalUnits: number;                          // work page estimate or word count
    sections: Array<{ id: number; title: string; label: string | null; words: number; endUnits: number }>; // endUnits = cumulative position where the section ends
    sceneLinks: Array<{ name: string; slug: string | null; mentions: number; characterCues: number; sectionIds?: number[] }>;
    actBuckets?: Array<{ label: string; characterNames: string[] }>;   // per-act distinct speaking names, when derivable
}
export interface Diagnostic { id: string; state: 'complete' | 'current' | 'open'; labelKey: string; value: string; severity: 'ok' | 'warn' }
export function beatPlacementDiagnostics(input: DiagnosticInput): Diagnostic[]   // per beat: actual% vs target±tolerance
export function lengthOutlierDiagnostics(input: DiagnosticInput): Diagnostic[]   // sections >2× or <1/3 median (leaf sections only, min 3 sections before judging)
export function characterLoadDiagnostics(input: DiagnosticInput): Diagnostic[]   // per act vs characterLoadHint
export function orphanedLinkDiagnostics(input: DiagnosticInput): Diagnostic[]    // links with slug === null (canonical entry unresolved)
export function runStructureDiagnostics(input: DiagnosticInput): Diagnostic[]    // all of the above, ordered
```

- All pure; no imports beyond types + structureTemplates. Percent math: beat actual = the `endUnits` of the section whose label/name matches the beat… **NO — beats map by position, not name:** actual beat position = cumulative `endUnits` of the Nth top-level section boundary when the work has top-level sections ≥ beats; when fewer, emit an `open` "not enough structure yet" diagnostic instead of guessing. Keep the mapping rule THIS simple and document it in the module docblock.
- Vitest cases per rule: on-target, out-of-tolerance (warn), missing-data (no template / <3 sections / zero totals → empty or `open` items, never NaN). Median math verified with even/odd counts.

Commit `feat(writing): deterministic structure diagnostics (pure rules)` (core) + tests (app).

---

### Task 3: Guidance card integration + 12a provider seam

**Files:**
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/structureGuidance.ts`
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/Navigator.tsx` (only if the input threading needs new props — check what Workspace already passes)
- Modify: `alexandria-core/lang/en/writing.php`

**Behavior:**
- `getStructureGuidance()` gains: when `work.length_plan.structure` exists, resolve the template and append `runStructureDiagnostics(...)` results to the card's `items` (mapped into the existing `StructureGuidanceItem` shape; `severity: 'warn'` → `state: 'current'` with the warn icon `fa-triangle-exclamation`, `ok` → `complete`). The existing hardcoded form branches remain the fallback when no structure is configured.
- **Provider seam:** export `registerGuidanceProvider(fn: (ctx) => StructureGuidanceItem[])` + module-level registry consumed by `getStructureGuidance` — documented one-liner for Stage 12a analyzers to plug in. YAGNI beyond that (no priority/dedup logic).
- Lang keys: `guidance.beat_on_target`, `guidance.beat_off_target`, `guidance.beat_pending`, `guidance.outlier_long`, `guidance.outlier_short`, `guidance.character_load`, `guidance.orphaned_links`, plus template label keys (`guidance.template_three_act_screenplay` etc.).
- The scene-link/act inputs come from data the Workspace already holds (`sceneLinks` state, section tree); thread minimally.

Commit `feat(writing): template-driven diagnostics in the guidance card`.

---

### Task 4: Scene-link drilldown (endpoint + ReferencePanel modal)

**Files:**
- Modify: `alexandria-app/app/Http/Controllers/Writing/WorkPanelController.php` (+ route in `routes/web.php` beside `works.panel.mentions`)
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/ReferencePanel.tsx` (SceneLinksTab ~667–750)
- Modify: `alexandria-core/lang/en/writing.php`
- Test: `alexandria-app/tests/Feature/Writing/WorkPanelControllerTest.php` (extend/create beside existing panel tests)

**Behavior:**
- New endpoint `GET /works/{project:slug}/{work:slug}/panel/scene-link/{slug}` (`works.panel.scene_link`, `can:view,work`): returns per-section occurrences of that canonical link across the work — `{sections: [{id, title, label, mentions, characterCues, dialogueWords, variants: [{text, mentions}]}]}`. Compute server-side by running the existing scene-link extraction (find how `WorkPanelController@sectionMentions` / the codec derives links — reuse, don't duplicate; if extraction is client-only today, compute from `work_section_entry_mentions`/section content the way Reports already aggregates — mirror `WorkReportController`'s approach).
- ReferencePanel: clicking a link's stat chips opens a modal (existing Modal component) listing that link's per-section rows; each row click = `onSelect(section.slug)` navigation (same pattern the panel already uses for mention rows). Loading state + empty state per panel conventions.
- Pest: endpoint returns correct per-section counts for a fixture work (2 sections, link appears in both with different counts); 403/404 guards match sibling panel routes.

Commit `feat(writing): scene-link per-section drilldown` (app + core).

---

### Task 5: Reports per-act breakdown

**Files:**
- Modify: `alexandria-app/app/Http/Controllers/Writing/WorkReportController.php`
- Modify: `alexandria-core/resources/js/pages/Writing/Sections/Reports/CharactersReport.tsx` (or a new `ActBreakdownReport.tsx` section within the Reports page — follow the page's section pattern)
- Modify: `alexandria-core/lang/en/writing.php`
- Test: extend the existing WorkReport feature test (find it; create if absent)

**Behavior:**
- Payload gains `act_breakdown: [{label, sections, words, characters: [{name, slug, mentions}], distinct_characters}]` — an act = each TOP-LEVEL section; its bucket aggregates the subtree (reuse the controller's existing per_level walk). Character mentions from the same source `CharacterReportRow.sources` derives from.
- UI: a "By act" table on the Characters report (act label · sections · words · distinct characters · top names as chips). First/last appearance columns on the existing character rows (`first_section` already exists — add `last_section` symmetrically).
- Pest: fixture work (2 acts × 2 scenes, character mentioned in acts 1+2) asserts bucket counts + first/last.

Commit `feat(writing): per-act report breakdown` (app + core).

---

## Verification (slice level)

- Vitest: `npx vitest run resources/js/editor/tests/structureTemplates.test.ts resources/js/editor/tests/structureRules.test.ts` + full run (known pre-existing failure: token-usage.test.ts — not yours).
- Pest: `php artisan test --compact --filter="WorkController|WorkPanel|WorkReport"`.
- Manual (Andrew): pick three-act-screenplay on The Lonely Sister (Film) → guidance card shows beat placements against the real acts; click a scene link → drilldown; Reports → By act table. `npm run build` before he looks.
- Known pre-existing breakage (NOT this slice's): 3 Writing browser-suite failures + token-usage.test.ts on main.

## Plan self-review notes

- Beat→section mapping is deliberately the simplest defensible rule (Nth top-level boundary); anything smarter (label matching, beat anchoring UI) is future work — the spec's templates are checked against *positions*, and the guidance card is advisory.
- Task 4's endpoint reuses whatever link-extraction the server already has — the implementer must locate it first and report if server-side extraction genuinely doesn't exist (then the modal computes from the workspace's client-side `sceneLinks` + a per-section fetch of section content is NOT acceptable; escalate instead).
- Task interfaces (StructureTemplate/WorkStructure/Diagnostic) are the cross-task contract — Tasks 2/3 consume Task 1's exports verbatim.
