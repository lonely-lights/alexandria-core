/**
 * Shared comment + text bridge helpers — Stage 11.5 / Stage 12a.
 *
 * Pure functions that take a TipTap {@link Editor} as their first argument.
 * Both RichTextEditor and ScreenplayEditor delegate their WritingEditorBridge
 * comment/text method bodies here, making the traversal implementation a
 * single source of truth rather than two parallel copies.
 *
 * LOAD-BEARING: getPlainText, findTextInDoc, and getCommentPositionMap MUST
 * share one traversal path — this module makes the former cross-file
 * discipline structural. getPlainText joins top-level blocks with '\n' so
 * adjacent block boundaries never fuse tokens (e.g. "MARGO\nSlowly" not
 * "MARGOSlowly"); findTextInDoc searches the same flat text, so jump offsets
 * are consistent. Single-word excerpt tokens never contain '\n', meaning
 * ProseMirror re-search stays within one text node without crossing block
 * boundaries.
 *
 * NOTE on triplication: commentRailModel.extractPositionMap performs the same
 * comment-mark walk as getCommentPositionMap below, but accepts a duck-typed
 * doc object rather than an Editor, preserving unit-testability without a real
 * TipTap instance. Unifying them would require either breaking that testable
 * signature or adding an Editor dependency to the pure model — left as-is per
 * the "no contortion" rule.
 *
 * NOT extracted: the floating "Add comment" bubble (ScreenplayEditor ~line 586
 * / RichTextEditor ~line 1211) is duplicated JSX, not a pure TS function.
 * Extracting it requires a React component split, which is out of scope here.
 */

import type { Editor } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Comment mark operations
// ---------------------------------------------------------------------------

export function applyCommentMark(
    editor: Editor,
    from: number,
    to: number,
    commentId: number,
): void {
    editor.chain()
        .setTextSelection({ from, to })
        .setMark('comment', { commentId })
        .run();
}

export function scrollToCommentMark(editor: Editor, commentId: number): void {
    const el = editor.view.dom.querySelector(
        `mark.comment-mark[data-comment-id="${commentId}"]`,
    );
    if (!el) return;
    el.classList.add('comment-mark--flash');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => el.classList.remove('comment-mark--flash'), 900);
}

export function reanchorCommentMark(
    editor: Editor,
    from: number,
    to: number,
    commentId: number,
): void {
    const commentMarkType = editor.schema.marks['comment'];
    if (!commentMarkType) return;
    const tr = editor.state.tr;
    tr.addMark(from, to, commentMarkType.create({ commentId }));
    tr.setMeta('addToHistory', false);
    editor.view.dispatch(tr);
}

export function removeCommentMark(editor: Editor, commentId: number): void {
    const commentMarkType = editor.schema.marks['comment'];
    if (!commentMarkType) return;
    const tr = editor.state.tr;
    let changed = false;
    editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
            if (mark.type.name !== 'comment') continue;
            if (Number(mark.attrs.commentId) !== commentId) continue;
            tr.removeMark(pos, pos + node.nodeSize, commentMarkType);
            changed = true;
        }
    });
    if (changed) editor.view.dispatch(tr);
}

// ---------------------------------------------------------------------------
// Position + selection queries
// ---------------------------------------------------------------------------

export function hasNonEmptySelection(editor: Editor): boolean {
    const { from, to } = editor.state.selection;
    return from !== to;
}

export function getSelectionRange(editor: Editor): { from: number; to: number } | null {
    const { from, to } = editor.state.selection;
    return from !== to ? { from, to } : null;
}

export function getCommentPositionMap(editor: Editor): Record<number, number> {
    const map: Record<number, number> = {};
    editor.state.doc.descendants((node, pos) => {
        for (const mark of node.marks) {
            if (mark.type.name !== 'comment') continue;
            const raw = mark.attrs.commentId;
            if (raw === null || raw === undefined) continue;
            const id = Number(raw);
            if (!Number.isFinite(id) || id in map) continue;
            map[id] = pos;
        }
    });
    return map;
}

// ---------------------------------------------------------------------------
// Text traversal (LOAD-BEARING: getPlainText + findTextInDoc share one walk)
// ---------------------------------------------------------------------------

/**
 * Return the document's plain text with top-level block boundaries joined by
 * '\n'. Joining with '\n' (not '') ensures adjacent blocks never fuse their
 * boundary tokens into one word (e.g. "MARGO" + "Slowly" → "MARGO\nSlowly"
 * rather than "MARGOSlowly"). Jump offsets from findTextInDoc still work:
 * every finding excerpt is a single word token that never contains '\n', so
 * ProseMirror locates it within one text node without crossing block
 * boundaries.
 */
export function getPlainText(editor: Editor): string {
    const parts: string[] = [];
    editor.state.doc.forEach((block) => {
        let blockText = '';
        block.descendants((node) => {
            if (node.isText && node.text) {
                blockText += node.text;
            }
        });
        parts.push(blockText);
    });
    return parts.join('\n');
}

/**
 * Find all occurrences of {@link text} in the editor document, returning
 * ProseMirror {from, to} ranges. Walks text nodes to build a flat string +
 * position map, then searches with indexOf. Returns [] when text is empty.
 */
export function findTextInDoc(
    editor: Editor,
    text: string,
): Array<{ from: number; to: number }> {
    if (!text) return [];
    const docPositions: number[] = [];
    let fullText = '';
    editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text) {
            for (let i = 0; i < node.text.length; i++) {
                docPositions.push(pos + i);
                fullText += node.text[i];
            }
        }
    });
    const results: Array<{ from: number; to: number }> = [];
    const textLen = text.length;
    let idx = 0;
    while ((idx = fullText.indexOf(text, idx)) !== -1) {
        if (idx + textLen - 1 < docPositions.length) {
            results.push({
                from: docPositions[idx],
                // +1: ProseMirror `to` is exclusive end
                to: docPositions[idx + textLen - 1] + 1,
            });
        }
        idx++;
    }
    return results;
}

// ---------------------------------------------------------------------------
// Scroll helpers
// ---------------------------------------------------------------------------

export function scrollToOffset(editor: Editor, pos: number): void {
    try {
        const domInfo = editor.view.domAtPos(pos);
        const el =
            domInfo.node.nodeType === Node.TEXT_NODE
                ? (domInfo.node.parentElement as Element | null)
                : (domInfo.node as Element);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } catch {
        // pos out of range — silently ignore
    }
}
