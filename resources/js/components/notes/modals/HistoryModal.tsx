import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import useT, { type Translator } from '@alexandria/hooks/useT';

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

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };
const fadeXSText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const iconFaintText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' };
const iconMicroText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' };
const dotMicroText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)' };

const sectionBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const tabActiveStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const tabIdleStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

const cardHeaderStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const rowDivider: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const expandedHeaderBorder: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const versionBubbleStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)',
    color: 'var(--theme-brand-secondary-500)',
};

const timelineLineStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const editCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

const editCardBodyBorder: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const STATUS_TOKEN: Record<string, { fill: string; content: string }> = {
    pending: { fill: 'var(--theme-status-warning-fill)', content: 'var(--theme-status-warning-content)' },
    approved: { fill: 'var(--theme-status-info-fill)', content: 'var(--theme-status-info-content)' },
    executed: { fill: 'var(--theme-status-success-fill)', content: 'var(--theme-status-success-content)' },
    rejected: { fill: 'var(--theme-status-error-fill)', content: 'var(--theme-status-error-content)' },
    failed: { fill: 'var(--theme-status-error-fill)', content: 'var(--theme-status-error-content)' },
};

const NEUTRAL_BADGE: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

function statusBadgeStyle(status: string): CSSProperties {
    const token = STATUS_TOKEN[status];
    if (!token) return NEUTRAL_BADGE;
    return {
        background: token.fill,
        color: token.content,
        borderRadius: 'var(--theme-radius-badge)',
    };
}

