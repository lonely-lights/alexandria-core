import type { CSSProperties } from 'react';
import type { L2PendingNote } from '@alexandria/types/workbench';
import type { Translator } from '@alexandria/hooks/useT';

/**
 * Cherry-pick note pane for the Creation tab (owner: "select which ones I
 * want to sort… I want it to look similar to the previous page with the
 * note display pane"). Renders the blueprint's pending notes as FULL
 * cards — title + complete text with internal scroll — in the RIGHT pane;
 * clicking a card (or its checkbox) toggles selection. The parent owns
 * selection state and decides whether preview/run use the selection or
 * the batch-size window.
 */

const labelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.8125rem',
};

const bodyStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    fontSize: '0.8125rem',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    marginTop: '0.5rem',
    maxHeight: '12rem',
    overflowY: 'auto',
};

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
};

const cardSelectedStyle: CSSProperties = {
    ...cardStyle,
    border: '1px solid var(--theme-brand-primary-500)',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 8%, transparent)',
};

const linkBtnStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    fontSize: '0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
};

interface WorkbenchPendingNotesPickerProps {
    notes: L2PendingNote[];
    loading: boolean;
    selectedIds: Set<number>;
    onToggle: (id: number) => void;
    onToggleAll: () => void;
    t: Translator;
}

export default function WorkbenchPendingNotesPicker({
    notes,
    loading,
    selectedIds,
    onToggle,
    onToggleAll,
    t,
}: WorkbenchPendingNotesPickerProps) {
    const allSelected = notes.length > 0 && selectedIds.size === notes.length;

    if (loading) {
        return (
            <p className="p-4" style={labelStyle}>
                {t('ai.workbench.creation.run.loading_pending_notes')}
            </p>
        );
    }

    if (notes.length === 0) {
        return (
            <p className="p-4" style={labelStyle}>
                {t('ai.workbench.creation.run.no_pending_notes')}
            </p>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col" data-testid="workbench-pending-notes-picker">
            <div className="flex shrink-0 items-center justify-between px-4 py-2">
                <span style={labelStyle}>
                    {t('ai.workbench.creation.run.selected_count').replace(':count', String(selectedIds.size))}
                </span>
                <button
                    type="button"
                    onClick={onToggleAll}
                    style={linkBtnStyle}
                    className="cursor-pointer underline-offset-2 hover:underline"
                >
                    {t(allSelected ? 'ai.workbench.creation.run.select_none' : 'ai.workbench.creation.run.select_all')}
                </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                {notes.map((note) => {
                    const checked = selectedIds.has(note.id);
                    return (
                        <div
                            key={note.id}
                            data-testid="workbench-pending-note-row"
                            data-selected={checked}
                            style={checked ? cardSelectedStyle : cardStyle}
                            onClick={() => onToggle(note.id)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p
                                    className="min-w-0 flex-1 truncate text-sm font-medium"
                                    style={{ color: 'var(--theme-base-content)' }}
                                >
                                    {note.title || 'Untitled'}
                                </p>
                                <input
                                    id={`workbench-pending-note-${note.id}`}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => onToggle(note.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-0.5 shrink-0"
                                    aria-label={note.title || 'Untitled'}
                                />
                            </div>
                            <div style={bodyStyle}>
                                {note.text || note.snippet || t('ai.workbench.creation.run.note_snippet_empty')}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
