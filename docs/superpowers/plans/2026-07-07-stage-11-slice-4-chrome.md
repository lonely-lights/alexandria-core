# Stage 11 Slice 4 — Chrome Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permission/entitlement gating in the ribbon registry, bounded File/Edit/View additions to the writing ribbon, a full ribbon on Entries Show, and a File/Edit/View menu bar on Blueprints Show. Admin untouched.

**Architecture:** `RibbonControl` gains `requires?: { permission?: string; entitlement?: string }`; a resolver checks a per-surface `gates` object on the ribbon context (`{ can: Record<string, boolean>, entitlements: string[] }`). **Permission-locked controls don't render at all; entitlement-locked controls render disabled with a lock hint** (store discoverability) — that's the whole rule, no per-command judgment (spec). Entries gets a `<Ribbon>` with its own context/tabs mapping ONLY existing capabilities; Blueprints gets a lightweight menu bar. No new product capability is invented anywhere — menus expose what surfaces can already do.

**Tech Stack:** React 19 + TS (core), Vitest (app `resources/js/editor/tests/` + existing `ribbon/tests/`), Pest browser smokes (app), lang files.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-stage-11-writing-dashboard-followups-design.md` Slice 4. Deferred and OUT of scope: export (stub only, disabled "coming later"), mobile ribbon below `md:`, Alt KeyTips, per-page ribbon modes, full QAT customization UI, Admin adoption.
- Verified context (2026-07-07 scout): `ribbon/types.ts` RibbonControl (id/type/icon/labelKey/visible/disabled/active/onAction — NO requires yet); band render filters `control.visible?.(ctx)` at `Ribbon.tsx:348–350`; QAT filters likewise (`QuickActionBar.tsx:76–77`); writing tabs in `pages/Writing/ribbon/writingRibbonTabs.tsx` (File L45–77 incl. empty export group, Edit L79–246, View L248–321) with `writingRibbonContext.ts` carrying format/canUpdate/actions/editor-bridge; shared props: `auth.entitlements` (global, Stage 8d) + `auth.is_admin`; per-page `entry.can {update, delete}` and `blueprint.can {update, delete}`; Entries Show chrome = PageHeader actions + tab row + dropdown (`Show.tsx:270–350`); Blueprints Show = tab pills + ViewToggle + settings modal hook; core ribbon tests precedent: `resources/js/ribbon/tests/quick-actions.test.ts` (app-run Vitest).
- UI strings via lang files; Andrew's test style; pint on PHP; `npm run build` before any manual check; commit trailers:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n`
- Branch `feat/stage-11-slice-4` in both repos.

---

### Task 1: Registry `requires` gating (foundation)

