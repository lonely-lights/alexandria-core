# FDX Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** File-menu export of any work to `.fdx` (mapper registry + always-works fallback, options dialog) and import of `.fdx` into a new Work whose scenes open faithfully in the screenplay editor.

**Architecture:** App-side PHP services (`ScreenplayText` codec port with shared-fixture parity, `FdxExporter` with a format-mapper registry, tolerant `FdxImporter`), two app routes, core File-menu wiring + `ExportFdxModal`. No migrations, no new dependencies (PHP `DOMDocument`).

**Tech Stack:** Laravel 13 + Pest 4 (app), React 19 + TS (core), shared JSON fixtures consumed by both Pest and Vitest.

**Spec:** `alexandria-core/docs/superpowers/specs/2026-08-29-fdx-gateway-design.md` (RATIFIED — binding).

## Global Constraints

- Branches `feat/fdx-gateway` in both repos (cut). Tests/builds run from `alexandria-app`.
- **`C:\Users\AndrewKHartley\OneDrive - Lonely Lights Ltd\04 - Scripts` is READ-ONLY reference material** — inspect real FDX schema there (esp. ScriptNote shape); never write to it, never commit copies of full scripts. Small hand-made fixture files only.
- **Codec parity is sacred:** the PHP `ScreenplayText` must match core's TS codec (`alexandria-core/resources/js/editor/screenplay/codec.ts` — read it line by line first) byte-for-byte on serialize, and block-equal on parse, proven via ONE shared fixture JSON consumed by both test stacks. Fixture location: `alexandria-app/resources/js/editor/tests/fixtures/screenplay-codec-parity.json`, shape: `[{"name": str, "text": str, "blocks": [{"element": str, "text": str, ...}]}]`.
- Routing/authz conventions as established: literal segments before `{section?}` wildcard; middleware-only authorization; fetch-consumed endpoints return JSON never `back()`; `@throws` documented; typed collection reads; final readonly controllers with no base class.
- UI strings via `writing.fdx.*` keys in core `lang/en/writing.php`; File-menu + modal idioms copied from existing fileTab entries and desk modals (read `writingRibbonTabs.tsx` fileTab + an existing modal component before writing UI).
- Pint before PHP commits; `npx tsc --noEmit` + `npm run build` clean before core commits; Pest style brace-free interpolation + chained `->and()`.
- FDX emission shape (verify against a real file read-only before finalizing):
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <Paragraph Type="Scene Heading"><Text>INT. PLACE - DAY</Text></Paragraph>
    <Paragraph Type="Action"><Text>…</Text></Paragraph>
    <Paragraph Type="Character"><Text>NAME</Text></Paragraph>
    <Paragraph Type="Parenthetical"><Text>(beat)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>…</Text></Paragraph>
    <Paragraph Type="Transition"><Text>CUT TO:</Text></Paragraph>
  </Content>
