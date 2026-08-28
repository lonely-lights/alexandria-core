/**
 * Outline row types — spec 2026-08-28 outline-mode Task 4.
 *
 * The outline view edits a work's section tree as a flat, reorderable
 * list rather than the nested `SectionNode` tree the Navigator uses.
 * `OutlineRow` is the client-side shape: it keys the tree by a stable
 * string (`key`/`parentKey`) so new, not-yet-saved rows can be inserted
 * and reparented before the server ever assigns them a real section id.
 * `ServerOutlineRow` / `OutlineProjection` mirror the GET /{work}/outline
 * response; `parseOutlinePaste.ts` and `outlinePayload.ts` convert
 * between the two.
 */

/** One outline beat — a short planning note attached to a section. */
export interface OutlineBeat {
    id: string;
    text: string;
    done: boolean;
}

/**
 * A row in the client-side outline tree.
 *
 * `key` is `s-${sectionId}` for a row loaded from the server, or the raw
 * `tempId` for a row created client-side and not yet persisted.
 * `parentKey` points at another row's `key` (or is `null` for a root),
 * which lets the tree be edited by key before any temp id resolves to a
 * real section id.
 */
export interface OutlineRow {
    key: string;
    sectionId: number | null;
    tempId: string | null;
    parentKey: string | null;
    depth: number;
    label: string;
    title: string;
    synopsis: string | null;
    beats: OutlineBeat[];
}

/** One row as the server represents it — always has a real `sectionId`. */
export interface ServerOutlineRow {
    sectionId: number;
    parentId: number | null;
    depth: number;
    label: string;
    title: string;
    synopsis: string | null;
    beats: OutlineBeat[];
}

/** The GET /{work}/outline response body. */
export interface OutlineProjection {
    rows: ServerOutlineRow[];
    baseVersion: string;
}
