# Workspace Ribbon + Transition Repository Design

**Date:** 2026-06-12
**Status:** Approved (brainstorm with Andrew, visual-companion session, 2026-06-12)
**Repos:** `alexandria-core` ships the app-level chrome infrastructure; `alexandria-app` consumes + tests. Built on `feat/ribbon-transitions`, merged to `main` locally during the 2026-06-15 closeout.
**Board:** #44 ribbon framework/workspace adoption, transition repository, Quick access/QAT, and the first #42 structure-guidance pass are complete. Deeper structure/craft guidance remains in the tracked follow-up list.

## Goals

1. **One control surface.** A Word/Final Draft-style ribbon replaces the writing workspace's scattered controls (header-strip buttons, section menu bar, editor toolbars). Familiar to anyone who has used Office; navigable like Final Draft's settings.
2. **App-level infrastructure, not a workspace widget.** Tabs are *portable control sets*: a tab set registered under a key can mount on any page. Blueprint/entry settings pages adopt the ribbon later by registering their own sets — the framework is the deliverable, the workspace is its first consumer. The ribbon "takes on a whole new life as a central part of the application" (user framing).
3. **Keyboard shortcuts as a first-class concern** — declared on controls, centrally bound, platform-labeled, conflict-checked.
4. **Extension seams** for packages and future surfaces: the 8g.2 craft suite contributes a Review-tab group; the add-ons manager (#27's user-facing half) has a documented reserved slot in the Work tab.
5. **SPA feel**: a transition repository (named page-transition styles, attributable to link anchors later) + our own themed progress bar replacing Inertia's NProgress.
6. **Quick action bar (QAT)** — user-defined favorites (pinned control ids) + bookmarks. Built after the ribbon was usable, then folded into the closeout.

## Decisions log (from the visual session)

| Decision | Choice |
|---|---|
| Ribbon shape | The implemented workspace shape is a desktop-app menu row (**File / Edit / View**) plus a visually distinct **Quick access** area and a fixed formatting band. Earlier comfortable/slim/collapsed ideas are deferred customization work, not current UX. |
| Tab taxonomy v1 | The first mockup taxonomy informed command grouping, then collapsed into desktop menus and context-aware formatting controls. Structure controls now live in the left section panel; length/target/report affordances move to the side surfaces. |
| Identity vs controls | Work/project identity, settings, paper options, and account-adjacent controls live in the top chrome; document title/type redundancy was removed. Word/line/page counts stay in the bottom strip. |
| Architecture | **Declarative registry framework** (approach A): tabs/groups/controls are data; rendering, shortcuts, persistence, and the future QAT/customization all read the same definitions |
| Transitions | Registry of named styles; ship `fade` (simple default) + `slide` (test); our own progress bar; Inertia NProgress disabled; per-anchor attribution via `data-transition` supported by the skeleton |
| QAT | Shipped as **Quick access** beside the menu row. Items are control-id references/bookmarks and persist per user on `user_preferences.ribbon_quick_actions`. |

## §1 Ribbon framework (core)

New module `resources/js/ribbon/` (app chrome, NOT under pages/):

```
resources/js/ribbon/
├── types.ts             # the data model (below)
├── ribbonRegistry.ts    # tab-set registry + extension merge
├── Ribbon.tsx           # renderer: tab strip, band, modes, far-right mode toggles
├── controls/            # one renderer per control type
│   ├── RibbonButton.tsx
│   ├── RibbonToggle.tsx
│   ├── RibbonSelect.tsx
│   └── RibbonMenu.tsx
├── useRibbonShortcuts.ts  # §2
└── ribbon.css             # band/tab/group styling, theme tokens only
```

### Data model (`types.ts`)

```ts
export type RibbonControlType = 'button' | 'toggle' | 'select' | 'menu';

export interface RibbonControl<Ctx = unknown> {
    id: string;                       // globally unique within a set; QAT pins + customization reference this
    type: RibbonControlType;
    icon: string;                     // fa classes
    labelKey: string;                 // useT key (flat)
    shortcut?: string;                // 'Mod-Shift-R' style; binder + tooltip read it
    visible?: (ctx: Ctx) => boolean;  // contextual (e.g. prose vs screenplay groups)
    disabled?: (ctx: Ctx) => boolean;
    active?: (ctx: Ctx) => boolean;   // toggle/button pressed state
    options?: (ctx: Ctx) => Array<{ value: string; labelKey: string }>; // select/menu
    value?: (ctx: Ctx) => string;     // select current value
    onAction: (ctx: Ctx, value?: string) => void;
}

export interface RibbonGroup<Ctx = unknown> { id: string; labelKey: string; controls: RibbonControl<Ctx>[]; }
export interface RibbonTab<Ctx = unknown> { id: string; labelKey: string; groups: RibbonGroup<Ctx>[]; }
```

### Registry (`ribbonRegistry.ts`)

- `registerRibbonTabs(setKey: string, tabs: RibbonTab[])` — a page's base set (e.g. `'writing'`).
- `extendRibbonTabs(setKey: string, contributions: RibbonTabContribution[])` — packages/app merge into existing tabs (`{tabId, groups}` appends groups; `{tabId, groupId, controls}` appends controls into a group) or add whole new tabs. Merge happens at read time; contributions accumulate across calls.
- `getRibbonTabs(setKey)` + `subscribeRibbon(listener)` — settingsCache mechanics, `useSyncExternalStore`-safe snapshots.

### Renderer (`Ribbon.tsx`)

`<Ribbon setKey="writing" context={ctx} />` — host page owns and types the context (the framework treats it as opaque). Renders: tab strip (active tab state local, default first tab), the band per mode, group dividers + labels (comfortable mode only), far-right cluster: slim/comfortable toggle, collapse toggle, and any host-provided `rightExtras` slot (the workspace puts the save status… no — status lives in the identity strip; rightExtras reserved anyway).

**Modes:** `comfortable` (labeled groups, tall band) | `slim` (single icon row, labels become tooltips) | `collapsed` (tab strip only; clicking a tab drops the band as an overlay until focus leaves — Word behavior). Persisted in `localStorage` `alexandria.ribbon.mode` (one global preference; per-page overrides are a later nicety). Re-render on context change: the host passes a `contextVersion` number (or the ctx object identity changes); controls' `visible/disabled/active/value` re-evaluate per render — cheap, they're plain functions.

**Accessibility:** tab strip is a proper `tablist`; controls carry `aria-pressed`/`aria-expanded`; every control gets a Tooltip (labelKey + shortcut suffix).

## §2 Shortcut system (`useRibbonShortcuts.ts`)

- Mounted by `Ribbon` itself: walks the resolved tab set, collects `{shortcut → control}` for controls currently `visible` (hidden controls don't bind), registers ONE window keydown listener.
- Parsing: `Mod` = Ctrl/⌘, plus `Shift`/`Alt` modifiers and a key — same notation TipTap uses, one mental model. Matching ignores events originating in text inputs ONLY for shortcuts without Mod (all ribbon shortcuts require Mod, so they work while typing in the editor without stealing characters).
- Dispatch: `control.onAction(ctx)` exactly as a click would; `preventDefault` on match.
- **Conflict detection:** dev-only console.warn when two visible controls declare the same combo, and when a combo collides with a known browser-reserved list (Mod+1..9, Mod+W/T/N…).
- Tooltips render the platform label automatically (`⌘⇧R` / `Ctrl+Shift+R`) from the declaration — single source of truth.
- Editor-internal keys (Enter/Tab/`(`, Mod-Alt-0–5 element jumps) STAY in the TipTap schema — they're text-entry semantics, not ribbon actions. Word-style Alt KeyTips: future layer; the declarative model already supports it (documented, not built).

## §3 Workspace adoption (first consumer)

The `'writing'` tab set per the approved mockup:

- **Write** — Text group (`visible: prose`): bold/italic/underline/link/lists/H2-H3 driving the editor through the context's editor bridge; Element group (`visible: screenplay`): element select + keys-help; World group: insert entry link; View group: ruler/print toggle, reference-panel toggle, code view; (focus mode = future control slot).
- **Structure** — The old ribbon tab was superseded by the integrated left section panel. Add/section-menu actions live there, and the first #42 guidance pass now renders compact structure notes for supported forms. Deeper form-specific guidance remains a follow-up.
- **Review** — Reports group: open reports; Craft-suite group: **registry-fed, empty until 8g.2**. (No counts control — counts already live in the footer strip; duplicating them as a pseudo-control fights the model.)
- **Work** — Work group: settings (gear), status select (writes works.update); Export group: **reserved/future**; Go-to group: all works (project index), global writing dashboard; Add-ons group: **reserved slot for the add-ons manager (#27)**.

**Context bridge:** the Workspace builds `WritingRibbonContext` — `{format, canUpdate, panelOpen, printLayout, editor: RibbonEditorBridge | null, actions: {toggleRuler, togglePanel, openSettings, openReports, addSection, addInside, deleteSection, setStatus, insertEntryLink, toggleCodeView}}`. `RibbonEditorBridge` is a small interface BOTH editors implement and expose via ref: `{toggleMark(name), setElement(el), isMarkActive(name), currentElement(), canSetElement()}` — prose implements marks, screenplay implements elements; unsupported calls no-op with `disabled` reflecting capability.

**What each surface sheds:**
- `RichTextEditor` manuscript variant gains `chrome: 'none'`: renders ONLY the content surface (no toolbar, no legend button); the card variant and all non-workspace callers are untouched.
- `ScreenplayEditor` drops its toolbar row (element select/help move to the ribbon); the surface + ruler remain.
- `SectionChrome` menu bar becomes the **identity strip**: title (inline edit), label chip, save status — no controls. Footer counts unchanged.
- Workspace header strip: gear/reports/panel buttons removed (now ribbon); breadcrumb + status chip + work progress stay, sitting beside the ribbon's tab row (one combined top region — exact arrangement is a build-time visual decision, revisit in the refine pass).

## §4 Extension seams

- `extendRibbonTabs('writing', ...)` is the public door. Documented reserved targets: `review/craft` group (8g.2 registers Adverb Review, meter analysis #41), `work/addons` group (#27 user-facing manager), `structure/guidance` group (#42 toggles).
- Future pages: blueprint/entry settings register `'blueprint-settings'` / `'entry'` sets when they adopt — framework change: none. This is the "informs future choices" payoff and why the framework lives in core's top-level `ribbon/`, not under Writing.

## §5 Transition repository + SPA polish

New core module `resources/js/transitions/`:

```
resources/js/transitions/
├── transitionRegistry.ts   # named styles: {key, enterClass, exitClass, durationMs}
├── PageTransitions.tsx     # Inertia router-event wiring + our progress bar
└── transitions.css         # the keyframes/classes, token-driven
```

- **Registry**: `registerTransition({key, ...})` / `getTransition(key)` / default key `'fade'`. Ships with **`fade`** (opacity + 2px rise, ~150ms — the simple default) and **`slide`** (horizontal glide, ~250ms — the test style).
- **`PageTransitions`** mounts once in `app.tsx`: listens to Inertia `before`/`start`/`progress`/`finish`/`navigate` events. On `before`, reads the originating element's closest `[data-transition]` attribute (per-anchor attribution — markup-only later; defaults to `fade`); on navigate, applies exit class to the outgoing page container and enter class to the incoming one (implementation detail: a keyed wrapper around the page component in the app's `resolve`/setup — plan decides between wrapping in `app.tsx` setup vs a layout-level hook; must not break preserved-state partial reloads, which should NOT transition — only full page-component changes do).
- **Progress bar**: thin top bar (theme tokens: brand-primary fill on a transparent track), driven by the same events with Inertia's `progress` percentage; graceful min-display so quick visits don't flicker. Inertia's built-in NProgress disabled via `progress: false` in BOTH `createInertiaApp` calls (app). Browser-native loading UI doesn't run on Inertia visits (XHR) — the first full page load is the only native moment and stays.
- **Reconcile** the existing `components/ui/PageTransition.tsx`: read at plan time; absorb into the registry as a named style or supersede + migrate its call sites.
- **Partial reloads** (`only: [...]`, the workspace's section switching) must remain transition-free and progress-bar-quiet under a threshold (only show the bar past ~250ms) — writing-flow latency must not gain chrome noise.

## §6 Quick action bar

- A compact strip docked in/beside the tab row: items render left of the tabs (Word QAT position).
- Item types: **pinned control** (stores a control id + set key; renders that control's icon/action — possible BECAUSE controls are declarative) and **bookmark** (`{url, icon, labelKey-or-raw-label}`).
- Pin/unpin via control context menu (right-click) + a small QAT editor popover for ordering/removal.
- **Persistence: server-side** on `user_preferences` (the theme-preference pattern — survives devices). App-side: extend the existing preferences endpoint; no new table.
- Shipped during the polish pass as **Quick access**. Persistence uses `user_preferences.ribbon_quick_actions`; during alpha cleanup the column was folded into the original `user_preferences` migration rather than left as an additive migration.

## §7 Testing

- **Vitest (app):** ribbonRegistry register/extend/merge + snapshot stability; shortcut parser/matcher (platform labels, Mod-required-while-typing rule, conflict warnings); transitionRegistry resolution + default fallback.
- **Browser smokes (app, extending the Writing suite):** ribbon renders Write tab with format-correct groups (prose vs screenplay); slim/collapse toggles persist across reload; a Write control drives the editor (bold via ribbon, assert mark); a declared shortcut fires the same action; Structure tab adds a section; progress bar appears on a slow navigation and both transitions play (assert classes); identity strip shows title/status; old toolbar/menu-bar controls are GONE (no duplicates).
- **Feature tests:** none new server-side in this build (QAT prefs endpoint comes with §6 later).
- Token-usage doc sync for ribbon.css/transitions.css; lang keys flat in `writing.php` + a new `ribbon.php` group for framework-level strings (mode toggles, QAT later) shared via HandleInertiaRequests.

## Build order (for the implementation plans)

1. **Plan 1:** ribbon framework (types/registry/renderer/modes/css) + shortcut system + Vitest coverage — standalone, nothing consumes it yet.
2. **Plan 2:** workspace adoption — editor bridge + `chrome: 'none'` + tab-set definitions + shedding the old surfaces + browser smokes.
3. **Plan 3:** transition repository + progress bar + NProgress off + PageTransition reconciliation + smokes.
4. **Plan 4:** QAT / Quick access, shipped during the polish pass after the ribbon and menu row stabilized.

## Completion addendum — 2026-06-14 writing workspace polish

The initial writing ribbon/chrome pass is complete and intentionally leaves richer command inventory work for later. Current shape:

- Writing uses a desktop-app menu row: **File / Edit / View** over a fixed formatting band. The menus are populated from the same `RibbonControl` definitions as the band so commands do not fork.
- Menu behavior follows standard desktop UX: click opens, hover follows between open menu titles, active title click dismisses, Escape/outside click closes, select commands open right-side submenus.
- Quick access sits beside the menu row and remains visually distinct from the fixed formatting band.
- Paper color is paper-only. It can use the current theme page color or neutral paper colors while the surrounding chrome stays themed.
- The workspace adds the right app rail, floating section panel, improved rulers, icon/tooltips in the header cluster, and no body-level page scrollbars.
- Screenplay scene links support `@` entry insertion, editable display text, scene-panel grouping by canonical entry with visible variants, persistence after reload, and dialogue word counts that exclude parentheticals.
- Manual edge-case coverage lives in `alexandria-app/docs/tests/2026-06-14-writing-ribbon-edge-cases.md`.

## Closeout addendum — 2026-06-15

The ribbon/transitions arc is merged to `main` locally in both repos. The closeout also added the first structure-guidance pass (#42): screenplay/stage-play and line-target poetry get compact, deterministic guidance in the section panel, with app-side Vitest coverage. Review cleanup removed stale `import.meta.env` typings, deprecated React ref types, IDE CSS custom-property warnings, and folded Quick access preferences into the original migration.

## Out of scope (tracked)

- Deeper #42 structure/craft guidance beyond the first pass: form-specific overlays, richer scene diagnostics, and eventual 8g.2 analyzer output.
- Richer File/Edit/View command inventory, fuller Quick access customization UI, Alt KeyTips, and per-page mode overrides.
- Entries/blueprint/admin ribbon adoption (the framework makes it a registration, not a rebuild)
- Mobile ribbon behavior beyond the existing `md:` workspace gate (mobile pass remains a later stage)
