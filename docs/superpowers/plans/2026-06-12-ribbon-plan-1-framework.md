# Ribbon Plan 1 — Framework (registry, shortcuts, renderer, modes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the declarative ribbon framework in `alexandria-core` — data model, tab-set registry with extension merge, shortcut system, control renderers, the `Ribbon` component with comfortable/slim/collapsed modes — fully unit-tested, consumed by nothing yet (workspace adoption is Plan 2).

**Architecture:** Per `docs/superpowers/specs/2026-06-12-ribbon-transitions-design.md` §1–§2. Tabs/groups/controls are data; the registry follows the proven settingsCache/writingPanelRegistry mechanics one structural level deeper; shortcuts are declared on controls and centrally bound; modes persist in localStorage.

**Tech Stack:** React 19 + TS in `alexandria-core/resources/js/ribbon/`; Vitest tests live in `alexandria-app` (`@alexandria` alias); theme tokens only; flat lang keys in a new `ribbon` group.

**Branches:** `feat/ribbon-transitions` exists in both repos. Verification commands run from `C:\Websites\alexandria\alexandria-app`. Controller commits (subagents don't run git).

**House facts (verified, don't re-derive):** registry mechanics to clone = `alexandria-core/resources/js/pages/Writing/writingPanelRegistry.ts` (Set listeners, snapshot stability for `useSyncExternalStore`); `useT` needs FLAT dot keys; lang groups shared via app `HandleInertiaRequests::resolveSharedTranslations` (merges `alexandria::<group>` + app `<group>`); app Vitest tests sit in `resources/js/<domain>/tests/*.test.ts` (node env default); CSS components live in `alexandria-core/resources/css/components/*.css` imported from app `resources/css/app.css` (alphabetical); `alex-toolbar-btn`/`--active` is the icon-button idiom; `Tooltip` from `@alexandria/components/ui/Tooltip`; platform sniff idiom `const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);`.

---

## File Structure

```
alexandria-core/resources/js/ribbon/
├── types.ts                 # Task 1 — data model (spec §1, verbatim)
├── ribbonRegistry.ts        # Task 1 — register/extend/get/subscribe
├── shortcuts.ts             # Task 2 — PURE helpers: parse/match/label/collect/conflicts
├── useRibbonShortcuts.ts    # Task 2 — the binder hook (window listener)
├── controls/
│   ├── RibbonButton.tsx     # Task 3
│   ├── RibbonToggle.tsx     # Task 3
│   ├── RibbonSelect.tsx     # Task 3
│   └── RibbonMenu.tsx       # Task 3
└── Ribbon.tsx               # Task 4 — renderer + modes
alexandria-core/resources/css/components/ribbon.css   # Task 3/4
alexandria-core/lang/en/ribbon.php                    # Task 3 (flat keys)
alexandria-app/resources/css/app.css                  # Task 3 — + @import
alexandria-app/app/Http/Middleware/HandleInertiaRequests.php  # Task 3 — + 'ribbon' group
alexandria-app/resources/js/ribbon/tests/
├── ribbon-registry.test.ts  # Task 1
└── ribbon-shortcuts.test.ts # Task 2
```

---

### Task 1: Data model + registry (TDD)

**Files:**
- Create: `alexandria-core/resources/js/ribbon/types.ts`
- Create: `alexandria-core/resources/js/ribbon/ribbonRegistry.ts`
- Test: `alexandria-app/resources/js/ribbon/tests/ribbon-registry.test.ts`

- [ ] **Step 1: Write the failing test**

`alexandria-app/resources/js/ribbon/tests/ribbon-registry.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    extendRibbonTabs,
    getRibbonTabs,
    registerRibbonTabs,
    resetRibbonRegistryForTests,
    subscribeRibbon,
} from '@alexandria/ribbon/ribbonRegistry';
import type { RibbonTab } from '@alexandria/ribbon/types';

function makeTab(id: string, groupIds: string[] = ['g1']): RibbonTab {
    return {
        id,
        labelKey: `ribbon.tab_${id}`,
        groups: groupIds.map((gid) => ({
            id: gid,
            labelKey: `ribbon.group_${gid}`,
            controls: [
                {
                    id: `${id}-${gid}-c1`,
                    type: 'button',
                    icon: 'fa-solid fa-circle',
                    labelKey: 'ribbon.c1',
                    onAction: () => undefined,
                },
            ],
        })),
    };
}

beforeEach(() => {
    resetRibbonRegistryForTests();
});

describe('ribbonRegistry', () => {
    it('returns an empty array for an unknown set key', () => {
        expect(getRibbonTabs('nope')).toEqual([]);
    });

    it('registers a base tab set and returns it', () => {
        registerRibbonTabs('writing', [makeTab('write'), makeTab('review')]);

        const tabs = getRibbonTabs('writing');
        expect(tabs.map((t) => t.id)).toEqual(['write', 'review']);
    });

    it('returns a stable snapshot between registrations (useSyncExternalStore contract)', () => {
        registerRibbonTabs('writing', [makeTab('write')]);

        expect(getRibbonTabs('writing')).toBe(getRibbonTabs('writing'));
    });

    it('merges contributed groups into an existing tab', () => {
        registerRibbonTabs('writing', [makeTab('review')]);
        extendRibbonTabs('writing', [
            {
                tabId: 'review',
                groups: [
                    {
                        id: 'craft',
                        labelKey: 'ribbon.group_craft',
                        controls: [
                            { id: 'adverbs', type: 'button', icon: 'fa-solid fa-bolt', labelKey: 'x', onAction: () => undefined },
                        ],
                    },
                ],
            },
        ]);

        const review = getRibbonTabs('writing').find((t) => t.id === 'review');
        expect(review?.groups.map((g) => g.id)).toEqual(['g1', 'craft']);
    });

    it('merges contributed controls into an existing group', () => {
        registerRibbonTabs('writing', [makeTab('work')]);
        extendRibbonTabs('writing', [
            {
                tabId: 'work',
                groupId: 'g1',
                controls: [
                    { id: 'addons', type: 'button', icon: 'fa-solid fa-puzzle-piece', labelKey: 'x', onAction: () => undefined },
                ],
            },
        ]);

        const group = getRibbonTabs('writing')[0].groups[0];
        expect(group.controls.map((c) => c.id)).toEqual(['work-g1-c1', 'addons']);
    });

    it('appends a whole new tab when the contribution names an unknown tabId', function () {
        registerRibbonTabs('writing', [makeTab('write')]);
        extendRibbonTabs('writing', [{ tabId: 'plugins', labelKey: 'ribbon.tab_plugins', groups: [makeTab('plugins').groups[0]] }]);

        expect(getRibbonTabs('writing').map((t) => t.id)).toEqual(['write', 'plugins']);
    });

    it('accumulates contributions across multiple extend calls', () => {
        registerRibbonTabs('writing', [makeTab('review')]);
        extendRibbonTabs('writing', [{ tabId: 'review', groups: [{ id: 'a', labelKey: 'x', controls: [] }] }]);
        extendRibbonTabs('writing', [{ tabId: 'review', groups: [{ id: 'b', labelKey: 'x', controls: [] }] }]);

        expect(getRibbonTabs('writing')[0].groups.map((g) => g.id)).toEqual(['g1', 'a', 'b']);
    });

    it('contributions registered BEFORE the base set still merge', () => {
        extendRibbonTabs('writing', [{ tabId: 'review', groups: [{ id: 'early', labelKey: 'x', controls: [] }] }]);
        registerRibbonTabs('writing', [makeTab('review')]);

        expect(getRibbonTabs('writing')[0].groups.map((g) => g.id)).toEqual(['g1', 'early']);
    });

    it('notifies subscribers on register and on extend, and unsubscribe stops notifications', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeRibbon(listener);

        registerRibbonTabs('writing', [makeTab('write')]);
        extendRibbonTabs('writing', [{ tabId: 'write', groups: [{ id: 'x', labelKey: 'x', controls: [] }] }]);
        expect(listener).toHaveBeenCalledTimes(2);

        unsubscribe();
        registerRibbonTabs('other', [makeTab('t')]);
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('does not mutate the registered base definitions when merging', () => {
        const base = [makeTab('review')];
        registerRibbonTabs('writing', base);
        extendRibbonTabs('writing', [{ tabId: 'review', groups: [{ id: 'craft', labelKey: 'x', controls: [] }] }]);
        getRibbonTabs('writing');

        expect(base[0].groups.map((g) => g.id)).toEqual(['g1']);
    });
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `cd C:\Websites\alexandria\alexandria-app; npx vitest run resources/js/ribbon/tests/ribbon-registry.test.ts`
Expected: FAIL — cannot resolve `@alexandria/ribbon/ribbonRegistry`.

- [ ] **Step 3: Implement**

`alexandria-core/resources/js/ribbon/types.ts` (spec §1 verbatim + the contribution type):

```ts
/**
 * Ribbon data model — the declarative core of the app-level ribbon
 * (spec: docs/superpowers/specs/2026-06-12-ribbon-transitions-design.md §1).
 *
 * Controls are DATA: rendering, shortcut binding, the future QAT, and
 * ribbon customization all read these definitions. The context type is
 * host-defined — the framework treats it as opaque and just threads it
 * into the predicate/action callbacks.
 */

export type RibbonControlType = 'button' | 'toggle' | 'select' | 'menu';

export interface RibbonControl<Ctx = unknown> {
    /** Globally unique within a set — QAT pins and customization reference this. */
    id: string;
    type: RibbonControlType;
    /** FontAwesome classes. */
    icon: string;
    /** useT key (flat). */
    labelKey: string;
    /** TipTap-style notation, e.g. 'Mod-Shift-R'. Binder + tooltip read it. */
    shortcut?: string;
    visible?: (ctx: Ctx) => boolean;
    disabled?: (ctx: Ctx) => boolean;
    /** Pressed state for toggles (and buttons that track state). */
    active?: (ctx: Ctx) => boolean;
    /** Options for select/menu controls. */
    options?: (ctx: Ctx) => Array<{ value: string; labelKey: string }>;
    /** Current value for select controls. */
    value?: (ctx: Ctx) => string;
    onAction: (ctx: Ctx, value?: string) => void;
}

export interface RibbonGroup<Ctx = unknown> {
    id: string;
    labelKey: string;
    controls: RibbonControl<Ctx>[];
}

export interface RibbonTab<Ctx = unknown> {
    id: string;
    labelKey: string;
    groups: RibbonGroup<Ctx>[];
}

/**
 * A contribution from a package or the host app, merged at read time:
 * - {tabId, groups}: append groups to an existing tab (or, with
 *   labelKey, create the tab if the id is unknown);
 * - {tabId, groupId, controls}: append controls to an existing group.
 */
export type RibbonTabContribution<Ctx = unknown> =
    | { tabId: string; labelKey?: string; groups: RibbonGroup<Ctx>[]; groupId?: never; controls?: never }
    | { tabId: string; groupId: string; controls: RibbonControl<Ctx>[]; labelKey?: never; groups?: never };

export type RibbonMode = 'comfortable' | 'slim' | 'collapsed';
```

`alexandria-core/resources/js/ribbon/ribbonRegistry.ts`:

```ts
import type { RibbonTab, RibbonTabContribution } from './types';

/**
 * Tab-set registry — settingsCache/writingPanelRegistry mechanics one
 * structural level deeper. Base sets register under a key; packages
 * extend them; merging happens lazily at read time so registration
 * order never matters. Snapshots are cached per set key so
 * useSyncExternalStore consumers get stable references.
 */

const baseSets = new Map<string, RibbonTab[]>();
const contributions = new Map<string, RibbonTabContribution[]>();
const snapshots = new Map<string, RibbonTab[]>();
const listeners = new Set<() => void>();

const EMPTY: RibbonTab[] = [];

function notify(): void {
    snapshots.clear();
    for (const listener of listeners) {
        listener();
    }
}

export function registerRibbonTabs(setKey: string, tabs: RibbonTab[]): void {
    baseSets.set(setKey, tabs);
    notify();
}

export function extendRibbonTabs(setKey: string, items: RibbonTabContribution[]): void {
    contributions.set(setKey, [...(contributions.get(setKey) ?? []), ...items]);
    notify();
}

export function getRibbonTabs(setKey: string): RibbonTab[] {
    const cached = snapshots.get(setKey);
    if (cached) {
        return cached;
    }

    const base = baseSets.get(setKey);
    const extra = contributions.get(setKey) ?? [];

    if (!base) {
        return EMPTY;
    }

    // Deep-ish clone of the tab/group arrays (controls are shared by
    // reference — they're behavioral objects, not mutated).
    const merged: RibbonTab[] = base.map((tab) => ({
        ...tab,
        groups: tab.groups.map((group) => ({ ...group, controls: [...group.controls] })),
    }));

    for (const item of extra) {
        const tab = merged.find((t) => t.id === item.tabId);

        if ('groupId' in item && item.groupId !== undefined) {
            const group = tab?.groups.find((g) => g.id === item.groupId);
            group?.controls.push(...item.controls);
            continue;
        }

        if (tab) {
            tab.groups.push(...item.groups);
        } else {
            merged.push({ id: item.tabId, labelKey: item.labelKey ?? item.tabId, groups: [...item.groups] });
        }
    }

    snapshots.set(setKey, merged);

    return merged;
}

export function subscribeRibbon(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Test-only: wipe all registry state between cases. */
export function resetRibbonRegistryForTests(): void {
    baseSets.clear();
    contributions.clear();
    snapshots.clear();
    listeners.clear();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/js/ribbon/tests/ribbon-registry.test.ts`
Expected: PASS (10 tests). Also `npm run types:check` — clean.

- [ ] **Step 5: Commit** (controller; core: ribbon/types+registry; app: the test)

---

### Task 2: Shortcut system (TDD)

**Files:**
- Create: `alexandria-core/resources/js/ribbon/shortcuts.ts` (pure helpers — unit-testable without DOM)
- Create: `alexandria-core/resources/js/ribbon/useRibbonShortcuts.ts` (the hook)
- Test: `alexandria-app/resources/js/ribbon/tests/ribbon-shortcuts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';

import {
    collectShortcuts,
    findConflicts,
    formatShortcutLabel,
    matchesEvent,
    parseShortcut,
} from '@alexandria/ribbon/shortcuts';
import type { RibbonTab } from '@alexandria/ribbon/types';

function keyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
        key: 'r',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        ...overrides,
    } as KeyboardEvent;
}

describe('parseShortcut', () => {
    it('parses Mod-Shift-R', () => {
        expect(parseShortcut('Mod-Shift-R')).toEqual({ mod: true, shift: true, alt: false, key: 'r' });
    });

    it('parses Mod-Alt-5 (digit key)', () => {
        expect(parseShortcut('Mod-Alt-5')).toEqual({ mod: true, shift: false, alt: true, key: '5' });
    });
});

describe('matchesEvent', () => {
    const parsed = parseShortcut('Mod-Shift-R');

    it('matches ctrl on non-mac and meta on mac', () => {
        expect(matchesEvent(parsed, keyEvent({ key: 'R', ctrlKey: true, shiftKey: true }), false)).toBe(true);
        expect(matchesEvent(parsed, keyEvent({ key: 'R', metaKey: true, shiftKey: true }), true)).toBe(true);
        expect(matchesEvent(parsed, keyEvent({ key: 'R', metaKey: true, shiftKey: true }), false)).toBe(false);
    });

    it('requires exact modifier set (no extra alt)', () => {
        expect(matchesEvent(parsed, keyEvent({ key: 'R', ctrlKey: true, shiftKey: true, altKey: true }), false)).toBe(false);
    });

    it('is case-insensitive on the key', () => {
        expect(matchesEvent(parsed, keyEvent({ key: 'r', ctrlKey: true, shiftKey: true }), false)).toBe(true);
    });
});

describe('formatShortcutLabel', () => {
    it('renders platform labels', () => {
        expect(formatShortcutLabel('Mod-Shift-R', true)).toBe('⌘⇧R');
        expect(formatShortcutLabel('Mod-Shift-R', false)).toBe('Ctrl+Shift+R');
        expect(formatShortcutLabel('Mod-Alt-0', false)).toBe('Ctrl+Alt+0');
    });
});

describe('collectShortcuts + findConflicts', () => {
    const ctx = { mode: 'prose' };

    const tabs: RibbonTab[] = [
        {
            id: 't',
            labelKey: 'x',
            groups: [
                {
                    id: 'g',
                    labelKey: 'x',
                    controls: [
                        { id: 'a', type: 'button', icon: 'i', labelKey: 'x', shortcut: 'Mod-Shift-R', onAction: vi.fn() },
                        { id: 'b', type: 'button', icon: 'i', labelKey: 'x', shortcut: 'Mod-Shift-P', visible: () => false, onAction: vi.fn() },
                        { id: 'c', type: 'button', icon: 'i', labelKey: 'x', onAction: vi.fn() },
                    ],
                },
            ],
        },
    ];

    it('collects only visible controls with shortcuts', () => {
        const bound = collectShortcuts(tabs, ctx);
        expect(bound.map((b) => b.control.id)).toEqual(['a']);
    });

    it('flags duplicate combos and browser-reserved combos', () => {
        const dupes: RibbonTab[] = [
            {
                id: 't',
                labelKey: 'x',
                groups: [
                    {
                        id: 'g',
                        labelKey: 'x',
                        controls: [
                            { id: 'a', type: 'button', icon: 'i', labelKey: 'x', shortcut: 'Mod-Shift-R', onAction: vi.fn() },
                            { id: 'b', type: 'button', icon: 'i', labelKey: 'x', shortcut: 'Mod-Shift-R', onAction: vi.fn() },
                            { id: 'w', type: 'button', icon: 'i', labelKey: 'x', shortcut: 'Mod-W', onAction: vi.fn() },
                        ],
                    },
                ],
            },
        ];

        const conflicts = findConflicts(collectShortcuts(dupes, ctx));
        expect(conflicts.some((c) => c.kind === 'duplicate' && c.shortcut === 'Mod-Shift-R')).toBe(true);
        expect(conflicts.some((c) => c.kind === 'browser-reserved' && c.shortcut === 'Mod-W')).toBe(true);
    });
});
```

- [ ] **Step 2: Run to verify failure** (module unresolved), then implement.

- [ ] **Step 3: Implement `shortcuts.ts`**

```ts
import type { RibbonControl, RibbonTab } from './types';

/**
 * Pure shortcut helpers — parsing, event matching, platform labels,
 * collection, conflict detection. The binder hook
 * (useRibbonShortcuts) is a thin DOM wrapper over these so all the
 * logic stays unit-testable without a browser.
 *
 * Notation matches TipTap ('Mod-Shift-R'): one mental model across
 * the editor and the ribbon. All ribbon shortcuts REQUIRE Mod — they
 * must be safe while typing in the editor.
 */

export interface ParsedShortcut {
    mod: boolean;
    shift: boolean;
    alt: boolean;
    key: string; // lowercase
}

export interface BoundShortcut<Ctx = unknown> {
    shortcut: string;
    parsed: ParsedShortcut;
    control: RibbonControl<Ctx>;
}

export type ShortcutConflict =
    | { kind: 'duplicate'; shortcut: string; controlIds: string[] }
    | { kind: 'browser-reserved'; shortcut: string; controlIds: string[] };

/** Combos browsers own; binding them is a dev-time warning. */
const BROWSER_RESERVED = new Set([
    'mod-w', 'mod-t', 'mod-n', 'mod-q',
    'mod-1', 'mod-2', 'mod-3', 'mod-4', 'mod-5', 'mod-6', 'mod-7', 'mod-8', 'mod-9',
]);

export function parseShortcut(shortcut: string): ParsedShortcut {
    const parts = shortcut.split('-');
    const key = parts[parts.length - 1].toLowerCase();
    const mods = parts.slice(0, -1).map((p) => p.toLowerCase());

    return {
        mod: mods.includes('mod'),
        shift: mods.includes('shift'),
        alt: mods.includes('alt'),
        key,
    };
}

export function matchesEvent(parsed: ParsedShortcut, event: KeyboardEvent, isMac: boolean): boolean {
    const modPressed = isMac ? event.metaKey : event.ctrlKey;
    const wrongPlatformMod = isMac ? event.ctrlKey : event.metaKey;

    return (
        event.key.toLowerCase() === parsed.key &&
        modPressed === parsed.mod &&
        !wrongPlatformMod &&
        event.shiftKey === parsed.shift &&
        event.altKey === parsed.alt
    );
}

export function formatShortcutLabel(shortcut: string, isMac: boolean): string {
    const parsed = parseShortcut(shortcut);
    const key = parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key;

    if (isMac) {
        return `${parsed.mod ? '⌘' : ''}${parsed.alt ? '⌥' : ''}${parsed.shift ? '⇧' : ''}${key}`;
    }

    const parts: string[] = [];
    if (parsed.mod) parts.push('Ctrl');
    if (parsed.alt) parts.push('Alt');
    if (parsed.shift) parts.push('Shift');
    parts.push(key);

    return parts.join('+');
}

/** Visible controls (per ctx) that declare a shortcut. */
export function collectShortcuts<Ctx>(tabs: RibbonTab<Ctx>[], ctx: Ctx): BoundShortcut<Ctx>[] {
    const bound: BoundShortcut<Ctx>[] = [];

    for (const tab of tabs) {
        for (const group of tab.groups) {
            for (const control of group.controls) {
                if (control.shortcut === undefined) continue;
                if (control.visible !== undefined && !control.visible(ctx)) continue;

                bound.push({ shortcut: control.shortcut, parsed: parseShortcut(control.shortcut), control });
            }
        }
    }

    return bound;
}

export function findConflicts<Ctx>(bound: BoundShortcut<Ctx>[]): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];
    const byCombo = new Map<string, BoundShortcut<Ctx>[]>();

    for (const b of bound) {
        const norm = b.shortcut.toLowerCase();
        byCombo.set(norm, [...(byCombo.get(norm) ?? []), b]);
    }

    for (const [combo, items] of byCombo) {
        const ids = items.map((i) => i.control.id);

        if (items.length > 1) {
            conflicts.push({ kind: 'duplicate', shortcut: items[0].shortcut, controlIds: ids });
        }
        if (BROWSER_RESERVED.has(combo)) {
            conflicts.push({ kind: 'browser-reserved', shortcut: items[0].shortcut, controlIds: ids });
        }
    }

    return conflicts;
}
```

- [ ] **Step 4: Implement `useRibbonShortcuts.ts`** (thin DOM binder; no unit test — exercised by Plan 2's browser smokes):

```ts
import { useEffect } from 'react';

