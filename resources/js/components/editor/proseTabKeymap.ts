import { Extension  } from '@tiptap/core';
import type {Editor} from '@tiptap/core';

export function canChangeListLevel(editor: Editor | null, direction: 1 | -1): boolean {
    if (!editor || editor.isDestroyed || !editor.isEditable || !editor.isActive('listItem')) {
        return false;
    }

    return direction === 1 ? editor.can().sinkListItem('listItem') : editor.can().liftListItem('listItem');
}

export function changeListLevel(editor: Editor | null, direction: 1 | -1): boolean {
    if (!editor || !canChangeListLevel(editor, direction)) {
        return false;
    }

    return direction === 1
        ? editor.chain().focus().sinkListItem('listItem').run()
        : editor.chain().focus().liftListItem('listItem').run();
}

function textBeforeCursor(editor: Editor): string {
    const { $from } = editor.state.selection;

    return $from.parent.textBetween(0, $from.parentOffset, '\n', '\0');
}

function insertTabStop(editor: Editor): boolean {
    editor.commands.insertContent('\t');

    return true;
}

function removeTabStop(editor: Editor): boolean {
    const { state } = editor;
    const { $from } = state.selection;
    const before = textBeforeCursor(editor);

    if (before.endsWith('\t')) {
        editor.commands.deleteRange({ from: $from.pos - 1, to: $from.pos });
    }

    return true;
}

export function handleProseTab(editor: Editor, direction: 1 | -1): boolean {
    if (!editor.isEditable) {
        return false;
    }

    if (editor.isActive('listItem')) {
        changeListLevel(editor, direction);

        return true;
    }

    return direction === 1 ? insertTabStop(editor) : removeTabStop(editor);
}

export const ProseTabKeymap = Extension.create({
    name: 'proseTabKeymap',
    priority: 1000,

    addKeyboardShortcuts() {
        return {
            Tab: ({ editor }) => handleProseTab(editor, 1),
            'Shift-Tab': ({ editor }) => handleProseTab(editor, -1),
        };
    },
});
