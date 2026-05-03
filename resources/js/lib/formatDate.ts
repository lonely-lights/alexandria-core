import { usePage } from '@inertiajs/react';

type DateFormat = 'MDY' | 'DMY' | 'YMD';
type TimeFormat = '12h' | '24h';

interface AuthProps {
    auth?: {
        preferences?: {
            date_format?: DateFormat;
            time_format?: TimeFormat;
        };
    } | null;
}

/** Check if a value is a date-only string (YYYY-MM-DD with no time component) */
function isDateOnly(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/** Parse date components without timezone shifting. Returns [year, month (1-based), day]. */
function parseDateParts(value: string): [number, number, number] | null {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * Get the user's date/time format preferences from Inertia shared props.
 */
export function useDatePreferences(): { dateFormat: DateFormat; timeFormat: TimeFormat } {
    const { auth } = usePage().props as unknown as AuthProps;
    return {
        dateFormat: auth?.preferences?.date_format ?? 'MDY',
        timeFormat: auth?.preferences?.time_format ?? '12h',
    };
}

/**
 * Format a date string according to user preferences.
 *
 * Timezone handling:
 * - Date-only strings (YYYY-MM-DD) are parsed literally — a stored
 *   "2026-04-17" is that calendar day regardless of viewer timezone.
 * - Datetime strings (with T or space) are parsed through the native
 *   Date constructor, which converts to the viewer's local timezone
 *   automatically. `d.getFullYear()/getMonth()/getDate()` return
 *   local-tz values, so a UTC timestamp renders correctly as the
 *   user's local calendar date.
 */
export function formatDate(value: string | null | undefined, dateFormat: DateFormat = 'MDY'): string {
    if (!value) return '';

    // Plain integer year (e.g. "-4000000000" = 4 billion BCE). JS Date
    // can't represent these, so fall back to a geological/BCE-aware
    // text formatter. Covers Hidden-Wars-scale entries that would
    // otherwise render raw like "-4000000000".
    const trimmed = String(value).trim();
    if (/^-?\d+$/.test(trimmed)) {
        const y = Number(trimmed);
        const abs = Math.abs(y);
        const suffix = y < 0 ? ' BCE' : '';
        if (abs >= 1_000_000_000) {
            return `${(abs / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} Ga${suffix}`;
        }
        if (abs >= 1_000_000) {
            return `${(abs / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} Ma${suffix}`;
        }
        return y < 0 ? `${abs.toLocaleString()} BCE` : String(y);
    }

    let year: number;
    let month: number;
    let day: number;

    if (isDateOnly(value)) {
        const parts = parseDateParts(value);
        if (!parts) return value;
        [year, month, day] = parts;
    } else {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');

    switch (dateFormat) {
        case 'MDY': return `${mm}/${dd}/${year}`;
        case 'DMY': return `${dd}/${mm}/${year}`;
        case 'YMD': return `${year}-${mm}-${dd}`;
        default: return `${mm}/${dd}/${year}`;
    }
}

/**
 * Format a time string according to user preferences, in the viewer's
 * local timezone. Uses Date.get{Hours,Minutes}() which return local-tz
 * values, so a UTC timestamp from the server renders as the user's
 * local wall-clock time.
 */
export function formatTime(value: string | null | undefined, timeFormat: TimeFormat = '12h'): string {
    if (!value) return '';

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';

    const hours24 = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (timeFormat === '24h') {
        return `${String(hours24).padStart(2, '0')}:${minutes}`;
    }

    const h12 = hours24 % 12 || 12;
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    return `${h12}:${minutes} ${ampm}`;
}

/**
 * Format a datetime string with both date and time according to user preferences.
 */
export function formatDateTime(
    value: string | null | undefined,
    dateFormat: DateFormat = 'MDY',
    timeFormat: TimeFormat = '12h',
): string {
    if (!value) return '';
    const datePart = formatDate(value, dateFormat);
    const timePart = formatTime(value, timeFormat);
    return timePart ? `${datePart} ${timePart}` : datePart;
}

/**
 * Render a timestamp as a short relative string ("just now", "5m ago",
 * "3h ago", "12d ago"). Falls back to a locale short-date for anything
 * older than 30 days. Returns empty string for null/undefined.
 */
export function relativeDate(value: string | null | undefined): string {
    if (!value) return '';
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * React hook that returns formatter functions bound to the user's preferences.
 */
export function useDateFormatters() {
    const { dateFormat, timeFormat } = useDatePreferences();

    return {
        dateFormat,
        timeFormat,
        fmtDate: (value: string | null | undefined) => formatDate(value, dateFormat),
        /** Time portion only, honoring 12h/24h preference + viewer timezone. */
        fmtTime: (value: string | null | undefined) => formatTime(value, timeFormat),
        /** Always render as date + time, honoring both user preferences. */
        fmtDateTime: (value: string | null | undefined) => formatDateTime(value, dateFormat, timeFormat),
        /** Format a date or datetime based on whether time info is present (midnight = date only) */
        fmtSmart: (value: string | null | undefined) => {
            if (!value) return '';
            // Date-only strings (YYYY-MM-DD) — no time to show
            if (isDateOnly(value)) return formatDate(value, dateFormat);
            // Datetime with midnight (00:00:00) — treat as date-only
            if (/[T ]00:00:00/.test(value)) return formatDate(value, dateFormat);
            // Datetime with actual time
            return formatDateTime(value, dateFormat, timeFormat);
        },
    };
}
