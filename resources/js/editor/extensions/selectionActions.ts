import type { Editor } from '@tiptap/core';

/** The selection span the "Add comment" / "Mark device" bubbles anchor to. */
export interface SelectionActionRange {
    from: number;
    to: number;
}

export interface SelectionActionOptions {
    /** At least one of the comment / mark-device actions is enabled. */
    enabled: boolean;
    /**
     * The host still considers this editor's section current. The
     * continuous flow passes its active-row flag, so an editor the reader
     * has moved away from stops offering actions even while its
     * ProseMirror selection lingers.
     */
    visible: boolean;
}

/**
 * Where the selection-action bubbles should anchor, or null to hide them.
 *
 * Shared by the prose and screenplay editors so both hide in lockstep.
 * A ProseMirror selection outlives both focus and the reader's attention:
 * without the focus and visibility gates, switching sections left the
 * outgoing editor's fixed-position bubbles floating over the new one.
 * Focus and blur each dispatch a TipTap transaction, so a selector built
 * on this re-runs the moment the editor loses focus.
 */
export function selectionActionRange(
    editor: Pick<Editor, 'isFocused' | 'state'> | null,
    { enabled, visible }: SelectionActionOptions,
): SelectionActionRange | null {
    if (!editor || !enabled || !visible || !editor.isFocused) {
        return null;
    }

    const { from, to } = editor.state.selection;

    return from !== to ? { from, to } : null;
}
