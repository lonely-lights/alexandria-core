/**
 * Divider offsets (px from content top) for the print-layout pagination
 * preview — Stage 11 Slice 1. Pure geometry: one divider per full page
 * boundary strictly inside the content. Deterministic estimate only;
 * real pagination arrives with export.
 */
export function computePageBreaks(contentHeightPx: number, pageHeightPx: number): number[] {
    if (contentHeightPx <= 0 || pageHeightPx <= 0) {
        return [];
    }

    const breaks: number[] = [];
    for (let y = pageHeightPx; y < contentHeightPx; y += pageHeightPx) {
        breaks.push(y);
    }
    return breaks;
}

/** Manuscript-convention lines per page, mirroring the server analyzer family. */
export const LINES_PER_PAGE: Record<'prose' | 'screenplay', number> = {
    prose: 25,
    screenplay: 55,
};

/** US Letter, tall over wide: 11in / 8.5in. */
export const LETTER_ASPECT = 11 / 8.5;

/**
 * Page height for a sheet rendered `contentWidthPx` wide.
 *
 * The print-layout sheet IS a Letter page, so its height follows from
 * its width rather than from a line count. Counting lines is the
 * manuscript *metric* (25 lines to a page — still what the status bar
 * and reports estimate from), but as a visual guide it drew a boundary
 * roughly every half sheet, which reads as noise rather than as paper.
 *
 * Non-positive widths — an unmounted editor, or one inside a
 * `display: none` pane — yield 0, which `computePageBreaks` already
 * treats as "no pages".
 */
export function letterPageHeight(contentWidthPx: number): number {
    return contentWidthPx > 0 ? contentWidthPx * LETTER_ASPECT : 0;
}
