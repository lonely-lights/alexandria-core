/**
 * 10-color palette for graph node color groups. Hand-picked to stay
 * legible on both tf-light / tf-dark / ns-dark themes — saturated
 * enough to pop on dark, muted enough to read on paper.
 */
export const GRAPH_PALETTE = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#a855f7', // purple-500
] as const;

export const UNGROUPED_COLOR = '#64748b'; // slate-500

/**
 * Deterministic: the same key always gets the same palette slot.
 * Uses a small hash so new groups slot in consistently even as the
 * dataset evolves.
 */
export function colorForGroup(key: string | null): string {
    if (key === null) return UNGROUPED_COLOR;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }

    return GRAPH_PALETTE[hash % GRAPH_PALETTE.length];
}
