# Ribbon Plan 2 — Workspace Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The writing workspace becomes the ribbon's first consumer: the four `'writing'` tabs go live, both editors turn headless (commands driven from the ribbon through an editor bridge), and the old scattered controls disappear — no duplicates.

**Architecture:** Spec §3. The Workspace builds a `WritingRibbonContext` (state + actions + an editor bridge both editors implement) and mounts `<Ribbon setKey="writing">` full-width above the three panes. Controls' active/value states track the editor via a state *tick* (editors signal selection/content changes → Workspace bumps a counter in ctx → ribbon re-renders; the shortcut binder is already ref-based so no listener churn).

**Tech Stack:** Existing framework from Plan 1 (`@alexandria/ribbon/*`, 20 Vitest tests green). Branches `feat/ribbon-transitions`, both repos. Verification from `C:\Websites\alexandria\alexandria-app`. Controller commits.

---

## Pre-locked design decisions (flagged at check-in)

1. **Ribbon placement:** full workspace width, directly under the navbar, ABOVE the three panes. Tab row carries a `leading` slot (back-link breadcrumb: project name → work title) and a NEW `trailing` slot (status chip + work progress bar + counts move here from the old header strip — the strip itself disappears). `trailing?: ReactNode` is a small Plan-2 framework addition to `Ribbon.tsx` (mirrors `leading`).
2. **Editor-state tick:** editors call `onStateChange()` (debounced ~100ms internally via TipTap's `selectionUpdate`/`transaction` events); Workspace increments `editorTick` state included in the ctx object → ribbon re-renders → `active/value/disabled` predicates re-read the bridge. Shortcut binder unaffected (ref-based, `[tabs]` deps).
3. **Print-layout state lifts** from the editors to the Workspace (same localStorage key via the exported helpers) so the ribbon View-group toggle owns it; editors receive `printLayout` as a prop (ManuscriptEditor already supports the prop path internally; remove both editors' own toggle buttons).
4. **Navigator keeps its hover affordances** (add-inside/delete/drag are spatial actions); the ribbon's Structure tab adds work-level equivalents (add root section, add inside current, delete current). Complementary, not duplicate chrome.
5. **Help modals stay owned by their editors** (formatting legend in RichTextEditor, screenplay keys in ScreenplayEditor), opened through ctx actions from ribbon `?` controls — modals are content, the ribbon is control.
6. **Code view** (wiki source toggle) becomes a View-group toggle (prose only).

## File Structure

```
alexandria-core/resources/js/
├── ribbon/Ribbon.tsx                                  # MODIFY: + trailing slot
├── pages/Writing/ribbon/
│   ├── writingRibbonContext.ts                        # CREATE: WritingRibbonContext + WritingEditorBridge types
│   └── writingRibbonTabs.tsx                          # CREATE: the four tabs as data + registerWritingRibbon()
├── pages/Writing/Workspace.tsx                        # MODIFY: mount Ribbon, build ctx, shed header strip
├── pages/Writing/Sections/SectionChrome.tsx           # MODIFY: menu bar → identity strip (title/label/status only)
├── pages/Writing/Sections/ManuscriptEditor.tsx        # MODIFY: headless editor, bridge, lifted printLayout
├── pages/Writing/Sections/ScreenplayEditor.tsx        # MODIFY: drop toolbar, bridge, lifted printLayout
├── components/editor/RichTextEditor.tsx               # MODIFY: chrome: 'none' for manuscript variant + bridge handle
└── lang/en/writing.php                                # MODIFY: ribbon control labels (flat ribbon_*. keys)
alexandria-app/
├── resources/js/ribbon/tests/writing-ribbon-tabs.test.ts   # CREATE: visibility/action wiring (pure)
└── tests/Browser/Writing/WritingSurfacesTest.php            # MODIFY: ribbon-driven smokes
```

---

### Task 1 (core): `trailing` slot + writing ribbon definitions (TDD where pure)

**Files:** `ribbon/Ribbon.tsx` (+`trailing?: ReactNode` rendered after the tabs with `margin-left:auto` container — reuse `.ribbon-right` class inside the TAB row, new class `.ribbon-tabs-trailing`), `pages/Writing/ribbon/writingRibbonContext.ts`, `pages/Writing/ribbon/writingRibbonTabs.tsx`, lang additions, app Vitest.

**`writingRibbonContext.ts`:**

```ts
import type { CurrentSection } from '../Workspace';

/** Commands both editors expose to the ribbon (via ref). All methods
 *  must be safe to call when unsupported — no-op + reflect via the
 *  capability queries so controls disable instead of breaking. */
export interface WritingEditorBridge {
    /** prose marks: bold | italic | underline; lists: bulletList | orderedList; headings via setHeading */
    toggleMark(name: 'bold' | 'italic' | 'underline'): void;
    toggleList(name: 'bulletList' | 'orderedList'): void;
    toggleHeading(level: 2 | 3): void;
    isMarkActive(name: string): boolean;
    /** screenplay elements */
    setElement(element: string): void;
    currentElement(): string | null;
    /** shared */
    insertEntryLink(): void;
    openHelp(): void;
    toggleCodeView(): void;
    isCodeView(): boolean;
    focus(): void;
}

export interface WritingRibbonContext {
    format: 'prose' | 'screenplay';
    canUpdate: boolean;
    panelOpen: boolean;
    printLayout: boolean;
    hasSection: boolean;
    /** bumped on editor selection/content changes so active/value states re-render */
    editorTick: number;
    editor: WritingEditorBridge | null;
    actions: {
        togglePanel(): void;
        togglePrintLayout(): void;
        openSettings(): void;
        openReports(): void;
        addSection(): void;       // root-level (opens the existing AddSectionModal)
        addInside(): void;        // child of current section (disabled when none)
        deleteSection(): void;    // current section (confirm modal; disabled when none)
        setStatus(value: string): void; // work status select
        goToIndex(): void;        // project works index
        goToDashboard(): void;    // global /writing
    };
    workStatus: string;
}
```

**`writingRibbonTabs.tsx`** — `registerWritingRibbon()` (idempotent — guard a module flag) calling `registerRibbonTabs('writing', WRITING_TABS)`; called from `Workspace.tsx` module scope. The four tabs, per the approved mockup + spec §3 (Write/Structure/Review/Work). Representative controls (implementer writes ALL of these; full list):

- **Write tab** — group `text` (visible prose+canUpdate): bold (`Mod-B` NO — editor already binds Mod-B internally via TipTap; ribbon declares NO shortcut where the editor already handles it, only `active` via bridge) → controls: bold/italic/underline (toggles, `active: ctx.editor?.isMarkActive(...)`), bulletList/orderedList toggles, h2/h3 toggles; group `element` (visible screenplay+canUpdate): element select (`options` from ELEMENTS labeled `writing.elements.*`, `value: ctx.editor?.currentElement() ?? 'action'`, `onAction: (ctx, v) => ctx.editor?.setElement(v)`), keys-help button (`onAction: ctx.editor?.openHelp()`); group `world` (canUpdate): insert entry link button (disabled for screenplay when current element ≠ action — `disabled: ctx => ctx.format === 'screenplay' && ctx.editor?.currentElement() !== 'action'`); group `view`: print-layout toggle (`active: ctx.printLayout`, shortcut `Mod-Shift-L`), panel toggle (`active: ctx.panelOpen`, shortcut `Mod-Shift-P`... CHECK browser-reserved list — Mod-Shift-P is Firefox private window; use `Mod-Shift-O` for panel), code-view toggle (visible prose, `active: isCodeView`), editor help button (visible prose, `openHelp`).
- **Structure tab** — group `sections` (canUpdate): add section button, add inside (disabled `!hasSection`), delete section (disabled `!hasSection`); group `plan`: open settings-to-plan button (label `writing.ribbon.targets`, action `openSettings`); group `guidance`: RESERVED comment — renders nothing (no controls) until #42.
- **Review tab** — group `reports`: open reports button (shortcut `Mod-Shift-R`); group `craft`: empty, registry-fed by 8g.2 (`extendRibbonTabs('writing', [{tabId:'review', groupId:'craft', ...}])` documented in a comment + the group MUST exist with `controls: []` so contributions land — NOTE: Plan 1's merge requires the group to exist for groupId contributions; an empty-controls group renders nothing (Ribbon already skips empty groups after visibility filtering — verify: it skips when visibleControls.length===0 ✔).
- **Work tab** — group `work`: settings button (gear, shortcut `Mod-,`? browser-reserved on mac (settings) — use none), status select (`options` = the four statuses labeled `writing.statuses.*`, `value: ctx.workStatus`, `onAction: setStatus`); group `export`: RESERVED empty group (comment); group `addons`: RESERVED empty group for #27 (comment); group `goto`: all-works button (`goToIndex`), writing-dashboard button (`goToDashboard`).

Lang additions (`writing.php`, flat): `ribbon.tab_write`, `ribbon.tab_structure`, `ribbon.tab_review`, `ribbon.tab_work`, `ribbon.group_text`, `ribbon.group_element`, `ribbon.group_world`, `ribbon.group_view`, `ribbon.group_sections`, `ribbon.group_plan`, `ribbon.group_guidance`, `ribbon.group_reports`, `ribbon.group_craft`, `ribbon.group_work`, `ribbon.group_export`, `ribbon.group_addons`, `ribbon.group_goto`, + control labels (`ribbon.bold`, `ribbon.italic`, `ribbon.underline`, `ribbon.bullet_list`, `ribbon.ordered_list`, `ribbon.heading2`, `ribbon.heading3`, `ribbon.element`, `ribbon.keys`, `ribbon.entry_link`, `ribbon.print_layout`, `ribbon.panel`, `ribbon.code_view`, `ribbon.editor_help`, `ribbon.add_section`, `ribbon.add_inside`, `ribbon.delete_section`, `ribbon.targets`, `ribbon.reports`, `ribbon.settings`, `ribbon.status`, `ribbon.all_works`, `ribbon.writing_home`). Sensible English strings; reuse existing keys where identical meaning exists ONLY via new ribbon-scoped keys (don't alias — tooltips may diverge later).

**Vitest** `writing-ribbon-tabs.test.ts` (pure — fabricate ctx objects): prose ctx hides `element` group controls + shows `text`; screenplay inverse; `addInside`/`deleteSection` disabled without section; entry-link disabled in screenplay non-action; element select value reads the bridge; status select reflects workStatus; reserved groups (`guidance`, `craft`, `export`, `addons`) exist with zero controls (so package contributions land). ~8 tests.

**Verify:** vitest ribbon dir green (28 total), types:check, build.

### Task 2 (core): headless editors + bridge

**Files:** `RichTextEditor.tsx`, `ManuscriptEditor.tsx`, `ScreenplayEditor.tsx`.

- `RichTextEditor` new prop `chrome?: 'full' | 'none'` (default full; meaningful only for manuscript variant): `none` hides the toolbar row entirely (band border too) — content surface + modals remain. New prop `bridgeRef?: Ref<WritingEditorBridge>` + `onStateChange?: () => void`: implement the bridge with `useImperativeHandle` (marks/lists/headings/insertEntryLink/openHelp = setShowLegend(true)/toggleCodeView/isCodeView/focus; `setElement/currentElement` return no-op/null). Wire `onStateChange` to the existing `useEditorState`/transaction tracking (call after selection or doc changes; the component already tracks buttonActiveStates — reuse that effect to also call onStateChange).
- `ScreenplayEditor`: remove the toolbar row (element Select, entry-link button, ruler toggle, help button all leave); `ScreenplaySurface` keeps ruler rendering (printLayout prop) + the keys modal (state lifted to ScreenplayEditor; bridge `openHelp` opens it). Implement the same `bridgeRef`/`onStateChange` (elements via `convertCurrentBlock`/selection parent; marks no-op false; `insertEntryLink` = the `[[` insert chain, respecting action-only).
- `ManuscriptEditor`/`ScreenplayEditor` prop changes: `printLayout: boolean` now a PROP (state lifted to Workspace; both editors delete their local state/toggle; ManuscriptEditor keeps exporting the storage helpers for Workspace), pass through to RichTextEditor/ScreenplaySurface; accept + forward `bridgeRef` and `onStateChange`.
- KEEP behavior parity for non-workspace RichTextEditor callers (card variant untouched; manuscript with default `chrome: 'full'` unchanged — Workspace flips to `'none'` only in Task 3, so this task is integration-safe mid-stream).

**Verify:** build + types + app `--filter=Writing` feature tests (74) still green (server untouched, pages still compile); browser smokes NOT yet (Task 3 changes the UI they assert).

### Task 3 (core): Workspace integration + shedding

**Files:** `Workspace.tsx`, `SectionChrome.tsx`, ManuscriptEditor/ScreenplayEditor mounting props.

- Workspace: import + call `registerWritingRibbon()` at module scope; state additions: `printLayout` (init from the exported reader), `editorTick`, `bridgeRef = useRef<WritingEditorBridge|null>(null)`; build `ctx: WritingRibbonContext` (useMemo over its inputs — identity changes on each tick/state change, which is what re-renders the ribbon); mount `<Ribbon setKey="writing" context={ctx} leading={breadcrumb} trailing={statusChip + progress + counts cluster}/>` as the FIRST row (the old header strip div is REMOVED; its back-link becomes the leading breadcrumb; panel chevron/gear/reports buttons deleted — ribbon owns them).
- Actions wiring: addSection/addInside/deleteSection reuse the Navigator's modals — LIFT the modal-trigger state up: Navigator already owns AddSectionModal + delete ConfirmModal internally; expose via props (`requestAdd(parentId)`, `requestDelete(node)`) OR lift the modal state to Workspace and pass down. Choose the lift (Workspace owns `addTarget`/`deleteTarget`, passes to Navigator which renders rows only; the modals render in Workspace) — keeps ribbon actions and Navigator hover actions converging on one state. deleteSection from ribbon targets the CURRENT section (find node by currentSection.id in the tree).
- SectionChrome: remove `menuExtras` usage for the ruler (prop stays for future), title/label/status only. Editors: `chrome="none"`, `printLayout={printLayout}`, `bridgeRef`, `onStateChange={() => setEditorTick(t => t + 1)}`.
- Read-only viewers (`!canUpdate`): ribbon still renders (View/Review/Go-to useful); canUpdate-gated groups hide via their `visible` predicates — sweep the definitions to ensure every mutating control declares it.
- Lang: any missed keys.

**Verify:** build + types; manual-feel pass is the user's; feature tests green; THEN Task 4 fixes smokes.

### Task 4 (app): browser smokes

**Files:** `tests/Browser/Writing/WritingSurfacesTest.php`.

- Update existing smokes that touched removed chrome (the prose smoke clicked `.ProseMirror` directly — fine; the screenplay smoke used keyboard — fine; pin smoke used panel tabs — panel unchanged; any selector that referenced the old toolbar/menu-bar buttons updates to ribbon selectors).
- New smokes: (1) ribbon renders with Write active; prose work shows Text group, screenplay work shows Element select; (2) ribbon bold: select text? simpler — click bold, type, assert `<strong>` in DOM; (3) element select via ribbon converts the block (assert data-element); (4) `Mod-Shift-R`... shortcut dispatch via Playwright keys → reports page; (5) slim toggle persists across reload (assert a `.ribbon--slim` class); (6) Structure tab add-section creates a node; (7) no duplicate controls: assert the old toolbar container/menu-bar buttons are gone (e.g., no `[aria-label]` ruler button outside the ribbon).
- Run the full browser suite + feature `--filter=Writing` + full vitest; token sync if flagged.

### Task 5: sweep — full suites both repos, builds, pint, status clean, QA-doc "Plan 2 ribbon items" section (ribbon checks for the #40-style manual pass: tabs, modes, shortcuts, no-dupes), board note on #44.

## Self-Review (applied)

- Spec §3 fully mapped; §1 trailing addition is the one framework delta and is called out as a check-in decision.
- Shortcut choices avoid the browser-reserved list (`Mod-Shift-O/L/R`; no Mod-number); editor-internal keys untouched.
- The reserved-empty-groups requirement traces to Plan 1's merge semantics (groupId contributions need the group to exist) — tested in Task 1.
- Modal-state lift (Task 3) is the riskiest refactor; parity gate = existing smokes still passing after Task 4 updates plus the no-duplicate assertion.
