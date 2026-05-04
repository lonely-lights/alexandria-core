import { useState, useEffect } from 'react';
import Modal from '@alexandria/components/ui/Modal';

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

export default function LinkMoveModal({ open, onClose, projectId, noteId, noteIds, action, onComplete, apiOverride }: LinkMoveModalProps) {
    const [targets, setTargets] = useState<LinkTarget[]>([]);
    const [targetSearch, setTargetSearch] = useState('');
    const [selectedTarget, setSelectedTarget] = useState<LinkTarget | null>(null);
    const [entrySearch, setEntrySearch] = useState('');
    const [entries, setEntries] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
    const [selectedEntryName, setSelectedEntryName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const actionLabels = { link: 'Link to another...', move: 'Move Note', copy: 'Make a Copy' };
    const actionIcons = { link: 'fa-solid fa-link', move: 'fa-solid fa-right-from-bracket', copy: 'fa-solid fa-copy' };
    const actionButtons = { link: 'Link Note', move: 'Move Note', copy: 'Copy Note' };

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
    }, [entrySearch, selectedTarget]);

    const filteredTargets = targets.filter((t) =>
        !targetSearch || t.title.toLowerCase().includes(targetSearch.toLowerCase())
    );

    async function submit() {
        if (!selectedTarget) return;
        setSubmitting(true);
        const targetType = selectedEntryId ? 'entry' : selectedTarget.type;
        const targetId = selectedEntryId ?? selectedTarget.id;

        if (noteIds && noteIds.length > 0) {
            // Bulk move
            await fetch(`/api/v1/projects/${projectId}/notes/batch-move`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ note_ids: noteIds, target_type: targetType, target_id: targetId }),
            });
        } else {
            // Single note
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
                <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <i className={`${actionIcons[action]} text-sm text-primary`} />
                        <h2 className="text-base font-bold">{actionLabels[action]}</h2>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Step 1: Select target */}
                    <div>
                        <label className="text-xs font-semibold text-base-content/60">Destination</label>
                        <p className="mb-2 mt-0.5 text-[11px] text-base-content/30">
                            Select a project or blueprint to {action} this note to
                        </p>

                        {selectedTarget ? (
                            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                                <div>
                                    <span className="text-sm font-medium">{selectedTarget.title}</span>
                                    <span className="ml-2 text-xs text-base-content/30">{selectedTarget.type}</span>
                                </div>
                                <button onClick={() => { setSelectedTarget(null); setSelectedEntryId(null); setSelectedEntryName(''); setEntries([]); }} className="btn btn-ghost btn-xs">
                                    Change
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={targetSearch}
                                    onChange={(e) => setTargetSearch(e.target.value)}
                                    placeholder="Search destinations..."
                                    autoFocus
                                    className="input input-bordered mb-2 h-9 min-h-0 w-full rounded-xl text-sm"
                                />
                                <div className="max-h-48 overflow-y-auto rounded-xl border border-base-300">
                                    {filteredTargets.map((target) => (
                                        <button
                                            key={`${target.type}-${target.id}`}
                                            onClick={() => setSelectedTarget(target)}
                                            className="flex w-full items-center gap-3 border-b border-base-content/5 px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-base-200/30"
                                        >
                                            <i className={`text-xs text-base-content/30 ${target.type === 'project' ? 'fa-solid fa-folder' : 'fa-solid fa-cube'}`} />
                                            <div>
                                                <span className="font-medium">{target.title}</span>
                                                <p className="text-[10px] text-base-content/30">{target.description}</p>
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
                            <label className="text-xs font-semibold text-base-content/60">Specific Entry (optional)</label>
                            <p className="mb-2 mt-0.5 text-[11px] text-base-content/30">
                                Narrow down to a specific entry within {selectedTarget.title}
                            </p>

                            {selectedEntryId ? (
                                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                                    <span className="text-sm font-medium">{selectedEntryName}</span>
                                    <button onClick={() => { setSelectedEntryId(null); setSelectedEntryName(''); }} className="btn btn-ghost btn-xs">
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={entrySearch}
                                        onChange={(e) => setEntrySearch(e.target.value)}
                                        placeholder="Search entries (min 2 chars)..."
                                        className="input input-bordered h-9 min-h-0 w-full rounded-xl text-sm"
                                    />
                                    {entries.length > 0 && (
                                        <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-base-300">
                                            {entries.map((entry) => (
                                                <button
                                                    key={entry.id}
                                                    onClick={() => { setSelectedEntryId(entry.id); setSelectedEntryName(entry.name); setEntries([]); }}
                                                    className="flex w-full items-center gap-2 border-b border-base-content/5 px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-base-200/30"
                                                >
                                                    <i className="fa-solid fa-file text-[10px] text-base-content/20" />
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
                <div className="flex items-center justify-end gap-2 border-t border-base-300 px-5 py-3">
                    <button onClick={onClose} className="btn btn-ghost btn-sm text-xs">Cancel</button>
                    <button
                        onClick={() => void submit()}
                        disabled={!selectedTarget || submitting}
                        className="btn btn-primary btn-sm text-xs"
                    >
                        {submitting ? <span className="loading loading-spinner loading-xs" /> : actionButtons[action]}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
