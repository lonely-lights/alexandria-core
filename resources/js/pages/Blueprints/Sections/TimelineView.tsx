import {
    type CSSProperties,
    useState,
    useEffect,
    useRef,
    useMemo,
    type ReactNode,
} from "react";
import { useDateFormatters } from "@alexandria/lib/formatDate";
import { useJsonFetch } from "@alexandria/lib/fetchJson";
import useT from "@alexandria/hooks/useT";
import {
    ZOOM_INDEX,
    PX_PER_UNIT,
    ITEM_ROW_HEIGHT,
    LANE_PADDING,
    gridUnitYears,
    formatAxisLabel,
    layoutItems,
    laneHeight,
    formatEntryDate,
    parseYear,
    type DateFmt,
    type LayoutItem,
    type TimeBreak,
    type Year,
} from "@alexandria/lib/timelineUtils";
import { useTimelineModel } from "@alexandria/lib/useTimelineModel";
import TimelineAxis from "@alexandria/components/timeline/TimelineAxis";
import TimelineBreakOverlay from "@alexandria/components/timeline/TimelineBreakOverlay";
import Tooltip from "@alexandria/components/ui/Tooltip";
import MentionAwareContent from "@alexandria/components/ui/MentionAwareContent";
import { ColumnConfigModal } from "./modals/BlueprintSettingsModal";
import type {
    AvailableColumn,
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";
import type {
    TimelineConfig,
    TimelineEntry,
    TimelineLane,
    TimelineDataResponse,
    TimelineZoomLevel,
} from "@alexandria/types/timeline";
import { ZOOM_LEVELS, defaultTimelineConfig } from "@alexandria/types/timeline";

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
    timelineBlueprints?: Array<{
        id: number;
        name: string;
        slug: string;
        icon: string;
        fields: Array<{
            name: string;
            label: string;
            type: string;
            target_blueprint_slug: string | null;
        }>;
    }>;
}

/* ─── Rich tooltip content ─── */

function EntryTooltipContent({
    entry,
    fmtDate,
}: {
    entry: TimelineEntry;
    fmtDate: DateFmt;
}): ReactNode {
    return (
        <div className="max-w-xs space-y-1 text-left">
            <div className="font-semibold text-xs">{entry.name}</div>
            <div className="text-[10px] opacity-80">
                {formatEntryDate(entry, fmtDate)}
            </div>
            {entry.group_key && (
                <div className="text-[10px] opacity-60">
                    <i className="fa-solid fa-tag mr-1" />
                    {entry.group_key}
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
                <div className="text-[10px] opacity-70 line-clamp-3 pt-0.5">
                    {entry.summary}
                </div>
            ) : null}
        </div>
    );
}

/* ─── Lane color palette ──
   Each lane cycles through 7 named tokens. Centralising the token
   reference per row means the four visual pieces (header tint,
   colored rail, dot, range-bar) stay color-correlated; previously
   the parallel-array shape (one array per piece) made it easy to
   drift them out of sync.

   Tokens are theme-driven (brand or status) so a preset swap
   repaints the whole timeline without touching this file. */

interface LanePaletteEntry {
    token: string; // CSS var or value expression
    label: string;
}

const LANE_PALETTE: LanePaletteEntry[] = [
    { token: "var(--theme-brand-primary-500)", label: "primary" },
    { token: "var(--theme-brand-secondary-500)", label: "secondary" },
    { token: "var(--theme-brand-accent-500)", label: "accent" },
    { token: "var(--theme-status-info-stroke)", label: "info" },
    { token: "var(--theme-status-success-stroke)", label: "success" },
    { token: "var(--theme-status-warning-stroke)", label: "warning" },
    { token: "var(--theme-status-error-stroke)", label: "error" },
];

/* Per-lane visual style derived from the palette index. */
function laneHeaderStyle(idx: number): CSSProperties {
    const token = LANE_PALETTE[idx % LANE_PALETTE.length].token;
    return {
        background: `color-mix(in srgb, ${token} 10%, transparent)`,
        borderLeftColor: token,
    };
}

function laneDotStyle(idx: number): CSSProperties {
    return { background: LANE_PALETTE[idx % LANE_PALETTE.length].token };
}

function laneRangeBarStyle(idx: number): CSSProperties {
    const token = LANE_PALETTE[idx % LANE_PALETTE.length].token;
    return { background: `color-mix(in srgb, ${token} 40%, transparent)` };
}

