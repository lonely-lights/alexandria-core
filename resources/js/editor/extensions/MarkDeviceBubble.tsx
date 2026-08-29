import type { Editor } from '@tiptap/core';
import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

/**
 * Floating "Mark device" bubble — the editor-selection entry point for
 * Devices & Tropes (Task 5, design doc
 * 2026-08-29-devices-tropes-design.md Surfaces #2). Sibling to
 * `AddCommentBubble`: same selection-capture idiom (fixed positioning
 * from `coordsAtPos`, `onMouseDown` + preventDefault to keep the
 * selection alive), rendered alongside it rather than replacing it —
 * both can be enabled at once, so this bubble anchors to the
 * selection's right edge (no `translateX(-50%)` centering) instead of
 * AddCommentBubble's centered-above placement, to avoid the two
 * overlapping.
 */

const bubbleStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 200,
    background: 'var(--theme-brand-secondary-500, #6366f1)',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    boxShadow: '0 2px 8px rgb(0 0 0 / 0.18)',
    pointerEvents: 'all',
};

interface MarkDeviceBubbleProps {
    editor: Editor;
    range: { from: number; to: number };
    onMarkThread?: (anchor: { from: number; to: number; text: string }) => void;
}

export default function MarkDeviceBubble({ editor, range, onMarkThread }: MarkDeviceBubbleProps) {
    const t = useT();

    let top = 0;
    let left = 0;

    try {
        const fromCoords = editor.view.coordsAtPos(range.from);
        const toCoords = editor.view.coordsAtPos(range.to);
        top = Math.min(fromCoords.top, toCoords.top) - 38;
        left = toCoords.right + 8;
    } catch {
        return null;
    }

    return (
        <button
            type="button"
            aria-label={t('writing.threads.mark_action')}
            onMouseDown={(e) => {
                e.preventDefault();
                const { from, to } = range;
                const anchorText = editor.state.doc.textBetween(from, to, ' ');
                onMarkThread?.({ from, to, text: anchorText });
            }}
            style={{ ...bubbleStyle, top, left }}
        >
            <i className="fa-solid fa-book-bookmark" style={{ fontSize: '0.625rem' }} aria-hidden="true" />
            {t('writing.threads.mark_action')}
        </button>
    );
}
