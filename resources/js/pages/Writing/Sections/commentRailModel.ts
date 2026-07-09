/**
 * Pure comment rail model — Stage 11.5 Task 3.
 *
 * All functions except extractPositionMap are pure: no side effects,
 * no React, no TipTap objects. Each returns safe empty values on edge
 * inputs and never throws. Tests live in:
 *   resources/js/editor/tests/commentRailModel.test.ts  (app repo)
 *
 * The CommentRail component builds a PositionMap from the live TipTap
 * doc via extractPositionMap(), then passes it to groupComments() to
 * derive the ordered, orphan-filtered, resolved-split display list.
 *
 * Anchor persistence: durable server-side text-quote anchors are stored
 * in anchor_text / anchor_offset_hint. reanchorComments() restores marks
 * on load/doc-replacement. Multi-paragraph anchors do not re-anchor in
 * v1 (single-block text matching). Permanently-orphaned anchors retry per
 * editorTick; memoization deferred to style A.
 */

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface CommentAuthor {
    id: number;
    name: string;
}

export interface CommentData {
    id: number;
    body: string;
    author: CommentAuthor;
    resolved_at: string | null;
    resolved_by: number | null;
    created_at: string;
    updated_at: string;
    /** The selected text snapshotted when the comment was created (F1 durable anchor). */
    anchor_text: string | null;
    /** ProseMirror `from` position at creation time — hint for nearest-occurrence selection. */
    anchor_offset_hint: number | null;
}

/**
 * commentId → first document position of that comment mark in the
 * current editor doc. Built by extractPositionMap(); passed as plain
 * data to the pure functions below so they remain testable without
 * a real editor.
 */
export type PositionMap = Record<number, number>;

export interface OrderedComments {
    /** Unresolved comments in document order. */
    active: CommentData[];
    /**
     * Resolved comments in document order. Shown as a collapsible
     * "Resolved (N)" group in the UI.
     */
    resolved: CommentData[];
}

// ---------------------------------------------------------------------------
// Editor-coupling helper (only function that touches TipTap)
// ---------------------------------------------------------------------------

/**
 * Walk a ProseMirror doc and collect the first document position of
 * each comment mark. Returns {} when the doc has no comment marks.
 *
 * Not pure — accepts the live TipTap editor's doc object.
 * Isolated here so CommentRail imports a single model file.
 */
export function extractPositionMap(doc: {
    descendants: (
        fn: (
            node: {
                isText: boolean;
                marks: Array<{ type: { name: string }; attrs: Record<string, unknown> }>;
            },
            pos: number,
        ) => boolean | void,
    ) => void;
}): PositionMap {
    const map: PositionMap = {};

    doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
            if (mark.type.name !== 'comment') continue;
            const raw = mark.attrs.commentId;
            if (raw === null || raw === undefined) continue;
            const id = Number(raw);
            if (!Number.isFinite(id)) continue;
            if (!(id in map)) {
                map[id] = pos;
            }
        }
    });

    return map;
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Filter to comments whose mark is present in the editor document.
 * Comments absent from positionMap are "orphaned" (their anchor was
 * deleted or the page was reloaded) and are silently excluded from
 * the rail display.
 *
 * Returns [] on empty input.
 */
export function filterOrphans(
    comments: CommentData[],
    positionMap: PositionMap,
): CommentData[] {
    if (comments.length === 0) return [];
    return comments.filter((c) =>
        Object.prototype.hasOwnProperty.call(positionMap, c.id),
    );
}

/**
 * Sort comments ascending by their first document position.
 * Tie-break by id (insertion order; lower id = created earlier).
 * Does not mutate the input array.
 *
 * All passed comments should be in positionMap (call filterOrphans
 * first). Comments absent from the map sort to the end.
 *
 * Returns [] on empty input.
 */
export function sortByDocPosition(
    comments: CommentData[],
    positionMap: PositionMap,
): CommentData[] {
    if (comments.length === 0) return [];
    return [...comments].sort((a, b) => {
        const posA = positionMap[a.id] ?? Infinity;
        const posB = positionMap[b.id] ?? Infinity;
        if (posA !== posB) return posA - posB;
        return a.id - b.id;
    });
}

/**
 * Sort comments by created_at ascending (server insertion order).
 * Used for the read-only viewer path where the editor has no comment
 * marks and orphan filtering must be skipped.
 *
 * Returns [] on empty input; does not mutate the input array.
 */
export function sortByCreatedAt(comments: CommentData[]): CommentData[] {
    if (comments.length === 0) return [];
    return [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Partition comments into active (unresolved) and resolved arrays,
 * both in document order. Orphaned comments are excluded from both
 * groups.
 *
 * Primary entry point for the CommentRail renderer.
 * Returns { active: [], resolved: [] } on empty input.
 */
export function groupComments(
    comments: CommentData[],
    positionMap: PositionMap,
): OrderedComments {
    if (comments.length === 0) return { active: [], resolved: [] };

    const live = filterOrphans(comments, positionMap);
    const sorted = sortByDocPosition(live, positionMap);

    return {
        active: sorted.filter((c) => c.resolved_at === null),
        resolved: sorted.filter((c) => c.resolved_at !== null),
    };
}
