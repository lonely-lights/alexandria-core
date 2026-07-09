/**
 * Panel mode persistence helpers — Stage 11.5 Task 4.
 *
 * Per-work client-side storage for the right-rail mode switcher
 * (Linked items · Notes · Comments). Key per work:
 * `alexandria.writing.panel-mode:<workId>`.
 *
 * Designed as a pure module so Vitest can test the helpers without
 * a DOM or React runtime (localStorage tests use happy-dom opt-in).
 */

export type PanelMode = 'linked' | 'notes' | 'comments';

const VALID_MODES = new Set<string>(['linked', 'notes', 'comments'] as const);
const KEY_PREFIX = 'alexandria.writing.panel-mode';

/** Build the localStorage key for a given work id. */
export function panelModeKey(workId: number): string {
    return `${KEY_PREFIX}:${workId}`;
}

/**
 * Coerce a raw stored string to a valid PanelMode.
 * Defaults to 'linked' for null, undefined, or unrecognised values.
 */
export function normalizePanelMode(value: string | null | undefined): PanelMode {
    if (value !== null && value !== undefined && VALID_MODES.has(value)) {
        return value as PanelMode;
    }

    return 'linked';
}

/** Read the persisted mode for a work (defaults to 'linked'). */
export function readPanelMode(workId: number): PanelMode {
    try {
        return normalizePanelMode(localStorage.getItem(panelModeKey(workId)));
    } catch {
        return 'linked';
    }
}

/** Persist the mode for a work. Best-effort — private-mode failures are silent. */
export function writePanelMode(workId: number, mode: PanelMode): void {
    try {
        localStorage.setItem(panelModeKey(workId), mode);
    } catch {
        // Best-effort.
    }
}
