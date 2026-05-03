import { useMemo } from 'react';
import {
    PX_PER_UNIT, gridUnitYears, generateGridLines, detectBreaks, createPositioner,
    filterGridLinesThroughBreaks, parseYear,
    type TimeBreak, type Year,
} from './timelineUtils';
import type { TimelineEntry, TimelineZoomLevel } from '@alexandria/types/timeline';

export interface TimelineModelOptions {
    /** Entries to render; only those with `start_date` contribute to the model. */
    entries: TimelineEntry[];
    /** Current zoom level (day, month, year, decade, century, millennium). */
    zoom: TimelineZoomLevel;
    /** Optional hard-pinned start year. When null, uses the data's min. */
    displayStartYear?: number | null;
    /** Optional hard-pinned end year. When null, uses the data's max. */
    displayEndYear?: number | null;
    /** Padding strategy — `'tight'` caps at one grid unit (used on very
        wide ranges so we don't waste columns); `'loose'` allows up to
        ~15% of the range. Defaults to `'tight'`. */
    paddingMode?: 'tight' | 'loose';
}

export interface TimelineModel {
    /** Effective visible year range after padding + display window. */
    yearRange: { minYear: Year; maxYear: Year } | null;
    /** Entries inside the effective range (display-window filter). */
    visibleEntries: TimelineEntry[];
    /** Count of entries excluded by the display window. */
    hiddenCount: number;
    /** Pixels-per-year at the current zoom. */
    pxPerYear: number;
    /** Scale breaks detected across the entries. */
    breaks: TimeBreak[];
    /** String→px positioning function that respects breaks. */
    dateToPos: (dateStr: string) => number;
    /** Total canvas width in pixels (with compression applied). */
    totalPx: number;
    /** Left-edge px of each break (for overlays). */
    breakLefts: number[];
    /** Axis gridlines (year numbers, break-filtered). */
    gridLines: Year[];
}

/**
 * Core timeline pipeline as a hook. Consumers get the computed model
 * (year range, breaks, positioner, gridlines) from a single call, so
 * every timeline surface gets the same break-aware, geological-scale
 * behavior without re-implementing the math.
 */
export function useTimelineModel({
    entries,
    zoom,
    displayStartYear = null,
    displayEndYear = null,
    paddingMode = 'tight',
}: TimelineModelOptions): TimelineModel {
    // ── Year range ──────────────────────────────────────────────────
    const yearRange = useMemo((): { minYear: Year; maxYear: Year } | null => {
        if (!entries.length) return null;
        let min = Infinity;
        let max = -Infinity;
        for (const e of entries) {
            if (!e.start_date) continue;
            const y = parseYear(e.start_date);
            if (isNaN(y)) continue;
            if (y < min) min = y;
            const endY = e.end_date ? parseYear(e.end_date) : y;
            if (!isNaN(endY) && endY > max) max = endY;
        }
        if (!isFinite(min) || !isFinite(max)) return null;

        const hasStart = displayStartYear != null;
        const hasEnd = displayEndYear != null;
        const dataMin = hasStart ? displayStartYear! : min;
        const dataMax = hasEnd ? displayEndYear! : max;

        if (hasStart && hasEnd) return { minYear: dataMin, maxYear: dataMax };

        const unit = gridUnitYears(zoom);
        const rangeYears = dataMax - dataMin;
        const padding = paddingMode === 'loose'
            ? Math.max(rangeYears * 0.15, unit)
            : Math.min(Math.max(rangeYears * 0.05, unit), unit);
        return {
            minYear: hasStart ? dataMin : dataMin - padding,
            maxYear: hasEnd ? dataMax : dataMax + padding,
        };
    }, [entries, zoom, displayStartYear, displayEndYear, paddingMode]);

    // ── Window filter ──────────────────────────────────────────────
    const visibleEntries = useMemo(() => {
        if (!entries.length || !yearRange) return entries;
        const hasStart = displayStartYear != null;
        const hasEnd = displayEndYear != null;
        if (!hasStart && !hasEnd) return entries;
        const { minYear, maxYear } = yearRange;
        return entries.filter((e) => {
            if (!e.start_date) return false;
            const sy = parseYear(e.start_date);
            if (isNaN(sy)) return false;
            const ey = e.end_date ? parseYear(e.end_date) : sy;
            return ey >= minYear && sy <= maxYear;
        });
    }, [entries, yearRange, displayStartYear, displayEndYear]);

    const hiddenCount = entries.length - visibleEntries.length;

    // ── Positioning math ──────────────────────────────────────────
    const totalYears = yearRange ? yearRange.maxYear - yearRange.minYear : 0;
    const pxPerYear = totalYears > 0 ? (PX_PER_UNIT[zoom] / gridUnitYears(zoom)) : 0;

    const breaks = useMemo(() => {
        if (!yearRange || !visibleEntries.length || pxPerYear <= 0) return [];
        return detectBreaks(visibleEntries, yearRange.minYear, pxPerYear, zoom);
    }, [yearRange, visibleEntries, pxPerYear, zoom]);

    const { dateToPos, totalPx, breakLefts } = useMemo(() => {
        if (!yearRange) return { dateToPos: (_d: string) => 0, totalPx: 0, breakLefts: [] as number[] };
        return createPositioner(yearRange.minYear, yearRange.maxYear, pxPerYear, breaks);
    }, [yearRange, pxPerYear, breaks]);

    const gridLines = useMemo(() => {
        if (!yearRange) return [] as Year[];
        const all = generateGridLines(yearRange.minYear, yearRange.maxYear, zoom, breaks);
        return filterGridLinesThroughBreaks(all, yearRange.minYear, breaks);
    }, [yearRange, zoom, breaks]);

    return { yearRange, visibleEntries, hiddenCount, pxPerYear, breaks, dateToPos, totalPx, breakLefts, gridLines };
}
