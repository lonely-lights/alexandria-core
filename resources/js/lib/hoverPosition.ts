import type { CSSProperties } from 'react';

/**
 * Compute smart positioning for a hover card based on viewport quadrant.
 * - Horizontal: left-align if trigger is in left half, right-align if in right half
 * - Vertical: below if in top half, above (using CSS bottom) if in bottom half
 */
export function computeHoverPosition(
    triggerRect: DOMRect,
    cardWidth: number,
    gap = 8,
): CSSProperties {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const isRightHalf = triggerRect.left > vw / 2;
    const isBottomHalf = (triggerRect.top + triggerRect.height / 2) > vh / 2;

    let left = isRightHalf
        ? triggerRect.right - cardWidth
        : triggerRect.left;
    if (left + cardWidth > vw - 16) left = vw - cardWidth - 16;
    if (left < 16) left = 16;

    return isBottomHalf
        ? { bottom: vh - triggerRect.top + gap, left }
        : { top: triggerRect.bottom + gap, left };
}
