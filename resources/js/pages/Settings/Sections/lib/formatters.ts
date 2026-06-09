/**
 * Pure display formatters shared by the Settings sections.
 *
 * Extracted from ProfileSection.tsx (birthday preview) and
 * AiSections.tsx (token count) so they can be unit-tested in the
 * consumer app's Vitest suite without mounting the sections.
 */

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatBirthdayPreview(visibility: string, month: string, day: string, year: string, ageSuffix: string): string {
    const monthName = month ? MONTH_NAMES[parseInt(month)] : '';
    const y = parseInt(year);

    switch (visibility) {
        case 'full': return monthName && day && year ? `${monthName} ${day}, ${year}` : '';
        case 'month_day': return monthName && day ? `${monthName} ${day}` : '';
        case 'year': return year || '';
        case 'age': {
            if (!y) return '';
            const today = new Date();
            const m = month ? parseInt(month) : 0;
            const d = day ? parseInt(day) : 0;
            let age = today.getFullYear() - y;
            if (m && (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && d && today.getDate() < d))) {
                age--;
            }
            return `${age} ${ageSuffix}`;
        }
        default: return '';
    }
}

export function formatTokenCount(tokens: number): string {
    return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens.toString();
}
