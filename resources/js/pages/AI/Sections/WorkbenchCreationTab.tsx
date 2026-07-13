import { useState, useEffect, type CSSProperties } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { fetchJson } from '@alexandria/lib/fetchJson';
import useT from '@alexandria/hooks/useT';
import HoneDrawer from './HoneDrawer';
import WorkbenchKeyLegend from './WorkbenchKeyLegend';
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

const railHeadingStyle: CSSProperties = {
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

function badge(color: string): CSSProperties {
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

const railRowStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
};

const railRowSelectedStyle: CSSProperties = {
    ...railRowStyle,
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    boxShadow: 'inset 3px 0 0 var(--theme-brand-primary-500)',
};

const actionBarStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
};

const paneBorderColor = 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)';

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
    localStatus: Record<number, 'approved' | 'rejected' | undefined>;
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
                                        <span style={{ ...badge(statusColor(status)), fontSize: '0.6875rem' }}>
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

    /* ── Hone drawer state ── */
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
    const [localStatus, setLocalStatus] = useState<Record<number, 'approved' | 'rejected' | undefined>>({});
    const [cursorIdx, setCursorIdx] = useState(0);
    const [executing, setExecuting] = useState(false);
    const [execResults, setExecResults] = useState<Record<number, 'executed' | 'failed'>>({});
    const [execSummary, setExecSummary] = useState<{ success: number; failed: number } | null>(null);

    const selectedBp = summary.find((b) => b.slug === selectedSlug) ?? null;

    /* ── Load summary on mount ── */
    useEffect(() => {
        setSummaryLoading(true);
        fetchJson(`/ai/${projectSlug}/workbench/l2-summary`)
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
        const notesUrl = `/ai/${projectSlug}/workbench/l2-batch/${activeBatchId}/notes`;

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

    /* ── Verdict actions — shared by keyboard + clickable legend ── */
    function approveCursorGroup() {
        if (!cursorGroup) return;
        void approveGroup(cursorGroup).then(() => {
            setCursorIdx((i) => Math.min(i + 1, noteGroups.length - 1));
        });
    }

    function rejectCursorGroup() {
        if (!cursorGroup) return;
        void rejectGroup(cursorGroup).then(() => {
            setCursorIdx((i) => Math.min(i + 1, noteGroups.length - 1));
        });
    }

    /* ── Keyboard handler ── */
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
            if (honeOpen || confirmOpen) return;
            if (!cursorGroup) return;

            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                approveCursorGroup();
            } else if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                rejectCursorGroup();
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
            const data = await fetchJson(`/ai/${projectSlug}/workbench/l2-preview-prompt`, {
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
            const data = await fetchJson(`/ai/${projectSlug}/workbench/l2-run-batch`, {
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
                fetchJson(`/ai/${projectSlug}/workbench/l2-summary`)
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
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
            {/* ─── Rail: blueprint picker + batch controls + batch list ─── */}
            <div
                className="flex max-h-[45vh] min-h-0 shrink-0 flex-col lg:max-h-none lg:w-[360px] lg:border-r"
                style={{ borderColor: paneBorderColor }}
            >
                <div className="shrink-0 space-y-3 border-b p-3" style={{ borderColor: paneBorderColor }}>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                        {t('ai.workbench.creation.run.heading')}
                    </h2>

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
                    <div className="flex items-end justify-between gap-3">
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
                                className="w-20 text-sm"
                                style={{
                                    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                                    border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
                                    borderRadius: 'var(--theme-radius-button)',
                                    padding: '0.375rem 0.5rem',
                                    color: 'var(--theme-base-content)',
                                }}
                            />
                        </div>
                        {selectedBp && (
                            <p className="flex-1 text-right" style={countStyle}>
                                {selectedBp.pending_count === 0
                                    ? t('ai.workbench.creation.run.no_pending')
                                    : t('ai.workbench.creation.run.pending_count').replace(':count', String(selectedBp.pending_count))}
                            </p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            disabled={!selectedSlug || honeLoading}
                            onClick={() => void openHone()}
                            className="alex-btn px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                            style={!selectedSlug || honeLoading ? { ...secondaryBtn, opacity: 0.5 } : secondaryBtn}
                        >
                            <i className="fa-solid fa-eye text-xs" aria-hidden="true" />
                            {t('ai.workbench.creation.run.preview_button')}
                        </button>
                        <button
                            type="button"
                            disabled={!selectedSlug || !selectedBp || selectedBp.pending_count === 0 || running}
                            onClick={() => setConfirmOpen(true)}
                            className="alex-btn px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                            style={(!selectedSlug || !selectedBp || selectedBp?.pending_count === 0 || running)
                                ? { ...primaryBtn, opacity: 0.5 }
                                : primaryBtn}
                        >
                            <i className="fa-solid fa-wand-magic-sparkles text-xs" aria-hidden="true" />
                            {running ? t('ai.workbench.creation.run.running') : t('ai.workbench.creation.run.run_button')}
                        </button>
                    </div>
                </div>

                {/* Batch tabs list */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="px-3 pt-2">
                        <span style={railHeadingStyle}>{t('ai.workbench.creation.review.batches_heading')}</span>
                    </div>
                    {batches.length === 0 ? (
                        <p className="px-3 py-2" style={labelStyle}>{t('ai.workbench.creation.review.no_batches')}</p>
                    ) : (
                        batches.map((b) => (
                            <button
                                key={b.batchId}
                                type="button"
                                onClick={() => setActiveBatchId(b.batchId)}
                                data-selected={activeBatchId === b.batchId}
                                className="alex-row block w-full truncate px-3 py-2 text-left text-sm"
                                style={activeBatchId === b.batchId ? railRowSelectedStyle : railRowStyle}
                            >
                                {b.label}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ─── Review pane ─── */}
            <div className="flex min-h-0 flex-1 flex-col">
                {!activeBatchId ? (
                    <div className="flex flex-1 items-center justify-center p-6 text-center">
                        <p style={labelStyle}>
                            {batches.length === 0
                                ? t('ai.workbench.creation.review.no_batches')
                                : t('ai.workbench.creation.review.select_batch')}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                            {execSummary && (
                                <p style={{ color: 'var(--theme-status-success-stroke, #22c55e)', fontSize: '0.8125rem' }}>
                                    {t('ai.workbench.creation.review.execute_results')
                                        .replace(':success', String(execSummary.success))
                                        .replace(':failed', String(execSummary.failed))}
                                </p>
                            )}
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

                        {/* Slim sticky action bar — counts, keyboard legend, bulk + execute */}
                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-2.5" style={actionBarStyle}>
                            <span style={countStyle}>
                                {t('ai.workbench.creation.review.counts')
                                    .replace(':approved', String(approvedCount))
                                    .replace(':rejected', String(rejectedCount))
                                    .replace(':pending', String(pendingCount))}
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                                {noteGroups.length > 0 && (
                                    <WorkbenchKeyLegend
                                        pairs={[
                                            { key: 'A', label: t('ai.workbench.creation.review.key_a'), onPress: approveCursorGroup },
                                            { key: 'G', label: t('ai.workbench.creation.review.key_g'), onPress: rejectCursorGroup },
                                        ]}
                                    />
                                )}
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
                        </div>
                    </>
                )}
            </div>

            {/* ─── Overlays ─── */}
            <HoneDrawer
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
