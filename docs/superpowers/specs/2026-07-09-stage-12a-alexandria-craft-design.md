# Stage 12a — Alexandria Craft (Design)

**Approved:** 2026-07-09 (Andrew). **Decisions:** analyzers run CLIENT-SIDE (browser) with a transport-agnostic findings shape so server/AI analyzers can feed the same panel later; Craft surfaces as a FOURTH SIDEBAR MODE via a new package-registerable mode seam; availability is entitlement-gated (`craft_suite`) so craft ships with paid packages — locked users see the padlocked mode button (store discoverability), the Stage 11 locked treatment's first live consumer.

## Package

New sibling repo `C:\Websites\alexandria\packages\craft` → `lonely-lights/alexandria-craft` (PRIVATE — it gates paid features). Namespace `Alexandria\Craft\`. Composer package like core: thin PHP (`CraftServiceProvider` — config + translations `craft::` group), Orchestra Testbench for PHP tests. Frontend substance in `resources/js/` (TypeScript). The app consumes it exactly like core: Composer path repo (`../packages/craft`) + Vite/tsconfig alias `@craft` → the package's `resources/js`.

## Core seam — sidebar mode registry

`resources/js/pages/Writing/sidebarModeRegistry.ts` (core): `registerSidebarModes([{ id, labelKey, icon, component: ComponentType<SidebarModeContext>, requires?: RibbonRequires }])` + `getSidebarModes()` + `subscribeSidebarModes()` — same module-state mechanics as `writingPanelRegistry`. `SidebarModeContext` = `{ project, work, currentSection, editorBridge, editorTick, canUpdate }` (what CommentRail needed; registered modes get the same power).

- `PanelModeSwitcher` renders built-ins (linked/notes/comments) + registered modes; a registered mode with `requires.entitlement` missing from `useEntitlements()` renders DISABLED + `fa-lock` + the locked-hint title (reuse `resolveGate`; permission-fail hides, entitlement-fail locks — identical rules to the ribbon).
- `panelMode.ts` `normalizePanelMode` accepts registered mode ids (falls back `linked` for unknown/locked ids at read time so a persisted mode never strands a downgraded user).
- Workspace renders the registered mode's component in the aside when selected.
- Document the seam in core `docs/EXTENDING.md` (seventh extension point).

## Analyzer contract (TS, in the craft package)

```ts
export interface CraftFinding {
    analyzerId: string;
    from: number;        // char offset into the analyzed text
    to: number;
    excerpt: string;     // the flagged text
    labelKey: string;    // finding label lang key (craft:: group)
    severity: 'info' | 'notice' | 'warn';
    suggestionKey?: string;
}
export interface CraftAnalyzer {
    id: string;
    labelKey: string;
    descriptionKey: string;
    analyze(text: string): CraftFinding[];
}
```

Transport-agnostic: nothing in `CraftFinding` assumes client execution — a server/AI analyzer can return the same shape later.

## First analyzer — Adverb Review (`adverb-review`)

Deterministic: tokenize on word boundaries; flag `-ly` adverbs; exception allowlist (family, only, early, likely, supply, apply, reply, belly, jelly, rally, ally, bully, folly, holy, ugly, silly, hilly, chilly, friendly, lonely, lovely, elderly, orderly, daily, weekly, monthly, yearly, italy…and words <4 chars); per-instance findings (severity `notice`) + surface a density stat in the panel header (findings per 1,000 words). Case-insensitive, dialogue included, wiki markup stripped before analysis (analyze plain text — the panel feeds it section plain text).

## Craft panel (craft package component)

Registered as the `craft` mode: header (analyzer count + word count + refresh button), per-analyzer collapsible groups with counts, finding rows (excerpt + label + context snippet), row click → locate in the editor (bridge `findTextInDoc(excerpt)` nearest `from`, then scroll — the comment-jump machinery pattern; if not found, no-op). Analyzes the CURRENT section's plain text via the editor bridge when available (live text), else the saved content prop; auto-runs on section switch + manual re-check. Empty/no-section/locked states.

## Entitlement

- Mode registered with `requires: { entitlement: 'craft_suite' }` (key already in `config/entitlements.php` from 8d).
- Client-side gating only in v1 (the analysis runs over text the user already possesses — the lock is product packaging, not a security boundary; noted deliberately).
- Andrew local unlock: grant via the admin store (product entitlement) or seed one directly; document the tinker one-liner in the plan's verification.

## Tests

- Vitest (app-run): adverb analyzer table (flags basic -ly, respects allowlist, case, punctuation-adjacent, offsets correct, density math); sidebar mode registry (register/get/subscribe, normalize accepts registered ids, locked fallback); panel model helpers if extracted.
- Pest (package, Testbench): service provider boots, config/translations registered.
- Browser smoke (app): user WITHOUT craft_suite sees the padlocked Craft button (disabled); with the entitlement granted, Craft mode opens and adverb findings render for a fixture section.

## Out of scope (later in Stage 12a or beyond)

Passive-voice/weak-verb/cliché/scansion analyzers (scoped after adverb ships); inline editor highlighting of findings (panel-only v1); server/AI analyzers; Packagist/publishing (Stage 16).
