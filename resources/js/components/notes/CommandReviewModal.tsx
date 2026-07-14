/* ── CommandReviewModal ── */

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import DedupModal from './modals/DedupModal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT, { type Translator } from '@alexandria/hooks/useT';

/* ── Types ── */

export interface AiCommand {
    id: number;
    batch_id: string;
    action_type: string;
    payload: Record<string, unknown>;
    context: Record<string, unknown> | null;
    reasoning: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
    failure_reason: string | null;
    order_index: number;
}

interface CommandReviewModalProps {
    open: boolean;
    onClose: () => void;
    batchId: string;
    projectId: number;
    onExecuted: () => void;
    onStatusChange?: () => void;
}

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const subtleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' };

const sectionBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};
const sectionBorderTopStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
};

const cardHiddenOverflow: CSSProperties = { ...cardStyle, overflow: 'hidden' };

const cardSectionHeaderStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const rowDivider: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

// Soft primary tint + normal text color: --theme-brand-primary-content is
// calibrated for SOLID primary fills — over a translucent tint it goes
// dark-on-dark on dark presets (owner report, 2026-07-13 screenshot).
const reasoningCalloutStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-card)',
};

const failureAlertStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-status-error-stroke) 40%, transparent)',
    background: 'color-mix(in srgb, var(--theme-status-error-fill) 25%, transparent)',
    color: 'var(--theme-status-error-content)',
    borderRadius: 'var(--theme-radius-card)',
};

const collapseStyle: CSSProperties = { ...cardHiddenOverflow };

const refPickerButtonStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
};

const refPickerCurrentStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-input)',
};

const refPickerResultActiveStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.625rem',
};

const headerIconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)',
    color: 'var(--theme-brand-secondary-500)',
    borderRadius: '9999px',
};

const neutralBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

const STATUS_TOKEN: Record<string, { fill: string; content: string }> = {
    pending: { fill: 'var(--theme-status-warning-fill)', content: 'var(--theme-status-warning-content)' },
    approved: { fill: 'var(--theme-status-success-fill)', content: 'var(--theme-status-success-content)' },
    rejected: { fill: 'var(--theme-status-error-fill)', content: 'var(--theme-status-error-content)' },
    executed: { fill: 'var(--theme-brand-secondary-500)', content: 'var(--theme-brand-secondary-content)' },
    failed: { fill: 'var(--theme-status-error-fill)', content: 'var(--theme-status-error-content)' },
};

function statusBadgeStyle(status: string): CSSProperties {
    const token = STATUS_TOKEN[status];
    if (!token) return neutralBadgeStyle;
    return {
        background: token.fill,
        color: token.content,
        borderRadius: 'var(--theme-radius-badge)',
    };
}

const btnSm: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    gap: '0.25rem',
};
const btnXs: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    gap: '0.25rem',
};
const btnXsSquare: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem',
    width: '1.5rem',
    height: '1.5rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
};
const btnSuccessFill: CSSProperties = {
    background: 'var(--theme-status-success-fill)',
    color: 'var(--theme-status-success-content)',
};
const btnDangerOutline: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-status-error-stroke)',
    border: '1px solid color-mix(in srgb, var(--theme-status-error-stroke) 50%, transparent)',
};
const btnWarningOutline: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-status-warning-stroke)',
    border: '1px solid color-mix(in srgb, var(--theme-status-warning-stroke) 50%, transparent)',
};

/* ── Helpers ── */

/**
 * Build a lookup of temp_id → entry name from all commands in a batch.
 * Used to resolve "Unknown Target" when a command references a temp_id
 * from another command in the same batch.
 */
function buildTempIdMap(commands: AiCommand[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const cmd of commands) {
        const p = cmd.payload;
        const tempId = p.temp_id as string | undefined;
        const attrs = p.attributes as Record<string, unknown> | undefined;
        const name = attrs?.name ?? p.name;
        if (tempId && typeof name === 'string') {
            map[tempId] = name;
        }
    }
    return map;
}

/**
 * Resolve a value that might be a temp_id to a display name.
 */
function resolveTempId(value: unknown, tempIdMap: Record<string, string>): string | null {
    if (typeof value === 'string' && tempIdMap[value]) {
        return tempIdMap[value];
    }
    if (typeof value === 'number' && tempIdMap[String(value)]) {
        return tempIdMap[String(value)];
    }
    return null;
}

