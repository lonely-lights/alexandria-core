import { prepareOutlineDraft } from './outlineDraft';
/**
 * Outline projection / payload helpers — spec 2026-08-28 outline-mode
 * Task 4.
 *
 * Converts between the server's `OutlineProjection` (GET /{work}/outline)
 * and the client's flat `OutlineRow[]` tree, and back into the PUT
 * request body. New rows carry a client-generated `tempId` instead of a
 * `sectionId` until the server assigns one; `reconcileTempIds` folds the
 * response's `tempIds` map back into the client tree once a save
 * succeeds.
 */

import type {
    OutlineProjection,
    OutlineRow,
    OutlineConversion,
} from './outlineTypes';

/** Build the client tree from a freshly loaded outline projection. */
export function rowsFromProjection(
    projection: OutlineProjection,
): OutlineRow[] {
    return projection.rows.map((row) => ({
        key: `s-${row.sectionId}`,
        sectionId: row.sectionId,
        tempId: null,
        parentKey: row.parentId !== null ? `s-${row.parentId}` : null,
        depth: row.depth,
        label: row.label,
        title: row.title,
        slug: row.slug,
        synopsis: row.synopsis,
        beats: row.beats,
        durationSeconds: row.duration_seconds,
        isStructural: row.is_structural,
        hasContent: row.has_content,
        canBecomeBeat: row.canBecomeBeat,
        conversionBlockedReason: row.conversionBlockedReason,
        beatType: row.beat_type,
        goal: row.goal,
        conflict: row.conflict,
        stakes: row.stakes,
        mood: row.mood,
        tone: row.tone,
        wordCount: row.word_count,
        status: row.status,
    }));
}

/**
 * Resolve a row's `parentKey` to the id the server understands: the
 * referenced row's `sectionId` if it has one, else its `tempId` (a new,
 * not-yet-saved parent). An unresolvable key — a dangling reference —
 * is rejected rather than silently changing the tree.
 */
function resolveParentId(
    rowsByKey: Map<string, OutlineRow>,
    parentKey: string | null,
): number | string | null {
    if (parentKey === null) {
        return null;
    }

    const parent = rowsByKey.get(parentKey);

    if (parent === undefined) {
        throw new Error('Outline parent is missing.');
    }

    return parent.sectionId ?? parent.tempId;
}

/**
 * Build the PUT /{work}/outline request body from the current client
 * tree. `rows` is always serialized as the complete surviving tree, in
 * the array order the caller supplies — the outline view is responsible
 * for keeping parents ahead of their children.
 */
export function buildOutlinePayload(
    rows: OutlineRow[],
    deleted: number[],
    force: number[],
    baseVersion: string,
    untitled: string,
    conversions: OutlineConversion[] = [],
): object {
    rows = prepareOutlineDraft(rows, untitled).rows;
    const rowsByKey = new Map(rows.map((row) => [row.key, row]));

    return {
        baseVersion,
        conversions: conversions.map((c) => ({
            sourceSectionId: c.sourceSectionId,
            targetId: resolveParentId(rowsByKey, c.targetKey),
            beatId: c.beatId,
        })),
        force,
        deleted,
        rows: rows.map((row) => ({
            sectionId: row.sectionId,
            tempId: row.tempId,
            parentId: resolveParentId(rowsByKey, row.parentKey),
            depth: row.depth,
            ...(row.durationSeconds !== undefined
                ? { duration_seconds: row.durationSeconds }
                : {}),
            label: row.label,
            ...(row.isStructural !== undefined
                ? { is_structural: row.isStructural }
                : {}),
            title: row.title,
            synopsis: row.synopsis,
            beats: row.beats,
        })),
    };
}

/**
 * Fold a successful save's `tempIds` map back into the client tree:
 * every row whose `tempId` appears in the map becomes a persisted row
 * with its stable key/parentKey retained and sectionId filled.
 */
export function reconcileTempIds(
    rows: OutlineRow[],
    tempIds: Record<string, number>,
): OutlineRow[] {
    return rows.map((row) => {
        const id = row.tempId !== null ? tempIds[row.tempId] : undefined;

        return id === undefined ? row : { ...row, sectionId: id, tempId: null };
    });
}
