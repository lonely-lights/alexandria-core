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
    /** The section's slug, for navigation — `null` for a not-yet-saved
     *  row (the server assigns the slug on create). */
    slug: string | null;
    synopsis: string | null;
    beats: OutlineBeat[];
    /**
     * Beat Board craft fields — optional, client-side only. Populated
     * from the server's snake_case projection fields (see
     * `rowsFromProjection`) but never round-tripped back through
     * `buildOutlinePayload`; the outline PUT endpoint doesn't accept
     * them.
     */
    beatType?: string | null;
    goal?: string | null;
    conflict?: string | null;
    stakes?: string | null;
    mood?: string | null;
    tone?: string | null;
    wordCount?: number;
    status?: string | null;
}

/** One row as the server represents it — always has a real `sectionId`. */
export interface ServerOutlineRow {
    sectionId: number;
    parentId: number | null;
    depth: number;
    label: string;
    title: string;
    slug: string;
    synopsis: string | null;
    beats: OutlineBeat[];
    /**
     * Beat Board craft fields — see `OutlineRow`. Unlike the rest of
     * this interface, the server projection carries these as
     * snake_case keys (added by Task 1 without going through the
     * existing camelCase resource transform); `rowsFromProjection`
     * maps them onto `OutlineRow`'s camelCase equivalents.
     */
    beat_type?: string | null;
    goal?: string | null;
    conflict?: string | null;
    stakes?: string | null;
    mood?: string | null;
    tone?: string | null;
    word_count?: number;
    status?: string | null;
}

/** The GET /{work}/outline response body. */
export interface OutlineProjection {
    rows: ServerOutlineRow[];
    baseVersion: string;
}
