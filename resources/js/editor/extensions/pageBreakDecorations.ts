import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

import type { PageDisplayMode } from '@alexandria/pages/Writing/pageDisplay';
import {
    bandSignature,
    bandSignatureMode,
    computeBlockBreaks,
    pageContentHeight,
    pageMarginHeight,
    shouldDispatchBands,
} from '@alexandria/pages/Writing/Sections/pageBreakMath';

/**
 * Real page breaks for the print-layout manuscript — spec 2026-08-08,
 * owner round 4.
 *
 * The previous pagination preview was an absolutely-positioned overlay:
 * it could draw a line at a page boundary but could never push the text
 * apart, so a "margin" was a label floating over prose. Simulated
 * margins and a genuine sheet-to-sheet gap both need to OCCUPY space,
 * which in ProseMirror means widget decorations sitting between
 * top-level blocks — text reflows around them natively, the caret skips
 * them, and the document is untouched.
 *
 * Because a widget takes space, a boundary can only land BETWEEN
 * blocks; a page break can no longer fall wherever 11 inches happens to
 * end. `computeBlockBreaks` does that fitting. This file is the bridge
 * between it and the DOM:
 *
 *  1. measure every top-level block's height (see `measurePageBreaks`),
 *  2. fit them into Letter-proportioned pages,
 *  3. translate the resulting block indices into document positions,
 *  4. dispatch a decoration-only transaction.
 *
 * Step 4 is the dangerous one: inserting widgets changes layout, layout
 * changes wake the measure pass, and a measure pass that always
 * dispatched would spin forever. Two guards prevent that — the measure
 * subtracts our own widgets back out so the numbers it feeds the fitter
 * describe the text alone, and a signature check means an unchanged
 * result never dispatches at all. See `measurePageBreaks`.
 */

/** Marks our own widget DOM so the measure pass can skip past it. */
export const PAGE_BREAK_ATTR = 'data-alex-page-break';

interface PageBreakState {
    decorations: DecorationSet;
    /** `mode|pos,pos,…` — what the current decorations represent. */
    signature: string;
    /** The signature before that, for the oscillation guard. */
    previous: string;
}

const EMPTY_STATE: PageBreakState = {
    decorations: DecorationSet.empty,
    signature: '',
    previous: '',
};

export const pageBreakPluginKey = new PluginKey<PageBreakState>(
    'alexandriaPageBreaks',
);

/**
 * One page boundary.
 *
 * Deliberately empty: the band is entirely CSS (see
 * `.alex-page-break--tight` / `--pages` in components/manuscript.css) so
 * its geometry lives beside the sheet's own padding, which it has to
 * bleed across. `contentEditable=false` keeps the caret out;
 * `aria-hidden` keeps it out of the accessibility tree, where an
 * estimated page boundary is noise — the status bar carries the count.
 */
function buildBand(mode: PageDisplayMode, marginPx: number): HTMLElement {
    const band = document.createElement('div');

    band.setAttribute(PAGE_BREAK_ATTR, mode);
    band.setAttribute('aria-hidden', 'true');
    band.contentEditable = 'false';
    band.className = `alex-page-break alex-page-break--${mode}`;
    applyBandMargins(band, marginPx);

    return band;
}

/**
 * The proportional page margins, delivered as inline custom properties.
 * CSS owns the band's structure; this arithmetic (width / 8.5) belongs
 * with the fitter so the visual margins and the page math can never
 * disagree. Re-applied to every live band on each measure pass, since a
 * pure width change re-measures without re-dispatching decorations.
 */
function applyBandMargins(band: HTMLElement, marginPx: number): void {
    band.style.setProperty('--alex-page-margin-top', `${marginPx}px`);
    band.style.setProperty('--alex-page-margin-bottom', `${marginPx}px`);
}

export interface MeasurePageBreaksOptions {
    view: EditorView;
    mode: PageDisplayMode;
    /** Teardown switch: false clears every band (kept for future gating —
     *  since the ruler-only ruling, callers pass true whenever mounted). */
    enabled: boolean;
    /** Side margin in proportional inches (draggable via the ruler). */
    marginXIn?: number;
}

/**
 * Write the sheet's REAL padding — the page margins, in proportional
 * inches of its own width — as inline custom properties.
 *
 * This is what makes the text honor the margins the ruler and the
 * bands advertise: the stylesheet's rem paddings are only the no-JS
 * fallback, and this single writer keeps sheet, ruler, bands, and
 * fitter derived from the same arithmetic. Also used by the screenplay
 * surface, which has no pagination but the same paper.
 */
export function applySheetMargins(dom: HTMLElement, marginXIn: number): void {
    const width = dom.clientWidth;

    if (width <= 0) {
        return;
    }

    const padX = (width * marginXIn) / 8.5;
    const padY = pageMarginHeight(width);

    dom.style.setProperty('--alex-sheet-pad-x', `${padX}px`);
    dom.style.setProperty('--alex-page-margin-top', `${padY}px`);
    dom.style.setProperty('--alex-page-margin-bottom', `${padY}px`);
}

/**
 * Re-measure the document and dispatch the resulting bands.
 *
 * Called from outside the plugin (debounced after edits, and on resize)
 * because it reads layout — doing that inside `apply` would measure a
 * DOM that has not been updated for the transaction yet.
 *
 * Heights come from `offsetTop` deltas rather than each block's own
 * `offsetHeight`, so collapsed margins between blocks are counted once,
 * exactly as the browser lays them out. Any of our own bands sitting in
 * a gap are subtracted back out — without that, inserting a band would
 * inflate the gap it sits in, push the next break earlier, insert
 * another band, and so on.
 *
 * `offsetTop` / `offsetHeight` / `clientWidth` are all unzoomed layout
 * pixels, so the arithmetic stays self-consistent under the workspace's
 * `zoom` control.
 */
