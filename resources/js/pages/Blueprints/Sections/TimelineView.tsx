import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useDateFormatters } from '@alexandria/lib/formatDate';
import {
    ZOOM_INDEX, PX_PER_UNIT, ITEM_ROW_HEIGHT, LANE_PADDING, gridUnitYears, formatAxisLabel,
    layoutItems, laneHeight, formatEntryDate, parseYear,
    type DateFmt, type LayoutItem, type TimeBreak, type Year,
} from '@alexandria/lib/timelineUtils';
import { useTimelineModel } from '@alexandria/lib/useTimelineModel';
import TimelineAxis from '@alexandria/components/timeline/TimelineAxis';
import TimelineBreakOverlay from '@alexandria/components/timeline/TimelineBreakOverlay';
import Tooltip from '@alexandria/components/ui/Tooltip';
import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import { ColumnConfigModal } from './modals/BlueprintSettingsModal';
import type { AvailableColumn, BlueprintDetail, SiblingBlueprint } from '@alexandria/types/blueprints';
import type {
    TimelineConfig,
    TimelineEntry,
    TimelineLane,
    TimelineDataResponse,
    TimelineZoomLevel,
} from '@alexandria/types/timeline';
import { ZOOM_LEVELS, defaultTimelineConfig } from '@alexandria/types/timeline';

interface Props {
    projectId: number;
    blueprintId: number;
    availableColumns: AvailableColumn[];
    initialConfig?: TimelineConfig;
    blueprint: BlueprintDetail;
    project: { id: number; name: string; slug: string };
    listableBlueprints: SiblingBlueprint[];
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
    timelineBlueprints?: Array<{ id: number; name: string; slug: string; icon: string; fields: Array<{ name: string; label: string; type: string; target_blueprint_slug: string | null }> }>;
}

/* ─── Rich tooltip content ─── */

function EntryTooltipContent({ entry, fmtDate }: { entry: TimelineEntry; fmtDate: DateFmt }): ReactNode {
    return (
        <div className="max-w-xs space-y-1 text-left">
            <div className="font-semibold text-xs">{entry.name}</div>
            <div className="text-[10px] opacity-80">{formatEntryDate(entry, fmtDate)}</div>
            {entry.group_key && (
                <div className="text-[10px] opacity-60">
                    <i className="fa-solid fa-tag mr-1" />{entry.group_key}
                </div>
            )}
            {entry.summary_html ? (
                // Server-sanitized HTML — renders wiki markup (bold,
                // italic, links, mentions) inline. Links inherit the
                // tooltip's text color via `!text-inherit` and rely on
                // underline + semibold for affordance so they always
                // contrast correctly against the tooltip background.
                <MentionAwareContent
                    html={entry.summary_html}
                    className="prose prose-sm line-clamp-3 max-w-none text-[10px] opacity-80 pt-0.5 [&_p]:m-0 [&_a]:!text-inherit [&_a]:underline [&_a]:font-semibold [&_strong]:text-inherit [&_em]:text-inherit"
                />
            ) : entry.summary ? (
                <div className="text-[10px] opacity-70 line-clamp-3 pt-0.5">{entry.summary}</div>
            ) : null}
        </div>
    );
}

/* ─── Lane color palette ──
   The previous LANE_COLORS shipped `border-<color>/30` without a width
   utility, so those border classes were dead weight — the lane header
   never got a visible rail. Splitting the palette into explicit
   header-tint + rail-color lists means both parts actually render. */

const LANE_HEADER_TINTS = [
    'bg-primary/10',
    'bg-secondary/10',
    'bg-accent/10',
    'bg-info/10',
    'bg-success/10',
    'bg-warning/10',
    'bg-error/10',
];

const LANE_RAIL_COLORS = [
    'border-l-primary',
    'border-l-secondary',
    'border-l-accent',
    'border-l-info',
    'border-l-success',
    'border-l-warning',
    'border-l-error',
];

const DOT_COLORS = [
    'bg-primary',
    'bg-secondary',
    'bg-accent',
    'bg-info',
    'bg-success',
    'bg-warning',
    'bg-error',
];

/* Range-bar tints for entries that span a date range. Paired index-
   for-index with DOT_COLORS so the bar reads as a dimmer version of
   the lane's dot color. */
const RANGE_BAR_COLORS = [
    'bg-primary/40',
    'bg-secondary/40',
    'bg-accent/40',
    'bg-info/40',
    'bg-success/40',
    'bg-warning/40',
    'bg-error/40',
];

/* ─── Main Component ─── */

