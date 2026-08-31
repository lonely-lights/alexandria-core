/**
 * Sections binder open/collapsed persistence — Devices & Tropes rework 2
 * (docked binder replaces the floating Navigator overlay, owner ruling
 * 2026-08-29).
 *
 * Per-work client-side storage for whether the left sections binder is
 * expanded (a docked column at the workspace's xl layout breakpoint, a
 * floating overlay below it) or collapsed to its slim icon rail. Key
 * per work: `alexandria.writing.structure-open:<workId>`.
 *
 * Mirrors `pages/Writing/panelMode.ts` / `pages/Writing/Flow/viewMode.ts`
 * — a pure module so Vitest can test the helpers without a React runtime
 * (localStorage tests use happy-dom opt-in), with every storage touch
 * wrapped so private-mode browsers degrade to the default instead of
 * throwing.
 */

const KEY_PREFIX = 'alexandria.writing.structure-open';
const DEFAULT_OPEN = true;

/** Build the localStorage key for a given work id. */
export function structureOpenKey(workId: number): string {
    return `${KEY_PREFIX}:${workId}`;
}

/** Read the persisted binder open state for a work (defaults to open). */
export function readStructureOpen(workId: number): boolean {
    try {
        const stored = localStorage.getItem(structureOpenKey(workId));

        return stored === null ? DEFAULT_OPEN : stored !== 'false';
    } catch {
        return DEFAULT_OPEN;
    }
}

/** Persist the binder open state for a work. Best-effort — private-mode failures are silent. */
export function writeStructureOpen(workId: number, open: boolean): void {
    try {
        localStorage.setItem(structureOpenKey(workId), String(open));
    } catch {
        // Best-effort.
    }
}