export function measurePageBreaks({
    view,
    mode,
    enabled,
    marginXIn = 1,
}: MeasurePageBreaksOptions): void {
    const state = pageBreakPluginKey.getState(view.state) ?? EMPTY_STATE;
    const dom = view.dom as HTMLElement;

    if (!enabled) {
        /* Ask the decorations, not the signature: an edit clears the
           signature while leaving the mapped bands in place, so a
           signature check here would leave them stranded on screen when
           print layout is switched off after typing. */
        if (state.decorations.find().length > 0) {
            commit(view, DecorationSet.empty, '', state.signature);
        }

        return;
    }

    /* A page holds what fits BETWEEN its margins, not a full sheet of
       text. The sheet's rendered width IS "8.5 inches" (print layout is
       a ruler toggle only — it never reshapes the sheet), so the page
       model is proportional: 9in of content and two 1in margins, all
       derived from the same width. Every boundary band re-spends the
       margins — bottom margin above the break, top margin below. */
    /* The sheet's padding first: text reflows against the true margins
       BEFORE this pass measures block heights, so the fitting below
       sees the geometry the reader sees. Same-value writes are no-ops
       to layout, so this doesn't thrash. */
    applySheetMargins(dom, marginXIn);

    const marginPx = pageMarginHeight(dom.clientWidth);
    const pageHeight = pageContentHeight(dom.clientWidth);

    if (pageHeight <= 0) {
        return;
    }

    /* Keep live bands' margins tracking the current width: a resize
       that moves no break positions never re-dispatches decorations,
       so the widgets on screen would otherwise keep stale margins. */
    for (const band of dom.querySelectorAll<HTMLElement>(`[${PAGE_BREAK_ATTR}]`)) {
        applyBandMargins(band, marginPx);
    }

    /* Split the rendered children into real blocks and our bands,
       remembering how much band sits immediately before each block. */
    const blocks: HTMLElement[] = [];
    const bandBefore = new Map<HTMLElement, number>();
    let pendingBand = 0;

    for (const child of Array.from(dom.children)) {
        const element = child as HTMLElement;

        if (element.hasAttribute(PAGE_BREAK_ATTR)) {
            pendingBand += element.offsetHeight;

            continue;
        }

        bandBefore.set(element, pendingBand);
        pendingBand = 0;
        blocks.push(element);
    }

    /* The DOM and the doc must line up 1:1 for index→position mapping to
       mean anything. A node view that renders differently would silently
       misplace every band, so bail rather than guess. */
    if (blocks.length !== view.state.doc.childCount) {
        return;
    }

    const heights = blocks.map((block, index) => {
        const next = blocks[index + 1];

        // The last block has no following sibling to measure against, so
        // its trailing margin goes uncounted — it only ever affects
        // whether a final short page exists.
        if (next === undefined) {
            return block.offsetHeight;
        }

        return next.offsetTop - block.offsetTop - (bandBefore.get(next) ?? 0);
    });

    const starts = new Set(computeBlockBreaks(heights, pageHeight));
    const positions: number[] = [];

    view.state.doc.forEach((_node, offset, index) => {
        if (starts.has(index)) {
            positions.push(offset);
        }
    });

    const signature = bandSignature(mode, positions);

    if (!shouldDispatchBands(signature, state)) {
        return;
    }

    const decorations = DecorationSet.create(
        view.state.doc,
        positions.map((pos) =>
            Decoration.widget(pos, () => buildBand(mode, marginPx), {
                side: -1,
                key: `page-break-${pos}-${mode}`,
            }),
        ),
    );

    /* A mode change resets the oscillation memory: the signature we are
       leaving describes different chrome entirely, so keeping it as
       "the one we just came from" would arm the guard against a
       perfectly legitimate switch back. */
    const modeChanged =
        bandSignatureMode(signature) !== bandSignatureMode(state.signature);

    commit(view, decorations, signature, modeChanged ? '' : state.signature);
}

/** Dispatch a decoration-only transaction, invisible to undo. */
function commit(
    view: EditorView,
    decorations: DecorationSet,
    signature: string,
    previous: string,
): void {
    view.dispatch(
        view.state.tr
            .setMeta(pageBreakPluginKey, { decorations, signature, previous })
            .setMeta('addToHistory', false),
    );
}

export const PageBreakDecorations = Extension.create({
    name: 'alexandriaPageBreaks',

    addProseMirrorPlugins() {
        return [
            new Plugin<PageBreakState>({
                key: pageBreakPluginKey,

                state: {
                    init: () => EMPTY_STATE,

                    apply(tr, value) {
                        const meta = tr.getMeta(pageBreakPluginKey) as
                            | PageBreakState
                            | undefined;

                        if (meta !== undefined) {
                            return meta;
                        }

                        if (!tr.docChanged) {
                            return value;
                        }

                        /* Keep the bands roughly in place while the writer
                           types, but drop the signatures: the positions
                           they described belong to the old document, and a
                           stale match would suppress the next real update. */
                        return {
                            decorations: value.decorations.map(tr.mapping, tr.doc),
                            signature: '',
                            previous: '',
                        };
                    },
                },

                props: {
                    decorations(state) {
                        return pageBreakPluginKey.getState(state)?.decorations;
                    },
                },
            }),
        ];
    },
});
