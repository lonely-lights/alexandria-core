import { useState, useMemo, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import useT from '@alexandria/hooks/useT';
import { useDateFormatters } from '@alexandria/lib/formatDate';
import {
    ZOOM_INDEX, PX_PER_UNIT, ITEM_ROW_HEIGHT, LANE_PADDING,
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
import {
    cardOuter,
    emptyStateInner,
    emptyIconStyle,
    emptyLabelStyle,
    chipStyle,
} from './entriesTabStyles';

interface TimelineEpoch {
    event_type: string;
    date: string;
    label: string;
}

interface TimelineTabProps {
    events: TimelineEntry[];
    epoch: TimelineEpoch | null;
}

const MONO_FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace';

/* ─── Toolbar styles ─── */

const eventCountChipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0 0.5rem',
    height: '1.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: 'var(--theme-radius-badge)',
    background: 'var(--theme-brand-secondary-500)',
    color: 'var(--theme-brand-secondary-content)',
};

const eventCountIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-brand-secondary-content) 70%, transparent)',
};

const segWrapStyle: CSSProperties = {
    display: 'flex',
    overflow: 'hidden',
    borderRadius: 'var(--theme-radius-input)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const segBtnBase: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.625rem',
    fontSize: '0.625rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease, color var(--theme-motion-duration-fast, 150ms) ease',
};

const segBtnActiveStyle: CSSProperties = {
    ...segBtnBase,
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

const segBtnIdleStyle: CSSProperties = {
    ...segBtnBase,
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const zoomBtnStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem 0.375rem',
    fontSize: '0.75rem',
    border: 'none',
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    cursor: 'pointer',
};

const zoomLabelStyle: CSSProperties = {
    minWidth: '4.5rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

/* ─── Canvas styles ─── */

const canvasWrapStyle: CSSProperties = {
    ...cardOuter,
    overflow: 'auto',
    background: 'var(--theme-base-100)',
};

const axisBarStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    height: '2rem',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-200) 80%, transparent)',
    backdropFilter: 'blur(4px)',
};

const gridLineStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderLeft: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const rangeBarStyle: CSSProperties = {
    pointerEvents: 'none',
    position: 'absolute',
    left: '0.375rem',
    top: '1rem',
    height: '0.125rem',
    borderRadius: '9999px',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)',
};

const rangeEndDotStyle: CSSProperties = {
    pointerEvents: 'none',
    position: 'absolute',
    height: '0.5rem',
    width: '0.5rem',
    borderRadius: '9999px',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 80%, transparent)',
};

const eventDotStyle: CSSProperties = {
    height: '0.75rem',
    width: '0.75rem',
    flexShrink: 0,
    borderRadius: '9999px',
    border: '2px solid var(--theme-base-100)',
    background: 'var(--theme-brand-primary-500)',
    boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
};

/* ─── Table styles ─── */

const tableWrapStyle: CSSProperties = {
    ...cardOuter,
    overflow: 'auto',
    background: 'var(--theme-base-100)',
};

const tableHeadRowStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-200) 50%, transparent)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const tableHeadCellStyle: CSSProperties = {
    padding: '0.5rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const tableRowStyle: CSSProperties = {
    borderTop: '1px dashed color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
};

const tableCellStyle: CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
};

