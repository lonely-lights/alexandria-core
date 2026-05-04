import { useState, useEffect, useCallback } from 'react';

import { relativeDate } from '@alexandria/lib/formatDate';
import type { AiDashboardStats, QueuedNote, BatchSummary, NoteRouting } from '@alexandria/types/ai-dashboard';

interface DashboardTabProps {
    projectId: number;
    stats: AiDashboardStats;
}

/* ── Helpers ── */

function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return String(tokens);
}

function formatCost(cost: number | string): string {
    const n = Number(cost);
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
}

function titleCase(slug: string): string {
    return slug
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/* ── Stat Card ── */

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    subLabel?: string;
    colorClass: string;
    gradient?: boolean;
    budget?: number | null;
}

function StatCard({ icon, label, value, subLabel, colorClass, gradient, budget }: StatCardProps) {
    return (
        <div
            className={
                gradient
                    ? 'rounded-xl bg-gradient-to-br from-primary to-secondary p-4 text-primary-content shadow-sm'
                    : 'rounded-xl border border-base-content/10 bg-base-200 p-4 shadow-sm'
            }
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${gradient ? 'text-primary-content/70' : 'text-base-content/50'}`}>
                        {label}
                    </p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${gradient ? 'text-primary-content' : ''}`}>
                        {value}
                    </p>
                    {subLabel && (
                        <p className={`mt-0.5 text-xs ${gradient ? 'text-primary-content/60' : 'text-base-content/40'}`}>
                            {subLabel}
                        </p>
                    )}
                    {budget != null && (
                        <p className="mt-0.5 text-xs text-primary-content/60">
                            of ${Number(budget).toFixed(2)} budget
                        </p>
                    )}
                </div>
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${gradient ? 'bg-white/20' : `bg-${colorClass}/10`}`}>
                    <i className={`${icon} text-sm ${gradient ? 'text-primary-content' : `text-${colorClass}`}`} />
                </div>
            </div>
        </div>
    );
}

/* ── Note Queue ── */

interface NoteQueueProps {
    projectId: number;
}

function NoteQueue({ projectId }: NoteQueueProps) {
    const [notes, setNotes] = useState<QueuedNote[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = useCallback(() => {
        setLoading(true);
        fetch(`/api/v1/projects/${projectId}/ai/dashboard-queue`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                setNotes(Array.isArray(data) ? data : (data.data ?? []));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    return (
        <div className="paper-board overflow-hidden rounded-2xl border border-base-300/50 bg-base-200">
            <div className="paper-stripe__head flex items-center justify-between border-b border-base-content/5 px-5 py-4">
                <h2 className="font-serif text-xl font-bold tracking-tight">Note Queue</h2>
                {!loading && notes.length > 0 && (
                    <span className="badge badge-warning badge-sm">{notes.length}</span>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <span className="loading loading-spinner loading-sm text-primary" />
                </div>
            ) : notes.length === 0 ? (
                <div className="py-10 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-base-300/50">
                        <i className="fa-solid fa-inbox text-lg text-base-content/30" />
                    </div>
                    <p className="text-sm font-medium text-base-content/50">No notes queued</p>
                </div>
            ) : (
                <div className="paper-stripe__body divide-y divide-base-content/5">
                    {notes.map((note) => (
                        <NoteQueueItem
                            key={note.note_id}
                            note={note}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function NoteQueueItem({ note }: { note: QueuedNote }) {
    return (
        <div className="px-4 py-3">
            <div className="mb-2">
                <p className="truncate text-sm font-medium">{note.note_title}</p>
                <p className="mt-0.5 text-xs text-base-content/40">
                    {relativeDate(note.note_created_at)}
                    {note.creator_name ? ` · ${note.creator_name}` : ''}
                </p>
            </div>

            {note.routings.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {note.routings.map((routing: NoteRouting) => (
                        <BlueprintBadge key={routing.blueprint_id} routing={routing} />
                    ))}
                </div>
            )}
        </div>
    );
}

function BlueprintBadge({ routing }: { routing: NoteRouting }) {
    const iconClass = routing.blueprint_icon
        ? routing.blueprint_icon.includes(' ')
            ? routing.blueprint_icon
            : `fa-solid ${routing.blueprint_icon}`
        : 'fa-solid fa-cube';

    const colorClass = {
        pending: 'badge-warning',
        processing: 'badge-info',
        completed: 'badge-success',
        failed: 'badge-error',
    }[routing.processing_status] ?? 'badge-ghost';

    return (
        <span className={`badge badge-sm gap-1 ${colorClass}`}>
            <i className={`${iconClass} text-[9px]`} />
            {routing.blueprint_name}
        </span>
    );
}

/* ── Recent Batches ── */

interface RecentBatchesProps {
    projectId: number;
}

function RecentBatches({ projectId }: RecentBatchesProps) {
    const [batches, setBatches] = useState<BatchSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/ai/dashboard-batches?per_page=5&status=all`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                setBatches(data.data ?? []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId]);

    // Priority sort: failed → pending → executed. Surfaces batches
    // that need attention first, then in-flight, then done.
    const sortedBatches = [...batches].sort((a, b) => {
        const rank = (x: BatchSummary) => {
            if (x.failed_count > 0) return 0;
            if (x.pending_count > 0) return 1;
            return 2;
        };
        return rank(a) - rank(b);
    });

    return (
        <div className="paper-board overflow-hidden rounded-2xl border border-base-300/50 bg-base-200">
            <div className="paper-stripe__head border-b border-base-content/5 px-5 py-4">
                <h2 className="font-serif text-xl font-bold tracking-tight">Recent Batches</h2>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <span className="loading loading-spinner loading-sm text-primary" />
                </div>
            ) : batches.length === 0 ? (
                <div className="py-10 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-base-300/50">
                        <i className="fa-solid fa-layer-group text-lg text-base-content/30" />
                    </div>
                    <p className="text-sm font-medium text-base-content/50">No batches yet</p>
                </div>
            ) : (
                <div className="paper-stripe__body divide-y divide-base-content/5">
                    {sortedBatches.map((batch) => (
                        <BatchRow key={batch.batch_id} batch={batch} />
                    ))}
                </div>
            )}
        </div>
    );
}

