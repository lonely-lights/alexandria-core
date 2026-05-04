import { useState, useEffect, useCallback } from 'react';
import Modal from '@alexandria/components/ui/Modal';

export interface HistoryRecord {
    id: number;
    previous_title: string | null;
    previous_text: string | null;
    previous_note_date: string | null;
    created_at: string | null;
    user: { name: string; display_name: string | null } | null;
}

interface AiBatchRecord {
    batch_id: string;
    blueprint_slug: string | null;
    created_at: string | null;
    commands: Array<{
        id: number;
        action_type: string;
        status: string;
        name: string;
        reasoning: string | null;
        failure_reason: string | null;
        executed_at: string | null;
    }>;
    summary: {
        total: number;
        pending: number;
        approved: number;
        executed: number;
        rejected: number;
        failed: number;
    };
}

interface SortedToRecord {
    blueprint_id: number;
    blueprint_slug: string;
    blueprint_name: string;
    sorted_at: string;
}

interface HistoryModalProps {
    open: boolean;
    onClose: () => void;
    historyRecords: HistoryRecord[];
    historyLoading: boolean;
    projectId: number;
    noteId: number | null;
}

type Tab = 'edits' | 'ai';

export default function HistoryModal({ open, onClose, historyRecords, historyLoading, projectId, noteId }: HistoryModalProps) {
    const [tab, setTab] = useState<Tab>('edits');
    const [aiBatches, setAiBatches] = useState<AiBatchRecord[]>([]);
    const [sortedTo, setSortedTo] = useState<SortedToRecord[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    const fetchAiHistory = useCallback(async () => {
        if (!noteId || !projectId) {
            return;
        }
        setAiLoading(true);
        try {
            const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/ai-history`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                setAiBatches(data.batches ?? []);
                setSortedTo(data.sorted_to ?? []);
            }
        } finally {
            setAiLoading(false);
        }
    }, [projectId, noteId]);

    useEffect(() => {
        if (open && tab === 'ai') {
            void fetchAiHistory();
        }
    }, [open, tab, fetchAiHistory]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col max-h-[70vh]">
                <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold">Note History</h2>
                        <div className="mt-2 flex gap-1">
                            <button
                                onClick={() => setTab('edits')}
                                className={`btn btn-xs rounded-lg ${tab === 'edits' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className="fa-solid fa-pen-to-square text-[9px]" /> Edits
                            </button>
                            <button
                                onClick={() => setTab('ai')}
                                className={`btn btn-xs rounded-lg ${tab === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className="fa-solid fa-bolt text-[9px]" /> AI Activity
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {tab === 'edits' && (
                        <EditHistory records={historyRecords} loading={historyLoading} />
                    )}
                    {tab === 'ai' && (
                        <AiHistory batches={aiBatches} sortedTo={sortedTo} loading={aiLoading} />
                    )}
                </div>
            </div>
        </Modal>
    );
}

/* ── Edit History Tab ── */

function EditHistory({ records, loading }: { records: HistoryRecord[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-md text-base-content/30" />
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="py-12 text-center">
                <i className="fa-solid fa-clock-rotate-left mb-3 text-2xl text-base-content/10" />
                <p className="text-sm text-base-content/30">No edit history yet</p>
            </div>
        );
    }

    return (
        <div className="px-6 py-4">
            {records.map((record, i) => (
                <HistoryCard key={record.id} record={record} version={records.length - i} />
            ))}
        </div>
    );
}

/* ── AI History Tab ── */

function AiHistory({ batches, sortedTo, loading }: { batches: AiBatchRecord[]; sortedTo: SortedToRecord[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-md text-base-content/30" />
            </div>
        );
    }

    if (batches.length === 0 && sortedTo.length === 0) {
        return (
            <div className="py-12 text-center">
                <i className="fa-solid fa-bolt mb-3 text-2xl text-base-content/10" />
                <p className="text-sm text-base-content/30">No AI activity yet</p>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        pending: 'badge-warning',
        approved: 'badge-info',
        executed: 'badge-success',
        rejected: 'badge-error',
        failed: 'badge-error',
    };

    return (
        <div className="px-6 py-4 space-y-4">
            {/* Routing history */}
            {sortedTo.length > 0 && (
                <div className="rounded-lg border border-base-content/10 bg-base-100 overflow-hidden">
                    <div className="bg-base-200/50 px-3 py-2 text-xs font-semibold text-base-content/60">
                        Sorted To
                    </div>
                    <div className="divide-y divide-base-200/50">
                        {sortedTo.map((s, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2">
                                <span className="text-xs font-medium">{s.blueprint_name}</span>
                                <span className="text-xs text-base-content/40">
                                    {new Date(s.sorted_at).toLocaleString(undefined, {
                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Command batches */}
            {batches.map((batch) => (
                <BatchCard key={batch.batch_id} batch={batch} statusColors={statusColors} />
            ))}
        </div>
    );
}

/* ── Batch Card ── */

function BatchCard({ batch, statusColors }: { batch: AiBatchRecord; statusColors: Record<string, string> }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="rounded-lg border border-base-content/10 bg-base-100 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-base-200/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <i className={`fa-solid fa-chevron-right text-[9px] text-base-content/20 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    <div>
                        <span className="text-xs font-medium">
                            {batch.blueprint_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Classification'}
                        </span>
                        <span className="ml-2 text-xs text-base-content/40">
                            {batch.summary.total} commands
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        {batch.summary.executed > 0 && <span className="badge badge-xs badge-success">{batch.summary.executed}</span>}
                        {batch.summary.rejected > 0 && <span className="badge badge-xs badge-error">{batch.summary.rejected}</span>}
                        {batch.summary.pending > 0 && <span className="badge badge-xs badge-warning">{batch.summary.pending}</span>}
                        {batch.summary.failed > 0 && <span className="badge badge-xs badge-error">{batch.summary.failed}</span>}
                    </div>
                    <span className="text-xs text-base-content/30">
                        {batch.created_at ? new Date(batch.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        }) : ''}
                    </span>
                </div>
            </button>

            {expanded && (
                <div className="border-t border-base-200/50 divide-y divide-base-200/50">
                    {batch.commands.map((cmd) => (
                        <div key={cmd.id} className="flex items-center justify-between px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-base-content/50">
                                        {cmd.action_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </span>
                                    <span className="text-xs font-medium truncate">{cmd.name}</span>
                                </div>
                                {cmd.failure_reason && (
                                    <p className="text-xs text-error/70 mt-0.5 truncate">{cmd.failure_reason}</p>
                                )}
                            </div>
                            <span className={`badge badge-xs ${statusColors[cmd.status] ?? 'badge-neutral'}`}>
                                {cmd.status.charAt(0).toUpperCase() + cmd.status.slice(1)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Edit History Card ── */

function HistoryCard({ record, version }: { record: HistoryRecord; version: number }) {
    const [expanded, setExpanded] = useState(false);
    const hasContent = !!(record.previous_title || record.previous_text);

    return (
        <div className="flex gap-4 pb-6">
            <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20 text-[10px] font-bold text-secondary">
                    v{version}
                </div>
                <div className="mt-1 w-px flex-1 bg-base-content/8" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-3 text-xs text-base-content/40">
                    <span>
                        {record.created_at
                            ? new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                            : ''}
                    </span>
                    {record.user && (
                        <>
                            <span className="text-base-content/15">·</span>
                            <span>{record.user.display_name ?? record.user.name}</span>
                        </>
                    )}
                </div>
                {hasContent && (
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full overflow-hidden rounded-xl border border-base-300 bg-base-100 text-left transition-colors hover:border-base-content/20"
                    >
                        <div className="flex items-center gap-3 px-4 py-2.5">
                            <i className={`fa-solid fa-chevron-right text-[10px] text-base-content/20 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                            <span className="truncate text-sm font-medium text-base-content/70">
                                {record.previous_title || 'Content change'}
                            </span>
                        </div>
                        {expanded && (
                            <div className="border-t border-base-300 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                {record.previous_title && <p className="mb-2 text-sm font-semibold">{record.previous_title}</p>}
                                {record.previous_text && (
                                    <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-base-content/50">
                                        {record.previous_text}
                                    </div>
                                )}
                                {record.previous_note_date && (
                                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-base-content/30">
                                        <i className="fa-solid fa-calendar text-[9px]" />
                                        {new Date(record.previous_note_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </div>
                                )}
                            </div>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
