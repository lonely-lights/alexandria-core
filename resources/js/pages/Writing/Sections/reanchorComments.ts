/**
 * Durable comment anchor restoration — Stage 11.5 Task 3 (F1 fix).
 *
 * After a page reload the editor's comment marks are gone (the wiki
 * serializer has no comment-mark syntax). This helper walks the server
 * comment list, finds comments whose anchor_text is present in the
 * current doc, and re-applies the comment mark — restoring the visual
 * anchor without adding anything to undo history.
 *
 * When anchor_text appears more than once the occurrence whose `from`
 * position is nearest to `anchor_offset_hint` is chosen. Comments whose
 * anchor_text is absent from the doc stay orphaned (silently excluded by
 * the CommentRail's existing filterOrphans path).
 */

import type { WritingEditorBridge } from '@alexandria/pages/Writing/ribbon/writingRibbonContext';
import type { CommentData } from './commentRailModel';

/**
 * Re-anchor any comments in `comments` that have `anchor_text` set but
 * no live mark in the doc (i.e., absent from the current position map).
 *
 * Calls `bridge.reanchorCommentMark` for each match — one ProseMirror
 * transaction per comment, each with `addToHistory: false`.
 *
 * Pure-functional: no React, no side effects beyond the bridge call.
 *
 * @param bridge   The live editor bridge (must not be null).
 * @param comments The server comment list for the current section.
 */
export function reanchorComments(
    bridge: WritingEditorBridge,
    comments: CommentData[],
): void {
    if (comments.length === 0) return;

    const positionMap = bridge.getCommentPositionMap();

    for (const comment of comments) {
        // Skip: no anchor text stored, or the mark is already in the doc.
        if (!comment.anchor_text) continue;
        if (comment.id in positionMap) continue;

        const occurrences = bridge.findTextInDoc(comment.anchor_text);
        if (occurrences.length === 0) continue;  // text absent → stays orphaned

        // Choose the occurrence nearest to anchor_offset_hint.
        const hint = comment.anchor_offset_hint ?? 0;
        const best = occurrences.reduce((prev, curr) =>
            Math.abs(curr.from - hint) < Math.abs(prev.from - hint) ? curr : prev,
        );

        bridge.reanchorCommentMark(best.from, best.to, comment.id);
    }
}
