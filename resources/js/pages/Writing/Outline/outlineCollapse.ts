/**
 * Outline collapse view-model helpers — owner request, 2026-08-28
 * walkthrough. Pure so Vitest covers them without a DOM.
 *
 * Collapse is RENDER-ONLY state: the full row array stays intact in the
 * sync layer (saves always serialize the complete surviving tree), and
 * a collapsed row simply hides its contiguous subtree slice — and its
 * own beats — from the pane. The collapsed-key set persists per work in
 * localStorage so a shaped view survives a reload.
 */

import type { OutlineRow } from './outlineTypes';

/** True when the row at `index` has anything nested under it — child
 *  rows (the next row is deeper) or beats of its own. */
export function rowHasNested(rows: OutlineRow[], index: number): boolean {
    const row = rows[index];
    const next = rows[index + 1];

    return (next !== undefined && next.depth > row.depth) || row.beats.length > 0;
}

/** The rows the pane should render given the collapsed-key set: a
 *  collapsed row stays visible itself, but every row inside its subtree
 *  is hidden — including subtrees of nested collapsed rows. */
export function visibleOutlineRows(
    rows: OutlineRow[],
    collapsed: ReadonlySet<string>,
): OutlineRow[] {
    const visible: OutlineRow[] = [];
    let hideDeeperThan: number | null = null;

    for (const row of rows) {
        if (hideDeeperThan !== null && row.depth > hideDeeperThan) {
            continue;
        }

        hideDeeperThan = null;
        visible.push(row);

        if (collapsed.has(row.key)) {
            hideDeeperThan = row.depth;
        }
    }

    return visible;
}

const STORAGE_PREFIX = 'alexandria.writing.outline-collapsed';

/** Read the persisted collapsed-key set for one work. Best-effort — a
 *  missing/corrupt entry or a throwing storage yields an empty set. */
export function readCollapsedKeys(workSlug: string): Set<string> {
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}:${workSlug}`);
        const parsed: unknown = raw === null ? [] : JSON.parse(raw);

        return new Set(Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : []);
    } catch {
        return new Set();
    }
}

/** Persist the collapsed-key set for one work. Best-effort. */
export function writeCollapsedKeys(workSlug: string, collapsed: ReadonlySet<string>): void {
    try {
        localStorage.setItem(`${STORAGE_PREFIX}:${workSlug}`, JSON.stringify([...collapsed]));
    } catch {
        // Persistence is a convenience; private-mode failures are fine.
    }
}
