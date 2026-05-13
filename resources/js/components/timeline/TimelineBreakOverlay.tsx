import type { TimeBreak } from "@alexandria/lib/timelineUtils";

type Orientation = "horizontal" | "vertical";

interface TimelineBreakOverlayProps {
    breaks: TimeBreak[];
    /** Pixel position where each break starts along the time axis. In
        horizontal mode this is the break's left edge; in vertical mode,
        the break's top edge. */
    breakLefts: number[];
    /** Horizontal offset for horizontal mode (usually laneHeaderSize).
        Vertical offset for vertical mode (usually the lane-header row
        height). Defaults to 0. */
    leftOffset?: number;
    /** Time-axis orientation. Horizontal (default) paints each break as
        a vertical strip spanning the full canvas height; vertical paints
        each as a horizontal band spanning the full canvas width. */
    orientation?: Orientation;
}

/* Build a single zigzag path for one break marker. The line oscillates
   between ~25% and ~75% of the cross-axis dimension, stepping across
   the long axis with `segments` teeth. The viewBox is normalized 0→100
   on both axes; preserveAspectRatio="none" stretches it to fit. For
   vertical orientation we swap the coord axes so the oscillation
   happens up/down while the line travels left→right. */
function buildZigzag(orientation: Orientation, segments: number = 50): string {
    const minor = 25; // oscillation min (%)
    const major = 75; // oscillation max (%)
    const step = 100 / segments;
    let path = orientation === "horizontal" ? `M ${minor},0` : `M 0,${minor}`;
    for (let i = 1; i <= segments; i++) {
        const along = i * step;
        const cross = i % 2 === 1 ? major : minor;
        path +=
            orientation === "horizontal"
                ? ` L ${cross},${along}`
                : ` L ${along},${cross}`;
    }
    return path;
}

/**
 * Full-canvas zigzag overlays for each detected time break. Render as
 * a child of the timeline's scroll canvas with `position: relative`
 * on the parent. Supports both orientations:
 *
 *   - **horizontal** (default): each break is a vertical strip
 *     spanning the full canvas height, positioned via `left`.
 *   - **vertical**: each break is a horizontal band spanning the full
 *     canvas width, positioned via `top`.
 */
export default function TimelineBreakOverlay({
    breaks,
    breakLefts,
    leftOffset = 0,
    orientation = "horizontal",
}: TimelineBreakOverlayProps) {
    const isHorizontal = orientation === "horizontal";
    return (
        <>
            {breaks.map((br, i) => {
                const positioning = isHorizontal
                    ? {
                          left: leftOffset + breakLefts[i],
                          top: 0,
                          bottom: 0,
                          width: br.compressedPx,
                          height: "100%" as const,
                      }
                    : {
                          top: leftOffset + breakLefts[i],
                          left: 0,
                          right: 0,
                          height: br.compressedPx,
                          width: "100%" as const,
                      };
                return (
                    <svg
                        key={i}
                        className="pointer-events-none absolute z-[5]"
                        preserveAspectRatio="none"
                        viewBox="0 0 100 100"
                        style={{
                            ...positioning,
                            color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
                        }}
                        aria-hidden="true"
                    >
                        <path
                            d={buildZigzag(orientation)}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                );
            })}
        </>
    );
}
