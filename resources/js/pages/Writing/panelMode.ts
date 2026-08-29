/**
 * Panel mode persistence helpers — Stage 11.5 Task 4; extended Stage 12a;
 * extended outline-mode Task 7; extended Stage 9 (scoped revisions).
 *
 * Per-work client-side storage for the right-rail mode switcher
 * (Linked items · Notes · Comments · Outline · History + package-registered modes).
 * Key per work: `alexandria.writing.panel-mode:<workId>`.
 *
 * Designed as a pure module so Vitest can test the helpers without
 * a DOM or React runtime (localStorage tests use happy-dom opt-in).
 */

/**
 * The five built-in modes plus any id registered via sidebarModeRegistry.
 * The `(string & {})` tail preserves autocomplete for the literals while
 * accepting arbitrary registered ids.
 */
export type PanelMode = 'linked' | 'notes' | 'comments' | 'outline' | 'history' | (string & {});

const BUILT_IN_MODES = new Set<string>(['linked', 'notes', 'comments', 'outline', 'history'] as const);
const KEY_PREFIX = 'alexandria.writing.panel-mode';

/** Build the localStorage key for a given work id. */
export function panelModeKey(workId: number): string {
    return `${KEY_PREFIX}:${workId}`;
}

/**
 * Coerce a raw stored string to a valid PanelMode.
 *
 * Built-in modes ('linked' | 'notes' | 'comments' | 'outline') are always accepted.
 * A registered mode id is accepted only when it appears in allowedIds —
 * the caller supplies the ids whose gate currently resolves to 'visible'.
 * Unknown ids and ids absent from allowedIds (i.e. locked or hidden modes)
 * fall back to 'linked' so a downgraded user is never stranded.
 */
export function normalizePanelMode(
    value: string | null | undefined,
    allowedIds?: string[],
): PanelMode {
    if (value !== null && value !== undefined) {
        if (BUILT_IN_MODES.has(value)) {
            return value as PanelMode;
        }

        if (allowedIds !== undefined && allowedIds.includes(value)) {
            return value as PanelMode;
        }
    }

    return 'linked';
}

/** Read the persisted mode for a work (defaults to 'linked'). */
export function readPanelMode(workId: number, allowedIds?: string[]): PanelMode {
    try {
        return normalizePanelMode(localStorage.getItem(panelModeKey(workId)), allowedIds);
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