export default function TimelineView({ projectId, blueprintId, availableColumns, initialConfig, blueprint, project, listableBlueprints, relationshipBlueprints, referencingRelationshipBlueprints, timelineBlueprints }: Props) {
    const { fmtSmart } = useDateFormatters();
    const [config, setConfig] = useState<TimelineConfig>(initialConfig ?? defaultTimelineConfig());
    const [data, setData] = useState<TimelineDataResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsInitialMenu, setSettingsInitialMenu] = useState<string | undefined>(undefined);
    const [hiddenLanes, setHiddenLanes] = useState<Set<string>>(new Set());
    const [mergeLanes, setMergeLanes] = useState(false);
    const [showLaneFilter, setShowLaneFilter] = useState(false);
    const laneFilterRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Close lane filter on outside click
    useEffect(() => {
        if (!showLaneFilter) return;
        function handleClick(e: MouseEvent) {
            if (laneFilterRef.current && !laneFilterRef.current.contains(e.target as Node)) {
                setShowLaneFilter(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showLaneFilter]);

    const isConfigured = !!config.date_field;

    /* ── Listen for blueprint settings event ── */
    useEffect(() => {
        function handleOpenSettings(e: Event) {
            const detail = (e as CustomEvent).detail;
            setSettingsInitialMenu(detail?.menu ?? 'main');
            setShowSettingsModal(true);
        }
        window.addEventListener('alexandria:open-blueprint-settings', handleOpenSettings);
        return () => window.removeEventListener('alexandria:open-blueprint-settings', handleOpenSettings);
    }, []);

    /* ── Fetch data ── */
    useEffect(() => {
        if (!isConfigured) return;

        setLoading(true);
        const params = new URLSearchParams({
            date_field: config.date_field!,
        });
        if (config.end_date_field) params.set('end_date_field', config.end_date_field);
        if (config.group_by) params.set('group_by', config.group_by);

        fetch(`/api/v1/projects/${projectId}/blueprints/${blueprintId}/timeline?${params}`, {
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((json: TimelineDataResponse) => {
                setData(json);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId, blueprintId, config.date_field, config.end_date_field, config.group_by]);

    /* ── Timeline model (shared) ──
       All positioning math — year range, window-filtering, break
       detection, positioner, gridlines — lives in useTimelineModel so
       other timeline surfaces (Entries tab, custom views) share the
       same break-aware pipeline. */
    const model = useTimelineModel({
        entries: data?.entries ?? [],
        zoom: config.zoom,
        displayStartYear: config.display_start_year,
        displayEndYear: config.display_end_year,
    });
    const { visibleEntries, hiddenCount, pxPerYear, breaks, dateToPos, totalPx, breakLefts, gridLines } = model;

    /* ── Build lanes ── */
    const lanes: TimelineLane[] = useMemo(() => {
        if (!visibleEntries.length) return [];

        if (!config.group_by) {
            return [{ key: '__all', label: 'All Entries', entries: visibleEntries }];
        }

        const grouped = new Map<string, TimelineEntry[]>();
        const ungrouped: TimelineEntry[] = [];

        for (const entry of visibleEntries) {
            if (entry.group_key) {
                const existing = grouped.get(entry.group_key) ?? [];
                existing.push(entry);
                grouped.set(entry.group_key, existing);
            } else {
                ungrouped.push(entry);
            }
        }

        const result: TimelineLane[] = [];
        for (const [key, entries] of grouped) {
            result.push({ key, label: key, entries });
        }
        // Sort lanes alphabetically
        result.sort((a, b) => a.label.localeCompare(b.label));

        if (ungrouped.length > 0) {
            result.push({ key: '__ungrouped', label: 'Ungrouped', entries: ungrouped });
        }

        return result;
    }, [visibleEntries, config.group_by]);

    /* ── Apply lane filtering and merging ── */
    const visibleLanes: TimelineLane[] = useMemo(() => {
        // Filter out hidden lanes
        const filtered = lanes.filter((l) => !hiddenLanes.has(l.key));
        if (!mergeLanes || filtered.length <= 1) return filtered;

        // Merge all visible lanes into one
        const allEntries = filtered.flatMap((l) => l.entries);
        return [{ key: '__merged', label: 'All Events', entries: allEntries }];
    }, [lanes, hiddenLanes, mergeLanes]);

    void pxPerYear; // destructured from the model for future needs

    /* ── Zoom controls ── */
    function zoomIn() {
        const idx = ZOOM_INDEX[config.zoom];
        if (idx > 0) setConfig({ ...config, zoom: ZOOM_LEVELS[idx - 1].key });
    }

    function zoomOut() {
        const idx = ZOOM_INDEX[config.zoom];
        if (idx < ZOOM_LEVELS.length - 1) setConfig({ ...config, zoom: ZOOM_LEVELS[idx + 1].key });
    }

    /* ── Auto-detect zoom from data range (now year-based) ── */
    useEffect(() => {
        if (!data?.date_range) return;
        const minY = parseYear(data.date_range.min);
        const maxY = parseYear(data.date_range.max);
        if (isNaN(minY) || isNaN(maxY)) return;
        const rangeYears = maxY - minY;
        for (const level of [...ZOOM_LEVELS].reverse()) {
            const unitYears = gridUnitYears(level.key);
            const unitCount = rangeYears / unitYears;
            const totalWidth = unitCount * PX_PER_UNIT[level.key];
            if (totalWidth >= 600 && totalWidth <= 4000) {
                setConfig((prev) => ({ ...prev, zoom: level.key }));
                return;
            }
        }
    }, [data?.date_range]);

    function openTimelineSettings() {
        setSettingsInitialMenu('timeline');
        setShowSettingsModal(true);
    }

    /* ── Unconfigured state ── */
    if (!isConfigured) {
        return (
            <>
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <i className="fa-solid fa-timeline text-2xl text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">Timeline View</h3>
                    <p className="mb-6 max-w-sm text-center text-sm text-base-content/50">
                        Choose a date field to position entries on a timeline. Optionally add an end date for ranges and group entries into swim lanes.
                    </p>
                    <button type="button" onClick={openTimelineSettings} className="btn btn-primary btn-sm gap-2">
                        <i className="fa-solid fa-gear text-xs" />
                        Configure Timeline
                    </button>
                </div>
                <ColumnConfigModal
                    open={showSettingsModal}
                    onClose={() => { setShowSettingsModal(false); setSettingsInitialMenu(undefined); }}
                    columns={[]}
                    sortableColumns={[]}
                    availableColumns={availableColumns}
                    onChange={() => {}}
                    onSortableChange={() => {}}
                    blueprintName={blueprint.name}
                    blueprint={blueprint}
                    project={project}
                    listableBlueprints={listableBlueprints}
                    relationshipBlueprints={relationshipBlueprints}
                    referencingRelationshipBlueprints={referencingRelationshipBlueprints}
                    initialMenu={settingsInitialMenu}
                    timelineConfig={config}
                    onTimelineConfigChange={setConfig}
                    timelineBlueprints={timelineBlueprints}
                />
            </>
        );
    }

    const isHorizontal = config.orientation === 'horizontal';
    const LANE_HEADER_SIZE = 140; // px for lane label column/row
    const AXIS_SIZE = 40; // px for the date axis

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Stats badge */}
                {data && (
                    <span className="badge badge-secondary h-6 gap-1 font-normal text-xs">
                        <i className="fa-solid fa-clock-rotate-left text-[9px] text-secondary-content/70" />
                        {data.total} {data.total === 1 ? 'entry' : 'entries'}
                        {data.capped && <span className="text-warning">(max 500)</span>}
                    </span>
                )}

                {/* Hidden-by-range badge — only when the user has pinned a
                    display window that excludes some entries. Click target
                    opens the timeline settings so the bounds can be
                    adjusted. */}
                {hiddenCount > 0 && (
                    <button
                        type="button"
                        onClick={openTimelineSettings}
                        className="badge badge-warning h-6 gap-1 font-normal text-xs"
                        title="Click to adjust display range"
                    >
                        <i className="fa-solid fa-eye-slash text-[9px]" />
                        {hiddenCount} outside range
                    </button>
                )}

                {/* Orientation toggle */}
                <div className="flex overflow-hidden rounded-lg border border-base-content/10">
                    <button
                        type="button"
                        onClick={() => setConfig({ ...config, orientation: 'horizontal' })}
                        className={`btn btn-xs gap-1 rounded-none border-0 ${isHorizontal ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <i className="fa-solid fa-arrows-left-right text-[10px]" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfig({ ...config, orientation: 'vertical' })}
                        className={`btn btn-xs gap-1 rounded-none border-0 ${!isHorizontal ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <i className="fa-solid fa-arrows-up-down text-[10px]" />
                    </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                    <button type="button" onClick={zoomIn} className="btn btn-ghost btn-xs" title="Zoom in">
                        <i className="fa-solid fa-magnifying-glass-plus text-xs" />
                    </button>
                    <span className="min-w-[4.5rem] text-center text-xs text-base-content/50">{ZOOM_LEVELS[ZOOM_INDEX[config.zoom]].label}</span>
                    <button type="button" onClick={zoomOut} className="btn btn-ghost btn-xs" title="Zoom out">
                        <i className="fa-solid fa-magnifying-glass-minus text-xs" />
                    </button>
                </div>

                <div className="flex-1" />

                {/* Lane controls (only when grouping is active) */}
                {config.group_by && lanes.length > 1 && (
                    <>
                        {/* Merge toggle */}
                        <button
                            type="button"
                            onClick={() => setMergeLanes(!mergeLanes)}
                            className={`btn btn-xs gap-1 ${mergeLanes ? 'btn-primary' : 'btn-ghost border-base-content/10'}`}
                            title={mergeLanes ? 'Split into lanes' : 'Merge all lanes'}
                        >
                            <i className={`fa-solid ${mergeLanes ? 'fa-table-columns' : 'fa-compress'} text-[10px]`} />
                            {mergeLanes ? 'Split' : 'Merge'}
                        </button>

                        {/* Lane visibility filter */}
                        <div className="relative" ref={laneFilterRef}>
                            <button
                                type="button"
                                onClick={() => setShowLaneFilter(!showLaneFilter)}
                                className={`btn btn-xs gap-1 ${hiddenLanes.size > 0 ? 'btn-warning' : 'btn-ghost border-base-content/10'}`}
                            >
                                <i className="fa-solid fa-filter text-[10px]" />
                                Lanes
                                {hiddenLanes.size > 0 && (
                                    <span className="badge badge-xs">{lanes.length - hiddenLanes.size}/{lanes.length}</span>
                                )}
                            </button>
                            {showLaneFilter && (
                                <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-base-content/10 bg-base-100 shadow-xl">
                                    <div className="border-b border-base-content/10 px-3 py-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-base-content/70">Show Lanes</span>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setHiddenLanes(new Set())}
                                                    className="text-[10px] text-primary hover:underline"
                                                >All</button>
                                                <span className="text-base-content/20">|</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setHiddenLanes(new Set(lanes.map((l) => l.key)))}
                                                    className="text-[10px] text-primary hover:underline"
                                                >None</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto py-1">
                                        {lanes.map((lane, i) => (
                                            <label
                                                key={lane.key}
                                                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-base-200/50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-xs checkbox-primary"
                                                    checked={!hiddenLanes.has(lane.key)}
                                                    onChange={() => {
                                                        const next = new Set(hiddenLanes);
                                                        if (next.has(lane.key)) next.delete(lane.key);
                                                        else next.add(lane.key);
                                                        setHiddenLanes(next);
                                                    }}
                                                />
                                                <div className={`h-2.5 w-2.5 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`} />
                                                <span className="flex-1 truncate">{lane.label}</span>
                                                <span className="text-base-content/30">{lane.entries.length}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Config button */}
                <button type="button" onClick={openTimelineSettings} className="btn btn-ghost btn-xs gap-1">
                    <i className="fa-solid fa-gear text-xs" />
                    Configure
                </button>
            </div>

            {/* Timeline canvas — outer wrapper carries the paper-board
                shadow; inner div owns the overflow scroll so the
                pseudo-element shadow isn't clipped.
                ─────
                Double-scrollbar fix: the scroll container uses
                overflow-x-auto (horizontal scrolling for the time axis)
                without a vertical max-height, so vertical content flows
                into the page's own scroll rather than creating a second
                vertical scrollbar stacked against the window's. The
                sticky axis / lane headers now stick relative to the
                page viewport. */}
            <div className={`paper-board relative w-full rounded-xl border border-base-content/10 ${loading ? 'opacity-60 animate-pulse' : ''}`}>
            <div
                ref={scrollRef}
                className="scrollbar-subtle overflow-x-auto bg-base-200 shadow-sm"
                style={{ borderRadius: 'inherit' }}
            >
                {!data || data.entries.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-sm text-base-content/30">
                        {loading ? 'Loading...' : 'No entries with date values found.'}
                    </div>
                ) : isHorizontal ? (
                    <HorizontalTimeline
                        lanes={visibleLanes}
                        gridLines={gridLines}
                        dateToPos={dateToPos}
                        totalPx={totalPx}
                        zoom={config.zoom}
                        laneHeaderSize={LANE_HEADER_SIZE}
                        axisSize={AXIS_SIZE}
                        hoveredEntry={hoveredEntry}
                        onHover={setHoveredEntry}
                        fmtDate={fmtSmart}
                        breaks={breaks}
                        breakLefts={breakLefts}
                    />
                ) : (
                    <VerticalTimeline
                        lanes={visibleLanes}
                        gridLines={gridLines}
                        dateToPos={dateToPos}
                        totalPx={totalPx}
                        zoom={config.zoom}
                        laneHeaderSize={LANE_HEADER_SIZE}
                        axisSize={AXIS_SIZE}
                        hoveredEntry={hoveredEntry}
                        onHover={setHoveredEntry}
                        fmtDate={fmtSmart}
                        breaks={breaks}
                        breakLefts={breakLefts}
                    />
                )}
            </div>
            </div>

            <ColumnConfigModal
                open={showSettingsModal}
                onClose={() => { setShowSettingsModal(false); setSettingsInitialMenu(undefined); }}
                columns={[]}
                sortableColumns={[]}
                availableColumns={availableColumns}
                onChange={() => {}}
                onSortableChange={() => {}}
                blueprintName={blueprint.name}
                blueprint={blueprint}
                project={project}
                listableBlueprints={listableBlueprints}
                relationshipBlueprints={relationshipBlueprints}
                referencingRelationshipBlueprints={referencingRelationshipBlueprints}
                initialMenu={settingsInitialMenu}
                timelineConfig={config}
                onTimelineConfigChange={setConfig}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Horizontal Timeline — time flows left to right, lanes stack vertically
   ═══════════════════════════════════════════════════════════════ */

interface TimelineCanvasProps {
    lanes: TimelineLane[];
    gridLines: Year[];
    dateToPos: (date: string) => number;
    totalPx: number;
    zoom: TimelineZoomLevel;
    laneHeaderSize: number;
    axisSize: number;
    hoveredEntry: number | null;
    onHover: (id: number | null) => void;
    fmtDate: DateFmt;
    breaks: TimeBreak[];
    breakLefts: number[];
}

function HorizontalTimeline({ lanes, gridLines, dateToPos, totalPx, zoom, laneHeaderSize, axisSize, hoveredEntry, onHover, fmtDate, breaks, breakLefts }: TimelineCanvasProps) {
    // Pre-compute layout for each lane
    const laneLayouts = useMemo(
        () => lanes.map((lane) => layoutItems(lane.entries, dateToPos)),
        [lanes, dateToPos],
    );

    const TRAIL = 40; // right-side breathing room past the final grid line

    return (
        <div className="relative" style={{ minWidth: totalPx + laneHeaderSize + TRAIL }}>
            {/* Shared zigzag overlay — offset by laneHeaderSize since
                the lane-header column is a non-timeline sibling column. */}
            <TimelineBreakOverlay breaks={breaks} breakLefts={breakLefts} leftOffset={laneHeaderSize} />

            {/* Axis row — sticky top. Label container explicitly sized to
                totalPx + trail so labels/ticks stay aligned with the lane
                grid below when the scroll area is wider than the content.
                Bottom border is intentionally stronger (content/25) to
                read as a clear axis line. */}
            <div
                className="sticky top-0 z-20 flex border-b border-base-content/25 bg-base-200/95 backdrop-blur-sm"
                style={{ height: axisSize }}
            >
                {/* Corner spacer */}
                <div className="flex-shrink-0 border-r border-base-content/15" style={{ width: laneHeaderSize }} />
                {/* Shared axis — break boundaries are flanked by regular
                    gridlines (since break.endYears is snapped to a grid
                    boundary), so no bespoke boundary labels are needed. */}
                <TimelineAxis gridLines={gridLines} dateToPos={dateToPos} zoom={zoom} width={totalPx + TRAIL} height={axisSize} />
            </div>

            {/* Lanes — alternating bg + colored left-rail on the header
                gives each lane a clear identity. The body also picks up a
                very faint tint of the lane color so entries visually
                belong to their row. */}
            {lanes.map((lane, laneIdx) => {
                const { items, rowCount } = laneLayouts[laneIdx];
                const height = laneHeight(rowCount);
                const isEven = laneIdx % 2 === 0;
                const rail = LANE_RAIL_COLORS[laneIdx % LANE_RAIL_COLORS.length];
                const tint = LANE_HEADER_TINTS[laneIdx % LANE_HEADER_TINTS.length];
                const dot = DOT_COLORS[laneIdx % DOT_COLORS.length];

                return (
                    <div
                        key={lane.key}
                        className={`flex border-b border-base-content/10 last:border-b-0 ${isEven ? 'bg-base-100/60' : 'bg-base-200/40'}`}
                        style={{ height }}
                    >
                        {/* Lane header — colored left rail + tint + count pill */}
                        <div
                            className={`sticky left-0 z-10 flex flex-shrink-0 items-center gap-2 border-l-4 border-r border-base-content/15 px-3 ${rail} ${tint}`}
                            style={{ width: laneHeaderSize }}
                        >
                            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`} aria-hidden="true" />
                            <span className="flex-1 truncate text-xs font-medium" title={lane.label}>{lane.label}</span>
                            <span className="text-[10px] tabular-nums text-base-content/50">{lane.entries.length}</span>
                        </div>

                        {/* Lane content */}
                        <div className="relative flex-shrink-0" style={{ width: totalPx + TRAIL }}>
                            {/* Grid lines — darkened from /5 to /10 so the
                                column structure reads at a glance. */}
                            {gridLines.map((year, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 h-full border-l border-base-content/10"
                                    style={{ left: dateToPos(String(year)) }}
                                />
                            ))}

                            {/* Entries */}
                            {items.map((item) => (
                                <TimelineItemHorizontal
                                    key={item.entry.id}
                                    entry={item.entry}
                                    dateToPos={dateToPos}
                                    row={item.row}
                                    paletteIdx={laneIdx % DOT_COLORS.length}
                                    isHovered={hoveredEntry === item.entry.id}
                                    onHover={onHover}
                                    fmtDate={fmtDate}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TimelineItemHorizontal({
    entry,
    dateToPos,
    row,
    paletteIdx,
    isHovered,
    onHover,
    fmtDate,
}: {
    entry: TimelineEntry;
    dateToPos: (d: string) => number;
    row: number;
    paletteIdx: number;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    fmtDate: DateFmt;
}) {
    if (!entry.start_date) return null;
    const left = dateToPos(entry.start_date);
    const isRange = !!entry.end_date;
    const rangeWidth = isRange ? Math.max(dateToPos(entry.end_date!) - left, 4) : 0;
    const top = LANE_PADDING + row * ITEM_ROW_HEIGHT;
    const isStub = entry.is_stub;

    const dotClass = DOT_COLORS[paletteIdx];
    const rangeBarClass = RANGE_BAR_COLORS[paletteIdx];

    const tooltipContent = <EntryTooltipContent entry={entry} fmtDate={fmtDate} />;

    /* Dot + name rendering for every entry:
        - Full entries: colored solid dot, name linkable to the entry.
        - Stubs: hollow ring (border only, no fill), italic muted name,
          rendered in a <span> so it isn't clickable since stubs don't
          have a full page.
       Range entries also render a thin horizontal bar from start → end
       below the dot so the duration reads visually without forcing the
       name inside a pill that shrinks to nothing on small ranges. */
    const dotAndLabel = (
        <span className={`relative flex items-center gap-1.5 ${isStub ? 'cursor-default' : 'cursor-pointer'}`}>
            <span
                className={`h-3 w-3 flex-shrink-0 rounded-full border-2 border-base-100 shadow-sm transition-transform ${
                    isStub ? 'border-base-content/40 bg-transparent' : dotClass
                } ${isHovered ? 'scale-150' : ''}`}
                aria-hidden="true"
            />
            <span
                className={`max-w-[14rem] truncate whitespace-nowrap text-[10px] font-medium transition-opacity ${
                    isStub ? 'italic pr-0.5 text-base-content/50' : 'text-base-content'
                } ${isHovered ? 'opacity-100' : 'opacity-80'}`}
            >
                {entry.name}
            </span>
        </span>
    );

    return (
        <div
            className={`absolute ${isHovered ? 'z-30' : 'z-10'}`}
            style={{ left, top }}
            onMouseEnter={() => onHover(entry.id)}
            onMouseLeave={() => onHover(null)}
        >
            {/* Range bar — drawn behind the dot, aligned to the dot's
                vertical center. Dashed for stubs, tinted for full. */}
            {isRange && rangeWidth > 0 && (
                <span
                    className={`pointer-events-none absolute left-1.5 top-[5px] h-0.5 rounded-full ${
                        isStub ? 'border-t border-dashed border-base-content/30 bg-transparent' : rangeBarClass
                    }`}
                    style={{ width: rangeWidth }}
                    aria-hidden="true"
                />
            )}
            {/* Range end-marker — a second dot at the end_date position.
                Essential when the range crosses a break: without a
                visible terminus, the bar appears to continue into
                whatever follows the zigzag (e.g., Hidden Wars would
                appear to end "in the 2030s" because that's where the
                bar visually exits the compressed region). */}
            {isRange && rangeWidth > 4 && (
                <span
                    className={`pointer-events-none absolute h-3 w-3 rounded-full border-2 border-base-100 shadow-sm ${
                        isStub ? 'border-base-content/40 bg-transparent' : dotClass
                    }`}
                    style={{ left: rangeWidth, top: 0 }}
                    aria-hidden="true"
                />
            )}
            <Tooltip content={tooltipContent} placement="top" delay={200}>
                {isStub ? (
                    <span>{dotAndLabel}</span>
                ) : (
                    <a href={entry.url}>{dotAndLabel}</a>
                )}
            </Tooltip>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Vertical Timeline — time flows top to bottom, lanes side by side
   ═══════════════════════════════════════════════════════════════ */

function VerticalTimeline({ lanes, gridLines, dateToPos, totalPx, zoom, axisSize, hoveredEntry, onHover, fmtDate, breaks, breakLefts }: TimelineCanvasProps) {
    const BASE_LANE_WIDTH = 140;
    const COL_WIDTH = 120; // px per stacked column within a lane

    // Pre-compute layout for each lane (reuses layoutItems with vertical item extents)
    const laneLayouts = useMemo(
        () => lanes.map((lane) => {
            // For vertical, "pos" is the top position and "extent" is the vertical height of the item
            const items: LayoutItem[] = lane.entries
                .filter((e) => e.start_date)
                .map((entry) => {
                    const pos = dateToPos(entry.start_date!);
                    const isRange = !!entry.end_date;
                    const extent = isRange
                        ? Math.max(dateToPos(entry.end_date!) - pos, 24)
                        : 18; // height of a point event
                    return { entry, pos, extent, row: 0 };
                })
                .sort((a, b) => a.pos - b.pos);

            // Greedy column assignment
            const colEnds: number[] = [];
            for (const item of items) {
                let placed = false;
                for (let c = 0; c < colEnds.length; c++) {
                    if (item.pos >= colEnds[c] + 4) {
                        item.row = c;
                        colEnds[c] = item.pos + item.extent;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    item.row = colEnds.length;
                    colEnds.push(item.pos + item.extent);
                }
            }

            return { items, colCount: Math.max(colEnds.length, 1) };
        }),
        [lanes, dateToPos],
    );

    const AXIS_W = axisSize + 16; // axis column width (room for labels)
    const TRAIL = 40;

    return (
        <div className="relative" style={{ minHeight: totalPx + axisSize + TRAIL }}>
            {/* Shared zigzag overlay — vertical mode paints each break as
                a horizontal band spanning the full canvas width. Offset
                by the lane-header row height (40px) so breakLefts are
                relative to the scrollable canvas content. */}
            <TimelineBreakOverlay breaks={breaks} breakLefts={breakLefts} leftOffset={40} orientation="vertical" />

            {/* Header row with lane labels */}
            <div className="sticky top-0 z-20 flex h-10 border-b border-base-content/25 bg-base-200/95 backdrop-blur-sm">
                {/* Corner spacer for axis */}
                <div className="flex-shrink-0 border-r border-base-content/15" style={{ width: AXIS_W }} />
                {/* Lane headers — colored top rail + tint + count pill */}
                {lanes.map((lane, laneIdx) => {
                    const { colCount } = laneLayouts[laneIdx];
                    const width = Math.max(BASE_LANE_WIDTH, colCount * COL_WIDTH);
                    const tint = LANE_HEADER_TINTS[laneIdx % LANE_HEADER_TINTS.length];
                    const dot = DOT_COLORS[laneIdx % DOT_COLORS.length];
                    return (
                        <div
                            key={lane.key}
                            className={`flex flex-shrink-0 items-center gap-2 border-r border-base-content/15 px-3 ${tint}`}
                            style={{ width, borderTop: '3px solid transparent' }}
                        >
                            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`} aria-hidden="true" />
                            <span className="flex-1 truncate text-xs font-medium" title={lane.label}>{lane.label}</span>
                            <span className="text-[10px] tabular-nums text-base-content/50">{lane.entries.length}</span>
                        </div>
                    );
                })}
            </div>

            {/* Body: axis + lanes */}
            <div className="flex" style={{ minHeight: totalPx + TRAIL }}>
                {/* Axis column — sticky, with tick marks anchored to its right edge */}
                <div
                    className="sticky left-0 z-10 flex-shrink-0 border-r border-base-content/25 bg-base-200/80"
                    style={{ width: AXIS_W }}
                >
                    <div className="relative" style={{ height: totalPx + TRAIL }}>
                        {gridLines.map((year, i) => {
                            const top = dateToPos(String(year));
                            return (
                                <div
                                    key={i}
                                    className="pointer-events-none absolute left-0 right-0 flex items-center justify-end gap-1 pr-1"
                                    style={{ top, transform: 'translateY(-50%)' }}
                                >
                                    <span className="whitespace-nowrap text-[10px] font-medium text-base-content/60">
                                        {formatAxisLabel(year, zoom)}
                                    </span>
                                    <span className="block h-px w-2 bg-base-content/40" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Lane columns — alternating tint + colored left rail */}
                {lanes.map((lane, laneIdx) => {
                    const { items, colCount } = laneLayouts[laneIdx];
                    const width = Math.max(BASE_LANE_WIDTH, colCount * COL_WIDTH);
                    const isEven = laneIdx % 2 === 0;
                    const rail = LANE_RAIL_COLORS[laneIdx % LANE_RAIL_COLORS.length];

                    return (
                        <div
                            key={lane.key}
                            className={`relative flex-shrink-0 border-l-4 border-r border-base-content/10 last:border-r-0 ${rail} ${isEven ? 'bg-base-100/60' : 'bg-base-200/40'}`}
                            style={{ width, height: totalPx + TRAIL }}
                        >
                            {/* Grid lines */}
                            {gridLines.map((year, i) => (
                                <div
                                    key={i}
                                    className="absolute left-0 w-full border-t border-base-content/10"
                                    style={{ top: dateToPos(String(year)) }}
                                />
                            ))}

                            {/* Entries */}
                            {items.map((item) => (
                                <TimelineItemVertical
                                    key={item.entry.id}
                                    entry={item.entry}
                                    dateToPos={dateToPos}
                                    col={item.row}
                                    colWidth={COL_WIDTH}
                                    paletteIdx={laneIdx % DOT_COLORS.length}
                                    isHovered={hoveredEntry === item.entry.id}
                                    onHover={onHover}
                                    fmtDate={fmtDate}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TimelineItemVertical({
    entry,
    dateToPos,
    col,
    colWidth,
    paletteIdx,
    isHovered,
    onHover,
    fmtDate,
}: {
    entry: TimelineEntry;
    dateToPos: (d: string) => number;
    col: number;
    colWidth: number;
    paletteIdx: number;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    fmtDate: DateFmt;
}) {
    if (!entry.start_date) return null;
    const top = dateToPos(entry.start_date);
    const isRange = !!entry.end_date;
    const rangeHeight = isRange ? Math.max(dateToPos(entry.end_date!) - top, 4) : 0;
    const left = 8 + col * colWidth;
    const isStub = entry.is_stub;

    const dotClass = DOT_COLORS[paletteIdx];
    const rangeBarClass = RANGE_BAR_COLORS[paletteIdx];

    const tooltipContent = <EntryTooltipContent entry={entry} fmtDate={fmtDate} />;

    const dotAndLabel = (
        <span className={`relative flex items-center gap-1.5 ${isStub ? 'cursor-default' : 'cursor-pointer'}`}>
            <span
                className={`h-3 w-3 flex-shrink-0 rounded-full border-2 border-base-100 shadow-sm transition-transform ${
                    isStub ? 'border-base-content/40 bg-transparent' : dotClass
                } ${isHovered ? 'scale-150' : ''}`}
                aria-hidden="true"
            />
            <span
                className={`truncate text-[10px] font-medium transition-opacity ${
                    isStub ? 'italic pr-0.5 text-base-content/50' : 'text-base-content'
                } ${isHovered ? 'opacity-100' : 'opacity-80'}`}
            >
                {entry.name}
            </span>
        </span>
    );

    return (
        <div
            className={`absolute ${isHovered ? 'z-30' : 'z-10'}`}
            style={{ top, left, width: colWidth - 8 }}
            onMouseEnter={() => onHover(entry.id)}
            onMouseLeave={() => onHover(null)}
        >
            {/* Range bar — vertical stroke from the dot downward to
                the end_date position. Dashed for stubs, tinted for full. */}
            {isRange && rangeHeight > 0 && (
                <span
                    className={`pointer-events-none absolute left-[5px] top-3 w-0.5 rounded-full ${
                        isStub ? 'border-l border-dashed border-base-content/30 bg-transparent' : rangeBarClass
                    }`}
                    style={{ height: rangeHeight }}
                    aria-hidden="true"
                />
            )}
            {/* Range end-marker — second dot at end_date position. Same
                role as the horizontal timeline's end-dot: guarantees the
                terminus reads as an anchor inside a break when the range
                crosses a zigzag. */}
            {isRange && rangeHeight > 4 && (
                <span
                    className={`pointer-events-none absolute h-3 w-3 rounded-full border-2 border-base-100 shadow-sm ${
                        isStub ? 'border-base-content/40 bg-transparent' : dotClass
                    }`}
                    style={{ left: 0, top: rangeHeight }}
                    aria-hidden="true"
                />
            )}
            <Tooltip content={tooltipContent} placement="right" delay={200}>
                {isStub ? (
                    <span>{dotAndLabel}</span>
                ) : (
                    <a href={entry.url}>{dotAndLabel}</a>
                )}
            </Tooltip>
        </div>
    );
}
