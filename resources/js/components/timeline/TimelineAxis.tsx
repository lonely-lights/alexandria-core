import { formatAxisLabel, type Year } from '@alexandria/lib/timelineUtils';
import type { TimelineZoomLevel } from '@alexandria/types/timeline';

interface TimelineAxisProps {
    /** Gridline year numbers produced by useTimelineModel. */
    gridLines: Year[];
    /** String→px positioning function from useTimelineModel. */
    dateToPos: (dateStr: string) => number;
    /** Active zoom, for label formatting. */
    zoom: TimelineZoomLevel;
    /** Total pixel width of the axis content area. */
    width: number;
    /** Axis row height in pixels. */
    height: number;
}

/**
 * Horizontal axis row — renders ticks + deduped labels for each
 * gridline. Designed to live inside a `sticky top-0` positioned
 * ancestor, with a sibling corner-spacer element to its left when
 * the timeline has a lane-header column.
 *
 * Labels are consecutive-deduped so huge segments at coarse zoom
 * (e.g. a 3-Ga pre-break span at decade zoom) don't repeat "4 Ga ago"
 * dozens of times — the tick still renders so structure is visible,
 * only the duplicate label is suppressed.
 */
export default function TimelineAxis({ gridLines, dateToPos, zoom, width, height }: TimelineAxisProps) {
    return (
        <div className="relative flex-shrink-0" style={{ width, height }}>
            {(() => {
                let lastLabel = '';
                return gridLines.map((year, i) => {
                    const left = dateToPos(String(year));
                    const label = formatAxisLabel(year, zoom);
                    const showLabel = label !== lastLabel;
                    if (showLabel) lastLabel = label;
                    return (
                        <div
                            key={i}
                            className="pointer-events-none absolute top-0 flex h-full flex-col justify-end"
                            style={{ left }}
                        >
                            {showLabel && (
                                <span className="whitespace-nowrap pl-1 pb-1 text-[10px] font-medium text-base-content/60">
                                    {label}
                                </span>
                            )}
                            <span className="block h-2 w-px bg-base-content/40" />
                        </div>
                    );
                });
            })()}
        </div>
    );
}
