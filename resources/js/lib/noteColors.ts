/**
 * Color palette shared between notes and notebooks — a curated set so
 * the two feel like members of the same palette rather than free-form
 * CSS colors. Keys are stored in the DB; hex values are resolved at
 * render time.
 */
export const NOTE_COLORS: Record<string, string> = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    teal: '#14b8a6',
    blue: '#3b82f6',
    cerulean: '#0ea5e9',
    purple: '#a855f7',
    pink: '#ec4899',
    brown: '#92400e',
    gray: '#6b7280',
};

export type NoteColorKey = keyof typeof NOTE_COLORS;
