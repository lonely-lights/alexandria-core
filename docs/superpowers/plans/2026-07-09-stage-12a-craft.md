# Stage 12a — Alexandria Craft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The `lonely-lights/alexandria-craft` package (skeleton + analyzer contract + Adverb Review), a package-registerable sidebar-mode seam in core, and entitlement-gated surfacing in the writing workspace.

**Architecture:** Per the spec `docs/superpowers/specs/2026-07-09-stage-12a-alexandria-craft-design.md` — READ IT FIRST every task; its contract shapes and gating rules are binding.

**Tech Stack:** PHP 8.4 Composer package (Testbench), TypeScript analyzers + React panel, Vite alias consumption, Vitest (app-run), Pest browser smoke.

## Global Constraints

- UTF-8 no BOM; never write files via PowerShell; NEVER run migrate:fresh/refresh in any form (tests use sqlite :memory: automatically).
- Follow the sibling-package precedent: study `packages/prosetta` (composer.json shape, service provider, how legacy consumes it) and how the APP consumes CORE (composer.json path repo entry, vite.config alias, tsconfig paths, app.tsx boot imports) — mirror ALL of it for craft.
- Lang: craft package ships `craft::` namespaced translations (`loadTranslationsFrom`) — BUT the app's shared t() bag only ships app/core groups; check how core groups reach `HandleInertiaRequests::resolveSharedTranslations` and wire the craft group the same way (app-side config/registration — find the mechanism before assuming). If the bag is app-hardcoded, add the craft group there (app repo change, noted).
- Andrew's test style; pint on PHP; `npm run build` after frontend changes; commit trailers:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n`
- Branches: NEW repo `packages/craft` works on `main` (fresh repo); core + app on `feat/stage-12a-craft`.

---

### Task 1: Package skeleton + app wiring

**Files:** new repo `C:\Websites\alexandria\packages\craft`: `composer.json` (name lonely-lights/alexandria-craft, PHP ^8.4, illuminate/support ^13 per core's constraints, autoload Alexandria\Craft\, extra.laravel provider), `src/CraftServiceProvider.php` (config merge + translations `craft`), `config/craft.php` (analyzer toggles placeholder), `resources/js/index.ts` (empty barrel for now), `resources/lang/en/craft.php` (or `lang/` — mirror core's location convention), `tests/` Testbench boot test (provider registers, config loads), `testbench.yaml`/phpunit per core's package setup, README.md (one page: what it is, how the app consumes it), `.gitignore`. Init git, first commit on main.
**App wiring (feat/stage-12a-craft):** composer.json path repo `../packages/craft` + require `lonely-lights/alexandria-craft:@dev`; `composer update lonely-lights/alexandria-craft`; vite.config + tsconfig alias `@craft` → the path-repo resources/js (match how @alexandria resolves — path repo symlink or relative path, copy the mechanism); verify `php artisan about` boots with the provider.
**Tests:** package Testbench green; app boots (run any 1 fast app feature test as a smoke).
Commits: craft `feat: package skeleton (provider, config, translations, testbench)`; app `feat(craft): consume alexandria-craft via path repo + @craft alias`.

---

### Task 2: Core sidebar-mode registry + locked switcher

**Files (core):** create `resources/js/pages/Writing/sidebarModeRegistry.ts` (spec shapes verbatim; mirror writingPanelRegistry mechanics incl. subscribe); modify `PanelModeSwitcher.tsx` (render registered modes after built-ins; resolveGate + useEntitlements → entitlement-fail = disabled + fa-lock + locked-hint title, permission-fail = hidden), `panelMode.ts` (normalize accepts registered ids; unknown/locked → 'linked'), `Workspace.tsx` (render selected registered mode's component with SidebarModeContext), `docs/EXTENDING.md` (+1 extension point section), lang key reuse (locked hint exists).
**Tests (app repo):** Vitest — registry register/get/subscribe; normalize with registered ids; locked-id read-fallback; switcher gating pure-logic if extracted (mirror panelMode.test.ts conventions).
Commit: core `feat(writing): package-registerable sidebar modes with entitlement gating`.

---

### Task 3: Analyzer contract + Adverb Review (craft package TS)

**Files (craft):** `resources/js/contract.ts` (CraftFinding/CraftAnalyzer verbatim from spec), `resources/js/analyzers/adverbReview.ts` (spec rules: -ly flagging, allowlist incl. the spec's list + <4 chars guard, case-insensitive, offset-accurate findings, exported density helper `findingsPerThousandWords(findings, wordCount)`), `resources/js/analyzers/index.ts` barrel + `getAnalyzers(): CraftAnalyzer[]`.
**Tests (app repo, `resources/js/editor/tests/craftAdverbReview.test.ts` — @craft alias import):** table-driven — flags 'quickly/slowly'; allowlist words untouched (family, only, friendly…); case-insensitive; punctuation-adjacent ('quickly,' 'quickly."'); offsets slice back to the excerpt exactly; empty text → []; density math; multi-paragraph offsets.
Commits: craft `feat: analyzer contract + adverb review analyzer`; app `test(craft): adverb analyzer coverage`.

---

### Task 4: Craft panel + registration + gating smoke

**Files:** craft `resources/js/CraftPanel.tsx` (spec behavior: header word-count/density/re-check, per-analyzer collapsible groups, finding rows, row click → `editorBridge.findTextInDoc(excerpt)` nearest `from` → scroll — copy the comment-jump pattern; live text via bridge when present else section content; empty/no-section states; ALL strings via craft:: lang keys) + `resources/js/register.ts` (calls core's `registerSidebarModes` with `{id:'craft', requires:{entitlement:'craft_suite'}}`); app boot import (where core boot imports happen in app.tsx/app entry — register craft) + the craft lang group into the shared t() bag (per Task 1 finding); lang `craft.php` keys.
**Tests:** browser smoke `alexandria-app/tests/Browser/Writing/CraftPanelTest.php` — (1) user WITHOUT craft_suite: Craft button present + disabled + lock glyph; (2) WITH entitlement (check how store tests grant entitlements — `product_entitlements`/EntitlementService fixtures exist in tests/Feature/Store; reuse the factory path): Craft opens, fixture section containing 'She ran quickly and spoke softly.' shows 2 adverb findings. Mirror the writing browser helpers (bare-expression script(), case-insensitive text checks).
Commits: craft `feat: craft panel + sidebar mode registration`; app `feat(craft): boot registration + gating smoke`.

---

## Verification (stage level)

Full vitest + app pest (non-browser) + core pest + craft testbench + writing browser suites + new smoke + `npm run build`. Manual (Andrew): grant himself craft_suite — tinker one-liner will be provided at the gate — then feel the panel on a real section; also view as a viewer-role user for the padlock. Roadmap + memory close-out after his pass.

## Plan self-review notes

- The craft lang-group-into-shared-bag step is the S3 raw-key lesson pre-applied — Task 1 must REPORT the mechanism found, Task 4 wires it, the smoke asserts a real translated string renders.
- The mode registry's locked read-fallback (persisted 'craft' + entitlement revoked → 'linked') needs an explicit Vitest case.
- Repo is private; `gh repo create lonely-lights/alexandria-craft --private` at Task 1 if gh is authenticated — else local-only and note it.
