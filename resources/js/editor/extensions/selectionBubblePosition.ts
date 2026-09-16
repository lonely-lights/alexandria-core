import type { Editor } from '@tiptap/core';

/** `center` sits centered above the selection; `after` hugs its right edge. */
export type SelectionBubblePlacement = 'center' | 'after';

export interface SelectionBubblePosition {
    top: number;
    left: number;
}

/** Gap between the bubble's top edge and the selection's top line, in px. */
const BUBBLE_OFFSET_ABOVE_PX = 38;

/** Gap after the selection's right edge for the `after` placement, in px. */
const BUBBLE_GAP_AFTER_PX = 8;

/**
 * Viewport position for a selection bubble, or null when the selection
 * can't be measured (`coordsAtPos` throws during a doc replacement).
 *
 * `viewportTick` is not part of the math on purpose. It is the reactive
 * input that changes on scroll: the React Compiler memoizes this call on
 * its arguments, and with only `editor` and `range` (both unchanged by a
 * scroll) it kept returning the first measurement, so the bubble stayed
 * pinned while the selected text scrolled away.
 */
export function selectionBubblePosition(
    editor: Pick<Editor, 'view'>,
    range: { from: number; to: number },
    placement: SelectionBubblePlacement,
    viewportTick: number,
): SelectionBubblePosition | null {
    void viewportTick;

    try {
        const fromCoords = editor.view.coordsAtPos(range.from);
        const toCoords = editor.view.coordsAtPos(range.to);

        return {
            top: Math.min(fromCoords.top, toCoords.top) - BUBBLE_OFFSET_ABOVE_PX,
            left: placement === 'center'
                ? (fromCoords.left + toCoords.right) / 2
                : toCoords.right + BUBBLE_GAP_AFTER_PX,
        };
    } catch {
        return null;
    }
}