**Files:**
- Modify: `alexandria-core/resources/js/ribbon/types.ts`, `ribbonRegistry.ts` (only if filtering helpers live there), `Ribbon.tsx` (band render), `QuickActionBar.tsx`
- Create: `alexandria-core/resources/js/ribbon/ribbonGates.ts`
- Test: extend `alexandria-core/resources/js/ribbon/tests/quick-actions.test.ts` conventions with a new `ribbon-gates.test.ts` beside it (these run under the app's Vitest — verify how the existing ribbon tests are executed and mirror it)

**Interfaces (produces — later tasks rely on these exact names):**

```ts
// types.ts additions
export interface RibbonRequires { permission?: string; entitlement?: string }
export interface RibbonGates { can: Record<string, boolean>; entitlements: string[] }
// RibbonControl gains: requires?: RibbonRequires
// The ribbon context type gains: gates?: RibbonGates

// ribbonGates.ts
export type GateVerdict = 'visible' | 'hidden' | 'locked';
export function resolveGate(requires: RibbonRequires | undefined, gates: RibbonGates | undefined): GateVerdict;
```

Rules: no `requires` → `visible`. `requires.permission` set and `gates.can[permission]` falsy → `hidden`. `requires.entitlement` set and not in `gates.entitlements` → `locked` (render disabled + lock icon overlay + title from `writing.ribbon.locked_hint` lang key — "Available in the store"). Permission check runs before entitlement. Missing `gates` object entirely → treat requires-bearing controls as `hidden` (fail closed).

Band render + QAT: `hidden` filtered out with the existing visible() filter; `locked` renders with `disabled` styling + `fa-lock` corner glyph (follow the ribbon's existing disabled affordance — find how `control.disabled?.(ctx)` renders and reuse). Writing ribbon: thread `gates` into its context (`can: { update: ctx.canUpdate }`-style mapping + `entitlements: usePage().props.auth.entitlements` at the Workspace mount) — its controls declare no `requires`, so nothing changes visually (assert that in a test: no requires → identical output).

Vitest: resolveGate truth table (none/permission-pass/permission-fail/entitlement-pass/entitlement-fail/both/missing-gates); a band-level test that a `requires`-hidden control is absent and a locked one is disabled.

Commit: core `feat(ribbon): permission/entitlement gating (requires + gates)`; app test commit.

---

### Task 2: Writing File/Edit/View bounded additions

**Files:**
- Modify: `alexandria-core/resources/js/pages/Writing/ribbon/writingRibbonTabs.tsx`, `writingRibbonContext.ts` (only to expose EXISTING workspace actions not yet threaded), `lang/en/writing.php`

**Behavior (bounded — expose existing capabilities only; verify each against the Workspace/bridge before wiring):**
- **File:** Work Settings (opens the existing settings modal — thread `openWorkSettings` if not already in actions), Rename section (existing rename modal, `hasSection` gated), New section / New child section (existing add modal paths), Export button = disabled stub labeled via `writing.ribbon.export_coming` in the reserved group.
- **Edit:** scene-link management commands ONLY IF the editor bridge already exposes them (edit display text / convert variant to canonical / remove link — these shipped in 8g.1's editor; check `WritingEditorBridge` capabilities). If the bridge lacks a command, DO NOT add editor capability — skip it and note in the report (menus expose what exists).
- **View:** panel toggles matching the ReferencePanel's real tab set (browse/scene-links/reports — check what `togglePanel` supports today) — add only toggles that don't already exist in the View tab.

Manual-verify list in the report (what was added vs skipped and why). Commit: `feat(writing): File/Edit/View ribbon additions (bounded)`.

---

### Task 3: Full ribbon on Entries Show

**Files:**
- Create: `alexandria-core/resources/js/pages/Entries/ribbon/entriesRibbonTabs.tsx` + `entriesRibbonContext.ts` (mirror the writing ribbon's file layout)
- Modify: `alexandria-core/resources/js/pages/Entries/Show.tsx` (mount `<Ribbon setKey="entries">` replacing the tab row + header action buttons; PageHeader breadcrumbs stay)
- Modify: `alexandria-core/lang/en/` (entries ribbon keys)
- Test: browser smoke `alexandria-app/tests/Browser/Entries/EntryRibbonGatingTest.php` — read-only viewer (entry.can.update false) sees navigation controls but NOT the edit/settings commands; an editor sees them (mirror sibling browser-suite harness conventions)

**Behavior — map EXISTING Show capabilities into tabs (nothing new):**
- **File tab:** Edit entry (existing edit route/action), Entry settings (existing settings modal trigger), Delete (existing, `requires: {permission: 'entry.delete'}`) — gates object: `{ can: { 'entry.update': entry.can.update, 'entry.delete': entry.can.delete }, entitlements: auth.entitlements }`.
- **View tab:** the tab-row navigation as ribbon controls (Overview/Structure/Attributes/Relationships/Mentions/Media/History/Timeline) — active-state reflects current tab; replaces the pinned-tabs + dropdown row. THIS is the core of the adoption: navigation is the guaranteed density; edit commands gate on top.
- **AI tab: ONLY if Show already has AI actions** (scout found none — verify once; if none exist, no AI tab; note it).
- Read-only users: View tab only (File's commands are permission-hidden — the ribbon must degrade to something sensible when a whole tab is empty: hide empty tabs; add that rule to the Task 1 foundation if not present — check and, if needed, implement "tab with zero visible controls doesn't render" in the registry filter with a test).
- Keep `settingsOpen`/hash-sync behavior identical; the ribbon dispatches the same handlers the buttons/tabs called.

Commit: `feat(entries): ribbon adoption on the entry page`.

---

### Task 4: Blueprints File/Edit/View menu bar

**Files:**
- Create: `alexandria-core/resources/js/components/chrome/DesktopMenuBar.tsx` (generic: `menus: [{labelKey, items: [{labelKey, icon?, onClick|href, requires?, disabled?}]}]` + the same RibbonGates resolution — reuse `resolveGate`)
- Modify: `alexandria-core/resources/js/pages/Blueprints/Show.tsx` (mount above the existing tab pills)
- Modify: lang files
- Test: Vitest for DesktopMenuBar gating render (hidden vs locked items) in the app vitest home

**Behavior — existing capabilities only:** File: Blueprint settings (existing modal hook), New entry (existing create path); Edit: Rename (settings modal focus — only if a direct path exists, else skip), Delete (`requires` blueprint.delete); View: the existing view toggles (tree/timeline/etc. via ViewToggle's state). Admin surfaces untouched.

Commit: `feat(blueprints): File/Edit/View menu bar`.

---

## Verification (slice level)

- Vitest: gates truth table + menu bar + no-regression writing ribbon; full run (token-usage failure pre-existing).
- Browser: EntryRibbonGatingTest both directions; existing writing browser suites still green (3 pre-existing failures known on main — no NEW ones).
- Pest full Feature/Unit; `npm run build`; manual: Andrew checks the Entries ribbon feel + Blueprints menu bar + locked-hint rendering (needs a store entitlement he lacks — or verify via a temporary requires on a test control in dev only, then remove).

## Plan self-review notes

- The "hide empty tabs" rule (Task 3) is foundation behavior discovered by decomposition — implement in Task 1 if trivial, else in Task 3 with the registry untouched; either way it needs a test.
- Entries ribbon replaces navigation chrome — the riskiest visual change of the slice; the browser smoke plus Andrew's manual pass are the gates. If Show's tab row has behaviors the ribbon can't reproduce cleanly (hash sync, dropdown overflow), the implementer reports DONE_WITH_CONCERNS rather than degrading them.
- Bridge-absent scene-link commands are skipped, not built — Task 2's report must list the verdict per command.
