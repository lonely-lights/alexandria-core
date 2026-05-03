export type TimelineOrientation = 'horizontal' | 'vertical';

export type TimelineZoomLevel = 'day' | 'month' | 'year' | 'decade' | 'century' | 'millennium';

export interface TimelineConfig {
    date_field: string | null;         // e.g. 'field:start_datetime'
    end_date_field: string | null;     // optional, for ranges
    group_by: string | null;           // optional, for swim lanes
    orientation: TimelineOrientation;
    zoom: TimelineZoomLevel;
    /**
     * Optional display bounds. When set, the timeline window is pinned to
     * [display_start_year, display_end_year] instead of computing from the
     * data's min/max. Entries that fall outside these bounds are hidden
     * from the canvas and reported as a badge in the toolbar. Either side
     * can be null — in that case the data's actual extreme is used for
     * that side. Year-level precision is enough for bounding the view
     * and keeps BC-year input trivial (plain integer, negative = BC).
     */
    display_start_year: number | null;
    display_end_year: number | null;
}

export interface TimelineEntry {
    id: number;
    name: string;
    slug: string;
    url: string;
    summary: string | null;
    summary_html?: string | null;
    start_date: string | null;         // ISO date string
    end_date: string | null;           // ISO date string (null = point event)
    group_key: string | null;          // resolved group value
    group_id: number | null;           // entry ID if group is entry_reference
    is_stub: boolean;
}

export interface TimelineLane {
    key: string;
    label: string;
    entries: TimelineEntry[];
}

export interface TimelineDataResponse {
    entries: TimelineEntry[];
    total: number;
    capped: boolean;                   // true if results were truncated
    date_range: {
        min: string;
        max: string;
    } | null;
}

export const ZOOM_LEVELS: { key: TimelineZoomLevel; label: string; unitMs: number }[] = [
    { key: 'day',        label: 'Day',        unitMs: 86_400_000 },
    { key: 'month',      label: 'Month',      unitMs: 2_592_000_000 },
    { key: 'year',       label: 'Year',       unitMs: 31_536_000_000 },
    { key: 'decade',     label: 'Decade',     unitMs: 315_360_000_000 },
    { key: 'century',    label: 'Century',    unitMs: 3_153_600_000_000 },
    { key: 'millennium', label: 'Millennium', unitMs: 31_536_000_000_000 },
];

/** Default timeline config for new views */
export function defaultTimelineConfig(): TimelineConfig {
    return {
        date_field: null,
        end_date_field: null,
        group_by: null,
        orientation: 'horizontal',
        zoom: 'decade',
        display_start_year: null,
        display_end_year: null,
    };
}