const tableCellMutedStyle: CSSProperties = {
    ...tableCellStyle,
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const tableCellDateStyle: CSSProperties = {
    ...tableCellStyle,
    whiteSpace: 'nowrap',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const tableCellNoWrapStyle: CSSProperties = {
    ...tableCellStyle,
    whiteSpace: 'nowrap',
};

const emDashStyle: CSSProperties = {
    fontStyle: 'italic',
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const tableNameLinkStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

const elapsedBadgeStyle: CSSProperties = {
    ...chipStyle,
    fontFamily: MONO_FONT_STACK,
};

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
    const t = useT();
    const { fmtSmart } = useDateFormatters();
    const [viewMode, setViewMode] = useState<ViewMode>('timeline');
    const [zoom, setZoom] = useState<TimelineZoomLevel>('decade');
    const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);

    if (events.length === 0) {
        return (
            <div className="paper-board" style={cardOuter}>
                <div style={emptyStateInner}>
                    <i className="fa-solid fa-timeline mb-3 text-3xl" style={emptyIconStyle} />
                    <p className="text-sm font-medium" style={emptyLabelStyle}>{t('entries.tab.timeline.empty')}</p>
                </div>
            </div>
        );
    }

    // Sort events by date for table view
    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? '')),
        [events],
    );

    // Shared model — year-range, gridlines, break detection, and the
    // break-aware positioner. 'loose' padding (~15% of range) since
    // Entries timelines tend to be tightly clustered where extra
    // breathing room reads better than the 1-unit cap the Blueprint
    // timeline prefers.
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

    const eventCountLabel = t(events.length === 1 ? 'entries.tab.timeline.event_count.singular' : 'entries.tab.timeline.event_count.plural')
        .replace(':count', String(events.length));

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
                <span style={eventCountChipStyle}>
                    <i className="fa-solid fa-clock-rotate-left text-[9px]" style={eventCountIconStyle} />
                    {eventCountLabel}
                </span>

                {/* View toggle */}
                <div style={segWrapStyle}>
                    <button
                        type="button"
                        onClick={() => setViewMode('timeline')}
                        style={viewMode === 'timeline' ? segBtnActiveStyle : segBtnIdleStyle}
                    >
                        <i className="fa-solid fa-timeline text-[10px]" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        style={viewMode === 'table' ? segBtnActiveStyle : segBtnIdleStyle}
                    >
                        <i className="fa-solid fa-table-list text-[10px]" />
                    </button>
                </div>

                {/* Zoom controls (timeline only) */}
                {viewMode === 'timeline' && (
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={zoomIn} style={zoomBtnStyle}>
                            <i className="fa-solid fa-magnifying-glass-plus text-xs" />
                        </button>
                        <span style={zoomLabelStyle}>{ZOOM_LEVELS[ZOOM_INDEX[zoom]].label}</span>
                        <button type="button" onClick={zoomOut} style={zoomBtnStyle}>
                            <i className="fa-solid fa-magnifying-glass-minus text-xs" />
                        </button>
                    </div>
                )}
            </div>

            {/* Timeline View */}
            {viewMode === 'timeline' && (
                <div style={canvasWrapStyle}>
                    <div className="relative" style={{ minWidth: totalPx + 40 }}>
                        {/* Zigzag overlay compresses huge gaps into a jagged line. */}
                        <TimelineBreakOverlay breaks={breaks} breakLefts={breakLefts} />

                        {/* Axis — offset 16px right to match the `ml-4` margin on the events row. */}
                        <div style={axisBarStyle}>
                            <div className="relative h-full pl-4">
                                <TimelineAxis gridLines={gridLines} dateToPos={dateToPos} zoom={zoom} width={totalPx} height={32} />
                            </div>
                        </div>

                        {/* Events */}
                        <div className="relative ml-4" style={{ height: canvasHeight }}>
                            {gridLines.map((year, i) => (
                                <div
                                    key={i}
                                    style={{ ...gridLineStyle, left: dateToPos(String(year)) }}
                                />
                            ))}

                            {items.map((item) => {
                                const left = dateToPos(item.entry.start_date!);
                                const isRange = !!item.entry.end_date;
                                // Width = real pixel distance between start/end. Ranges render
                                // as dot + label + thin horizontal bar behind, so duration
                                // shows without forcing the label inside a shrinking pill.
                                const width = isRange ? Math.max(dateToPos(item.entry.end_date!) - left, 2) : 0;
                                const top = LANE_PADDING + item.row * ITEM_ROW_HEIGHT;
                                const isHovered = hoveredEntry === item.entry.id;

                                return (
                                    <div
                                        key={item.entry.id}
                                        className={`group absolute ${isHovered ? 'z-30' : 'z-10'}`}
                                        style={{ left, top }}
                                        onMouseEnter={() => setHoveredEntry(item.entry.id)}
                                        onMouseLeave={() => setHoveredEntry(null)}
                                    >
                                        {isRange && width > 0 && (
                                            <span style={{ ...rangeBarStyle, width }} aria-hidden="true" />
                                        )}
                                        {isRange && width > 4 && (
                                            <span style={{ ...rangeEndDotStyle, left: width - 4, top: 14 }} aria-hidden="true" />
                                        )}
                                        <Tooltip content={<EntryTooltipContent entry={item.entry} fmtDate={fmtSmart} />} placement="top" delay={200}>
                                            <a
                                                href={item.entry.url}
                                                className="relative flex items-center gap-1.5 no-underline text-inherit hover:text-inherit"
                                            >
                                                <span
                                                    className={`transition-transform ${isHovered ? 'scale-150' : ''}`}
                                                    style={eventDotStyle}
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
                <div style={tableWrapStyle}>
                    <table className="w-full">
                        <thead>
                            <tr style={tableHeadRowStyle}>
                                <th style={tableHeadCellStyle}>{t('entries.tab.timeline.table.event')}</th>
                                <th style={tableHeadCellStyle}>{t('entries.tab.timeline.table.type')}</th>
                                <th style={tableHeadCellStyle}>{t('entries.tab.timeline.table.date')}</th>
                                {epoch && (
                                    <th style={tableHeadCellStyle}>{epoch.label}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEvents.map((event) => (
                                <tr key={event.id} className="alex-row" style={tableRowStyle}>
                                    <td style={tableCellStyle}>
                                        <EntryLink entryId={event.id} href={event.url} className="font-medium hover:underline" style={tableNameLinkStyle}>
                                            {event.name}
                                        </EntryLink>
                                    </td>
                                    <td style={tableCellMutedStyle}>
                                        {event.group_key ?? <span style={emDashStyle}>{t('entries.tab.timeline.empty_cell')}</span>}
                                    </td>
                                    <td style={tableCellDateStyle}>
                                        {event.start_date ? fmtSmart(event.start_date) : t('entries.tab.timeline.empty_cell')}
                                    </td>
                                    {epoch && (
                                        <td style={tableCellNoWrapStyle}>
                                            {event.start_date ? (
                                                <span style={elapsedBadgeStyle}>
                                                    {calcElapsed(epoch.date, event.start_date, epoch.event_type)}
                                                </span>
                                            ) : t('entries.tab.timeline.empty_cell')}
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