/* Hollow stub-dot — used in place of the lane's solid dot when an
   entry is a stub. Border = faded base-content, no fill. */
const stubDotStyle: CSSProperties = {
    background: "transparent",
    borderColor:
        "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

const stubRangeBarStyle: CSSProperties = {
    background: "transparent",
    borderTop:
        "1px dashed color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

const stubRangeBarVerticalStyle: CSSProperties = {
    background: "transparent",
    borderLeft:
        "1px dashed color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

/* ── Theme-token style recipes ──────────────────────────────────── */

const subtitle70: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};
const subtitle60: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};
const subtitle50: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const subtitle30: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

const panelShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const panelInnerStyle: CSSProperties = {
    background: "var(--theme-base-200)",
    boxShadow:
        "0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    borderRadius: "inherit",
};

const axisStickyStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-200) 95%, transparent)",
    backdropFilter: "blur(4px)",
};

const axisCornerStyle: CSSProperties = {
    borderRight:
        "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
};

const laneRowBorderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

const laneHeaderColumnStyle: CSSProperties = {
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
    borderRight:
        "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
};

function laneRowBgStyle(isEven: boolean): CSSProperties {
    return {
        background: isEven
            ? "color-mix(in srgb, var(--theme-base-100) 60%, transparent)"
            : "color-mix(in srgb, var(--theme-base-200) 40%, transparent)",
    };
}

const gridLineStyle: CSSProperties = {
    borderLeft:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

const gridLineHorizontalStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

const axisTickStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

const verticalAxisColStyle: CSSProperties = {
    borderRight:
        "1px solid color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-200) 80%, transparent)",
};

const segmentedToolbarStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-button)",
    overflow: "hidden",
};

const segmentBtnActiveStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
};

const segmentBtnIdleStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
};

const ghostBtnClass =
    "alex-btn alex-btn--ghost inline-flex items-center justify-center gap-1 px-2 py-1 text-xs";
const primaryBtnClass =
    "alex-btn alex-btn--primary inline-flex items-center justify-center gap-1 px-2 py-1 text-xs";
const warningBtnClass =
    "alex-btn alex-btn--warning inline-flex items-center justify-center gap-1 px-2 py-1 text-xs";

const ghostBtnBorderedStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-button)",
};

const statBadgeBase: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    height: "1.5rem",
    padding: "0 0.5rem",
    fontSize: "0.75rem",
    fontWeight: 400,
    borderRadius: "var(--theme-radius-badge)",
};

const secondaryBadgeStyle: CSSProperties = {
    ...statBadgeBase,
    background: "var(--theme-brand-secondary-500)",
    color: "var(--theme-brand-secondary-content)",
};

const warningBadgeStyle: CSSProperties = {
    ...statBadgeBase,
    background: "var(--theme-status-warning-stroke)",
    color: "var(--theme-status-warning-content)",
    cursor: "pointer",
    border: "none",
};

const cappedTextStyle: CSSProperties = {
    color: "var(--theme-status-warning-stroke)",
};

const laneFilterPopupStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
    overflow: "hidden",
};

const laneFilterHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

const primaryLinkStyle: CSSProperties = {
    color: "var(--theme-brand-primary-500)",
};

const dotMiniBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.0625rem 0.375rem",
    fontSize: "0.625rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background:
        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

const introIconWrapStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
};

const dotBorderStyle: CSSProperties = {
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--theme-base-100)",
    boxShadow:
        "0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
};

/* ─── Main Component ─── */

