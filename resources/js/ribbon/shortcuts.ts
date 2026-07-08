import { resolveGate } from './ribbonGates';
import type { RibbonControl, RibbonGates, RibbonTab } from './types';

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

/** Visible, gate-allowed controls (per ctx + gates) that declare a shortcut. */
export function collectShortcuts<Ctx>(tabs: RibbonTab<Ctx>[], ctx: Ctx, gates?: RibbonGates): BoundShortcut<Ctx>[] {
    const bound: BoundShortcut<Ctx>[] = [];

    for (const tab of tabs) {
        for (const group of tab.groups) {
            for (const control of group.controls) {
                if (control.shortcut === undefined) continue;
                if (control.visible !== undefined && !control.visible(ctx)) continue;
                if (resolveGate(control.requires, gates) !== 'visible') continue;

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
