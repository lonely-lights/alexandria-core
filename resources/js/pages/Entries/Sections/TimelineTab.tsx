import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useDateFormatters } from '@alexandria/lib/formatDate';
import {
    ZOOM_INDEX, PX_PER_UNIT, ITEM_ROW_HEIGHT, LANE_PADDING, MIN_LABEL_PX,
    gridUnitYears,
    layoutItems, formatEntryDate, parseYear,
    type DateFmt,
} from '@alexandria/lib/timelineUtils';
import { useTimelineModel } from '@alexandria/lib/useTimelineModel';
import TimelineAxis from '@alexandria/components/timeline/TimelineAxis';
import TimelineBreakOverlay from '@alexandria/components/timeline/TimelineBreakOverlay';
import Tooltip from '@alexandria/components/ui/Tooltip';
import EntryLink from '@alexandria/components/entries/EntryLink';
import type { TimelineEntry, TimelineZoomLevel } from '@alexandria/types/timeline';
import { ZOOM_LEVELS } from '@alexandria/types/timeline';

interface TimelineEpoch {
    event_type: string;
    date: string;
    label: string;
}

interface TimelineTabProps {
    events: TimelineEntry[];
    epoch: TimelineEpoch | null;
}

/* ─── Elapsed time calculation ─── */

function calcElapsed(epochDate: string, eventDate: string, originLabel: string): string {
    const ep = new Date(epochDate);
    const event = new Date(eventDate);
    const diffMs = event.getTime() - ep.getTime();

    const totalDays = Math.floor(Math.abs(diffMs) / 86_400_000);
    const years = Math.floor(totalDays / 365.25);
    const remainingDays = Math.floor(totalDays - years * 365.25);
    const sign = diffMs < 0 ? '-' : '';

    if (years === 0 && remainingDays === 0) return originLabel;
    if (years === 0) return `${sign}${remainingDays}d`;
    if (remainingDays === 0) return `${sign}${years}y`;
    return `${sign}${years}y ${remainingDays}d`;
}

/* ─── Tooltip ─── */

function EntryTooltipContent({ entry, fmtDate }: { entry: TimelineEntry; fmtDate: DateFmt }): ReactNode {
    return (
        <div className="max-w-xs space-y-1 text-left">
            <div className="text-xs font-semibold">{entry.name}</div>
            <div className="text-[10px] opacity-80">{formatEntryDate(entry, fmtDate)}</div>
            {entry.group_key && (
                <div className="text-[10px] opacity-60">
                    <i className="fa-solid fa-tag mr-1" />{entry.group_key}
                </div>
            )}
            {entry.summary && (
                <div className="line-clamp-3 pt-0.5 text-[10px] opacity-70">{entry.summary}</div>
            )}
        </div>
    );
}

/* ─── Component ─── */

type ViewMode = 'timeline' | 'table';

