import { Extension, type Editor } from '@tiptap/core';

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
    if (editor.isActive('listItem')) {
        const command = direction === 1
            ? editor.chain().focus().sinkListItem('listItem')
            : editor.chain().focus().liftListItem('listItem');

        command.run();

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
