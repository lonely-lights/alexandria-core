# Final Draft Gateway (.fdx Export/Import) — Design

**Status:** RATIFIED 2026-08-29 (owner: "This is good… the perfect gateway"). Owner rulings: File > Import = NEW work always (inline/append import later); export eventually any work via per-format mappers with an always-works fallback; export options dialog with clean-script defaults.
**Repos:** `alexandria-app` (services, controller, routes, tests), `alexandria-core` (File-menu wiring, options modal, lang).
**Branch:** `feat/fdx-gateway` (both repos).

## Goal

A gateway between the writing desk and Final Draft: File > Export to Final Draft… streams the current work as `.fdx`; File > Import from Final Draft… uploads an `.fdx` and creates a new Work whose scenes open pixel-faithful in the screenplay editor. The owner's real scripts (`C:\Users\AndrewKHartley\OneDrive - Lonely Lights Ltd\04 - Scripts`) serve as READ-ONLY schema references during the build — never modified, never imported automatically.

## Architecture

Server-side mirror services in the app (FDX is XML; PHP `DOMDocument`, no new dependencies):

- **`App\Services\Writing\Fdx\ScreenplayText`** — a faithful PHP port of core's TS screenplay codec (`resources/js/editor/screenplay/codec.ts`): `parse(string): array` of typed blocks (`slugline|action|character|parenthetical|dialogue|transition`) and `serialize(array): string`, byte-identical to the TS codec's stored form (force-marker escapes, parens stripping, round-trip stability). **Parity is enforced by shared fixtures**: one JSON file of `{blocks, text}` pairs asserted by BOTH Vitest (TS codec) and Pest (PHP codec), so the two implementations cannot drift silently.
- **`App\Services\Writing\Fdx\FdxExporter`** — walks the work's section tree depth-first; each leaf section is rendered by a **format mapper** chosen from a registry keyed by the section's effective format: `screenplay` → native FDX paragraphs via `ScreenplayText::parse`; anything else → **fallback mapper** (section title as a Scene Heading + content lines as Action paragraphs). The fallback is the "always works" guarantee; future formats register richer mappers. Options: `include_synopses` (default false), `include_beats` (default false), `include_markers` (default true — act/chapter containers emitted as clearly-marked non-scene paragraphs). Synopses/beats emit as FD ScriptNotes IF the real-file schema check (below) confirms the shape; otherwise as clearly-bracketed Action paragraphs (`[[SYNOPSIS: …]]` / `[[BEAT: …]]`) — the options contract is stable either way.
- **`App\Services\Writing\Fdx\FdxImporter`** — parses uploaded FDX tolerantly (concatenate multi-`<Text>` runs; ignore TitlePage/Settings/SmartType/unknown elements): paragraphs group by `Scene Heading` into Scene sections (title = heading text, content = blocks serialized via `ScreenplayText::serialize`); paragraphs before the first heading become a "Front matter" section; creates a NEW Work (type `film`, format `screenplay`, title from the filename sans extension, uniquified if colliding) owned by the acting user's project.

## HTTP (app routes, works group conventions)

- `GET /{work:slug}/export/fdx?synopses=0&beats=0&markers=1` → `works.export.fdx`, `can:view,work` — streams `Content-Type: application/xml` with `Content-Disposition: attachment; filename="<work-slug>.fdx"`. Literal segment: registers before the `{section?}` wildcard.
- `POST /works-import/fdx` (project-scoped but not work-scoped — it CREATES the work; route name `works.import.fdx`, `can:create,work`-equivalent policy via the project) — multipart `file` (max 10 MB, must parse as XML with a `FinalDraft` root; friendly 422 otherwise). Returns JSON `{ workUrl }`; the client navigates there. Fetch-consumed → JSON, never `back()`.

## Frontend (core)

- **File menu** (`writingRibbonTabs.tsx` fileTab): "Export to Final Draft…" opens `ExportFdxModal` (three toggles per the options above; Export button navigates to the GET URL — browser handles the download); "Import from Final Draft…" opens a file picker (hidden input), POSTs via fetch, on success `router.visit(workUrl)`. Both gated on the writing surface only (chrome doctrine). All strings via `writing.fdx.*` lang keys.
- No new views; the modal follows the desk's existing modal idioms.

## Testing

- **Codec parity:** shared fixture JSON asserted by new Pest + extended Vitest suites (both must consume the SAME file from `alexandria-app/resources/js/editor/tests/fixtures/`).
- **Pest:** exporter shape (screenplay native, prose fallback, options on/off, marker emission), importer structure (grouping, front matter, filename titling, multi-Text tolerance, malformed-XML 422, size cap), **round-trip** (export a seeded work → import the output → equivalent section tree + content), HTTP contract tests for both routes incl. authorization.
- **Browser smoke:** import a small fixture through the File menu → land on the new work with its scenes in the Navigator. (Export verified at the HTTP layer; browser download assertions are not attempted.)

## Out of scope (deliberate)

Inline/append import (owner: later) · exporting notes/comments · TitlePage generation beyond title · revision-mode/colored-pages FDX features · character/scene SmartType lists (FD regenerates) · `.fdr`/binary formats · importing into existing works.
