import { useState, useEffect, type CSSProperties } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { fetchJson } from '@alexandria/lib/fetchJson';
import useT from '@alexandria/hooks/useT';
import type {
    L2BlueprintSummary,
    L2PreviewResult,
    AiCommand,
    NoteGroup,
} from '@alexandria/types/workbench';

/* ── Props ── */

interface WorkbenchCreationTabProps {
    projectSlug: string;
    projectId: number;
}

/* ── Theme styles (matching WorkbenchRoutingTab conventions) ── */

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1rem',
};

const labelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.75rem',
};

const descStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    fontSize: '0.8125rem',
    lineHeight: '1.4',
};

const countStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    fontSize: '0.75rem',
};

const monoStyle: CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '0.8125rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
};

const reviewCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    transition: 'border-color 0.1s',
};

const reviewCardActiveStyle: CSSProperties = {
    ...reviewCardStyle,
    border: '2px solid var(--theme-brand-primary-500)',
};

const chipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.125rem 0.5rem',
    borderRadius: 'var(--theme-radius-badge)',
    fontSize: '0.6875rem',
    fontWeight: 600,
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    color: 'var(--theme-base-content)',
};

function badge(label: string, color: string): CSSProperties {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.125rem 0.5rem',
        borderRadius: 'var(--theme-radius-badge)',
        fontSize: '0.6875rem',
        fontWeight: 600,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
    };
}

const primaryBtn: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const secondaryBtn: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

/* ── Hone modal ── */