function BatchRow({ batch }: { batch: BatchSummary }) {
    const total = batch.total_commands;
    const executed = batch.executed_count;
    const pending = batch.pending_count;
    const failed = batch.failed_count;
    const rejected = batch.rejected_count;

    const pctOf = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%');

    const label = batch.blueprint_slug ? titleCase(batch.blueprint_slug) : 'Batch';

    return (
        <div className="px-4 py-3">
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <p className="mt-0.5 text-xs text-base-content/40">{relativeDate(batch.created_at)}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-mono tabular-nums text-base-content/50">
                    {executed}/{total}
                </span>
            </div>

            {/* Progress bar */}
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-base-300/40">
                {executed > 0 && (
                    <div className="bg-success transition-all" style={{ width: pctOf(executed) }} />
                )}
                {pending > 0 && (
                    <div className="bg-warning transition-all" style={{ width: pctOf(pending) }} />
                )}
                {failed > 0 && (
                    <div className="bg-error transition-all" style={{ width: pctOf(failed) }} />
                )}
                {rejected > 0 && (
                    <div className="bg-base-content/20 transition-all" style={{ width: pctOf(rejected) }} />
                )}
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {executed > 0 && (
                    <span className="text-xs text-success">{executed} done</span>
                )}
                {pending > 0 && (
                    <span className="text-xs text-warning">{pending} pending</span>
                )}
                {failed > 0 && (
                    <span className="text-xs text-error">{failed} failed</span>
                )}
                {rejected > 0 && (
                    <span className="text-xs text-base-content/40">{rejected} rejected</span>
                )}
            </div>
        </div>
    );
}

/* ── Dashboard Tab ── */

export default function DashboardTab({ projectId, stats }: DashboardTabProps) {
    return (
        <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                    icon="fa-solid fa-inbox"
                    label="Queued Notes"
                    value={stats.queue_pending}
                    colorClass="warning"
                />
                <StatCard
                    icon="fa-solid fa-clipboard-list"
                    label="Pending Commands"
                    value={stats.queue_total - stats.queue_pending}
                    colorClass="secondary"
                />
                <StatCard
                    icon="fa-solid fa-calendar"
                    label="This Month"
                    value={stats.this_month_transactions}
                    subLabel="requests"
                    colorClass="primary"
                />
                <StatCard
                    icon="fa-solid fa-coins"
                    label="Token Usage"
                    value={formatTokens(stats.total_tokens)}
                    colorClass="info"
                />
                <StatCard
                    icon="fa-solid fa-dollar-sign"
                    label="Monthly Cost"
                    value={formatCost(stats.this_month_cost)}
                    colorClass="primary"
                    gradient
                    budget={null}
                />
            </div>

            {/* Queue + Batches */}
            <div className="grid gap-6 lg:grid-cols-2">
                <NoteQueue projectId={projectId} />
                <RecentBatches projectId={projectId} />
            </div>
        </div>
    );
}