import { collectShortcuts, findConflicts, matchesEvent, type BoundShortcut } from './shortcuts';
import type { RibbonTab } from './types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * Binds every mounted, visible control's declared shortcut to one
 * window keydown listener. All ribbon shortcuts require Mod, so they
 * fire safely while typing (no plain-character stealing). Dev builds
 * warn once per mount about duplicate or browser-reserved combos.
 */
export default function useRibbonShortcuts<Ctx>(tabs: RibbonTab<Ctx>[], ctx: Ctx): void {
    useEffect(() => {
        const bound: BoundShortcut<Ctx>[] = collectShortcuts(tabs, ctx);

        if (bound.length === 0) {
            return;
        }

        if (import.meta.env.DEV) {
            for (const conflict of findConflicts(bound)) {
                console.warn(
                    `[ribbon] shortcut ${conflict.shortcut} (${conflict.kind}) bound by: ${conflict.controlIds.join(', ')}`,
                );
            }
        }

        function onKeyDown(event: KeyboardEvent): void {
            for (const b of bound) {
                if (!b.parsed.mod) continue; // ribbon shortcuts must carry Mod
                if (!matchesEvent(b.parsed, event, isMac)) continue;
                if (b.control.disabled?.(ctx)) return;

                event.preventDefault();
                b.control.onAction(ctx);

                return;
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [tabs, ctx]);
}
```

- [ ] **Step 5: Run tests** (`npx vitest run resources/js/ribbon/tests/ribbon-shortcuts.test.ts` → PASS, 7 tests) + `npm run types:check`. Commit (controller).

---

### Task 3: Control renderers + CSS + lang

**Files:**
- Create: the four `alexandria-core/resources/js/ribbon/controls/*.tsx`
- Create: `alexandria-core/resources/css/components/ribbon.css`
- Create: `alexandria-core/lang/en/ribbon.php`
- Modify: `alexandria-app/resources/css/app.css` (+ `@import` alphabetical)
- Modify: `alexandria-app/app/Http/Middleware/HandleInertiaRequests.php` (+ `'ribbon' => $this->loadGroup('ribbon'),`)

All four controls share conventions: `useT` for labels, `Tooltip` wrapping with `label + (shortcut ? ' · ' + formatShortcutLabel(shortcut, isMac) : '')`, theme tokens only, `disabled`/`active` evaluated against the passed ctx, comfortable mode shows a small text label under the icon for `button`/`toggle` (`.ribbon-ctl-label`, hidden in slim).

- [ ] **Step 1: `RibbonButton.tsx`** (the reference implementation; Toggle/Select/Menu follow it):

```tsx
import useT from '@alexandria/hooks/useT';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { formatShortcutLabel } from '../shortcuts';
import type { RibbonControl } from '../types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

interface Props<Ctx> {
    control: RibbonControl<Ctx>;
    ctx: Ctx;
    showLabel: boolean; // comfortable mode
}

export default function RibbonButton<Ctx>({ control, ctx, showLabel }: Props<Ctx>) {
    const t = useT();
    const disabled = control.disabled?.(ctx) ?? false;
    const active = control.active?.(ctx) ?? false;
    const label = t(control.labelKey);
    const tip = control.shortcut ? `${label} · ${formatShortcutLabel(control.shortcut, isMac)}` : label;

    return (
        <Tooltip content={tip}>
            <button
                type="button"
                className={`ribbon-ctl alex-toolbar-btn ${active ? 'alex-toolbar-btn--active' : ''}`}
                aria-pressed={control.type === 'toggle' ? active : undefined}
                disabled={disabled}
                onClick={() => control.onAction(ctx)}
            >
                <i className={control.icon} aria-hidden="true" />
                {showLabel && <span className="ribbon-ctl-label">{label}</span>}
            </button>
        </Tooltip>
    );
}
```

- [ ] **Step 2: `RibbonToggle.tsx`** — identical to RibbonButton except it ALWAYS sets `aria-pressed={active}`; implement as a 10-line wrapper that renders `RibbonButton` would hide the aria difference — instead duplicate the small component with `aria-pressed={active}` hardcoded (keep both files honest and tiny).

- [ ] **Step 3: `RibbonSelect.tsx`** — compact `<select>` (reuse `@alexandria/components/form/Select` if its `size`/chrome fits a 28px-tall band — read its props; if not, a minimal native select styled by `ribbon.css` `.ribbon-select`): `value={control.value?.(ctx) ?? ''}`, options from `control.options?.(ctx) ?? []` with `t(labelKey)`, `onChange={(e) => control.onAction(ctx, e.target.value)}`, disabled handling, Tooltip wrap.

- [ ] **Step 4: `RibbonMenu.tsx`** — icon button that opens `@alexandria/components/ui/DropdownMenu` (read its props first) with items from `control.options(ctx)`; item click → `control.onAction(ctx, value)`.

- [ ] **Step 5: `ribbon.css`** — band structure (token colors only):

```css
/* Ribbon chrome — spec §1. Bar/band/tab colors all route through
   --theme-* tokens; sizing literals are chrome geometry. */
.ribbon { background: color-mix(in srgb, var(--theme-base-content) 4%, var(--theme-base-page)); }
.ribbon-tabs { display: flex; gap: 2px; padding: 0.25rem 0.5rem 0; }
.ribbon-tab { padding: 0.2rem 0.75rem; border-radius: var(--theme-radius-button) var(--theme-radius-button) 0 0;
    color: color-mix(in srgb, var(--theme-base-content) 60%, transparent); background: transparent; }
.ribbon-tab--active { background: color-mix(in srgb, var(--theme-base-content) 8%, var(--theme-base-page));
    color: var(--theme-base-content); font-weight: 600; }
.ribbon-band { display: flex; align-items: stretch; gap: 0; padding: 0.375rem 0.625rem;
    background: color-mix(in srgb, var(--theme-base-content) 8%, var(--theme-base-page));
    border-bottom: 1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent); }
.ribbon-group { display: flex; flex-direction: column; gap: 0.25rem; padding: 0 0.75rem;
    border-right: 1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent); }
.ribbon-group:first-child { padding-left: 0.125rem; }
.ribbon-group:last-of-type { border-right: none; }
.ribbon-group-controls { display: flex; gap: 0.25rem; align-items: center; flex: 1; }
.ribbon-group-label { font-size: 0.5625rem; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;
    color: color-mix(in srgb, var(--theme-base-content) 50%, transparent); }
.ribbon--slim .ribbon-group { flex-direction: row; align-items: center; }
.ribbon--slim .ribbon-group-label, .ribbon--slim .ribbon-ctl-label { display: none; }
.ribbon-ctl { display: inline-flex; flex-direction: column; align-items: center; gap: 0.125rem;
    min-width: 2rem; height: auto; padding: 0.25rem 0.375rem; }
.ribbon--slim .ribbon-ctl { flex-direction: row; }
.ribbon-ctl-label { font-size: 0.625rem; line-height: 1.1; max-width: 5.5rem; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
.ribbon-right { margin-left: auto; display: flex; align-items: center; gap: 0.25rem; }
.ribbon-band--overlay { position: absolute; left: 0; right: 0; z-index: 30;
    box-shadow: 0 4px 10px rgb(0 0 0 / 0.15); }
```

- [ ] **Step 6: `lang/en/ribbon.php`** (flat, `declare(strict_types=1)`, the useT-flat-keys comment like writing.php):

```php
return [
    'mode.slim' => 'Slim ribbon',
    'mode.comfortable' => 'Comfortable ribbon',
    'mode.collapse' => 'Collapse the ribbon',
    'mode.expand' => 'Pin the ribbon open',
];
```

- [ ] **Step 7:** app.css `@import '../../vendor/lonely-lights/alexandria-core/resources/css/components/ribbon.css';` (match the exact path style of the manuscript.css import) + HandleInertiaRequests `'ribbon' => $this->loadGroup('ribbon'),`. Run `cd alexandria-app; npm run build` → green; `vendor/bin/pint --dirty --format agent` core (lang file). Commit (controller).

---

### Task 4: The Ribbon renderer + modes

**Files:**
- Create: `alexandria-core/resources/js/ribbon/Ribbon.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState, useSyncExternalStore, type ReactNode } from 'react';

import useT from '@alexandria/hooks/useT';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { getRibbonTabs, subscribeRibbon } from './ribbonRegistry';
import useRibbonShortcuts from './useRibbonShortcuts';
import RibbonButton from './controls/RibbonButton';
import RibbonToggle from './controls/RibbonToggle';
import RibbonSelect from './controls/RibbonSelect';
import RibbonMenu from './controls/RibbonMenu';
import type { RibbonControl, RibbonMode, RibbonTab } from './types';

const MODE_STORAGE_KEY = 'alexandria.ribbon.mode';

function readMode(): RibbonMode {
    try {
        const stored = localStorage.getItem(MODE_STORAGE_KEY);
        if (stored === 'slim' || stored === 'collapsed' || stored === 'comfortable') {
            return stored;
        }
    } catch {
        // storage unavailable — session default
    }
    return 'comfortable';
}

interface RibbonProps<Ctx> {
    setKey: string;
    context: Ctx;
    /** Optional host content rendered in the tab row, before the tabs (e.g. a breadcrumb). */
    leading?: ReactNode;
}

/**
 * The app-level ribbon (spec §1): renders a registered tab set against
 * a host-provided context. Modes: comfortable (labeled groups), slim
 * (single icon row), collapsed (tabs only; clicking a tab overlays the
 * band until pointer leaves). Mode persists globally in localStorage.
 */
export default function Ribbon<Ctx>({ setKey, context, leading }: RibbonProps<Ctx>) {
    const t = useT();
    const tabs = useSyncExternalStore(subscribeRibbon, () => getRibbonTabs(setKey)) as RibbonTab<Ctx>[];
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [mode, setMode] = useState<RibbonMode>(readMode);
    const [overlayOpen, setOverlayOpen] = useState(false);

    useRibbonShortcuts(tabs, context);

    if (tabs.length === 0) {
        return null;
    }

    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

    function persistMode(next: RibbonMode): void {
        setMode(next);
        try {
            localStorage.setItem(MODE_STORAGE_KEY, next);
        } catch {
            // storage unavailable
        }
    }

    function onTabClick(id: string): void {
        setActiveTabId(id);
        if (mode === 'collapsed') {
            setOverlayOpen(true);
        }
    }

    const bandVisible = mode !== 'collapsed' || overlayOpen;
    const showLabels = mode === 'comfortable';

    return (
        <div className={`ribbon relative ${mode === 'slim' ? 'ribbon--slim' : ''}`}>
            <div className="ribbon-tabs" role="tablist">
                {leading}
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={tab.id === activeTab.id}
                        className={`ribbon-tab ${tab.id === activeTab.id ? 'ribbon-tab--active' : ''}`}
                        onClick={() => onTabClick(tab.id)}
                    >
                        {t(tab.labelKey)}
                    </button>
                ))}
            </div>

            {bandVisible && (
                <div
                    className={`ribbon-band ${mode === 'collapsed' ? 'ribbon-band--overlay' : ''}`}
                    onMouseLeave={() => mode === 'collapsed' && setOverlayOpen(false)}
                >
                    {activeTab.groups.map((group) => {
                        const visibleControls = group.controls.filter(
                            (control) => control.visible?.(context) ?? true,
                        );

                        if (visibleControls.length === 0) {
                            return null;
                        }

                        return (
                            <div key={group.id} className="ribbon-group">
                                <div className="ribbon-group-controls">
                                    {visibleControls.map((control) => renderControl(control, context, showLabels))}
                                </div>
                                {showLabels && <span className="ribbon-group-label">{t(group.labelKey)}</span>}
                            </div>
                        );
                    })}

                    <div className="ribbon-right">
                        <Tooltip content={t(mode === 'slim' ? 'ribbon.mode.comfortable' : 'ribbon.mode.slim')}>
                            <button
                                type="button"
                                className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                onClick={() => persistMode(mode === 'slim' ? 'comfortable' : 'slim')}
                            >
                                <i className={`fa-solid ${mode === 'slim' ? 'fa-up-right-and-down-left-from-center' : 'fa-down-left-and-up-right-to-center'}`} aria-hidden="true" />
                            </button>
                        </Tooltip>
                        <Tooltip content={t(mode === 'collapsed' ? 'ribbon.mode.expand' : 'ribbon.mode.collapse')}>
                            <button
                                type="button"
                                className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                onClick={() => persistMode(mode === 'collapsed' ? 'comfortable' : 'collapsed')}
                            >
                                <i className={`fa-solid ${mode === 'collapsed' ? 'fa-thumbtack' : 'fa-chevron-up'}`} aria-hidden="true" />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
}

function renderControl<Ctx>(control: RibbonControl<Ctx>, ctx: Ctx, showLabel: boolean) {
    switch (control.type) {
        case 'toggle':
            return <RibbonToggle key={control.id} control={control} ctx={ctx} showLabel={showLabel} />;
        case 'select':
            return <RibbonSelect key={control.id} control={control} ctx={ctx} />;
        case 'menu':
            return <RibbonMenu key={control.id} control={control} ctx={ctx} />;
        default:
            return <RibbonButton key={control.id} control={control} ctx={ctx} showLabel={showLabel} />;
    }
}
```

Implementation notes: `useSyncExternalStore` needs the snapshot function stable per setKey — the registry's snapshot cache provides that. Collapsed-mode band closes on `onMouseLeave` v1 (focus-leave refinement can come with the refine pass). The collapsed band overlays content (`.ribbon-band--overlay`), so the host needs `position: relative` on the ribbon's container — the component root carries `relative` already.

- [ ] **Step 2: Verify** — `npm run build` green, `npm run types:check` clean (nothing renders it yet — compile-time gate only; rendering proof is Plan 2's smokes).

- [ ] **Step 3: Commit** (controller).

---

### Task 5: Sweep

- [ ] Full Vitest run (`npx vitest run`) — all green incl. the 17 new ribbon tests
- [ ] `npm run build` + `npm run types:check`
- [ ] Token-usage vitest — sync once with `$env:UPDATE_USAGE='1'` if ribbon.css's tokens flag it, confirm clean
- [ ] Core `vendor/bin/pint --dirty --format agent` (lang file)
- [ ] Both `git status` clean after controller commits

## Self-Review (applied)

- Spec §1 coverage: types ✔ registry+extend ✔ renderer+modes ✔ a11y tablist/aria-pressed ✔ tooltips-with-shortcuts ✔. §2: parser/matcher/labels/conflicts/Mod-required ✔ (KeyTips explicitly future). §3–§6 are Plans 2–4 by design.
- Type consistency: `RibbonTabContribution` union used by both test and registry; `BoundShortcut` shared between shortcuts.ts and the hook; control renderer props identical across the four files.
- No placeholders: every code step carries full code; Select/Menu reference reading existing component props before choosing — that's reconnaissance, not deferral, with a concrete fallback specified.
