import { useState, useEffect, useRef, type CSSProperties } from "react";
import { usePage } from "@inertiajs/react";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import { fetchJson } from "@alexandria/lib/fetchJson";
import useT from "@alexandria/hooks/useT";
import { useToastContext } from "@alexandria/components/ui/ToastProvider";
import HoneDrawer from "./HoneDrawer";
import Input from "@alexandria/components/form/Input";
import Select from "@alexandria/components/form/Select";
import WorkbenchKeyLegend from "./WorkbenchKeyLegend";
import WorkbenchPendingNotesPicker from "./WorkbenchPendingNotesPicker";
import { readWorkbenchState, writeWorkbenchState } from "../workbenchState";
import type { SharedProps } from "@alexandria/types/index";
import type {
    L2BlueprintSummary,
    L2BatchCompletedEvent,
    L2BatchListItem,
    L2PendingNote,
    L2PreviewResult,
    L2RunBatchResponse,
    AiCommand,
    NoteGroup,
} from "@alexandria/types/workbench";

/* ── Props ── */

interface WorkbenchCreationTabProps {
    projectSlug: string;
    projectId: number;
}

/* ── Theme styles (matching WorkbenchRoutingTab conventions) ── */

const labelStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 55%, transparent)",
    fontSize: "0.75rem",
};

const descStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 65%, transparent)",
    fontSize: "0.8125rem",
    lineHeight: "1.4",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
};

const countStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    fontSize: "0.75rem",
};

const reviewCardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-content) 3%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    transition: "border-color 0.1s",
};

const reviewCardActiveStyle: CSSProperties = {
    ...reviewCardStyle,
    border: "2px solid var(--theme-brand-primary-500)",
};

const chipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.125rem 0.5rem",
    borderRadius: "var(--theme-radius-badge)",
    fontSize: "0.6875rem",
    fontWeight: 600,
    background:
        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "var(--theme-base-content)",
};

function badge(color: string): CSSProperties {
    return {
        display: "inline-flex",
        alignItems: "center",
        padding: "0.125rem 0.5rem",
        borderRadius: "var(--theme-radius-badge)",
        fontSize: "0.6875rem",
        fontWeight: 600,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
    };
}

const primaryBtn: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
};

const secondaryBtn: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-button)",
};

const railRowStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)",
};

const railRowSelectedStyle: CSSProperties = {
    ...railRowStyle,
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
    boxShadow: "inset 3px 0 0 var(--theme-brand-primary-500)",
};

const actionBarStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-content) 3%, transparent)",
};

const paneBorderColor =
    "color-mix(in srgb, var(--theme-base-content) 10%, transparent)";

/* ── Confirm run dialog ── */

