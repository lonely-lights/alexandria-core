import type { CSSProperties } from 'react';
import type { L2PendingNote } from '@alexandria/types/workbench';
import type { Translator } from '@alexandria/hooks/useT';

/**
 * Cherry-pick note picker for the Creation tab's run pane (owner request:
 * "select which ones I want to sort instead of doing all of them" — for
 * controlled level-2 testing alongside the existing batch-size path).
 *
 * Lists the blueprint's pending notes as checkbox rows; the parent
 * (WorkbenchCreationTab) owns selection state and decides whether preview /
 * run use the selection or fall back to the batch-size window.
 */

const headingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
};

const labelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.75rem',
};

const snippetStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    fontSize: '0.75rem',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const rowStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
};

const linkBtnStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    fontSize: '0.75rem',
    background: 'none',
    border: 'none',
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

    return (
        <div className="space-y-1.5" data-testid="workbench-pending-notes-picker">
            <div className="flex items-center justify-between">
                <span style={headingStyle}>{t('ai.workbench.creation.run.pending_notes_heading')}</span>
                {notes.length > 0 && (
                    <div className="flex items-center gap-2">
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
                )}
            </div>

            {loading ? (
                <p style={labelStyle}>{t('ai.workbench.creation.run.loading_pending_notes')}</p>
            ) : notes.length === 0 ? (
                <p style={labelStyle}>{t('ai.workbench.creation.run.no_pending_notes')}</p>
            ) : (
                <div
                    className="max-h-48 overflow-y-auto rounded"
                    style={{ border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }}
                >
                    {notes.map((note) => {
                        const checked = selectedIds.has(note.id);
                        return (
                            <label
                                key={note.id}
                                htmlFor={`workbench-pending-note-${note.id}`}
                                data-testid="workbench-pending-note-row"
                                data-selected={checked}
                                className="flex cursor-pointer items-start gap-2 px-2 py-1.5"
                                style={rowStyle}
                            >
                                <input
                                    id={`workbench-pending-note-${note.id}`}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => onToggle(note.id)}
                                    className="mt-0.5 shrink-0"
                                />
                                <span className="min-w-0 flex-1">
                                    <span
                                        className="block truncate text-sm font-medium"
                                        style={{ color: 'var(--theme-base-content)' }}
                                    >
                                        {note.title || 'Untitled'}
                                    </span>
                                    <span className="block" style={snippetStyle}>
                                        {note.snippet || t('ai.workbench.creation.run.note_snippet_empty')}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
