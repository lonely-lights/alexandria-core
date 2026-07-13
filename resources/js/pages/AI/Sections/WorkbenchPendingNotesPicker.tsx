import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { L2PendingNote } from '@alexandria/types/workbench';
import type { Translator } from '@alexandria/hooks/useT';
import WorkbenchKeyLegend from './WorkbenchKeyLegend';

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

const cursorRing: CSSProperties = {
    outline: '2px solid color-mix(in srgb, var(--theme-brand-secondary-500) 70%, transparent)',
    outlineOffset: '1px',
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

    // Keyboard: arrows move the cursor, Space toggles selection,
    // Shift+arrows scroll inside the cursor card — the routing pane's
    // muscle memory (owner request).
    const [cursorIdx, setCursorIdx] = useState(0);
    const cursorBodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setCursorIdx(0);
    }, [notes]);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
            if (notes.length === 0) return;

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const delta = e.key === 'ArrowDown' ? 1 : -1;
                if (e.shiftKey) {
                    cursorBodyRef.current?.scrollBy({ top: delta * 96, behavior: 'smooth' });
                } else {
                    setCursorIdx((i) => Math.max(0, Math.min(i + delta, notes.length - 1)));
                }
            } else if (e.key === ' ') {
                e.preventDefault();
                const note = notes[cursorIdx];
                if (note) onToggle(note.id);
            }
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notes, cursorIdx]);

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
                <div className="flex items-center gap-3">
                    <WorkbenchKeyLegend
                        pairs={[
                            { key: '↑↓', label: t('ai.workbench.review.key_nav') },
                            { key: 'Space', label: t('ai.workbench.creation.run.key_toggle') },
                            { key: '⇧↑↓', label: t('ai.workbench.review.key_scroll') },
                        ]}
                    />
                    <button
                        type="button"
                        onClick={onToggleAll}
                        style={linkBtnStyle}
                        className="cursor-pointer underline-offset-2 hover:underline"
                    >
                        {t(allSelected ? 'ai.workbench.creation.run.select_none' : 'ai.workbench.creation.run.select_all')}
                    </button>
                </div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-1.5">
                {notes.map((note, idx) => {
                    const checked = selectedIds.has(note.id);
                    const isCursor = idx === cursorIdx;
                    return (
                        <div
                            key={note.id}
                            ref={isCursor ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                            data-testid="workbench-pending-note-row"
                            data-selected={checked}
                            style={{
                                ...(checked ? cardSelectedStyle : cardStyle),
                                ...(isCursor ? cursorRing : {}),
                            }}
                            onClick={() => {
                                setCursorIdx(idx);
                                onToggle(note.id);
                            }}
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
                            <div ref={isCursor ? cursorBodyRef : undefined} style={bodyStyle}>
                                {note.text || note.snippet || t('ai.workbench.creation.run.note_snippet_empty')}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
