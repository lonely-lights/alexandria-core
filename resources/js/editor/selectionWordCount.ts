import type { Editor } from '@tiptap/core';

/**
 * A read-only count of the active selection, never serialized or autosaved.
 * Count whitespace-delimited words containing a Unicode letter or number,
 * matching SectionContentAnalyzer's counting convention. Marks and link
 * destinations are not words; linked-entry display text is ordinary text.
 */
export function selectedWordCount(editor: Editor | null): number | null {
    if (!editor || editor.isDestroyed || editor.state.selection.empty) {
        return null;
    }

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ', (node) => {
        if (node.type.name === 'mention') {
            return String(node.attrs.label ?? node.attrs.id ?? '');
        }

        // Breaks and non-text objects separate words, without counting image
        // URLs, alternative text, page-break metadata, or embedded media.
        return ' ';
    });

    return text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word))
        .length;
}
