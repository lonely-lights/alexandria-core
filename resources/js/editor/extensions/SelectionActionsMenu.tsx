import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import { selectionBubblePosition } from '@alexandria/editor/extensions/selectionBubblePosition';
import { useViewportTick } from '@alexandria/editor/extensions/useViewportTick';
import useT from '@alexandria/hooks/useT';
import type { Editor } from '@tiptap/core';
import type { CSSProperties } from 'react';

/**
 * The floating text-actions menu — one trigger above the selection whose
 * dropdown holds every action that operates on the selected prose.
 *
 * Replaces the two free-standing bubbles ("Add comment", "Mark device")
 * that each claimed their own spot above the selection: a second button
 * already had to dodge the first, so a third would have had nowhere to
 * sit. Future text-aware actions are one more entry in `items`.
 *
 * Positioned with viewport coordinates from `coordsAtPos` and re-measured
 * on scroll, so it travels with the text it belongs to. Every control
 * activates on mousedown with preventDefault: a plain click would blur
 * the editor first, and the collapsed selection is exactly what these
 * actions need to capture.
 */

const triggerStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    color: 'var(--theme-base-content)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: '999px',
    width: '1.75rem',
    height: '1.75rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgb(0 0 0 / 0.18)',
    pointerEvents: 'all',
};

export interface SelectionActionsMenuProps {
    editor: Editor;
    range: { from: number; to: number };
    /** Offer "Add comment". */
    enableComments?: boolean;
    onAddComment?: (anchor: { from: number; to: number; text: string }) => void;
    /** Offer "Mark device" (Devices & Tropes). */
    enableMarkThread?: boolean;
    onMarkThread?: (anchor: { from: number; to: number; text: string }) => void;
}

export default function SelectionActionsMenu({
    editor,
    range,
    enableComments = false,
    onAddComment,
    enableMarkThread = false,
    onMarkThread,
}: SelectionActionsMenuProps) {
    const t = useT();
    // Re-measure on scroll so the menu travels with the selected text.
    const viewportTick = useViewportTick();
    const position = selectionBubblePosition(editor, range, 'center', viewportTick);

    /** Snapshot the selected span at click time — the mark's anchor_text. */
    const anchor = () => ({
        from: range.from,
        to: range.to,
        text: editor.state.doc.textBetween(range.from, range.to, ' '),
    });

    const items = [
        ...(enableComments
            ? [{
                label: t('writing.comments.add_comment'),
                icon: 'fa-comment-medical',
                onClick: () => onAddComment?.(anchor()),
            }]
            : []),
        ...(enableMarkThread
            ? [{
                label: t('writing.threads.mark_action'),
                icon: 'fa-book-bookmark',
                onClick: () => onMarkThread?.(anchor()),
            }]
            : []),
    ];

    if (position === null || items.length === 0) {
        return null;
    }

    return (
        <div
            data-writing-selection-menu-anchor=""
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%)',
                zIndex: 20,
            }}
        >
            <DropdownMenu
                align="left"
                density="compact"
                menuClassName="w-56"
                activateOnMouseDown
                items={items}
                trigger={
                    <button
                        type="button"
                        data-writing-selection-menu=""
                        aria-label={t('writing.comments.selection_menu')}
                        onMouseDown={(event) => event.preventDefault()}
                        style={triggerStyle}
                    >
                        <i className="fa-solid fa-ellipsis text-xs" aria-hidden="true" />
                    </button>
                }
            />
        </div>
    );
}
