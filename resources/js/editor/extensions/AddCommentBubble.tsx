import type { Editor } from '@tiptap/core';
import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

/**
 * Floating "Add comment" bubble — appears above the text selection when
 * comments are enabled (Stage 11.5 Task 3). One implementation for the
 * prose and screenplay editors (owner review, 2026-08-09).
 *
 * Fixed positioning with viewport coordinates from `coordsAtPos`, so it
 * works inside any overflow container. `onMouseDown` with preventDefault
 * keeps the editor focused and the selection intact. Renders nothing
 * when the selection can't be measured (a coordsAtPos throw during a
 * doc replacement).
 */

const bubbleStyle: CSSProperties = {
    position: 'fixed',
    transform: 'translateX(-50%)',
    zIndex: 200,
    background: 'var(--theme-status-warning-stroke, #f59e0b)',
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

interface AddCommentBubbleProps {
    editor: Editor;
    range: { from: number; to: number };
    onAddComment?: (anchor: { from: number; to: number; text: string }) => void;
}

export default function AddCommentBubble({
    editor,
    range,
    onAddComment,
}: AddCommentBubbleProps) {
    const t = useT();

    let top = 0;
    let left = 0;

    try {
        const fromCoords = editor.view.coordsAtPos(range.from);
        const toCoords = editor.view.coordsAtPos(range.to);
        top = Math.min(fromCoords.top, toCoords.top) - 38;
        left = (fromCoords.left + toCoords.right) / 2;
    } catch {
        return null;
    }

    return (
        <button
            type="button"
            aria-label={t('writing.comments.add_comment')}
            onMouseDown={(e) => {
                e.preventDefault();
                const { from, to } = range;
                const anchorText = editor.state.doc.textBetween(from, to, ' ');
                onAddComment?.({ from, to, text: anchorText });
            }}
            style={{ ...bubbleStyle, top, left }}
        >
            <i className="fa-solid fa-comment-medical" style={{ fontSize: '0.625rem' }} aria-hidden="true" />
            {t('writing.comments.add_comment')}
        </button>
    );
}
