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

import type { OutlineProjection, OutlineRow } from './outlineTypes';

/** Build the client tree from a freshly loaded outline projection. */
export function rowsFromProjection(projection: OutlineProjection): OutlineRow[] {
    return projection.rows.map((row) => ({
        key: `s-${row.sectionId}`,
        sectionId: row.sectionId,
        tempId: null,
        parentKey: row.parentId !== null ? `s-${row.parentId}` : null,
        depth: row.depth,
        label: row.label,
        title: row.title,
        synopsis: row.synopsis,
        beats: row.beats,
    }));
}

/**
 * Resolve a row's `parentKey` to the id the server understands: the
 * referenced row's `sectionId` if it has one, else its `tempId` (a new,
 * not-yet-saved parent). An unresolvable key — a dangling reference —
 * falls back to `null` rather than throwing.
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
        return null;
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
): object {
    const rowsByKey = new Map(rows.map((row) => [row.key, row]));

    return {
        baseVersion,
        force,
        deleted,
        rows: rows.map((row) => ({
            sectionId: row.sectionId,
            tempId: row.tempId,
            parentId: resolveParentId(rowsByKey, row.parentKey),
            depth: row.depth,
            label: row.label,
            title: row.title,
            synopsis: row.synopsis,
            beats: row.beats,
        })),
    };
}

/**
 * Fold a successful save's `tempIds` map back into the client tree:
 * every row whose `tempId` appears in the map becomes a persisted row
 * (`sectionId` set, `tempId` cleared, `key` rewritten to `s-<id>`), and
 * every other row's `parentKey` is rewritten if it pointed at one of the
 * temp keys that just resolved.
 */
export function reconcileTempIds(
    rows: OutlineRow[],
    tempIds: Record<string, number>,
): OutlineRow[] {
    const keyRemap = new Map<string, string>();

    for (const row of rows) {
        if (row.tempId !== null && row.tempId in tempIds) {
            keyRemap.set(row.key, `s-${tempIds[row.tempId]}`);
        }
    }

    return rows.map((row) => {
        const resolvedSectionId = row.tempId !== null ? tempIds[row.tempId] : undefined;
        const newParentKey =
            row.parentKey !== null
                ? (keyRemap.get(row.parentKey) ?? row.parentKey)
                : null;

        if (resolvedSectionId === undefined) {
            return newParentKey === row.parentKey
                ? row
                : { ...row, parentKey: newParentKey };
        }

        return {
            ...row,
            key: `s-${resolvedSectionId}`,
            sectionId: resolvedSectionId,
            tempId: null,
            parentKey: newParentKey,
        };
    });
}
