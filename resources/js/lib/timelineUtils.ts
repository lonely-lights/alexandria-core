import type { TimelineEntry, TimelineZoomLevel } from '@alexandria/types/timeline';
import { ZOOM_LEVELS } from '@alexandria/types/timeline';

/* ─── Types ─── */

export type DateFmt = (value: string | null | undefined) => string;

/** Year with optional fractional sub-year (0..1). e.g. 2036.29 ≈ mid-April
    2036. Uses plain JS Number — MAX_SAFE_INTEGER ≈ 9e15 is enough to
    represent any calendar year we care about including deep geological
    time (-4.5e9 = Earth's formation). This bypasses JS Date's ±274k-year
    ms ceiling entirely. */
export type Year = number;

export interface LayoutItem {
    entry: TimelineEntry;
    pos: number;
    extent: number;
    row: number;
}

/* ─── Constants ─── */

export const ZOOM_INDEX = Object.fromEntries(ZOOM_LEVELS.map((z, i) => [z.key, i]));

export const ITEM_ROW_HEIGHT = 22;
export const LANE_PADDING = 12;
export const MIN_LABEL_PX = 80;

/** Pixels per grid unit at each zoom level. */
export const PX_PER_UNIT: Record<TimelineZoomLevel, number> = {
    day: 80,
    month: 100,
    year: 90,
    decade: 120,
    century: 150,
    millennium: 200,
};

/* ─── Year-based time helpers ─── */

/** Width of one grid unit in YEARS. */
export function gridUnitYears(zoom: TimelineZoomLevel): number {
    switch (zoom) {
        case 'day': return 1 / 365.25;
        case 'month': return 1 / 12;
        case 'year': return 1;
        case 'decade': return 10;
        case 'century': return 100;
        case 'millennium': return 1000;
    }
}

/** Back-compat shim for anything still reading `gridUnitMs` — convert
    year-based unit size to ms using a constant year length. */
export function gridUnitMs(zoom: TimelineZoomLevel): number {
    return gridUnitYears(zoom) * 365.25 * 86400 * 1000;
}

/**
 * Parse an entry's date string into a Year number.
 * Accepts:
 *   - plain integer year: "2036", "-500", "-4500000000"
 *   - ISO date: "2036-04-18", "-000500-01-01", etc. (when in JS Date range)
 *   - partial ISO: "2036-04", "2036"
 * Returns NaN for strings that can't be parsed.
 */
export function parseYear(str: string | null | undefined): Year {
    if (str == null) return NaN;
    const trimmed = String(str).trim();
    if (!trimmed) return NaN;

    // Pure number (integer or float, supports negatives). Handles both
    // plain year entries like "-4500000000" and fractional gridline
    // strings like "2036.25" emitted by `String(year)` calls downstream.
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }

    // ISO-like "YYYY-MM-DD" or "YYYY-MM" — extract year + fractional month
    const isoMatch = trimmed.match(/^(-?\d+)-(\d{1,2})(?:-(\d{1,2}))?/);
    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Math.max(0, Math.min(11, Number(isoMatch[2]) - 1));
        const day = isoMatch[3] ? Math.max(1, Math.min(31, Number(isoMatch[3]))) : 1;
        // Sub-year fraction, approximated: month/12 + day/(12*30)
        return year + month / 12 + (day - 1) / (12 * 30);
    }

    // Last-ditch: try JS Date (for RFC-2822 strings etc.)
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const yearStart = new Date(d.getFullYear(), 0, 1).getTime();
        const yearEnd = new Date(d.getFullYear() + 1, 0, 1).getTime();
        const frac = (d.getTime() - yearStart) / (yearEnd - yearStart);
        return year + frac;
    }

    // Fallback: leading integer
    const lead = trimmed.match(/^(-?\d+)/);
    return lead ? Number(lead[1]) : NaN;
}

/** Snap a year DOWN to the nearest gridline at the given zoom. */
export function snapToGridYear(year: Year, zoom: TimelineZoomLevel): Year {
    const unit = gridUnitYears(zoom);
    return Math.floor(year / unit) * unit;
}

/** First gridline strictly AFTER the given year. */
export function nextGridLineYear(year: Year, zoom: TimelineZoomLevel): Year {
    const unit = gridUnitYears(zoom);
    return Math.floor(year / unit) * unit + unit;
}

function ordinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = Math.abs(n) % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

/** Format a large absolute-year for geological-scale labels
    (e.g., -4.5e9 → "4.5 Ga", -65_000_000 → "65 Ma"). Returns null
    when the year is within "normal" calendrical range. */