</FinalDraft>
```
- Import tolerance: concatenate multiple `<Text>` runs per Paragraph; skip `TitlePage`, `Settings`, `SmartType`, `ElementSettings`, unknown elements; unknown Paragraph Types import as Action.

## File Map

| File | Role |
|---|---|
| app `app/Services/Writing/Fdx/ScreenplayText.php` | PHP codec port (parse/serialize) |
| app `app/Services/Writing/Fdx/FdxExporter.php` | tree walk + mapper registry + options |
| app `app/Services/Writing/Fdx/FdxImporter.php` | tolerant parse → new Work + sections |
| app `app/Http/Controllers/Writing/WorkFdxController.php` | export GET + import POST |
| app `routes/web.php` | 2 routes |
| app `resources/js/editor/tests/fixtures/screenplay-codec-parity.json` | shared parity fixtures |
| app `tests/Feature/Writing/Fdx/*.php` | ScreenplayTextTest, FdxExporterTest, FdxImporterTest, FdxHttpTest (incl. round-trip) |
| app `resources/js/editor/tests/screenplay-codec-parity.test.ts` | Vitest side of parity |
| app `tests/Browser/Writing/FdxImportTest.php` | smoke |
| core `resources/js/pages/Writing/Fdx/ExportFdxModal.tsx` | options dialog |
| core `resources/js/pages/Writing/Fdx/importFdx.ts` | file-pick + POST + navigate helper |
| core `resources/js/pages/Writing/ribbon/writingRibbonTabs.tsx` | 2 File-menu items |
| core `lang/en/writing.php` | `fdx.*` keys |

Read before coding: core `resources/js/editor/screenplay/codec.ts` + `types.ts` + `formatSpec.ts`; `WorkOutlineController.php` (controller idioms); `SectionTreeService.php`; one real `.fdx` from 04-Scripts (read-only) for schema confirmation.

---

### Task 1: ScreenplayText codec port + shared parity fixtures

**Files:** create the PHP service + the fixture JSON + `tests/Feature/Writing/Fdx/ScreenplayTextTest.php` + `resources/js/editor/tests/screenplay-codec-parity.test.ts`.

**Interfaces (produces):** `ScreenplayText::parse(string $text): array` → `list<array{element: string, text: string, ...}>` matching the TS codec's block shapes exactly (read `types.ts` for extra fields, e.g. dual-dialogue or centered flags if present — mirror precisely what exists, nothing more). `ScreenplayText::serialize(array $blocks): string` byte-identical to TS `serializeScreenplay`.

- [ ] **Step 1:** Read the TS codec end-to-end. Hand-write ~12 fixture cases into the shared JSON covering: bare slugline auto-detect, forced `.` slugline, `>` transition, forced action escape, character + parenthetical + dialogue run, parens stripping, blank-line handling, round-trip-hostile strings (leading dots, uppercase action lines), empty text.
- [ ] **Step 2:** Vitest first: `screenplay-codec-parity.test.ts` loads the JSON, asserts `parse(text) deep-equals blocks` and `serialize(blocks) === text` using the REAL TS codec. Run `npm run test:run -- codec-parity`; fix FIXTURES (not the codec) until green — the TS codec is the source of truth.
- [ ] **Step 3:** Pest: same assertions through the PHP port (write the failing test, then implement `ScreenplayText` until `php artisan test --compact --filter=ScreenplayText` is green).
- [ ] **Step 4:** Commit app: `feat(fdx): PHP screenplay codec port with cross-stack parity fixtures`.

### Task 2: FdxExporter + mapper registry

**Files:** `FdxExporter.php` + `tests/Feature/Writing/Fdx/FdxExporterTest.php`.

**Interfaces (produces):** `FdxExporter::export(Work $work, array $options): string` (the XML). Options: `['synopses' => bool, 'beats' => bool, 'markers' => bool]` defaults `[false, false, true]`. Mapper registry internal: `screenplay` mapper (blocks → FDX Paragraph Types: slugline→Scene Heading, action→Action, character→Character, parenthetical→Parenthetical (re-wrapped in parens), dialogue→Dialogue, transition→Transition) and default fallback (section title → Scene Heading, content split on blank lines → Action paragraphs). Container sections (with children) are never scenes: with `markers` on they emit one Action paragraph `[[ACT: <title>]]` / `[[CHAPTER: <title>]]` (label uppercased); off, they're silent. Synopses/beats: FIRST verify ScriptNote schema against a real 04-Scripts file (read-only); if unambiguous, emit real ScriptNotes; else bracketed Action paragraphs `[[SYNOPSIS: …]]` / `[[BEAT(✓): …]]` — record which path you took in the report.

- [ ] Steps: failing tests (screenplay-native mapping via a seeded work + `ScreenplayText::serialize`d content; prose fallback; options matrix; XML well-formedness via `DOMDocument::loadXML`), implement, green, pint, commit `feat(fdx): exporter with format mappers + options`.

### Task 3: FdxImporter + round-trip

**Files:** `FdxImporter.php` + `tests/Feature/Writing/Fdx/FdxImporterTest.php` (+ small hand-made fixture `.fdx` strings inline or under `tests/Fixtures/fdx/`).

**Interfaces (produces):** `FdxImporter::import(Project $project, User $user, string $xml, string $filename): Work` — throws `InvalidArgumentException` on non-XML or non-FinalDraft root (controller maps to 422). Grouping per spec; content via `ScreenplayText::serialize`; work title = filename sans `.fdx`, slug-uniquified; sections positioned in order; front-matter section titled per lang-neutral constant 'Front matter'.

- [ ] Steps: failing tests (grouping, front matter, multi-`<Text>` concatenation, unknown-element tolerance, unknown Paragraph Type → action, malformed throws), implement, green. Then the ROUND-TRIP test in `FdxHttpTest` or here: seed a mixed work (screenplay scenes + a prose scene + an act container) → `FdxExporter::export` → `FdxImporter::import` → assert scene titles/order and screenplay content byte-identical, prose content present as action text. Commit `feat(fdx): importer + export/import round-trip`.

### Task 4: Routes + WorkFdxController

**Files:** `WorkFdxController.php`, `routes/web.php`, `tests/Feature/Writing/Fdx/FdxHttpTest.php`.

- [ ] Export route in the works group (literal, before `{section?}`): validates the three query flags (`sometimes|boolean`), streams with attachment headers; test asserts headers + body parses as FinalDraft XML + authz (view). Import route `POST /works-import/fdx` at the same group level as work creation (find how works.store authorizes creation and mirror it): validates `file` (`required|file|max:10240` + XML/FinalDraft root check in the service), returns `{workUrl: route('works.show', …)}` JSON; tests: happy path (work created, JSON URL), 422 malformed, 422 oversize, authz. Same-work guard idioms as sibling controllers. Pint; commit `feat(fdx): export/import HTTP endpoints`.

### Task 5: File-menu wiring + ExportFdxModal (core)

**Files:** core `Fdx/ExportFdxModal.tsx`, `Fdx/importFdx.ts`, `writingRibbonTabs.tsx` (fileTab: two `type:'action'` items — read existing fileTab entries for the exact control shape), `lang/en/writing.php`; app test updates (`writing-ribbon-tabs.test.ts` fixture lists).

- [ ] Modal: three labeled toggles with the spec defaults + Export button building `worksBase(project, work)/export/fdx?synopses=0&beats=0&markers=1` and navigating via `window.location.assign` (browser download); Cancel closes. `importFdx.ts`: hidden `<input type=file accept=".fdx">` flow → fetch POST (local apiHeaders WITHOUT Content-Type — multipart boundary lesson is repo doctrine) → on ok `router.visit(workUrl)`; errors surface via the desk's existing toast/alert idiom (find it; if none, inline modal error line). Thread modal open-state through Workspace like existing modals. Strings: `fdx.export_title`, `fdx.include_synopses`, `fdx.include_beats`, `fdx.include_markers`, `fdx.export_action`, `fdx.import_action`, `fdx.import_failed`. Verify: full vitest, tsc, build. Commit core + app tests.

### Task 6: Browser smoke + full verification + docs

- [ ] Smoke `tests/Browser/Writing/FdxImportTest.php` (copy OutlineModeTest idioms): visit a work → File menu → Import from Final Draft → attach a small fixture .fdx (Playwright setInputFiles on the hidden input — if the avatar-test localPaths environment error recurs, fall back to a feature-level test of the POST and mark the browser path skipped WITH the reason) → assert navigation to the new work + scene titles in Navigator.
- [ ] Full: `php artisan test --compact --filter=Fdx` then `--filter=Writing`, `npm run test:run`, `npx tsc --noEmit`, pint, `npm run build`.
- [ ] Roadmap: Stage 11 list gains `- ✅ **Final Draft gateway (.fdx)** shipped 2026-08-29: File-menu export (format mappers + always-works fallback, options dialog) and import-to-new-work with cross-stack codec parity. Spec: alexandria-core docs/superpowers/specs/2026-08-29-fdx-gateway-design.md.` Commit docs + test.

## Self-review notes (applied)

- Spec coverage: codec/parity→T1, exporter/options/mappers→T2, importer/round-trip→T3, HTTP→T4, menu/modal→T5, smoke/docs→T6; out-of-scope respected.
- Parity fixtures are single-sourced (one JSON, two consumers) — the drift-prevention core.
- ScriptNote schema is verify-then-choose with a stable fallback, mirroring the spec's contract.
- Known environmental risk pre-flagged: Playwright file-upload localPaths error (seen in AvatarBannerRingTest) — T6 carries the sanctioned fallback.
