/**
 * Workspace view-mode persistence — spec 2026-08-08
 * continuous-manuscript-scene-flow; widened 2026-08-28 outline-mode
 * Task 5 to add a third mode; widened again 2026-08-28 Beat Board
 * Task 4 to add a fourth.
 *
 * Per-work client-side storage for the manuscript view switcher:
 * 'continuous' streams every section in one scroll, 'focus' keeps the
 * one-section-at-a-time editor, 'outline' swaps the editor pane for the
 * full-pane structural outline (`OutlineView`), 'board' swaps it for the
 * spatial index-card Beat Board (`BoardView`). Key per work:
 * `alexandria.writing.view-mode:<workId>`.
 *
 * Mirrors `pages/Writing/panelMode.ts` — a pure module so Vitest can test
 * the helpers without a React runtime (localStorage tests use happy-dom
 * opt-in), with every storage touch wrapped so private-mode browsers
 * degrade to the default instead of throwing.
 */

/** The four manuscript view modes. */
export type WorkspaceViewMode = 'continuous' | 'focus' | 'outline' | 'board';

const MODES = new Set<string>(['continuous', 'focus', 'outline', 'board'] as const);
const KEY_PREFIX = 'alexandria.writing.view-mode';
const DEFAULT_MODE: WorkspaceViewMode = 'continuous';

/** Build the localStorage key for a given work id. */
export function viewModeKey(workId: number): string {
    return `${KEY_PREFIX}:${workId}`;
}

/**
 * Coerce a raw stored string to a valid WorkspaceViewMode.
 *
 * Anything unrecognized — a stale mode id, a hand-edited value, an
 * absent key — falls back to 'continuous', the default reading view.
 */
export function normalizeViewMode(
    value: string | null | undefined,
): WorkspaceViewMode {
    if (value !== null && value !== undefined && MODES.has(value)) {
        return value as WorkspaceViewMode;
    }

    return DEFAULT_MODE;
}

/** Read the persisted view mode for a work (defaults to 'continuous'). */
export function readViewMode(workId: number): WorkspaceViewMode {
    try {
        return normalizeViewMode(localStorage.getItem(viewModeKey(workId)));
    } catch {
        return DEFAULT_MODE;
    }
}

/** Persist the view mode for a work. Best-effort — failures are silent. */
export function writeViewMode(workId: number, mode: WorkspaceViewMode): void {
    try {
        localStorage.setItem(viewModeKey(workId), mode);
    } catch {
        // Best-effort.
    }
}