function formatGeoLabel(year: Year): string | null {
    const abs = Math.abs(year);
    if (abs < 1_000_000) return null;
    const suffix = year < 0 ? ' ago' : '';
    if (abs >= 1_000_000_000) {
        return `${(abs / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} Ga${suffix}`;
    }
    return `${(abs / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} Ma${suffix}`;
}

export function formatAxisLabel(year: Year, zoom: TimelineZoomLevel): string {
    // Geological-scale fallback — kicks in automatically when the
    // year is deep enough that Ma/Ga reads better than an ordinal
    // millennium count.
    const geo = formatGeoLabel(year);
    if (geo !== null) return geo;

    const y = Math.round(year);
    switch (zoom) {
        case 'day': {
            // For day-zoom we still want "Mon DD, YYYY" if in Date range,
            // otherwise fall back to year-only.
            if (y >= -270000 && y <= 275000) {
                const d = new Date(0);
                d.setFullYear(y, Math.floor((year - y) * 12), 1);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            }
            return y < 0 ? `${Math.abs(y)} BC` : String(y);
        }
        case 'month': {
            if (y >= -270000 && y <= 275000) {
                const d = new Date(0);
                d.setFullYear(y, Math.floor((year - y) * 12), 1);
                return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            }
            return y < 0 ? `${Math.abs(y)} BC` : String(y);
        }
        case 'year':
            return y < 0 ? `${Math.abs(y)} BC` : String(y);
        case 'decade': {
            const base = Math.floor(Math.abs(y) / 10) * 10;
            return y < 0 ? `${base}s BC` : `${base}s`;
        }
        case 'century': {
            const c = y >= 0
                ? Math.floor(y / 100) + 1
                : Math.abs(Math.floor(y / 100));
            return y < 0 ? `${c}${ordinalSuffix(c)} c. BC` : `${c}${ordinalSuffix(c)} c.`;
        }
        case 'millennium': {
            const m = y >= 0
                ? Math.floor(y / 1000) + 1
                : Math.abs(Math.floor(y / 1000));
            return y < 0 ? `${m}${ordinalSuffix(m)} mil. BC` : `${m}${ordinalSuffix(m)} mil.`;
        }
    }
}

/** Safety cap on how many gridlines we're willing to render. */
const MAX_GRID_LINES = 10_000;

/**
 * Generate axis gridlines for the given year range at the given zoom.
 *
 * When `breaks` is supplied, the function walks each non-break segment
 * independently so the STRIDE is set per-segment rather than based on
 * the total (pre-compression) range. Without this, a 4-billion-year
 * timeline with a single huge break would space gridlines 400,000
 * years apart — none of which land inside the tiny visible segments
 * flanking the zigzag. Passing breaks makes every visible slice get
 * natural decade/millennium gridlines of its own.
 */
export function generateGridLines(
    minYear: Year,
    maxYear: Year,
    zoom: TimelineZoomLevel,
    breaks: TimeBreak[] = [],
): Year[] {
    const unit = gridUnitYears(zoom);
    const lines: Year[] = [];

    const segments: Array<{ from: Year; to: Year }> = [];
    if (breaks.length === 0) {
        segments.push({ from: minYear, to: maxYear });
    } else {
        const sorted = [...breaks].sort((a, b) => a.startYears - b.startYears);
        let cursor = 0;
        for (const br of sorted) {
            if (br.startYears > cursor) {
                segments.push({ from: minYear + cursor, to: minYear + br.startYears });
            }
            cursor = br.endYears;
        }
        if (cursor < (maxYear - minYear)) {
            segments.push({ from: minYear + cursor, to: maxYear });
        }
    }

    for (const seg of segments) {
        const spanYears = seg.to - seg.from;
        if (spanYears <= 0) continue;
        const idealCount = spanYears / unit;
        const remaining = MAX_GRID_LINES - lines.length;
        if (remaining <= 0) break;
        const stride = Math.max(1, Math.ceil(idealCount / remaining));
        const step = unit * stride;

        let cursor = snapToGridYear(seg.from, zoom);
        const safeMax = seg.to + unit;
        while (cursor <= safeMax && lines.length < MAX_GRID_LINES) {
            lines.push(cursor);
            cursor += step;
        }
    }
    return lines;
}

/* ─── Layout (collision detection) ─── */

