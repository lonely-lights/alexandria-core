/**
 * Side-margin preference — spec 2026-08-08, owner checkpoint 2026-08-09.
 *
 * The page model is proportional (the sheet's rendered width IS "8.5
 * inches"), and the writer can drag the ruler's margin handles the way
 * Word allows, so the side margin is a number of proportional inches —
 * default 1, the Word/Shunn standard. Top and bottom margins stay fixed
 * at 1in; the vertical ruler that could have dragged them is retired.
 *
 * Global, like the other paper preferences: how someone likes their
 * margins is about the writer, not the work.
 */

export const MARGIN_X_STORAGE_KEY = 'alexandria.writing.margin-x';

export const DEFAULT_MARGIN_X_IN = 1;

/** Word clamps hard too — nothing readable lives outside this range. */
export const MARGIN_X_MIN_IN = 0.25;
export const MARGIN_X_MAX_IN = 2;

/** Clamp any candidate (typed, dragged, stored) to the usable range. */
export function normalizeMarginXIn(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

    if (!Number.isFinite(parsed)) {
        return DEFAULT_MARGIN_X_IN;
    }

    return Math.min(MARGIN_X_MAX_IN, Math.max(MARGIN_X_MIN_IN, parsed));
}

/** Read the persisted side margin, in proportional inches. */
export function readMarginXIn(): number {
    try {
        return normalizeMarginXIn(localStorage.getItem(MARGIN_X_STORAGE_KEY));
    } catch {
        return DEFAULT_MARGIN_X_IN;
    }
}

/** Persist the side margin. Best-effort — failures are silent. */
export function writeMarginXIn(value: number): void {
    try {
        localStorage.setItem(MARGIN_X_STORAGE_KEY, String(normalizeMarginXIn(value)));
    } catch {
        // Best-effort.
    }
}

/**
 * The ruler announces drags upward through a window event rather than
 * threading a callback up six component layers — the same idiom as the
 * comment-anchor and logo-mark events.
 */
export const MARGIN_X_EVENT = 'alexandria:margin-x-change';

export interface MarginXEventDetail {
    marginXIn: number;
    /** True on pointer-up — the value should persist. */
    commit: boolean;
}
