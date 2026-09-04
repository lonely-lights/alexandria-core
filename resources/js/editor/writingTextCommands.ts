import { getMarkRange } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

const emphasisMarks = ['bold', 'italic', 'underline'];

export function canClearTextFormatting(editor: Editor | null): boolean {
    if (!editor || editor.isDestroyed || !editor.isEditable) {
        return false;
    }

    const { selection, storedMarks, doc } = editor.state;
    const hasEmphasis = (node: {
        marks: readonly { type: { name: string } }[];
    }) => node.marks.some((mark) => emphasisMarks.includes(mark.type.name));

    if (selection.empty) {
        return hasEmphasis({ marks: storedMarks ?? selection.$from.marks() });
    }

    let found = false;
    doc.nodesBetween(selection.from, selection.to, (node) => {
        found ||= hasEmphasis(node);
    });

    return found;
}

/** Only styling marks: never unsetAllMarks(), which would also erase comments. */
export function clearTextFormatting(editor: Editor | null): boolean {
    if (!editor || !canClearTextFormatting(editor)) {
        return false;
    }

    const { from, to } = editor.state.selection;
    const tr = closeHistory(editor.state.tr);

    for (const name of emphasisMarks) {
        const mark = editor.schema.marks[name];

        if (mark) {
            tr.removeMark(from, to, mark);
            tr.removeStoredMark(mark);
        }
    }

    editor.view.dispatch(tr);
    editor.view.dispatch(closeHistory(editor.state.tr));

    return true;
}

export interface WritingLinkSelection {
    from: number;
    to: number;
    text: string;
    href: string;
    /** Fail safely if the underlying document changes while the dialog is open. */
    doc: PMNode;
}

/** Only plain inline text in one paragraph; never flatten blocks or entry nodes. */
export function captureWritingLink(
    editor: Editor | null,
): WritingLinkSelection | null {
    if (
        !editor ||
        editor.isDestroyed ||
        !editor.isEditable ||
        !editor.schema.marks.link
    ) {
        return null;
    }

    const { doc, selection } = editor.state;

    if (
        !selection.$from.sameParent(selection.$to) ||
        !selection.$from.parent.isTextblock
    ) {
        return null;
    }

    if (selection.$from.parent.type.name === 'entryLink') {
        return null;
    }

    let { from, to } = selection;
    const linkRange = getMarkRange(selection.$from, editor.schema.marks.link);

    if (linkRange && from >= linkRange.from && to <= linkRange.to) {
        from = linkRange.from;
        to = linkRange.to;
    }

    let plain = true;
    doc.nodesBetween(from, to, (node) => {
        if (node.isInline && !node.isText) {
            plain = false;
        }
    });

    if (!plain) {
        return null;
    }

    const link = doc
        .resolve(from)
        .nodeAfter?.marks.find((mark) => mark.type.name === 'link');

    return {
        from,
        to,
        text: doc.textBetween(from, to),
        href: linkRange ? String(link?.attrs.href ?? '') : '',
        doc,
    };
}

/** Explicit protocols only; do not turn a typo or script scheme into a live link. */
export function normalizeWritingLink(value: string): string | null {
    const href = value.trim();

    if (/[\s<>"'\\]/u.test(href) || href.includes('[') || href.includes(']')) {
        return null;
    }

    try {
        const url = new URL(href);

        if (
            (url.protocol === 'https:' || url.protocol === 'http:') &&
            url.hostname &&
            !url.username &&
            !url.password
        ) {
            return href;
        }
    } catch {
        // Invalid addresses remain in the dialog for correction.
    }

    return null;
}

export type WritingLinkResult =
    | 'applied'
    | 'invalid-url'
    | 'invalid-text'
    | 'stale';

/** Use schema text, not interpolated HTML; unchanged labels retain every mark. */
export function applyWritingLink(
    editor: Editor | null,
    selection: WritingLinkSelection,
    value: string | null,
    label: string,
): WritingLinkResult {
    if (
        !editor ||
        editor.isDestroyed ||
        !editor.isEditable ||
        !editor.state.doc.eq(selection.doc)
    ) {
        return 'stale';
    }

    const markType = editor.schema.marks.link;

    if (!markType) {
        return 'stale';
    }

    const href = value === null ? null : normalizeWritingLink(value);

    if (value !== null && href === null) {
        return 'invalid-url';
    }

    const text = label || href || selection.text;

    // These delimiters cannot round-trip in the current wiki link syntax.
    if (
        href &&
        (/[\r\n]/u.test(text) || text.includes('[') || text.includes(']'))
    ) {
        return 'invalid-text';
    }

    const { from, to } = selection;
    const tr = closeHistory(editor.state.tr);

    if (href === null) {
        tr.removeMark(from, to, markType);
    } else if (text === selection.text && from !== to) {
        tr.addMark(from, to, markType.create({ href }));
    } else {
        const marks = (
            editor.state.doc.resolve(from).nodeAfter?.marks ??
            editor.state.selection.$from.marks()
        ).filter((mark) => mark.type !== markType);
        tr.replaceWith(
            from,
            to,
            editor.schema.text(text, [...marks, markType.create({ href })]),
        );
    }

    tr.setSelection(
        TextSelection.create(tr.doc, from, href ? from + text.length : to),
    );
    editor.view.dispatch(tr);
    editor.view.dispatch(closeHistory(editor.state.tr));

    return 'applied';
}