export default function TimelineTab({ events, epoch }: TimelineTabProps) {
    const { fmtSmart } = useDateFormatters();
    const [viewMode, setViewMode] = useState<ViewMode>('timeline');
    const [zoom, setZoom] = useState<TimelineZoomLevel>('decade');
    const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);

    if (events.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-base-content/10 py-16 text-center">
                <i className="fa-solid fa-timeline mb-3 text-3xl text-base-content/10" />
                <p className="text-sm text-base-content/30">No timeline events</p>
            </div>
        );
    }

    // Sort events by date for table view
    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? '')),
        [events],
    );

    // Shared model — gives us year-range, gridlines, break detection,
    // and the break-aware positioner in one call. Uses 'loose' padding
    // (~15% of range) since Entries timelines tend to be tightly
    // clustered where extra breathing room reads better than the 1-unit
    // cap the Blueprint timeline prefers.
    const model = useTimelineModel({ entries: events, zoom, paddingMode: 'loose' });
    const { dateToPos, totalPx, gridLines, breaks, breakLefts } = model;

    const { items, rowCount } = useMemo(
        () => layoutItems(events, dateToPos),
        [events, dateToPos],
    );

    const canvasHeight = rowCount * ITEM_ROW_HEIGHT + LANE_PADDING * 2;

    // Auto-detect zoom on initial load only
    const hasAutoZoomed = useRef(false);
    useEffect(() => {
        if (hasAutoZoomed.current || events.length === 0) return;
        hasAutoZoomed.current = true;

        let min = Infinity, max = -Infinity;
        for (const e of events) {
            if (e.start_date) {
                const y = parseYear(e.start_date);
                if (isNaN(y)) continue;
                if (y < min) min = y;
                const endY = e.end_date ? parseYear(e.end_date) : y;
                if (!isNaN(endY) && endY > max) max = endY;
            }
        }
        if (!isFinite(min) || !isFinite(max)) return;
        const rangeYears = max - min;
        for (const level of [...ZOOM_LEVELS].reverse()) {
            const unitCount = rangeYears / gridUnitYears(level.key);
            const totalWidth = unitCount * PX_PER_UNIT[level.key];
            if (totalWidth >= 600 && totalWidth <= 4000) {
                setZoom(level.key);
                return;
            }
        }
    }, [events]);

    function zoomIn() {
        const idx = ZOOM_INDEX[zoom];
        if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1].key);
    }

    function zoomOut() {
        const idx = ZOOM_INDEX[zoom];
        if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1].key);
    }

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
                <span className="badge badge-secondary gap-1 text-xs h-6">
                    <i className="fa-solid fa-clock-rotate-left text-[9px] text-secondary-content/70" />
                    {events.length} {events.length === 1 ? 'event' : 'events'}
                </span>

                {/* View toggle */}
                <div className="flex overflow-hidden rounded-lg border border-base-content/10">
                    <button
                        type="button"
                        onClick={() => setViewMode('timeline')}
                        className={`btn btn-xs gap-1 rounded-none border-0 ${viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <i className="fa-solid fa-timeline text-[10px]" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`btn btn-xs gap-1 rounded-none border-0 ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <i className="fa-solid fa-table-list text-[10px]" />
                    </button>
                </div>

                {/* Zoom controls (timeline only) */}
                {viewMode === 'timeline' && (
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={zoomIn} className="btn btn-ghost btn-xs" title="Zoom in">
                            <i className="fa-solid fa-magnifying-glass-plus text-xs" />
                        </button>
                        <span className="min-w-[4.5rem] text-center text-xs text-base-content/50">{ZOOM_LEVELS[ZOOM_INDEX[zoom]].label}</span>
                        <button type="button" onClick={zoomOut} className="btn btn-ghost btn-xs" title="Zoom out">
                            <i className="fa-solid fa-magnifying-glass-minus text-xs" />
                        </button>
                    </div>
                )}
            </div>

            {/* Timeline View */}
            {viewMode === 'timeline' && (
                <div className="overflow-auto rounded-xl border border-base-content/10 bg-base-100">
                    <div className="relative" style={{ minWidth: totalPx + 40 }}>
                        {/* Shared zigzag overlay — compresses huge gaps
                            (or long range interiors) into a jagged line. */}
                        <TimelineBreakOverlay breaks={breaks} breakLefts={breakLefts} />

                        {/* Axis — shared component, offset 16px right of
                            the content area to match the `ml-4` margin
                            on the events row. */}
                        <div className="sticky top-0 z-20 h-8 border-b border-base-content/10 bg-base-200/80 backdrop-blur-sm">
                            <div className="relative h-full pl-4">
                                <TimelineAxis gridLines={gridLines} dateToPos={dateToPos} zoom={zoom} width={totalPx} height={32} />
                            </div>
                        </div>

                        {/* Events */}
                        <div className="relative ml-4" style={{ height: canvasHeight }}>
                            {gridLines.map((year, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 h-full border-l border-base-content/5"
                                    style={{ left: dateToPos(String(year)) }}
                                />
                            ))}

                            {items.map((item) => {
                                const left = dateToPos(item.entry.start_date!);
                                const isRange = !!item.entry.end_date;
                                const rawWidth = isRange ? dateToPos(item.entry.end_date!) - left : 0;
                                const width = isRange ? Math.max(rawWidth, MIN_LABEL_PX) : 0;
                                const top = LANE_PADDING + item.row * ITEM_ROW_HEIGHT;
                                const isHovered = hoveredEntry === item.entry.id;

                                // Both range and point entries render as
                                // dot + label so the entry-side Timeline tab
                                // matches the blueprint-side TimelineView's
                                // affordance. Range entries get a thin
                                // horizontal bar drawn behind the dot to
                                // visualise duration without forcing the
                                // label inside a pill that shrinks to nothing
                                // on small ranges.
                                return (
                                    <div
                                        key={item.entry.id}
                                        className={`group absolute ${isHovered ? 'z-30' : 'z-10'}`}
                                        style={{ left, top }}
                                        onMouseEnter={() => setHoveredEntry(item.entry.id)}
                                        onMouseLeave={() => setHoveredEntry(null)}
                                    >
                                        {isRange && width > 0 && (
                                            <span
                                                className="pointer-events-none absolute left-1.5 top-[5px] h-0.5 rounded-full bg-primary/60"
                                                style={{ width }}
                                                aria-hidden="true"
                                            />
                                        )}
                                        {isRange && width > 4 && (
                                            <span
                                                className="pointer-events-none absolute h-3 w-3 rounded-full border-2 border-base-100 bg-primary shadow-sm"
                                                style={{ left: width, top: 0 }}
                                                aria-hidden="true"
                                            />
                                        )}
                                        <Tooltip content={<EntryTooltipContent entry={item.entry} fmtDate={fmtSmart} />} placement="top" delay={200}>
                                            <a
                                                href={item.entry.url}
                                                className="relative flex items-center gap-1.5 no-underline text-inherit hover:text-inherit"
                                            >
                                                <span
                                                    className={`h-3 w-3 flex-shrink-0 rounded-full border-2 border-base-100 bg-primary shadow-sm transition-transform ${isHovered ? 'scale-150' : ''}`}
                                                    aria-hidden="true"
                                                />
                                                <span className={`whitespace-nowrap text-[10px] font-medium transition-opacity ${isHovered ? 'opacity-100' : 'opacity-70'}`}>
                                                    {item.entry.name}
                                                </span>
                                            </a>
                                        </Tooltip>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="overflow-auto rounded-xl border border-base-content/10 bg-base-100">
                    <table className="table table-sm w-full">
                        <thead>
                            <tr className="border-b border-base-content/10 bg-base-200/50">
                                <th className="text-xs font-medium text-base-content/50">Event</th>
                                <th className="text-xs font-medium text-base-content/50">Type</th>
                                <th className="text-xs font-medium text-base-content/50">Date</th>
                                {epoch && (
                                    <th className="text-xs font-medium text-base-content/50">{epoch.label}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEvents.map((event) => (
                                <tr key={event.id} className="border-b border-base-content/5 transition-colors hover:bg-base-200/30">
                                    <td className="text-sm">
                                        <EntryLink entryId={event.id} href={event.url} className="font-medium hover:text-primary hover:underline">
                                            {event.name}
                                        </EntryLink>
                                    </td>
                                    <td className="text-xs text-base-content/50">
                                        {event.group_key ?? <span className="italic text-base-content/20">--</span>}
                                    </td>
                                    <td className="whitespace-nowrap text-sm text-base-content/70">
                                        {event.start_date ? fmtSmart(event.start_date) : '--'}
                                    </td>
                                    {epoch && (
                                        <td className="whitespace-nowrap">
                                            {event.start_date ? (
                                                <span className="badge badge-ghost badge-sm font-mono">
                                                    {calcElapsed(epoch.date, event.start_date, epoch.event_type)}
                                                </span>
                                            ) : '--'}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
