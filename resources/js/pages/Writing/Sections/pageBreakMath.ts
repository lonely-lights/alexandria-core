/**
 * Pagination geometry for the print-layout manuscript — Stage 11 Slice 1,
 * rebuilt at the 2026-08-08 flow checkpoint.
 *
 * Pages used to be drawn as an absolute overlay at fixed pixel offsets.
 * They are now real widget decorations sitting BETWEEN blocks, which
 * means the break has to land on a block boundary rather than wherever
 * a page height happens to fall — text cannot be cut in half by
 * something that occupies space in the flow.
 *
 * So the model is a greedy fill: walk the blocks, keep a running page
 * height, and start a new page at the first block that would overflow.
 * That is an approximation of Letter pagination, not a typesetting
 * engine — no line-level breaking, no widow/orphan control. Real
 * pagination arrives with export.
 */

/**
 * Indices of the blocks that START a new page.
 *
 * Greedy: a block goes on the current page unless it would overflow AND
 * the page already holds something. That second condition is what makes
 * a block taller than a whole page take a page of its own instead of
 * spinning — it can never be pushed forward to a page where it fits,
 * because no such page exists.
 *
 * Index 0 is therefore never returned: the first block has nothing to
 * be pushed off of.
 */
export function computeBlockBreaks(
    blockHeights: number[],
    pageHeightPx: number,
): number[] {
    if (pageHeightPx <= 0) {
        return [];
    }

    const breaks: number[] = [];
    let used = 0;

    for (let index = 0; index < blockHeights.length; index += 1) {
        const height = blockHeights[index];

        if (used > 0 && used + height > pageHeightPx) {
            breaks.push(index);
            used = height;

            continue;
        }

        used += height;
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
 * `display: none` pane — yield 0, which `computeBlockBreaks` already
 * treats as "no pages".
 */
export function letterPageHeight(contentWidthPx: number): number {
    return contentWidthPx > 0 ? contentWidthPx * LETTER_ASPECT : 0;
}

/* ── Band dispatch decisions ────────────────────────────────────────
   The other pure, testable half of pagination: deciding whether a
   freshly measured result is worth re-rendering. It lives here rather
   than in the extension so it can be exercised without a ProseMirror
   view — the mode-switch bug below is exactly the kind that hides in
   code only a browser can reach. */

/** What the rendered bands represent: `mode|pos,pos,…`. */
export function bandSignature(mode: string, positions: number[]): string {
    return `${mode}|${positions.join(',')}`;
}

/** The display mode a signature was produced for ('' when unknown). */
export function bandSignatureMode(signature: string): string {
    const separator = signature.indexOf('|');

    return separator === -1 ? '' : signature.slice(0, separator);
}

export interface BandDispatchState {
    /** Signature of the bands on screen now ('' before the first pass). */
    signature: string;
    /** The signature before that — the oscillation guard's memory. */
    previous: string;
}

/**
 * Should a newly measured result replace what is rendered?
 *
 * Three answers, in order:
 *
 *  1. identical to what is showing — no,
 *  2. a different DISPLAY MODE — always yes. The reader asked for this;
 *     it outranks every geometry heuristic. Skipping this check is what
 *     made tight→pages→tight stick on 'pages': the return trip computes
 *     the signature it had two steps ago, which the oscillation guard
 *     below reads as a flap and swallows,
 *  3. otherwise, no if it is the signature we just came FROM. Within one
 *     mode that means the geometry is trading between two stable
 *     answers (margin collapsing across a band is not perfectly
 *     reversible for blocks carrying a margin-top), and honouring it
 *     would loop forever.
 */
export function shouldDispatchBands(
    candidate: string,
    state: BandDispatchState,
): boolean {
    if (candidate === state.signature) {
        return false;
    }

    if (bandSignatureMode(candidate) !== bandSignatureMode(state.signature)) {
        return true;
    }

    return candidate !== state.previous;
}