function commandSubtitle(cmd: AiCommand, tempIdMap: Record<string, string>): string | null {
    const p = cmd.payload;
    const attrs = p.attributes as Record<string, unknown> | undefined;

    if (attrs?.name && typeof attrs.name === 'string') return attrs.name;
    if (p.name && typeof p.name === 'string') return p.name;

    // Relationships: resolve temp IDs to names
    if (cmd.action_type === 'create_relationship') {
        const parentName = resolveTempId(p.parent_entry_temp_id ?? p.parent_entry_id, tempIdMap) ?? p.parent_label ?? '?';
        const childName = resolveTempId(p.child_entry_temp_id ?? p.child_entry_id, tempIdMap) ?? p.child_label ?? '?';
        const parentLabel = p.parent_label ? ` (${p.parent_label})` : '';
        const childLabel = p.child_label ? ` (${p.child_label})` : '';
        return `${parentName}${parentLabel} ↔ ${childName}${childLabel}`;
    }

    // Transfer/copy note: resolve target
    if ((cmd.action_type === 'transfer_note' || cmd.action_type === 'copy_note') && p.target_model_id) {
        const targetName = resolveTempId(p.target_model_id, tempIdMap);
        if (targetName) return `→ ${targetName}`;
    }

    if (p.source_label && p.target_label) return `${p.source_label} → ${p.target_label}`;
    if (p.parent_label && p.child_label) return `${p.parent_label} ↔ ${p.child_label}`;
    if (p.entry_name && typeof p.entry_name === 'string') return p.entry_name;
    if (p.field_name && typeof p.field_name === 'string') return String(p.field_name);

    return null;
}

function formatActionType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusLabel(t: Translator, status: string): string {
    const key = `notes.command_review.status.${status}`;
    const fallback = status.charAt(0).toUpperCase() + status.slice(1);
    return t(key, fallback);
}

/* ── Component ── */