export function layoutItems(
    entries: TimelineEntry[],
    dateToPos: (d: string) => number,
    gap: number = 4,
): { items: LayoutItem[]; rowCount: number } {
    const items: LayoutItem[] = entries
        .filter((e) => e.start_date)
        .map((entry) => {
            const pos = dateToPos(entry.start_date!);
            const isRange = !!entry.end_date;
            const nameWidth = MIN_LABEL_PX + entry.name.length * 4;
            const extent = isRange
                ? Math.max(dateToPos(entry.end_date!) - pos, nameWidth, 24)
                : nameWidth;
            return { entry, pos, extent, row: 0 };
        })
        .sort((a, b) => a.pos - b.pos);

    if (items.length === 0) return { items, rowCount: 1 };

    const rowEnds: number[] = [];
    for (const item of items) {
        let placed = false;
        for (let r = 0; r < rowEnds.length; r++) {
            if (item.pos >= rowEnds[r] + gap) {
                item.row = r;
                rowEnds[r] = item.pos + item.extent;
                placed = true;
                break;
            }
        }
        if (!placed) {
            item.row = rowEnds.length;
            rowEnds.push(item.pos + item.extent);
        }
    }

    return { items, rowCount: Math.max(rowEnds.length, 1) };
}

export function laneHeight(rowCount: number): number {
    return rowCount * ITEM_ROW_HEIGHT + LANE_PADDING * 2;
}

/* ═══════════════════════════════════════════════════════════════
   Time Breaks — year-based
   ═══════════════════════════════════════════════════════════════ */

export interface TimeBreak {
    /** Start of elided span, in YEARS offset from minYear. */
    startYears: number;
    /** End of elided span, in YEARS offset from minYear. */
    endYears: number;
    compressedPx: number;
}

export const BREAK_COMPRESSED_PX = 32;
export const BREAK_THRESHOLD_PX = 200;

export function detectBreaks(
    entries: TimelineEntry[],
    minYear: Year,
    pxPerYear: number,
    zoom: TimelineZoomLevel,
    thresholdPx: number = BREAK_THRESHOLD_PX,
    compressedPx: number = BREAK_COMPRESSED_PX,
): TimeBreak[] {
    if (!entries.length) return [];

    type Iv = { start: number; end: number; nameWidthYears: number };
    /**
     * Each entry contributes point-markers instead of a single
     * [start, end] span, so the detector can find gaps INSIDE long
     * ranges as well as between entries.
     *
     *   • Point event → one marker at `start`, reserving label width.
     *   • Range event → two markers:
     *       - `start`  : reserves label width (dot + name live here)
     *       - `end`    : reserves only a small pad (bar terminus)
     *     The detector then treats the years between the two markers as
     *     an empty stretch and can collapse it into a zigzag the same
     *     way it collapses gaps between separate entries. This is how
     *     a 3.35-billion-year Hidden Wars entry stops turning the
     *     canvas into an ocean of empty rule.
     */
    const intervals: Iv[] = entries
        .filter((e) => e.start_date)
        .flatMap<Iv>((e) => {
            const startYear = parseYear(e.start_date);
            const endYear = e.end_date ? parseYear(e.end_date) : startYear;
            if (isNaN(startYear) || isNaN(endYear)) return [];

            const nameWidthPx = MIN_LABEL_PX + e.name.length * 4;
            const nameWidthYears = pxPerYear > 0 ? nameWidthPx / pxPerYear : 0;
            const start = startYear - minYear;
            const end = endYear - minYear;

            if (endYear === startYear) {
                return [{ start, end: start, nameWidthYears }];
            }
            // The end-marker reserves enough horizontal space for the
            // rendered end-dot (≈ 16 px), converted to years at the
            // current zoom. Without this, the two breaks bracketing the
            // range end snap flush together with no room for the dot —
            // making the range appear to terminate at whatever follows
            // the zigzag (e.g., Hidden Wars "ending in the 2030s").
            const endDotPx = 16;
            const endDotYears = pxPerYear > 0 ? endDotPx / pxPerYear : 0;
            return [
                { start, end: start, nameWidthYears },
                { start: end, end: end + endDotYears, nameWidthYears: 0 },
            ];
        })
        .sort((a, b) => a.start - b.start);

    const merged: Iv[] = [];
    for (const iv of intervals) {
        const last = merged[merged.length - 1];
        if (last && iv.start <= last.end) {
            if (iv.end >= last.end) {
                last.end = iv.end;
                last.nameWidthYears = iv.nameWidthYears;
            }
        } else {
            merged.push({ ...iv });
        }
    }

    const breaks: TimeBreak[] = [];
    for (let i = 0; i < merged.length - 1; i++) {
        const rawGapStart = merged[i].end;
        const gapEnd = merged[i + 1].start;
        const gapYears = gapEnd - rawGapStart;
        if (gapYears <= 0) continue;

        const gapPx = gapYears * pxPerYear;
        if (gapPx <= thresholdPx) continue;

        const shifted = rawGapStart + merged[i].nameWidthYears;
        const startYears = Math.min(shifted, gapEnd - 1e-6);

        // Snap the right edge DOWN to the last gridline boundary before
        // the next cluster so its label falls at the zigzag's right edge.
        const absEnd = gapEnd + minYear;
        const endSnappedAbs = snapToGridYear(absEnd, zoom);
        const endYears = Math.max(endSnappedAbs - minYear, startYears + 1e-6);

        if (endYears <= startYears) continue;
        breaks.push({ startYears, endYears, compressedPx });
    }

    // Keep adjacent breaks separate (no collapse) — the end-marker of a
    // range entry reserves a small horizontal pad, which creates enough
    // space between consecutive breaks for the range end-dot to render
    // visibly between the two zigzags. Collapsing them would hide the
    // end-dot inside a merged strip and make ranges appear to end
    // somewhere downstream (e.g., Hidden Wars "ending in the 2030s").
    return breaks;
}

