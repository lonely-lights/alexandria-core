import { useState, useEffect, useCallback } from 'react';
import CommandReviewModal from '@alexandria/components/notes/CommandReviewModal';
import Pagination from '@alexandria/components/ui/Pagination';
import { relativeDate } from '@alexandria/lib/formatDate';
import type { BatchSummary, PaginatedResponse } from '@alexandria/types/ai-dashboard';

/* ── Types ── */

type StatusFilter = 'all' | 'pending' | 'executed' | 'failed';

interface CommandsTabProps {
    projectId: number;
}

/* ── Helpers ── */

function titleCase(slug: string): string {
    return slug
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function truncateModel(name: string | null): string {
    if (!name) return '';
    return name.length > 24 ? name.slice(0, 22) + '…' : name;
}

function formatCost(cost: number | null): string {
    if (cost == null) return '';
    return `$${Number(cost).toFixed(4)}`;
}

function batchStatus(batch: BatchSummary): 'pending' | 'executed' | 'failed' | 'mixed' {
    if (batch.failed_count > 0) return 'failed';
    if (batch.pending_count > 0 || batch.approved_count > 0) return 'pending';
    if (batch.executed_count > 0) return 'executed';
    return 'pending';
}

/* ── Batch Card ── */

interface BatchCardProps {
    batch: BatchSummary;
    onReview: (batchId: string) => void;
}

function BatchCard({ batch, onReview }: BatchCardProps) {
    const total = batch.total_commands;
    const status = batchStatus(batch);

    const iconBgClass = status === 'pending' ? 'bg-warning/10' : status === 'executed' ? 'bg-success/10' : 'bg-error/10';
    const iconColorClass = status === 'pending' ? 'text-warning' : status === 'executed' ? 'text-success' : 'text-error';
    const iconName = status === 'pending' ? 'fa-solid fa-clock' : status === 'executed' ? 'fa-solid fa-check-circle' : 'fa-solid fa-circle-exclamation';

    const batchName = batch.blueprint_slug ? titleCase(batch.blueprint_slug) : 'Command Batch';

    const pctOf = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%');

    return (
        <div className="rounded-xl border border-base-content/10 bg-base-200 p-4 shadow-sm transition-colors hover:border-primary/30">
            <div className="flex items-start gap-3">
                {/* Icon box */}
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}>
                    <i className={`${iconName} text-sm ${iconColorClass}`} />
                </div>

                {/* Main content */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{batchName}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-base-content/40">
                                <span>{relativeDate(batch.created_at)}</span>
                                {batch.model_name && (
                                    <>
                                        <span>·</span>
                                        <span className="truncate font-mono">{truncateModel(batch.model_name)}</span>
                                    </>
                                )}
                                {batch.cost != null && batch.cost > 0 && (
                                    <>
                                        <span>·</span>
                                        <span>{formatCost(batch.cost)}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Review button */}
                        <button
                            type="button"
                            onClick={() => onReview(batch.batch_id)}
                            className="btn btn-sm btn-primary rounded-xl gap-1 flex-shrink-0"
                        >
                            <i className="fa-solid fa-eye text-xs" />
                            Review
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-base-300/40">
                        {batch.executed_count > 0 && (
                            <div className="bg-success transition-all" style={{ width: pctOf(batch.executed_count) }} />
                        )}
                        {batch.approved_count > 0 && (
                            <div className="bg-info transition-all" style={{ width: pctOf(batch.approved_count) }} />
                        )}
                        {batch.pending_count > 0 && (
                            <div className="bg-warning transition-all" style={{ width: pctOf(batch.pending_count) }} />
                        )}
                        {batch.failed_count > 0 && (
                            <div className="bg-error transition-all" style={{ width: pctOf(batch.failed_count) }} />
                        )}
                        {batch.rejected_count > 0 && (
                            <div className="bg-base-content/20 transition-all" style={{ width: pctOf(batch.rejected_count) }} />
                        )}
                    </div>

                    {/* Status counts */}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {batch.executed_count > 0 && (
                            <span className="text-xs text-success">{batch.executed_count} done</span>
                        )}
                        {batch.approved_count > 0 && (
                            <span className="text-xs text-info">{batch.approved_count} approved</span>
                        )}
                        {batch.pending_count > 0 && (
                            <span className="text-xs text-warning">{batch.pending_count} pending</span>
                        )}
                        {batch.failed_count > 0 && (
                            <span className="text-xs text-error">{batch.failed_count} failed</span>
                        )}
                        {batch.rejected_count > 0 && (
                            <span className="text-xs text-base-content/40">{batch.rejected_count} rejected</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Commands Tab ── */

export default function CommandsTab({ projectId }: CommandsTabProps) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [response, setResponse] = useState<PaginatedResponse<BatchSummary> | null>(null);

    const [reviewBatchId, setReviewBatchId] = useState<string>('');
    const [showReview, setShowReview] = useState(false);

    const fetchBatches = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            per_page: '15',
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        });

        fetch(`/api/v1/projects/${projectId}/ai/dashboard-batches?${params}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data: PaginatedResponse<BatchSummary>) => {
                setResponse(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId, page, statusFilter]);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    function handleFilterChange(filter: StatusFilter) {
        setStatusFilter(filter);
        setPage(1);
    }

    function openReview(batchId: string) {
        setReviewBatchId(batchId);
        setShowReview(true);
    }

    function closeReview() {
        setShowReview(false);
    }

    const batches = response?.data ?? [];

    const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'executed', label: 'Executed' },
        { value: 'failed', label: 'Failed' },
    ];

    // Priority sort — failed need attention first, then in-flight,
    // then completed. Applied client-side on the current page; the
    // user's chosen status filter already narrows server-side.
    const sortedBatches = [...batches].sort((a, b) => {
        const rank = (x: BatchSummary) => {
            if (x.failed_count > 0) return 0;
            if (x.pending_count > 0 || x.approved_count > 0) return 1;
            return 2;
        };
        return rank(a) - rank(b);
    });

    return (
        <div className="space-y-4">
            {/* Header — title + count + status filter chips */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                    <h2 className="font-serif text-2xl font-bold tracking-tight">Command Batches</h2>
                    {response && response.total > 0 && (
                        <span className="badge badge-ghost badge-sm">
                            {response.total} {response.total === 1 ? 'batch' : 'batches'}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => handleFilterChange(f.value)}
                            className={`btn btn-sm rounded-xl capitalize ${statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Batch list */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <span className="loading loading-spinner loading-sm text-primary" />
                </div>
            ) : batches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-base-content/10 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-base-300/50">
                        <i className="fa-solid fa-layer-group text-xl text-base-content/30" />
                    </div>
                    <p className="text-sm font-medium text-base-content/50">No command batches found</p>
                    {statusFilter !== 'all' && (
                        <p className="mt-1 text-xs text-base-content/30">Try switching to "All" to see all batches.</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedBatches.map((batch) => (
                        <BatchCard key={batch.batch_id} batch={batch} onReview={openReview} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {response && (
                <Pagination
                    currentPage={response.current_page}
                    lastPage={response.last_page}
                    from={response.from}
                    to={response.to}
                    total={response.total}
                    onPageChange={setPage}
                />
            )}

            {/* Review modal */}
            <CommandReviewModal
                open={showReview}
                onClose={closeReview}
                batchId={reviewBatchId}
                projectId={projectId}
                onExecuted={() => {
                    closeReview();
                    fetchBatches();
                }}
                onStatusChange={fetchBatches}
            />
        </div>
    );
}
