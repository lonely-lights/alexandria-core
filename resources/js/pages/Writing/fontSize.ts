/**
 * Manuscript base font size — spec 2026-08-08, owner round 5.
 *
 * The size of the manuscript's body text, in points. This is a BASE
 * size for the whole document, not a selection-level format: the
 * sections are stored as wiki markup, which has no syntax for a size
 * span, so per-selection sizing has to wait for a format that can
 * carry it.
 *
 * `PRESETS` is Word's standard dropdown ladder — what the picker
 * OFFERS. It is deliberately not the validation set: the control is a
 * combo box, so a writer can type 13 or 37 and have it stick.
 * `clampFontSize` is the gate for typed input, `normalizeFontSize` the
 * gate for whatever comes back out of storage.
 *
 * Pure module (mirrors pageDisplay.ts) so Vitest can exercise the
 * helpers without a React runtime, with every storage touch wrapped so
 * private-mode browsers degrade to the default instead of throwing.
 */

export const FONT_SIZE_STORAGE_KEY = 'alexandria.writing.font-size';

/**
 * 12pt is the manuscript convention AND exactly 16px — what the sheet
 * inherited before this preference existed — so the default renders
 * today's documents unchanged.
 */
export const DEFAULT_FONT_SIZE = '12';

/** Word's standard font-size dropdown. Offered, not enforced. */
export const FONT_SIZE_PRESETS = [
    '8',
    '9',
    '10',
    '11',
    '12',
    '14',
    '16',
    '18',
    '20',
    '22',
    '24',
    '26',
    '28',
    '36',
    '48',
    '72',
];

/**
 * Usable range for typed input.
 *
 * Word itself allows 1–1638pt. Nothing outside 6–96 is legible or
 * useful on an 8.5in sheet — below 6 the text is unreadable, above 96
 * a single word overflows the line — so the combo clamps rather than
 * honouring a fat-fingered 720.
 */
export const FONT_SIZE_MIN = 6;
export const FONT_SIZE_MAX = 96;

/**
 * Clamp typed input to the usable range.
 *
 * Anything unparseable falls back to the default rather than throwing —
 * the combo box already declines to commit empty or non-numeric input,
 * so reaching here with garbage means something else went wrong.
 */
export function clampFontSize(value: string | null | undefined): string {
    const parsed = Number.parseInt(String(value ?? ''), 10);

    if (!Number.isFinite(parsed)) {
        return DEFAULT_FONT_SIZE;
    }

    return String(Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed)));
}

/**
 * Coerce a stored value to a usable size.
 *
 * Unlike `clampFontSize`, an out-of-range stored value is treated as
 * corrupt rather than clamped: it can only have got there by hand, and
 * silently rewriting it to a boundary would hide the problem.
 */
export function normalizeFontSize(value: string | null | undefined): string {
    if (value === null || value === undefined || !/^\d+$/.test(value)) {
        return DEFAULT_FONT_SIZE;
    }

    const parsed = Number.parseInt(value, 10);

    return parsed >= FONT_SIZE_MIN && parsed <= FONT_SIZE_MAX
        ? String(parsed)
        : DEFAULT_FONT_SIZE;
}

/** Read the persisted base font size (defaults to 12pt). */
export function readFontSize(): string {
    try {
        return normalizeFontSize(localStorage.getItem(FONT_SIZE_STORAGE_KEY));
    } catch {
        return DEFAULT_FONT_SIZE;
    }
}

/** Persist the base font size. Best-effort — failures are silent. */
export function writeFontSize(value: string): void {
    try {
        localStorage.setItem(FONT_SIZE_STORAGE_KEY, value);
    } catch {
        // Best-effort.
    }
}
