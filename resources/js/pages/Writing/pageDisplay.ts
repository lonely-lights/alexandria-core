/**
 * Page-display persistence — spec 2026-08-08
 * continuous-manuscript-scene-flow, owner round 4.
 *
 * How the print-layout manuscript shows a page boundary:
 *
 *  - 'tight'  — the text stays continuous, and each boundary is a grey
 *               rule across the paper with real air above and below it
 *               standing in for the bottom and top margins,
 *  - 'pages'  — the sheet visually ends and a new one begins, with a
 *               desk-coloured gap between them, the way a word
 *               processor shows print layout.
 *
 * A single global key rather than per-work: this is a preference about
 * how the writer likes to see paper, not a property of a manuscript.
 * That mirrors `PRINT_LAYOUT_STORAGE_KEY`, which it always appears
 * beside — the two only mean anything together.
 *
 * Pure module so Vitest can exercise the helpers without a React
 * runtime, with every storage touch wrapped so private-mode browsers
 * degrade to the default instead of throwing.
 */

/** The two ways a page boundary can be drawn. */
export type PageDisplayMode = 'tight' | 'pages';

const MODES = new Set<string>(['tight', 'pages'] as const);

export const PAGE_DISPLAY_STORAGE_KEY = 'alexandria.writing.page-display';

const DEFAULT_MODE: PageDisplayMode = 'tight';

/**
 * Coerce a raw stored string to a valid mode.
 *
 * Anything unrecognized — a stale value, a hand-edited key, an absent
 * one — falls back to 'tight', the quieter of the two.
 */
export function normalizePageDisplay(
    value: string | null | undefined,
): PageDisplayMode {
    if (value !== null && value !== undefined && MODES.has(value)) {
        return value as PageDisplayMode;
    }

    return DEFAULT_MODE;
}

/** Read the persisted page-display mode (defaults to 'tight'). */
export function readPageDisplay(): PageDisplayMode {
    try {
        return normalizePageDisplay(localStorage.getItem(PAGE_DISPLAY_STORAGE_KEY));
    } catch {
        return DEFAULT_MODE;
    }
}

/** Persist the page-display mode. Best-effort — failures are silent. */
export function writePageDisplay(mode: PageDisplayMode): void {
    try {
        localStorage.setItem(PAGE_DISPLAY_STORAGE_KEY, mode);
    } catch {
        // Best-effort.
    }
}