export default function TimelineView({
    projectId,
    blueprintId,
    availableColumns,
    initialConfig,
    blueprint,
    project,
    listableBlueprints,
    relationshipBlueprints,
    referencingRelationshipBlueprints,
    timelineBlueprints,
}: Props) {
    const t = useT();
    const { fmtSmart } = useDateFormatters();
    const [config, setConfig] = useState<TimelineConfig>(
        initialConfig ?? defaultTimelineConfig(),
    );
    const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsInitialMenu, setSettingsInitialMenu] = useState<
        string | undefined
    >(undefined);
    const [hiddenLanes, setHiddenLanes] = useState<Set<string>>(new Set());
    const [mergeLanes, setMergeLanes] = useState(false);
    const [showLaneFilter, setShowLaneFilter] = useState(false);
    const laneFilterRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Close lane filter on outside click
    useEffect(() => {
        if (!showLaneFilter) return;
        function handleClick(e: MouseEvent) {
            if (
                laneFilterRef.current &&
                !laneFilterRef.current.contains(e.target as Node)
            ) {
                setShowLaneFilter(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showLaneFilter]);

    const isConfigured = !!config.date_field;

    /* ── Listen for blueprint settings event ── */
    useEffect(() => {
        function handleOpenSettings(e: Event) {
            const detail = (e as CustomEvent).detail;
            setSettingsInitialMenu(detail?.menu ?? "main");
            setShowSettingsModal(true);
        }
        window.addEventListener(
            "alexandria:open-blueprint-settings",
            handleOpenSettings,
        );
        return () =>
            window.removeEventListener(
                "alexandria:open-blueprint-settings",
                handleOpenSettings,
            );
    }, []);

    /* ── Fetch data — recomputes whenever date / end-date / group-by config changes.
       Null URL while not configured skips the fetch entirely (and resets data to null
       if config was cleared mid-session). */
    const dataUrl = useMemo(() => {
        if (!isConfigured) return null;
        const params = new URLSearchParams({ date_field: config.date_field! });
        if (config.end_date_field) params.set("end_date_field", config.end_date_field);
        if (config.group_by) params.set("group_by", config.group_by);
        return `/api/v1/projects/${projectId}/blueprints/${blueprintId}/timeline?${params}`;
    }, [projectId, blueprintId, config.date_field, config.end_date_field, config.group_by]);

    const { data, loading } = useJsonFetch<TimelineDataResponse>(dataUrl);

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
    const {
        visibleEntries,
        hiddenCount,
        pxPerYear,
        breaks,
        dateToPos,
        totalPx,
        breakLefts,
        gridLines,
    } = model;

    /* ── Build lanes ── */
    const lanes: TimelineLane[] = useMemo(() => {
        if (!visibleEntries.length) return [];

        if (!config.group_by) {
            return [
                {
                    key: "__all",
                    label: t("blueprints.timeline.lane.all_entries"),
                    entries: visibleEntries,
                },
            ];
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
            result.push({
                key: "__ungrouped",
                label: t("blueprints.timeline.lane.ungrouped"),
                entries: ungrouped,
            });
        }

        return result;
    }, [visibleEntries, config.group_by, t]);

    /* ── Apply lane filtering and merging ── */
    const visibleLanes: TimelineLane[] = useMemo(() => {
        // Filter out hidden lanes
        const filtered = lanes.filter((l) => !hiddenLanes.has(l.key));
        if (!mergeLanes || filtered.length <= 1) return filtered;

        // Merge all visible lanes into one
        const allEntries = filtered.flatMap((l) => l.entries);
        return [
            {
                key: "__merged",
                label: t("blueprints.timeline.lane.all_events"),
                entries: allEntries,
            },
        ];
    }, [lanes, hiddenLanes, mergeLanes, t]);

    void pxPerYear; // destructured from the model for future needs

    /* ── Zoom controls ── */
    function zoomIn() {
        const idx = ZOOM_INDEX[config.zoom];
        if (idx > 0) setConfig({ ...config, zoom: ZOOM_LEVELS[idx - 1].key });
    }

    function zoomOut() {
        const idx = ZOOM_INDEX[config.zoom];
        if (idx < ZOOM_LEVELS.length - 1)
            setConfig({ ...config, zoom: ZOOM_LEVELS[idx + 1].key });
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
        setSettingsInitialMenu("timeline");
        setShowSettingsModal(true);
    }

    /* ── Unconfigured state ── */
    if (!isConfigured) {
        return (
            <>
                <div className="flex flex-col items-center justify-center py-24">
                    <div
                        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                        style={introIconWrapStyle}
                    >
                        <i
                            className="fa-solid fa-timeline text-2xl"
                            style={{ color: "var(--theme-brand-primary-500)" }}
                        />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">
                        {t("blueprints.timeline.intro.title")}
                    </h3>
                    <p
                        className="mb-6 max-w-sm text-center text-sm"
                        style={subtitle50}
                    >
                        {t("blueprints.timeline.intro.body")}
                    </p>
                    <button
                        type="button"
                        onClick={openTimelineSettings}
                        className="alex-btn alex-btn--primary inline-flex items-center gap-2 px-3 py-1.5 text-sm"
                        style={{ borderRadius: "var(--theme-radius-button)" }}
                    >
                        <i className="fa-solid fa-gear text-xs" />
                        {t("blueprints.timeline.intro.configure")}
                    </button>
                </div>
                <ColumnConfigModal
                    open={showSettingsModal}
                    onClose={() => {
                        setShowSettingsModal(false);
                        setSettingsInitialMenu(undefined);
                    }}
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
                    referencingRelationshipBlueprints={
                        referencingRelationshipBlueprints
                    }
                    initialMenu={settingsInitialMenu}
                    timelineConfig={config}
                    onTimelineConfigChange={setConfig}
                    timelineBlueprints={timelineBlueprints}
                />
            </>
        );
    }

    const isHorizontal = config.orientation === "horizontal";
    const LANE_HEADER_SIZE = 140; // px for lane label column/row
    const AXIS_SIZE = 40; // px for the date axis

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Stats badge */}
                {data && (
                    <span style={secondaryBadgeStyle}>
                        <i
                            className="fa-solid fa-clock-rotate-left text-[9px]"
                            style={{
                                color: "color-mix(in srgb, var(--theme-brand-secondary-content) 70%, transparent)",
                            }}
                        />
                        {t(
                            data.total === 1
                                ? "blueprints.timeline.count.singular"
                                : "blueprints.timeline.count.plural",
                        ).replace(":count", String(data.total))}
                        {data.capped && (
                            <span style={cappedTextStyle}>
                                {t("blueprints.timeline.capped").replace(
                                    ":max",
                                    "500",
                                )}
                            </span>
                        )}
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
                        style={warningBadgeStyle}
                        title={t("blueprints.timeline.hidden_range.tooltip")}
                    >
                        <i className="fa-solid fa-eye-slash text-[9px]" />
                        {t("blueprints.timeline.hidden_range.label").replace(
                            ":count",
                            String(hiddenCount),
                        )}
                    </button>
                )}

                {/* Orientation toggle */}
                <div className="flex" style={segmentedToolbarStyle}>
                    <button
                        type="button"
                        onClick={() =>
                            setConfig({ ...config, orientation: "horizontal" })
                        }
                        className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs"
                        style={
                            isHorizontal
                                ? segmentBtnActiveStyle
                                : segmentBtnIdleStyle
                        }
                    >
                        <i className="fa-solid fa-arrows-left-right text-[10px]" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            setConfig({ ...config, orientation: "vertical" })
                        }
                        className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs"
                        style={
                            !isHorizontal
                                ? segmentBtnActiveStyle
                                : segmentBtnIdleStyle
                        }
                    >
                        <i className="fa-solid fa-arrows-up-down text-[10px]" />
                    </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={zoomIn}
                        className={ghostBtnClass}
                        title={t("blueprints.timeline.zoom_in")}
                    >
                        <i className="fa-solid fa-magnifying-glass-plus text-xs" />
                    </button>
                    <span
                        className="min-w-[4.5rem] text-center text-xs"
                        style={subtitle50}
                    >
                        {ZOOM_LEVELS[ZOOM_INDEX[config.zoom]].label}
                    </span>
                    <button
                        type="button"
                        onClick={zoomOut}
                        className={ghostBtnClass}
                        title={t("blueprints.timeline.zoom_out")}
                    >
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
                            className={
                                mergeLanes ? primaryBtnClass : ghostBtnClass
                            }
                            style={
                                mergeLanes ? undefined : ghostBtnBorderedStyle
                            }
                            title={
                                mergeLanes
                                    ? t(
                                          "blueprints.timeline.lane.split_tooltip",
                                      )
                                    : t(
                                          "blueprints.timeline.lane.merge_tooltip",
                                      )
                            }
                        >
                            <i
                                className={`fa-solid ${mergeLanes ? "fa-table-columns" : "fa-compress"} text-[10px]`}
                            />
                            {mergeLanes
                                ? t("blueprints.timeline.lane.split")
                                : t("blueprints.timeline.lane.merge")}
                        </button>

                        {/* Lane visibility filter */}
                        <div className="relative" ref={laneFilterRef}>
                            <button
                                type="button"
                                onClick={() =>
                                    setShowLaneFilter(!showLaneFilter)
                                }
                                className={
                                    hiddenLanes.size > 0
                                        ? warningBtnClass
                                        : ghostBtnClass
                                }
                                style={
                                    hiddenLanes.size > 0
                                        ? undefined
                                        : ghostBtnBorderedStyle
                                }
                            >
                                <i className="fa-solid fa-filter text-[10px]" />
                                {t("blueprints.timeline.lane.filter_label")}
                                {hiddenLanes.size > 0 && (
                                    <span style={dotMiniBadgeStyle}>
                                        {lanes.length - hiddenLanes.size}/
                                        {lanes.length}
                                    </span>
                                )}
                            </button>
                            {showLaneFilter && (
                                <div
                                    className="absolute right-0 top-full z-30 mt-1 w-56"
                                    style={laneFilterPopupStyle}
                                >
                                    <div
                                        className="px-3 py-2"
                                        style={laneFilterHeaderStyle}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className="text-xs font-medium"
                                                style={subtitle70}
                                            >
                                                {t(
                                                    "blueprints.timeline.lane.show_lanes",
                                                )}
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setHiddenLanes(
                                                            new Set(),
                                                        )
                                                    }
                                                    className="text-[10px] hover:underline"
                                                    style={primaryLinkStyle}
                                                >
                                                    {t(
                                                        "blueprints.timeline.lane.all",
                                                    )}
                                                </button>
                                                <span
                                                    style={{
                                                        color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                                                    }}
                                                >
                                                    |
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setHiddenLanes(
                                                            new Set(
                                                                lanes.map(
                                                                    (l) =>
                                                                        l.key,
                                                                ),
                                                            ),
                                                        )
                                                    }
                                                    className="text-[10px] hover:underline"
                                                    style={primaryLinkStyle}
                                                >
                                                    {t(
                                                        "blueprints.timeline.lane.none",
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto py-1">
                                        {lanes.map((lane, i) => (
                                            <label
                                                key={lane.key}
                                                className="alex-row flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        !hiddenLanes.has(
                                                            lane.key,
                                                        )
                                                    }
                                                    onChange={() => {
                                                        const next = new Set(
                                                            hiddenLanes,
                                                        );
                                                        if (next.has(lane.key))
                                                            next.delete(
                                                                lane.key,
                                                            );
                                                        else next.add(lane.key);
                                                        setHiddenLanes(next);
                                                    }}
                                                    style={{
                                                        accentColor:
                                                            "var(--theme-brand-primary-500)",
                                                    }}
                                                />
                                                <div
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={laneDotStyle(i)}
                                                />
                                                <span className="flex-1 truncate">
                                                    {lane.label}
                                                </span>
                                                <span style={subtitle30}>
                                                    {lane.entries.length}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Config button */}
                <button
                    type="button"
                    onClick={openTimelineSettings}
                    className={ghostBtnClass}
                >
                    <i className="fa-solid fa-gear text-xs" />
                    {t("blueprints.timeline.configure")}
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
            <div
                className={`relative w-full ${loading ? "opacity-60 animate-pulse" : ""}`}
                style={panelShellStyle}
            >
                <div
                    ref={scrollRef}
                    className="scrollbar-subtle overflow-x-auto"
                    style={panelInnerStyle}
                >
                    {!data || data.entries.length === 0 ? (
                        <div
                            className="flex items-center justify-center py-20 text-sm"
                            style={subtitle30}
                        >
                            {loading
                                ? t("common.loading")
                                : t(
                                      "blueprints.timeline.empty.no_dated_entries",
                                  )}
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
                onClose={() => {
                    setShowSettingsModal(false);
                    setSettingsInitialMenu(undefined);
                }}
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
                referencingRelationshipBlueprints={
                    referencingRelationshipBlueprints
                }
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

function HorizontalTimeline({
    lanes,
    gridLines,
    dateToPos,
    totalPx,
    zoom,
    laneHeaderSize,
    axisSize,
    hoveredEntry,
    onHover,
    fmtDate,
    breaks,
    breakLefts,
}: TimelineCanvasProps) {
    // Pre-compute layout for each lane
    const laneLayouts = useMemo(
        () => lanes.map((lane) => layoutItems(lane.entries, dateToPos)),
        [lanes, dateToPos],
    );

    const TRAIL = 40; // right-side breathing room past the final grid line

    return (
        <div
            className="relative"
            style={{ minWidth: totalPx + laneHeaderSize + TRAIL }}
        >
            {/* Shared zigzag overlay — offset by laneHeaderSize since
                the lane-header column is a non-timeline sibling column. */}
            <TimelineBreakOverlay
                breaks={breaks}
                breakLefts={breakLefts}
                leftOffset={laneHeaderSize}
            />

            {/* Axis row — sticky top. Label container explicitly sized to
                totalPx + trail so labels/ticks stay aligned with the lane
                grid below when the scroll area is wider than the content.
                Bottom border is intentionally stronger (content/25) to
                read as a clear axis line. */}
            <div
                className="sticky top-0 z-20 flex"
                style={{ height: axisSize, ...axisStickyStyle }}
            >
                {/* Corner spacer */}
                <div
                    className="flex-shrink-0"
                    style={{ width: laneHeaderSize, ...axisCornerStyle }}
                />
                {/* Shared axis — break boundaries are flanked by regular
                    gridlines (since break.endYears is snapped to a grid
                    boundary), so no bespoke boundary labels are needed. */}
                <TimelineAxis
                    gridLines={gridLines}
                    dateToPos={dateToPos}
                    zoom={zoom}
                    width={totalPx + TRAIL}
                    height={axisSize}
                />
            </div>

            {/* Lanes — alternating bg + colored left-rail on the header
                gives each lane a clear identity. The body also picks up a
                very faint tint of the lane color so entries visually
                belong to their row. */}
            {lanes.map((lane, laneIdx) => {
                const { items, rowCount } = laneLayouts[laneIdx];
                const height = laneHeight(rowCount);
                const isEven = laneIdx % 2 === 0;
                const isLast = laneIdx === lanes.length - 1;

                return (
                    <div
                        key={lane.key}
                        className="flex"
                        style={{
                            height,
                            ...laneRowBgStyle(isEven),
                            ...(isLast ? {} : laneRowBorderStyle),
                        }}
                    >
                        {/* Lane header — colored left rail + tint + count pill */}
                        <div
                            className="sticky left-0 z-10 flex flex-shrink-0 items-center gap-2 px-3"
                            style={{
                                width: laneHeaderSize,
                                ...laneHeaderColumnStyle,
                                ...laneHeaderStyle(laneIdx),
                            }}
                        >
                            <span
                                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                style={laneDotStyle(laneIdx)}
                                aria-hidden="true"
                            />
                            <span
                                className="flex-1 truncate text-xs font-medium"
                                title={lane.label}
                            >
                                {lane.label}
                            </span>
                            <span
                                className="text-[10px] tabular-nums"
                                style={subtitle50}
                            >
                                {lane.entries.length}
                            </span>
                        </div>

                        {/* Lane content */}
                        <div
                            className="relative flex-shrink-0"
                            style={{ width: totalPx + TRAIL }}
                        >
                            {/* Grid lines — darkened from /5 to /10 so the
                                column structure reads at a glance. */}
                            {gridLines.map((year, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 h-full"
                                    style={{
                                        left: dateToPos(String(year)),
                                        ...gridLineStyle,
                                    }}
                                />
                            ))}

                            {/* Entries */}
                            {items.map((item) => (
                                <TimelineItemHorizontal
                                    key={item.entry.id}
                                    entry={item.entry}
                                    dateToPos={dateToPos}
                                    row={item.row}
                                    paletteIdx={laneIdx % LANE_PALETTE.length}
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
    const rangeWidth = isRange
        ? Math.max(dateToPos(entry.end_date!) - left, 4)
        : 0;
    const top = LANE_PADDING + row * ITEM_ROW_HEIGHT;
    const isStub = entry.is_stub;

    const tooltipContent = (
        <EntryTooltipContent entry={entry} fmtDate={fmtDate} />
    );

    /* Dot + name rendering for every entry:
        - Full entries: colored solid dot, name linkable to the entry.
        - Stubs: hollow ring (border only, no fill), italic muted name,
          rendered in a <span> so it isn't clickable since stubs don't
          have a full page.
       Range entries also render a thin horizontal bar from start → end
       below the dot so the duration reads visually without forcing the
       name inside a pill that shrinks to nothing on small ranges. */
    const dotAndLabel = (
        <span
            className={`relative flex items-center gap-1.5 ${isStub ? "cursor-default" : "cursor-pointer"}`}
        >
            <span
                className={`h-3 w-3 flex-shrink-0 rounded-full transition-transform ${isHovered ? "scale-150" : ""}`}
                style={{
                    ...dotBorderStyle,
                    ...(isStub ? stubDotStyle : laneDotStyle(paletteIdx)),
                }}
                aria-hidden="true"
            />
            <span
                className={`max-w-[14rem] truncate whitespace-nowrap text-[10px] font-medium transition-opacity ${
                    isStub ? "italic pr-0.5" : ""
                } ${isHovered ? "opacity-100" : "opacity-80"}`}
                style={isStub ? subtitle50 : undefined}
            >
                {entry.name}
            </span>
        </span>
    );

    return (
        <div
            className={`absolute ${isHovered ? "z-30" : "z-10"}`}
            style={{ left, top }}
            onMouseEnter={() => onHover(entry.id)}
            onMouseLeave={() => onHover(null)}
        >
            {/* Range bar — drawn behind the dot, aligned to the dot's
                vertical center. Dashed for stubs, tinted for full. */}
            {isRange && rangeWidth > 0 && (
                <span
                    className="pointer-events-none absolute left-1.5 top-[5px] h-0.5 rounded-full"
                    style={{
                        width: rangeWidth,
                        ...(isStub
                            ? stubRangeBarStyle
                            : laneRangeBarStyle(paletteIdx)),
                    }}
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
                    className="pointer-events-none absolute h-3 w-3 rounded-full"
                    style={{
                        left: rangeWidth,
                        top: 0,
                        ...dotBorderStyle,
                        ...(isStub ? stubDotStyle : laneDotStyle(paletteIdx)),
                    }}
                    aria-hidden="true"
                />
            )}
            <Tooltip content={tooltipContent} placement="top" delay={200}>
                {isStub ? (
                    <span>{dotAndLabel}</span>
                ) : (
                    <a
                        href={entry.url}
                        className="no-underline text-inherit hover:text-inherit"
                    >
                        {dotAndLabel}
                    </a>
                )}
            </Tooltip>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Vertical Timeline — time flows top to bottom, lanes side by side
   ═══════════════════════════════════════════════════════════════ */

function VerticalTimeline({
    lanes,
    gridLines,
    dateToPos,
    totalPx,
    zoom,
    axisSize,
    hoveredEntry,
    onHover,
    fmtDate,
    breaks,
    breakLefts,
}: TimelineCanvasProps) {
    const BASE_LANE_WIDTH = 140;
    const COL_WIDTH = 120; // px per stacked column within a lane

    // Pre-compute layout for each lane (reuses layoutItems with vertical item extents)
    const laneLayouts = useMemo(
        () =>
            lanes.map((lane) => {
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
        <div
            className="relative"
            style={{ minHeight: totalPx + axisSize + TRAIL }}
        >
            {/* Shared zigzag overlay — vertical mode paints each break as
                a horizontal band spanning the full canvas width. Offset
                by the lane-header row height (40px) so breakLefts are
                relative to the scrollable canvas content. */}
            <TimelineBreakOverlay
                breaks={breaks}
                breakLefts={breakLefts}
                leftOffset={40}
                orientation="vertical"
            />

            {/* Header row with lane labels */}
            <div
                className="sticky top-0 z-20 flex h-10"
                style={axisStickyStyle}
            >
                {/* Corner spacer for axis */}
                <div
                    className="flex-shrink-0"
                    style={{ width: AXIS_W, ...axisCornerStyle }}
                />
                {/* Lane headers — colored top rail + tint + count pill */}
                {lanes.map((lane, laneIdx) => {
                    const { colCount } = laneLayouts[laneIdx];
                    const width = Math.max(
                        BASE_LANE_WIDTH,
                        colCount * COL_WIDTH,
                    );
                    const isLast = laneIdx === lanes.length - 1;
                    return (
                        <div
                            key={lane.key}
                            className="flex flex-shrink-0 items-center gap-2 px-3"
                            style={{
                                width,
                                borderTop: "3px solid transparent",
                                ...(isLast ? {} : axisCornerStyle),
                                ...laneHeaderStyle(laneIdx),
                                // Drop the left-rail border for the horizontal header bar
                                borderLeftWidth: 0,
                            }}
                        >
                            <span
                                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                style={laneDotStyle(laneIdx)}
                                aria-hidden="true"
                            />
                            <span
                                className="flex-1 truncate text-xs font-medium"
                                title={lane.label}
                            >
                                {lane.label}
                            </span>
                            <span
                                className="text-[10px] tabular-nums"
                                style={subtitle50}
                            >
                                {lane.entries.length}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Body: axis + lanes */}
            <div className="flex" style={{ minHeight: totalPx + TRAIL }}>
                {/* Axis column — sticky, with tick marks anchored to its right edge */}
                <div
                    className="sticky left-0 z-10 flex-shrink-0"
                    style={{ width: AXIS_W, ...verticalAxisColStyle }}
                >
                    <div
                        className="relative"
                        style={{ height: totalPx + TRAIL }}
                    >
                        {gridLines.map((year, i) => {
                            const top = dateToPos(String(year));
                            return (
                                <div
                                    key={i}
                                    className="pointer-events-none absolute left-0 right-0 flex items-center justify-end gap-1 pr-1"
                                    style={{
                                        top,
                                        transform: "translateY(-50%)",
                                    }}
                                >
                                    <span
                                        className="whitespace-nowrap text-[10px] font-medium"
                                        style={subtitle60}
                                    >
                                        {formatAxisLabel(year, zoom)}
                                    </span>
                                    <span
                                        className="block h-px w-2"
                                        style={axisTickStyle}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Lane columns — alternating tint + colored left rail */}
                {lanes.map((lane, laneIdx) => {
                    const { items, colCount } = laneLayouts[laneIdx];
                    const width = Math.max(
                        BASE_LANE_WIDTH,
                        colCount * COL_WIDTH,
                    );
                    const isEven = laneIdx % 2 === 0;
                    const isLast = laneIdx === lanes.length - 1;

                    return (
                        <div
                            key={lane.key}
                            className="relative flex-shrink-0"
                            style={{
                                width,
                                height: totalPx + TRAIL,
                                ...laneRowBgStyle(isEven),
                                ...laneHeaderStyle(laneIdx),
                                // Right border (none on last lane)
                                ...(isLast
                                    ? { borderRight: "none" }
                                    : {
                                          borderRight:
                                              "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                                      }),
                            }}
                        >
                            {/* Grid lines */}
                            {gridLines.map((year, i) => (
                                <div
                                    key={i}
                                    className="absolute left-0 w-full"
                                    style={{
                                        top: dateToPos(String(year)),
                                        ...gridLineHorizontalStyle,
                                    }}
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
                                    paletteIdx={laneIdx % LANE_PALETTE.length}
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
    const rangeHeight = isRange
        ? Math.max(dateToPos(entry.end_date!) - top, 4)
        : 0;
    const left = 8 + col * colWidth;
    const isStub = entry.is_stub;

    const tooltipContent = (
        <EntryTooltipContent entry={entry} fmtDate={fmtDate} />
    );

    const dotAndLabel = (
        <span
            className={`relative flex items-center gap-1.5 ${isStub ? "cursor-default" : "cursor-pointer"}`}
        >
            <span
                className={`h-3 w-3 flex-shrink-0 rounded-full transition-transform ${isHovered ? "scale-150" : ""}`}
                style={{
                    ...dotBorderStyle,
                    ...(isStub ? stubDotStyle : laneDotStyle(paletteIdx)),
                }}
                aria-hidden="true"
            />
            <span
                className={`truncate text-[10px] font-medium transition-opacity ${
                    isStub ? "italic pr-0.5" : ""
                } ${isHovered ? "opacity-100" : "opacity-80"}`}
                style={isStub ? subtitle50 : undefined}
            >
                {entry.name}
            </span>
        </span>
    );

    return (
        <div
            className={`absolute ${isHovered ? "z-30" : "z-10"}`}
            style={{ top, left, width: colWidth - 8 }}
            onMouseEnter={() => onHover(entry.id)}
            onMouseLeave={() => onHover(null)}
        >
            {/* Range bar — vertical stroke from the dot downward to
                the end_date position. Dashed for stubs, tinted for full. */}
            {isRange && rangeHeight > 0 && (
                <span
                    className="pointer-events-none absolute left-[5px] top-3 w-0.5 rounded-full"
                    style={{
                        height: rangeHeight,
                        ...(isStub
                            ? stubRangeBarVerticalStyle
                            : laneRangeBarStyle(paletteIdx)),
                    }}
                    aria-hidden="true"
                />
            )}
            {/* Range end-marker — second dot at end_date position. Same
                role as the horizontal timeline's end-dot: guarantees the
                terminus reads as an anchor inside a break when the range
                crosses a zigzag. */}
            {isRange && rangeHeight > 4 && (
                <span
                    className="pointer-events-none absolute h-3 w-3 rounded-full"
                    style={{
                        left: 0,
                        top: rangeHeight,
                        ...dotBorderStyle,
                        ...(isStub ? stubDotStyle : laneDotStyle(paletteIdx)),
                    }}
                    aria-hidden="true"
                />
            )}
            <Tooltip content={tooltipContent} placement="right" delay={200}>
                {isStub ? (
                    <span>{dotAndLabel}</span>
                ) : (
                    <a
                        href={entry.url}
                        className="no-underline text-inherit hover:text-inherit"
                    >
                        {dotAndLabel}
                    </a>
                )}
            </Tooltip>
        </div>
    );
}