export interface Positioner {
    /** Convert an ISO/year-string to a canvas pixel position. */
    dateToPos: (dateStr: string) => number;
    totalPx: number;
    breakLefts: number[];
}

/** Extra pixel pad inserted after every break's compressed strip so
    the first post-zigzag gridline label doesn't render flush against
    the zigzag's right edge. Without this, break.endYears snaps to a
    gridline and the label sits directly on the zigzag. */
const POST_BREAK_PAD_PX = 10;

export function createPositioner(
    minYear: Year,
    maxYear: Year,
    pxPerYear: number,
    breaks: TimeBreak[],
): Positioner {
    const sorted = [...breaks].sort((a, b) => a.startYears - b.startYears);

    const segments: Array<{ yrs: number; px: number; rate: number; spanYrs: number }> = [];
    let cursorY = 0;
    let cursorPx = 0;
    for (const br of sorted) {
        const preY = br.startYears - cursorY;
        if (preY > 0) {
            segments.push({ yrs: cursorY, px: cursorPx, rate: pxPerYear, spanYrs: preY });
            cursorY += preY;
            cursorPx += preY * pxPerYear;
        }
        const gapY = br.endYears - br.startYears;
        const rate = gapY > 0 ? br.compressedPx / gapY : 0;
        segments.push({ yrs: cursorY, px: cursorPx, rate, spanYrs: gapY });
        cursorY += gapY;
        cursorPx += br.compressedPx;
        // Shift subsequent pixel positions right by the post-break pad
        // — cursorY stays, so dates beyond the break map to their real
        // position + the pad.
        cursorPx += POST_BREAK_PAD_PX;
    }
    const tailY = (maxYear - minYear) - cursorY;
    if (tailY > 0) {
        segments.push({ yrs: cursorY, px: cursorPx, rate: pxPerYear, spanYrs: tailY });
        cursorPx += tailY * pxPerYear;
    }

    const breakLefts = sorted.map((br) => {
        let px = 0;
        for (const seg of segments) {
            if (seg.yrs + seg.spanYrs <= br.startYears) {
                px += seg.spanYrs * seg.rate;
                continue;
            }
            if (seg.yrs <= br.startYears) {
                px += (br.startYears - seg.yrs) * seg.rate;
            }
            break;
        }
        return px;
    });

    const dateToPos = (dateStr: string): number => {
        const year = parseYear(dateStr);
        if (isNaN(year)) return 0;
        const offset = year - minYear;
        if (segments.length === 0) return 0;
        for (const seg of segments) {
            if (offset <= seg.yrs + seg.spanYrs) {
                return seg.px + (offset - seg.yrs) * seg.rate;
            }
        }
        return cursorPx;
    };

    return { dateToPos, totalPx: cursorPx, breakLefts };
}

/** Filter gridlines so none of them land inside a break. */
export function filterGridLinesThroughBreaks(
    gridLines: Year[],
    minYear: Year,
    breaks: TimeBreak[],
): Year[] {
    if (breaks.length === 0) return gridLines;
    return gridLines.filter((yr) => {
        const offset = yr - minYear;
        return !breaks.some((br) => offset > br.startYears && offset < br.endYears);
    });
}

/* ─── Display helpers ─── */

export function formatEntryDate(entry: TimelineEntry, fmtDate: DateFmt): string {
    const start = entry.start_date ? fmtDate(entry.start_date) : '';
    const end = entry.end_date ? fmtDate(entry.end_date) : '';
    if (start && end) return `${start} — ${end}`;
    return start;
}