export default function CommandReviewModal({
    open,
    onClose,
    batchId,
    projectId,
    onExecuted,
    onStatusChange,
}: CommandReviewModalProps) {
    const t = useT();
    const [commands, setCommands] = useState<AiCommand[]>([]);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [detailIndex, setDetailIndex] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [showDedup, setShowDedup] = useState(false);

    const showDetail = detailIndex !== null;
    const activeCommand = showDetail ? commands[detailIndex] ?? null : null;
    const [entryNames, setEntryNames] = useState<Record<number, string>>({});
    const tempIdMap = useMemo(() => {
        const map = buildTempIdMap(commands);
        // Merge in resolved entry names for numeric IDs
        for (const [id, name] of Object.entries(entryNames)) {
            map[id] = name;
        }
        return map;
    }, [commands, entryNames]);

    /* ── Fetch commands ── */
    const fetchCommands = useCallback(async () => {
        setLoading(true);
        const res = await fetch(
            `/api/v1/projects/${projectId}/ai/batches/${batchId}/commands`,
            { headers: csrfHeaders() },
        ).catch(() => null);
        if (!res?.ok) {
            setLoading(false);
            return;
        }
        const data = await res.json();
        const cmds: AiCommand[] = Array.isArray(data.data) ? data.data : data;
        setCommands(cmds);

        // Collect ALL numeric IDs from payloads and attributes to resolve names
        const entryIds = new Set<number>();
        for (const cmd of cmds) {
            const p = cmd.payload as Record<string, unknown>;
            // Top-level payload IDs
            for (const val of Object.values(p)) {
                if (typeof val === 'number') entryIds.add(val);
                // String values that look like numeric IDs (e.g., location_type: "170")
                if (typeof val === 'string' && /^\d+$/.test(val)) entryIds.add(parseInt(val));
            }
            // Attribute and metadata IDs
            for (const nested of [p.attributes, p.metadata]) {
                if (nested && typeof nested === 'object') {
                    for (const val of Object.values(nested as Record<string, unknown>)) {
                        if (typeof val === 'number') entryIds.add(val);
                        if (typeof val === 'string' && /^\d+$/.test(val)) entryIds.add(parseInt(val));
                    }
                }
            }
        }
        if (entryIds.size > 0) {
            const nameRes = await fetch(
                `/api/v1/projects/${projectId}/entries/names?ids=${Array.from(entryIds).join(',')}`,
                { headers: csrfHeaders() },
            ).catch(() => null);
            if (nameRes?.ok) {
                setEntryNames(await nameRes.json());
            }
        }
        setLoading(false);
    }, [projectId, batchId]);

    useEffect(() => {
        if (open) {
            setCommands([]);
            setEntryNames({});
            setDetailIndex(null);
            void fetchCommands();
        }
    }, [open, fetchCommands]);

    /* ── Actions ── */
    const updateCommand = async (id: number, body: Record<string, unknown>) => {
        const res = await fetch(`/api/v1/projects/${projectId}/ai/commands/${id}`, {
            method: 'PUT',
            headers: csrfHeaders(),
            body: JSON.stringify(body),
        }).catch(() => null);
        if (!res?.ok) return;
        const updated = await res.json();
        const data = updated.data ?? updated;
        setCommands((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...data } : c)),
        );
        // Refresh note data so footer reflects updated command count
        if (body.status) {
            onStatusChange?.();
        }
    };

    const setStatus = (id: number, status: 'approved' | 'rejected') =>
        updateCommand(id, { status });

    const approveAll = async () => {
        const res = await fetch(
            `/api/v1/projects/${projectId}/ai/batches/${batchId}/approve-all`,
            { method: 'POST', headers: csrfHeaders() },
        ).catch(() => null);
        if (!res?.ok) return;
        setCommands((prev) =>
            prev.map((c) =>
                c.status === 'pending' ? { ...c, status: 'approved' } : c,
            ),
        );
    };

    const rejectAll = async () => {
        const res = await fetch(
            `/api/v1/projects/${projectId}/ai/batches/${batchId}/reject-all`,
            { method: 'POST', headers: csrfHeaders() },
        ).catch(() => null);
        if (!res?.ok) return;
        onExecuted();
        onClose();
    };

    const executeBatch = async () => {
        setExecuting(true);
        const res = await fetch(
            `/api/v1/projects/${projectId}/ai/batches/${batchId}/execute`,
            { method: 'POST', headers: csrfHeaders() },
        ).catch(() => null);
        setExecuting(false);
        if (!res?.ok) return;
        onExecuted();
        onClose();
    };

    const savePayloadField = (cmdId: number, key: string, value: unknown) => {
        const cmd = commands.find((c) => c.id === cmdId);
        if (!cmd) return;
        const newPayload = { ...cmd.payload, [key]: value };
        void updateCommand(cmdId, { payload: newPayload });
        setEditingField(null);
    };

    /* ── Counts ── */
    const approvedCount = commands.filter((c) => c.status === 'approved').length;
    const pendingCount = commands.filter((c) => c.status === 'pending').length;

    return (
        <>
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="overflow-hidden">
                {/* Sliding container */}
                <div
                    className="flex w-[200%] transition-transform duration-200 ease-out"
                    style={{
                        transform: showDetail ? 'translateX(-50%)' : 'translateX(0)',
                    }}
                >
                    {/* ── Panel 1: Command List ── */}
                    <div className="w-1/2 min-w-[50%] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4" style={sectionBorderStyle}>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold">{t('notes.command_review.title')}</h3>
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold" style={neutralBadgeStyle}>
                                    {commands.length}
                                </span>
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

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[60vh]">
                            {loading && (
                                <div className="flex justify-center py-8">
                                    <i
                                        className="fa-solid fa-circle-notch fa-spin text-base"
                                        style={microText}
                                        aria-hidden="true"
                                    />
                                </div>
                            )}

                            {!loading && commands.length === 0 && (
                                <p className="py-8 text-center text-sm" style={labelText}>
                                    {t('notes.command_review.empty')}
                                </p>
                            )}

                            <div className="flex flex-col gap-2">
                                {commands.map((cmd, idx) => (
                                    <div key={cmd.id} className="p-3" style={cardStyle}>
                                        {/* Title row with action buttons */}
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-sm font-medium truncate">
                                                {formatActionType(cmd.action_type)}
                                                {cmd.status !== 'pending' && (
                                                    <span
                                                        className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold"
                                                        style={statusBadgeStyle(cmd.status)}
                                                    >
                                                        {statusLabel(t, cmd.status)}
                                                    </span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {cmd.status === 'pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="alex-btn"
                                                            style={{ ...btnXsSquare, ...btnSuccessFill }}
                                                            onClick={() => setStatus(cmd.id, 'approved')}
                                                            title={t('notes.command_review.aria.approve')}
                                                            aria-label={t('notes.command_review.aria.approve')}
                                                        >
                                                            <i className="fa-solid fa-check text-[10px]" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="alex-btn"
                                                            style={{ ...btnXsSquare, ...btnDangerOutline }}
                                                            onClick={() => setStatus(cmd.id, 'rejected')}
                                                            title={t('notes.command_review.aria.reject')}
                                                            aria-label={t('notes.command_review.aria.reject')}
                                                        >
                                                            <i className="fa-solid fa-xmark text-[10px]" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    type="button"
                                                    className="alex-btn alex-btn--ghost"
                                                    style={btnXsSquare}
                                                    onClick={() => setDetailIndex(idx)}
                                                    title={t('notes.command_review.aria.view_details')}
                                                    aria-label={t('notes.command_review.aria.view_details')}
                                                >
                                                    <i className="fa-solid fa-arrow-right text-[10px]" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Subtitle + reasoning */}
                                        {commandSubtitle(cmd, tempIdMap) && (
                                            <p className="text-xs font-medium truncate" style={bodyText}>
                                                {commandSubtitle(cmd, tempIdMap)}
                                            </p>
                                        )}
                                        {cmd.reasoning && (
                                            <p className="text-xs line-clamp-2 mt-0.5" style={labelText}>
                                                {cmd.reasoning}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-3" style={sectionBorderTopStyle}>
                            <span className="text-xs" style={subtleText}>
                                {t('notes.command_review.counts')
                                    .replace(':approved', String(approvedCount))
                                    .replace(':pending', String(pendingCount))}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="alex-btn inline-flex items-center"
                                    style={{ ...btnSm, ...btnWarningOutline }}
                                    onClick={() => setShowDedup(true)}
                                >
                                    <i className="fa-solid fa-code-merge text-[10px]" aria-hidden="true" />
                                    {t('notes.command_review.check_duplicates')}
                                </button>
                                {pendingCount > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            className="alex-btn inline-flex items-center"
                                            style={{ ...btnSm, ...btnDangerOutline }}
                                            onClick={rejectAll}
                                        >
                                            {t('notes.command_review.reject_all')}
                                        </button>
                                        <button
                                            type="button"
                                            className="alex-btn alex-btn--outline inline-flex items-center"
                                            style={btnSm}
                                            onClick={approveAll}
                                        >
                                            {t('notes.command_review.approve_all')}
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    className="alex-btn inline-flex items-center"
                                    style={{ ...btnSm, ...btnSuccessFill, opacity: approvedCount === 0 || executing ? 0.5 : 1 }}
                                    disabled={approvedCount === 0 || executing}
                                    onClick={executeBatch}
                                >
                                    {executing ? (
                                        <i className="fa-solid fa-circle-notch fa-spin text-xs" aria-hidden="true" />
                                    ) : (
                                        <>
                                            {t('notes.command_review.execute')}
                                            <i className="fa-solid fa-play text-[10px]" aria-hidden="true" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Panel 2: Command Detail ── */}
                    <div className="w-1/2 min-w-[50%] flex flex-col">
                        {activeCommand ? (
                            <>
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4" style={sectionBorderStyle}>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            className="alex-notes-modal-icon-btn"
                                            onClick={() => setDetailIndex(null)}
                                            aria-label={t('notes.command_review.back_to_list')}
                                        >
                                            <i className="fa-solid fa-arrow-left" />
                                        </button>
                                        <div>
                                            <h3 className="text-sm font-bold">
                                                {formatActionType(activeCommand.action_type)}
                                            </h3>
                                            <span className="text-xs" style={labelText}>
                                                {t('notes.command_review.position')
                                                    .replace(':current', String((detailIndex ?? 0) + 1))
                                                    .replace(':total', String(commands.length))}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {activeCommand.status === 'pending' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="alex-btn inline-flex items-center"
                                                    style={{ ...btnXs, ...btnSuccessFill }}
                                                    onClick={() => setStatus(activeCommand.id, 'approved')}
                                                >
                                                    <i className="fa-solid fa-check text-[10px]" aria-hidden="true" />
                                                    {t('notes.command_review.action.approve')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="alex-btn inline-flex items-center"
                                                    style={{ ...btnXs, ...btnDangerOutline }}
                                                    onClick={() => setStatus(activeCommand.id, 'rejected')}
                                                >
                                                    <i className="fa-solid fa-xmark text-[10px]" aria-hidden="true" />
                                                    {t('notes.command_review.action.reject')}
                                                </button>
                                            </>
                                        ) : (
                                            <span
                                                className="px-2 py-0.5 text-[11px] font-semibold"
                                                style={statusBadgeStyle(activeCommand.status)}
                                            >
                                                {statusLabel(t, activeCommand.status)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[60vh] space-y-4">
                                    {/* Reasoning */}
                                    {activeCommand.reasoning && (
                                        <div className="p-3" style={reasoningCalloutStyle}>
                                            <p className="text-xs font-semibold mb-1">
                                                {t('notes.command_review.ai_reasoning')}
                                            </p>
                                            <p className="text-sm leading-relaxed">
                                                {activeCommand.reasoning}
                                            </p>
                                        </div>
                                    )}

                                    {/* Failure reason */}
                                    {activeCommand.failure_reason ? (
                                        <div
                                            className="flex items-center gap-2 px-3 py-2 text-sm"
                                            style={failureAlertStyle}
                                        >
                                            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                                            <span>{String(activeCommand.failure_reason)}</span>
                                        </div>
                                    ) : null}

                                    {/* Payload fields */}
                                    <PayloadFieldList
                                        command={activeCommand}
                                        tempIdMap={tempIdMap}
                                        editingField={editingField}
                                        onEdit={setEditingField}
                                        onSave={(key, val) => savePayloadField(activeCommand.id, key, val)}
                                        projectId={projectId}
                                        onNameResolved={(id, name) => setEntryNames((prev) => ({ ...prev, [id]: name }))}
                                        t={t}
                                    />

                                    {/* Raw JSON */}
                                    <details style={collapseStyle}>
                                        <summary
                                            className="cursor-pointer text-xs font-semibold py-3 px-4 flex items-center justify-between"
                                            style={cardSectionHeaderStyle}
                                        >
                                            <span>{t('notes.command_review.raw_payload')}</span>
                                            <i className="fa-solid fa-chevron-down text-[10px]" aria-hidden="true" />
                                        </summary>
                                        <div className="px-4 py-3">
                                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
                                                {JSON.stringify(activeCommand.payload, null, 2)}
                                            </pre>
                                        </div>
                                    </details>
                                </div>

                                {/* Footer: prev/next */}
                                <div className="flex items-center justify-between px-6 py-3" style={sectionBorderTopStyle}>
                                    <button
                                        type="button"
                                        className="alex-btn alex-btn--ghost inline-flex items-center"
                                        style={{ ...btnSm, opacity: detailIndex === 0 ? 0.5 : 1 }}
                                        disabled={detailIndex === 0}
                                        onClick={() => setDetailIndex((detailIndex ?? 1) - 1)}
                                    >
                                        <i className="fa-solid fa-arrow-left text-xs" aria-hidden="true" />
                                        {t('notes.command_review.previous')}
                                    </button>
                                    <button
                                        type="button"
                                        className="alex-btn alex-btn--ghost inline-flex items-center"
                                        style={{ ...btnSm, opacity: detailIndex === commands.length - 1 ? 0.5 : 1 }}
                                        disabled={detailIndex === commands.length - 1}
                                        onClick={() => setDetailIndex((detailIndex ?? 0) + 1)}
                                    >
                                        {t('notes.command_review.next')}
                                        <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center py-16">
                                <button
                                    type="button"
                                    className="alex-btn alex-btn--ghost inline-flex items-center"
                                    style={btnSm}
                                    onClick={() => setDetailIndex(null)}
                                >
                                    <i className="fa-solid fa-arrow-left text-xs" aria-hidden="true" />
                                    {t('notes.command_review.back_to_list')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>

        {showDedup && commands.length > 0 && (
            <DedupModal
                open={showDedup}
                onClose={() => setShowDedup(false)}
                projectId={projectId}
                blueprintSlug={String(commands[0]?.context?.blueprint_slug ?? '')}
                onApplied={() => void fetchCommands()}
            />
        )}
        </>
    );
}

/* ── Shared key/value row list (used by Attributes + Metadata cards) ── */

function KeyValueRows({ entries, tempIdMap, t }: {
    entries: Record<string, string | number | boolean>;
    tempIdMap: Record<string, string>;
    t: Translator;
}) {
    const rows = Object.entries(entries);
    return (
        <>
            {rows.map(([key, val], i) => {
                const resolved = typeof val === 'string' ? tempIdMap[val]
                    : typeof val === 'number' ? tempIdMap[String(val)] : null;
                return (
                    <div
                        key={key}
                        className="flex items-center justify-between px-3 py-2"
                        style={i === rows.length - 1 ? undefined : rowDivider}
                    >
                        <span className="text-xs" style={labelText}>{formatFieldLabel(t, key)}</span>
                        <span className="text-xs font-medium">
                            {resolved ?? String(val)}
                        </span>
                    </div>
                );
            })}
        </>
    );
}

/* ── Payload Field List (typed to avoid unknown-in-JSX) ── */

function formatFieldLabel(t: Translator, key: string): string {
    const aliasKey = `notes.command_review.field_alias.${key}`;
    const aliased = t(aliasKey, '');
    if (aliased) return aliased;
    return key
        .replace(/_id$/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PayloadFieldList({ command, tempIdMap, editingField, onEdit, onSave, projectId, onNameResolved, t }: {
    command: AiCommand;
    tempIdMap: Record<string, string>;
    editingField: string | null;
    onEdit: (field: string | null) => void;
    onSave: (key: string, value: unknown) => void;
    onNameResolved: (id: number, name: string) => void;
    projectId: number;
    t: Translator;
}) {
    const payload = command.payload as Record<string, unknown>;
    const attributes = payload.attributes as Record<string, string | number | boolean> | undefined;
    const metadata = payload.metadata as Record<string, string | number | boolean> | undefined;
    const aiNotes = payload.ai_notes as Record<string, unknown> | undefined;

    const isRelationship = command.action_type === 'create_relationship';

    // Fields to skip in generic rendering (handled specially for relationships)
    const relationshipFields = new Set([
        'parent_entry_id', 'parent_entry_temp_id', 'child_entry_id', 'child_entry_temp_id',
        'parent_label', 'child_label', 'relationship_type',
    ]);

    const resolveVal = (val: unknown): string | null => {
        if (typeof val === 'string') return tempIdMap[val] ?? null;
        if (typeof val === 'number') return tempIdMap[String(val)] ?? null;
        return null;
    };

    return (
        <div className="flex flex-col gap-2">
            {/* Relationship-specific layout */}
            {isRelationship && (
                <>
                    {/* Relationship Type — top */}
                    <div className="px-3 py-2" style={cardStyle}>
                        <label className="text-xs font-medium" style={labelText}>
                            {t('notes.command_review.relationship_type')}
                        </label>
                        <p className="text-sm">{String(payload.relationship_type ?? '-')}</p>
                    </div>

                    {/* Parent + Child side by side */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="px-3 py-2" style={cardStyle}>
                            <label className="text-xs font-medium" style={labelText}>
                                {t('notes.command_review.parent_entry')}
                            </label>
                            <p className="text-sm font-medium">
                                {resolveVal(payload.parent_entry_temp_id ?? payload.parent_entry_id)
                                    ?? String(payload.parent_entry_temp_id ?? payload.parent_entry_id ?? '-')}
                            </p>
                            {payload.parent_label ? (
                                <p className="text-xs mt-0.5" style={labelText}>
                                    {t('notes.command_review.label_prefix').replace(':label', String(payload.parent_label))}
                                </p>
                            ) : null}
                        </div>
                        <div className="px-3 py-2" style={cardStyle}>
                            <label className="text-xs font-medium" style={labelText}>
                                {t('notes.command_review.child_entry')}
                            </label>
                            <p className="text-sm font-medium">
                                {resolveVal(payload.child_entry_temp_id ?? payload.child_entry_id)
                                    ?? String(payload.child_entry_temp_id ?? payload.child_entry_id ?? '-')}
                            </p>
                            {payload.child_label ? (
                                <p className="text-xs mt-0.5" style={labelText}>
                                    {t('notes.command_review.label_prefix').replace(':label', String(payload.child_label))}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </>
            )}

            {/* Generic fields (skip relationship-specific ones if already rendered) */}
            {Object.entries(payload)
                .filter(([key]) => key !== 'attributes' && key !== 'metadata' && key !== 'ai_notes' && !(isRelationship && relationshipFields.has(key)))
                .map(([key, rawVal]) => {
                    const strVal = String(rawVal ?? '-');
                    const isObj = rawVal !== null && typeof rawVal === 'object';
                    const resolved = resolveVal(rawVal);

                    return (
                        <div key={key} className="px-3 py-2" style={cardStyle}>
                            <label className="flex items-center gap-2 text-xs font-medium" style={labelText}>
                                {formatFieldLabel(t, key)}
                                {resolved && (
                                    <span
                                        className="px-1.5 py-0.5 text-[10px] font-normal"
                                        style={neutralBadgeStyle}
                                    >
                                        {resolved}
                                    </span>
                                )}
                            </label>
                            <p className={`text-sm ${isObj ? 'font-mono text-xs whitespace-pre-wrap' : ''}`}>
                                {isObj ? JSON.stringify(rawVal, null, 2) : (resolved ?? strVal)}
                            </p>
                        </div>
                    );
                })}

            {/* Attributes card */}
            {attributes && (
                <div style={cardHiddenOverflow}>
                    <div className="flex items-center justify-between px-3 py-2" style={cardSectionHeaderStyle}>
                        <span className="text-xs font-semibold">{t('notes.command_review.attributes')}</span>
                        <button
                            type="button"
                            className="alex-btn alex-btn--ghost inline-flex items-center"
                            style={btnXs}
                            onClick={() => onEdit('attributes')}
                        >
                            <i className="fa-solid fa-pencil text-[10px]" aria-hidden="true" />
                            {t('notes.command_review.edit')}
                        </button>
                    </div>
                    <div>
                        <KeyValueRows entries={attributes} tempIdMap={tempIdMap} t={t} />
                    </div>
                </div>
            )}

            {/* Metadata card */}
            {metadata && (
                <div style={cardHiddenOverflow}>
                    <div className="px-3 py-2" style={cardSectionHeaderStyle}>
                        <span className="text-xs font-semibold">{t('notes.command_review.metadata')}</span>
                    </div>
                    <div>
                        <KeyValueRows entries={metadata} tempIdMap={tempIdMap} t={t} />
                    </div>
                </div>
            )}

            {/* AI Notes collapsible */}
            {aiNotes && (
                <details style={collapseStyle}>
                    <summary
                        className="cursor-pointer text-xs font-semibold py-3 px-4 flex items-center justify-between"
                        style={cardSectionHeaderStyle}
                    >
                        <span>{t('notes.command_review.ai_notes')}</span>
                        <i className="fa-solid fa-chevron-down text-[10px]" aria-hidden="true" />
                    </summary>
                    <div className="px-4 py-3">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(aiNotes, null, 2)}
                        </pre>
                    </div>
                </details>
            )}

            {/* Attribute Editor Modal */}
            {attributes && (
                <AttributeEditorModal
                    open={editingField === 'attributes'}
                    onClose={() => onEdit(null)}
                    attributes={attributes}
                    tempIdMap={tempIdMap}
                    projectId={projectId}
                    onNameResolved={onNameResolved}
                    onSave={(updated) => {
                        onSave('attributes', updated);
                        onEdit(null);
                    }}
                    t={t}
                />
            )}
        </div>
    );
}

/* ── Attribute Editor Modal ── */

function AttributeEditorModal({ open, onClose, attributes, tempIdMap, projectId, onSave, onNameResolved, t }: {
    open: boolean;
    onClose: () => void;
    attributes: Record<string, string | number | boolean>;
    tempIdMap: Record<string, string>;
    projectId: number;
    onSave: (updated: Record<string, string | number | boolean>) => void;
    onNameResolved: (id: number, name: string) => void;
    t: Translator;
}) {
    const [values, setValues] = useState<Record<string, string | number | boolean>>({});

    useEffect(() => {
        if (open) setValues({ ...attributes });
    }, [open, attributes]);

    const NATIVE_FIELDS = new Set(['blueprint_id', 'name', 'summary', 'content', 'parent_id', 'sort_order', 'priority', 'slug']);

    const updateValue = (key: string, val: string | number | boolean) => {
        setValues((prev) => {
            const next = { ...prev, [key]: val };
            if (key === 'blueprint_id' && val !== prev.blueprint_id) {
                for (const k of Object.keys(next)) {
                    if (!NATIVE_FIELDS.has(k)) {
                        delete next[k];
                    }
                }
            }
            return next;
        });
    };

    // Determine if a field is a reference (ID that resolves to a name)
    const isReferenceField = (key: string, val: string | number | boolean): boolean => {
        if (typeof val === 'boolean') return false;
        const strVal = String(val);
        if (tempIdMap[strVal]) return true;
        return (key.endsWith('_id') || key.endsWith('_type')) && /^\d+$/.test(strVal);
    };

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center" style={headerIconWrapStyle}>
                        <i className="fa-solid fa-pencil text-sm" />
                    </div>
                    <h3 className="font-bold">{t('notes.command_review.attr_editor.title')}</h3>
                </div>

                <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                    {Object.entries(values).map(([key, val]) => {
                        const resolved = typeof val === 'string' ? tempIdMap[val]
                            : typeof val === 'number' ? tempIdMap[String(val)] : null;

                        return (
                            <div key={key}>
                                <label className="mb-1 block text-xs font-medium" style={subtleText}>
                                    {formatFieldLabel(t, key)}
                                </label>
                                {typeof val === 'boolean' ? (
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={val}
                                            onChange={(e) => updateValue(key, e.target.checked)}
                                            className="alex-toggle"
                                        />
                                        <span className="text-xs" style={labelText}>
                                            {val
                                                ? t('notes.command_review.attr_editor.bool_yes')
                                                : t('notes.command_review.attr_editor.bool_no')}
                                        </span>
                                    </label>
                                ) : isReferenceField(key, val) ? (
                                    <ReferenceFieldPicker
                                        fieldKey={key}
                                        value={val as string | number}
                                        resolvedName={resolved}
                                        projectId={projectId}
                                        blueprintId={typeof values.blueprint_id === 'number' ? values.blueprint_id : undefined}
                                        onChange={(v) => updateValue(key, v)}
                                        onNameResolved={onNameResolved}
                                        t={t}
                                    />
                                ) : typeof val === 'string' && val.length > 80 ? (
                                    <textarea
                                        value={val}
                                        onChange={(e) => updateValue(key, e.target.value)}
                                        className="w-full text-sm"
                                        style={{ ...inputStyle, resize: 'vertical' }}
                                        rows={3}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={String(val)}
                                        onChange={(e) => updateValue(key, e.target.value)}
                                        className="w-full text-sm"
                                        style={inputStyle}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        className="alex-btn alex-btn--ghost"
                        style={btnSm}
                        onClick={onClose}
                    >
                        {t('notes.command_review.attr_editor.cancel')}
                    </button>
                    <button
                        type="button"
                        className="alex-btn alex-btn--primary"
                        style={btnSm}
                        onClick={() => onSave(values)}
                    >
                        {t('notes.command_review.attr_editor.save')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ── Reference Field Picker ── */

function ReferenceFieldPicker({ fieldKey, value, resolvedName, projectId, blueprintId, onChange, onNameResolved, t }: {
    fieldKey: string;
    value: string | number;
    resolvedName: string | null;
    projectId: number;
    blueprintId?: number;
    onChange: (val: string | number) => void;
    onNameResolved?: (id: number, name: string) => void;
    t: Translator;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Array<{ id: number; name: string }>>([]);
    const [searching, setSearching] = useState(false);
    const [localName, setLocalName] = useState<string | null>(null);
    const displayName = localName ?? resolvedName;

    const fetchResults = useCallback(async (query: string) => {
        setSearching(true);
        const params = new URLSearchParams({ field: fieldKey });
        if (query.trim()) params.set('q', query);
        if (blueprintId) params.set('blueprint_id', String(blueprintId));
        const res = await fetch(
            `/api/v1/projects/${projectId}/entries/search?${params}`,
            { headers: csrfHeaders() },
        ).catch(() => null);
        setSearching(false);
        if (res?.ok) setResults(await res.json());
    }, [projectId, fieldKey, blueprintId]);

    useEffect(() => {
        if (!pickerOpen) return;
        // Load immediately on open, debounce on subsequent searches
        if (search === '') {
            void fetchResults('');
        } else {
            const timer = setTimeout(() => void fetchResults(search), 250);
            return () => clearTimeout(timer);
        }
    }, [search, pickerOpen, fetchResults]);

    const selectItem = (item: { id: number; name: string }) => {
        onChange(item.id);
        setLocalName(item.name);
        onNameResolved?.(item.id, item.name);
        setPickerOpen(false);
        setSearch('');
        setResults([]);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs"
                style={refPickerButtonStyle}
            >
                <span style={displayName ? undefined : labelText}>
                    {displayName ?? t('notes.command_review.ref_picker.id_prefix').replace(':id', String(value))}
                </span>
                <i className="fa-solid fa-magnifying-glass text-[10px]" style={microText} aria-hidden="true" />
            </button>

            <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} maxWidth="max-w-sm">
                <div className="p-4">
                    <h4 className="mb-3 text-sm font-semibold">{formatFieldLabel(t, fieldKey)}</h4>
                    <input
                        type="text"
                        className="mb-3 w-full text-sm"
                        style={inputStyle}
                        placeholder={t('notes.command_review.ref_picker.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />

                    <div className="max-h-[40vh] space-y-1 overflow-y-auto">
                        {/* Current value */}
                        {displayName && (
                            <div
                                className="flex items-center justify-between px-3 py-2 text-xs"
                                style={refPickerCurrentStyle}
                            >
                                <span className="font-medium">{displayName}</span>
                                <span
                                    className="px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={statusBadgeStyle('approved')}
                                >
                                    {t('notes.command_review.ref_picker.current_badge')}
                                </span>
                            </div>
                        )}

                        {/* Search results */}
                        {searching && (
                            <div className="py-4 text-center">
                                <i className="fa-solid fa-circle-notch fa-spin text-xs" style={microText} aria-hidden="true" />
                            </div>
                        )}
                        {!searching && results.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => selectItem(item)}
                                className="alex-notes-tag-row flex w-full items-center justify-between px-3 py-2 text-left text-xs"
                                style={item.id === Number(value) ? refPickerResultActiveStyle : undefined}
                            >
                                <span>{item.name}</span>
                                <span style={microText}>#{item.id}</span>
                            </button>
                        ))}
                        {!searching && search && results.length === 0 && (
                            <p className="py-4 text-center text-xs" style={fadedText}>
                                {t('notes.command_review.ref_picker.no_results')}
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
}
