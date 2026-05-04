/* ── CommandReviewModal ── */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import DedupModal from './modals/DedupModal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

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

/* ── Helpers ── */

const STATUS_BADGES: Record<string, string> = {
    approved: 'badge-success',
    rejected: 'badge-error',
    executed: 'badge-accent',
    failed: 'badge-error',
};

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

/* ── Component ── */

export default function CommandReviewModal({
    open,
    onClose,
    batchId,
    projectId,
    onExecuted,
    onStatusChange,
}: CommandReviewModalProps) {
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
        try {
            const res = await fetch(
                `/api/v1/projects/${projectId}/ai/batches/${batchId}/commands`,
                { headers: csrfHeaders() },
            );
            if (res.ok) {
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
                    );
                    if (nameRes.ok) {
                        setEntryNames(await nameRes.json());
                    }
                }
            }
        } finally {
            setLoading(false);
        }
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
        });
        if (res.ok) {
            const updated = await res.json();
            const data = updated.data ?? updated;
            setCommands((prev) =>
                prev.map((c) => (c.id === id ? { ...c, ...data } : c)),
            );
            // Refresh note data so footer reflects updated command count
            if (body.status) {
                onStatusChange?.();
            }
        }
    };

    const setStatus = (id: number, status: 'approved' | 'rejected') =>
        updateCommand(id, { status });

    const approveAll = async () => {
        const res = await fetch(
            `/api/v1/projects/${projectId}/ai/batches/${batchId}/approve-all`,
            { method: 'POST', headers: csrfHeaders() },
        );
        if (res.ok) {
            setCommands((prev) =>
                prev.map((c) =>
                    c.status === 'pending' ? { ...c, status: 'approved' } : c,
                ),
            );
        }
    };

    const rejectAll = async () => {
        const res = await fetch(
            `/api/v1/projects/${projectId}/ai/batches/${batchId}/reject-all`,
            { method: 'POST', headers: csrfHeaders() },
        );
        if (res.ok) {
            onExecuted(); // refresh note list / footer state
            onClose();
        }
    };

    const executeBatch = async () => {
        setExecuting(true);
        try {
            const res = await fetch(
                `/api/v1/projects/${projectId}/ai/batches/${batchId}/execute`,
                { method: 'POST', headers: csrfHeaders() },
            );
            if (res.ok) {
                onExecuted();
                onClose();
            }
        } finally {
            setExecuting(false);
        }
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
                        <div className="flex items-center justify-between border-b border-base-content/10 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold">Review Commands</h3>
                                <span className="badge badge-sm badge-neutral">
                                    {commands.length}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="btn btn-ghost btn-sm btn-circle"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[60vh]">
                            {loading && (
                                <div className="flex justify-center py-8">
                                    <span className="loading loading-spinner loading-md" />
                                </div>
                            )}

                            {!loading && commands.length === 0 && (
                                <p className="py-8 text-center text-sm opacity-50">
                                    No commands found.
                                </p>
                            )}

                            <div className="flex flex-col gap-2">
                                {commands.map((cmd, idx) => (
                                    <div
                                        key={cmd.id}
                                        className="rounded-xl border border-base-content/10 bg-base-100 p-3"
                                    >
                                            {/* Title row with action buttons */}
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-sm font-medium truncate">
                                                {formatActionType(cmd.action_type)}
                                                {cmd.status !== 'pending' && (
                                                    <span className={`badge badge-xs ml-2 py-1.5 ${STATUS_BADGES[cmd.status] ?? ''}`}>
                                                        {cmd.status.charAt(0).toUpperCase() + cmd.status.slice(1)}
                                                    </span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {cmd.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="btn btn-success btn-xs btn-square"
                                                            onClick={() => setStatus(cmd.id, 'approved')}
                                                            title="Approve"
                                                        >
                                                            <i className="fa-solid fa-check text-[10px]" />
                                                        </button>
                                                        <button
                                                            className="btn btn-outline btn-error btn-xs btn-square"
                                                            onClick={() => setStatus(cmd.id, 'rejected')}
                                                            title="Reject"
                                                        >
                                                            <i className="fa-solid fa-xmark text-[10px]" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="btn btn-ghost btn-xs btn-square"
                                                    onClick={() => setDetailIndex(idx)}
                                                    title="View details"
                                                >
                                                    <i className="fa-solid fa-arrow-right text-[10px]" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Subtitle + reasoning */}
                                        {commandSubtitle(cmd, tempIdMap) && (
                                            <p className="text-xs font-medium text-base-content/70 truncate">
                                                {commandSubtitle(cmd, tempIdMap)}
                                            </p>
                                        )}
                                        {cmd.reasoning && (
                                            <p className="text-xs opacity-50 line-clamp-2 mt-0.5">
                                                {cmd.reasoning}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-base-content/10 px-6 py-3">
                            <span className="text-xs opacity-60">
                                {approvedCount} approved / {pendingCount} pending
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-warning btn-outline btn-sm gap-1"
                                    onClick={() => setShowDedup(true)}
                                >
                                    <i className="fa-solid fa-code-merge text-[10px]" /> Check Duplicates
                                </button>
                                {pendingCount > 0 && (
                                    <>
                                        <button
                                            className="btn btn-outline btn-error btn-sm"
                                            onClick={rejectAll}
                                        >
                                            Reject All
                                        </button>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={approveAll}
                                        >
                                            Approve All
                                        </button>
                                    </>
                                )}
                                <button
                                    className="btn btn-success btn-sm"
                                    disabled={approvedCount === 0 || executing}
                                    onClick={executeBatch}
                                >
                                    {executing ? (
                                        <span className="loading loading-spinner loading-xs" />
                                    ) : (
                                        <>Execute <i className="fa-solid fa-play text-[10px]" /></>
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
                                <div className="flex items-center justify-between border-b border-base-content/10 px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            className="btn btn-ghost btn-sm btn-circle"
                                            onClick={() => setDetailIndex(null)}
                                        >
                                            <i className="fa-solid fa-arrow-left" />
                                        </button>
                                        <div>
                                            <h3 className="text-sm font-bold">
                                                {formatActionType(activeCommand.action_type)}
                                            </h3>
                                            <span className="text-xs opacity-50">
                                                {(detailIndex ?? 0) + 1} of {commands.length}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {activeCommand.status === 'pending' ? (
                                            <>
                                                <button
                                                    className="btn btn-success btn-xs"
                                                    onClick={() =>
                                                        setStatus(activeCommand.id, 'approved')
                                                    }
                                                >
                                                    <i className="fa-solid fa-check text-[10px]" />{' '}
                                                    Approve
                                                </button>
                                                <button
                                                    className="btn btn-outline btn-error btn-xs"
                                                    onClick={() =>
                                                        setStatus(activeCommand.id, 'rejected')
                                                    }
                                                >
                                                    <i className="fa-solid fa-xmark text-[10px]" />{' '}
                                                    Reject
                                                </button>
                                            </>
                                        ) : (
                                            <span
                                                className={`badge badge-sm py-1.5 ${STATUS_BADGES[activeCommand.status] ?? 'badge-neutral'}`}
                                            >
                                                {activeCommand.status.charAt(0).toUpperCase() + activeCommand.status.slice(1)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[60vh] space-y-4">
                                    {/* Reasoning */}
                                    {activeCommand.reasoning && (
                                        <div className="rounded-lg border border-primary bg-primary/30 p-3">
                                            <p className="text-xs font-semibold text-primary mb-1">
                                                AI Reasoning
                                            </p>
                                            <p className="text-sm leading-relaxed text-primary">
                                                {activeCommand.reasoning}
                                            </p>
                                        </div>
                                    )}

                                    {/* Failure reason */}
                                    {activeCommand.failure_reason ? (
                                        <div className="alert alert-error text-sm">
                                            <i className="fa-solid fa-circle-exclamation" />
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
                                    />

                                    {/* Raw JSON */}
                                    <details className="collapse collapse-arrow bg-base-100 border border-base-content/10 rounded-lg">
                                        <summary className="collapse-title text-xs font-semibold !min-h-0 !py-3 !px-4 !pr-10">
                                            Raw JSON Payload
                                        </summary>
                                        <div className="collapse-content">
                                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
                                                {JSON.stringify(
                                                    activeCommand.payload,
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        </div>
                                    </details>
                                </div>

                                {/* Footer: prev/next */}
                                <div className="flex items-center justify-between border-t border-base-content/10 px-6 py-3">
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        disabled={detailIndex === 0}
                                        onClick={() =>
                                            setDetailIndex((detailIndex ?? 1) - 1)
                                        }
                                    >
                                        <i className="fa-solid fa-arrow-left text-xs" /> Previous
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        disabled={
                                            detailIndex === commands.length - 1
                                        }
                                        onClick={() =>
                                            setDetailIndex((detailIndex ?? 0) + 1)
                                        }
                                    >
                                        Next <i className="fa-solid fa-arrow-right text-xs" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center py-16">
                                <button className="btn btn-ghost btn-sm" onClick={() => setDetailIndex(null)}>
                                    <i className="fa-solid fa-arrow-left text-xs" /> Back to list
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

/* ── Payload Field List (typed to avoid unknown-in-JSX) ── */

function formatFieldLabel(key: string): string {
    const aliases: Record<string, string> = {
        target_model_id: 'Target Entry',
        target_model_class: 'Target Entry Type',
    };
    if (aliases[key]) return aliases[key];
    return key
        .replace(/_id$/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PayloadFieldList({ command, tempIdMap, editingField, onEdit, onSave, projectId, onNameResolved }: {
    command: AiCommand;
    tempIdMap: Record<string, string>;
    editingField: string | null;
    onEdit: (field: string | null) => void;
    onSave: (key: string, value: unknown) => void;
    onNameResolved: (id: number, name: string) => void;
    projectId: number;
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
                    <div className="rounded-lg bg-base-100 border border-base-content/10 px-3 py-2">
                        <label className="text-xs font-medium opacity-50">Relationship Type</label>
                        <p className="text-sm">{String(payload.relationship_type ?? '-')}</p>
                    </div>

                    {/* Parent + Child side by side */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-base-100 border border-base-content/10 px-3 py-2">
                            <label className="text-xs font-medium opacity-50">Parent Entry</label>
                            <p className="text-sm font-medium">
                                {resolveVal(payload.parent_entry_temp_id ?? payload.parent_entry_id)
                                    ?? String(payload.parent_entry_temp_id ?? payload.parent_entry_id ?? '-')}
                            </p>
                            {payload.parent_label ? (
                                <p className="text-xs text-base-content/50 mt-0.5">
                                    Label: {String(payload.parent_label)}
                                </p>
                            ) : null}
                        </div>
                        <div className="rounded-lg bg-base-100 border border-base-content/10 px-3 py-2">
                            <label className="text-xs font-medium opacity-50">Child Entry</label>
                            <p className="text-sm font-medium">
                                {resolveVal(payload.child_entry_temp_id ?? payload.child_entry_id)
                                    ?? String(payload.child_entry_temp_id ?? payload.child_entry_id ?? '-')}
                            </p>
                            {payload.child_label ? (
                                <p className="text-xs text-base-content/50 mt-0.5">
                                    Label: {String(payload.child_label)}
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
                        <div key={key} className="rounded-lg bg-base-100 border border-base-content/10 px-3 py-2">
                            <label className="flex items-center gap-2 text-xs font-medium opacity-50">
                                {formatFieldLabel(key)}
                                {resolved && (
                                    <span className="badge badge-neutral badge-xs border-0 py-1 font-normal opacity-100">{resolved}</span>
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
                <div className="rounded-lg border border-base-content/10 bg-base-100 overflow-hidden">
                    <div className="flex items-center justify-between bg-base-200/50 px-3 py-2">
                        <span className="text-xs font-semibold opacity-60">Attributes</span>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => onEdit('attributes')}>
                            <i className="fa-solid fa-pencil text-[10px]" /> Edit
                        </button>
                    </div>
                    <div className="divide-y divide-base-200/50">
                        {Object.entries(attributes).map(([key, val]) => {
                            const resolved = typeof val === 'string' ? tempIdMap[val]
                                : typeof val === 'number' ? tempIdMap[String(val)] : null;
                            return (
                                <div key={key} className="flex items-center justify-between px-3 py-2">
                                    <span className="text-xs text-base-content/50">{formatFieldLabel(key)}</span>
                                    <span className="text-xs font-medium">
                                        {resolved ?? String(val)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Metadata card */}
            {metadata && (
                <div className="rounded-lg border border-base-content/10 bg-base-100 overflow-hidden">
                    <div className="bg-base-200/50 px-3 py-2">
                        <span className="text-xs font-semibold opacity-60">Metadata</span>
                    </div>
                    <div className="divide-y divide-base-200/50">
                        {Object.entries(metadata).map(([key, val]) => {
                            const resolved = typeof val === 'string' ? tempIdMap[val]
                                : typeof val === 'number' ? tempIdMap[String(val)] : null;
                            return (
                                <div key={key} className="flex items-center justify-between px-3 py-2">
                                    <span className="text-xs text-base-content/50">{formatFieldLabel(key)}</span>
                                    <span className="text-xs font-medium">
                                        {resolved ?? String(val)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* AI Notes collapsible */}
            {aiNotes && (
                <details className="collapse collapse-arrow bg-base-100 border border-base-content/10 rounded-lg">
                    <summary className="collapse-title text-xs font-semibold !min-h-0 !py-3 !px-4 !pr-10">AI Notes</summary>
                    <div className="collapse-content">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(aiNotes, null, 2)}</pre>
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
                />
            )}
        </div>
    );
}

/* ── Attribute Editor Modal ── */

function AttributeEditorModal({ open, onClose, attributes, tempIdMap, projectId, onSave, onNameResolved }: {
    open: boolean;
    onClose: () => void;
    attributes: Record<string, string | number | boolean>;
    tempIdMap: Record<string, string>;
    projectId: number;
    onSave: (updated: Record<string, string | number | boolean>) => void;
    onNameResolved: (id: number, name: string) => void;
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
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20">
                        <i className="fa-solid fa-pencil text-sm text-secondary" />
                    </div>
                    <h3 className="font-bold">Edit Attributes</h3>
                </div>

                <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                    {Object.entries(values).map(([key, val]) => {
                        const resolved = typeof val === 'string' ? tempIdMap[val]
                            : typeof val === 'number' ? tempIdMap[String(val)] : null;

                        return (
                            <div key={key}>
                                <label className="mb-1 block text-xs font-medium text-base-content/60">
                                    {formatFieldLabel(key)}
                                </label>
                                {typeof val === 'boolean' ? (
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={val}
                                            onChange={(e) => updateValue(key, e.target.checked)}
                                            className="toggle toggle-primary toggle-sm"
                                        />
                                        <span className="text-xs text-base-content/50">{val ? 'Yes' : 'No'}</span>
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
                                    />
                                ) : typeof val === 'string' && val.length > 80 ? (
                                    <textarea
                                        value={val}
                                        onChange={(e) => updateValue(key, e.target.value)}
                                        className="textarea textarea-bordered textarea-sm w-full rounded-lg"
                                        rows={3}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={String(val)}
                                        onChange={(e) => updateValue(key, e.target.value)}
                                        className="input input-bordered input-sm w-full rounded-lg"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => onSave(values)}>Save Changes</button>
                </div>
            </div>
        </Modal>
    );
}

/* ── Reference Field Picker ── */

function ReferenceFieldPicker({ fieldKey, value, resolvedName, projectId, blueprintId, onChange, onNameResolved }: {
    fieldKey: string;
    value: string | number;
    resolvedName: string | null;
    projectId: number;
    blueprintId?: number;
    onChange: (val: string | number) => void;
    onNameResolved?: (id: number, name: string) => void;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Array<{ id: number; name: string }>>([]);
    const [searching, setSearching] = useState(false);
    const [localName, setLocalName] = useState<string | null>(null);
    const displayName = localName ?? resolvedName;

    const fetchResults = useCallback(async (query: string) => {
        setSearching(true);
        try {
            const params = new URLSearchParams({ field: fieldKey });
            if (query.trim()) params.set('q', query);
            if (blueprintId) params.set('blueprint_id', String(blueprintId));
            const res = await fetch(
                `/api/v1/projects/${projectId}/entries/search?${params}`,
                { headers: csrfHeaders() },
            );
            if (res.ok) setResults(await res.json());
        } finally {
            setSearching(false);
        }
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
                className="flex w-full items-center justify-between rounded-lg border border-base-content/10 bg-base-200/30 px-3 py-2 text-left text-xs transition-colors hover:border-primary/30"
            >
                <span className={displayName ? 'text-base-content' : 'text-base-content/40'}>
                    {displayName ?? `ID: ${value}`}
                </span>
                <i className="fa-solid fa-magnifying-glass text-[10px] text-base-content/30" />
            </button>

            <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} maxWidth="max-w-sm">
                <div className="p-4">
                    <h4 className="mb-3 text-sm font-semibold">{formatFieldLabel(fieldKey)}</h4>
                    <input
                        type="text"
                        className="input input-bordered input-sm mb-3 w-full"
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />

                    <div className="max-h-[40vh] space-y-1 overflow-y-auto">
                        {/* Current value */}
                        {displayName && (
                            <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-xs">
                                <span className="font-medium">{displayName}</span>
                                <span className="badge badge-xs badge-primary py-1.5">Current</span>
                            </div>
                        )}

                        {/* Search results */}
                        {searching && (
                            <div className="py-4 text-center">
                                <span className="loading loading-spinner loading-xs" />
                            </div>
                        )}
                        {!searching && results.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => selectItem(item)}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-base-200 ${
                                    item.id === Number(value) ? 'bg-primary/10' : ''
                                }`}
                            >
                                <span>{item.name}</span>
                                <span className="text-base-content/30">#{item.id}</span>
                            </button>
                        ))}
                        {!searching && search && results.length === 0 && (
                            <p className="py-4 text-center text-xs text-base-content/40">No results</p>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
}
