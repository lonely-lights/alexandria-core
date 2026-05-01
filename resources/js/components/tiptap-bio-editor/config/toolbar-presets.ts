import type { Editor } from '@tiptap/core';

/**
 * Tier-based toolbar configurations for TipTap bio editor
 *
 * TODO: Image support will be re-added with display options (inline, float, gallery, etc.)
 * See feature backlog for image implementation plans.
 */

export type EditorTier = 'free' | 'premium' | 'pro';

export interface ToolbarPreset {
    extensions: string[];
    toolbar: string[];
}

/**
 * Component-side hooks expected by toolbar button actions whose work
 * involves opening a modal or invoking a non-Tiptap behavior. Consumer
 * components implement these; they are declared here so the action
 * signatures are statically typed.
 */
export interface ToolbarComponent {
    openLinkModal: () => void;
    insertMention: () => void;
    insertEntryLink: () => void;
}

export interface ToolbarButton {
    icon: string;
    title: string;
    description: string;
    shortcut: string | null;
    shortcutMac: string | null;
    action: (editor: Editor, component: ToolbarComponent) => void;
    isActive: (editor: Editor) => boolean;
}

export const tierPresets: Record<EditorTier, ToolbarPreset> = {
    free: {
        extensions: ['bold', 'italic', 'underline', 'link', 'bulletList', 'orderedList'],
        toolbar: ['bold', 'italic', 'underline', 'link', 'divider', 'bulletList', 'orderedList'],
    },
    premium: {
        extensions: ['bold', 'italic', 'underline', 'link', 'bulletList', 'orderedList', 'heading'],
        toolbar: ['bold', 'italic', 'underline', 'link', 'divider', 'bulletList', 'orderedList', 'divider', 'heading2', 'heading3'],
    },
    pro: {
        extensions: ['bold', 'italic', 'underline', 'link', 'bulletList', 'orderedList', 'heading'],
        toolbar: ['bold', 'italic', 'underline', 'link', 'divider', 'bulletList', 'orderedList', 'divider', 'heading2', 'heading3'],
    },
};

export const toolbarButtons: Record<string, ToolbarButton> = {
    bold: {
        icon: 'fa-bold',
        title: 'Bold',
        description: 'Make text bold',
        shortcut: 'Ctrl+B',
        shortcutMac: '⌘+B',
        action: (editor) => editor.chain().focus().toggleBold().run(),
        isActive: (editor) => editor.isActive('bold'),
    },
    italic: {
        icon: 'fa-italic',
        title: 'Italic',
        description: 'Make text italic',
        shortcut: 'Ctrl+I',
        shortcutMac: '⌘+I',
        action: (editor) => editor.chain().focus().toggleItalic().run(),
        isActive: (editor) => editor.isActive('italic'),
    },
    underline: {
        icon: 'fa-underline',
        title: 'Underline',
        description: 'Underline text',
        shortcut: 'Ctrl+U',
        shortcutMac: '⌘+U',
        action: (editor) => editor.chain().focus().toggleUnderline().run(),
        isActive: (editor) => editor.isActive('underline'),
    },
    link: {
        icon: 'fa-link',
        title: 'Link',
        description: 'Insert or edit a hyperlink',
        shortcut: 'Ctrl+K',
        shortcutMac: '⌘+K',
        action: (_editor, component) => component.openLinkModal(),
        isActive: (editor) => editor.isActive('link'),
    },
    bulletList: {
        icon: 'fa-list-ul',
        title: 'Bullet List',
        description: 'Create a bulleted list',
        shortcut: null,
        shortcutMac: null,
        action: (editor) => editor.chain().focus().toggleBulletList().run(),
        isActive: (editor) => editor.isActive('bulletList'),
    },
    orderedList: {
        icon: 'fa-list-ol',
        title: 'Numbered List',
        description: 'Create a numbered list',
        shortcut: null,
        shortcutMac: null,
        action: (editor) => editor.chain().focus().toggleOrderedList().run(),
        isActive: (editor) => editor.isActive('orderedList'),
    },
    heading2: {
        icon: 'fa-h2',
        title: 'Heading 2',
        description: 'Large heading',
        shortcut: '==',
        shortcutMac: '==',
        action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: (editor) => editor.isActive('heading', { level: 2 }),
    },
    heading3: {
        icon: 'fa-h3',
        title: 'Heading 3',
        description: 'Medium heading',
        shortcut: '===',
        shortcutMac: '===',
        action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: (editor) => editor.isActive('heading', { level: 3 }),
    },
    mention: {
        icon: 'fa-at',
        title: 'Mention User',
        description: 'Mention a user with @username',
        shortcut: null,
        shortcutMac: null,
        action: (_editor, component) => component.insertMention(),
        isActive: () => false,
    },
    entryLink: {
        icon: 'fa-file-lines',
        title: 'Entry Link',
        description: 'Link to an entry with [[Page Name]]',
        shortcut: null,
        shortcutMac: null,
        action: (_editor, component) => component.insertEntryLink(),
        isActive: () => false,
    },
};

export function getPresetForTier(tier: EditorTier): ToolbarPreset {
    return tierPresets[tier] ?? tierPresets.free;
}
