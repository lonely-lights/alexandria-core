import { useState, useEffect, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

interface LinkTarget {
    type: string;
    id: number;
    title: string;
    description: string;
}

interface LinkMoveModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    noteId: number;
    noteIds?: number[];
    action: 'link' | 'move' | 'copy';
    onComplete: () => void;
    apiOverride?: string;
}

const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

const sectionBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const sectionBorderTopStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.75rem',
};

const selectedChipStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent)',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const listWrapperStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

const rowDivider = '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)';

export default function LinkMoveModal({ open, onClose, projectId, noteId, noteIds, action, onComplete, apiOverride }: LinkMoveModalProps) {
    const t = useT();
    const [targets, setTargets] = useState<LinkTarget[]>([]);
    const [targetSearch, setTargetSearch] = useState('');
    const [selectedTarget, setSelectedTarget] = useState<LinkTarget | null>(null);
    const [entrySearch, setEntrySearch] = useState('');
    const [entries, setEntries] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
    const [selectedEntryName, setSelectedEntryName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const actionTitle = t(`notes.link_move.action.${action}.title`);
    const actionButton = t(`notes.link_move.action.${action}.button`);
    const actionIcons: Record<typeof action, string> = {
        link: 'fa-solid fa-link',
        move: 'fa-solid fa-right-from-bracket',
        copy: 'fa-solid fa-copy',
    };

    // Fetch targets on open
    useEffect(() => {
        if (!open || !projectId) return;
        setTargetSearch('');
        setSelectedTarget(null);
        setEntrySearch('');
        setEntries([]);
        setSelectedEntryId(null);
        setSelectedEntryName('');

        fetch(`/api/v1/projects/${projectId}/targets`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.ok ? r.json() : [])
            .then(setTargets)
            .catch(() => setTargets([]));
    }, [open, projectId]);

    // Search entries when a blueprint is selected
    useEffect(() => {
        if (!selectedTarget || selectedTarget.type !== 'blueprint' || entrySearch.length < 2) {
            setEntries([]);
            return;
        }
        const timer = setTimeout(() => {
            fetch(`/api/v1/projects/${projectId}/blueprints/${selectedTarget.id}/entries-search?search=${encodeURIComponent(entrySearch)}`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            })
                .then((r) => r.ok ? r.json() : [])
                .then(setEntries)
                .catch(() => setEntries([]));
        }, 300);
        return () => clearTimeout(timer);
    }, [entrySearch, selectedTarget, projectId]);

    const filteredTargets = targets.filter((tg) =>
        !targetSearch || tg.title.toLowerCase().includes(targetSearch.toLowerCase())
    );

    async function submit() {
        if (!selectedTarget) return;
        setSubmitting(true);
        const targetType = selectedEntryId ? 'entry' : selectedTarget.type;
        const targetId = selectedEntryId ?? selectedTarget.id;

        if (noteIds && noteIds.length > 0) {
            await fetch(`/api/v1/projects/${projectId}/notes/batch-move`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ note_ids: noteIds, target_type: targetType, target_id: targetId }),
            });
        } else {
            await fetch(apiOverride ?? `/api/v1/projects/${projectId}/notes/${noteId}/link`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ action, target_type: targetType, target_id: targetId }),
            });
        }
        setSubmitting(false);
        onComplete();
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <div className="flex flex-col max-h-[70vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={sectionBorderStyle}>
                    <div className="flex items-center gap-2">
                        <i
                            className={`${actionIcons[action]} text-sm`}
                            style={{ color: 'var(--theme-brand-primary-500)' }}
                        />
                        <h2 className="text-base font-bold">{actionTitle}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="alex-notes-modal-icon-btn"
                        aria-label={t('notes.modal.tooltip.close')}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Step 1: Select target */}
                    <div>
                        <label className="text-xs font-semibold" style={muteText}>
                            {t('notes.link_move.destination.label')}
                        </label>
                        <p className="mb-2 mt-0.5 text-[11px]" style={microText}>
                            {t('notes.link_move.destination.hint').replace(':action', action)}
                        </p>

                        {selectedTarget ? (
                            <div className="flex items-center justify-between px-4 py-3" style={selectedChipStyle}>
                                <div>
                                    <span className="text-sm font-medium">{selectedTarget.title}</span>
                                    <span className="ml-2 text-xs" style={microText}>{selectedTarget.type}</span>
                                </div>
                                <button
                                    onClick={() => { setSelectedTarget(null); setSelectedEntryId(null); setSelectedEntryName(''); setEntries([]); }}
                                    className="alex-btn alex-btn--ghost"
                                    style={{ borderRadius: 'var(--theme-radius-button)', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                    {t('notes.link_move.destination.change')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={targetSearch}
                                    onChange={(e) => setTargetSearch(e.target.value)}
                                    placeholder={t('notes.link_move.destination.search')}
                                    autoFocus
                                    className="mb-2 h-9 w-full text-sm"
                                    style={inputStyle}
                                />
                                <div className="max-h-48 overflow-y-auto" style={listWrapperStyle}>
                                    {filteredTargets.map((target, idx) => (
                                        <button
                                            key={`${target.type}-${target.id}`}
                                            onClick={() => setSelectedTarget(target)}
                                            className="alex-notes-tag-row flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm"
                                            style={idx === filteredTargets.length - 1 ? undefined : { borderBottom: rowDivider }}
                                        >
                                            <i
                                                className={`text-xs ${target.type === 'project' ? 'fa-solid fa-folder' : 'fa-solid fa-cube'}`}
                                                style={microText}
                                            />
                                            <div>
                                                <span className="font-medium">{target.title}</span>
                                                <p className="text-[10px]" style={microText}>{target.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Step 2: Optionally select entry within blueprint */}
                    {selectedTarget?.type === 'blueprint' && (
                        <div className="mt-4">
                            <label className="text-xs font-semibold" style={muteText}>
                                {t('notes.link_move.entry.label')}
                            </label>
                            <p className="mb-2 mt-0.5 text-[11px]" style={microText}>
                                {t('notes.link_move.entry.hint').replace(':target', selectedTarget.title)}
                            </p>

                            {selectedEntryId ? (
                                <div className="flex items-center justify-between px-4 py-3" style={selectedChipStyle}>
                                    <span className="text-sm font-medium">{selectedEntryName}</span>
                                    <button
                                        onClick={() => { setSelectedEntryId(null); setSelectedEntryName(''); }}
                                        className="alex-btn alex-btn--ghost"
                                        style={{ borderRadius: 'var(--theme-radius-button)', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                        {t('notes.link_move.destination.change')}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={entrySearch}
                                        onChange={(e) => setEntrySearch(e.target.value)}
                                        placeholder={t('notes.link_move.entry.search')}
                                        className="h-9 w-full text-sm"
                                        style={inputStyle}
                                    />
                                    {entries.length > 0 && (
                                        <div className="mt-2 max-h-36 overflow-y-auto" style={listWrapperStyle}>
                                            {entries.map((entry, idx) => (
                                                <button
                                                    key={entry.id}
                                                    onClick={() => { setSelectedEntryId(entry.id); setSelectedEntryName(entry.name); setEntries([]); }}
                                                    className="alex-notes-tag-row flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm"
                                                    style={idx === entries.length - 1 ? undefined : { borderBottom: rowDivider }}
                                                >
                                                    <i className="fa-solid fa-file text-[10px]" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' }} />
                                                    {entry.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3" style={sectionBorderTopStyle}>
                    <button
                        onClick={onClose}
                        className="alex-btn alex-btn--ghost"
                        style={{ borderRadius: 'var(--theme-radius-button)', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                    >
                        {t('notes.link_move.cancel')}
                    </button>
                    <button
                        onClick={() => void submit()}
                        disabled={!selectedTarget || submitting}
                        className="alex-btn alex-btn--primary"
                        style={{ borderRadius: 'var(--theme-radius-button)', padding: '0.25rem 0.625rem', fontSize: '0.75rem', gap: '0.25rem' }}
                    >
                        {submitting
                            ? <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                            : actionButton}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
