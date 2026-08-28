/**
 * Ghost-layer "show plan" preference — outline-mode Task 6.
 *
 * Mirrors ManuscriptEditor's PRINT_LAYOUT_STORAGE_KEY /
 * readPrintLayoutPreference pair: a single localStorage boolean read
 * once on mount (Workspace.tsx) and flipped from the ribbon's View
 * tab. Unlike print layout, this defaults to TRUE — the ghost layer
 * (synopsis + beat checklist atop each section) is meant to be an
 * ambient companion to the outline, on until the writer turns it off.
 */

export const SHOW_PLAN_STORAGE_KEY = 'alexandria.writing.show-plan';

/** Read the persisted show-plan preference. Defaults to true — including
 *  when nothing is stored yet, and when localStorage throws or is
 *  unavailable (private browsing, SSR). */
export function readShowPlan(): boolean {
    try {
        // Inverted from readPrintLayoutPreference's `=== 'true'` check on
        // purpose: that preference defaults OFF, so anything but an exact
        // 'true' safely falls to false. This one defaults ON, so it's
        // anything-but-an-exact-'false' that falls to true — covering
        // "nothing stored" AND a corrupted/garbage value the same way.
        return localStorage.getItem(SHOW_PLAN_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

/** Persist the show-plan preference. Best-effort — private-mode failures are fine. */
export function writeShowPlan(value: boolean): void {
    try {
        localStorage.setItem(SHOW_PLAN_STORAGE_KEY, String(value));
    } catch {
        // Persistence is best-effort; private-mode failures are fine.
    }
}