function HoneModal({
    open,
    data,
    loading,
    projectSlug,
    onClose,
    t,
}: {
    open: boolean;
    data: L2PreviewResult | null;
    loading: boolean;
    projectSlug: string;
    onClose: () => void;
    t: (k: string) => string;
}) {
    const [copied, setCopied] = useState(false);
    const [promptVisible, setPromptVisible] = useState(true);

    if (!open) return null;

    function handleCopy() {
        if (!data) return;
        void navigator.clipboard.writeText(data.prompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const sm = data?.source_map;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    background: 'var(--theme-base-100)',
                    borderRadius: 'var(--theme-radius-card)',
                    padding: '1.5rem',
                    maxWidth: '64rem',
                    width: '100%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <h2 className="font-semibold text-base" style={{ color: 'var(--theme-base-content)' }}>
                        {t('ai.workbench.creation.hone.modal_title')}
                    </h2>
                    <div className="flex items-center gap-2">
                        {data && data.token_estimate > 0 && (
                            <span style={countStyle}>
                                {t('ai.workbench.creation.hone.token_estimate').replace(':count', String(data.token_estimate))}
                            </span>
                        )}
                        {sm && (
                            <span style={countStyle}>
                                {t('ai.workbench.creation.hone.notes_in_batch').replace(':count', String(sm.notes_in_batch))}
                            </span>
                        )}
                        <button
                            type="button"
                            className="alex-btn px-2 py-1 text-sm"
                            onClick={onClose}
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}
                            aria-label="Close"
                        >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ overflowY: 'auto', minHeight: 0, flexGrow: 1 }}>
                    {/* Left: prompt */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold" style={labelStyle}>
                                {t('ai.workbench.creation.hone.prompt_section')}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="alex-btn px-2 py-1 text-xs"
                                    onClick={() => setPromptVisible((v) => !v)}
                                    style={secondaryBtn}
                                >
                                    {promptVisible ? '▲' : '▼'}
                                </button>
                                <button
                                    type="button"
                                    className="alex-btn px-3 py-1 text-xs"
                                    onClick={handleCopy}
                                    style={secondaryBtn}
                                >
                                    {copied ? t('ai.workbench.creation.hone.copied') : t('ai.workbench.creation.hone.copy_button')}
                                </button>
                            </div>
                        </div>
                        {promptVisible && (
                            <div style={{ overflowY: 'auto', maxHeight: '60vh', ...cardStyle }}>
                                {loading ? (
                                    <p style={labelStyle}>{t('ai.workbench.creation.hone.loading')}</p>
                                ) : (
                                    <pre style={monoStyle}>{data?.prompt ?? ''}</pre>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: source map */}
                    <div className="flex flex-col gap-3">
                        <span className="text-xs font-semibold" style={labelStyle}>
                            {t('ai.workbench.creation.hone.source_map_section')}
                        </span>

                        {sm ? (
                            <div className="space-y-3">
                                {/* Blueprint description */}
                                <div style={cardStyle} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                            {t('ai.workbench.creation.hone.blueprint_desc_label')}
                                        </span>
                                        <a
                                            href={`/p/${projectSlug}/blueprints/${sm.blueprint_slug}`}
                                            className="text-xs"
                                            style={{ color: 'var(--theme-brand-primary-500)' }}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {t('ai.workbench.creation.hone.blueprint_desc_edit')} ↗
                                        </a>
                                    </div>
                                    <p style={descStyle}>
                                        {sm.blueprint_description ?? t('ai.workbench.creation.hone.blueprint_desc_none')}
                                    </p>
                                </div>

                                {/* Field schema */}
                                <div style={cardStyle} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                            {t('ai.workbench.creation.hone.field_schema_label')}
                                        </span>
                                        <a
                                            href={`/p/${projectSlug}/blueprints/${sm.blueprint_slug}?tab=fields`}
                                            className="text-xs"
                                            style={{ color: 'var(--theme-brand-primary-500)' }}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {t('ai.workbench.creation.hone.field_schema_edit')} ↗
                                        </a>
                                    </div>
                                    <pre style={{ ...monoStyle, fontSize: '0.75rem', maxHeight: '8rem', overflowY: 'auto' }}>
                                        {sm.field_schema}
                                    </pre>
                                </div>

                                {/* Target index */}
                                <div style={cardStyle} className="space-y-1">
                                    <span className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                        {t('ai.workbench.creation.hone.target_index_label')}
                                    </span>
                                    <p style={countStyle}>
                                        {t('ai.workbench.creation.hone.target_index_count').replace(':count', String(sm.target_index_size))}
                                        {sm.target_pruned && (
                                            <span style={{ marginLeft: '0.5rem', fontStyle: 'italic' }}>
                                                {t('ai.workbench.creation.hone.target_index_pruned')}
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Relationship edges */}
                                {sm.relationship_edges.length > 0 && (
                                    <div style={cardStyle} className="space-y-2">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                            {t('ai.workbench.creation.hone.edges_label')}
                                        </span>
                                        {sm.relationship_edges.map((edge, idx) => (
                                            <div key={idx} className="space-y-1 pl-2" style={{ borderLeft: '2px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)' }}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span style={{ ...chipStyle, fontSize: '0.6875rem' }}>
                                                            {edge.ai_priority === 'required'
                                                                ? t('ai.workbench.creation.hone.edge_required')
                                                                : t('ai.workbench.creation.hone.edge_preferred')}
                                                        </span>
                                                        <span className="text-xs font-medium" style={{ color: 'var(--theme-base-content)' }}>
                                                            {edge.relationship_name} → {edge.blueprint_slug}
                                                        </span>
                                                    </div>
                                                    <a
                                                        href={`/p/${projectSlug}/blueprints/${edge.blueprint_slug}`}
                                                        className="text-xs flex-shrink-0"
                                                        style={{ color: 'var(--theme-brand-primary-500)' }}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {t('ai.workbench.creation.hone.edge_edit')} ↗
                                                    </a>
                                                </div>
                                                <p style={countStyle}>
                                                    {t('ai.workbench.creation.hone.edge_index_count').replace(':count', String(edge.index_size))}
                                                </p>
                                                {edge.ai_instruction && (
                                                    <p style={descStyle}>{edge.ai_instruction}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            loading && <p style={labelStyle}>{t('ai.workbench.creation.hone.loading')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Confirm run dialog ── */

function ConfirmRunDialog({
    open,
    blueprintName,
    pendingCount,
    onConfirm,
    onCancel,
    t,
}: {
    open: boolean;
    blueprintName: string;
    pendingCount: number;
    onConfirm: () => void;
    onCancel: () => void;
    t: (k: string) => string;
}) {
    if (!open) return null;
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div
                style={{
                    background: 'var(--theme-base-100)',
                    borderRadius: 'var(--theme-radius-card)',
                    padding: '1.5rem',
                    maxWidth: '28rem',
                    width: '100%',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                }}
            >
                <h2 className="font-semibold text-base" style={{ color: 'var(--theme-base-content)' }}>
                    {t('ai.workbench.creation.run.confirm_title')}
                </h2>
                <p style={descStyle}>
                    {t('ai.workbench.creation.run.confirm_body')
                        .replace(':count', String(pendingCount))
                        .replace(':blueprint', blueprintName)}
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="alex-btn px-3 py-1.5 text-sm"
                        onClick={onCancel}
                        style={secondaryBtn}
                    >
                        {t('ai.workbench.creation.run.confirm_cancel')}
                    </button>
                    <button
                        type="button"
                        className="alex-btn px-3 py-1.5 text-sm"
                        onClick={onConfirm}
                        style={primaryBtn}
                    >
                        {t('ai.workbench.creation.run.confirm_ok')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Command chip renderer ── */

function CommandChip({ cmd }: { cmd: AiCommand }) {
    const payload = cmd.payload;
    const label = (() => {
        if (cmd.action_type === 'create_entry') {
            const attrs = payload.attributes as Record<string, unknown> | undefined;
            return attrs?.name ? `"${String(attrs.name)}"` : (payload.temp_id ? String(payload.temp_id) : 'new entry');
        }
        if (cmd.action_type === 'create_relationship') {
            return `${String(payload.relationship_type ?? payload.relationship_name ?? 'rel')}`;
        }
        if (cmd.action_type === 'copy_note' || cmd.action_type === 'transfer_note') {
            return `→ entry #${String(payload.target_model_id ?? '?')}`;
        }
        return cmd.action_type;
    })();

    const colors: Record<string, string> = {
        create_entry: 'var(--theme-status-info-stroke, #3b82f6)',
        create_relationship: 'var(--theme-status-success-stroke, #22c55e)',
        copy_note: 'var(--theme-status-warning-stroke, #f59e0b)',
        transfer_note: 'var(--theme-brand-primary-500)',
    };
    const color = colors[cmd.action_type] ?? 'var(--theme-base-content)';

    return (
        <span style={{ ...chipStyle, background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
            {label}
        </span>
    );
}

/* ── Note group card ── */

function NoteGroupCard({
    group,
    isCursor,
    localStatus,
    execResults,
    onClick,
    t,
}: {
    group: NoteGroup;
    isCursor: boolean;
    localStatus: Record<number, 'approved' | 'rejected'>;
    execResults: Record<number, 'executed' | 'failed'>;
    onClick: () => void;
    t: (k: string) => string;
}) {
    const [malformedOpen, setMalformedOpen] = useState(false);

    const getCommandStatus = (cmd: AiCommand): string => {
        const exec = execResults[cmd.id];
        if (exec) return exec;
        return localStatus[cmd.id] ?? cmd.status;
    };

    const statusColor = (s: string): string => {
        const map: Record<string, string> = {
            approved: 'var(--theme-status-info-stroke, #3b82f6)',
            rejected: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
            executed: 'var(--theme-status-success-stroke, #22c55e)',
            failed: 'var(--theme-status-error-stroke, #ef4444)',
            pending: 'var(--theme-status-warning-stroke, #f59e0b)',
        };
        return map[s] ?? 'var(--theme-base-content)';
    };

    return (
        <div
            style={isCursor ? reviewCardActiveStyle : reviewCardStyle}
            className="cursor-pointer"
            onClick={onClick}
        >
            {/* Versus layout: note text | commands */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
                {/* Left: note */}
                <div className="space-y-1">
                    <p className="text-xs font-semibold" style={labelStyle}>
                        {t('ai.workbench.creation.review.note_side_label')}
                    </p>
                    <p className="text-sm font-medium" style={{ color: 'var(--theme-base-content)' }}>
                        {group.noteTitle || 'Untitled'}
                    </p>
                    <div style={{ ...descStyle, maxHeight: '7rem', overflowY: 'auto' }}>
                        {group.noteText || '(empty)'}
                    </div>
                </div>

                {/* Right: commands */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold" style={labelStyle}>
                            {t('ai.workbench.creation.review.commands_side_label')}
                        </p>
                        {isCursor && (
                            <div className="flex items-center gap-1 text-xs" style={labelStyle}>
                                <kbd>A</kbd> <kbd>G</kbd> <kbd>↑↓</kbd>
                            </div>
                        )}
                    </div>
                    {group.activeCommands.length === 0 ? (
                        <p style={labelStyle}>{t('ai.workbench.creation.review.no_commands_for_note')}</p>
                    ) : (
                        group.activeCommands.map((cmd) => {
                            const status = getCommandStatus(cmd);
                            return (
                                <div key={cmd.id} className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <CommandChip cmd={cmd} />
                                        <span style={{ ...badge(status, statusColor(status)), fontSize: '0.6875rem' }}>
                                            {t(`ai.workbench.creation.review.${status}_badge`)}
                                        </span>
                                    </div>
                                    {cmd.reasoning && (
                                        <p style={{ ...descStyle, fontSize: '0.75rem', paddingLeft: '0.5rem' }}>
                                            {cmd.reasoning.length > 120 ? `${cmd.reasoning.slice(0, 120)}…` : cmd.reasoning}
                                        </p>
                                    )}
                                    {status === 'failed' && cmd.failure_reason && (
                                        <p style={{ color: 'var(--theme-status-error-stroke, #ef4444)', fontSize: '0.75rem', paddingLeft: '0.5rem' }}>
                                            {cmd.failure_reason}
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Malformed strap */}
            {group.malformedCommands.length > 0 && (
                <div style={{ borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)', padding: '0.5rem 0.75rem' }}>
                    <button
                        type="button"
                        className="text-xs"
                        style={{ color: 'var(--theme-status-error-stroke, #ef4444)' }}
                        onClick={(e) => { e.stopPropagation(); setMalformedOpen((o) => !o); }}
                    >
                        {t('ai.workbench.creation.review.malformed_strap').replace(':count', String(group.malformedCommands.length))}
                        {' '}{malformedOpen ? '▲' : '▼'}
                    </button>
                    {malformedOpen && (
                        <div className="mt-2 space-y-1">
                            {group.malformedCommands.map((cmd) => (
                                <p key={cmd.id} style={{ ...descStyle, fontSize: '0.75rem' }}>
                                    {JSON.stringify(cmd.validation_errors)}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Main component ── */

export default function WorkbenchCreationTab({ projectSlug, projectId }: WorkbenchCreationTabProps) {
    const t = useT();

    /* ── Run pane state ── */
    const [summary, setSummary] = useState<L2BlueprintSummary[]>([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [batchSize, setBatchSize] = useState(25);

    /* ── Hone modal state ── */
    const [honeOpen, setHoneOpen] = useState(false);
    const [honeData, setHoneData] = useState<L2PreviewResult | null>(null);
    const [honeLoading, setHoneLoading] = useState(false);

    /* ── Confirm + run state ── */
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [running, setRunning] = useState(false);

    /* ── Review pane state ── */
    const [batches, setBatches] = useState<{ batchId: string; label: string }[]>([]);
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const [commands, setCommands] = useState<AiCommand[]>([]);
    const [noteMap, setNoteMap] = useState<Record<number, { title: string; text: string }>>({});
    const [commandsLoading, setCommandsLoading] = useState(false);
    const [localStatus, setLocalStatus] = useState<Record<number, 'approved' | 'rejected'>>({});
    const [cursorIdx, setCursorIdx] = useState(0);
    const [executing, setExecuting] = useState(false);
    const [execResults, setExecResults] = useState<Record<number, 'executed' | 'failed'>>({});
    const [execSummary, setExecSummary] = useState<{ success: number; failed: number } | null>(null);

    const selectedBp = summary.find((b) => b.slug === selectedSlug) ?? null;

    /* ── Load summary on mount ── */
    useEffect(() => {
        setSummaryLoading(true);
        fetchJson(`/p/${projectSlug}/ai/workbench/l2-summary`)
            .then((data) => setSummary((data as { blueprints: L2BlueprintSummary[] }).blueprints))
            .catch(() => {})
            .finally(() => setSummaryLoading(false));
    }, [projectSlug]);

    /* ── Load commands + notes when active batch changes ── */
    useEffect(() => {
        if (!activeBatchId) return;
        setCommandsLoading(true);
        setLocalStatus({});
        setExecResults({});
        setExecSummary(null);
        setCursorIdx(0);

        const cmdUrl = `/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/commands`;
        const notesUrl = `/p/${projectSlug}/ai/workbench/l2-batch/${activeBatchId}/notes`;

        Promise.all([
            fetchJson(cmdUrl),
            fetchJson(notesUrl),
        ])
            .then(([cmdsData, notesData]) => {
                setCommands(cmdsData as AiCommand[]);
                setNoteMap((notesData as { notes: Record<number, { id: number; title: string; text: string }> }).notes ?? {});
            })
            .catch(() => {})
            .finally(() => setCommandsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeBatchId]);

    /* ── Derived: note groups ── */
    const noteGroups: NoteGroup[] = (() => {
        const groupMap = new Map<number, AiCommand[]>();
        for (const cmd of commands) {
            const noteId = (cmd.context?.note_id as number | undefined) ?? -cmd.id;
            if (!groupMap.has(noteId)) groupMap.set(noteId, []);
            groupMap.get(noteId)!.push(cmd);
        }
        return Array.from(groupMap.entries()).map(([noteId, cmds]) => {
            const info = noteMap[noteId];
            return {
                noteId,
                noteTitle: info?.title ?? `Note #${noteId}`,
                noteText: info?.text ?? '',
                commands: cmds,
                activeCommands: cmds.filter((c) => c.is_active),
                malformedCommands: cmds.filter((c) => !c.is_active),
            };
        });
    })();

    const cursorGroup = noteGroups[cursorIdx] ?? null;

    /* ── Keyboard handler ── */
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
            if (honeOpen || confirmOpen) return;
            if (!cursorGroup) return;

            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                void approveGroup(cursorGroup).then(() => {
                    setCursorIdx((i) => Math.min(i + 1, noteGroups.length - 1));
                });
            } else if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                void rejectGroup(cursorGroup).then(() => {
                    setCursorIdx((i) => Math.min(i + 1, noteGroups.length - 1));
                });
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursorIdx((i) => Math.min(i + 1, noteGroups.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursorIdx((i) => Math.max(i - 1, 0));
            }
        }

        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursorGroup, noteGroups, honeOpen, confirmOpen]);

    /* ── Actions ── */

    async function openHone() {
        if (!selectedSlug) return;
        setHoneOpen(true);
        setHoneLoading(true);
        setHoneData(null);
        try {
            const data = await fetchJson(`/p/${projectSlug}/ai/workbench/l2-preview-prompt`, {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ blueprint_slug: selectedSlug, batch_size: batchSize }),
            });
            setHoneData(data as L2PreviewResult);
        } catch {
            // show nothing; user can retry
        } finally {
            setHoneLoading(false);
        }
    }

    async function doRun() {
        if (!selectedSlug) return;
        setConfirmOpen(false);
        setRunning(true);
        try {
            const data = await fetchJson(`/p/${projectSlug}/ai/workbench/l2-run-batch`, {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ blueprint_slug: selectedSlug, batch_size: batchSize }),
            }) as { batch_ids: string[]; notes_processed: number; commands_created: number };

            if (data.batch_ids.length > 0) {
                const label = `${selectedBp?.name ?? selectedSlug} · ${new Date().toLocaleTimeString()}`;
                const newBatches = data.batch_ids.map((id) => ({ batchId: id, label }));
                setBatches((prev) => [...prev, ...newBatches]);
                setActiveBatchId(newBatches[0].batchId);

                // Refresh summary counts
                fetchJson(`/p/${projectSlug}/ai/workbench/l2-summary`)
                    .then((sd) => setSummary((sd as { blueprints: L2BlueprintSummary[] }).blueprints))
                    .catch(() => {});
            }
        } catch {
            // no-op
        } finally {
            setRunning(false);
        }
    }

    async function updateCommandStatus(commandId: number, status: 'approved' | 'rejected') {
        try {
            await fetchJson(`/api/v1/projects/${projectId}/ai/commands/${commandId}`, {
                method: 'PUT',
                headers: csrfHeaders(),
                body: JSON.stringify({ status }),
            });
            setLocalStatus((prev) => ({ ...prev, [commandId]: status }));
        } catch {
            // no-op
        }
    }

    async function approveGroup(group: NoteGroup) {
        for (const cmd of group.activeCommands) {
            if ((localStatus[cmd.id] ?? cmd.status) === 'pending') {
                await updateCommandStatus(cmd.id, 'approved');
            }
        }
    }

    async function rejectGroup(group: NoteGroup) {
        for (const cmd of group.activeCommands) {
            if ((localStatus[cmd.id] ?? cmd.status) === 'pending') {
                await updateCommandStatus(cmd.id, 'rejected');
            }
        }
    }

    async function bulkApproveAll() {
        if (!activeBatchId) return;
        try {
            await fetchJson(`/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/approve-all`, {
                method: 'POST',
                headers: csrfHeaders(),
            });
            setLocalStatus((prev) => {
                const next = { ...prev };
                for (const cmd of commands) {
                    if (cmd.is_active && (prev[cmd.id] ?? cmd.status) === 'pending') {
                        next[cmd.id] = 'approved';
                    }
                }
                return next;
            });
        } catch {
            // no-op
        }
    }

    async function bulkRejectAll() {
        if (!activeBatchId) return;
        try {
            await fetchJson(`/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/reject-all`, {
                method: 'POST',
                headers: csrfHeaders(),
            });
            setLocalStatus((prev) => {
                const next = { ...prev };
                for (const cmd of commands) {
                    if (cmd.is_active && (prev[cmd.id] ?? cmd.status) === 'pending') {
                        next[cmd.id] = 'rejected';
                    }
                }
                return next;
            });
        } catch {
            // no-op
        }
    }

    async function executeApproved() {
        if (!activeBatchId) return;
        setExecuting(true);
        try {
            const result = await fetchJson(`/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/execute`, {
                method: 'POST',
                headers: csrfHeaders(),
            }) as { success: number; failed: number };
            setExecSummary(result);

            // Reload commands to get updated statuses
            const cmdsData = await fetchJson(`/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/commands`);
            const updated = cmdsData as AiCommand[];
            setCommands(updated);

            // Build exec results from updated status
            const results: Record<number, 'executed' | 'failed'> = {};
            for (const cmd of updated) {
                if (cmd.status === 'executed') results[cmd.id] = 'executed';
                if (cmd.status === 'failed') results[cmd.id] = 'failed';
            }
            setExecResults(results);
        } catch {
            // no-op
        } finally {
            setExecuting(false);
        }
    }

    /* ── Counts ── */
    const approvedCount = commands.filter((c) => c.is_active && (localStatus[c.id] ?? c.status) === 'approved').length;
    const rejectedCount = commands.filter((c) => c.is_active && (localStatus[c.id] ?? c.status) === 'rejected').length;
    const pendingCount = commands.filter((c) => c.is_active && (localStatus[c.id] ?? c.status) === 'pending').length;

    /* ── Render ── */

    return (
        <div className="space-y-8">
            {/* ─── Run pane ─── */}
            <section className="space-y-4">
                <h2 className="text-base font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('ai.workbench.creation.run.heading')}
                </h2>

                <div style={cardStyle} className="space-y-4">
                    {/* Blueprint picker */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium" style={labelStyle}>
                            {t('ai.workbench.creation.run.picker_label')}
                        </label>
                        {summaryLoading ? (
                            <p style={labelStyle}>{t('ai.workbench.creation.run.loading_summary')}</p>
                        ) : (
                            <select
                                value={selectedSlug ?? ''}
                                onChange={(e) => setSelectedSlug(e.target.value || null)}
                                className="w-full text-sm"
                                style={{
                                    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                                    border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
                                    borderRadius: 'var(--theme-radius-button)',
                                    padding: '0.375rem 0.5rem',
                                    color: 'var(--theme-base-content)',
                                }}
                            >
                                <option value="">{t('ai.workbench.creation.run.picker_placeholder')}</option>
                                {summary.map((bp) => (
                                    <option key={bp.slug} value={bp.slug}>
                                        {bp.name} ({bp.pending_count})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Batch size */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium" style={labelStyle}>
                            {t('ai.workbench.creation.run.batch_size_label')}
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={batchSize}
                            onChange={(e) => setBatchSize(Math.max(1, Math.min(50, Number(e.target.value))))}
                            className="w-24 text-sm"
                            style={{
                                background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                                border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
                                borderRadius: 'var(--theme-radius-button)',
                                padding: '0.375rem 0.5rem',
                                color: 'var(--theme-base-content)',
                            }}
                        />
                    </div>

                    {/* Pending count info */}
                    {selectedBp && (
                        <p style={countStyle}>
                            {selectedBp.pending_count === 0
                                ? t('ai.workbench.creation.run.no_pending')
                                : t('ai.workbench.creation.run.pending_count').replace(':count', String(selectedBp.pending_count))}
                        </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            type="button"
                            disabled={!selectedSlug || honeLoading}
                            onClick={() => void openHone()}
                            className="alex-btn px-4 py-2 text-sm inline-flex items-center gap-2"
                            style={!selectedSlug || honeLoading ? { ...secondaryBtn, opacity: 0.5 } : secondaryBtn}
                        >
                            <i className="fa-solid fa-eye text-xs" aria-hidden="true" />
                            {t('ai.workbench.creation.run.preview_button')}
                        </button>
                        <button
                            type="button"
                            disabled={!selectedSlug || !selectedBp || selectedBp.pending_count === 0 || running}
                            onClick={() => setConfirmOpen(true)}
                            className="alex-btn px-4 py-2 text-sm inline-flex items-center gap-2"
                            style={(!selectedSlug || !selectedBp || selectedBp?.pending_count === 0 || running)
                                ? { ...primaryBtn, opacity: 0.5 }
                                : primaryBtn}
                        >
                            <i className="fa-solid fa-wand-magic-sparkles text-xs" aria-hidden="true" />
                            {running ? t('ai.workbench.creation.run.running') : t('ai.workbench.creation.run.run_button')}
                        </button>
                    </div>
                </div>
            </section>

            {/* ─── Review pane ─── */}
            <section className="space-y-4">
                <h2 className="text-base font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('ai.workbench.creation.review.heading')}
                </h2>

                {batches.length === 0 ? (
                    <p style={labelStyle}>{t('ai.workbench.creation.review.no_batches')}</p>
                ) : (
                    <>
                        {/* Batch tabs */}
                        <div className="flex flex-wrap gap-2">
                            {batches.map((b) => (
                                <button
                                    key={b.batchId}
                                    type="button"
                                    onClick={() => setActiveBatchId(b.batchId)}
                                    className="alex-btn px-3 py-1 text-sm"
                                    style={activeBatchId === b.batchId ? primaryBtn : secondaryBtn}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>

                        {activeBatchId && (
                            <>
                                {/* Counts bar + bulk actions */}
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <span style={countStyle}>
                                        {t('ai.workbench.creation.review.counts')
                                            .replace(':approved', String(approvedCount))
                                            .replace(':rejected', String(rejectedCount))
                                            .replace(':pending', String(pendingCount))}
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => void bulkApproveAll()}
                                            className="alex-btn px-3 py-1 text-sm"
                                            style={secondaryBtn}
                                        >
                                            {t('ai.workbench.creation.review.approve_all')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void bulkRejectAll()}
                                            className="alex-btn px-3 py-1 text-sm"
                                            style={secondaryBtn}
                                        >
                                            {t('ai.workbench.creation.review.reject_all')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={executing || approvedCount === 0}
                                            onClick={() => void executeApproved()}
                                            className="alex-btn px-3 py-1 text-sm inline-flex items-center gap-1.5"
                                            style={executing || approvedCount === 0 ? { ...primaryBtn, opacity: 0.5 } : primaryBtn}
                                        >
                                            <i className="fa-solid fa-bolt text-xs" aria-hidden="true" />
                                            {executing ? t('ai.workbench.creation.review.executing') : t('ai.workbench.creation.review.execute_button')}
                                        </button>
                                    </div>
                                </div>

                                {/* Execute results */}
                                {execSummary && (
                                    <p style={{ color: 'var(--theme-status-success-stroke, #22c55e)', fontSize: '0.8125rem' }}>
                                        {t('ai.workbench.creation.review.execute_results')
                                            .replace(':success', String(execSummary.success))
                                            .replace(':failed', String(execSummary.failed))}
                                    </p>
                                )}

                                {/* Note group cards */}
                                <div className="space-y-3">
                                    {commandsLoading && (
                                        <p style={labelStyle}>{t('ai.workbench.creation.review.loading')}</p>
                                    )}
                                    {!commandsLoading && noteGroups.length === 0 && (
                                        <p style={labelStyle}>{t('ai.workbench.creation.review.empty')}</p>
                                    )}
                                    {!commandsLoading && noteGroups.map((group, idx) => (
                                        <NoteGroupCard
                                            key={group.noteId}
                                            group={group}
                                            isCursor={idx === cursorIdx}
                                            localStatus={localStatus}
                                            execResults={execResults}
                                            onClick={() => setCursorIdx(idx)}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </section>

            {/* ─── Modals ─── */}
            <HoneModal
                open={honeOpen}
                data={honeData}
                loading={honeLoading}
                projectSlug={projectSlug}
                onClose={() => setHoneOpen(false)}
                t={t}
            />
            <ConfirmRunDialog
                open={confirmOpen}
                blueprintName={selectedBp?.name ?? ''}
                pendingCount={selectedBp?.pending_count ?? 0}
                onConfirm={() => void doRun()}
                onCancel={() => setConfirmOpen(false)}
                t={t}
            />
        </div>
    );
}
