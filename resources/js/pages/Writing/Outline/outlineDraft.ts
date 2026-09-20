import type { OutlineRow } from './outlineTypes';

/** Data whose disappearance would lose author intent. Identity alone is not content. */
export function hasOutlineData(row: OutlineRow): boolean {
    return Boolean(
        row.title.trim() ||
        row.synopsis?.trim() ||
        row.beats.some((b) => b.text.trim() || b.done) ||
        row.hasContent ||
        row.wordCount ||
        row.goal ||
        row.conflict ||
        row.stakes ||
        row.mood ||
        row.tone ||
        row.beatType ||
        row.status,
    );
}

export interface PreparedOutlineDraft {
    rows: OutlineRow[];
    placeholderKeys: string[];
}
export function prepareOutlineDraft(
    rows: OutlineRow[],
    untitled: string,
): PreparedOutlineDraft {
    const keep = new Set(
        rows
            .filter((r) => r.sectionId !== null || hasOutlineData(r))
            .map((r) => r.key),
    );
    const byKey = new Map(rows.map((r) => [r.key, r]));
    for (const key of [...keep]) {
        let parent = byKey.get(key)?.parentKey;
        const visited = new Set<string>();
        while (parent && !visited.has(parent)) {
            visited.add(parent);
            keep.add(parent);
            parent = byKey.get(parent)?.parentKey;
        }
    }
    return {
        rows: rows
            .filter((r) => keep.has(r.key))
            .map((r) => ({
                ...r,
                title: r.title.trim() ? r.title : untitled,
                beats: r.beats
                    .filter((b) => b.text.trim())
                    .map((b) => ({ ...b })),
            })),
        placeholderKeys: rows.filter((r) => !keep.has(r.key)).map((r) => r.key),
    };
}