export default function HistoryModal({ open, onClose, historyRecords, historyLoading, projectId, noteId }: HistoryModalProps) {
    const t = useT();
    const [tab, setTab] = useState<Tab>('edits');
    const [aiBatches, setAiBatches] = useState<AiBatchRecord[]>([]);
    const [sortedTo, setSortedTo] = useState<SortedToRecord[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    const fetchAiHistory = useCallback(async () => {
        if (!noteId || !projectId) {
            return;
        }
        setAiLoading(true);
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/ai-history`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        }).catch(() => null);
        setAiLoading(false);
        if (!res?.ok) return;
        const data = await res.json();
        setAiBatches(data.batches ?? []);
        setSortedTo(data.sorted_to ?? []);
    }, [projectId, noteId]);

    useEffect(() => {
        if (open && tab === 'ai') {
            void fetchAiHistory();
        }
    }, [open, tab, fetchAiHistory]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col max-h-[70vh]">
                <div className="flex items-center justify-between px-6 py-4" style={sectionBorderStyle}>
                    <div>
                        <h2 className="text-lg font-bold">{t('notes.history.title')}</h2>
                        <div className="mt-2 flex gap-1">
                            <button
                                type="button"
                                onClick={() => setTab('edits')}
                                className="alex-btn inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium"
                                style={tab === 'edits' ? tabActiveStyle : tabIdleStyle}
                            >
                                <i className="fa-solid fa-pen-to-square text-[9px]" aria-hidden="true" />
                                {t('notes.history.tab.edits')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('ai')}
                                className="alex-btn inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium"
                                style={tab === 'ai' ? tabActiveStyle : tabIdleStyle}
                            >
                                <i className="fa-solid fa-bolt text-[9px]" aria-hidden="true" />
                                {t('notes.history.tab.ai')}
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="alex-notes-modal-icon-btn"
                        aria-label={t('notes.modal.tooltip.close')}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {tab === 'edits' && (
                        <EditHistory records={historyRecords} loading={historyLoading} t={t} />
                    )}
                    {tab === 'ai' && (
                        <AiHistory batches={aiBatches} sortedTo={sortedTo} loading={aiLoading} t={t} />
                    )}
                </div>
            </div>
        </Modal>
    );
}

/* ── Edit History Tab ── */

function EditHistory({ records, loading, t }: { records: HistoryRecord[]; loading: boolean; t: Translator }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <i
                    className="fa-solid fa-circle-notch fa-spin text-base"
                    style={microText}
                    aria-hidden="true"
                />
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="py-12 text-center">
                <i className="fa-solid fa-clock-rotate-left mb-3 text-2xl" style={iconFaintText} aria-hidden="true" />
                <p className="text-sm" style={microText}>
                    {t('notes.history.edits.empty')}
                </p>
            </div>
        );
    }

    return (
        <div className="px-6 py-4">
            {records.map((record, i) => (
                <HistoryCard key={record.id} record={record} version={records.length - i} t={t} />
            ))}
        </div>
    );
}

/* ── AI History Tab ── */

function AiHistory({
    batches,
    sortedTo,
    loading,
    t,
}: {
    batches: AiBatchRecord[];
    sortedTo: SortedToRecord[];
    loading: boolean;
    t: Translator;
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <i
                    className="fa-solid fa-circle-notch fa-spin text-base"
                    style={microText}
                    aria-hidden="true"
                />
            </div>
        );
    }

    if (batches.length === 0 && sortedTo.length === 0) {
        return (
            <div className="py-12 text-center">
                <i className="fa-solid fa-bolt mb-3 text-2xl" style={iconFaintText} aria-hidden="true" />
                <p className="text-sm" style={microText}>
                    {t('notes.history.ai.empty')}
                </p>
            </div>
        );
    }

    return (
        <div className="px-6 py-4 space-y-4">
            {/* Routing history */}
            {sortedTo.length > 0 && (
                <div style={cardStyle}>
                    <div className="px-3 py-2 text-xs font-semibold" style={cardHeaderStyle}>
                        {t('notes.history.ai.sorted_to')}
                    </div>
                    <div>
                        {sortedTo.map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-3 py-2"
                                style={i === sortedTo.length - 1 ? undefined : rowDivider}
                            >
                                <span className="text-xs font-medium">{s.blueprint_name}</span>
                                <span className="text-xs" style={fadedText}>
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
                <BatchCard key={batch.batch_id} batch={batch} t={t} />
            ))}
        </div>
    );
}

/* ── Batch Card ── */

function BatchCard({ batch, t }: { batch: AiBatchRecord; t: Translator }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={cardStyle}>
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="alex-notes-tag-row flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
                <div className="flex items-center gap-2">
                    <i
                        className={`fa-solid fa-chevron-right text-[9px] transition-transform ${expanded ? 'rotate-90' : ''}`}
                        style={iconMicroText}
                        aria-hidden="true"
                    />
                    <div>
                        <span className="text-xs font-medium">
                            {batch.blueprint_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                                ?? t('notes.history.ai.classification')}
                        </span>
                        <span className="ml-2 text-xs" style={fadedText}>
                            {t('notes.history.ai.commands_count').replace(':count', String(batch.summary.total))}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        {batch.summary.executed > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold" style={statusBadgeStyle('executed')}>
                                {batch.summary.executed}
                            </span>
                        )}
                        {batch.summary.rejected > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold" style={statusBadgeStyle('rejected')}>
                                {batch.summary.rejected}
                            </span>
                        )}
                        {batch.summary.pending > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold" style={statusBadgeStyle('pending')}>
                                {batch.summary.pending}
                            </span>
                        )}
                        {batch.summary.failed > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold" style={statusBadgeStyle('failed')}>
                                {batch.summary.failed}
                            </span>
                        )}
                    </div>
                    <span className="text-xs" style={microText}>
                        {batch.created_at ? new Date(batch.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        }) : ''}
                    </span>
                </div>
            </button>

            {expanded && (
                <div style={expandedHeaderBorder}>
                    {batch.commands.map((cmd, i) => (
                        <div
                            key={cmd.id}
                            className="flex items-center justify-between px-3 py-2"
                            style={i === batch.commands.length - 1 ? undefined : rowDivider}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs" style={fadeXSText}>
                                        {cmd.action_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </span>
                                    <span className="text-xs font-medium truncate">{cmd.name}</span>
                                </div>
                                {cmd.failure_reason && (
                                    <p
                                        className="text-xs mt-0.5 truncate"
                                        style={{ color: 'color-mix(in srgb, var(--theme-status-error-stroke) 70%, transparent)' }}
                                    >
                                        {cmd.failure_reason}
                                    </p>
                                )}
                            </div>
                            <span
                                className="px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                                style={statusBadgeStyle(cmd.status)}
                            >
                                {t(`notes.history.ai.status.${cmd.status}`)
                                    || (cmd.status.charAt(0).toUpperCase() + cmd.status.slice(1))}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Edit History Card ── */

function HistoryCard({ record, version, t }: { record: HistoryRecord; version: number; t: Translator }) {
    const [expanded, setExpanded] = useState(false);
    const hasContent = !!(record.previous_title || record.previous_text);

    return (
        <div className="flex gap-4 pb-6">
            <div className="flex flex-col items-center">
                <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={versionBubbleStyle}
                >
                    {t('notes.history.version_label').replace(':version', String(version))}
                </div>
                <div className="mt-1 w-px flex-1" style={timelineLineStyle} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-3 text-xs" style={fadedText}>
                    <span>
                        {record.created_at
                            ? new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                            : ''}
                    </span>
                    {record.user && (
                        <>
                            <span style={dotMicroText}>·</span>
                            <span>{record.user.display_name ?? record.user.name}</span>
                        </>
                    )}
                </div>
                {hasContent && (
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="alex-notes-tag-row w-full text-left"
                        style={editCardStyle}
                    >
                        <div className="flex items-center gap-3 px-4 py-2.5">
                            <i
                                className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                                style={iconMicroText}
                                aria-hidden="true"
                            />
                            <span className="truncate text-sm font-medium" style={labelText}>
                                {record.previous_title || t('notes.history.edits.content_change')}
                            </span>
                        </div>
                        {expanded && (
                            <div className="px-4 py-3" style={editCardBodyBorder} onClick={(e) => e.stopPropagation()}>
                                {record.previous_title && <p className="mb-2 text-sm font-semibold">{record.previous_title}</p>}
                                {record.previous_text && (
                                    <div
                                        className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed"
                                        style={fadeXSText}
                                    >
                                        {record.previous_text}
                                    </div>
                                )}
                                {record.previous_note_date && (
                                    <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={microText}>
                                        <i className="fa-solid fa-calendar text-[9px]" aria-hidden="true" />
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
