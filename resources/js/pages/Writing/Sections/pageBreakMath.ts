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
