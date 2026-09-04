import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { Mark } from '@tiptap/pm/model';

export type WritingCase = 'upper' | 'lower';

interface TextRange {
    from: number;
    to: number;
    text: string;
    marks: readonly Mark[];
}

function editableRanges(editor: Editor | null): TextRange[] {
    if (
        !editor ||
        editor.isDestroyed ||
        !editor.isEditable ||
        editor.state.selection.empty
    ) {
        return [];
    }

    const ranges: TextRange[] = [];
    const { from, to } = editor.state.selection;
    editor.state.doc.nodesBetween(from, to, (node, pos) => {
        // Internal identities and their display aliases are deliberate objects.
        if (node.type.name === 'entryLink' || node.type.name === 'mention') {
            return false;
        }

        if (node.isText) {
            const start = Math.max(from, pos);
            const end = Math.min(to, pos + node.nodeSize);
            const text = node.text!.slice(start - pos, end - pos);

            if (text.toUpperCase() !== text.toLowerCase()) {
                ranges.push({ from: start, to: end, text, marks: node.marks });
            }
        }
    });

    return ranges;
}

export function canChangeWritingCase(editor: Editor | null): boolean {
    return editableRanges(editor).length > 0;
}

/** One undo step; mark-preserving text replacement, including Unicode expansion. */
export function changeWritingCase(
    editor: Editor | null,
    mode: WritingCase,
): boolean {
    if (!editor) {
        return false;
    }

    const ranges = editableRanges(editor);
    const tr = closeHistory(editor.state.tr);

    for (const range of ranges.reverse()) {
        const text =
            mode === 'upper'
                ? range.text.toUpperCase()
                : range.text.toLowerCase();

        if (text !== range.text) {
            tr.replaceWith(
                range.from,
                range.to,
                editor.schema.text(text, range.marks),
            );
        }
    }

    if (!tr.docChanged) {
        return false;
    }

    tr.setSelection(editor.state.selection.map(tr.doc, tr.mapping));
    editor.view.dispatch(tr);
    editor.view.dispatch(closeHistory(editor.state.tr));
    editor.commands.focus();

    return true;
}
