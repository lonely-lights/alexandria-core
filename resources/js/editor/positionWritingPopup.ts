interface Viewport {
    left: number;
    top: number;
    width: number;
    height: number;
}
interface Anchor {
    left: number;
    top: number;
    bottom: number;
}

/** Fixed-position suggestions must fit the visual viewport, not the full page. */
export function positionWritingPopup(
    anchor: Anchor,
    viewport: Viewport,
    contentHeight: number,
) {
    const gap = 8;
    const leftEdge = viewport.left + gap;
    const topEdge = viewport.top + gap;
    const bottomEdge = viewport.top + viewport.height - gap;
    const width = Math.max(0, Math.min(320, viewport.width - gap * 2));
    const below = Math.max(0, bottomEdge - anchor.bottom - gap);
    const above = Math.max(0, anchor.top - gap - topEdge);
    const desired = Math.min(256, contentHeight);
    const useAbove = below < desired && above > below;
    const maxHeight = Math.max(
        0,
        Math.min(256, viewport.height - gap * 2, useAbove ? above : below),
    );
    const height = Math.min(desired, maxHeight);

    return {
        width,
        maxHeight,
        left: Math.max(
            leftEdge,
            Math.min(anchor.left, viewport.left + viewport.width - gap - width),
        ),
        top: Math.max(
            topEdge,
            Math.min(
                useAbove ? anchor.top - gap - height : anchor.bottom + gap,
                bottomEdge - height,
            ),
        ),
    };
}