function ConfirmRunDialog({
    open,
    blueprintName,
    pendingCount,
    selectedCount,
    onConfirm,
    onCancel,
    t,
}: {
    open: boolean;
    blueprintName: string;
    pendingCount: number;
    selectedCount: number;
    onConfirm: () => void;
    onCancel: () => void;
    t: (k: string) => string;
}) {
    if (!open) return null;
    const bodyKey =
        selectedCount > 0
            ? "ai.workbench.creation.run.confirm_body_selected"
            : "ai.workbench.creation.run.confirm_body";
    const bodyCount = selectedCount > 0 ? selectedCount : pendingCount;
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 60,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div
                style={{
                    background: "var(--theme-base-100)",
                    borderRadius: "var(--theme-radius-card)",
                    padding: "1.5rem",
                    maxWidth: "28rem",
                    width: "100%",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                <h2
                    className="font-semibold text-base"
                    style={{ color: "var(--theme-base-content)" }}
                >
                    {t("ai.workbench.creation.run.confirm_title")}
                </h2>
                <p style={descStyle}>
                    {t(bodyKey)
                        .replace(":count", String(bodyCount))
                        .replace(":blueprint", blueprintName)}
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="alex-btn px-3 py-1.5 text-sm"
                        onClick={onCancel}
                        style={secondaryBtn}
                    >
                        {t("ai.workbench.creation.run.confirm_cancel")}
                    </button>
                    <button
                        type="button"
                        className="alex-btn px-3 py-1.5 text-sm"
                        onClick={onConfirm}
                        style={primaryBtn}
                    >
                        {t("ai.workbench.creation.run.confirm_ok")}
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
        if (cmd.action_type === "create_entry") {
            const attrs = payload.attributes as
                Record<string, unknown> | undefined;
            return attrs?.name
                ? `"${String(attrs.name)}"`
                : payload.temp_id
                  ? String(payload.temp_id)
                  : "new entry";
        }
        if (cmd.action_type === "create_relationship") {
            return `${String(payload.relationship_type ?? payload.relationship_name ?? "rel")}`;
        }
        if (
            cmd.action_type === "copy_note" ||
            cmd.action_type === "transfer_note"
        ) {
            return `→ entry #${String(payload.target_model_id ?? "?")}`;
        }
        return cmd.action_type;
    })();

    const colors: Record<string, string> = {
        create_entry: "var(--theme-status-info-stroke, #3b82f6)",
        create_relationship: "var(--theme-status-success-stroke, #22c55e)",
        copy_note: "var(--theme-status-warning-stroke, #f59e0b)",
        transfer_note: "var(--theme-brand-primary-500)",
    };
    const color = colors[cmd.action_type] ?? "var(--theme-base-content)";

    return (
        <span
            style={{
                ...chipStyle,
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                color,
            }}
        >
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
    localStatus: Record<number, "approved" | "rejected" | undefined>;
    execResults: Record<number, "executed" | "failed">;
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
            approved: "var(--theme-status-info-stroke, #3b82f6)",
            rejected:
                "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
            executed: "var(--theme-status-success-stroke, #22c55e)",
            failed: "var(--theme-status-error-stroke, #ef4444)",
            pending: "var(--theme-status-warning-stroke, #f59e0b)",
        };
        return map[s] ?? "var(--theme-base-content)";
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
                        {t("ai.workbench.creation.review.note_side_label")}
                    </p>
                    <p
                        className="text-sm font-medium"
                        style={{ color: "var(--theme-base-content)" }}
                    >
                        {group.noteTitle || "Untitled"}
                    </p>
                    <div
                        style={{
                            ...descStyle,
                            maxHeight: "7rem",
                            overflowY: "auto",
                        }}
                    >
                        {group.noteText || "(empty)"}
                    </div>
                </div>

                {/* Right: commands */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold" style={labelStyle}>
                            {t(
                                "ai.workbench.creation.review.commands_side_label",
                            )}
                        </p>
                        {isCursor && (
                            <div
                                className="flex items-center gap-1 text-xs"
                                style={labelStyle}
                            >
                                <kbd>A</kbd> <kbd>G</kbd> <kbd>↑↓</kbd>
                            </div>
                        )}
                    </div>
                    {group.activeCommands.length === 0 ? (
                        <p style={labelStyle}>
                            {t(
                                "ai.workbench.creation.review.no_commands_for_note",
                            )}
                        </p>
                    ) : (
                        group.activeCommands.map((cmd) => {
                            const status = getCommandStatus(cmd);
                            return (
                                <div key={cmd.id} className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <CommandChip cmd={cmd} />
                                        <span
                                            style={{
                                                ...badge(statusColor(status)),
                                                fontSize: "0.6875rem",
                                            }}
                                        >
                                            {t(
                                                `ai.workbench.creation.review.${status}_badge`,
                                            )}
                                        </span>
                                    </div>
                                    {cmd.reasoning && (
                                        <p
                                            style={{
                                                ...descStyle,
                                                fontSize: "0.75rem",
                                                paddingLeft: "0.5rem",
                                            }}
                                        >
                                            {cmd.reasoning.length > 120
                                                ? `${cmd.reasoning.slice(0, 120)}…`
                                                : cmd.reasoning}
                                        </p>
                                    )}
                                    {status === "failed" &&
                                        cmd.failure_reason && (
                                            <p
                                                style={{
                                                    color: "var(--theme-status-error-stroke, #ef4444)",
                                                    fontSize: "0.75rem",
                                                    paddingLeft: "0.5rem",
                                                }}
                                            >
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
                <div
                    style={{
                        borderTop:
                            "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                        padding: "0.5rem 0.75rem",
                    }}
                >
                    <button
                        type="button"
                        className="text-xs"
                        style={{
                            color: "var(--theme-status-error-stroke, #ef4444)",
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setMalformedOpen((o) => !o);
                        }}
                    >
                        {t(
                            "ai.workbench.creation.review.malformed_strap",
                        ).replace(
                            ":count",
                            String(group.malformedCommands.length),
                        )}{" "}
                        {malformedOpen ? "▲" : "▼"}
                    </button>
                    {malformedOpen && (
                        <div className="mt-2 space-y-1">
                            {group.malformedCommands.map((cmd) => (
                                <p
                                    key={cmd.id}
                                    style={{
                                        ...descStyle,
                                        fontSize: "0.75rem",
                                    }}
                                >
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

export default function WorkbenchCreationTab({
    projectSlug,
    projectId,
}: WorkbenchCreationTabProps) {
    const t = useT();
    const toast = useToastContext();
    const userId = usePage<SharedProps>().props.auth?.user?.id;

    /* ── Run pane state ── */
    const [summary, setSummary] = useState<L2BlueprintSummary[]>([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [selectedSlug, setSelectedSlugState] = useState<string | null>(
        () => readWorkbenchState(projectSlug).creationSlug ?? null,
    );
    const [batchSize, setBatchSizeState] = useState(
        () => readWorkbenchState(projectSlug).batchSize ?? 25,
    );

    function setSelectedSlug(slug: string | null) {
        setSelectedSlugState(slug);
        writeWorkbenchState(projectSlug, { creationSlug: slug });
    }

    function setBatchSize(size: number) {
        setBatchSizeState(size);
        writeWorkbenchState(projectSlug, { batchSize: size });
    }

    /* ── Relationship vocabulary is optional context. With it off, the prompt
       carries no related-blueprint indexes, no origin-event rule, and no
       create_relationship action — the run does routing and entry creation
       only, and the model sees only what that task needs. ── */
    const [includeRelationships, setIncludeRelationshipsState] = useState(
        () => readWorkbenchState(projectSlug).includeRelationships ?? true,
    );

    function setIncludeRelationships(include: boolean) {
        setIncludeRelationshipsState(include);
        writeWorkbenchState(projectSlug, { includeRelationships: include });
    }

    /* ── Cherry-pick note selection (owner: control the testing environment
       by choosing exact notes instead of always running the whole batch) ── */
    const [pendingNotes, setPendingNotes] = useState<L2PendingNote[]>([]);
    const [pendingNotesLoading, setPendingNotesLoading] = useState(false);
    const [selectedNoteIds, setSelectedNoteIdsState] = useState<Set<number>>(
        () => new Set(readWorkbenchState(projectSlug).selectedNoteIds ?? []),
    );

    function setSelectedNoteIds(
        value: Set<number> | ((prev: Set<number>) => Set<number>),
    ) {
        setSelectedNoteIdsState((prev) => {
            const next = typeof value === "function" ? value(prev) : value;
            writeWorkbenchState(projectSlug, { selectedNoteIds: [...next] });
            return next;
        });
    }

    /* ── Hone drawer state ── */
    const [honeOpen, setHoneOpen] = useState(false);
    const [honeData, setHoneData] = useState<L2PreviewResult | null>(null);
    const [honeLoading, setHoneLoading] = useState(false);

    /* ── Confirm + run state ── */
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [running, setRunning] = useState(false);

    /* ── Review pane state ── */
    const [batches, setBatches] = useState<
        { batchId: string; label: string; pending?: boolean }[]
    >([]);
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const [commands, setCommands] = useState<AiCommand[]>([]);
    const [noteMap, setNoteMap] = useState<
        Record<number, { title: string; text: string }>
    >({});
    const [commandsLoading, setCommandsLoading] = useState(false);
    const [localStatus, setLocalStatus] = useState<
        Record<number, "approved" | "rejected" | undefined>
    >({});
    const [cursorIdx, setCursorIdx] = useState(0);
    const [executing, setExecuting] = useState(false);
    const [execResults, setExecResults] = useState<
        Record<number, "executed" | "failed">
    >({});
    const [execSummary, setExecSummary] = useState<{
        success: number;
        failed: number;
    } | null>(null);

    const selectedBp = summary.find((b) => b.slug === selectedSlug) ?? null;
    const selectedNoteCount = selectedNoteIds.size;

    /* ── Load summary + existing batches on mount (batch tabs used to be
       session-born; the listing rebuilds them after a refresh and shows
       batches kicked off outside this browser) ── */
    useEffect(() => {
        setSummaryLoading(true);
        fetchJson(`/ai/${projectSlug}/workbench/l2-summary`)
            .then((data) =>
                setSummary(
                    (data as { blueprints: L2BlueprintSummary[] }).blueprints,
                ),
            )
            .catch(() => {})
            .finally(() => setSummaryLoading(false));

        fetchJson(`/ai/${projectSlug}/workbench/l2-batches`)
            .then((data) => {
                const items =
                    (data as { batches: L2BatchListItem[] }).batches ?? [];
                // Listing is newest-first; render oldest-first so freshly
                // queued runs appended at the end keep chronological order.
                setBatches(
                    items
                        .slice()
                        .reverse()
                        .map((b) => ({
                            batchId: b.batch_id,
                            label: `${b.blueprint_slug ?? "?"} · ${b.started_at ? new Date(b.started_at).toLocaleTimeString() : ""}`,
                        })),
                );
            })
            .catch(() => {});
    }, [projectSlug]);

    /* ── Load pending notes for the cherry-pick list when the blueprint changes ── */
    useEffect(() => {
        setSelectedNoteIds(new Set());
        if (!selectedSlug) {
            setPendingNotes([]);
            return;
        }
        setPendingNotesLoading(true);
        fetchJson(
            `/ai/${projectSlug}/workbench/l2-pending-notes?blueprint_slug=${encodeURIComponent(selectedSlug)}`,
        )
            .then((data) =>
                setPendingNotes((data as { notes: L2PendingNote[] }).notes),
            )
            .catch(() => setPendingNotes([]))
            .finally(() => setPendingNotesLoading(false));
    }, [projectSlug, selectedSlug]);

    function toggleNoteSelected(id: number) {
        setSelectedNoteIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function toggleSelectAllNotes() {
        setSelectedNoteIds((prev) =>
            prev.size === pendingNotes.length
                ? new Set()
                : new Set(pendingNotes.map((n) => n.id)),
        );
    }

    /* ── Load commands + notes for a batch (effect on tab switch + re-fetch
       when a queued run's completion broadcast lands) ── */
    function loadBatchData(batchId: string) {
        setCommandsLoading(true);
        setLocalStatus({});
        setExecResults({});
        setExecSummary(null);
        setCursorIdx(0);

        const cmdUrl = `/api/v1/projects/${projectId}/ai/batches/${batchId}/commands`;
        const notesUrl = `/ai/${projectSlug}/workbench/l2-batch/${batchId}/notes`;

        Promise.all([fetchJson(cmdUrl), fetchJson(notesUrl)])
            .then(([cmdsData, notesData]) => {
                setCommands(cmdsData as AiCommand[]);
                setNoteMap(
                    (
                        notesData as {
                            notes: Record<
                                number,
                                { id: number; title: string; text: string }
                            >;
                        }
                    ).notes ?? {},
                );
            })
            .catch(() => {})
            .finally(() => setCommandsLoading(false));
    }

    useEffect(() => {
        if (!activeBatchId) return;
        loadBatchData(activeBatchId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeBatchId]);

    /* ── Queued-run completion ──
       l2-run-batch only QUEUES the job (AI latency made the old inline run
       block the request); the outcome arrives as the app's
       `.workbench.l2.completed` broadcast on the user's private channel.
       The listener lives behind a "latest ref" so the subscription is
       stable while the handler always sees fresh state. */
    const activeBatchIdRef = useRef(activeBatchId);
    activeBatchIdRef.current = activeBatchId;

    function handleBatchCompleted(data: L2BatchCompletedEvent) {
        setRunning(false);

        if (data.notes_processed > 0) {
            setBatches((prev) =>
                prev.some((b) => b.batchId === data.batch_id)
                    ? prev.map((b) =>
                          b.batchId === data.batch_id
                              ? { ...b, pending: false }
                              : b,
                      )
                    : // A batch this browser didn't queue (e.g. kicked off from the
                      // CLI) — surface it as a fresh tab.
                      [
                          ...prev,
                          {
                              batchId: data.batch_id,
                              label: `${data.blueprint_slug || data.blueprint_name || "?"} · ${new Date().toLocaleTimeString()}`,
                          },
                      ],
            );
            if (activeBatchIdRef.current === data.batch_id)
                loadBatchData(data.batch_id);

            toast.show(t("ai.workbench.creation.run.toast_done_title"), {
                type: "success",
                description: t("ai.workbench.creation.run.toast_done_desc")
                    .replace(":notes", String(data.notes_processed))
                    .replace(":commands", String(data.commands_created)),
            });

            // Processed notes just left the pending pool — refresh the
            // summary counts + the cherry-pick list.
            setSelectedNoteIds(new Set());
            fetchJson(`/ai/${projectSlug}/workbench/l2-summary`)
                .then((sd) =>
                    setSummary(
                        (sd as { blueprints: L2BlueprintSummary[] }).blueprints,
                    ),
                )
                .catch(() => {});
            if (selectedSlug) {
                fetchJson(
                    `/ai/${projectSlug}/workbench/l2-pending-notes?blueprint_slug=${encodeURIComponent(selectedSlug)}`,
                )
                    .then((nd) =>
                        setPendingNotes(
                            (nd as { notes: L2PendingNote[] }).notes,
                        ),
                    )
                    .catch(() => {});
            }
        } else {
            setBatches((prev) =>
                prev.filter((b) => b.batchId !== data.batch_id),
            );
            if (activeBatchIdRef.current === data.batch_id)
                setActiveBatchId(null);

            toast.show(t("ai.workbench.creation.run.toast_failed_title"), {
                type: "danger",
                description:
                    data.error ??
                    t("ai.workbench.creation.run.toast_failed_fallback"),
            });
        }
    }

    const onBatchCompletedRef = useRef(handleBatchCompleted);
    onBatchCompletedRef.current = handleBatchCompleted;

    useEffect(() => {
        if (!userId || !window.Echo) return;
        const channel = window.Echo.private(`user.${userId}`);
        channel.listen(
            ".workbench.l2.completed",
            (data: L2BatchCompletedEvent) => onBatchCompletedRef.current(data),
        );
        return () => {
            channel.stopListening(".workbench.l2.completed");
        };
    }, [userId]);

    /* ── Polling fallback when Echo is unavailable (e.g. Reverb down):
       watch each pending batch's command count; two consecutive equal
       non-zero reads = the run finished persisting. ── */
    const pollCountsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        const pendingBatches = batches.filter((b) => b.pending);
        if (pendingBatches.length === 0 || window.Echo) return;

        const interval = setInterval(() => {
            for (const b of pendingBatches) {
                fetchJson(
                    `/api/v1/projects/${projectId}/ai/batches/${b.batchId}/commands`,
                )
                    .then((cmdsData) => {
                        const count = (cmdsData as AiCommand[]).length;
                        const last = pollCountsRef.current[b.batchId];
                        pollCountsRef.current[b.batchId] = count;
                        if (count > 0 && count === last) {
                            onBatchCompletedRef.current({
                                batch_id: b.batchId,
                                blueprint_slug: selectedSlug ?? "",
                                blueprint_name: selectedBp?.name ?? "",
                                notes_processed: count,
                                commands_created: count,
                                commands_invalid: 0,
                                error: null,
                            });
                        }
                    })
                    .catch(() => {});
            }
        }, 10_000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batches]);

    /* ── Derived: note groups ── */
    const noteGroups: NoteGroup[] = (() => {
        const groupMap = new Map<number, AiCommand[]>();
        for (const cmd of commands) {
            const noteId =
                (cmd.context?.note_id as number | undefined) ?? -cmd.id;
            if (!groupMap.has(noteId)) groupMap.set(noteId, []);
            groupMap.get(noteId)!.push(cmd);
        }
        return Array.from(groupMap.entries()).map(([noteId, cmds]) => {
            const info = noteMap[noteId];
            return {
                noteId,
                noteTitle: info?.title ?? `Note #${noteId}`,
                noteText: info?.text ?? "",
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
            if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT")
                return;
            if (honeOpen || confirmOpen) return;
            if (!cursorGroup) return;

            if (e.key === "a" || e.key === "A") {
                e.preventDefault();
                approveCursorGroup();
            } else if (e.key === "g" || e.key === "G") {
                e.preventDefault();
                rejectCursorGroup();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursorIdx((i) => Math.min(i + 1, noteGroups.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursorIdx((i) => Math.max(i - 1, 0));
            }
        }

        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursorGroup, noteGroups, honeOpen, confirmOpen]);

    /* ── Actions ── */

    async function openHone() {
        if (!selectedSlug) return;
        setHoneOpen(true);
        setHoneLoading(true);
        setHoneData(null);
        try {
            const noteIds = Array.from(selectedNoteIds);
            const data = await fetchJson(
                `/ai/${projectSlug}/workbench/l2-preview-prompt`,
                {
                    method: "POST",
                    headers: csrfHeaders(),
                    body: JSON.stringify({
                        blueprint_slug: selectedSlug,
                        batch_size: batchSize,
                        include_relationships: includeRelationships,
                        ...(noteIds.length > 0 ? { note_ids: noteIds } : {}),
                    }),
                },
            );
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
            const noteIds = Array.from(selectedNoteIds);
            const data = (await fetchJson(
                `/ai/${projectSlug}/workbench/l2-run-batch`,
                {
                    method: "POST",
                    headers: csrfHeaders(),
                    body: JSON.stringify({
                        blueprint_slug: selectedSlug,
                        batch_size: batchSize,
                        include_relationships: includeRelationships,
                        ...(noteIds.length > 0 ? { note_ids: noteIds } : {}),
                    }),
                },
            )) as L2RunBatchResponse;

            if (data.queued && data.batch_id) {
                // The run is on the queue: show its tab in the pending state
                // and stay `running` (which keeps the Run button disabled so
                // the same still-pending notes can't be queued twice) until
                // the completion broadcast lands.
                const label = `${selectedBp?.name ?? selectedSlug} · ${new Date().toLocaleTimeString()}`;
                setBatches((prev) => [
                    ...prev,
                    { batchId: data.batch_id!, label, pending: true },
                ]);
                setActiveBatchId(data.batch_id);
            } else {
                setRunning(false);
            }
        } catch {
            setRunning(false);
        }
    }

    async function updateCommandStatus(
        commandId: number,
        status: "approved" | "rejected",
    ) {
        try {
            await fetchJson(
                `/api/v1/projects/${projectId}/ai/commands/${commandId}`,
                {
                    method: "PUT",
                    headers: csrfHeaders(),
                    body: JSON.stringify({ status }),
                },
            );
            setLocalStatus((prev) => ({ ...prev, [commandId]: status }));
        } catch {
            // no-op
        }
    }

    async function approveGroup(group: NoteGroup) {
        for (const cmd of group.activeCommands) {
            if ((localStatus[cmd.id] ?? cmd.status) === "pending") {
                await updateCommandStatus(cmd.id, "approved");
            }
        }
    }

    async function rejectGroup(group: NoteGroup) {
        for (const cmd of group.activeCommands) {
            if ((localStatus[cmd.id] ?? cmd.status) === "pending") {
                await updateCommandStatus(cmd.id, "rejected");
            }
        }
    }

    async function bulkApproveAll() {
        if (!activeBatchId) return;
        try {
            await fetchJson(
                `/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/approve-all`,
                {
                    method: "POST",
                    headers: csrfHeaders(),
                },
            );
            setLocalStatus((prev) => {
                const next = { ...prev };
                for (const cmd of commands) {
                    if (
                        cmd.is_active &&
                        (prev[cmd.id] ?? cmd.status) === "pending"
                    ) {
                        next[cmd.id] = "approved";
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
            await fetchJson(
                `/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/reject-all`,
                {
                    method: "POST",
                    headers: csrfHeaders(),
                },
            );
            setLocalStatus((prev) => {
                const next = { ...prev };
                for (const cmd of commands) {
                    if (
                        cmd.is_active &&
                        (prev[cmd.id] ?? cmd.status) === "pending"
                    ) {
                        next[cmd.id] = "rejected";
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
            const result = (await fetchJson(
                `/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/execute`,
                {
                    method: "POST",
                    headers: csrfHeaders(),
                },
            )) as { success: number; failed: number };
            setExecSummary(result);

            // Reload commands to get updated statuses
            const cmdsData = await fetchJson(
                `/api/v1/projects/${projectId}/ai/batches/${activeBatchId}/commands`,
            );
            const updated = cmdsData as AiCommand[];
            setCommands(updated);

            // Build exec results from updated status
            const results: Record<number, "executed" | "failed"> = {};
            for (const cmd of updated) {
                if (cmd.status === "executed") results[cmd.id] = "executed";
                if (cmd.status === "failed") results[cmd.id] = "failed";
            }
            setExecResults(results);
        } catch {
            // no-op
        } finally {
            setExecuting(false);
        }
    }

    /* ── Counts ── */
    const approvedCount = commands.filter(
        (c) => c.is_active && (localStatus[c.id] ?? c.status) === "approved",
    ).length;
    const rejectedCount = commands.filter(
        (c) => c.is_active && (localStatus[c.id] ?? c.status) === "rejected",
    ).length;
    const pendingCount = commands.filter(
        (c) => c.is_active && (localStatus[c.id] ?? c.status) === "pending",
    ).length;

    /* ── Render ── */

    return (
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
            {/* ─── Rail: blueprint picker + batch controls + batch list ─── */}
            <div
                className="flex max-h-[45vh] min-h-0 shrink-0 flex-col lg:max-h-none lg:w-[360px] lg:border-r"
                style={{ borderColor: paneBorderColor }}
            >
                <div
                    className="shrink-0 space-y-3 border-b p-3"
                    style={{ borderColor: paneBorderColor }}
                >
                    <h2
                        className="text-sm font-semibold"
                        style={{ color: "var(--theme-base-content)" }}
                    >
                        {t("ai.workbench.creation.run.heading")}
                    </h2>

                    {/* Blueprint picker — the app's reusable Select (owner: readable
                        options + consistent spacing; native selects pop OS-styled lists). */}
                    {summaryLoading ? (
                        <p style={labelStyle}>
                            {t("ai.workbench.creation.run.loading_summary")}
                        </p>
                    ) : (
                        <Select
                            label={t("ai.workbench.creation.run.picker_label")}
                            name="workbench-blueprint"
                            value={selectedSlug ?? ""}
                            onChange={(e) =>
                                setSelectedSlug(e.target.value || null)
                            }
                            options={[
                                {
                                    value: "",
                                    label: t(
                                        "ai.workbench.creation.run.picker_placeholder",
                                    ),
                                },
                                ...summary.map((bp) => ({
                                    value: bp.slug,
                                    label: `${bp.name} (${bp.pending_count})`,
                                })),
                            ]}
                            size="md"
                        />
                    )}

                    {/* Batch size — de-emphasized/disabled while a cherry-pick
                        selection is active, since the selection then decides
                        exactly which notes run (owner: controlled testing). */}
                    <div className="flex items-end justify-between gap-3">
                        <div
                            className="w-24"
                            style={
                                selectedNoteCount > 0
                                    ? { opacity: 0.5 }
                                    : undefined
                            }
                        >
                            <Input
                                label={t(
                                    "ai.workbench.creation.run.batch_size_label",
                                )}
                                name="workbench-batch-size"
                                type="number"
                                min={1}
                                max={50}
                                value={batchSize}
                                disabled={selectedNoteCount > 0}
                                onChange={(e) =>
                                    setBatchSize(
                                        Math.max(
                                            1,
                                            Math.min(
                                                50,
                                                Number(e.target.value),
                                            ),
                                        ),
                                    )
                                }
                                size="md"
                            />
                        </div>
                        {selectedBp && (
                            <p className="flex-1 text-right" style={countStyle}>
                                {selectedBp.pending_count === 0
                                    ? t("ai.workbench.creation.run.no_pending")
                                    : t(
                                          "ai.workbench.creation.run.pending_count",
                                      ).replace(
                                          ":count",
                                          String(selectedBp.pending_count),
                                      )}
                            </p>
                        )}
                    </div>

                    <div className="flex items-start justify-between gap-3">
                        <label className="flex cursor-pointer items-start gap-2">
                            <input
                                type="checkbox"
                                checked={includeRelationships}
                                onChange={(e) =>
                                    setIncludeRelationships(e.target.checked)
                                }
                                className="alex-toggle mt-0.5"
                            />
                            <span>
                                <span className="block text-sm font-medium">
                                    {t(
                                        "ai.workbench.creation.run.include_relationships_label",
                                    )}
                                </span>
                                <span
                                    className="block text-xs"
                                    style={countStyle}
                                >
                                    {t(
                                        "ai.workbench.creation.run.include_relationships_hint",
                                    )}
                                </span>
                            </span>
                        </label>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            disabled={!selectedSlug || honeLoading}
                            onClick={() => void openHone()}
                            className="alex-btn px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                            style={
                                !selectedSlug || honeLoading
                                    ? { ...secondaryBtn, opacity: 0.5 }
                                    : secondaryBtn
                            }
                        >
                            <i
                                className="fa-solid fa-eye text-xs"
                                aria-hidden="true"
                            />
                            {t("ai.workbench.creation.run.preview_button")}
                        </button>
                        <button
                            type="button"
                            disabled={
                                !selectedSlug ||
                                !selectedBp ||
                                selectedBp.pending_count === 0 ||
                                running
                            }
                            onClick={() => setConfirmOpen(true)}
                            className="alex-btn px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                            style={
                                !selectedSlug ||
                                !selectedBp ||
                                selectedBp?.pending_count === 0 ||
                                running
                                    ? { ...primaryBtn, opacity: 0.5 }
                                    : primaryBtn
                            }
                        >
                            <i
                                className="fa-solid fa-wand-magic-sparkles text-xs"
                                aria-hidden="true"
                            />
                            {running
                                ? t("ai.workbench.creation.run.running")
                                : selectedNoteCount > 0
                                  ? t(
                                        "ai.workbench.creation.run.run_selected",
                                    ).replace(
                                        ":count",
                                        String(selectedNoteCount),
                                    )
                                  : t(
                                        "ai.workbench.creation.run.run_button_sized",
                                    ).replace(":count", String(batchSize))}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Review pane — tab strip: Pick notes + one tab per batch ─── */}
            <div className="flex min-h-0 flex-1 flex-col">
                <div
                    className="flex shrink-0 flex-wrap items-center gap-1 border-b px-3 py-1.5"
                    style={{ borderColor: paneBorderColor }}
                >
                    <button
                        type="button"
                        onClick={() => setActiveBatchId(null)}
                        data-selected={activeBatchId === null}
                        className="alex-btn px-2.5 py-1 text-xs"
                        style={
                            activeBatchId === null
                                ? railRowSelectedStyle
                                : railRowStyle
                        }
                    >
                        {t("ai.workbench.creation.run.pick_tab")}
                    </button>
                    {batches.map((b) => (
                        <button
                            key={b.batchId}
                            type="button"
                            onClick={() => setActiveBatchId(b.batchId)}
                            data-selected={activeBatchId === b.batchId}
                            data-pending={b.pending === true}
                            className="alex-btn max-w-56 truncate px-2.5 py-1 text-xs"
                            style={
                                activeBatchId === b.batchId
                                    ? railRowSelectedStyle
                                    : railRowStyle
                            }
                        >
                            {b.pending && (
                                <i
                                    className="fa-solid fa-spinner fa-spin mr-1.5 text-[10px]"
                                    aria-hidden="true"
                                />
                            )}
                            {b.label}
                        </button>
                    ))}
                </div>
                {!activeBatchId ? (
                    !selectedSlug ? (
                        <div className="flex flex-1 items-center justify-center p-6 text-center">
                            <p style={labelStyle}>
                                {t("ai.workbench.creation.run.pick_hint")}
                            </p>
                        </div>
                    ) : (
                        <WorkbenchPendingNotesPicker
                            notes={pendingNotes}
                            loading={pendingNotesLoading}
                            selectedIds={selectedNoteIds}
                            onToggle={toggleNoteSelected}
                            onToggleAll={toggleSelectAllNotes}
                            t={t}
                        />
                    )
                ) : (
                    <>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                            {execSummary && (
                                <p
                                    style={{
                                        color: "var(--theme-status-success-stroke, #22c55e)",
                                        fontSize: "0.8125rem",
                                    }}
                                >
                                    {t(
                                        "ai.workbench.creation.review.execute_results",
                                    )
                                        .replace(
                                            ":success",
                                            String(execSummary.success),
                                        )
                                        .replace(
                                            ":failed",
                                            String(execSummary.failed),
                                        )}
                                </p>
                            )}
                            {commandsLoading && (
                                <p style={labelStyle}>
                                    {t("ai.workbench.creation.review.loading")}
                                </p>
                            )}
                            {!commandsLoading && noteGroups.length === 0 && (
                                <p style={labelStyle}>
                                    {batches.find(
                                        (b) => b.batchId === activeBatchId,
                                    )?.pending
                                        ? t(
                                              "ai.workbench.creation.run.queued_hint",
                                          )
                                        : t(
                                              "ai.workbench.creation.review.empty",
                                          )}
                                </p>
                            )}
                            {!commandsLoading &&
                                noteGroups.map((group, idx) => (
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
                        <div
                            className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-2.5"
                            style={actionBarStyle}
                        >
                            <span style={countStyle}>
                                {t("ai.workbench.creation.review.counts")
                                    .replace(":approved", String(approvedCount))
                                    .replace(":rejected", String(rejectedCount))
                                    .replace(":pending", String(pendingCount))}
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                                {noteGroups.length > 0 && (
                                    <WorkbenchKeyLegend
                                        pairs={[
                                            {
                                                key: "A",
                                                label: t(
                                                    "ai.workbench.creation.review.key_a",
                                                ),
                                                onPress: approveCursorGroup,
                                            },
                                            {
                                                key: "G",
                                                label: t(
                                                    "ai.workbench.creation.review.key_g",
                                                ),
                                                onPress: rejectCursorGroup,
                                            },
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
                                        {t(
                                            "ai.workbench.creation.review.approve_all",
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void bulkRejectAll()}
                                        className="alex-btn px-3 py-1 text-sm"
                                        style={secondaryBtn}
                                    >
                                        {t(
                                            "ai.workbench.creation.review.reject_all",
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={
                                            executing || approvedCount === 0
                                        }
                                        onClick={() => void executeApproved()}
                                        className="alex-btn px-3 py-1 text-sm inline-flex items-center gap-1.5"
                                        style={
                                            executing || approvedCount === 0
                                                ? {
                                                      ...primaryBtn,
                                                      opacity: 0.5,
                                                  }
                                                : primaryBtn
                                        }
                                    >
                                        <i
                                            className="fa-solid fa-bolt text-xs"
                                            aria-hidden="true"
                                        />
                                        {executing
                                            ? t(
                                                  "ai.workbench.creation.review.executing",
                                              )
                                            : t(
                                                  "ai.workbench.creation.review.execute_button",
                                              )}
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
                blueprintName={selectedBp?.name ?? ""}
                pendingCount={selectedBp?.pending_count ?? 0}
                selectedCount={selectedNoteCount}
                onConfirm={() => void doRun()}
                onCancel={() => setConfirmOpen(false)}
                t={t}
            />
        </div>
    );
}
